/**
 * La fiesta del Valle de la Cicuta, Escenario: La Casa Cicuta (guía, pp. 14–18).
 * Lugares y Lugares-Enemigo (p. 16), sellos, bolsa de depredación (La casa depredadora),
 * planes, actos, tarjeta de referencia, habitantes, códice y resoluciones. Los conjuntos
 * compartidos del Valle están en `vale-encounters.ts`.
 */
import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  gridNeighbors,
  nextInt,
  nextStepToward,
  printedCode,
  push,
  recomputeConnections,
  residentAvailable,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerPlayerCard,
  registerPlayerCards,
  registerScenario,
  registerTreachery,
  seedRng,
  shuffle,
  valleyTime,
  type Choice,
  type EncounterCard,
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
  type ValleyResident,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { copies, effectTest, enemy, treachery } from '../scenario-helpers'
import { hemlockValeChaosBag } from './chaos-bag'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { daySetDeck } from './rock-encounters'
import {
  agentsOfTheColourDeck,
  blightDeck,
  fire,
  transfigurationDeck,
  valeEnemyKeyword,
  valeSpecific,
} from './vale-encounters'
import { registerCodexGate, RESIDENTS } from './welcome'
import { NEXT_PRELUDE } from './written-in-rock'

export const HEMLOCK_HOUSE = 'hemlock-vale-hemlock-house'

export const HOUSE = {
  reference: '10523',
  predatoryHouse: '10524',
  eerieSilence: '10525',
  houseStirsV1: '10526',
  houseStirsV2: '10527',
  livingWalls: '10528',
  strangeInfestation: '10529',
  againstTheHouse: '10530',
  heartOfTheHouse: '10531',
  parlor: '10541',
  diningRoom: '10542',
  foyer: '10543',
  grapplingSpawn: '10544',
  outOfTheWalls: '10545',
  pulledIn: '10546',
  shapelessCellar: '10547',
  littleSylvie: '10548',
  fire: '10743',
} as const

export const BEDROOMS = ['10532', '10533', '10534', '10535'] as const
export const WASHROOMS = ['10536', '10537', '10538'] as const
export const LIBRARIES = ['10539', '10540'] as const

/** Columnas izquierda, central y derecha; el piso f ocupa la fila 5 − f (Sótano: piso 0). */
export const LEFT = 1
export const MIDDLE = 2
export const RIGHT = 3
const at = (column: number, floor: number): [number, number] => [column, 5 - floor]

const entry = (key: string): StoryEntry => ({
  title: `story.hemlockVale.hemlockHouse.${key}.title`,
  body: `story.hemlockVale.hemlockHouse.${key}.body`,
})

const read = (state: GameState, key: string): Message[] =>
  state.interactive ? [{ type: 'Story', entry: entry(key) }] : []

const meta = (state: GameState, key: string) => Number(state.scenarioMeta?.[key] ?? 0)
const setMeta = (key: string, value: number): Message => ({ type: 'SetScenarioMeta', key, value })
const withMeta = (state: GameState, values: Record<string, number>): GameState => ({
  ...state,
  scenarioMeta: { ...state.scenarioMeta, ...values },
})

const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})

const isHard = (state: GameState) => state.difficulty === 'hard' || state.difficulty === 'expert'
const isNight = (state: GameState) => valleyTime(state.campaignLog)?.time === 'night'
const lead = (state: GameState): InvestigatorId => activeInvestigators(state)[0]?.id ?? ''

// ---------------------------------------------------------------------------
// Lugares (lado Letargo) y Lugares-Enemigo (reverso)
// ---------------------------------------------------------------------------

const room = (id: string, name: string, shroud: number, clueValue: number): LocationCard => ({
  id,
  name,
  shroud,
  clueValue,
  cluesPerInvestigator: true,
  connections: [],
})

/** Los 12 Lugares de doble cara. Dormitorio: velo X = piso + 1 (`shroudModifier`). */
export const ROOMS: LocationCard[] = [
  ...BEDROOMS.map((id) => room(id, 'Bedroom', 0, 1)),
  ...WASHROOMS.map((id) => room(id, 'Washroom', 4, 1)),
  ...LIBRARIES.map((id) => room(id, 'Library', 3, 1)),
  room(HOUSE.parlor, 'Parlor', 4, 2),
  room(HOUSE.diningRoom, 'Dining Room', 2, 3),
  room(HOUSE.foyer, 'Foyer', 2, 1),
]

export const shapelessCellarLocation: LocationCard = {
  ...room(HOUSE.shapelessCellar, 'Shapeless Cellar', 4, 3),
  victory: 1,
}

interface Living {
  card: EnemyCard
  shroud: number
  /** Salud adicional por investigador («obtiene +N [per_investigator] de salud»). */
  bonus: number
}

const living = (
  code: string,
  name: string,
  stats: { fight: number; health: number; evade: number; damage: number; horror: number },
  extra: { shroud: number; victory: number; bonus?: number; perInvestigator?: boolean },
  keywords: EnemyCard['keywords'] = ['massive'],
): Living => ({
  card: enemy({
    code: `${code}b`,
    name,
    traits: ['Room', 'Monster', 'Elite'],
    ...stats,
    ...(extra.perInvestigator ? { healthPerInvestigator: true } : {}),
    keywords,
    noOpportunityAttacks: true,
    victory: extra.victory,
  }),
  shroud: extra.shroud,
  bonus: extra.bonus ?? 0,
})

/** Reverso de cada Lugar (cartas 10532b–10543b). */
export const LIVING: Record<string, Living> = {
  '10532': living(
    '10532',
    'Living Bedroom',
    { fight: 3, health: 3, evade: 2, damage: 2, horror: 0 },
    { shroud: 3, victory: 0, bonus: 2 },
  ),
  '10533': living(
    '10533',
    'Living Bedroom',
    { fight: 3, health: 3, evade: 2, damage: 1, horror: 1 },
    { shroud: 3, victory: 0, bonus: 2 },
  ),
  '10534': living(
    '10534',
    'Living Bedroom',
    { fight: 3, health: 3, evade: 2, damage: 1, horror: 1 },
    { shroud: 3, victory: 0, bonus: 2 },
  ),
  '10535': living(
    '10535',
    'Living Bedroom',
    { fight: 3, health: 3, evade: 2, damage: 2, horror: 0 },
    { shroud: 3, victory: 0, bonus: 2 },
  ),
  '10536': living(
    '10536',
    'Living Washroom',
    { fight: 3, health: 3, evade: 3, damage: 2, horror: 0 },
    { shroud: 4, victory: 0, perInvestigator: true },
  ),
  '10537': living(
    '10537',
    'Living Washroom',
    { fight: 3, health: 3, evade: 3, damage: 0, horror: 2 },
    { shroud: 4, victory: 0, perInvestigator: true },
  ),
  '10538': living(
    '10538',
    'Living Washroom',
    { fight: 3, health: 3, evade: 3, damage: 1, horror: 1 },
    { shroud: 4, victory: 0, perInvestigator: true },
  ),
  '10539': living(
    '10539',
    'Living Library',
    { fight: 4, health: 4, evade: 2, damage: 0, horror: 3 },
    { shroud: 3, victory: 0, bonus: 1 },
  ),
  '10540': living(
    '10540',
    'Living Library',
    { fight: 4, health: 4, evade: 2, damage: 0, horror: 3 },
    { shroud: 3, victory: 0, bonus: 1 },
  ),
  [HOUSE.parlor]: living(
    HOUSE.parlor,
    'Living Parlor',
    { fight: 3, health: 3, evade: 1, damage: 1, horror: 2 },
    { shroud: 4, victory: 1, bonus: 2 },
    ['massive', 'retaliate'],
  ),
  [HOUSE.diningRoom]: living(
    HOUSE.diningRoom,
    'Living Dining Room',
    { fight: 3, health: 4, evade: 3, damage: 1, horror: 1 },
    { shroud: 2, victory: 1, bonus: 2 },
  ),
  [HOUSE.foyer]: living(
    HOUSE.foyer,
    'Living Foyer',
    { fight: 2, health: 3, evade: 3, damage: 2, horror: 0 },
    { shroud: 2, victory: 0, perInvestigator: true },
  ),
}

/** Sótano informe: solo es Lugar-Enemigo (no se puede sellar ni dar la vuelta). */
export const shapelessCellar: EnemyCard = enemy({
  code: HOUSE.shapelessCellar,
  name: 'Shapeless Cellar',
  traits: ['Room', 'Monster', 'Elite'],
  fight: 3,
  health: 5,
  healthPerInvestigator: true,
  evade: 2,
  damage: 1,
  horror: 2,
  keywords: ['massive', 'retaliate'],
  noOpportunityAttacks: true,
  victory: 1,
})

const ENEMY_LOCATION_CODES = new Set([
  ...Object.values(LIVING).map((l) => l.card.code),
  HOUSE.shapelessCellar,
])

/** El Lugar-Enemigo que es este Lugar, si lo hay. */
export function enemyLocationAt(state: GameState, location: LocationId): Enemy | undefined {
  return Object.values(state.enemies).find(
    (e) => e.location === location && ENEMY_LOCATION_CODES.has(e.code),
  )
}

export const isEnemyLocation = (state: GameState, enemy: Enemy) =>
  ENEMY_LOCATION_CODES.has(enemy.code) && !!state.locations[enemy.location]

export const enemyLocations = (state: GameState): Enemy[] =>
  Object.values(state.enemies).filter((e) => isEnemyLocation(state, e))

/** Lado Letargo boca arriba: los 12 Lugares de la casa que no se han dado la vuelta. */
export const isDormant = (state: GameState, location: LocationId) =>
  !!LIVING[printedCode(location)] &&
  !!state.locations[location] &&
  !enemyLocationAt(state, location)

export const seals = (state: GameState, location: LocationId) =>
  state.locations[location]?.resources ?? 0

const unsealedDormant = (state: GameState, location: LocationId) =>
  isDormant(state, location) && seals(state, location) === 0

/** Número de piso: el Sótano es el piso 0 (p. 15). */
export function floorOf(state: GameState, location: LocationId | null): number {
  const position = location === null ? undefined : state.locations[location]?.position
  return position ? 5 - position[1] : 0
}

/** Los Lugares que cumplen `matches` a menor distancia de `from` (con empate, todos). */
function nearest(
  state: GameState,
  from: LocationId | null,
  matches: (location: LocationId) => boolean,
): LocationId[] {
  if (from === null) return []
  const distances = distancesFrom(state, from)
  let best = Infinity
  let found: LocationId[] = []
  for (const [location, distance] of distances) {
    if (!matches(location)) continue
    if (distance < best) [best, found] = [distance, [location]]
    else if (distance === best) found.push(location)
  }
  return found
}

/** «El Lugar … más cercano al mayor número de investigadores» (planes). */
function nearestToMost(state: GameState, matches: (l: LocationId) => boolean): LocationId[] {
  const counts = new Map<LocationId, number>()
  for (const i of activeInvestigators(state))
    for (const l of nearest(state, i.location, matches)) counts.set(l, (counts.get(l) ?? 0) + 1)
  const most = Math.max(0, ...counts.values())
  return [...counts].filter(([, n]) => n === most && most > 0).map(([l]) => l)
}

/** Da la vuelta al Lugar elegido entre `options` (el investigador jefe decide los empates). */
function flipOneOf(state: GameState, options: LocationId[], chooser = lead(state)): Message[] {
  if (options.length <= 1) return options.map((location) => flipMessage(location))
  return [
    ask(
      chooser,
      'prompt.hemlockVale.flipLocation',
      options.map((location) => ({
        label: 'choice.location',
        params: { location: state.locations[location]?.name ?? location },
        target: { type: 'location', id: location },
        then: [flipMessage(location)],
      })),
    ),
  ]
}

const flipMessage = (location: LocationId): Message => ({
  type: 'ScenarioSpecific',
  key: 'flip',
  data: { location },
})

/**
 * Da la vuelta a un Lugar (p. 16): conserva investigadores, Enemigos, vinculadas y fichas.
 * El daño del Lugar-Enemigo se guarda mientras está por su lado Lugar.
 */
function flip(state: GameState, location: LocationId): GameState {
  const here = state.locations[location]
  const code = printedCode(location)
  const side = LIVING[code]
  if (!here || !side) return state
  const enemyHere = enemyLocationAt(state, location)
  if (enemyHere) {
    const card = ROOMS.find((r) => r.id === location)!
    const { [enemyHere.id]: _removed, ...enemies } = state.enemies
    const { shownCode: _shown, ...rest } = here
    return withMeta(
      {
        ...state,
        enemies,
        locations: {
          ...state.locations,
          [location]: { ...rest, name: card.name, shroud: card.shroud },
        },
      },
      { [`damage:${location}`]: enemyHere.damageTaken ?? 0 },
    )
  }
  const flipped: GameState = {
    ...state,
    locations: {
      ...state.locations,
      [location]: { ...here, name: side.card.name, shroud: side.shroud, shownCode: side.card.code },
    },
  }
  const damage = meta(state, `damage:${location}`)
  return push(
    flipped,
    {
      type: 'SpawnEnemy',
      card: side.card,
      location,
      engageWith: null,
      ...(damage ? { initialDamage: damage } : {}),
    },
    { type: 'ScenarioSpecific', key: 'revealed', data: { location } },
  )
}

/** «Obligado – Cuando este Lugar-Enemigo se revela: …» (reversos). */
function onRevealed(state: GameState, location: LocationId): Message[] {
  const self = enemyLocationAt(state, location)
  if (!self) return []
  const here = activeInvestigators(state).filter((i) => i.location === location)
  const attackEach = here.map((i): Message => ({
    type: 'EnemyAttack',
    enemy: self.id,
    investigator: i.id,
    exhaustAfter: false,
    evenIfExhausted: true,
  }))
  const clues = state.locations[location]?.clues ?? 0
  switch (printedCode(location)) {
    case '10532':
      return [{ type: 'PlaceLocationTokens', location, doom: 1 }]
    case '10533':
    case '10535':
    case HOUSE.parlor:
    case HOUSE.foyer:
      return attackEach
    case '10534':
    case HOUSE.diningRoom:
      return [{ type: 'ScenarioSpecific', key: 'predation' }]
    case '10536':
    case '10537':
      return clues ? attackEach : []
    case '10538':
      return clues
        ? here.map((i): Message => ({
            type: 'DiscardRandomFromHand',
            investigator: i.id,
            amount: clues,
          }))
        : []
    case '10539':
    case '10540': {
      const near = new Set([location, ...(state.locations[location]?.connections ?? [])])
      return activeInvestigators(state)
        .filter((i) => i.location !== null && near.has(i.location))
        .map((i): Message =>
          printedCode(location) === '10539'
            ? { type: 'LoseResources', investigator: i.id, amount: 2 }
            : { type: 'TakeDamage', investigator: i.id, damage: 0, horror: 1 },
        )
    }
  }
  return []
}

// ---------------------------------------------------------------------------
// Derrota de un Lugar-Enemigo: la columna cae (p. 16)
// ---------------------------------------------------------------------------

/**
 * Retira el Lugar `location` dejando un espacio vacío. Lo que hubiera en él pasa al Lugar
 * que cae desde arriba o, sin Lugares encima, a uno adyacente elegido por el jefe.
 */
function collapse(state: GameState, location: LocationId, chosen?: LocationId): GameState {
  const here = state.locations[location]
  if (!here?.position) return state
  const [column, row] = here.position
  const above = Object.values(state.locations)
    .filter((l) => l.position?.[0] === column && l.position[1] < row)
    .sort((a, b) => b.position![1] - a.position![1])
  const investigators = activeInvestigators(state).filter((i) => i.location === location)
  const enemies = Object.values(state.enemies).filter(
    (e) => e.location === location && !ENEMY_LOCATION_CODES.has(e.code),
  )
  const assets = Object.values(state.placedAssets ?? {}).filter(
    (a) => a.placement.type === 'location' && a.placement.location === location,
  )
  const occupied = investigators.length + enemies.length + assets.length > 0
  let target: LocationId | undefined = above[0]?.id
  if (!target && occupied) {
    const adjacent = gridNeighbors(state, location).map((l) => l.id)
    if (chosen && adjacent.includes(chosen)) target = chosen
    else if (adjacent.length === 1) target = adjacent[0]
    else if (adjacent.length > 1)
      return push(
        state,
        ask(
          lead(state),
          'prompt.hemlockVale.collapseTarget',
          adjacent.map((id) => ({
            label: 'choice.location',
            params: { location: state.locations[id]?.name ?? id },
            target: { type: 'location', id },
            then: [
              {
                type: 'ScenarioSpecific',
                key: 'collapse',
                data: { location, target: id },
              } as Message,
            ],
          })),
        ),
      )
  }
  let next: GameState = state
  if (target) {
    const to = target
    next = {
      ...next,
      investigators: next.investigators.map((i) =>
        investigators.some((m) => m.id === i.id) ? { ...i, location: to } : i,
      ),
      enemies: {
        ...next.enemies,
        ...Object.fromEntries(enemies.map((e) => [e.id, { ...e, location: to }])),
      },
      ...(next.placedAssets
        ? {
            placedAssets: {
              ...next.placedAssets,
              ...Object.fromEntries(
                assets.map((a) => [
                  a.id,
                  { ...a, placement: { type: 'location' as const, location: to } },
                ]),
              ),
            },
          }
        : {}),
    }
  }
  return push(
    next,
    // Sin Lugar al que ir, los investigadores quedan derrotados (salvo Contra la casa).
    ...(target
      ? []
      : investigators.map((i): Message => ({ type: 'DefeatInvestigator', investigator: i.id }))),
    { type: 'RemoveLocation', location },
    { type: 'ScenarioSpecific', key: 'slideColumn', data: { column, row } },
    ...(target ? [{ type: 'CheckEngagement', location: target } as Message] : []),
  )
}

/** Desliza la columna un piso hacia abajo y, sin columna central, junta las otras dos. */
function slideColumn(state: GameState, column: number, row: number): GameState {
  let locations = Object.fromEntries(
    Object.entries(state.locations).map(([id, l]) => [
      id,
      l.position && l.position[0] === column && l.position[1] < row
        ? { ...l, position: [column, l.position[1] + 1] as [number, number] }
        : l,
    ]),
  )
  const middle = Object.values(locations).some((l) => l.position?.[0] === MIDDLE)
  if (!middle)
    locations = Object.fromEntries(
      Object.entries(locations).map(([id, l]) => [
        id,
        l.position?.[0] === LEFT
          ? { ...l, position: [MIDDLE, l.position[1]] as [number, number] }
          : l,
      ]),
    )
  const next = recomputeConnections({ ...state, locations })
  // Contra la casa: sin Lugares en juego, avanza de inmediato.
  return Object.keys(locations).length === 0 && actIs(next, HOUSE.againstTheHouse)
    ? push(next, { type: 'AdvanceAct' })
    : next
}

const actIs = (state: GameState, code: string) => state.acts[state.actIndex]?.code === code
const agendaStep = (state: GameState) => state.agendaIndex + 1

// ---------------------------------------------------------------------------
// La casa depredadora: bolsa de depredación
// ---------------------------------------------------------------------------

type PredationToken = 'cultist' | 'tablet' | 'elderThing'
const PREDATION: PredationToken[] = ['cultist', 'tablet', 'elderThing']
const inBag = (state: GameState, t: PredationToken) => meta(state, `predation:${t}`)
const setAside = (state: GameState, t: PredationToken) => meta(state, `predationAside:${t}`)

/** Total de fichas Primigenio de la bolsa de depredación (en ella o apartadas). */
export const predationElderThings = (state: GameState) =>
  inBag(state, 'elderThing') + setAside(state, 'elderThing')

/** Resuelve La casa depredadora (plan 1b): crea la bolsa según el día. */
function createPredationBag(state: GameState): GameState {
  const day = valleyTime(state.campaignLog)?.day ?? 1
  return withMeta(state, {
    predationBag: 1,
    'predation:cultist': 1 + (day === 1 ? 2 : day === 2 ? 1 : 0),
    'predation:tablet': 1,
    'predation:elderThing': 1,
  })
}

/** Prueba de depredación (reverso de La casa depredadora). */
function predationTest(state: GameState): GameState {
  if (!meta(state, 'predationBag')) return state
  if (meta(state, 'cancelPredation'))
    return push(withMeta(state, { cancelPredation: 0 }), {
      type: 'Log',
      key: 'log.hemlockVale.predationCanceled',
    })
  const bag = PREDATION.flatMap((t) => Array.from({ length: inBag(state, t) }, () => t))
  if (!bag.length) return state
  const [index, rng] = nextInt(state.rng, bag.length)
  const token = bag[index]!
  const next: GameState = { ...state, rng }
  const logged: Message = {
    type: 'Log',
    key: 'log.hemlockVale.predationToken',
    params: { token },
  }
  const leader = lead(next)
  if (token === 'tablet') {
    // Cada Lugar-Enemigo ataca a cada investigador en él; si no hay ataques, el jefe roba.
    const attacks = enemyLocations(next).flatMap((e) =>
      activeInvestigators(next)
        .filter((i) => i.location === e.location)
        .map((i): Message => ({
          type: 'EnemyAttack',
          enemy: e.id,
          investigator: i.id,
          exhaustAfter: false,
          evenIfExhausted: true,
        })),
    )
    const returned = withMeta(
      next,
      Object.fromEntries(
        PREDATION.flatMap((t) => [
          [`predation:${t}`, inBag(next, t) + setAside(next, t)],
          [`predationAside:${t}`, 0],
        ]),
      ),
    )
    return push(
      returned,
      logged,
      ...(attacks.length
        ? attacks
        : [{ type: 'DrawEncounterCard', investigator: leader } as Message]),
    )
  }
  const aside = withMeta(next, {
    [`predation:${token}`]: inBag(next, token) - 1,
    [`predationAside:${token}`]: setAside(next, token) + 1,
  })
  if (token === 'cultist') return push(aside, logged)
  const from = getInvestigator(aside, leader).location
  return push(
    aside,
    logged,
    ...flipOneOf(
      aside,
      nearest(aside, from, (l) => unsealedDormant(aside, l)),
    ),
  )
}

/** Ficha Primigenio de la bolsa de caos que pasa a la de depredación (planes 2 y 3). */
function elderThingToPredation(state: GameState): GameState {
  if (!meta(state, 'predationBag') || ![2, 3].includes(agendaStep(state))) return state
  const index = state.chaosBag.indexOf('elderThing')
  if (index < 0) return state
  return push(
    withMeta(
      { ...state, chaosBag: state.chaosBag.filter((_, n) => n !== index) },
      { 'predation:elderThing': inBag(state, 'elderThing') + 1 },
    ),
    { type: 'Log', key: 'log.hemlockVale.elderThingToPredation' },
  )
}

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

const atLocation = (state: GameState, investigator: InvestigatorId, location: LocationId) =>
  getInvestigator(state, investigator).location === location

for (const id of BEDROOMS) registerLocation({ code: id })
for (const id of WASHROOMS)
  registerLocation({
    code: id,
    // [rápida]: Mueve 1 pista de este Lugar al que esté justo debajo (límite: 1 por turno).
    abilities: (state, self, investigator) => {
      const below = Object.values(state.locations).find(
        (l) =>
          l.position?.[0] === self.position?.[0] &&
          l.position?.[1] === (self.position?.[1] ?? 0) + 1,
      )
      return isDormant(state, self.id) &&
        atLocation(state, investigator, self.id) &&
        self.clues &&
        below
        ? [
            {
              key: `${self.id}:drip`,
              label: 'ability.hemlockVale.moveClueBelow',
              actions: 0,
              provokes: false,
              limit: { per: 'turn' },
              target: { type: 'location', id: self.id },
              then: [
                {
                  type: 'ScenarioSpecific',
                  key: 'moveClue',
                  data: { from: self.id, to: below.id },
                },
              ],
            },
          ]
        : []
    },
  })
for (const id of LIBRARIES) registerLocation({ code: id })

registerLocation({
  code: HOUSE.parlor,
  // [acción] Gasta 1 pista: 2 daños a un Enemigo en un Lugar conectado; puedes hacer una
  // prueba de [intellect] (4) para 1 daño más (límite: 1 por ronda).
  abilities: (state, self, investigator) => {
    if (!isDormant(state, self.id) || !atLocation(state, investigator, self.id)) return []
    const targets = Object.values(state.enemies).filter((e) =>
      self.connections.includes(e.location),
    )
    if (!targets.length || getInvestigator(state, investigator).clues < 1) return []
    return [
      {
        key: `${self.id}:smoke`,
        label: 'ability.hemlockVale.parlorDamage',
        actions: 1,
        provokes: true,
        limit: { per: 'round' },
        costs: [{ type: 'SpendClues', investigator, amount: 1 }],
        target: { type: 'location', id: self.id },
        then: [
          ask(
            investigator,
            'prompt.chooseEnemy',
            targets.map((e) => ({
              label: 'choice.enemy',
              params: { enemy: e.name },
              target: { type: 'enemy', id: e.id },
              then: [
                { type: 'DamageEnemy', enemy: e.id, amount: 2, by: investigator },
                ask(investigator, 'prompt.hemlockVale.parlorTest', [
                  {
                    label: 'choice.test.intellect',
                    params: { difficulty: 4 },
                    then: [
                      effectTest(investigator, 'Parlor', 'intellect', 4, {
                        onSuccess: [
                          { type: 'DamageEnemy', enemy: e.id, amount: 1, by: investigator },
                        ],
                      }),
                    ],
                  },
                  { label: 'choice.skip', then: [] },
                ]),
              ],
            })),
          ),
        ],
      },
    ]
  },
})

registerLocation({
  code: HOUSE.diningRoom,
  // Obligado: después de descubrir la última pista de este Lugar, descarta 1 carta al azar.
  forced: (state, trigger, self) =>
    isDormant(state, self.id) &&
    trigger.type === 'afterDiscoverClues' &&
    trigger.location === self.id &&
    trigger.last
      ? [{ type: 'DiscardRandomFromHand', investigator: trigger.investigator, amount: 1 }]
      : [],
})

registerLocation({
  code: HOUSE.foyer,
  abilities: (state, self, investigator) =>
    atLocation(state, investigator, self.id)
      ? [
          // [rápida] Durante tu turno: Moverte (límite: 1 por turno). Solo lado Letargo.
          ...(isDormant(state, self.id) && state.activeTurn === investigator
            ? [
                {
                  key: `${self.id}:move`,
                  label: 'ability.hemlockVale.foyerMove',
                  actions: 0,
                  provokes: false,
                  actionKind: 'move' as const,
                  limit: { per: 'turn' as const },
                  target: { type: 'location' as const, id: self.id },
                  then: [{ type: 'ChooseMove', investigator, mandatory: true } as Message],
                },
              ]
            : []),
          // [acción]: Desistir (ambos lados).
          {
            key: `${self.id}:resign`,
            label: 'ability.resign',
            actions: 1,
            provokes: false,
            target: { type: 'location' as const, id: self.id },
            then: [{ type: 'Resign', investigator } as Message],
          },
        ]
      : [],
})

registerLocation({ code: HOUSE.shapelessCellar })

// Lugares-Enemigo: no se mueven, y el Sótano ataca tras fallar una prueba al investigarlo.
for (const side of Object.values(LIVING)) registerEnemy({ code: side.card.code })
registerEnemy({
  code: HOUSE.shapelessCellar,
  forced: (state, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.kind === 'investigate' &&
    !trigger.succeeded &&
    trigger.location === self.location
      ? [
          {
            type: 'EnemyAttack',
            enemy: self.id,
            investigator: trigger.investigator,
            exhaustAfter: false,
            evenIfExhausted: true,
          },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// Cartas de encuentro de La Casa Cicuta
// ---------------------------------------------------------------------------

export const grapplingSpawn: EnemyCard = enemy({
  code: HOUSE.grapplingSpawn,
  name: 'Grappling Spawn',
  traits: ['Monster', 'Mutated'],
  fight: 4,
  health: 2,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
})
registerEnemy({ code: HOUSE.grapplingSpawn })

export const outOfTheWalls = treachery({
  code: HOUSE.outOfTheWalls,
  name: 'Out of the Walls',
  traits: ['Hazard'],
  keywords: [],
})
export const pulledIn = treachery({
  code: HOUSE.pulledIn,
  name: 'Pulled In',
  traits: ['Blunder'],
  keywords: [],
})

// Salen de las paredes: [agility] (3); si fallas, según tu Lugar.
registerTreachery({
  code: HOUSE.outOfTheWalls,
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Out of the Walls', 'agility', 3, {
      onFail: [{ type: 'ScenarioSpecific', key: 'outOfTheWalls', data: { investigator } }],
    }),
  ],
})

// Atraído: sin Lugares-Enemigo, oleada. Si no, [combat] (4); si fallas, vas al más cercano
// y, si fallas por 4 o más, te ataca.
registerTreachery({
  code: HOUSE.pulledIn,
  revelation: (state, investigator) =>
    enemyLocations(state).length
      ? [
          setMeta('pulledBy', 0),
          effectTest(investigator, 'Pulled In', 'combat', 4, {
            onFailEach: [{ type: 'ScenarioSpecific', key: 'pulledIn', data: { investigator } }],
          }),
        ]
      : [{ type: 'GainSurge' }],
})

/** Cartas de La Casa Cicuta que van al mazo desde el principio. */
export const houseEncounterDeck: EncounterCard[] = copies(grapplingSpawn, 2)

// ---------------------------------------------------------------------------
// Planes y actos
// ---------------------------------------------------------------------------

/** [rápida] de los planes 2 y 3: coloca pistas o quita un sello; prepara y da la vuelta. */
function agendaFlipAbility(state: GameState, investigator: InvestigatorId) {
  const here = getInvestigator(state, investigator).location
  if (here === null || !LIVING[printedCode(here)] || !state.locations[here]) return []
  const players = activeInvestigators(state).length
  const costs: Choice[] = [
    ...(getInvestigator(state, investigator).clues >= players
      ? [
          {
            label: 'choice.hemlockVale.placeCluesOnLocation',
            params: { n: players },
            then: [{ type: 'PlaceCluesOnLocation', investigator, amount: players } as Message],
          },
        ]
      : []),
    ...(seals(state, here)
      ? [
          {
            label: 'choice.hemlockVale.removeSeal',
            then: [
              { type: 'ScenarioSpecific', key: 'unseal', data: { location: here } } as Message,
            ],
          },
        ]
      : []),
  ]
  if (!costs.length) return []
  const self = enemyLocationAt(state, here)
  return [
    {
      key: 'houseAgenda:flip',
      label: 'ability.hemlockVale.flipYourLocation',
      actions: 0,
      provokes: false,
      target: { type: 'location' as const, id: here },
      then: [
        ask(
          investigator,
          'prompt.hemlockVale.chooseCost',
          costs.map((c) => ({
            ...c,
            then: [
              ...c.then,
              ...(self ? [{ type: 'ReadyEnemy', enemy: self.id } as Message] : []),
              flipMessage(here),
            ],
          })),
        ),
      ],
    },
  ]
}

registerAgenda({
  code: HOUSE.eerieSilence,
  // Reverso: Salen de las paredes y Atraído (apartadas) y el descarte vuelven al mazo; se da
  // la vuelta al Lugar Letargo sin sellar más cercano a más investigadores; La casa depredadora.
  onAdvance: () => [
    { type: 'ScenarioSpecific', key: 'shuffleSetAside', data: { codes: 'walls' } },
    { type: 'ScenarioSpecific', key: 'flipNearestToMost' },
    { type: 'ScenarioSpecific', key: 'predatoryHouse' },
  ],
})

for (const code of [HOUSE.houseStirsV1, HOUSE.houseStirsV2, HOUSE.livingWalls])
  registerAgenda({
    code,
    // Obligado – Cuando termina la fase de Mitos: Haz una prueba de depredación.
    forced: (_state, trigger) =>
      trigger.type === 'mythosPhaseEnds' ? [{ type: 'ScenarioSpecific', key: 'predation' }] : [],
    abilities: (state, _self, investigator) => agendaFlipAbility(state, investigator),
    onAdvance: (state): Message[] =>
      code === HOUSE.livingWalls
        ? // Cada investigador superviviente que no haya desistido: derrotado y 1 trauma mental.
          activeInvestigators(state).flatMap((i): Message[] => [
            { type: 'SufferTrauma', mental: 1, investigator: i.id },
            { type: 'DefeatInvestigator', investigator: i.id },
          ])
        : [
            ...(code === HOUSE.houseStirsV1
              ? [
                  {
                    type: 'ScenarioSpecific',
                    key: 'shuffleSetAside',
                    data: { codes: '' },
                  } as Message,
                ]
              : []),
            { type: 'ScenarioSpecific', key: 'flipNearestToMost' },
            ...(code === HOUSE.houseStirsV2
              ? [{ type: 'ScenarioSpecific', key: 'fire' } as Message]
              : []),
          ],
  })

/** [acción] de los actos 1 y 2b: sella tu Lugar Letargo sin sellar (1 pista por investigador). */
function sealAbility(state: GameState, investigator: InvestigatorId) {
  const here = getInvestigator(state, investigator).location
  if (here === null || !unsealedDormant(state, here)) return []
  const players = activeInvestigators(state).length
  const group = activeInvestigators(state).filter((i) => i.location === here)
  if (group.reduce((n, i) => n + i.clues, 0) < players) return []
  return [
    {
      key: 'house:seal',
      label: 'ability.hemlockVale.placeSeal',
      actions: 1,
      provokes: true,
      target: { type: 'location' as const, id: here },
      then: [
        { type: 'PayGroupClues', amount: players, from: group.map((i) => i.id) } as Message,
        {
          type: 'ScenarioSpecific',
          key: 'seal',
          data: { location: here, investigator },
        } as Message,
      ],
    },
  ]
}

/** Lugares sellados y Lugares-Enemigo en la zona de victoria (objetivo del acto 1). */
export const victoryEnemyLocations = (state: GameState) =>
  state.victoryDisplay.filter((code) => ENEMY_LOCATION_CODES.has(code)).length
export const sealsInPlay = (state: GameState) =>
  Object.keys(state.locations).reduce((n, id) => n + seals(state, id), 0)
const sealedLocations = (state: GameState) =>
  Object.keys(state.locations).filter((id) => seals(state, id) > 0).length

registerAct({
  code: HOUSE.strangeInfestation,
  abilities: (state, _self, investigator) => sealAbility(state, investigator),
  // Objetivo: al final de la ronda, con 7 Lugares sellados y/o en la zona de victoria.
  forced: (state, trigger) =>
    trigger.type === 'roundEnds' && sealedLocations(state) + victoryEnemyLocations(state) >= 7
      ? [{ type: 'AdvanceAct' }]
      : [],
  onAdvance: (state) =>
    sealsInPlay(state) > victoryEnemyLocations(state)
      ? [
          ...(state.interactive ? [{ type: 'Story', entry: entry('act1Seals') } as Message] : []),
          { type: 'ScenarioSpecific', key: 'cellar' },
        ]
      : [
          ...(state.interactive ? [{ type: 'Story', entry: entry('act1Ruin') } as Message] : []),
          // Contra la casa: se salta El corazón de la casa.
          { type: 'SetAct', index: 1 },
        ],
})

registerAct({
  code: HOUSE.heartOfTheHouse,
  abilities: (state, _self, investigator) => sealAbility(state, investigator),
  forced: (state, trigger) => {
    // Obligado – Después de que un Lugar-Enemigo te ataque: muévete hacia el Sótano informe.
    if (trigger.type === 'afterEnemyAttack') {
      const attacker = state.enemies[trigger.enemy]
      return attacker && isEnemyLocation(state, attacker)
        ? [
            {
              type: 'ScenarioSpecific',
              key: 'moveToward',
              data: { investigator: trigger.investigator, location: HOUSE.shapelessCellar },
            },
          ]
        : []
    }
    // Objetivo – Cuando el Sótano informe esté en la zona de victoria, avanza.
    return trigger.type === 'enemyDefeated' && trigger.enemy.code === HOUSE.shapelessCellar
      ? [{ type: 'AdvanceAct' }]
      : []
  },
  // Reverso: cada Lugar-Enemigo vuelve a su lado Lugar y cada Letargo sin sellar se sella.
  onAdvance: (state) => [
    ...enemyLocations(state)
      .filter((e) => e.code !== HOUSE.shapelessCellar)
      .map((e) => flipMessage(e.location)),
    { type: 'ScenarioSpecific', key: 'sealAll' },
    { type: 'ScenarioSpecific', key: 'resolution', data: { r: 1 } },
  ],
})

registerAct({
  code: HOUSE.againstTheHouse,
  // Objetivo: sin Lugares en juego, avanza de inmediato (`slideColumn`).
  onAdvance: () => [{ type: 'ScenarioSpecific', key: 'resolution', data: { r: 1 } }],
})

// ---------------------------------------------------------------------------
// Tarjeta de referencia y escenario
// ---------------------------------------------------------------------------

function tokenEffect(state: GameState, token: string, investigator: InvestigatorId): TokenEffect {
  const hard = isHard(state)
  const here = getInvestigator(state, investigator).location
  const floor = floorOf(state, here)
  const self = here === null ? undefined : enemyLocationAt(state, here)
  const exhaust: Message[] = self ? [{ type: 'ExhaustEnemy', enemy: self.id }] : []
  switch (token) {
    case 'skull':
      return { modifier: hard ? -Math.max(2, 2 * floor) : -Math.max(1, floor) }
    case 'cultist':
      return hard ? { modifier: -2, onSuccess: exhaust } : { modifier: -1, immediate: exhaust }
    case 'tablet': {
      const amount = hard ? activeInvestigators(state).length : 1
      return {
        modifier: hard ? -4 : -3,
        onFail: [{ type: 'ScenarioSpecific', key: 'healNearest', data: { investigator, amount } }],
      }
    }
    case 'elderThing': {
      const move: Message = { type: 'ScenarioSpecific', key: 'elderThingToPredation' }
      return hard
        ? { modifier: -5, after: [move] }
        : { modifier: -4, onFail: [setMeta('elderThingFailed', 1)], after: [move] }
    }
  }
  return { modifier: 0 }
}

/** Cartas apartadas: Salen de las paredes (4), Atraído (2) y ¡Fuego! (5). */
export const houseSetAside = (): EncounterCard[] => [
  ...copies(outOfTheWalls, 4),
  ...copies(pulledIn, 2),
  ...copies(fire, 5),
]

/** Mazo de Encuentros: La Casa Cicuta y los conjuntos indicados (p. 14), más el del día. */
export function houseEncounters(day: 1 | 2 | 3): EncounterCard[] {
  return [
    ...houseEncounterDeck,
    ...agentsOfTheColourDeck,
    ...blightDeck,
    ...transfigurationDeck,
    ...ENCOUNTER_SETS.lockedDoors,
    ...ENCOUNTER_SETS.rats,
    ...daySetDeck(day),
  ]
}

// ---------------------------------------------------------------------------
// Habitantes y códice (pp. 15 y 17–18)
// ---------------------------------------------------------------------------

registerPlayerCards([
  {
    code: HOUSE.littleSylvie,
    name: 'Little Sylvie',
    story: true,
    unique: true,
    type: 'asset',
    class: 'neutral',
    cost: 1,
    slots: ['accessory'],
    sanity: 1,
    traits: ['Item', 'Charm', 'Cursed'],
  },
])

registerPlayerCard({
  code: HOUSE.littleSylvie,
  // Códice 4 (Día 1): «[acción]: Toma el control de la Pequeña Sylvie».
  placedAbilities: (state, self, investigator) =>
    meta(state, 'sylvieFree') &&
    self.placement.type === 'location' &&
    getInvestigator(state, investigator).location === self.placement.location
      ? [
          {
            key: `${self.id}:take`,
            label: 'ability.hemlockVale.takeSylvie',
            actions: 1,
            provokes: true,
            target: { type: 'placed', id: self.id },
            then: [{ type: 'TakeControlOfPlaced', placed: self.id, investigator }],
          },
        ]
      : [],
})

const residentCode = (resident: ValleyResident) => RESIDENTS[resident].code

/** Lugar del habitante: el suyo si no tiene dueño o el de quien lo controla. */
function residentLocation(state: GameState, resident: ValleyResident): LocationId | null {
  const code = residentCode(resident)
  const placed = Object.values(state.placedAssets ?? {}).find((a) => a.code === code)
  if (placed) return placed.placement.type === 'location' ? placed.placement.location : null
  const owned = Object.values(state.assets).find((a) => a.code === code)
  return owned ? getInvestigator(state, owned.owner).location : null
}

const controls = (state: GameState, investigator: InvestigatorId, code: string) =>
  Object.values(state.assets).some((a) => a.owner === investigator && a.code === code)

function takeControl(
  state: GameState,
  resident: ValleyResident,
  investigator: InvestigatorId,
): Message[] {
  const placed = Object.values(state.placedAssets ?? {}).find(
    (a) => a.code === residentCode(resident),
  )
  return placed ? [{ type: 'TakeControlOfPlaced', placed: placed.id, investigator }] : []
}

function removeResident(state: GameState, resident: ValleyResident): Message[] {
  const code = residentCode(resident)
  const placed = Object.values(state.placedAssets ?? {}).find((a) => a.code === code)
  if (placed) return [{ type: 'RemovePlacedAsset', placed: placed.id }]
  const owned = Object.values(state.assets).find((a) => a.code === code)
  return owned ? [{ type: 'RemoveAssetFromGame', asset: owned.id }] : []
}

const raise = (resident: ValleyResident): Message[] => [
  { type: 'ChangeRelationship', resident },
  { type: 'EarnExperience', amount: 1 },
]

/** Códice Σ: La discusión (p. 18). */
function argument(state: GameState, investigator: InvestigatorId): Message[] {
  const side = (winner: ValleyResident, loser: ValleyResident, key: string): Message[] => [
    ...read(state, key),
    ...removeResident(state, loser),
    ...activeInvestigators(state).map((i): Message => ({
      type: 'DrawCards',
      investigator: i.id,
      amount: 1,
    })),
    ...raise(winner),
  ]
  return [
    setMeta(`codex:${RESIDENTS.williamHemlock.codex}`, 1),
    setMeta(`codex:${RESIDENTS.judithPark.codex}`, 1),
    ...read(state, 'argument1'),
    ask(investigator, 'prompt.hemlockVale.argument', [
      {
        label: 'choice.hemlockVale.judithIsRight',
        then: side('judithPark', 'williamHemlock', 'argument2'),
      },
      {
        label: 'choice.hemlockVale.williamIsRight',
        then: side('williamHemlock', 'judithPark', 'argument3'),
      },
    ]),
  ]
}

/** Códice de La Casa Cicuta (pp. 17–18): William, Gideon, Judith y Theo. */
function houseCodex(state: GameState, n: number, investigator: InvestigatorId): Message[] {
  const day = valleyTime(state.campaignLog)?.day ?? 1
  const done = setMeta(`codex:${n}`, 1)
  const william = residentLocation(state, 'williamHemlock')
  const together = william !== null && william === residentLocation(state, 'judithPark')
  switch (n) {
    case RESIDENTS.williamHemlock.codex:
      if (day === 1 && controls(state, investigator, HOUSE.littleSylvie))
        return [
          done,
          ...read(state, 'codex4FoundSylvie'),
          ...takeControl(state, 'williamHemlock', investigator),
          setMeta('foundSylvie', 1),
          ...raise('williamHemlock'),
        ]
      if (day === 1)
        return [
          ...read(state, 'codex4Day1'),
          setMeta('sylvieFree', 1),
          ...activeInvestigators(state).map((i): Message => ({
            type: 'GainClues',
            investigator: i.id,
            amount: 1,
          })),
        ]
      if (day === 2 && together)
        return [...read(state, 'codex4Argument'), ...argument(state, investigator)]
      if (day === 2)
        return [...read(state, 'codex4Day2'), ...takeControl(state, 'williamHemlock', investigator)]
      return []
    case RESIDENTS.gideonMizrah.codex:
      // La primera vez se cancela la siguiente depredación; la segunda, el mapa.
      return meta(state, 'helpingGideon')
        ? [done, ...read(state, 'codex6Helping'), ...raise('gideonMizrah')]
        : [...read(state, 'codex6'), setMeta('helpingGideon', 1), setMeta('cancelPredation', 1)]
    case RESIDENTS.judithPark.codex:
      if (day === 2 && together)
        return [...read(state, 'codex7Argument'), ...argument(state, investigator)]
      if (day === 2)
        return [...read(state, 'codex7Day2'), ...takeControl(state, 'judithPark', investigator)]
      return [
        done,
        ...read(state, 'codex7Day3'),
        ...takeControl(state, 'judithPark', investigator),
        setMeta('judithRemodeling', 1),
      ]
    case RESIDENTS.theoPeters.codex:
      return [done, ...read(state, 'codex8'), ...takeControl(state, 'theoPeters', investigator)]
  }
  return []
}

// Tras leer el códice 4 el Día 1 sin la muñeca, solo puede volver a activarlo quien
// controle a la Pequeña Sylvie.
registerCodexGate(
  HEMLOCK_HOUSE,
  (state, n, investigator) =>
    n !== RESIDENTS.williamHemlock.codex ||
    !meta(state, 'sylvieFree') ||
    controls(state, investigator, HOUSE.littleSylvie),
)

/** Habitantes de día (p. 15); los tachados no entran en juego. */
function residentSetup(context: ScenarioContext, day: 1 | 2 | 3, top: LocationId): Message[] {
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
  return [
    ...(day === 1 ? place('gideonMizrah', HOUSE.parlor) : []),
    ...(day === 1 ? [{ type: 'ScenarioSpecific', key: 'placeSylvie' } as Message] : []),
    ...(day < 3 ? place('williamHemlock', top) : []),
    ...(day > 1 ? place('judithPark', HOUSE.parlor) : []),
    ...(day === 3 ? place('theoPeters', HOUSE.foyer) : []),
  ]
}

/** Pequeña Sylvie: en un Dormitorio del piso más bajo (el jefe elige si hay varios). */
function placeSylvie(state: GameState): GameState {
  const bedrooms = Object.values(state.locations).filter((l) =>
    (BEDROOMS as readonly string[]).includes(printedCode(l.id)),
  )
  const lowest = Math.min(...bedrooms.map((l) => floorOf(state, l.id)))
  const options = bedrooms.filter((l) => floorOf(state, l.id) === lowest)
  const put = (location: LocationId): Message => ({
    type: 'PlaceAsset',
    code: HOUSE.littleSylvie,
    name: 'Little Sylvie',
    placement: { type: 'location', location },
  })
  return push(
    state,
    options.length === 1
      ? put(options[0]!.id)
      : ask(
          lead(state),
          'prompt.hemlockVale.sylvieBedroom',
          options.map((l) => ({
            label: 'choice.location',
            params: { location: l.name },
            target: { type: 'location', id: l.id },
            then: [put(l.id)],
          })),
        ),
  )
}

/** Preparación (pp. 14–15): devuelve la definición con los Lugares de la cuadrícula. */
export function hemlockHouse(
  context: ScenarioContext,
  encounterDeck?: EncounterCard[],
): ScenarioDefinition {
  const time = context.log.valley ?? { day: 1 as const, time: 'day' as const }
  const rng = seedRng(context.seed)
  const bedrooms = ROOMS.filter((r) => (BEDROOMS as readonly string[]).includes(r.id))
  const [shuffledBedrooms, rng2] = shuffle(bedrooms, rng)
  const top = shuffledBedrooms[0]!
  const pool = ROOMS.filter(
    (r) =>
      r.id !== top.id &&
      ![HOUSE.parlor, HOUSE.diningRoom, HOUSE.foyer].includes(r.id as never) &&
      !(BEDROOMS as readonly string[]).includes(r.id),
  ).concat(shuffledBedrooms.slice(1))
  const [floors] = shuffle(pool, rng2)
  // Pisos 2 y 3: dos filas de tres, en el orden de la referencia (columna a columna).
  const middleFloors = floors.slice(0, 6).map((r, i) => ({
    ...r,
    position: at([LEFT, LEFT, MIDDLE, MIDDLE, RIGHT, RIGHT][i]!, 2 + (i % 2)),
  }))
  const byId = (id: string) => ROOMS.find((r) => r.id === id)!
  const locations: LocationCard[] = [
    { ...byId(HOUSE.parlor), position: at(LEFT, 1) },
    { ...byId(HOUSE.foyer), position: at(MIDDLE, 1) },
    { ...byId(HOUSE.diningRoom), position: at(RIGHT, 1) },
    ...middleFloors,
    { ...top, position: at(MIDDLE, 4) },
  ]
  const day = time.day
  // V.I el Día/Noche 1 y el Día 3; v.II el Día/Noche 2.
  const stirs = day === 2 ? HOUSE.houseStirsV2 : HOUSE.houseStirsV1
  return {
    id: HEMLOCK_HOUSE,
    intro: entry(time.time === 'night' ? 'intro4' : `intro${day}`),
    setupInstructions: entry('setup'),
    grid: true,
    locations,
    setAsideLocations: [shapelessCellarLocation],
    startingLocation: day === 3 ? top.id : HOUSE.foyer,
    agendas: [
      { code: HOUSE.eerieSilence, name: 'Eerie Silence', doomThreshold: 2 },
      {
        code: stirs,
        name: day === 2 ? 'The House Stirs (v. II)' : 'The House Stirs (v. I)',
        doomThreshold: 5,
      },
      { code: HOUSE.livingWalls, name: 'Living Walls', doomThreshold: 8 },
    ],
    acts: [
      {
        code: HOUSE.strangeInfestation,
        name: 'Strange Infestation',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: HOUSE.heartOfTheHouse,
        name: 'The Heart of the House',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: HOUSE.againstTheHouse,
        name: 'Against the House',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: encounterDeck ?? houseEncounters(day),
    setAside: houseSetAside(),
    chaosBag: hemlockValeChaosBag(context),
    tokenValues: {},
    setup: [
      { type: 'SetValleyTime', day, time: time.time },
      // Lado Letargo boca arriba: los Lugares están revelados desde el principio.
      ...locations.map((l): Message => ({ type: 'RevealLocation', location: l.id })),
      ...(time.time === 'day' ? residentSetup(context, day, top.id) : []),
    ],
  }
}

/** Siguiente paso tras la Resolución 2, según el día y la hora (pp. 18 y 13). */
function resolutionMessages(state: GameState, r: number): Message[] {
  const time = valleyTime(state.campaignLog)
  const story = (key: string): Message[] =>
    state.interactive ? [{ type: 'Story', entry: entry(key) }] : []
  const next = time ? NEXT_PRELUDE[time.time + ':' + time.day] : undefined
  const sealCount = sealsInPlay(state)
  const defeated = victoryEnemyLocations(state)
  const bonus = (n: number, thresholds: number[]): Message[] =>
    thresholds.filter((t) => n >= t).map((): Message => ({ type: 'EarnExperience', amount: 1 }))
  return [
    ...story(r ? 'resolution1' : 'noResolution'),
    ...story('resolution2'),
    // Las fichas Primigenio de la bolsa de depredación salvo una vuelven a la bolsa de caos:
    // la de la campaña no cambia (`elderThingToPredation` solo las quitó de esta partida).
    ...bonus(sealCount, [8, 10]),
    ...bonus(defeated, [8, 10]),
    ...residentResolution(state, defeated),
    { type: 'EarnExperience', amount: 0, victory: true },
    { type: 'SurveyArea', area: 'hemlockHarbor' },
    ...(next ? [{ type: 'ChooseValleyRoute', scenario: next } as Message] : []),
    {
      type: 'EndScenario',
      outcome: r ? { type: 'resolution', resolution: r } : { type: 'noResolution' },
      told: true,
    },
  ]
}

/** Habitantes en la Resolución 2: la Pequeña Sylvie y las reformas de Judith. */
function residentResolution(state: GameState, defeated: number): Message[] {
  const players = activeInvestigators(state).length
    ? activeInvestigators(state)
    : state.investigators
  const sylvie: Message[] =
    meta(state, 'foundSylvie') && players.length
      ? [
          ask(lead(state) || players[0]!.id, 'prompt.hemlockVale.sylvieDeck', [
            ...players.map((i): Choice => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [{ type: 'AddStoryAsset', investigator: i.id, code: HOUSE.littleSylvie }],
            })),
            { label: 'choice.skip', then: [] },
          ]),
        ]
      : []
  const judith =
    defeated >= 8 &&
    meta(state, 'judithRemodeling') &&
    Object.values(state.assets).some((a) => a.code === RESIDENTS.judithPark.code)
  return [...sylvie, ...(judith ? raise('judithPark') : [])]
}

registerScenario({
  id: HEMLOCK_HOUSE,
  shroudModifier: (state, location) =>
    (BEDROOMS as readonly string[]).includes(printedCode(location.id)) &&
    isDormant(state, location.id)
      ? floorOf(state, location.id) + 1
      : 0,
  enemyHealthModifier: (state, e) => {
    if (e.code === HOUSE.grapplingSpawn) return Math.max(1, floorOf(state, e.location))
    const side = Object.values(LIVING).find((l) => l.card.code === e.code)
    return side ? side.bonus * activeInvestigators(state).length : 0
  },
  // Engendro aferrado: (Noche) Represalia.
  enemyKeyword: (state, e, keyword) =>
    e.code === HOUSE.grapplingSpawn && keyword === 'retaliate' && isNight(state)
      ? true
      : valeEnemyKeyword(state, e, keyword),
  // Los Lugares-Enemigo no pueden ser movidos por efectos de cartas (p. 16).
  cannotMoveEnemy: (state, e) => isEnemyLocation(state, e),
  // Actos: no se pueden descubrir pistas de Lugares sin investigadores.
  cannotDiscoverClues: (state, _investigator, location) =>
    !activeInvestigators(state).some((i) => i.location === location),
  tokenEffect,
  forced: (state, trigger) => {
    // Un Lugar-Enemigo derrotado va a la zona de victoria y su columna cae.
    if (
      trigger.type === 'enemyDefeated' &&
      ENEMY_LOCATION_CODES.has(trigger.enemy.code) &&
      state.locations[trigger.enemy.location]
    )
      return [
        { type: 'ScenarioSpecific', key: 'collapse', data: { location: trigger.enemy.location } },
      ]
    // Sótano informe: sin pistas, pasa a la zona de victoria.
    if (
      trigger.type === 'afterDiscoverClues' &&
      trigger.location === HOUSE.shapelessCellar &&
      trigger.last
    )
      return [{ type: 'ScenarioSpecific', key: 'cellarToVictory' }]
    return []
  },
  reactions: (state, trigger) => {
    // Biblioteca: tras descubrir su última pista, pasadizo secreto (máx. una vez por partida).
    if (
      trigger.type !== 'afterDiscoverClues' ||
      !trigger.last ||
      !(LIBRARIES as readonly string[]).includes(printedCode(trigger.location)) ||
      !isDormant(state, trigger.location) ||
      meta(state, 'secretPassage')
    )
      return []
    const others = Object.values(state.locations).filter((l) => l.id !== trigger.location)
    if (!others.length) return []
    return [
      {
        key: 'house:secretPassage',
        investigator: trigger.investigator,
        label: 'ability.hemlockVale.secretPassage',
        then: [
          ask(
            trigger.investigator,
            'prompt.hemlockVale.secretPassage',
            others.map((l) => ({
              label: 'choice.location',
              params: { location: l.name },
              target: { type: 'location', id: l.id },
              then: [{ type: 'ScenarioSpecific', key: 'secretPassage', data: { location: l.id } }],
            })),
          ),
        ],
      },
    ]
  },
  onAllInvestigatorsEliminated: (state) => resolutionMessages(state, 0),
  specific: (state, key, data) => {
    if (key === 'resolution') return push(state, ...resolutionMessages(state, Number(data.r ?? 0)))
    if (key === 'codex')
      return push(state, ...houseCodex(state, Number(data.n), String(data.investigator)))
    if (key === 'placeSylvie') return placeSylvie(state)
    return valeSpecific(state, key, data) ?? houseSpecific(state, key, data)
  },
})

/** Mensajes propios del escenario. */
export function houseSpecific(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState {
  switch (key) {
    case 'flip':
      return flip(state, String(data.location))
    case 'revealed':
      return push(state, ...onRevealed(state, String(data.location)))
    case 'flipNearestToMost':
      return push(
        state,
        ...flipOneOf(
          state,
          nearestToMost(state, (l) => unsealedDormant(state, l)),
        ),
      )
    case 'predatoryHouse':
      return createPredationBag(state)
    case 'predation':
      return predationTest(state)
    case 'elderThingToPredation': {
      const failed = meta(state, 'elderThingFailed')
      const cleared = withMeta(state, { elderThingFailed: 0 })
      return isHard(state) || failed ? elderThingToPredation(cleared) : cleared
    }
    case 'collapse':
      return collapse(state, String(data.location), data.target ? String(data.target) : undefined)
    case 'slideColumn':
      return slideColumn(state, Number(data.column), Number(data.row))
    case 'seal': {
      const location = String(data.location)
      const investigator = String(data.investigator)
      const here = state.locations[location]
      if (!here) return state
      const sealed: GameState = {
        ...state,
        locations: {
          ...state.locations,
          [location]: { ...here, resources: (here.resources ?? 0) + 1 },
        },
      }
      // Dormitorio: después de sellarlo, roba 1 carta u obtén 2 recursos.
      return (BEDROOMS as readonly string[]).includes(printedCode(location))
        ? push(
            sealed,
            ask(investigator, 'prompt.chooseEffect', [
              {
                label: 'choice.drawCards',
                params: { n: 1 },
                then: [{ type: 'DrawCards', investigator, amount: 1 } as Message],
              },
              {
                label: 'choice.gainResources',
                params: { n: 2 },
                then: [{ type: 'GainResources', investigator, amount: 2 } as Message],
              },
              { label: 'choice.skip', then: [] },
            ]),
          )
        : sealed
    }
    case 'unseal': {
      const location = String(data.location)
      const here = state.locations[location]
      if (!here?.resources) return state
      return {
        ...state,
        locations: { ...state.locations, [location]: { ...here, resources: here.resources - 1 } },
      }
    }
    case 'sealAll':
      return {
        ...state,
        locations: Object.fromEntries(
          Object.entries(state.locations).map(([id, l]) => [
            id,
            unsealedDormant(state, id) ? { ...l, resources: 1 } : l,
          ]),
        ),
      }
    case 'moveClue': {
      const from = state.locations[String(data.from)]
      const to = state.locations[String(data.to)]
      if (!from?.clues || !to) return state
      return {
        ...state,
        locations: {
          ...state.locations,
          [from.id]: { ...from, clues: from.clues - 1 },
          [to.id]: { ...to, clues: to.clues + 1 },
        },
      }
    }
    case 'moveToward': {
      const investigator = String(data.investigator)
      const from = getInvestigator(state, investigator).location
      const goal = String(data.location)
      if (from === null || !state.locations[goal]) return state
      const step = nextStepToward(state, from, (l) => l === goal)
      return step
        ? push(
            state,
            { type: 'MoveTo', investigator, location: step, unpreventable: true },
            { type: 'ScenarioSpecific', key: 'moveToward', data },
          )
        : state
    }
    case 'cellar':
      // El Sótano informe entra en el piso del Sótano, en la columna central si es posible.
      return push(
        state,
        { type: 'PutLocationIntoPlay', location: HOUSE.shapelessCellar, position: at(MIDDLE, 0) },
        { type: 'RevealLocation', location: HOUSE.shapelessCellar },
        {
          type: 'SpawnEnemy',
          card: shapelessCellar,
          location: HOUSE.shapelessCellar,
          engageWith: null,
        },
        { type: 'ScenarioSpecific', key: 'cellarFace' },
      )
    case 'cellarFace': {
      const here = state.locations[HOUSE.shapelessCellar]
      return here
        ? {
            ...state,
            locations: {
              ...state.locations,
              [here.id]: { ...here, shownCode: HOUSE.shapelessCellar },
            },
          }
        : state
    }
    case 'cellarToVictory': {
      // Sin pistas, el Sótano informe pasa a la zona de victoria sin ser derrotado.
      const self = enemyLocationAt(state, HOUSE.shapelessCellar)
      if (!self) return state
      return push(
        state,
        { type: 'EnemyToVictory', enemy: self.id },
        { type: 'ScenarioSpecific', key: 'leaveCellar' },
        ...(actIs(state, HOUSE.heartOfTheHouse) ? [{ type: 'AdvanceAct' } as Message] : []),
      )
    }
    case 'leaveCellar': {
      // Retira el Lugar y lleva lo que hubiera en él a un Lugar adyacente (sin deslizar).
      const here = state.locations[HOUSE.shapelessCellar]
      if (!here?.position) return state
      return collapse(state, HOUSE.shapelessCellar, data.target ? String(data.target) : undefined)
    }
    case 'healNearest': {
      const investigator = String(data.investigator)
      const from = getInvestigator(state, investigator).location
      const options = nearest(state, from, (l) => !!enemyLocationAt(state, l))
      const amount = Number(data.amount ?? 1)
      if (!options.length) return state
      return push(
        state,
        options.length === 1
          ? { type: 'HealEnemy', enemy: enemyLocationAt(state, options[0]!)!.id, amount }
          : ask(
              lead(state),
              'prompt.chooseEnemy',
              options.map((l) => {
                const e = enemyLocationAt(state, l)!
                return {
                  label: 'choice.enemy',
                  params: { enemy: e.name },
                  target: { type: 'enemy', id: e.id },
                  then: [{ type: 'HealEnemy', enemy: e.id, amount } as Message],
                }
              }),
            ),
      )
    }
    case 'outOfTheWalls': {
      const investigator = String(data.investigator)
      const here = getInvestigator(state, investigator).location
      if (here === null) return state
      if (enemyLocationAt(state, here))
        return push(state, { type: 'TakeDamage', investigator, damage: 1, horror: 1 })
      if (unsealedDormant(state, here)) return push(state, flipMessage(here))
      return seals(state, here)
        ? push(state, { type: 'DiscardRandomFromHand', investigator, amount: 1 })
        : state
    }
    case 'pulledIn': {
      const investigator = String(data.investigator)
      const by = meta(state, 'pulledBy') + 1
      const next = withMeta(state, { pulledBy: by })
      const from = getInvestigator(next, investigator).location
      if (by === 1) {
        const options = nearest(next, from, (l) => !!enemyLocationAt(next, l))
        if (!options.length) return next
        const go = (l: LocationId): Message[] => [
          { type: 'ScenarioSpecific', key: 'moveToward', data: { investigator, location: l } },
        ]
        return push(
          next,
          ...(options.length === 1
            ? go(options[0]!)
            : [
                ask(
                  investigator,
                  'prompt.hemlockVale.pulledIn',
                  options.map((l) => ({
                    label: 'choice.location',
                    params: { location: next.locations[l]?.name ?? l },
                    target: { type: 'location', id: l },
                    then: go(l),
                  })),
                ),
              ]),
        )
      }
      // Si fallas por 4 o más, el Lugar-Enemigo elegido (al que has llegado) te ataca.
      if (by === 4 && from !== null) {
        const self = enemyLocationAt(next, from)
        return self
          ? push(next, {
              type: 'EnemyAttack',
              enemy: self.id,
              investigator,
              exhaustAfter: false,
              evenIfExhausted: true,
            })
          : next
      }
      return next
    }
    case 'shuffleSetAside': {
      // Salen de las paredes y Atraído (si se indica) y el descarte de Encuentros, al mazo.
      const walls = data.codes === 'walls'
      const moved = walls
        ? state.setAside.filter((c) => c.code === HOUSE.outOfTheWalls || c.code === HOUSE.pulledIn)
        : []
      const [encounterDeck, rng] = shuffle(
        [...state.encounterDeck, ...state.encounterDiscard, ...moved],
        state.rng,
      )
      return {
        ...state,
        encounterDeck,
        encounterDiscard: [],
        rng,
        setAside: walls ? state.setAside.filter((c) => !moved.includes(c)) : state.setAside,
      }
    }
    case 'secretPassage': {
      // 1 horror como pasadizo secreto; cada Biblioteca queda conectada con ese Lugar.
      const location = String(data.location)
      const libraries = Object.keys(state.locations).filter(
        (id) => (LIBRARIES as readonly string[]).includes(printedCode(id)) && id !== location,
      )
      return push(
        withMeta(state, { secretPassage: 1 }),
        { type: 'PlaceLocationTokens', location, horror: 1 },
        ...libraries.map((id): Message => ({ type: 'ConnectLocations', a: id, b: location })),
      )
    }
    case 'fire': {
      // ¡Fuego! apartado en el Lugar de más a la izquierda del piso más alto; las demás
      // copias y el descarte, al mazo.
      const placed = Object.values(state.locations).filter((l) => l.position)
      const top = Math.min(...placed.map((l) => l.position![1]))
      const target = placed
        .filter((l) => l.position![1] === top)
        .sort((a, b) => a.position![0] - b.position![0])[0]
      const fires = state.setAside.filter((c) => c.code === HOUSE.fire)
      const [encounterDeck, rng] = shuffle(
        [...state.encounterDeck, ...state.encounterDiscard, ...fires.slice(target ? 1 : 0)],
        state.rng,
      )
      const next: GameState = {
        ...state,
        encounterDeck,
        encounterDiscard: [],
        rng,
        setAside: state.setAside.filter(
          (c) => c.code !== HOUSE.fire || (c === fires[0] && !!target),
        ),
      }
      return target && fires.length
        ? push(next, {
            type: 'PlaceSetAsideTreachery',
            code: HOUSE.fire,
            placement: { type: 'location', location: target.id },
          })
        : next
    }
  }
  return state
}
