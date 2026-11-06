import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  isPermanent,
  nextInt,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerScenario,
  registerTreachery,
  shuffle,
  skillTestValue,
  type CampaignLog,
  type Choice,
  type Difficulty,
  type EncounterCard,
  type Enemy,
  type GameState,
  type Message,
  type ScenarioDefinition,
} from '@lcg/engine'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { copies, effectTest, endScenario, recordNote } from '../scenario-helpers'
import { PLAGUEBEARER_CHAOS_BAGS } from './campaign'
import { C, ask, bloodInVeins, damage, lead, miasma, on, run, specific } from './helpers'
import { devoted, thrall, treacheries } from './data'
import { TOWN, grinningVictim } from './night-data'
import { townReactions } from './night-citizens'
import { arkhamAllied } from './arkham-allied'
import {
  E,
  FALLEN,
  K,
  RING,
  T,
  chorusDeck,
  chorusLocations,
  elites,
  fallenTreacheries,
  minister,
  priest,
} from './chorus-data'

export const MOURNING_CHORUS = 'mourning-chorus'
const PROCESSION = 'chorusProcession'
const DECK = 'chorusDeck'
const DISCARD = 'chorusDiscard'
const ELITES = 'chorusElites'
const RALLIED = 'chorusRallied'
const RES = 'chorusAgendaResources'
const hard = (s: GameState) => s.difficulty === 'hard' || s.difficulty === 'expert'
const players = (s: GameState) => s.investigators.length
const status = (log: CampaignLog | undefined, id: string) =>
  log?.values[`plaguebearerTown${id}`] as 'Defended' | 'Infected' | undefined

/**
 * Estado de Arkham al empezar (guía ES p. 10 / EN p. 12): los Lugares sin marca reciben,
 * en orden aleatorio, el valor que aparezca menos (al azar si empatan).
 */
export function arkhamStatus(log: CampaignLog | undefined, seed: number) {
  const result: Record<string, 'Defended' | 'Infected'> = {}
  for (const row of TOWN) {
    const value = status(log, row.id)
    if (value) result[row.id] = value
  }
  const [order, start] = shuffle(
    TOWN.map((r) => r.id).filter((id) => !result[id]),
    seed,
  )
  let rng = start
  for (const id of order) {
    const infected = Object.values(result).filter((v) => v === 'Infected').length
    const defended = Object.values(result).filter((v) => v === 'Defended').length
    if (infected === defended) {
      const [coin, next] = nextInt(rng, 2)
      rng = next
      result[id] = coin ? 'Infected' : 'Defended'
    } else result[id] = infected < defended ? 'Infected' : 'Defended'
  }
  return result
}
const ringIndex = (s: GameState, location: string) =>
  RING.findIndex((id) => {
    const row = TOWN.find((r) => r.id === id)!
    return location === row.stable || location === row.ruin
  })
const ringLocation = (s: GameState, index: number) => {
  const row = TOWN.find((r) => r.id === RING[((index % 8) + 8) % 8])!
  return s.locations[row.stable] ? row.stable : row.ruin
}
const procession = (s: GameState) =>
  (s.scenarioDecks?.[PROCESSION] ?? []).filter((id) => s.enemies[id])
const inProcession = (s: GameState, e: Enemy) => procession(s).includes(e.id)
const priestOf = (s: GameState) => Object.values(s.enemies).find((e) => e.code === K.priest)

export function mourningChorus({
  difficulty = 'standard',
  log,
  seed = 1,
  investigators = 1,
}: {
  difficulty?: Difficulty
  log?: CampaignLog
  seed?: number
  investigators?: number
} = {}): ScenarioDefinition {
  const town = arkhamStatus(log, seed)
  const { stable, ruins } = chorusLocations()
  const inPlay = TOWN.map((row) =>
    town[row.id] === 'Infected'
      ? ruins.find((l) => l.id === row.ruin)!
      : stable.find((l) => l.id === row.stable)!,
  )
  const defended = TOWN.filter((r) => town[r.id] === 'Defended').map((r) => r.id)
  const threshold = 5 + 2 * investigators
  return {
    id: MOURNING_CHORUS,
    intro: {
      title: 'story.plaguebearer.chorus.introTitle',
      body: 'story.plaguebearer.chorus.intro',
    },
    setupInstructions: {
      title: 'story.plaguebearer.chorus.setupTitle',
      body: 'story.plaguebearer.chorus.setup',
    },
    locations: inPlay,
    setAsideLocations: [...stable, ...ruins].filter((l) => !inPlay.includes(l)),
    startingLocation: inPlay.find((l) => stable.includes(l))?.id ?? inPlay[0]!.id,
    startingLocationChoices: inPlay.filter((l) => stable.includes(l)).map((l) => l.id),
    agendas: [
      { code: K.agendas[0], name: 'Eldritch Procession', doomThreshold: threshold },
      { code: K.agendas[1], name: 'Song of Sacrifice', doomThreshold: threshold },
    ],
    acts: [
      {
        code: K.acts[0],
        name: 'Unstoppable Force',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      {
        code: K.acts[1],
        name: 'Immovable Objects',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...chorusDeck(),
      ...fallenTreacheries
        .filter((t) => !defended.some((id) => FALLEN[id]!.treachery === t.code))
        .flatMap((t) => copies(t, 2)),
      ...treacheries
        .filter((t) => t.code === C.urge || t.code === C.another)
        .flatMap((t) => copies(t, t.code === C.urge ? 3 : 2)),
      ...ENCOUNTER_SETS.lockedDoors,
    ],
    setAside: [
      priest,
      ...copies(minister, 3),
      ...copies(grinningVictim, 3),
      ...copies(thrall, 3),
      { ...devoted },
      ...elites.filter((e) => !defended.some((id) => FALLEN[id]!.elite === e.code)),
    ],
    chaosBag: [...PLAGUEBEARER_CHAOS_BAGS[difficulty]],
    tokenValues: { skull: 0, cultist: -3, tablet: -3, elderThing: 0 },
    setup: [
      ...TOWN.filter((r) => !status(log, r.id)).flatMap((r) => [
        specific('night.recordTown', { location: r.id, status: town[r.id]! }),
        recordNote(`plaguebearerTown${r.id}${town[r.id]}`),
      ]),
      specific('chorus.introHidden', { index: 0 }),
      specific('chorus.setup', {
        elites: elites
          .filter((e) => !defended.some((id) => FALLEN[id]!.elite === e.code))
          .map((e) => e.code)
          .join(','),
      }),
    ],
  }
}

// ---------------------------------------------------------------------------
// Preparación y Procesión
// ---------------------------------------------------------------------------

on('chorus.setup', (s, d) => {
  const pool = String(d.elites).split(',').filter(Boolean)
  const [index, rng1] = nextInt(s.rng, Math.max(1, pool.length))
  const first = pool[index]
  const rest = pool.filter((_, n) => n !== index)
  const [deck, rng2] = shuffle(
    [
      K.minister,
      K.minister,
      ...Array(3).fill(grinningVictim.code),
      ...Array(3).fill(thrall.code),
      ...(first ? [first] : []),
    ],
    rng1,
  )
  const infected = Object.keys(s.locations).filter(miasma)
  const [at, rng] = nextInt(rng2, Math.max(1, infected.length))
  const start = infected[at] ?? Object.keys(s.locations)[0]!
  const next = ringLocation(s, ringIndex(s, start) + 1)
  return push(
    {
      ...s,
      rng,
      scenarioDecks: {
        ...s.scenarioDecks,
        [DECK]: deck,
        [DISCARD]: [],
        [ELITES]: rest,
        [PROCESSION]: [],
      },
      scenarioMeta: { ...s.scenarioMeta, chorusSetup: 1 },
    },
    ...(infected.length >= 6 ? [specific('chorus.rally', { times: infected.length - 5 })] : []),
    { type: 'SpawnSetAsideEnemy', code: K.priest, location: start },
    specific('chorus.join', { code: K.priest, location: start, doom: 0 }),
    { type: 'SpawnSetAsideEnemy', code: K.minister, location: next },
    specific('chorus.join', { code: K.minister, location: next, doom: 1 }),
    { type: 'SetScenarioMeta', key: 'chorusSetup', value: 0 },
  )
})
// Con 6 o más Lugares Infectados, el jefe elige uno (dos con 7) para marcarlo Defendido.
on('chorus.rally', (s, d) => {
  const times = Number(d.times)
  if (times <= 0) return s
  const ruins = TOWN.filter((r) => s.locations[r.ruin])
  return ask(
    s,
    lead(s),
    ruins.map((row) => ({
      label: 'choice.location',
      params: { location: row.name },
      target: { type: 'location' as const, id: row.ruin },
      then: [
        specific('chorus.cure', { location: row.id }),
        specific('chorus.rally', { times: times - 1 }),
      ],
    })),
    'prompt.plaguebearer.chorus.rally',
  )
})
on('chorus.cure', (s, d) => {
  const row = TOWN.find((r) => r.id === String(d.location))!
  const card = s.setAsideLocations[row.stable]
  const ruin = s.locations[row.ruin]
  if (!card || !ruin) return s
  const { [row.ruin]: _gone, ...locations } = s.locations
  const fallen = FALLEN[row.id]!
  const next: GameState = {
    ...s,
    locations: {
      ...locations,
      [row.stable]: { ...ruin, ...card, id: row.stable, clues: 0, revealed: false },
    },
    setAsideLocations: Object.fromEntries(
      Object.entries(s.setAsideLocations).filter(([id]) => id !== row.stable),
    ),
    encounterDeck: s.encounterDeck.filter((c) => c.code !== fallen.treachery),
    setAside: s.setAside.filter((c) => c.code !== fallen.elite),
    scenarioDecks: {
      ...s.scenarioDecks,
      [ELITES]: (s.scenarioDecks?.[ELITES] ?? []).filter((c) => c !== fallen.elite),
      [DECK]: (s.scenarioDecks?.[DECK] ?? []).filter((c) => c !== fallen.elite),
    },
  }
  return push(
    next,
    specific('night.recordTown', { location: row.id, status: 'Defended' }),
    { type: 'CrossOutNote', note: `plaguebearerTown${row.id}Infected` },
    recordNote(`plaguebearerTown${row.id}Defended`),
  )
})
on('chorus.join', (s, d) => {
  const ids = procession(s)
  const enemy = Object.values(s.enemies)
    .filter((e) => e.code === String(d.code) && e.location === String(d.location))
    .find((e) => !ids.includes(e.id))
  if (!enemy) return s
  return push(
    { ...s, scenarioDecks: { ...s.scenarioDecks, [PROCESSION]: [...ids, enemy.id] } },
    ...(Number(d.doom) > 0
      ? [{ type: 'PlaceDoomOnEnemy' as const, enemy: enemy.id, amount: Number(d.doom) }]
      : []),
  )
})
/** Aumenta la Procesión: el siguiente enemigo aparece a la derecha del último. */
on('chorus.grow', (s) => {
  let deck = s.scenarioDecks?.[DECK] ?? []
  let rng = s.rng
  let discard = s.scenarioDecks?.[DISCARD] ?? []
  if (!deck.length) {
    ;[deck, rng] = shuffle(discard, rng)
    discard = []
  }
  const [code, ...rest] = deck
  const last = procession(s).at(-1)
  if (!code || !last) return s
  const location = ringLocation(s, ringIndex(s, s.enemies[last]!.location) + 1)
  return push(
    {
      ...s,
      rng,
      scenarioDecks: { ...s.scenarioDecks, [DECK]: rest, [DISCARD]: discard },
    },
    { type: 'SpawnSetAsideEnemy', code, location },
    specific('chorus.join', { code, location, doom: 1 }),
  )
})
/** Mueve la Procesión: el Sacerdote retrocede y los demás preparados le siguen. */
on('chorus.move', (s) => {
  const p = priestOf(s)
  if (!p) return s
  const target = ringLocation(s, ringIndex(s, p.location) - 1)
  return push(
    s,
    { type: 'MoveEnemy', enemy: p.id, location: target },
    specific('chorus.follow'),
    specific('chorus.priestMoved'),
  )
})
on('chorus.follow', (s) => {
  const p = priestOf(s)
  if (!p) return s
  const start = ringIndex(s, p.location)
  const occupied = new Set([
    p.location,
    ...procession(s)
      .map((id) => s.enemies[id]!)
      .filter((e) => e.exhausted && e.id !== p.id)
      .map((e) => e.location),
  ])
  const moves: Message[] = []
  for (const id of procession(s)) {
    const e = s.enemies[id]!
    if (e.id === p.id || e.exhausted) continue
    let k = 1
    while (k < 8 && occupied.has(ringLocation(s, start + k))) k++
    const to = ringLocation(s, start + k)
    occupied.add(to)
    moves.push({ type: 'DisengageEnemy', enemy: e.id })
    if (to !== e.location) moves.push({ type: 'MoveEnemy', enemy: e.id, location: to })
  }
  return push(s, ...moves)
})
on('chorus.priestMoved', (s) => {
  const p = priestOf(s)
  if (!p) return s
  const l = s.locations[p.location]!
  const last = procession(s).at(-1)
  return push(
    { ...s, locations: { ...s.locations, [l.id]: { ...l, clues: l.clues + 1 } } },
    ...(miasma(p.location)
      ? last
        ? [{ type: 'PlaceDoomOnEnemy' as const, enemy: last, amount: 2 }]
        : []
      : [specific('chorus.grow')]),
  )
})
/** Recursos sobre el plan en curso: cada 2 mueven la Procesión. */
on('chorus.agendaResources', (s, d) => {
  const total = Number(s.scenarioMeta?.[RES] ?? 0) + Number(d.amount)
  const moves = Math.floor(total / 2)
  return push(
    { ...s, scenarioMeta: { ...s.scenarioMeta, [RES]: total % 2 } },
    ...Array.from({ length: moves }, () => specific('chorus.move')),
  )
})
const toAgenda = (amount: number) => specific('chorus.agendaResources', { amount })

for (const code of K.agendas)
  registerAgenda({
    code,
    skipsMythosDoom: true,
    forced: (s, t) => (t.type === 'mythosPhaseBegins' ? [toAgenda(players(s))] : []),
    onAdvance: () =>
      code === K.agendas[0]
        ? [{ type: 'SetScenarioMeta', key: RES, value: 0 }, specific('chorus.ritual')]
        : [
            specific('chorus.unbinding'),
            { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } },
          ],
  })
// Un Ritual ominoso: perdición en el Sacerdote; los no Élite dejan su sitio al Esclavo devoto.
on('chorus.ritual', (s) => {
  const p = priestOf(s)
  const gone = procession(s)
    .map((id) => s.enemies[id]!)
    .filter((e) => !e.traits?.includes('Elite'))
  const spot = gone[0]?.location ?? p?.location
  return push(
    s,
    ...(p ? [{ type: 'PlaceDoomOnEnemy' as const, enemy: p.id, amount: 1 }] : []),
    ...gone.map((e): Message => ({ type: 'DiscardEnemy', enemy: e.id })),
    ...(spot
      ? [
          { type: 'SpawnSetAsideEnemy' as const, code: devoted.code, location: spot },
          specific('chorus.join', { code: devoted.code, location: spot, doom: 0 }),
        ]
      : []),
  )
})
on('chorus.unbinding', (s) => {
  const p = priestOf(s)
  const row = p && TOWN.find((r) => r.stable === p.location || r.ruin === p.location)
  return row ? { ...s, scenarioMeta: { ...s.scenarioMeta, chorusSite: row.id } } : s
})

registerAct({
  code: K.acts[0],
  onAdvance: () => [specific('chorus.hitAndRun')],
})
on('chorus.hitAndRun', (s) => {
  const elites = s.scenarioDecks?.[ELITES] ?? []
  const [index, rng1] = nextInt(s.rng, Math.max(1, elites.length))
  const [deck, rng] = shuffle(
    [
      ...(s.scenarioDecks?.[DECK] ?? []),
      ...(s.scenarioDecks?.[DISCARD] ?? []),
      ...(elites[index] ? [elites[index]!] : []),
    ],
    rng1,
  )
  return {
    ...s,
    rng,
    scenarioDecks: {
      ...s.scenarioDecks,
      [DECK]: deck,
      [DISCARD]: [],
      [ELITES]: elites.filter((_, n) => n !== index),
    },
    scenarioMeta: { ...s.scenarioMeta, chorusBarricades: 1 },
  }
})
registerAct({
  code: K.acts[1],
  objectiveMet: () => false,
  abilities: (s, _self, by) => {
    const here = getInvestigator(s, by).location
    const group = activeInvestigators(s).filter((i) => i.location === here)
    const clues = group.reduce((n, i) => n + i.clues, 0)
    return here
      ? [1, 2]
          .filter((n) => n <= clues)
          .map((n) => ({
            key: `chorus:barricade:${n}`,
            label: 'ability.plaguebearer.chorus.barricade',
            params: { amount: n },
            actions: 1,
            provokes: true,
            costs: [{ type: 'PayGroupClues' as const, amount: n, from: group.map((i) => i.id) }],
            then: [specific('chorus.barricade', { location: here, amount: n })],
          }))
      : []
  },
})
on('chorus.barricade', (s, d) => {
  const id = String(d.location),
    l = s.locations[id]
  if (!l) return s
  const resources = (l.resources ?? 0) + Number(d.amount)
  const rallied = s.scenarioDecks?.[RALLIED] ?? []
  const row = TOWN.find((r) => r.stable === id || r.ruin === id)
  const rally =
    d.stable === true &&
    row &&
    resources >= 3 * players(s) &&
    rallied.length < 2 &&
    !rallied.includes(row.id)
  return {
    ...s,
    locations: { ...s.locations, [id]: { ...l, resources } },
    ...(rally ? { scenarioDecks: { ...s.scenarioDecks, [RALLIED]: [...rallied, row!.id] } } : {}),
  }
})
/** Acto 2a: tras resolver una capacidad de un Lugar Seguro, una Barricada allí. */
on('chorus.stableUsed', (s, d) =>
  s.acts[s.actIndex]?.code === K.acts[1]
    ? run(s, 'chorus.barricade', { location: String(d.location), amount: 1, stable: true })
    : s,
)

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

registerEnemy({
  code: K.priest,
  // No puede ser dañado por cartas o efectos de jugador (sí por las Barricadas).
  damageTaken: (_s, _self, amount, source) => ({ amount: source.encounter ? amount : 0 }),
})
registerEnemy({
  code: K.minister,
  forced: (s, t, self) => {
    if (t.type !== 'enemySpawned' || t.enemy !== self.id || s.scenarioMeta?.chorusSetup === 1)
      return []
    const other = Object.values(s.enemies).find((e) => e.id !== self.id && (e.doom ?? 0) > 0)
    return other
      ? [
          { type: 'RemoveDoom', target: { type: 'enemy', id: other.id }, amount: 1 },
          { type: 'PlaceDoom', amount: 1 },
        ]
      : []
  },
})
registerEnemy({
  code: E.couple,
  healthModifier: (s, self) =>
    activeInvestigators(s)
      .filter((i) => i.location === self.location)
      .reduce(
        (n, i) =>
          n +
          Object.values(s.assets).filter((a) => a.owner === i.id && !isPermanentAsset(a.code))
            .length,
        0,
      ),
})
const isPermanentAsset = (code: string) => isPermanent(code)
// El Vicepresidente: cada investigador de su Lugar puede gastar recursos para reducir el ataque.
registerEnemy({
  code: E.vicePresident,
  onAttack: (s, self) => [
    { type: 'SetScenarioMeta', key: 'chorusVpReduce', value: 0 },
    ...activeInvestigators(s)
      .filter((i) => i.location === self.location && i.resources > 0)
      .map((i) => specific('chorus.vp', { investigator: i.id })),
  ],
})
on('chorus.vp', (s, d) => {
  const by = String(d.investigator),
    r = getInvestigator(s, by).resources
  return ask(
    s,
    by,
    Array.from({ length: r + 1 }, (_, n) => ({
      label: 'choice.plaguebearer.chorus.spend',
      params: { amount: n },
      then: n
        ? [
            { type: 'SpendResources' as const, investigator: by, amount: n },
            {
              type: 'SetScenarioMeta' as const,
              key: 'chorusVpReduce',
              value: Number(s.scenarioMeta?.chorusVpReduce ?? 0) + n,
            },
          ]
        : [],
    })),
    'prompt.plaguebearer.chorus.vicePresident',
  )
})
// Ma Matheson: exilia los Aliados que reciban daño u horror de su ataque.
registerEnemy({
  code: E.ma,
  onAttack: (s, _self, by) => [
    {
      type: 'SetScenarioMeta',
      key: 'chorusMa',
      value: JSON.stringify(
        Object.values(s.assets)
          .filter((a) => a.owner === by && playerCardDef(a.code)?.slots?.includes('ally'))
          .map((a) => [a.id, a.damage + a.horror]),
      ),
    },
  ],
})

// ---------------------------------------------------------------------------
// Traiciones
// ---------------------------------------------------------------------------

const threat = (by: string, id: string): Message => ({
  type: 'PlaceTreachery',
  treachery: id,
  placement: { type: 'threatArea', investigator: by },
})
registerTreachery({
  code: K.call,
  revelation: (_s, by, self) => [threat(by, self.id)],
  abilities: (s, self, by) =>
    self.placement.type === 'threatArea' &&
    self.placement.investigator === by &&
    getInvestigator(s, by).clues >= 2
      ? [
          {
            key: `${self.id}:discard`,
            label: 'ability.plaguebearer.chorus.call',
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendClues', investigator: by, amount: 2 }],
            then: [{ type: 'DiscardTreachery', treachery: self.id }],
          },
        ]
      : [],
  forced: (_s, t, self) =>
    t.type === 'enemyDefeated' &&
    self.placement.type === 'threatArea' &&
    t.by === self.placement.investigator
      ? [{ type: 'DrawEncounterCard', investigator: t.by }]
      : [],
})
registerTreachery({
  code: K.coral,
  revelation: (s, _by, self) => {
    const taken = new Set(
      Object.values(s.treacheries)
        .filter((t) => t.code === K.coral && t.placement.type === 'location')
        .map((t) => (t.placement as { location: string }).location),
    )
    const options = Object.values(s.locations).filter((l) => !taken.has(l.id))
    const most = Math.max(-1, ...options.map((l) => l.clues))
    const target = options.find((l) => l.clues === most)
    return target
      ? [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'location', location: target.id },
          },
        ]
      : []
  },
  forced: (s, t, self) => {
    if (self.placement.type !== 'location') return []
    const at = self.placement.location
    const l = s.locations[at]
    if (!l) return []
    // La perdición de Miasma coral se guarda en su Lugar (cuenta para el plan).
    if (t.type === 'enemyEntersLocation' && t.location === at && !(l.doom ?? 0)) {
      const e = s.enemies[t.enemy]
      return e && (e.doom ?? 0) > 0 ? [specific('chorus.coral', { enemy: e.id, location: at })] : []
    }
    if (l.clues === 0 && t.type !== 'enemyEntersLocation')
      return [
        { type: 'DiscardTreachery', treachery: self.id },
        { type: 'PlaceLocationTokens', location: at, doom: -(l.doom ?? 0) },
      ]
    return []
  },
})
on('chorus.coral', (s, d) => {
  const e = s.enemies[String(d.enemy)],
    l = s.locations[String(d.location)]
  if (!e || !l) return s
  return {
    ...s,
    enemies: { ...s.enemies, [e.id]: { ...e, doom: 0 } },
    locations: { ...s.locations, [l.id]: { ...l, doom: (l.doom ?? 0) + (e.doom ?? 0) } },
  }
})
registerTreachery({
  code: K.march,
  revelation: (s, by) => [
    effectTest(by, K.march, 'agility', Math.max(0, 6 - Object.keys(s.enemies).length), {}),
  ],
})
on('chorus.march', (s, d) => {
  const by = String(d.investigator),
    n = Number(d.margin)
  return ask(
    s,
    by,
    Array.from({ length: n + 1 }, (_, resources) => ({
      label: 'choice.plaguebearer.chorus.march',
      params: { resources, damage: n - resources },
      then: [
        ...(resources ? [toAgenda(resources)] : []),
        ...(n - resources ? [damage(by, n - resources)] : []),
      ],
    })),
    'prompt.plaguebearer.chorus.march',
  )
})
registerTreachery({
  code: K.prayer,
  revelation: (_s, by) => [
    {
      type: 'Ask',
      investigator: by,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.plaguebearer.chorus.prayer',
        choices: [
          { label: 'choice.plaguebearer.chorus.grow', then: [specific('chorus.grow')] },
          {
            label: 'choice.plaguebearer.chorus.reveal',
            then: [specific('chorus.prayerAttack', { investigator: by })],
          },
        ],
      },
    },
  ],
})
on('chorus.prayerAttack', (s, d) => {
  const by = String(d.investigator)
  const [top] = s.scenarioDecks?.[DECK] ?? []
  const card = s.setAside.find(
    (c): c is Extract<EncounterCard, { kind: 'enemy' }> => c.kind === 'enemy' && c.code === top,
  )
  if (!card) return s
  const [deck, rng] = shuffle(s.scenarioDecks?.[DECK] ?? [], s.rng)
  return push(
    { ...s, rng, scenarioDecks: { ...s.scenarioDecks, [DECK]: deck } },
    damage(by, card.damage, card.horror),
  )
})
registerTreachery({
  code: K.sacrifice,
  revelation: (_s, by) => [effectTest(by, K.sacrifice, 'agility', 3, {})],
})
on('chorus.sacrifice', (s, d) => {
  const by = String(d.investigator)
  const from = getInvestigator(s, by).location
  if (!from) return s
  const distance = distancesFrom(s, from)
  const doomed = Object.values(s.enemies).filter(
    (e) => (e.doom ?? 0) > 0 && distance.has(e.location),
  )
  const best = Math.min(...doomed.map((e) => distance.get(e.location)!))
  const nearest = doomed.filter((e) => distance.get(e.location) === best)
  return ask(
    s,
    by,
    nearest.flatMap((e): Choice[] => [
      {
        label: 'choice.plaguebearer.chorus.sacrificeDamage',
        params: { enemy: e.name, amount: e.doom ?? 0 },
        target: { type: 'enemy', id: e.id },
        then: [
          { type: 'TakeDamage', investigator: by, damage: e.doom ?? 0, horror: 0, direct: true },
        ],
      },
      {
        label: 'choice.plaguebearer.chorus.sacrificeDoom',
        params: { enemy: e.name, amount: e.doom ?? 0 },
        target: { type: 'enemy', id: e.id },
        then: [
          { type: 'RemoveDoom', target: { type: 'enemy', id: e.id }, amount: e.doom ?? 0 },
          { type: 'PlaceDoom', amount: e.doom ?? 0 },
        ],
      },
    ]),
    'prompt.plaguebearer.chorus.sacrifice',
  )
})

// Arkham caído: traiciones de cada Lugar no Defendido.
registerTreachery({
  code: T.badNews,
  revelation: (_s, by) => [
    effectTest(by, T.badNews, 'willpower', 3, {
      onFail: [specific('chorus.badNews', { investigator: by })],
    }),
  ],
})
on('chorus.badNews', (s, d) => {
  const by = String(d.investigator),
    i = getInvestigator(s, by)
  const events = i.hand.filter((c) => {
    const def = playerCardDef(c)
    return def?.type === 'event' && !def.weakness
  })
  return events.length
    ? push(
        s,
        ...events.map(
          (code) => ({ type: 'DiscardFromHand', investigator: by, card: code }) as Message,
        ),
      )
    : push(s, { type: 'DrawEncounterCard', investigator: by })
})
registerTreachery({
  code: T.bankrupture,
  revelation: (s, by) => {
    const r = getInvestigator(s, by).resources
    return [
      {
        type: 'Ask',
        investigator: by,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.plaguebearer.chorus.bankrupture',
          choices: Array.from({ length: r + 1 }, (_, n) => ({
            label: 'choice.plaguebearer.chorus.spend',
            params: { amount: n },
            then: [
              ...(n ? [{ type: 'SpendResources' as const, investigator: by, amount: n }] : []),
              effectTest(by, T.bankrupture, 'agility', Math.max(0, 1 + r - n), {}),
            ],
          })),
        },
      },
    ]
  },
})
registerTreachery({
  code: T.worked,
  revelation: (_s, by, self) => [
    effectTest(by, T.worked, 'willpower', 3, { onFail: [threat(by, self.id)] }),
  ],
  forced: (s, t, self) =>
    t.type === 'afterCommit' &&
    self.placement.type === 'threatArea' &&
    t.by === self.placement.investigator &&
    playerCardDef(s.skillTest?.committed.at(-1)?.code ?? '')?.type === 'skill'
      ? [specific('chorus.worked', { investigator: t.by })]
      : [],
  abilities: (s, self, by) =>
    self.placement.type === 'threatArea' &&
    self.placement.investigator === by &&
    !getInvestigator(s, by).hand.some((c) => playerCardDef(c)?.type === 'skill')
      ? [
          {
            key: `${self.id}:discard`,
            label: 'ability.plaguebearer.chorus.worked',
            actions: 0,
            provokes: false,
            then: [{ type: 'DiscardTreachery', treachery: self.id }],
          },
        ]
      : [],
})
on('chorus.worked', (s, d) => {
  const by = String(d.investigator)
  return ask(
    s,
    by,
    [
      { label: 'choice.plaguebearer.chorus.damage', then: [damage(by, 1)] },
      ...(getInvestigator(s, by).hand.length
        ? [
            {
              label: 'choice.plaguebearer.chorus.randomDiscard',
              then: [{ type: 'DiscardRandomFromHand', investigator: by, amount: 1 } as Message],
            },
          ]
        : []),
    ],
    'prompt.plaguebearer.chorus.worked',
  )
})
const ownedAssets = (s: GameState, by: string) =>
  Object.values(s.assets).filter((a) => a.owner === by)
/**
 * El motor no vincula traiciones a apoyos: la carta va a la zona de amenaza del dueño y
 * el apoyo vinculado se recuerda en scenarioMeta (`chorus:on:<traición>`).
 */
const attachTo = (id: string, asset: string): Message =>
  specific('chorus.attach', { treachery: id, asset })
on('chorus.attach', (s, d) => {
  const a = s.assets[String(d.asset)]
  if (!a) return s
  return push(
    { ...s, scenarioMeta: { ...s.scenarioMeta, [`chorus:on:${d.treachery}`]: a.id } },
    {
      type: 'PlaceTreachery',
      treachery: String(d.treachery),
      placement: { type: 'threatArea', investigator: a.owner },
    },
  )
})
const attachedAsset = (s: GameState, id: string) => {
  const asset = s.scenarioMeta?.[`chorus:on:${id}`]
  return asset ? s.assets[String(asset)] : undefined
}
registerTreachery({
  code: T.damaged,
  revelation: (s, by, self) => {
    const options = ownedAssets(s, by).filter((a) => !isPermanentAsset(a.code))
    return options.length
      ? [attachTo(self.id, options[0]!.id)]
      : [{ type: 'DrawEncounterCard', investigator: by }]
  },
  abilities: (s, self, by) =>
    attachedAsset(s, self.id)?.owner === by
      ? [
          {
            key: `${self.id}:discard`,
            label: 'ability.plaguebearer.chorus.damaged',
            actions: 1,
            provokes: true,
            then: [damage(by, 2), { type: 'DiscardTreachery', treachery: self.id }],
          },
        ]
      : [],
})
registerTreachery({
  code: T.boneDry,
  revelation: (_s, by, self) => [
    threat(by, self.id),
    specific('chorus.boneDryInit', { treachery: self.id }),
  ],
})
on('chorus.boneDryInit', (s, d) => ({
  ...s,
  scenarioMeta: { ...s.scenarioMeta, [`chorus:boneDry:${d.treachery}`]: 3 },
}))
registerTreachery({
  code: T.brokenTrust,
  revelation: (s, by, self) => {
    const allies = ownedAssets(s, by).filter((a) => playerCardDef(a.code)?.slots?.includes('ally'))
    return allies.length
      ? [attachTo(self.id, allies[0]!.id)]
      : [{ type: 'DrawEncounterCard', investigator: by }]
  },
  blanksAsset: (s, self, asset) => attachedAsset(s, self.id)?.id === asset.id,
  abilities: (s, self, by) => {
    const a = attachedAsset(s, self.id)
    if (!a || a.owner !== by) return []
    const cost = 1 + a.damage + a.horror
    return getInvestigator(s, by).resources >= cost
      ? [
          {
            key: `${self.id}:discard`,
            label: 'ability.plaguebearer.chorus.brokenTrust',
            params: { amount: cost },
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendResources', investigator: by, amount: cost }],
            then: [{ type: 'DiscardTreachery', treachery: self.id }],
          },
        ]
      : []
  },
})
registerTreachery({
  code: T.whispers,
  revelation: (s, by, self) => {
    const options = ownedAssets(s, by)
      .filter((a) => !playerCardDef(a.code)?.slots?.includes('ally'))
      .sort((x, y) => (playerCardDef(y.code)?.cost ?? 0) - (playerCardDef(x.code)?.cost ?? 0))
    return options.length ? [attachTo(self.id, options[0]!.id)] : []
  },
  abilities: (s, self, by) => {
    const a = attachedAsset(s, self.id)
    return a && a.owner === by
      ? [
          {
            key: `${self.id}:return`,
            label: 'ability.plaguebearer.chorus.whispers',
            actions: 1,
            provokes: true,
            then: [
              { type: 'DiscardTreachery', treachery: self.id },
              { type: 'ReturnAssetToHand', asset: a.id },
            ],
          },
        ]
      : []
  },
})
registerTreachery({
  code: T.tooMuch,
  revelation: (_s, by, self) => [threat(by, self.id)],
  forced: (s, t, self) =>
    t.type === 'turnEnds' &&
    self.placement.type === 'threatArea' &&
    t.investigator === self.placement.investigator
      ? [
          damage(
            t.investigator,
            0,
            Math.max(0, getInvestigator(s, t.investigator).hand.length - 4),
          ),
          { type: 'DiscardTreachery', treachery: self.id },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------

registerScenario({
  id: MOURNING_CHORUS,
  rulesVersion: 1,
  simultaneousAssetAssignment: true,
  sequentialEnemyMovement: true,
  specific: (s, key, data) => run(s, key, data),
  reactions: (s, t) => [
    ...townReactions(s, t),
    // Acto 1a: tras evitar a un enemigo, retira 1 perdición (límite una vez por ronda).
    ...(t.type === 'afterEvade' &&
    s.acts[s.actIndex]?.code === K.acts[0] &&
    (s.enemies[t.enemy]?.doom ?? 0) > 0
      ? [
          {
            key: 'chorus:evade',
            investigator: t.investigator,
            label: 'ability.plaguebearer.chorus.evade',
            limit: { per: 'round' as const },
            then: [
              { type: 'RemoveDoom', target: { type: 'enemy', id: t.enemy }, amount: 1 } as Message,
            ],
          },
        ]
      : []),
  ],
  enemyKeyword: (s, e, keyword) =>
    (keyword === 'hunter' || keyword === ('patrol' as never)) && inProcession(s, e) ? false : null,
  enemyHealthModifier: (_s, e) => e.doom ?? 0,
  enemyDamageModifier: (s, e) =>
    e.code === E.vicePresident
      ? Math.max(0, players(s) - Number(s.scenarioMeta?.chorusVpReduce ?? 0))
      : e.code === E.armitage && armitageBonus(s, e)
        ? 1
        : e.code === E.miriam
          ? Math.ceil(miriamX(s, e) / 2)
          : 0,
  enemyHorrorModifier: (s, e) =>
    e.code === E.vicePresident
      ? Math.max(0, players(s) - Number(s.scenarioMeta?.chorusVpReduce ?? 0))
      : e.code === E.armitage && armitageBonus(s, e)
        ? 1
        : e.code === E.miriam
          ? Math.floor(miriamX(s, e) / 2)
          : 0,
  forced: (s, t) => chorusForced(s, t),
  tokenEffect: (s, token, by) => {
    if (token === 'skull') {
      const most = Math.max(0, ...Object.values(s.enemies).map((e) => e.doom ?? 0))
      return { modifier: hard(s) ? -Math.min(6, most + 1) : -Math.min(4, most) }
    }
    if (token === 'cultist' && bloodInVeins(s)) return { modifier: 0, autoFail: true }
    if (token === 'cultist') {
      const at = getInvestigator(s, by).location
      const m = !!at && miasma(at)
      return {
        modifier: hard(s) ? (m ? -6 : -4) : m ? -5 : -3,
        onSuccess: at ? [specific('chorus.barricade', { location: at, amount: 1 })] : [],
      }
    }
    if (token === 'tablet')
      return hard(s)
        ? { modifier: -3, immediate: [toAgenda(1)] }
        : { modifier: -3, onFail: [toAgenda(1)] }
    throw new Error(`Mourning Chorus: token ${token} is not implemented`)
  },
  resolution: (s, outcome) => chorusResolution(s, outcome),
})
const armitageBonus = (s: GameState, e: Enemy) =>
  !!e.engagedWith && getInvestigator(s, e.engagedWith).hand.length >= 5
function miriamX(s: GameState, e: Enemy): number {
  const here = activeInvestigators(s).filter((i) => i.location === e.location)
  return Math.max(
    0,
    ...Object.values(s.assets)
      .filter(
        (a) =>
          here.some((i) => i.id === a.owner) && !playerCardDef(a.code)?.slots?.includes('ally'),
      )
      .map((a) => playerCardDef(a.code)?.cost ?? 0),
  )
}

/** Margen actual de la prueba en curso (valor final menos dificultad). */
const margin = (s: GameState) =>
  s.skillTest
    ? skillTestValue(s).total +
      (s.skillTest.tokenModifier ?? 0) +
      (s.skillTest.successMarginModifier ?? 0) -
      s.skillTest.difficulty
    : 0
function chorusForced(
  s: GameState,
  t: Parameters<NonNullable<import('@lcg/engine').ScenarioBehavior['forced']>>[1],
): Message[] {
  // Acto 1b: los Infectados retiran Barricadas al entrar y reciben ese daño.
  if (t.type === 'enemyEntersLocation' && s.scenarioMeta?.chorusBarricades === 1) {
    const e = s.enemies[t.enemy],
      l = s.locations[t.location]
    if (e && l && e.traits?.includes('Infected') && (l.resources ?? 0) > 0) {
      const removed = Math.min(
        l.resources ?? 0,
        Math.max(0, e.maxHealth + (e.doom ?? 0) - e.damageTaken),
      )
      if (removed > 0)
        return [
          specific('chorus.removeBarricades', { location: l.id, amount: removed }),
          { type: 'DamageEnemy', enemy: e.id, amount: removed, source: { encounter: true } },
        ]
    }
  }
  if (t.type === 'enemyDefeated') {
    if (t.enemy.code === K.priest && s.acts[s.actIndex]?.code === K.acts[1]) {
      const row = TOWN.find((r) => r.stable === t.enemy.location || r.ruin === t.enemy.location)
      return [
        ...(row ? [{ type: 'SetScenarioMeta' as const, key: 'chorusSite', value: row.id }] : []),
        { type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } },
      ]
    }
    if ((s.scenarioDecks?.[PROCESSION] ?? []).includes(t.enemy.id))
      return [specific('chorus.leave', { enemy: t.enemy.id, code: t.enemy.code })]
  }
  if (t.type === 'afterPlayCard' && playerCardDef(t.code)?.type === 'event') {
    const at = getInvestigator(s, t.investigator).location
    const doyle = Object.values(s.enemies).find((e) => e.code === E.doyle)
    if (
      doyle &&
      at &&
      (doyle.location === at || s.locations[at]?.connections.includes(doyle.location))
    )
      return [
        { type: 'ReadyEnemy', enemy: doyle.id },
        ...(doyle.engagedWith
          ? [
              {
                type: 'EnemyAttack' as const,
                enemy: doyle.id,
                investigator: doyle.engagedWith,
                exhaustAfter: false,
              },
            ]
          : []),
      ]
  }
  if (t.type === 'afterSkillTest' && t.succeeded && t.margin >= 2 && t.enemy) {
    const e = s.enemies[t.enemy]
    if (e?.code === E.hibbs && (t.kind === 'fight' || t.kind === 'evade'))
      return [specific('chorus.hibbs', { investigator: t.investigator, enemy: e.id })]
  }
  if (t.type === 'afterSkillTest' && !t.succeeded && s.skillTest?.kind.type === 'effect') {
    const source = s.skillTest.kind.source
    if (source === K.march)
      return [specific('chorus.march', { investigator: t.investigator, margin: -t.margin })]
    if (source === K.sacrifice)
      return [specific('chorus.sacrifice', { investigator: t.investigator })]
    if (source === T.bankrupture) return [damage(t.investigator, -t.margin)]
  }
  if (t.type === 'afterCardsDrawn') {
    const at = getInvestigator(s, t.investigator).location
    const henry = Object.values(s.enemies).find((e) => e.code === E.armitage && e.location === at)
    if (henry)
      return [
        { type: 'EngageEnemy', enemy: henry.id, investigator: t.investigator },
        { type: 'EnemyAttack', enemy: henry.id, investigator: t.investigator, exhaustAfter: false },
      ]
  }
  if (t.type === 'afterPlayCard' && playerCardDef(t.code)?.type === 'asset') {
    const goods = Object.values(s.treacheries).find(
      (x) => x.code === T.damaged && attachedAsset(s, x.id)?.owner === t.investigator,
    )
    const held = goods && attachedAsset(s, goods.id)
    const fresh = Object.values(s.assets)
      .filter((a) => a.owner === t.investigator && a.code === t.code)
      .at(-1)
    if (goods && held && fresh && held.id !== fresh.id)
      return [{ type: 'DiscardAsset', asset: held.id }, attachTo(goods.id, fresh.id)]
  }
  if (t.type === 'afterEnemyAttack') {
    const e = s.enemies[t.enemy]
    if (e?.code === E.vicePresident)
      return [{ type: 'SetScenarioMeta', key: 'chorusVpReduce', value: 0 }]
    if (e?.code === E.ma) {
      const before = JSON.parse(String(s.scenarioMeta?.chorusMa ?? '[]')) as [string, number][]
      return before
        .filter(([id, n]) => s.assets[id] && s.assets[id]!.damage + s.assets[id]!.horror > n)
        .map(([id]): Message => ({ type: 'RemoveAssetFromGame', asset: id }))
    }
  }
  // La Cosa del agua: como coste adicional, asigna todas las cartas de habilidad elegibles.
  if (t.type === 'afterSkillTestInitiated' && s.skillTest) {
    const kind = s.skillTest.kind
    if ((kind.type === 'fight' || kind.type === 'evade') && s.enemies[kind.enemy]?.code === E.thing)
      return getInvestigator(s, t.investigator)
        .hand.filter((c) => playerCardDef(c)?.type === 'skill')
        .map((code): Message => ({
          type: 'CommitCard',
          investigator: t.investigator,
          code,
          byEffect: true,
        }))
  }
  if (t.type === 'whenWouldSucceed' && s.skillTest && margin(s) >= 2) {
    const dry = Object.values(s.treacheries).find(
      (x) =>
        x.code === T.boneDry &&
        x.placement.type === 'threatArea' &&
        x.placement.investigator === t.investigator,
    )
    if (dry)
      return [specific('chorus.boneDry', { investigator: t.investigator, treachery: dry.id })]
  }
  return []
}
on('chorus.removeBarricades', (s, d) => {
  const l = s.locations[String(d.location)]
  return l
    ? {
        ...s,
        locations: {
          ...s.locations,
          [l.id]: { ...l, resources: Math.max(0, (l.resources ?? 0) - Number(d.amount)) },
        },
      }
    : s
})
// Un enemigo de la Procesión descartado va a la pila de descartes propia del Mazo de procesión.
on('chorus.leave', (s, d) => {
  const code = String(d.code)
  const ids = (s.scenarioDecks?.[PROCESSION] ?? []).filter((id) => id !== String(d.enemy))
  const index = s.encounterDiscard.map((c) => c.code).lastIndexOf(code)
  if (index < 0) return { ...s, scenarioDecks: { ...s.scenarioDecks, [PROCESSION]: ids } }
  const card = s.encounterDiscard[index]!
  return {
    ...s,
    encounterDiscard: s.encounterDiscard.filter((_, n) => n !== index),
    setAside: [...s.setAside, card],
    scenarioDecks: {
      ...s.scenarioDecks,
      [PROCESSION]: ids,
      [DISCARD]: [...(s.scenarioDecks?.[DISCARD] ?? []), code],
    },
  }
})
on('chorus.hibbs', (s, d) => {
  const by = String(d.investigator),
    enemy = String(d.enemy)
  return ask(
    s,
    by,
    [
      {
        label: 'choice.plaguebearer.chorus.hibbsDoom',
        then: [{ type: 'PlaceDoomOnEnemy', enemy, amount: 1 }],
      },
      {
        label: 'choice.plaguebearer.chorus.hibbsAttack',
        then: [{ type: 'EnemyAttack', enemy, investigator: by, exhaustAfter: false }],
      },
    ],
    'prompt.plaguebearer.chorus.hibbs',
  )
})
on('chorus.boneDry', (s, d) => {
  const by = String(d.investigator),
    key = `chorus:boneDry:${d.treachery}`
  const left = Number(s.scenarioMeta?.[key] ?? 3) - 1
  const after: Message[] = [
    { type: 'SetScenarioMeta', key, value: left },
    ...(left <= 0 ? [{ type: 'DiscardTreachery' as const, treachery: String(d.treachery) }] : []),
  ]
  return ask(
    s,
    by,
    [
      { label: 'choice.plaguebearer.chorus.damage', then: [damage(by, 1), ...after] },
      {
        label: 'choice.plaguebearer.chorus.failByOne',
        then: [{ type: 'AdjustSuccessMargin', amount: -(margin(s) + 1) } as Message, ...after],
      },
    ],
    'prompt.plaguebearer.chorus.boneDry',
  )
})

// ---------------------------------------------------------------------------
// Resoluciones (guía ES p. 11 / EN p. 13)
// ---------------------------------------------------------------------------

function chorusResolution(
  s: GameState,
  outcome: Parameters<NonNullable<import('@lcg/engine').ScenarioBehavior['resolution']>>[1],
): Message[] {
  const n = outcome.type === 'resolution' ? outcome.resolution : 1
  const site = String(s.scenarioMeta?.chorusSite ?? '78026')
  const defeated = s.investigators.filter((i) => i.eliminated && !i.resigned)
  const rallied = s.scenarioDecks?.[RALLIED] ?? []
  const eliminated = s.victoryDisplay.filter((code) => elites.some((e) => e.code === code))
  return [
    ...(defeated.length
      ? [
          {
            type: 'Story' as const,
            entry: {
              title: 'story.plaguebearer.chorus.defeatedTitle',
              body: 'story.plaguebearer.chorus.defeated',
            },
          },
          recordNote('plaguebearerHeeded', JSON.stringify(defeated.map((i) => i.id))),
        ]
      : []),
    specific('chorus.hidden', { index: 0 }),
    {
      type: 'Story',
      entry: {
        title: `story.plaguebearer.chorus.resolution${n}Title`,
        body: `story.plaguebearer.chorus.resolution${n}`,
      },
    },
    { type: 'EarnExperience', amount: 0, victory: true },
    ...(n === 1
      ? [
          { type: 'CrossOutNote' as const, note: `plaguebearerTown${site}` },
          recordNote(`plaguebearerTown${site}Crater`),
        ]
      : [recordNote(`plaguebearerTown${site}Site`)]),
    ...rallied.map((id) => recordNote(`plaguebearerTown${id}Rallied`)),
    ...eliminated.map((code) => recordNote(`plaguebearerEliminated${code}`)),
    // Interludio III: Arkham unido, antes de cerrar el escenario.
    ...arkhamAllied(s, rallied, endScenario({ type: 'resolution', resolution: n })),
  ]
}
// Texto oculto de la introducción: cada investigador decide si lo lee (solo narrativo).
on('chorus.introHidden', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i) return s
  const next = specific('chorus.introHidden', { index: index + 1 })
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
              body: 'story.plaguebearer.chorus.introHidden',
            },
          },
          next,
        ],
      },
      { label: 'choice.skip', then: [next] },
    ],
    'prompt.plaguebearer.chorus.introHidden',
  )
})
// El primero que lea el texto oculto (aunque no fuera derrotado) añade una ficha de Antiguo.
on('chorus.hidden', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i || s.scenarioMeta?.chorusHiddenRead === 1) return s
  const next = specific('chorus.hidden', { index: index + 1 })
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
              body: 'story.plaguebearer.chorus.defeatedHidden',
              effects: [{ key: 'story.plaguebearer.chorus.hiddenEffect' }],
            },
          },
          { type: 'SetScenarioMeta', key: 'chorusHiddenRead', value: 1 },
          { type: 'AddChaosTokens', tokens: ['elderThing'] },
        ],
      },
      { label: 'choice.skip', then: [next] },
    ],
    'prompt.plaguebearer.chorus.hidden',
  )
})
