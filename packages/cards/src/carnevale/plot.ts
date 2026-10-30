import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  placedLocation,
  push,
  registerAct,
  registerAgenda,
  registerLocation,
  shuffle,
  type GameState,
  type Message,
} from '@lcg/engine'
import { chooseSkillTest } from '../scenario-helpers'
import { C } from './codes'
import { cnidathqua } from './data'
import { lookAbilities } from './guests'
import { masked, onSpecific, rescued, sacrificed, specific } from './helpers'

/** Orden de jugadores: empieza el jefe y continúa según los asientos guardados. */
const playerOrder = (s: GameState) => {
  const lead = leadInvestigator(s),
    index = s.investigators.findIndex((i) => i.id === lead?.id)
  return [...s.investigators.slice(index), ...s.investigators.slice(0, index)].filter(
    (i) => !i.eliminated,
  )
}

onSpecific('carnevaleChooseFlip', (s, data) => {
  const lead = leadInvestigator(s)
  if (!lead) return s
  return push(s, {
    type: 'Ask',
    investigator: lead.id,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.carnevale.chooseFlip',
      choices: masked(s).map((p) => ({
        label: 'choice.location',
        params: { location: s.locations[placedLocation(s, p)!]?.name ?? '' },
        target: { type: 'placed' as const, id: p.id },
        then: [
          specific('carnevaleFlip', { placed: p.id }),
          ...(data.sacrifice === true && p.code === `${C.innocent}b`
            ? [specific('carnevaleInnocentLeaves', { placed: p.id, placementOnly: true })]
            : []),
        ],
      })),
    },
  })
})
onSpecific('carnevaleBoss', (s) => {
  if (Object.values(s.enemies).some((e) => e.code === C.cnidathqua)) return s
  const index = s.setAside.findIndex((c) => c.code === C.cnidathqua)
  if (index < 0) return s
  return push(
    { ...s, setAside: s.setAside.filter((_, n) => n !== index) },
    { type: 'SpawnEnemy', card: cnidathqua, location: '', engageWith: null },
  )
})
registerAct({
  code: C.conspiracy,
  abilities: lookAbilities,
  objectiveMet: (s) => rescued(s).length + sacrificed(s).length === 3,
  onAdvance: () => [specific('carnevaleBoss'), specific('carnevaleChooseFlip')],
})
registerAct({
  code: C.boats,
  forced: (_s, t) => (t.type === 'mythosPhaseBegins' ? [specific('carnevaleChooseFlip')] : []),
  objectiveMet: (s) =>
    activeInvestigators(s).length > 0 &&
    activeInvestigators(s).every((i) => i.location === C.canal),
  onAdvance: (s) => [
    { type: 'PutLocationIntoPlay', location: C.gondola },
    { type: 'RevealLocation', location: C.gondola },
    ...playerOrder(s).map((i): Message => ({
      type: 'MoveTo',
      investigator: i.id,
      location: C.gondola,
    })),
    specific('carnevaleLeaveVenice'),
  ],
})
onSpecific('carnevaleLeaveVenice', (s) => {
  const removed = Object.keys(s.locations).filter((id) => id !== C.gondola)
  return push(
    s,
    ...Object.values(s.enemies)
      .filter((e) => !e.global && removed.includes(e.location))
      .map((e): Message => ({ type: 'RemoveEnemyFromGame', enemy: e.id })),
    ...removed.map((location): Message => ({ type: 'RemoveLocation', location })),
    { type: 'SetScenarioMeta', key: 'carnevaleRing', value: '' },
  )
})
registerAct({
  code: C.row,
  objectiveMet: (s) => (s.locations[C.gondola]?.resources ?? 0) >= 4 * s.startingInvestigatorCount,
  onAdvance: () => [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } }],
})
registerLocation({
  code: C.gondola,
  abilities: (_s, _self, investigator) => [
    {
      key: `${C.gondola}:row`,
      label: 'ability.carnevale.row',
      actions: 1,
      provokes: true,
      then: [
        chooseSkillTest(investigator, C.gondola, ['combat', 'agility'], 2, {
          onSuccess: [specific('carnevaleRowed')],
        }),
      ],
    },
  ],
})
onSpecific('carnevaleRowed', (s) => {
  const l = s.locations[C.gondola]
  if (!l) return s
  return push(
    { ...s, locations: { ...s.locations, [l.id]: { ...l, resources: (l.resources ?? 0) + 1 } } },
    { type: 'CheckActObjective' },
  )
})

/** Se mira un grupo de hasta cinco cartas, sin reciclar dentro del mismo grupo. */
onSpecific('carnevaleRowEncounter', (s, data) => {
  const by = String(data.investigator),
    i = getInvestigator(s, by)
  if (i.eliminated || !i.location) return s
  let deck = s.encounterDeck,
    discard = s.encounterDiscard,
    rng = s.rng
  if (!deck.length) {
    ;[deck, rng] = shuffle(discard, rng)
    discard = []
  }
  const top = deck.slice(0, 5)
  return push(
    {
      ...s,
      rng,
      encounterDeck: deck.slice(5),
      encounterDiscard: [...discard, ...top.filter((c) => c.code !== C.appendage)],
    },
    ...top.flatMap((card): Message[] =>
      card.kind === 'enemy' && card.code === C.appendage
        ? [{ type: 'SpawnEnemy', card, location: i.location!, engageWith: by }]
        : [],
    ),
  )
})

registerAgenda({ code: C.festivities, onAdvance: () => [specific('carnevaleReleaseReveler')] })
registerAgenda({
  code: C.eclipse,
  repeats: true,
  onAdvance: () => [
    specific('carnevaleChooseFlip', { sacrifice: true }),
    specific('carnevaleEclipseFinished'),
  ],
})
onSpecific('carnevaleEclipseFinished', (s) =>
  masked(s).length ? s : push(s, { type: 'AgendaAdvanced', from: C.eclipse }),
)
registerAgenda({
  code: C.chaos,
  repeats: true,
  forced: (s, t) =>
    t.type === 'enemySpawned' && s.enemies[t.enemy]?.code === C.appendage
      ? [{ type: 'PlaceDoomOnEnemy', enemy: t.enemy, amount: 2, checkAgenda: false }]
      : [],
  onAdvance: (s) => {
    const boss = Object.values(s.enemies).find((e) => e.code === C.cnidathqua)
    return boss
      ? playerOrder(s).map((i): Message => ({
          type: 'EnemyAttack',
          enemy: boss.id,
          investigator: i.id,
          exhaustAfter: false,
          evenIfExhausted: true,
        }))
      : []
  },
})
