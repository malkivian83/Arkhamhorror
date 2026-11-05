import {
  activeInvestigators,
  getInvestigator,
  push,
  registerAct,
  registerAgenda,
  shuffle,
  type AbilityOption,
  type GameState,
  type Message,
} from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { C, on, specific, terrorCount } from './helpers'
import { L } from './locations'

const barricades: Record<string, number> = {
  [L.omega]: 1,
  [L.alpha]: 1,
  [L.delta]: 1,
  [L.tunnel]: 3,
}
export const putLocations = (s: GameState, ids: string[]): Message[] =>
  ids.flatMap((location) => [
    { type: 'PutLocationIntoPlay', location },
    specific('plaguebearer.initBarricade', {
      location,
      amount: (barricades[location] ?? 0) * s.startingInvestigatorCount,
    }),
  ])
on('plaguebearer.initBarricade', (s, d) => {
  const id = String(d.location),
    l = s.locations[id]
  return l
    ? { ...s, locations: { ...s.locations, [id]: { ...l, resources: Number(d.amount) } } }
    : s
})
const removeAbilities = (s: GameState, _self: unknown, investigator: string): AbilityOption[] => {
  const here = getInvestigator(s, investigator).location
  const members = activeInvestigators(s).filter((i) => i.location === here)
  const total = members.reduce((sum, i) => sum + i.clues, 0)
  if (!here || total === 0) return []
  return [1, 2]
    .filter((n) => n <= total)
    .flatMap((n) =>
      s.locations[here]!.connections.filter((id) => (s.locations[id]?.resources ?? 0) > 0).map(
        (id) => ({
          key: `plaguebearer:remove:${n}:${id}`,
          label: 'ability.plaguebearer.remove',
          params: { amount: n, location: s.locations[id]!.name },
          actions: 1,
          provokes: true,
          costs: [{ type: 'PayGroupClues' as const, amount: n, from: members.map((i) => i.id) }],
          then: [specific('plaguebearer.barricade', { location: id, amount: n })],
        }),
      ),
    )
}
registerAct({
  code: C.acts[0],
  abilities: removeAbilities,
  objectiveMet: (s) => activeInvestigators(s).some((i) => i.location === L.omega),
  onAdvance: (s) => [
    ...putLocations(s, [L.lobby, L.alpha, L.delta, L.tunnel]),
    specific('plaguebearer.addSupplicants'),
  ],
})
registerAct({
  code: C.acts[1],
  abilities: removeAbilities,
  forced: (_s, t) =>
    t.type === 'afterMove'
      ? [specific('plaguebearer.enterTunnel', { investigator: t.investigator, from: t.from ?? '' })]
      : [],
  onAdvance: (s) => [
    { type: 'PutLocationIntoPlay', location: L.stairs },
    { type: 'SpawnSetAsideEnemy', code: C.first, location: L.morgue },
    {
      type: 'SpawnSetAsideEnemy',
      code: C.greyson,
      location: L.tunnel,
      entersExhausted: s.scenarioMeta?.plaguebearerTunnelFrom === L.hallway,
    },
    ...(s.scenarioMeta?.plaguebearerTunnelFrom === L.hallway
      ? []
      : [{ type: 'RecordNote' as const, note: 'plaguebearerAlarm' }]),
  ],
})
on('plaguebearer.enterTunnel', (s, d) =>
  getInvestigator(s, String(d.investigator)).location === L.tunnel
    ? push(
        s,
        { type: 'SetScenarioMeta', key: 'plaguebearerTunnelFrom', value: String(d.from) },
        { type: 'AdvanceAct', paid: true },
      )
    : s,
)
registerAct({
  code: C.acts[2],
  abilities: removeAbilities,
  forced: (_s, t) =>
    t.type === 'enemyDefeated' && t.enemy.traits?.includes('Elite')
      ? [{ type: 'AdvanceAct', paid: true }]
      : [],
  onAdvance: (s) => [
    {
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: s.victoryDisplay.includes(C.greyson) ? 2 : 3 },
    },
  ],
})
on('plaguebearer.addSupplicants', (s) => {
  const [deck, rng] = shuffle(
    [...s.encounterDeck, ...s.setAside.filter((c) => c.code === C.supplicant)],
    s.rng,
  )
  return {
    ...s,
    rng,
    encounterDeck: deck,
    setAside: s.setAside.filter((c) => c.code !== C.supplicant),
  }
})
const terrorDiscard: Message[] = [specific('plaguebearer.discardThralls')]
on('plaguebearer.discardThralls', (s) =>
  push(
    s,
    ...Object.values(s.enemies)
      .filter((e) => e.code === C.thrall)
      .map((e) => ({ type: 'DiscardEnemy' as const, enemy: e.id })),
  ),
)
on('plaguebearer.agendaOne', (s) => {
  let next = s
  const l = s.locations[L.omega]
  if (l && !l.revealed)
    next = { ...s, locations: { ...s.locations, [L.omega]: { ...l, resources: 0 } } }
  const [deck, rng] = shuffle(
    [
      ...next.encounterDeck,
      ...next.encounterDiscard,
      ...next.setAside.filter((c) => c.code === C.troubleshooter),
    ],
    next.rng,
  )
  return push(
    {
      ...next,
      rng,
      encounterDeck: deck,
      encounterDiscard: [],
      setAside: next.setAside.filter((c) => c.code !== C.troubleshooter),
    },
    ...(l && !l.revealed ? [{ type: 'RevealLocation' as const, location: L.omega }] : []),
    ...next.investigators
      .filter((i) => !i.eliminated)
      .map((i) =>
        effectTest(i.id, C.agendas[0], 'willpower', 3, {
          onFail: [{ type: 'MoveTo', investigator: i.id, location: L.omega }],
        }),
      ),
  )
})
registerAgenda({
  code: C.agendas[0],
  forced: (s, t) => (t.type === 'roundEnds' ? atOmega(s) : []),
  onAdvance: () => [...terrorDiscard, specific('plaguebearer.agendaOne')],
})
registerAgenda({
  code: C.agendas[1],
  forced: (s, t) => (t.type === 'roundEnds' ? atOmega(s) : []),
  onAdvance: (s) => [
    ...terrorDiscard,
    specific('plaguebearer.find', { code: C.troubleshooter, location: L.tunnel }),
    specific('plaguebearer.find', { code: C.thrall, location: L.omega }),
    ...s.investigators
      .filter((i) => !i.eliminated)
      .map((i) =>
        effectTest(i.id, C.agendas[1], 'willpower', 3, {
          onFail: [{ type: 'MoveTo', investigator: i.id, location: L.omega }],
        }),
      ),
  ],
})
registerAgenda({
  code: C.agendas[2],
  forced: (s, t) => (t.type === 'roundEnds' ? atOmega(s) : []),
  onAdvance: (s) => [
    ...activeInvestigators(s).map((i) => ({
      type: 'SufferTrauma' as const,
      physical: 1,
      investigator: i.id,
    })),
    { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } },
  ],
})
function atOmega(s: GameState): Message[] {
  return activeInvestigators(s)
    .filter((i) => i.location === L.omega)
    .flatMap((i) => {
      const cards = Object.values(s.treacheries).filter(
        (t) =>
          t.placement.type === 'threatArea' &&
          t.placement.investigator === i.id &&
          t.traits?.includes('Terror'),
      )
      return [
        ...cards.map((t) => ({ type: 'DiscardTreachery' as const, treachery: t.id })),
        ...(terrorCount(s, i.id)
          ? [{ type: 'TakeDamage' as const, investigator: i.id, damage: 0, horror: cards.length }]
          : []),
      ]
    })
}
