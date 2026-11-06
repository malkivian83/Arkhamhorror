import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  registerPlayerCards,
  type Choice,
  type GameState,
  type Message,
} from '@lcg/engine'
import { ask, on, specific } from './helpers'

/** Alianzas frágiles (recompensas del Interludio III), códigos 78 + colección ES 96–103. */
export const R = {
  spirits: '78096',
  loan: '78097',
  coverage: '78098',
  handshake: '78099',
  hardWork: '78100',
  approval: '78101',
  tome: '78102',
  ritual: '78103',
} as const
/** Recompensa de cada Lugar Protegido (por código del II). */
export const ALLIED: Record<string, string> = {
  '78026': R.spirits,
  '78025': R.handshake,
  '78024': R.loan,
  '78028': R.tome,
  '78027': R.approval,
  '78030': R.ritual,
  '78023': R.coverage,
  '78029': R.hardWork,
}
const SECTION: Record<string, string> = {
  '78026': 'hibbs',
  '78025': 'store',
  '78024': 'bank',
  '78028': 'library',
  '78027': 'boarding',
  '78030': 'shop',
  '78023': 'advertiser',
  '78029': 'docks',
}

/**
 * Interludio III · Arkham unido (guía ES p. 12 / EN p. 14): una sección por cada Lugar
 * Protegido; un investigador puede añadir la recompensa a su mazo. El texto oculto del
 * Portador de la Plaga da 2 de experiencia y 1 trauma mental a cada lector.
 */
export function arkhamAllied(s: GameState, rallied: string[], end: Message): Message[] {
  const story = (key: string, effects: { key: string }[] = []) => ({
    title: 'story.plaguebearer.allied.title',
    body: `story.plaguebearer.allied.${key}`,
    effects,
  })
  return [
    { type: 'Story', entry: story('intro') },
    ...rallied
      .filter((id) => ALLIED[id])
      .map((id): Message => ({
        type: 'Story',
        entry: story(SECTION[id]!, [{ key: `story.plaguebearer.allied.${SECTION[id]}Effect` }]),
        choices: [
          ...s.investigators.map((i): Choice => ({
            label: 'choice.plaguebearer.allied.add',
            params: { name: i.name },
            then: [{ type: 'AddStoryAsset', investigator: i.id, code: ALLIED[id]! }],
          })),
          { label: 'choice.plaguebearer.allied.nobody', then: [] },
        ],
      })),
    specific('allied.hidden', { index: 0 }),
    end,
  ]
}
on('allied.hidden', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i) return s
  const next = specific('allied.hidden', { index: index + 1 })
  return ask(
    s,
    i.id,
    [
      {
        label: 'choice.plaguebearer.friends.read',
        then: [
          {
            type: 'Story',
            entry: {
              title: 'story.plaguebearer.hiddenTitle',
              body: 'story.plaguebearer.allied.hidden',
              effects: [{ key: 'story.plaguebearer.allied.hiddenEffect' }],
            },
          },
          { type: 'EarnExperience', amount: 2, investigator: i.id },
          { type: 'SufferTrauma', mental: 1, investigator: i.id },
          next,
        ],
      },
      { label: 'choice.skip', then: [next] },
    ],
    'prompt.plaguebearer.allied.hidden',
  )
})

// ---------------------------------------------------------------------------
// Cartas de jugador
// ---------------------------------------------------------------------------

registerPlayerCards([
  {
    code: R.spirits,
    name: 'Excessive Spirits',
    type: 'asset',
    class: 'neutral',
    cost: 0,
    story: true,
    traits: ['Boon'],
    slots: [],
    icons: { agility: 2, wild: 1 },
  },
  {
    code: R.loan,
    name: 'Extended Loan',
    type: 'asset',
    class: 'neutral',
    cost: 0,
    story: true,
    traits: ['Boon'],
    slots: [],
    icons: { willpower: 2, wild: 1 },
  },
  {
    code: R.coverage,
    name: 'Full Coverage',
    type: 'event',
    class: 'neutral',
    cost: 0,
    story: true,
    fast: true,
    traits: ['Trick', 'Boon'],
    icons: { wild: 1 },
  },
  {
    code: R.handshake,
    name: 'Handshake Deal',
    type: 'asset',
    class: 'neutral',
    cost: 1,
    story: true,
    traits: ['Boon'],
    slots: [],
    icons: { combat: 2, wild: 1 },
  },
  {
    code: R.hardWork,
    name: 'Hard Day’s Work',
    type: 'skill',
    class: 'neutral',
    story: true,
    traits: ['Innate', 'Boon'],
    icons: { wild: 2 },
  },
  {
    code: R.approval,
    name: 'Ma’s Approval',
    type: 'asset',
    class: 'neutral',
    cost: 1,
    story: true,
    traits: ['Boon'],
    slots: [],
    icons: { intellect: 1, combat: 1, wild: 1 },
  },
  {
    code: R.tome,
    name: 'Reliquary Tome',
    type: 'asset',
    class: 'neutral',
    cost: 2,
    story: true,
    traits: ['Item', 'Tome', 'Boon'],
    slots: ['hand'],
    icons: { intellect: 2, wild: 1 },
  },
  {
    code: R.ritual,
    name: 'Ritual of Yaztaroth',
    type: 'asset',
    class: 'neutral',
    cost: 4,
    story: true,
    traits: ['Ritual', 'Boon'],
    slots: [],
    sanity: 2,
    icons: { willpower: 1, intellect: 1, wild: 1 },
  },
] as never)

const ownTurn = (s: GameState, by: string) => s.activeTurn === by
// Copas de más: tras tener éxito por 3 o más durante una acción en tu turno, una acción más.
registerPlayerCard({
  code: R.spirits,
  reactions: (s, t, a) =>
    t.type === 'afterSkillTest' &&
    t.succeeded &&
    t.margin >= 3 &&
    t.investigator === a.owner &&
    !a.exhausted &&
    ownTurn(s, a.owner) &&
    ['fight', 'evade', 'investigate'].includes(t.kind)
      ? [
          {
            key: `${a.id}:action`,
            investigator: a.owner,
            label: 'ability.plaguebearer.allied.spirits',
            then: [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'GainActions', investigator: a.owner, amount: 1 },
            ],
          },
        ]
      : [],
})
// Ampliación de préstamo: 2 recursos al empezar tu turno, gastables como tu reserva.
registerPlayerCard({
  code: R.loan,
  usesAsResources: (_s, a, by) => by === a.owner,
  forced: (_s, t, a) =>
    t.type === 'turnBegins' && t.investigator === a.owner
      ? [{ type: 'AddUses', asset: a.id, amount: 2 }]
      : t.type === 'turnEnds' && t.investigator === a.owner && a.uses > 0
        ? [{ type: 'SpendUses', asset: a.id, amount: a.uses }]
        : [],
})
// Cobertura total: hasta el final de la ronda, tus eventos cuestan 1 menos y roban 1 carta.
registerPlayerCard({
  code: R.coverage,
  canPlay: (s, by) => ownTurn(s, by),
  play: (_s, by) => [
    specific('allied.coverage', { investigator: by }),
    { type: 'DrawCards', investigator: by, amount: 1 },
  ],
})
on('allied.coverage', (s, d) => ({
  ...s,
  scenarioMeta: { ...s.scenarioMeta, [`allied:coverage:${d.investigator}`]: s.round },
}))
const covered = (s: GameState, by: string) => s.scenarioMeta?.[`allied:coverage:${by}`] === s.round
/** Ganchos de escenario de Cobertura total (escenarios V–VIII). */
export const alliedCostModifier = (s: GameState, by: string, code: string) =>
  covered(s, by) && playerCardDef(code)?.type === 'event' ? -1 : 0
export const alliedForced = (
  s: GameState,
  t: { type: string; investigator?: string; code?: string },
): Message[] =>
  t.type === 'afterEventPlayed' &&
  t.investigator &&
  t.code !== R.coverage &&
  covered(s, t.investigator)
    ? [{ type: 'DrawCards', investigator: t.investigator, amount: 1 }]
    : []
// Trato hecho: el primer Apoyo de cada ronda cuesta 1 menos; [free] retirarlo para poner un Apoyo.
registerPlayerCard({
  code: R.handshake,
  playedCardCostModifier: (s, a, code) =>
    playerCardDef(code)?.type === 'asset' &&
    s.scenarioMeta?.[`allied:handshake:${a.id}`] !== s.round
      ? -1
      : 0,
  forced: (s, t, a) =>
    t.type === 'afterPlayCard' &&
    t.investigator === a.owner &&
    playerCardDef(t.code)?.type === 'asset' &&
    t.code !== R.handshake
      ? [{ type: 'SetScenarioMeta', key: `allied:handshake:${a.id}`, value: s.round }]
      : [],
  fastOptions: (s, a) => {
    const i = getInvestigator(s, a.owner)
    const options = [...new Set([...i.hand, ...i.discard])].filter(
      (c) => playerCardDef(c)?.type === 'asset',
    )
    return options.length
      ? [
          {
            key: `${a.id}:deal`,
            investigator: a.owner,
            label: 'ability.plaguebearer.allied.handshake',
            then: [
              { type: 'RemoveAssetFromGame', asset: a.id },
              specific('allied.deal', { investigator: a.owner }),
            ],
          },
        ]
      : []
  },
})
on('allied.deal', (s, d) => {
  const by = String(d.investigator),
    i = getInvestigator(s, by)
  const options = [...new Set([...i.hand, ...i.discard])].filter(
    (c) => playerCardDef(c)?.type === 'asset',
  )
  return ask(
    s,
    by,
    options.map((code) => ({
      label: 'choice.card',
      params: { card: playerCardDef(code)!.name },
      then: [
        {
          type: 'PutAssetIntoPlay' as const,
          investigator: by,
          code,
          ...(i.hand.includes(code) ? {} : { fromDiscard: by }),
        },
        ...(i.hand.includes(code)
          ? [{ type: 'DiscardFromHand' as const, investigator: by, card: code }]
          : []),
      ],
    })) as never,
    'prompt.plaguebearer.allied.deal',
  )
})
// Tomo sagrado: +4 al tamaño de mano; [free] agótalo para robar 2 cartas.
registerPlayerCard({
  code: R.tome,
  handSize: 4,
  fastOptions: (_s, a) =>
    a.exhausted
      ? []
      : [
          {
            key: `${a.id}:draw`,
            investigator: a.owner,
            label: 'ability.plaguebearer.allied.tome',
            then: [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'DrawCards', investigator: a.owner, amount: 2 },
            ],
          },
        ],
})
// Ritual de Yaztaroth: entra con 1 horror; agótalo para que un gasto de carga o secreto
// cure 1 horror del Ritual en su lugar (se devuelve la carga gastada).
registerPlayerCard({
  code: R.ritual,
  entersPlayWith: { horror: 1 },
  reactions: (s, t, a) => {
    if (t.type !== 'afterUsesSpent' || a.exhausted || a.horror === 0) return []
    const spent = t.asset
    const kind = spent && playerCardDef(spent.code)?.uses?.type
    return spent?.owner === a.owner && (kind === 'charges' || kind === 'secrets')
      ? [
          {
            key: `${a.id}:instead`,
            investigator: a.owner,
            label: 'ability.plaguebearer.allied.ritual',
            then: [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'HealAsset', asset: a.id, damage: 0, horror: 1 },
              { type: 'AddUses', asset: spent.id, amount: 1 },
            ],
          },
        ]
      : []
  },
})
// Beneplácito de Ma: al jugar un Aliado, se vincula (no ocupa espacio de aliado; +1/+1).
registerPlayerCard({
  code: R.approval,
  // El Aliado vinculado no ocupa espacio de aliado: equivale a un espacio de aliado más.
  extraSlots: { ally: 1 },
  reactions: (s, t, a) => {
    if (t.type !== 'afterPlayCard' || t.investigator !== a.owner) return []
    if (!playerCardDef(t.code)?.traits?.includes('Ally')) return []
    const ally = Object.values(s.assets)
      .filter((x) => x.owner === a.owner && x.code === t.code)
      .at(-1)
    return ally
      ? [
          {
            key: `${a.id}:attach`,
            investigator: a.owner,
            label: 'ability.plaguebearer.allied.approval',
            then: [{ type: 'SetScenarioMeta', key: `allied:approval:${a.id}`, value: ally.id }],
          },
        ]
      : []
  },
})
/** Vitalidad extra del Aliado vinculado a Beneplácito de Ma. */
export const alliedAllyVitals = (s: GameState, assetId: string) =>
  Object.values(s.assets).some(
    (a) => a.code === R.approval && s.scenarioMeta?.[`allied:approval:${a.id}`] === assetId,
  )
    ? 1
    : 0
