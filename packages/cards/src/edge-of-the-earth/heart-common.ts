// Campaign guide pp. 50–57: seals are unique physical tokens, not chaos tokens.
import {
  activeInvestigators,
  getInvestigator,
  playerCardDef,
  push,
  seedRng,
  shuffle,
  spendableClues,
  type AbilityOption,
  type Choice,
  type GameState,
  type LocationCard,
  type Message,
  type SkillType,
} from '@lcg/engine'
import data from './heart-data.json'

export const heartPlayers = (s: GameState) => s.startingInvestigatorCount ?? s.investigators.length
const perInvestigator = heartPlayers
export const GATE = '08649'
export const SEALS = ['a', 'b', 'c', 'd', 'e'] as const
export type Seal = (typeof SEALS)[number]
export type SealState = { seal: Seal; holder: string; active: boolean }
export const heartMessage = (
  key: string,
  data: Record<string, string | number | boolean> = {},
): Message => ({ type: 'ScenarioSpecific', key: 'heart:' + key, data })
export const heartStory = (part: string): Message => ({
  type: 'Story',
  entry: { title: `story.edgeOfTheEarth.${part}.title`, body: `story.edgeOfTheEarth.${part}.body` },
})
export const heartAsk = (
  by: string,
  prompt: string,
  choices: Choice[],
  params?: Record<string, string | number>,
): Message[] =>
  choices.length
    ? [
        {
          type: 'Ask',
          investigator: by,
          question: {
            kind: 'chooseOne',
            alwaysAsk: true,
            prompt: 'prompt.edgeOfTheEarth.' + prompt,
            ...(params ? { promptParams: params } : {}),
            choices,
          },
        },
      ]
    : []
export const meta = (s: GameState, key: string) => s.scenarioMeta?.['heart:' + key]
export const setMeta = (s: GameState, key: string, value: string | number): GameState => ({
  ...s,
  scenarioMeta: { ...s.scenarioMeta, ['heart:' + key]: value },
})
export const seals = (s: GameState): SealState[] =>
  SEALS.flatMap((seal) => {
    const holder = meta(s, 'seal:' + seal)
    return typeof holder === 'string' && holder !== 'removed'
      ? [{ seal, holder, active: meta(s, 'active:' + seal) === 1 }]
      : []
  })
export const putSeal = (s: GameState, seal: Seal, holder: string, active = false) =>
  setMeta(setMeta(s, 'seal:' + seal, holder), 'active:' + seal, Number(active))
export const ownedSeals = (s: GameState, by: string) =>
  seals(s).filter((t) => t.holder === 'i:' + by)
export const sealLocation = (s: GameState, t: SealState) =>
  t.holder.startsWith('l:') ? t.holder.slice(2) : getInvestigator(s, t.holder.slice(2)).location
export const isPylon = (id: string) => /^0867[4-8]$/.test(id)
export const pylonHealth = (s: GameState, id: string) =>
  s.locations[id]!.clueValue * perInvestigator(s)
export const collapsed = (s: GameState, id: string) =>
  isPylon(id) && Number(meta(s, 'damage:' + id) ?? 0) >= pylonHealth(s, id)
export const collapsedPylons = (s: GameState) =>
  Object.keys(s.locations).filter((id) => isPylon(id) && collapsed(s, id))
export const at = (s: GameState, by: string) => getInvestigator(s, by).location
export const sealSkill: SkillType[] = ['combat', 'intellect', 'willpower', 'agility']
export const heartCard = (code: string) => data.find((c) => c.code === code)!
export function heartAction(
  by: string,
  key: string,
  then: Message[],
  params: Record<string, string | number> = {},
  actions = 1,
): AbilityOption {
  return {
    key: 'heart:' + key,
    label: 'ability.edgeOfTheEarth.heart.' + key,
    params,
    actions,
    provokes: actions > 0,
    then,
    investigator: by,
  } as AbilityOption
}

/** Five spokes and three rings; shuffle all fifteen cards, not each ring separately. */
export function heartMap(part: 1 | 2, seed: number) {
  const codes = [
    '08650',
    '08651',
    '08652',
    '08653',
    '08654',
    '08655',
    '08655',
    '08656',
    '08656',
    '08656',
    ...(part === 1
      ? ['08664', '08665', '08666', '08667', '08668']
      : ['08674', '08675', '08676', '08677', '08678']),
  ]
  let rng = seedRng(seed),
    drawn: string[]
  do {
    ;[drawn, rng] = shuffle(codes, rng)
  } while (part === 2 && drawn.slice(0, 5).every(isPylon))
  const ids = drawn.map((c, i) => c + ':' + i)
  // Single-copy cards retain their printed identifier.
  const id = (n: number) => (['08655', '08656'].includes(drawn[n]!) ? ids[n]! : drawn[n]!)
  const offsets = [
    [0, -2],
    [2, -1],
    [1, 2],
    [-1, 2],
    [-2, -1],
  ] as const
  const locations: LocationCard[] = drawn.map((code, n) => {
    const ring = Math.floor(n / 5) + 1,
      spoke = n % 5,
      c = heartCard(code)
    return {
      id: id(n),
      name: c.name,
      // Mist-Pylons show the same title on their unrevealed side.
      unrevealedName: isPylon(code) ? c.name : 'Ancient Facility',
      shroud: c.shroud!,
      clueValue: c.clues!,
      cluesPerInvestigator: true,
      position: [6 + offsets[spoke]![0] * ring, 6 + offsets[spoke]![1] * ring],
      connections: [
        id((ring - 1) * 5 + ((spoke + 4) % 5)),
        id((ring - 1) * 5 + ((spoke + 1) % 5)),
        ...(ring > 1 ? [id(n - 5)] : [GATE]),
        ...(ring < 3 ? [id(n + 5)] : []),
      ],
    }
  })
  locations.push({
    id: GATE,
    name: "The Gate of Y'quaa",
    shroud: 1,
    clueValue: 1,
    cluesPerInvestigator: true,
    position: [6, 6],
    connections: Array.from({ length: 5 }, (_, n) => id(n)),
  })
  return { locations, inner: Array.from({ length: 5 }, (_, n) => id(n)) }
}
export const ringOf = (s: GameState, id: string) => {
  const p = s.locations[id]?.position
  if (!p || id === GATE) return 0
  return Math.max(Math.abs(p[0] - 6), Math.abs(p[1] - 6)) / 2
}
export const sameHeartLine = (s: GameState, id: string, kind: 'ring' | 'spoke') => {
  const p = s.locations[id]?.position
  if (!p) return []
  const ring = ringOf(s, id)
  return Object.values(s.locations).filter(
    (l) =>
      l.id !== GATE &&
      l.position &&
      (kind === 'ring'
        ? ringOf(s, l.id) === ring
        : (l.position[0] - 6) * (p[1] - 6) === (l.position[1] - 6) * (p[0] - 6)),
  )
}
export const localPlayers = (s: GameState, by: string) =>
  activeInvestigators(s).filter((i) => i.location === at(s, by))
export function canPay(s: GameState, by: string, clues: number, resources = 0, cards = 0) {
  const people = localPlayers(s, by)
  return (
    people.reduce((n, i) => n + spendableClues(s, i.id), 0) >= clues &&
    people.reduce((n, i) => n + i.resources, 0) >= resources &&
    people.reduce((n, i) => n + i.hand.filter((c) => !playerCardDef(c)?.weakness).length, 0) >=
      cards
  )
}
/** Group costs only draw from investigators at the ability's location, one physical card at a time. */
export function payHeart(s: GameState, d: Record<string, string | number | boolean>): GameState {
  const by = String(d.investigator),
    clues = Number(d.clues ?? 0),
    resources = Number(d.resources ?? 0),
    cards = Number(d.cards ?? 0)
  if (!canPay(s, by, clues, resources, cards)) return s
  if (!clues && !resources && !cards) return push(s, heartMessage(String(d.next), d))
  const people = localPlayers(s, by),
    field = clues ? 'clues' : resources ? 'resources' : 'cards'
  const choices: Choice[] = people.flatMap<Choice>((i) =>
    field === 'cards'
      ? [...new Set(i.hand.filter((c) => !playerCardDef(c)?.weakness))].map((card) => ({
          label: 'choice.card',
          params: { card: playerCardDef(card)?.name ?? card },
          then: [
            { type: 'DiscardFromHand' as const, investigator: i.id, card },
            heartMessage('pay', { ...d, cards: cards - 1 }),
          ],
        }))
      : (field === 'clues' ? spendableClues(s, i.id) > 0 : i.resources > 0)
        ? [
            {
              label: 'choice.investigator',
              params: { name: i.name },
              then: [
                field === 'clues'
                  ? { type: 'SpendClues' as const, investigator: i.id, amount: 1 }
                  : { type: 'SpendResources' as const, investigator: i.id, amount: 1 },
                heartMessage('pay', { ...d, [field]: Number(d[field]) - 1 }),
              ],
            },
          ]
        : [],
  )
  return push(s, ...heartAsk(by, 'heartPay', choices))
}

export function sealTransfers(s: GameState, by: string): AbilityOption[] {
  return activeInvestigators(s)
    .filter((i) => i.id !== by && i.location === at(s, by))
    .flatMap((other) =>
      seals(s)
        .filter((t) => t.holder === 'i:' + by || t.holder === 'i:' + other.id)
        .map((t) =>
          heartAction(
            by,
            'transfer',
            [
              heartMessage('transfer', {
                seal: t.seal,
                from: t.holder.slice(2),
                to: t.holder === 'i:' + by ? other.id : by,
                investigator: by,
              }),
            ],
            { seal: t.seal, name: other.name },
          ),
        ),
    )
}
