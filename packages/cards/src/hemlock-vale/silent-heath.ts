/**
 * La fiesta del Valle de la Cicuta, Escenario: El páramo silencioso (guía, pp. 19–22).
 * Montones boca abajo bajo los Lugares (Las madrigueras), Guaridas que entran adyacentes al
 * Lugar del que se roban, Restos cristalinos, Reina de progenie (códice Σ), planes, actos,
 * tarjeta de referencia, habitantes, códice y resoluciones.
 */
import {
  activeInvestigators,
  distancesFrom,
  emptyAdjacentPositions,
  getInvestigator,
  nextInt,
  nextStepToward,
  printedCode,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerPlayerCard,
  registerPlayerCards,
  registerScenario,
  registerTreachery,
  residentAvailable,
  seedRng,
  shuffle,
  valleyTime,
  type ChaosToken,
  type Choice,
  type EncounterCard,
  type EncounterLocationCard,
  type Enemy,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type LocationId,
  type Message,
  type ScenarioDefinition,
  type StoryEntry,
  type TokenEffect,
  type TreacheryCard,
  type ValleyResident,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { copies, effectTest, enemy, treachery } from '../scenario-helpers'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { hemlockValeChaosBag } from './chaos-bag'
import {
  crystalParasite,
  daySetDeck,
  horrorsInTheRockDeck,
  refractionsDeck,
} from './rock-encounters'
import {
  agentsOfTheColourDeck,
  blightDeck,
  transfigurationDeck,
  valeEnemyKeyword,
  valeSpecific,
} from './vale-encounters'
import { RESIDENTS } from './welcome'
import { CAVES, NEXT_PRELUDE } from './written-in-rock'

export const SILENT_HEATH = 'hemlock-vale-silent-heath'

export const HEATH = {
  reference: '10549',
  unsettlingSilence: '10550',
  desolationV1: '10551',
  desolationV2: '10552',
  aLostLegacy: '10553',
  searchingTheHeath: '10554',
  crystalGrove: '10555',
  pearlEstateRuins: '10556',
  ashenSlope: '10557',
  saltChamber: '10558',
  larvalTunnel: '10559',
  crystalNursery: '10560',
  commandingResonance: '10561',
  defendTheNest: '10562',
  colorlessLarva: '10563',
  broodSoldier: '10564',
  broodQueen: '10565',
  remainsChild: '10566',
  remainsFather: '10567',
  remainsMother: '10568',
  drRosaMarquez: '10702',
} as const

const REMAINS = [HEATH.remainsChild, HEATH.remainsFather, HEATH.remainsMother] as const
const LAIRS = [HEATH.saltChamber, HEATH.larvalTunnel, HEATH.crystalNursery] as const

const entry = (key: string): StoryEntry => ({
  title: `story.hemlockVale.silentHeath.${key}.title`,
  body: `story.hemlockVale.silentHeath.${key}.body`,
})
const read = (state: GameState, key: string): Message[] =>
  state.interactive ? [{ type: 'Story', entry: entry(key) }] : []

const meta = (state: GameState, key: string) => Number(state.scenarioMeta?.[key] ?? 0)
const setMeta = (key: string, value: number): Message => ({ type: 'SetScenarioMeta', key, value })
const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})
const isHard = (state: GameState) => state.difficulty === 'hard' || state.difficulty === 'expert'
const lead = (state: GameState): InvestigatorId => activeInvestigators(state)[0]?.id ?? ''
const dayOf = (state: GameState) => valleyTime(state.campaignLog)?.day ?? 1
const actIs = (state: GameState, code: string) => state.acts[state.actIndex]?.code === code

// ---------------------------------------------------------------------------
// Lugares (p. 20). La cuadrícula es [columna, fila]; la fila 1 está arriba.
// ---------------------------------------------------------------------------

const RUINS_AT: [number, number] = [1, 1]
const SLOPE_AT: [number, number] = [3, 1]
const GROVE_AT: [number, number] = [2, 2]
/** Espacios de las tres Cuevas de Horrores en la roca (reverso del acto 1). */
const CAVE_SLOTS: [number, number][] = [
  [1, 2],
  [2, 1],
  [3, 2],
]

const startingLocations: LocationCard[] = [
  {
    id: HEATH.pearlEstateRuins,
    name: 'Pearl Estate Ruins',
    shroud: 3,
    clueValue: 1,
    cluesPerInvestigator: false,
    symbol: 'equals',
    connectsTo: ['triangle', 'circle'],
    connections: [],
    position: RUINS_AT,
  },
  {
    id: HEATH.crystalGrove,
    name: 'Crystal Grove',
    shroud: 2,
    clueValue: 1,
    cluesPerInvestigator: true,
    symbol: 'triangle',
    connectsTo: ['equals', 'circle'],
    connections: [],
    position: GROVE_AT,
  },
  {
    id: HEATH.ashenSlope,
    name: 'Ashen Slope',
    shroud: 4,
    clueValue: 1,
    cluesPerInvestigator: true,
    symbol: 'circle',
    connectsTo: ['triangle', 'equals'],
    connections: [],
    position: SLOPE_AT,
  },
]

const lair = (
  code: string,
  name: string,
  shroud: number,
  clueValue: number,
): EncounterLocationCard => ({
  kind: 'location',
  code,
  name,
  shroud,
  clueValue,
  cluesPerInvestigator: true,
  connections: [],
  traits: code === HEATH.crystalNursery ? ['Cave', 'Lair', 'Blight'] : ['Cave', 'Lair'],
  keywords: [],
})
export const saltChamber = lair(HEATH.saltChamber, 'Salt Chamber', 4, 3)
export const larvalTunnel = lair(HEATH.larvalTunnel, 'Larval Tunnel', 2, 3)
export const crystalNursery = lair(HEATH.crystalNursery, 'Crystal Nursery', 3, 2)
const LAIR_CARDS = [saltChamber, larvalTunnel, crystalNursery]

const isLair = (id: LocationId) => (LAIRS as readonly string[]).includes(printedCode(id))
const isCave = (id: LocationId) =>
  isLair(id) || CAVES.some((c) => c.id === id || printedCode(c.id) === printedCode(id))

/** Lugares más cercanos a `from` que cumplen `matches`. */
function nearest(
  state: GameState,
  from: LocationId | null,
  matches: (location: LocationId) => boolean,
): LocationId[] {
  if (from === null) return []
  let best = Infinity
  let found: LocationId[] = []
  for (const [location, distance] of distancesFrom(state, from)) {
    if (!state.locations[location] || !matches(location)) continue
    if (distance < best) [best, found] = [distance, [location]]
    else if (distance === best) found.push(location)
  }
  return found
}

/** «El Lugar más cercano al mayor número de investigadores». */
function nearestToMost(state: GameState, matches: (l: LocationId) => boolean): LocationId[] {
  const counts = new Map<LocationId, number>()
  for (const i of activeInvestigators(state))
    for (const l of nearest(state, i.location, matches)) counts.set(l, (counts.get(l) ?? 0) + 1)
  const most = Math.max(0, ...counts.values())
  return [...counts].filter(([, n]) => n === most && most > 0).map(([l]) => l)
}

const isInsect = (e: { traits?: string[] }) => !!e.traits?.includes('Insect')

/** Enemigos Insecto más cercanos al investigador. */
function nearestInsects(state: GameState, investigator: InvestigatorId): Enemy[] {
  const from = getInvestigator(state, investigator).location
  if (from === null) return []
  const distances = distancesFrom(state, from)
  const insects = Object.values(state.enemies).filter(
    (e) => isInsect(e) && e.location && distances.has(e.location),
  )
  const best = Math.min(...insects.map((e) => distances.get(e.location)!))
  return insects.filter((e) => distances.get(e.location) === best)
}

const atLocation = (state: GameState, investigator: InvestigatorId, location: LocationId) =>
  getInvestigator(state, investigator).location === location

const controlledRemains = (state: GameState, investigator: InvestigatorId) =>
  Object.values(state.assets).filter(
    (a) => a.owner === investigator && (REMAINS as readonly string[]).includes(a.code),
  )
const remainsInVictory = (state: GameState) =>
  state.victoryDisplay.filter((c) => (REMAINS as readonly string[]).includes(c)).length

const groupClues = (state: GameState, location: LocationId) =>
  activeInvestigators(state).filter((i) => i.location === location)

/** Gastad 1 pista por investigador en grupo, entre los investigadores de `location`. */
function groupCost(state: GameState, location: LocationId): Message[] | null {
  const players = activeInvestigators(state).length
  const group = groupClues(state, location)
  if (group.reduce((n, i) => n + i.clues, 0) < players) return null
  return [{ type: 'PayGroupClues', amount: players, from: group.map((i) => i.id) }]
}

// Arboleda de cristal: [acción] Gastad 1 pista por investigador: añade unos Restos
// cristalinos que controles a la zona de victoria.
registerLocation({
  code: HEATH.crystalGrove,
  abilities: (state, self, investigator) => {
    if (!self.revealed || !atLocation(state, investigator, self.id)) return []
    const remains = controlledRemains(state, investigator)
    const cost = groupCost(state, self.id)
    if (!remains.length || !cost) return []
    return [
      {
        key: `${self.id}:remains`,
        label: 'ability.hemlockVale.remainsToVictory',
        actions: 1,
        provokes: true,
        target: { type: 'location', id: self.id },
        then: [
          ...cost,
          ask(
            investigator,
            'prompt.hemlockVale.chooseAsset',
            remains.map((a) => ({
              label: 'choice.card',
              params: { card: REMAINS_DATA[a.code]!.subname },
              then: [{ type: 'ScenarioSpecific', key: 'remainsToVictory', data: { asset: a.id } }],
            })),
          ),
        ],
      },
    ]
  },
})

// Ruinas de la Finca Perla: [acción] Desistir; tus Restos cristalinos van a la zona de victoria.
registerLocation({
  code: HEATH.pearlEstateRuins,
  abilities: (state, self, investigator) =>
    self.revealed && atLocation(state, investigator, self.id)
      ? [
          {
            key: `${self.id}:resign`,
            label: 'ability.hemlockVale.leaveTheHeath',
            actions: 1,
            provokes: false,
            target: { type: 'location', id: self.id },
            then: [
              ...controlledRemains(state, investigator).map((a): Message => ({
                type: 'ScenarioSpecific',
                key: 'remainsToVictory',
                data: { asset: a.id },
              })),
              { type: 'Resign', investigator },
            ],
          },
        ]
      : [],
})

// Pendiente de ceniza: Obligado – Cuando lo reveles: [agility] (4); si fallas, 2 daños.
registerLocation({
  code: HEATH.ashenSlope,
  forced: (_state, trigger, self) =>
    trigger.type === 'afterRevealLocation' && trigger.location === self.id && trigger.investigator
      ? [
          effectTest(trigger.investigator, 'Ashen Slope', 'agility', 4, {
            onFail: [
              { type: 'TakeDamage', investigator: trigger.investigator, damage: 2, horror: 0 },
            ],
          }),
        ]
      : [],
})

/** Robar la carta superior del montón bajo un Lugar (límite de grupo por ronda en las Guaridas). */
const drawStack = (investigator: InvestigatorId, location: LocationId): Message => ({
  type: 'ScenarioSpecific',
  key: 'drawBeneath',
  data: { investigator, location },
})
const hasStack = (state: GameState, location: LocationId) =>
  !!state.locations[location]?.beneath?.length

// Guaridas: Revelación – entra adyacente al Lugar del que se robó y lee su códice.
const lairCodex: Record<string, string> = {
  [HEATH.saltChamber]: 'codexOmega',
  [HEATH.larvalTunnel]: 'codexPsi',
  [HEATH.crystalNursery]: 'codexPhi',
}
for (const code of LAIRS)
  registerLocation({
    code,
    revelation: (_state, location) => [
      ...(code === HEATH.larvalTunnel
        ? [
            {
              type: 'ScenarioSpecific',
              key: 'spawnLarva',
              data: { location: location.id },
            } as Message,
          ]
        : []),
      {
        type: 'ScenarioSpecific',
        key: 'lairCodex',
        data: { location: location.id, codex: lairCodex[code]! },
      },
    ],
    abilities: (state, self, investigator) => {
      if (code !== HEATH.saltChamber || !atLocation(state, investigator, self.id)) return []
      const cost = groupCost(state, self.id)
      if (!hasStack(state, self.id) || !cost) return []
      // Cámara de sal: [acción] Gastad 1 pista por investigador: roba la carta superior del
      // montón (límite de grupo: una vez por ronda).
      return [
        {
          key: `${self.id}:draw`,
          label: 'ability.hemlockVale.drawBeneath',
          actions: 1,
          provokes: true,
          limit: { per: 'round', group: true },
          target: { type: 'location', id: self.id },
          then: [...cost, drawStack(investigator, self.id)],
        },
      ]
    },
  })

// ---------------------------------------------------------------------------
// Restos cristalinos (apoyos de historia que se revelan desde los montones)
// ---------------------------------------------------------------------------

const REMAINS_DATA: Record<string, { subname: string; health?: number; sanity?: number }> = {
  [HEATH.remainsChild]: { subname: 'The Child', health: 1, sanity: 1 },
  [HEATH.remainsFather]: { subname: 'The Father', sanity: 1 },
  [HEATH.remainsMother]: { subname: 'The Mother', health: 1 },
}

registerPlayerCards([
  ...REMAINS.map((code) => ({
    code,
    name: 'Crystal Remains',
    story: true,
    type: 'asset' as const,
    class: 'neutral',
    traits: ['Humanoid', 'Blight'],
    victory: 1,
    ...(REMAINS_DATA[code]!.health ? { health: REMAINS_DATA[code]!.health } : {}),
    ...(REMAINS_DATA[code]!.sanity ? { sanity: REMAINS_DATA[code]!.sanity } : {}),
  })),
  {
    code: HEATH.drRosaMarquez,
    name: 'Dr. Rosa Marquez',
    story: true,
    unique: true,
    type: 'asset' as const,
    class: 'neutral',
    cost: 4,
    slots: ['ally'],
    traits: ['Ally', 'Miskatonic', 'Wayfarer'],
    health: 2,
    sanity: 3,
  },
])

for (const code of REMAINS) {
  registerPlayerCard({
    code,
    // Obligado – Cuando empieza tu turno: recibe 1 daño, 1 horror o, el Hijo, a elegir.
    forced: (_state, trigger, self) => {
      if (trigger.type !== 'turnBegins' || trigger.investigator !== self.owner) return []
      const take = (damage: number, horror: number): Message => ({
        type: 'TakeDamage',
        investigator: self.owner,
        damage,
        horror,
      })
      if (code === HEATH.remainsFather) return [take(0, 1)]
      if (code === HEATH.remainsMother) return [take(1, 0)]
      return [
        ask(self.owner, 'prompt.chooseEffect', [
          { label: 'choice.hemlockVale.takeDamage', params: { n: 1 }, then: [take(1, 0)] },
          { label: 'choice.hemlockVale.takeHorror', params: { n: 1 }, then: [take(0, 1)] },
        ]),
      ]
    },
    // Si son derrotados: se barajan con las 2 cartas superiores bajo la Guarida más cercana.
    whenDefeated: (_state, self) => [
      { type: 'RemoveAssetFromGame', asset: self.id, leavingResolved: true },
      {
        type: 'ScenarioSpecific',
        key: 'remainsDefeated',
        data: { code, investigator: self.owner },
      },
    ],
  })
}

/** Carta de encuentro que representa unos Restos cristalinos boca abajo. */
const remainsCard = (code: string): TreacheryCard =>
  treachery({ code, name: 'Crystal Remains', traits: ['Humanoid', 'Blight'], keywords: [] })

// Revelación: pon los Restos cristalinos en juego en tu zona de juego.
for (const code of REMAINS)
  registerTreachery({
    code,
    revelation: (_state, investigator, self) => [
      {
        type: 'ScenarioSpecific',
        key: 'remainsRevealed',
        data: { treachery: self.id, investigator, code },
      },
    ],
  })

// ---------------------------------------------------------------------------
// Encuentros de El páramo silencioso
// ---------------------------------------------------------------------------

export const colorlessLarva: EnemyCard = enemy({
  code: HEATH.colorlessLarva,
  name: 'Colorless Larva',
  traits: ['Creature', 'Insect', 'Mutated'],
  fight: 1,
  health: 1,
  evade: 1,
  damage: 0,
  horror: 1,
  keywords: ['aloof'],
  victory: 0,
})
export const broodSoldier: EnemyCard = enemy({
  code: HEATH.broodSoldier,
  name: 'Brood Soldier',
  traits: ['Creature', 'Insect', 'Mutated'],
  fight: 3,
  health: 2,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: ['aloof'],
  victory: 0,
})
export const broodQueen: EnemyCard = enemy({
  code: HEATH.broodQueen,
  name: 'Brood Queen',
  traits: ['Creature', 'Insect', 'Mutated', 'Elite'],
  fight: 1,
  health: 5,
  evade: 3,
  damage: 2,
  horror: 2,
  keywords: ['massive', 'alert'],
  victory: 2,
})
const commandingResonance = treachery({
  code: HEATH.commandingResonance,
  name: 'Commanding Resonance',
  traits: ['Scheme'],
  keywords: [],
})
const defendTheNest = treachery({
  code: HEATH.defendTheNest,
  name: 'Defend the Nest',
  traits: ['Scheme'],
  keywords: [],
})

/** Cartas del conjunto El páramo silencioso que van al mazo de Encuentros. */
export const heathEncounterDeck: EncounterCard[] = [
  ...copies(commandingResonance, 2),
  ...copies(defendTheNest, 2),
  ...copies(colorlessLarva, 3),
  ...copies(broodSoldier, 3),
]

const KNOWN_ENEMIES: EnemyCard[] = [colorlessLarva, broodSoldier, broodQueen, crystalParasite]
const enemyByCode = (code: string) => KNOWN_ENEMIES.find((e) => e.code === code)

// Larva incolora: Obligado – Después de que ataque, derrótala.
registerEnemy({
  code: HEATH.colorlessLarva,
  forced: (_state, trigger, self) =>
    trigger.type === 'afterEnemyAttack' && trigger.enemy === self.id
      ? [{ type: 'DefeatEnemy', enemy: self.id, by: trigger.investigator }]
      : [],
})

// Soldado de la progenie: Errante (Lugar Cueva con pistas).
registerEnemy({
  code: HEATH.broodSoldier,
  // Desolación (v.II): los Insectos pierden Errante y ganan Cazador.
  patrol: (state, self) => {
    if (desolationV2(state)) return null
    return nearest(state, self.location, (l) => isCave(l) && (state.locations[l]?.clues ?? 0) > 0)
  },
})

// Reina de progenie: +1 combate por cada otro Insecto; +X salud por investigador (día X).
registerEnemy({
  code: HEATH.broodQueen,
  healthModifier: (state) => dayOf(state) * activeInvestigators(state).length,
})

// Resonancia imperiosa: [willpower] (3); por cada punto por el que falles, una opción distinta.
registerTreachery({
  code: HEATH.commandingResonance,
  revelation: (_state, investigator) => [
    setMeta('resonanceUsed', 0),
    effectTest(investigator, 'Commanding Resonance', 'willpower', 3, {
      onFailEach: [{ type: 'ScenarioSpecific', key: 'resonance', data: { investigator } }],
    }),
  ],
})

// Defender el nido: [intellect] (2 + Guaridas en juego); si fallas, 1 perdición en el Insecto
// más cercano (si no puedes, 2 de horror).
registerTreachery({
  code: HEATH.defendTheNest,
  revelation: (state, investigator) => [
    effectTest(
      investigator,
      'Defend the Nest',
      'intellect',
      2 + Object.keys(state.locations).filter(isLair).length,
      { onFail: [{ type: 'ScenarioSpecific', key: 'defendTheNest', data: { investigator } }] },
    ),
  ],
})

// ---------------------------------------------------------------------------
// Planes y actos
// ---------------------------------------------------------------------------

const queenSetAside = (state: GameState) => !meta(state, 'queenSpawned')
const insectsInVictory = (state: GameState) =>
  state.victoryDisplay.filter((c) => {
    const card = enemyByCode(c)
    return card && isInsect(card)
  }).length
const desolationV2 = (state: GameState) =>
  state.agendas[state.agendaIndex]?.code === HEATH.desolationV2
const desolation = (state: GameState) =>
  [HEATH.desolationV1, HEATH.desolationV2].includes(state.agendas[state.agendaIndex]?.code as never)

/** Obligado – Cuando se coloca perdición en este plan, si la Reina de progenie está apartada. */
const queenCheck = (state: GameState, trigger: { type: string; agenda?: unknown }) =>
  trigger.type === 'afterDoomPlaced' &&
  trigger.agenda !== 'second' &&
  queenSetAside(state) &&
  insectsInVictory(state) > 0
    ? [{ type: 'ScenarioSpecific', key: 'queenCheck' } as Message]
    : []

registerAgenda({
  code: HEATH.unsettlingSilence,
  forced: (state, trigger) => queenCheck(state, trigger),
  // Reverso: descarta cartas hasta un Insecto, que roba el jefe; el descarte vuelve al mazo.
  onAdvance: () => [{ type: 'ScenarioSpecific', key: 'strangeCreatures' }],
})

for (const code of [HEATH.desolationV1, HEATH.desolationV2])
  registerAgenda({
    code,
    forced: (state, trigger) => queenCheck(state, trigger),
    // Reverso: cada investigador que no haya sido eliminado es derrotado y sufre 1 trauma físico.
    onAdvance: (state) =>
      activeInvestigators(state).flatMap((i): Message[] => [
        { type: 'SufferTrauma', physical: 1, investigator: i.id },
        { type: 'DefeatInvestigator', investigator: i.id },
      ]),
  })

registerAct({
  code: HEATH.aLostLegacy,
  // Reverso «Las madrigueras»: Cuevas adyacentes y montones bajo cada Lugar.
  onAdvance: () => [{ type: 'ScenarioSpecific', key: 'warrens' }],
})

registerAct({
  code: HEATH.searchingTheHeath,
  abilities: (state, _self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (here === null || !hasStack(state, here)) return []
    const cost = groupCost(state, here)
    return [
      // [acción] Si no hay pistas en tu Lugar: roba la carta superior del montón.
      ...((state.locations[here]?.clues ?? 0) === 0
        ? [
            {
              key: 'heath:drawBeneath',
              label: 'ability.hemlockVale.drawBeneath',
              actions: 1,
              provokes: true,
              target: { type: 'location' as const, id: here },
              then: [drawStack(investigator, here)],
            },
          ]
        : []),
      // [rápida] Gastad 1 pista por investigador: mira la carta superior; puedes ponerla debajo.
      ...(cost
        ? [
            {
              key: 'heath:look',
              label: 'ability.hemlockVale.lookBeneath',
              actions: 0,
              provokes: false,
              target: { type: 'location' as const, id: here },
              then: [
                ...cost,
                {
                  type: 'ScenarioSpecific',
                  key: 'lookBeneath',
                  data: { investigator, location: here },
                } as Message,
              ],
            },
          ]
        : []),
    ]
  },
  // Objetivo: si cada investigador no derrotado ha desistido con Restos en la zona de
  // victoria (lo comprueba `onAllInvestigatorsEliminated`).
  onAdvance: (state) => resolutionMessages(state, remainsInVictory(state) === 3 ? 1 : 2, true),
})

// ---------------------------------------------------------------------------
// Tarjeta de referencia
// ---------------------------------------------------------------------------

const insectCount = (state: GameState) =>
  Object.values(state.enemies).filter(isInsect).length + insectsInVictory(state)

function tokenEffect(state: GameState, token: string, investigator: InvestigatorId): TokenEffect {
  const hard = isHard(state)
  const here = getInvestigator(state, investigator).location
  const atLair = here !== null && isLair(here)
  const shuffleBack: Message[] = nonEliteInVictory(state).length
    ? [{ type: 'ScenarioSpecific', key: 'victoryToDeck', data: { investigator } }]
    : []
  switch (token) {
    case 'skull': {
      const n = insectCount(state)
      return { modifier: -(hard ? n : Math.ceil(n / 2)) }
    }
    case 'cultist':
      return hard
        ? { modifier: -3, onSuccess: shuffleBack }
        : { modifier: -1, immediate: shuffleBack }
    case 'tablet':
      return hard
        ? {
            modifier: -5,
            immediate: [{ type: 'ScenarioSpecific', key: 'insectStrikes', data: { investigator } }],
          }
        : {
            modifier: -3,
            onFail: [{ type: 'ScenarioSpecific', key: 'insectEngages', data: { investigator } }],
          }
    case 'elderThing':
      return hard
        ? { modifier: -4, ...(atLair ? { autoFail: true } : {}) }
        : { modifier: -2, ...(atLair ? { revealAnother: true } : {}) }
  }
  return { modifier: 0 }
}

const nonEliteInVictory = (state: GameState) =>
  state.victoryDisplay.filter((c) => {
    const card = enemyByCode(c)
    return card && !card.traits?.includes('Elite')
  })

// ---------------------------------------------------------------------------
// Preparación (p. 20)
// ---------------------------------------------------------------------------

/** Mazo de Encuentros: El páramo silencioso y los conjuntos indicados, más el del día. */
export function heathEncounters(day: 1 | 2 | 3): EncounterCard[] {
  return [
    ...heathEncounterDeck,
    ...agentsOfTheColourDeck,
    ...blightDeck,
    ...horrorsInTheRockDeck,
    ...refractionsDeck,
    ...transfigurationDeck,
    ...ENCOUNTER_SETS.strikingFear,
    ...daySetDeck(day),
  ]
}

/** Habitantes de día: Leah (Día 1), la Dra. Marquez (Día 2) y la madre Rachel (Día 3). */
function residentSetup(context: ScenarioContext, day: 1 | 2 | 3): Message[] {
  const place = (resident: ValleyResident, location: LocationId): Message[] =>
    residentAvailable(context.log, resident)
      ? [
          {
            type: 'PlaceAsset',
            code: RESIDENTS[resident].code,
            name: RESIDENTS[resident].name,
            placement: { type: 'location', location },
          },
        ]
      : []
  if (day === 1) return place('leahAtwood', HEATH.pearlEstateRuins)
  if (day === 3) return place('motherRachel', HEATH.ashenSlope)
  return [
    {
      type: 'PlaceAsset',
      code: HEATH.drRosaMarquez,
      name: 'Dr. Rosa Marquez',
      placement: { type: 'location', location: HEATH.crystalGrove },
    },
  ]
}

export function silentHeath(
  context: ScenarioContext,
  encounterDeck?: EncounterCard[],
): ScenarioDefinition {
  const time = context.log.valley ?? { day: 1 as const, time: 'day' as const }
  const day = time.day
  const rng = seedRng(context.seed)
  // Tres Lugares al azar de Horrores en la roca, apartados sin mirar su lado revelado.
  const [caves] = shuffle(CAVES, rng)
  const setAsideCaves = caves.slice(0, 3)
  const second = day === 1 ? HEATH.desolationV1 : HEATH.desolationV2
  return {
    id: SILENT_HEATH,
    intro: entry(time.time === 'night' ? 'intro4' : `intro${day}`),
    setupInstructions: entry('setup'),
    grid: true,
    locations: startingLocations,
    setAsideLocations: setAsideCaves,
    startingLocation: HEATH.pearlEstateRuins,
    agendas: [
      { code: HEATH.unsettlingSilence, name: 'Unsettling Silence', doomThreshold: 8 },
      {
        code: second,
        name: day === 1 ? 'Desolation (v.I)' : 'Desolation (v.II)',
        doomThreshold: 7,
      },
    ],
    acts: [
      {
        code: HEATH.aLostLegacy,
        name: 'A Lost Legacy',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'endOfRound',
        cluesAtLocation: HEATH.pearlEstateRuins,
      },
      {
        code: HEATH.searchingTheHeath,
        name: 'Searching the Heath',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: encounterDeck ?? heathEncounters(day),
    setAside: [broodQueen, crystalParasite, crystalParasite],
    chaosBag: hemlockValeChaosBag(context),
    tokenValues: {},
    setup: [
      { type: 'SetValleyTime', day, time: time.time },
      // De día, las introducciones 1–3 siguen con la Introducción 5.
      ...(time.time === 'day'
        ? [{ type: 'Story', entry: entry('intro5') } as Message, ...residentSetup(context, day)]
        : []),
    ],
  }
}

// ---------------------------------------------------------------------------
// Códice (p. 21) y resoluciones (p. 22)
// ---------------------------------------------------------------------------

const raise = (resident: ValleyResident): Message[] => [
  { type: 'ChangeRelationship', resident },
  { type: 'EarnExperience', amount: 1 },
]

function heathCodex(state: GameState, n: number): Message[] {
  const done = setMeta(`codex:${n}`, 1)
  if (n === RESIDENTS.motherRachel.codex)
    return [done, ...read(state, 'codex1'), ...raise('motherRachel')]
  if (n === RESIDENTS.leahAtwood.codex)
    return [
      done,
      ...read(state, 'codex2'),
      { type: 'RecordResidentNote', resident: 'leahAtwood', note: 'leahSearchedThePearlRuins' },
      ...activeInvestigators(state).map((i): Message => ({
        type: 'GainClues',
        investigator: i.id,
        amount: 1,
      })),
    ]
  return []
}

/** Resolución `r` (1, 2 o 4) seguida de las siguientes; 0 = sin resolución. */
export function resolutionMessages(state: GameState, r: number, objective = false): Message[] {
  const time = valleyTime(state.campaignLog)
  const next = time ? NEXT_PRELUDE[time.time + ':' + time.day] : undefined
  const remains = remainsInVictory(state)
  const first = r || (remains === 3 ? 1 : remains ? 2 : 4)
  return [
    ...(r || objective ? [] : read(state, 'noResolution')),
    ...(first === 1
      ? [
          ...read(state, 'resolution1'),
          { type: 'RecordNote', note: 'hemlockValeLaidThePearlFamilyToRest' } as Message,
        ]
      : []),
    ...(first === 2
      ? [
          ...read(state, 'resolution2'),
          { type: 'RecordNote', note: 'hemlockValeRemainsPartiallyRecovered' } as Message,
        ]
      : []),
    ...(first < 4
      ? [
          ...read(state, 'resolution3'),
          { type: 'RecordNote', note: 'hemlockValeMadamePearlsDiaryRecovered' } as Message,
        ]
      : []),
    ...read(state, 'resolution4'),
    { type: 'EarnExperience', amount: 0, victory: true },
    { type: 'SurveyArea', area: 'pearlRidge' },
    ...(next ? [{ type: 'ChooseValleyRoute', scenario: next } as Message] : []),
    {
      type: 'EndScenario',
      outcome: r ? { type: 'resolution', resolution: first } : { type: 'noResolution' },
      told: true,
    },
  ]
}

registerScenario({
  id: SILENT_HEATH,
  // Soldado de la progenie: mientras esté preparado, su Lugar tiene +2 de velo.
  shroudModifier: (state, location) =>
    Object.values(state.enemies).some(
      (e) => e.code === HEATH.broodSoldier && e.location === location.id && !e.exhausted,
    )
      ? 2
      : 0,
  enemyStat: (state, e, stat) =>
    e.code === HEATH.broodQueen && stat === 'fight'
      ? Object.values(state.enemies).filter((o) => o.id !== e.id && isInsect(o)).length
      : 0,
  enemyKeyword: (state, e, keyword) => {
    if (isInsect(e) && keyword === 'aloof') {
      // Desolación: los Insectos pierden Indiferente; también junto a la Reina de progenie.
      if (desolation(state)) return false
      if (
        Object.values(state.enemies).some(
          (q) => q.code === HEATH.broodQueen && q.location === e.location,
        )
      )
        return false
    }
    if (isInsect(e) && keyword === 'hunter' && desolationV2(state)) return true
    return valeEnemyKeyword(state, e, keyword)
  },
  tokenEffect,
  reactions: (state, trigger) => {
    // Túnel de larvas: tras evitar con éxito a un Enemigo aquí, roba del montón.
    if (trigger.type === 'afterEvade') {
      const here = getInvestigator(state, trigger.investigator).location
      if (
        here === null ||
        printedCode(here) !== HEATH.larvalTunnel ||
        !hasStack(state, here) ||
        meta(state, `lairRound:${here}`) === state.round
      )
        return []
      return [
        {
          key: 'heath:larvalTunnel',
          investigator: trigger.investigator,
          label: 'ability.hemlockVale.drawBeneath',
          then: [setMeta(`lairRound:${here}`, state.round), drawStack(trigger.investigator, here)],
        },
      ]
    }
    // Zona de cría de cristal: tras terminar tu turno aquí, 1 horror directo: roba del montón.
    if (trigger.type === 'turnEnds') {
      const here = getInvestigator(state, trigger.investigator).location
      if (
        here === null ||
        printedCode(here) !== HEATH.crystalNursery ||
        !hasStack(state, here) ||
        meta(state, `lairRound:${here}`) === state.round
      )
        return []
      return [
        {
          key: 'heath:crystalNursery',
          investigator: trigger.investigator,
          label: 'ability.hemlockVale.nurseryDraw',
          then: [
            setMeta(`lairRound:${here}`, state.round),
            {
              type: 'TakeDamage',
              investigator: trigger.investigator,
              damage: 0,
              horror: 1,
              direct: true,
            },
            drawStack(trigger.investigator, here),
          ],
        },
      ]
    }
    return []
  },
  onAllInvestigatorsEliminated: (state) => {
    // Objetivo del acto 2: todos los no derrotados han desistido con Restos en la victoria.
    const objective =
      actIs(state, HEATH.searchingTheHeath) &&
      remainsInVictory(state) > 0 &&
      state.investigators.some((i) => i.resigned)
    return objective
      ? resolutionMessages(state, remainsInVictory(state) === 3 ? 1 : 2, true)
      : resolutionMessages(state, 0)
  },
  specific: (state, key, data) => {
    if (key === 'resolution') return push(state, ...resolutionMessages(state, Number(data.r ?? 0)))
    if (key === 'codex') return push(state, ...heathCodex(state, Number(data.n)))
    return valeSpecific(state, key, data) ?? heathSpecific(state, key, data)
  },
})

// ---------------------------------------------------------------------------
// Mensajes propios del escenario
// ---------------------------------------------------------------------------

const withMeta = (state: GameState, values: Record<string, number>): GameState => ({
  ...state,
  scenarioMeta: { ...state.scenarioMeta, ...values },
})

function updateBeneath(
  state: GameState,
  location: LocationId,
  beneath: EncounterCard[],
): GameState {
  const l = state.locations[location]
  if (!l) return state
  return { ...state, locations: { ...state.locations, [location]: { ...l, beneath } } }
}

/** Reverso del acto 1: tres Cuevas sin revelar y una carta boca abajo bajo cada Lugar. */
function warrens(state: GameState): GameState {
  const [caves, rng1] = shuffle(Object.keys(state.setAsideLocations), state.rng)
  const placed: { id: LocationId; position: [number, number] }[] = caves
    .slice(0, CAVE_SLOTS.length)
    .map((id, i) => ({ id, position: CAVE_SLOTS[i]! }))
  const top = state.encounterDeck.slice(0, 3)
  const [cards, rng2] = shuffle([...LAIR_CARDS, ...top], rng1)
  const next: GameState = { ...state, rng: rng2, encounterDeck: state.encounterDeck.slice(3) }
  const order = [
    HEATH.pearlEstateRuins,
    HEATH.ashenSlope,
    HEATH.crystalGrove,
    ...placed.map((p) => p.id),
  ]
  return push(
    next,
    ...placed.map((p): Message => ({
      type: 'PutLocationIntoPlay',
      location: p.id,
      position: p.position,
    })),
    {
      type: 'ScenarioSpecific',
      key: 'dealBeneath',
      data: { order: order.join(','), cards: JSON.stringify(cards) },
    },
  )
}

/** Roba la carta superior del montón; una Guarida entra adyacente al Lugar del que se robó. */
function drawBeneath(state: GameState, investigator: InvestigatorId, location: LocationId) {
  const [card, ...rest] = state.locations[location]?.beneath ?? []
  if (!card) return state
  let drawn: EncounterCard = card
  if (card.kind === 'location') {
    const position = emptyAdjacentPositions(state, location)[0]
    if (position) drawn = { ...card, position }
  }
  return push(updateBeneath(state, location, rest), {
    type: 'ResolveEncounterCard',
    investigator,
    card: drawn,
  })
}

/** Códices Ω, Ψ y Φ: unos Restos apartados y las 2 cartas superiores, en un montón. */
function lairStack(state: GameState, location: LocationId, codex: string): GameState {
  const next = meta(state, 'remainsDealt')
  const code = REMAINS[next]
  const top = state.encounterDeck.slice(0, 2)
  const [stack, rng] = shuffle([...(code ? [remainsCard(code)] : []), ...top], state.rng)
  return push(
    updateBeneath(
      withMeta(
        { ...state, rng, encounterDeck: state.encounterDeck.slice(2) },
        code ? { remainsDealt: next + 1 } : {},
      ),
      location,
      [...(state.locations[location]?.beneath ?? []), ...stack],
    ),
    ...read(state, codex),
  )
}

/** Saca `n` fichas de la bolsa de caos (sin devolverlas hasta terminar). */
function drawTokens(state: GameState, n: number): [ChaosToken[], GameState] {
  const bag = [...state.chaosBag]
  const drawn: ChaosToken[] = []
  let rng = state.rng
  for (let k = 0; k < n && bag.length; k++) {
    const [index, next] = nextInt(rng, bag.length)
    rng = next
    drawn.push(bag.splice(index, 1)[0]!)
  }
  return [drawn, { ...state, rng }]
}

const SYMBOLS = new Set(['skull', 'cultist', 'tablet', 'elderThing', 'elderSign', 'autoFail'])

/** Obligado de los planes: fichas igual a los Insectos en la zona de victoria. */
function queenCheckResolve(state: GameState): GameState {
  if (!queenSetAside(state)) return state
  const n = insectsInVictory(state)
  const [tokens, next] = drawTokens(state, n)
  const first = state.agendaIndex === 0
  const spawn = tokens.some((t) =>
    first ? t === 'skull' || t === 'autoFail' : typeof t !== 'number' && SYMBOLS.has(t),
  )
  return push(
    next,
    { type: 'Log', key: 'log.hemlockVale.queenTokens', params: { tokens: tokens.join(', ') } },
    ...(spawn ? [{ type: 'ScenarioSpecific', key: 'queen' } as Message] : []),
  )
}

/** Códice Σ: la Reina aparece y los Insectos de la zona de victoria vuelven con ella. */
function spawnQueen(state: GameState): GameState {
  if (!queenSetAside(state)) return state
  const caves = nearestToMost(state, isCave)
  const options = caves.length ? caves : nearestToMost(state, () => true)
  const location = options[0]
  if (!location) return state
  const insects = state.victoryDisplay
    .map((c) => enemyByCode(c))
    .filter((c): c is EnemyCard => !!c && isInsect(c))
  const lost = insects.reduce((n, c) => n + (c.victory ?? 0), 0)
  const remaining = state.victoryDisplay.filter((c) => {
    const card = enemyByCode(c)
    return !card || !isInsect(card)
  })
  const next: GameState = withMeta(
    {
      ...state,
      setAside: state.setAside.filter((c) => c.code !== HEATH.broodQueen),
      victoryDisplay: remaining,
      victoryPoints: (state.victoryPoints ?? 0) - lost,
    },
    { queenSpawned: 1 },
  )
  return push(
    next,
    ...read(state, 'codexSigma'),
    { type: 'SpawnEnemy', card: broodQueen, location, engageWith: null },
    ...insects.map((card): Message => ({ type: 'SpawnEnemy', card, location, engageWith: null })),
  )
}

/** Reverso del plan 1: descarta hasta un Insecto, que roba el jefe; el descarte vuelve. */
function strangeCreatures(state: GameState): GameState {
  const index = state.encounterDeck.findIndex((c) => c.kind === 'enemy' && isInsect(c))
  const discarded = state.encounterDeck.slice(0, index < 0 ? undefined : index)
  const insect = index < 0 ? undefined : state.encounterDeck[index]
  const rest = index < 0 ? [] : state.encounterDeck.slice(index + 1)
  const [deck, rng] = shuffle([...rest, ...state.encounterDiscard, ...discarded], state.rng)
  return push(
    { ...state, rng, encounterDeck: deck, encounterDiscard: [] },
    ...(insect
      ? [{ type: 'ResolveEncounterCard', investigator: lead(state), card: insect } as Message]
      : []),
  )
}

/** Resonancia imperiosa: elige una opción que no se haya elegido en esta revelación. */
function resonance(state: GameState, investigator: InvestigatorId): GameState {
  const used = meta(state, 'resonanceUsed')
  const insects = nearestInsects(state, investigator)
  const hand = getInvestigator(state, investigator).hand.length
  const pick = (bit: number, then: Message[]): Message[] => [
    setMeta('resonanceUsed', used | bit),
    ...then,
  ]
  const options: Choice[] = [
    ...(used & 1
      ? []
      : [
          {
            label: 'choice.hemlockVale.takeDamage',
            params: { n: 1 },
            then: pick(1, [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 }]),
          },
        ]),
    ...(used & 2 || !hand
      ? []
      : [
          {
            label: 'choice.hemlockVale.discardRandom',
            then: pick(2, [{ type: 'DiscardRandomFromHand', investigator, amount: 1 }]),
          },
        ]),
    ...(used & 4 || !insects.length
      ? []
      : [
          {
            label: 'choice.hemlockVale.insectAttacks',
            then: pick(4, [
              ask(
                investigator,
                'prompt.chooseEnemy',
                insects.map((e) => ({
                  label: 'choice.enemy',
                  params: { enemy: e.name },
                  target: { type: 'enemy', id: e.id },
                  then: [
                    {
                      type: 'ScenarioSpecific',
                      key: 'insectHunts',
                      data: { investigator, enemy: e.id },
                    },
                  ],
                })),
              ),
            ]),
          },
        ]),
  ]
  if (!options.length) return state
  return push(state, ask(investigator, 'prompt.chooseEffect', options))
}

/** Un Insecto se prepara, se mueve hasta el Lugar del investigador, se enfrenta y ataca. */
function insectHunts(
  state: GameState,
  investigator: InvestigatorId,
  enemyId: string,
  maxSteps = Infinity,
): GameState {
  const insect = state.enemies[enemyId]
  const target = getInvestigator(state, investigator).location
  if (!insect || target === null) return state
  const path: LocationId[] = []
  let at = insect.location
  for (let step = 0; step < maxSteps && at !== target; step++) {
    const next = nextStepToward(state, at, (l) => l === target)
    if (!next) break
    path.push(next)
    at = next
  }
  return push(
    state,
    { type: 'ReadyEnemy', enemy: enemyId },
    ...path.map((location): Message => ({ type: 'MoveEnemy', enemy: enemyId, location })),
    ...(at === target
      ? ([
          { type: 'EngageEnemy', enemy: enemyId, investigator },
          {
            type: 'EnemyAttack',
            enemy: enemyId,
            investigator,
            exhaustAfter: true,
            evenIfExhausted: true,
          },
        ] as Message[])
      : []),
  )
}

/** Restos cristalinos derrotados: con las 2 cartas superiores, bajo la Guarida más cercana. */
function remainsDefeated(state: GameState, code: string, investigator: InvestigatorId) {
  const from = getInvestigator(state, investigator).location
  const lairs = nearest(state, from, isLair)
  const location = lairs[0] ?? Object.keys(state.locations).find(isLair)
  if (!location) return state
  const top = state.encounterDeck.slice(0, 2)
  const [stack, rng] = shuffle([remainsCard(code), ...top], state.rng)
  return updateBeneath({ ...state, rng, encounterDeck: state.encounterDeck.slice(2) }, location, [
    ...(state.locations[location]?.beneath ?? []),
    ...stack,
  ])
}

/** Mensajes propios del escenario. */
export function heathSpecific(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState {
  const investigator = String(data.investigator ?? '')
  switch (key) {
    case 'warrens':
      return warrens(state)
    case 'dealBeneath': {
      const order = String(data.order).split(',')
      const cards = JSON.parse(String(data.cards)) as EncounterCard[]
      let next = state
      order.forEach((location, i) => {
        const card = cards[i]
        if (card && next.locations[location])
          next = updateBeneath(next, location, [...(next.locations[location]!.beneath ?? []), card])
      })
      return next
    }
    case 'drawBeneath':
      return drawBeneath(state, investigator, String(data.location))
    case 'lookBeneath': {
      const location = String(data.location)
      const [top] = state.locations[location]?.beneath ?? []
      if (!top) return state
      return push(
        state,
        ask(investigator, 'prompt.hemlockVale.lookBeneath', [
          {
            label: 'choice.hemlockVale.toBottom',
            params: { card: top.name },
            then: [{ type: 'ScenarioSpecific', key: 'stackToBottom', data: { location } }],
          },
          { label: 'choice.hemlockVale.leaveOnTop', params: { card: top.name }, then: [] },
        ]),
      )
    }
    case 'stackToBottom': {
      const location = String(data.location)
      const [top, ...rest] = state.locations[location]?.beneath ?? []
      return top ? updateBeneath(state, location, [...rest, top]) : state
    }
    case 'lairCodex':
      return lairStack(state, String(data.location), String(data.codex))
    case 'spawnLarva': {
      const location = String(data.location)
      const deck = state.encounterDeck.findIndex((c) => c.code === HEATH.colorlessLarva)
      const discard = state.encounterDiscard.findIndex((c) => c.code === HEATH.colorlessLarva)
      if (deck < 0 && discard < 0) return state
      const [rest, rng] = shuffle(
        deck < 0 ? state.encounterDeck : state.encounterDeck.filter((_, n) => n !== deck),
        state.rng,
      )
      return push(
        {
          ...state,
          rng,
          encounterDeck: rest,
          encounterDiscard:
            deck < 0
              ? state.encounterDiscard.filter((_, n) => n !== discard)
              : state.encounterDiscard,
        },
        { type: 'SpawnEnemy', card: colorlessLarva, location, engageWith: null },
      )
    }
    case 'remainsRevealed': {
      const { [String(data.treachery)]: _drop, ...treacheries } = state.treacheries
      return push(
        { ...state, treacheries },
        { type: 'PutAssetIntoPlay', investigator, code: String(data.code), noSlot: true },
      )
    }
    case 'remainsDefeated':
      return remainsDefeated(state, String(data.code), investigator)
    case 'remainsToVictory': {
      const asset = state.assets[String(data.asset)]
      if (!asset) return state
      return push(
        {
          ...state,
          victoryDisplay: [...state.victoryDisplay, asset.code],
          victoryPoints: (state.victoryPoints ?? 0) + 1,
        },
        { type: 'RemoveAssetFromGame', asset: asset.id, leavingResolved: true },
      )
    }
    case 'queenCheck':
      return queenCheckResolve(state)
    case 'queen':
      return spawnQueen(state)
    case 'strangeCreatures':
      return strangeCreatures(state)
    case 'resonance':
      return resonance(state, investigator)
    case 'insectHunts':
      return insectHunts(state, investigator, String(data.enemy))
    case 'defendTheNest': {
      const insects = nearestInsects(state, investigator)
      if (!insects.length)
        return push(state, { type: 'TakeDamage', investigator, damage: 0, horror: 2 })
      return push(
        state,
        ask(
          investigator,
          'prompt.chooseEnemy',
          insects.map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [{ type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 1 }],
          })),
        ),
      )
    }
    case 'insectEngages': {
      const here = getInvestigator(state, investigator).location
      const insects = Object.values(state.enemies).filter((e) => isInsect(e) && e.location === here)
      if (!insects.length) return state
      return push(
        state,
        ask(
          investigator,
          'prompt.chooseEnemy',
          insects.map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [
              { type: 'EngageEnemy', enemy: e.id, investigator },
              {
                type: 'EnemyAttack',
                enemy: e.id,
                investigator,
                exhaustAfter: false,
                evenIfExhausted: true,
              },
            ],
          })),
        ),
      )
    }
    case 'insectStrikes': {
      // Difícil/Experto: prepara al Insecto más cercano; se mueve y ataca como en la fase
      // de Enemigos (un paso hacia ti y ataca si llega).
      const [insect] = nearestInsects(state, investigator)
      return insect ? insectHunts(state, investigator, insect.id, 1) : state
    }
    case 'victoryToDeck': {
      const options = [...new Set(nonEliteInVictory(state))]
      if (!options.length) return state
      return push(
        state,
        ask(investigator, 'prompt.hemlockVale.victoryToDeck', [
          ...options.map((code): Choice => ({
            label: 'choice.card',
            params: { card: enemyByCode(code)!.name },
            then: [{ type: 'ScenarioSpecific', key: 'victoryCardToDeck', data: { code } }],
          })),
          { label: 'choice.skip', then: [] },
        ]),
      )
    }
    case 'victoryCardToDeck': {
      const code = String(data.code)
      const card = enemyByCode(code)
      const index = state.victoryDisplay.lastIndexOf(code)
      if (!card || index < 0) return state
      const [deck, rng] = shuffle([...state.encounterDeck, card], state.rng)
      return {
        ...state,
        rng,
        encounterDeck: deck,
        victoryDisplay: state.victoryDisplay.filter((_, n) => n !== index),
        victoryPoints: (state.victoryPoints ?? 0) - (card.victory ?? 0),
      }
    }
  }
  return state
}
