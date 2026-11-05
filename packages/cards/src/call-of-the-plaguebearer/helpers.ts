import {
  distancesFrom,
  canEnter,
  canAffordEntry,
  getInvestigator,
  leadInvestigator,
  push,
  shuffle,
  type Choice,
  type GameState,
  type Message,
} from '@lcg/engine'
import { L } from './locations'

export const C = {
  reference: '78001',
  agendas: ['78002', '78003', '78004'],
  acts: ['78005', '78006', '78007'],
  greyson: '78016',
  briefcase: '78017',
  first: '78018',
  troubleshooter: '78250',
  evidence: '78251',
  panicked: '78252',
  suppression: '78253',
  hands: '78256',
  supplicant: '78257',
  skin: '78258',
  urge: '78284',
  another: '78285',
  thrall: '78288',
  devoted: '78289',
} as const
export const specific = (
  key: string,
  data: Record<string, string | number | boolean> = {},
): Message => ({ type: 'ScenarioSpecific', key, data })
type Handler = (s: GameState, data: Record<string, string | number | boolean>) => GameState
const handlers = new Map<string, Handler>()
export const on = (key: string, handler: Handler) => {
  handlers.set(key, handler)
}
export const run = (s: GameState, key: string, data: Record<string, string | number | boolean>) =>
  handlers.get(key)?.(s, data) ?? s
export const miasma = (id: string | null) => id === L.omega || /^782(7[5-9]|8[0-2])$/.test(id ?? '')
export const terrorCount = (s: GameState, by: string) =>
  Object.values(s.treacheries).filter(
    (t) =>
      t.placement.type === 'threatArea' &&
      t.placement.investigator === by &&
      t.traits?.includes('Terror'),
  ).length
export const damage = (investigator: string, amount = 1, horror = 0): Message => ({
  type: 'TakeDamage',
  investigator,
  damage: amount,
  horror,
})
export const ask = (
  s: GameState,
  investigator: string,
  choices: Choice[],
  prompt = 'prompt.chooseLocation',
) =>
  choices.length
    ? push(s, { type: 'Ask', investigator, question: { kind: 'chooseOne', prompt, choices } })
    : s
export const chooseLocation = (
  s: GameState,
  by: string,
  ids: string[],
  then: (id: string) => Message[],
  optional = false,
) =>
  ask(s, by, [
    ...ids.map((id) => ({
      label: 'choice.location',
      params: { location: s.locations[id]!.name },
      target: { type: 'location' as const, id },
      then: then(id),
    })),
    ...(optional ? [{ label: 'choice.skip', then: [] }] : []),
  ])
export const moveRelative = (s: GameState, by: string, targets: string[], away = false) => {
  const from = getInvestigator(s, by).location
  if (!from || !targets.length) return s
  const distance = (id: string) =>
    Math.min(...targets.map((to) => distancesFrom(s, id).get(to) ?? Infinity))
  const current = distance(from)
  if (!Number.isFinite(current) || (!away && current === 0)) return s
  const ids = s.locations[from]!.connections.filter(
    (id) =>
      s.locations[id] &&
      canEnter(s, by, id) &&
      canAffordEntry(s, id) &&
      (away ? distance(id) > current : distance(id) === current - 1),
  )
  if (ids.length === 1) return push(s, { type: 'MoveTo', investigator: by, location: ids[0]! })
  return chooseLocation(s, by, ids, (id) => [{ type: 'MoveTo', investigator: by, location: id }])
}
on('plaguebearer.moveRelative', (s, d) =>
  moveRelative(
    s,
    String(d.investigator),
    d.safe ? [L.tunnel].filter((id) => !!s.locations[id]) : Object.keys(s.locations).filter(miasma),
    !!d.safe,
  ),
)
on('plaguebearer.barricade', (s, d) => {
  const id = String(d.location),
    l = s.locations[id]
  return l
    ? {
        ...s,
        locations: {
          ...s.locations,
          [id]: { ...l, resources: Math.max(0, (l.resources ?? 0) - Number(d.amount ?? 1)) },
        },
      }
    : s
})
on('plaguebearer.chooseBarricade', (s, d) => {
  const by = String(d.investigator),
    from = getInvestigator(s, by).location
  if (!from) return s
  return chooseLocation(
    s,
    by,
    s.locations[from]!.connections.filter((id) => (s.locations[id]?.resources ?? 0) > 0),
    (id) => [specific('plaguebearer.barricade', { location: id })],
    true,
  )
})
/** Busca una carta física concreta, sin duplicarla, y baraja después de buscar. */
export function findEncounter(s: GameState, code: string, location?: string): GameState {
  const deckIndex = s.encounterDeck.findIndex((c) => c.code === code),
    discardIndex = s.encounterDiscard.findIndex((c) => c.code === code)
  const card = deckIndex >= 0 ? s.encounterDeck[deckIndex] : s.encounterDiscard[discardIndex]
  const [deck, rng] = shuffle(
    s.encounterDeck.filter((_, i) => i !== deckIndex),
    s.rng,
  )
  const next = {
    ...s,
    rng,
    encounterDeck: deck,
    encounterDiscard: s.encounterDiscard.filter((_, i) => i !== discardIndex || deckIndex >= 0),
  }
  return card?.kind === 'enemy' && location
    ? push(next, { type: 'SpawnEnemy', card, location, engageWith: null })
    : next
}
on('plaguebearer.find', (s, d) =>
  findEncounter(s, String(d.code), d.location ? String(d.location) : undefined),
)
on('plaguebearer.discardTerror', (s, d) => {
  // Se descarta hasta la primera Terror; si se agota el mazo no se recicla en medio.
  const index = s.encounterDeck.findIndex(
    (c) => c.kind === 'treachery' && c.traits?.includes('Terror'),
  )
  const count = index < 0 ? s.encounterDeck.length : index + 1,
    cards = s.encounterDeck.slice(0, count),
    card = cards.at(-1)
  const next = {
    ...s,
    encounterDeck: s.encounterDeck.slice(count),
    encounterDiscard: [...s.encounterDiscard, ...cards],
  }
  return index >= 0 && card
    ? push(next, {
        type: 'DrawFromEncounterDiscard',
        investigator: String(d.investigator),
        code: card.code,
      })
    : next
})
export const lead = (s: GameState) => (leadInvestigator(s) ?? s.investigators[0]!).id
on('plaguebearer.hidden', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i) return s
  const next = specific('plaguebearer.hidden', { index: index + 1 })
  return ask(
    s,
    i.id,
    [
      {
        label: 'choice.plaguebearer.read',
        then: [
          {
            type: 'Story',
            entry: { title: 'story.plaguebearer.hiddenTitle', body: 'story.plaguebearer.hidden' },
          },
          { type: 'GainResources', investigator: i.id, amount: 2 },
          next,
        ],
      },
      { label: 'choice.skip', then: [next] },
    ],
    'prompt.plaguebearer.hidden',
  )
})
