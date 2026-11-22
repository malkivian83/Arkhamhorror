/**
 * La fiesta del Valle de la Cicuta, Escenario: La cosa de las profundidades (guía, pp. 27–30).
 * Cuadrícula de 3×3 con Lugares en hundimiento (socavones como fichas de daño en el Lugar;
 * con 3 o más, el Lugar pasa a su lado Hundido), Cosa de las profundidades, Híbrido chelydra y
 * Tentáculos aferradores, El bosque (compartido), planes, actos, códice y resoluciones.
 */
import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  playerCardDef,
  printedCode,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerPlayerCard,
  registerScenario,
  registerTreachery,
  residentAvailable,
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
  type TreacheryCard,
  type ValleyResident,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { chooseSkillTest, copies, effectTest, enemy, treachery } from '../scenario-helpers'
import { hemlockValeChaosBag } from './chaos-bag'
import { mutationsDeck } from './lost-sister'
import { daySetDeck } from './rock-encounters'
import { HEATH } from './silent-heath'
import { blightDeck, valeEnemyKeyword, valeSpecific } from './vale-encounters'
import { nightAt, nightForEnemy } from './vale-time'
import { registerCodexGate, RESIDENTS } from './welcome'
import { NEXT_PRELUDE } from './written-in-rock'

export const THING_IN_THE_DEPTHS = 'hemlock-vale-thing-in-the-depths'

export const DEPTHS = {
  reference: '10588',
  sinkingGround: '10589',
  thingInTheBog: '10590',
  aBotanicalSurvey: '10591',
  discoveryOfALifetime: '10592',
  muddyFen: '10593a',
  tangledThicket: '10594a',
  fetidPool: '10595a',
  floodedPath: '10596a',
  abandonedShack: '10597a',
  rottenDock: '10598a',
  coveredBridge: '10599a',
  thingInTheDepths: '10600',
  chelydranHybrid: '10601',
  graspingTendril: '10602',
  groundDisturbance: '10603',
  sinkingSludge: '10604',
  poisonblossom: '10732',
  forestWatcher: '10733',
  cochlealStag: '10734',
  bloom: '10735',
  wallOfThorns: '10736',
  callOfTheWild: '10737',
} as const

const entry = (key: string): StoryEntry => ({
  title: `story.hemlockVale.thingInTheDepths.${key}.title`,
  body: `story.hemlockVale.thingInTheDepths.${key}.body`,
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
const lead = (state: GameState): InvestigatorId => activeInvestigators(state)[0]?.id ?? ''
const dayOf = (state: GameState) => valleyTime(state.campaignLog)?.day ?? 1
const players = (state: GameState) => activeInvestigators(state).length

// ---------------------------------------------------------------------------
// Lugares (p. 28): cuadrícula de 3×3, lado Ciénaga boca arriba
// ---------------------------------------------------------------------------

/** Orilla norte arriba a la derecha, Lugar inicial abajo a la izquierda, centro en [2, 2]. */
export const NORTH_SHORE: [number, number] = [3, 1]
export const STARTING: [number, number] = [1, 3]
export const CRANBERRY_BOG: [number, number] = [3, 3]
export const CENTER: [number, number] = [2, 2]
const GRID: [number, number][] = [
  [1, 1],
  [2, 1],
  NORTH_SHORE,
  [1, 2],
  CENTER,
  [3, 2],
  STARTING,
  [2, 3],
  CRANBERRY_BOG,
]

const bog = (
  id: string,
  name: string,
  shroud: number,
  clueValue: number,
  perInvestigator = true,
  victory?: number,
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue,
  cluesPerInvestigator: perInvestigator,
  connections: [],
  ...(victory ? { victory } : {}),
})
/** Los 10 Lugares de doble cara (lado Ciénaga). */
const BOG_LOCATIONS: LocationCard[] = [
  bog(DEPTHS.muddyFen, 'Muddy Fen', 4, 2, true, 1),
  bog(`${DEPTHS.muddyFen}~2`, 'Muddy Fen', 4, 2, true, 1),
  bog(DEPTHS.tangledThicket, 'Tangled Thicket', 2, 1),
  bog(DEPTHS.fetidPool, 'Fetid Pool', 2, 1),
  bog(`${DEPTHS.fetidPool}~2`, 'Fetid Pool', 2, 1),
  bog(DEPTHS.floodedPath, 'Flooded Path', 1, 0, false),
  bog(`${DEPTHS.floodedPath}~2`, 'Flooded Path', 1, 0, false),
  bog(DEPTHS.abandonedShack, 'Abandoned Shack', 2, 2),
  bog(DEPTHS.rottenDock, 'Rotten Dock', 2, 1),
  bog(DEPTHS.coveredBridge, 'Covered Bridge', 4, 1, true, 1),
]

/** Lugar Hundido (lado Aguas abiertas). */
export const isSunken = (state: GameState, location: LocationId) =>
  !!meta(state, `sunk:${location}`)
const isBog = (state: GameState, location: LocationId) =>
  !!state.locations[location] && !isSunken(state, location)
export const sinkholes = (state: GameState, location: LocationId) => meta(state, `sink:${location}`)
const locationAt = (state: GameState, position: [number, number]) =>
  Object.values(state.locations).find(
    (l) => l.position?.[0] === position[0] && l.position[1] === position[1],
  )

/** Coloca socavones; con 3 o más, se quitan y el Lugar pasa a su lado Hundido. */
function addSinkholes(state: GameState, location: LocationId, amount: number): GameState {
  if (!isBog(state, location) || amount <= 0) return state
  const total = sinkholes(state, location) + amount
  const next = withMeta(state, { [`sink:${location}`]: total })
  return total >= 3 ? sink(next, location) : next
}

/** Da la vuelta a un Lugar al lado Aguas abiertas: conserva todo salvo los socavones. */
function sink(state: GameState, location: LocationId): GameState {
  const l = state.locations[location]
  if (!l || isSunken(state, location)) return state
  const code = printedCode(location)
  return {
    ...withMeta(state, { [`sink:${location}`]: 0, [`sunk:${location}`]: 1 }),
    locations: {
      ...state.locations,
      [location]: {
        ...l,
        name: 'Open Water',
        shroud: 5,
        shownCode: code.replace(/a$/, 'b'),
        // Victoria 1 en ambos lados de la Turbera fangosa y del Puente cubierto.
      },
    },
  }
}

/** Vuelve al lado Ciénaga (códice Θ). */
function unsink(state: GameState, location: LocationId): GameState {
  const l = state.locations[location]
  const card = BOG_LOCATIONS.find((c) => c.id === location)
  if (!l || !card || !isSunken(state, location)) return state
  const { shownCode: _shown, ...rest } = l
  return {
    ...withMeta(state, { [`sunk:${location}`]: 0 }),
    locations: {
      ...state.locations,
      [location]: { ...rest, name: card.name, shroud: card.shroud },
    },
  }
}

const atLocation = (state: GameState, investigator: InvestigatorId, location: LocationId) =>
  getInvestigator(state, investigator).location === location

/** Lugares Ciénaga más cercanos al investigador. */
function nearestBogs(state: GameState, investigator: InvestigatorId): LocationId[] {
  const from = getInvestigator(state, investigator).location
  if (from === null) return []
  let best = Infinity
  let found: LocationId[] = []
  for (const [l, d] of distancesFrom(state, from)) {
    if (!isBog(state, l)) continue
    if (d < best) [best, found] = [d, [l]]
    else if (d === best) found.push(l)
  }
  return found
}
const chooseLocation = (
  state: GameState,
  investigator: InvestigatorId,
  options: LocationId[],
  then: (l: LocationId) => Message[],
): Message[] =>
  options.length <= 1
    ? options[0]
      ? then(options[0])
      : []
    : [
        ask(
          investigator,
          'prompt.chooseLocation',
          options.map((l) => ({
            label: 'choice.location',
            params: { location: state.locations[l]!.name },
            target: { type: 'location', id: l },
            then: then(l),
          })),
        ),
      ]
const placeSinkhole = (location: LocationId, amount = 1): Message => ({
  type: 'ScenarioSpecific',
  key: 'sinkhole',
  data: { location, amount },
})

for (const card of BOG_LOCATIONS.filter((c) => !c.id.includes('~'))) {
  const code = card.id
  registerLocation({
    code,
    abilities: (state, self, investigator) => {
      if (!atLocation(state, investigator, self.id) || isSunken(state, self.id)) return []
      // Sendero anegado: [rápida] Durante tu turno, coloca 1 socavón aquí: Moverte.
      if (code === DEPTHS.floodedPath && state.activeTurn === investigator)
        return [
          {
            key: `${self.id}:move`,
            label: 'ability.hemlockVale.floodedPathMove',
            actions: 0,
            provokes: false,
            actionKind: 'move',
            target: { type: 'location', id: self.id },
            then: [placeSinkhole(self.id), { type: 'ChooseMove', investigator, mandatory: true }],
          },
        ]
      // Cabaña abandonada: [rápida] Gasta 1 pista: mueve 1 socavón a un Enemigo de aquí, como
      // daño (límite: una vez por ronda).
      const enemies = Object.values(state.enemies).filter((e) => e.location === self.id)
      if (
        code === DEPTHS.abandonedShack &&
        sinkholes(state, self.id) &&
        enemies.length &&
        getInvestigator(state, investigator).clues
      )
        return [
          {
            key: `${self.id}:sinkhole`,
            label: 'ability.hemlockVale.shackSinkhole',
            actions: 0,
            provokes: false,
            limit: { per: 'round' },
            costs: [{ type: 'SpendClues', investigator, amount: 1 }],
            target: { type: 'location', id: self.id },
            then: [
              setMeta(`sink:${self.id}`, sinkholes(state, self.id) - 1),
              ask(
                investigator,
                'prompt.chooseEnemy',
                enemies.map((e) => ({
                  label: 'choice.enemy',
                  params: { enemy: e.name },
                  target: { type: 'enemy', id: e.id },
                  then: [{ type: 'DamageEnemy', enemy: e.id, amount: 1, by: investigator }],
                })),
              ),
            ],
          },
        ]
      return []
    },
    forced: (state, trigger, self) => {
      // Aguas abiertas: después de moverte aquí, roba la carta superior del mazo de Encuentros.
      if (isSunken(state, self.id))
        return trigger.type === 'afterMove' &&
          getInvestigator(state, trigger.investigator).location === self.id
          ? [{ type: 'DrawEncounterCard', investigator: trigger.investigator }]
          : []
      // Muelle podrido: después de descubrir pistas aquí, [agility] (3); si fallas, 1 socavón.
      if (
        code === DEPTHS.rottenDock &&
        trigger.type === 'afterDiscoverClues' &&
        trigger.location === self.id
      )
        return [
          effectTest(trigger.investigator, 'Rotten Dock', 'agility', 3, {
            onFail: [placeSinkhole(self.id)],
          }),
        ]
      // Puente cubierto: tras revelar una ficha con símbolo al investigarlo, roba un Encuentro.
      if (
        code === DEPTHS.coveredBridge &&
        trigger.type === 'afterRevealChaosToken' &&
        state.skillTest?.kind?.type === 'investigate' &&
        state.skillTest.kind.location === self.id &&
        typeof trigger.token !== 'number'
      )
        return [{ type: 'DrawEncounterCard', investigator: trigger.investigator }]
      return []
    },
  })
}

// ---------------------------------------------------------------------------
// Enemigos y traiciones de La cosa de las profundidades
// ---------------------------------------------------------------------------

export const thingInTheDepths: EnemyCard = enemy({
  code: DEPTHS.thingInTheDepths,
  name: 'Thing in the Depths',
  traits: ['Abomination', 'Flora', 'Mutated', 'Elite'],
  fight: 4,
  health: 10,
  evade: 2,
  damage: 2,
  horror: 2,
  keywords: ['elusive', 'hunter', 'massive', 'retaliate'],
  noOpportunityAttacks: true,
  victory: 2,
})
export const chelydranHybrid: EnemyCard = enemy({
  code: DEPTHS.chelydranHybrid,
  name: 'Chelydran Hybrid',
  traits: ['Creature', 'Flora', 'Mutated', 'Elite'],
  fight: 2,
  health: 5,
  evade: 2,
  damage: 1,
  horror: 0,
  keywords: ['aloof', 'elusive'],
  victory: 0,
})
export const graspingTendril: EnemyCard = enemy({
  code: DEPTHS.graspingTendril,
  name: 'Grasping Tendril',
  traits: ['Abomination', 'Flora', 'Mutated'],
  fight: 2,
  health: 0,
  evade: 4,
  damage: 1,
  horror: 0,
  keywords: ['surge'],
})
const t = (code: string, name: string, traits: string[]): TreacheryCard =>
  treachery({ code, name, traits, keywords: [] })
const groundDisturbance = t(DEPTHS.groundDisturbance, 'Ground Disturbance', ['Hazard'])
const sinkingSludge = t(DEPTHS.sinkingSludge, 'Sinking Sludge', ['Hazard'])

registerEnemy({
  code: DEPTHS.thingInTheDepths,
  healthModifier: (state) => 5 * players(state),
  // Después de que ataque en un Lugar Ciénaga: se cura 2 daños.
  forced: (state, trigger, self) =>
    trigger.type === 'afterEnemyAttack' &&
    trigger.enemy === self.id &&
    isBog(state, self.location) &&
    self.damageTaken > 0
      ? [{ type: 'HealEnemy', enemy: self.id, amount: 2 }]
      : [],
})
registerEnemy({
  code: DEPTHS.chelydranHybrid,
  // Errante (Lugar vacío más cercano), o el que hayan elegido con el acto 2 esta ronda.
  patrol: (state, self) => {
    const forced = Object.keys(state.locations).find(
      (l) => meta(state, `patrol:${l}`) === state.round,
    )
    if (forced) return [forced]
    let best = Infinity
    let found: LocationId[] = []
    for (const [l, d] of distancesFrom(state, self.location)) {
      if (!state.locations[l] || l === self.location) continue
      if (activeInvestigators(state).some((i) => i.location === l)) continue
      if (d < best) [best, found] = [d, [l]]
      else if (d === best) found.push(l)
    }
    return found
  },
  // Obligado – Si este Enemigo es derrotado: (→R3).
  forced: (_state, trigger, self) =>
    trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id
      ? [{ type: 'ScenarioSpecific', key: 'resolution', data: { r: 3 } }]
      : [],
})
registerEnemy({
  code: DEPTHS.graspingTendril,
  // Salud X = día actual. Aparece en el Lugar del Híbrido chelydra.
  healthModifier: (state) => dayOf(state),
  spawn: (state) =>
    Object.values(state.enemies)
      .filter((e) => e.code === DEPTHS.chelydranHybrid)
      .map((e) => e.location),
})

// Perturbación del terreno: [intellect] o [agility] (4); por cada punto de fallo, 1 daño o
// 1 socavón en el Lugar Ciénaga más cercano.
registerTreachery({
  code: DEPTHS.groundDisturbance,
  revelation: (_state, investigator) => [
    chooseSkillTest(investigator, 'Ground Disturbance', ['intellect', 'agility'], 4, {
      onFailEach: [{ type: 'ScenarioSpecific', key: 'disturbance', data: { investigator } }],
    }),
  ],
})
// Lodo que te hunde: en un Lugar Hundido, 1 daño directo a ti y a cada Aliado tuyo; en un
// Lugar Ciénaga, 1 socavón en tu Lugar.
registerTreachery({
  code: DEPTHS.sinkingSludge,
  revelation: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (here === null) return []
    if (isSunken(state, here))
      return [
        { type: 'TakeDamage', investigator, damage: 1, horror: 0, direct: true },
        ...Object.values(state.assets)
          .filter(
            (a) => a.owner === investigator && !!playerCardDef(a.code)?.traits?.includes('Ally'),
          )
          .map((a): Message => ({ type: 'DamageAsset', asset: a.id, damage: 1, horror: 0 })),
      ]
    return [placeSinkhole(here)]
  },
})

// ---------------------------------------------------------------------------
// El bosque (conjunto compartido con La hondonada retorcida)
// ---------------------------------------------------------------------------

export const poisonblossom = enemy({
  code: DEPTHS.poisonblossom,
  name: 'Poisonblossom',
  traits: ['Creature', 'Flora', 'Mutated'],
  fight: 2,
  health: 3,
  evade: 1,
  damage: 0,
  horror: 1,
  keywords: ['retaliate'],
})
export const forestWatcher = enemy({
  code: DEPTHS.forestWatcher,
  name: 'Forest Watcher',
  traits: ['Creature', 'Flora', 'Mutated'],
  fight: 1,
  health: 2,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: ['aloof'],
})
export const cochlealStag = enemy({
  code: DEPTHS.cochlealStag,
  name: 'Cochleal Stag',
  traits: ['Creature', 'Monster', 'Flora', 'Mutated'],
  fight: 3,
  health: 5,
  evade: 4,
  damage: 2,
  horror: 1,
  keywords: ['elusive'],
})
export const forestDeck: EncounterCard[] = [
  ...copies(poisonblossom, 2),
  ...copies(forestWatcher, 2),
  cochlealStag,
  ...copies(t(DEPTHS.bloom, 'Bloom', ['Power']), 2),
  ...copies(t(DEPTHS.wallOfThorns, 'Wall of Thorns', ['Hazard', 'Flora']), 2),
  ...copies(t(DEPTHS.callOfTheWild, 'Call of the Wild', ['Terror']), 2),
]

const overgrowth = (state: GameState, e: Enemy) => meta(state, `overgrowth:${e.id}`)

// Flor venenosa: al final de la ronda, 1 de maleza. (Día) +1 salud y +1 daño por maleza;
// (Noche) +1 combate y +1 daño por maleza.
registerEnemy({
  code: DEPTHS.poisonblossom,
  healthModifier: (state, self) => (nightForEnemy(state, self) ? 0 : overgrowth(state, self)),
  forced: (state, trigger, self) =>
    trigger.type === 'roundEnds'
      ? [setMeta(`overgrowth:${self.id}`, overgrowth(state, self) + 1)]
      : [],
})
// Vigía del bosque: aparece en cualquier Lugar (vacío si es posible); al entrar en juego, 1
// perdición sobre ella.
registerEnemy({
  code: DEPTHS.forestWatcher,
  spawn: (state) => {
    const empty = Object.keys(state.locations).filter(
      (l) => !activeInvestigators(state).some((i) => i.location === l),
    )
    return empty.length ? empty : Object.keys(state.locations)
  },
  forced: (_state, trigger, self) =>
    trigger.type === 'enemySpawned' && trigger.enemy === self.id
      ? [{ type: 'PlaceDoomOnEnemy', enemy: self.id, amount: 1 }]
      : [],
})
registerEnemy({ code: DEPTHS.cochlealStag })

/** Enemigos más cercanos al investigador que cumplen `matches`. */
function nearestEnemies(
  state: GameState,
  investigator: InvestigatorId,
  matches: (e: Enemy) => boolean,
): Enemy[] {
  const from = getInvestigator(state, investigator).location
  if (from === null) return []
  const distances = distancesFrom(state, from)
  const found = Object.values(state.enemies).filter(
    (e) => matches(e) && e.location && distances.has(e.location),
  )
  const best = Math.min(...found.map((e) => distances.get(e.location)!))
  return found.filter((e) => distances.get(e.location) === best)
}
const chooseEnemy = (
  investigator: InvestigatorId,
  enemies: Enemy[],
  then: (e: Enemy) => Message[],
) =>
  ask(
    investigator,
    'prompt.chooseEnemy',
    enemies.map((e) => ({
      label: 'choice.enemy',
      params: { enemy: e.name },
      target: { type: 'enemy', id: e.id },
      then: then(e),
    })),
  )

// Florecimiento: el Enemigo Flora más cercano se cura todo (Élite: 2 por investigador); si no
// se cura nada, descarta hasta una carta Flora y róbala.
registerTreachery({
  code: DEPTHS.bloom,
  revelation: (state, investigator) => {
    const flora = nearestEnemies(state, investigator, (e) => !!e.traits?.includes('Flora'))
    const hurt = flora.filter((e) => e.damageTaken > 0)
    if (!hurt.length)
      return [{ type: 'ScenarioSpecific', key: 'bloomDraw', data: { investigator } }]
    return [
      chooseEnemy(investigator, hurt, (e) => [
        {
          type: 'HealEnemy',
          enemy: e.id,
          amount: e.traits?.includes('Elite') ? 2 * players(state) : e.damageTaken,
        },
      ]),
    ]
  },
})
// Muro de espinas: se vincula al Lugar más cercano sin otro. (Día) al entrar: 2 daños y se
// descarta. (Noche) al entrar o salir: 1 daño.
registerTreachery({
  code: DEPTHS.wallOfThorns,
  revelation: (state, investigator, self) => {
    const from = getInvestigator(state, investigator).location
    if (from === null) return []
    const taken = new Set(
      Object.values(state.treacheries)
        .filter((o) => o.code === DEPTHS.wallOfThorns && o.placement.type === 'location')
        .map((o) => (o.placement.type === 'location' ? o.placement.location : '')),
    )
    let best = Infinity
    let found: LocationId[] = []
    for (const [l, d] of distancesFrom(state, from)) {
      if (!state.locations[l] || taken.has(l)) continue
      if (d < best) [best, found] = [d, [l]]
      else if (d === best) found.push(l)
    }
    return chooseLocation(state, investigator, found, (l) => [
      { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'location', location: l } },
    ])
  },
  forced: (state, trigger, self) => {
    if (self.placement.type !== 'location' || trigger.type !== 'afterMove') return []
    const location = self.placement.location
    const entered = getInvestigator(state, trigger.investigator).location === location
    const left = trigger.from === location
    if (nightAt(state, location))
      return entered || left
        ? [{ type: 'TakeDamage', investigator: trigger.investigator, damage: 1, horror: 0 }]
        : []
    return entered
      ? [
          { type: 'TakeDamage', investigator: trigger.investigator, damage: 2, horror: 0 },
          { type: 'DiscardTreachery', treachery: self.id },
        ]
      : []
  },
})
// Llamada de lo salvaje: [agility] (3); si fallas, el Enemigo más cercano te ataca (sin
// Enemigos, 2 daños).
registerTreachery({
  code: DEPTHS.callOfTheWild,
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Call of the Wild', 'agility', 3, {
      onFail: [{ type: 'ScenarioSpecific', key: 'callOfTheWild', data: { investigator } }],
    }),
  ],
})

// ---------------------------------------------------------------------------
// Dra. Rosa Marquez bajo control: códice Θ tras descubrir la última pista de tu Lugar
// ---------------------------------------------------------------------------

registerPlayerCard({
  code: HEATH.drRosaMarquez,
  // Mientras la controles, +1 [intellect] y +1 [agility].
  skillModifier: (_state, self, test) =>
    test.investigator === self.owner && (test.skill === 'intellect' || test.skill === 'agility')
      ? 1
      : 0,
})

// ---------------------------------------------------------------------------
// Planes y actos
// ---------------------------------------------------------------------------

/** Obligado de los planes: al terminar tu turno en un Lugar Ciénaga, socavones. */
const turnEndSinkholes = (state: GameState, trigger: { type: string; investigator?: string }) => {
  if (trigger.type !== 'turnEnds' || !trigger.investigator) return []
  const here = getInvestigator(state, trigger.investigator).location
  return here !== null && isBog(state, here)
    ? [placeSinkhole(here, players(state) <= 2 ? 2 : 1)]
    : []
}

registerAgenda({
  code: DEPTHS.sinkingGround,
  // [acción]: Desistir. Huyes de la ciénaga.
  abilities: () => [],
  forced: (state, trigger) => turnEndSinkholes(state, trigger),
  // Reverso: el centro pasa a su lado Hundido y aparece la Cosa de las profundidades en él.
  onAdvance: () => [{ type: 'ScenarioSpecific', key: 'nearMiss' }],
})
registerAgenda({
  code: DEPTHS.thingInTheBog,
  forced: (state, trigger) =>
    // Objetivo: si la Cosa de las profundidades es derrotada (→R4).
    trigger.type === 'enemyDefeated' && trigger.enemy.code === DEPTHS.thingInTheDepths
      ? [{ type: 'ScenarioSpecific', key: 'resolution', data: { r: 4 } }]
      : turnEndSinkholes(state, trigger),
  // Reverso: cada investigador superviviente es derrotado y sufre 1 trauma físico.
  onAdvance: (state) =>
    activeInvestigators(state).flatMap((i): Message[] => [
      { type: 'SufferTrauma', physical: 1, investigator: i.id },
      { type: 'DefeatInvestigator', investigator: i.id },
    ]),
})

registerAct({
  code: DEPTHS.aBotanicalSurvey,
  // Reverso: el Híbrido chelydra en la Orilla norte, un Tentáculo adyacente y el resto, con el
  // descarte, al mazo de Encuentros.
  onAdvance: () => [{ type: 'ScenarioSpecific', key: 'wiseMound' }],
})

const chelydran = (state: GameState) =>
  Object.values(state.enemies).find((e) => e.code === DEPTHS.chelydranHybrid)

registerAct({
  code: DEPTHS.discoveryOfALifetime,
  // [rápida] Los investigadores de un Lugar adyacente al Híbrido chelydra gastan 1 pista por
  // investigador: esta ronda, su Errante lleva a ese Lugar.
  abilities: (state, _self, investigator) => {
    const hybrid = chelydran(state)
    const here = getInvestigator(state, investigator).location
    if (!hybrid || here === null || !state.locations[hybrid.location]?.connections.includes(here))
      return []
    const group = activeInvestigators(state).filter((i) => i.location === here)
    if (group.reduce((n, i) => n + i.clues, 0) < players(state)) return []
    return [
      {
        key: 'depths:lure',
        label: 'ability.hemlockVale.lureChelydran',
        actions: 0,
        provokes: false,
        then: [
          { type: 'PayGroupClues', amount: players(state), from: group.map((i) => i.id) },
          setMeta(`patrol:${here}`, state.round),
        ],
      },
    ]
  },
  forced: (state, trigger) => {
    const hybrid = chelydran(state)
    // Al final de la fase de Enemigos: 1 daño al Híbrido por cada Abominación preparada con él.
    if (trigger.type === 'enemyPhaseEnds' && hybrid) {
      const n = Object.values(state.enemies).filter(
        (e) => e.location === hybrid.location && !e.exhausted && e.traits?.includes('Abomination'),
      ).length
      return n ? [{ type: 'DamageEnemy', enemy: hybrid.id, amount: n }] : []
    }
    // Objetivo: al final de la ronda, con el Híbrido en el Lugar inicial, avanza.
    const start = locationAt(state, STARTING)?.id
    return trigger.type === 'roundEnds' && hybrid && hybrid.location === start
      ? [{ type: 'AdvanceAct' }]
      : []
  },
  // Reverso: el Día 1, (→R2); si no, (→R1).
  onAdvance: (state) => [
    { type: 'ScenarioSpecific', key: 'resolution', data: { r: dayOf(state) === 1 ? 2 : 1 } },
  ],
})

// ---------------------------------------------------------------------------
// Tarjeta de referencia
// ---------------------------------------------------------------------------

function tokenEffect(state: GameState, token: string, investigator: InvestigatorId): TokenEffect {
  const hard = isHard(state)
  const remove: Message[] = [
    { type: 'ScenarioSpecific', key: 'removeSinkhole', data: { investigator } },
  ]
  const place: Message[] = [
    { type: 'ScenarioSpecific', key: 'nearestSinkhole', data: { investigator } },
  ]
  const tendril: Message[] = [
    { type: 'ScenarioSpecific', key: 'drawTendril', data: { investigator } },
  ]
  switch (token) {
    case 'skull': {
      const n = Object.keys(state.locations).filter((l) => isSunken(state, l)).length
      return { modifier: -(hard ? n : Math.ceil(n / 2)) }
    }
    case 'cultist':
      return hard ? { modifier: -3, onSuccess: remove } : { modifier: -1, immediate: remove }
    case 'tablet':
      return hard ? { modifier: -5, immediate: place } : { modifier: -3, onFail: place }
    case 'elderThing':
      return hard ? { modifier: -5, immediate: tendril } : { modifier: -4, onFail: tendril }
  }
  return { modifier: 0 }
}

// ---------------------------------------------------------------------------
// Preparación (pp. 27–28)
// ---------------------------------------------------------------------------

export function depthsEncounters(day: 1 | 2 | 3): EncounterCard[] {
  return [
    ...copies(groundDisturbance, 3),
    ...copies(sinkingSludge, 4),
    ...blightDeck,
    ...forestDeck,
    ...mutationsDeck,
    ...daySetDeck(day),
  ]
}

/** Introducción según el día; el Día 2 se elige cómo sacar la camioneta del barro. */
function introMessages(context: ScenarioContext, day: 1 | 2 | 3, night: boolean): Message[] {
  const story = (key: string, choices?: Choice[]): Message => ({
    type: 'Story',
    entry: entry(key),
    ...(choices ? { choices } : {}),
  })
  if (night) return []
  if (day === 1) {
    const level = context.log.valley?.residents?.judithPark?.level ?? 0
    return level >= 1
      ? [
          story('intro2'),
          { type: 'ChangeRelationship', resident: 'judithPark' },
          { type: 'EarnExperience', amount: 1 },
        ]
      : [
          story('intro3'),
          { type: 'RecordResidentNote', resident: 'judithPark', note: 'judithSharedAGrudge' },
        ]
  }
  if (day === 2) return [{ type: 'ScenarioSpecific', key: 'truckChoice' }]
  return []
}

const truckChoices = (): Choice[] => [
  {
    label: 'choice.hemlockVale.pushTheTruck',
    then: [{ type: 'Story', entry: entry('intro5') }, setMeta('pushedTheTruck', 1)],
  },
  {
    label: 'choice.hemlockVale.revTheEngine',
    then: [{ type: 'Story', entry: entry('intro6') }, setMeta('revvedTheEngine', 1)],
  },
]

/** Habitantes de día (p. 28). */
function residentSetup(
  context: ScenarioContext,
  day: 1 | 2 | 3,
  northShore: LocationId,
): Message[] {
  const place = (resident: ValleyResident): Message[] =>
    residentAvailable(context.log, resident)
      ? [
          {
            type: 'PlaceAsset',
            code: RESIDENTS[resident].code,
            name: RESIDENTS[resident].name,
            placement: { type: 'location', location: northShore },
          },
        ]
      : []
  if (day === 1) return [...place('judithPark'), { type: 'ScenarioSpecific', key: 'giveMarquez' }]
  return place('riverHawthorne')
}

export function thingInTheDepthsScenario(
  context: ScenarioContext,
  encounterDeck?: EncounterCard[],
): ScenarioDefinition {
  const time = context.log.valley ?? { day: 1 as const, time: 'day' as const }
  const day = time.day
  const night = time.time === 'night'
  const [shuffled] = shuffle(BOG_LOCATIONS, seedRng(context.seed))
  // Se retira uno al azar; los 9 restantes forman la cuadrícula.
  const locations = shuffled.slice(1).map((l, i) => ({ ...l, position: GRID[i]! }))
  const byPosition = (p: [number, number]) =>
    locations.find((l) => l.position[0] === p[0] && l.position[1] === p[1])!.id
  const doom = day === 2 ? 1 : day === 3 && !night ? 2 : 0
  return {
    id: THING_IN_THE_DEPTHS,
    intro: entry(night ? 'intro8' : day === 1 ? 'intro1' : day === 2 ? 'intro4' : 'intro7'),
    setupInstructions: entry('setup'),
    grid: true,
    locations,
    startingLocation: byPosition(STARTING),
    agendas: [
      { code: DEPTHS.sinkingGround, name: 'Sinking Ground', doomThreshold: 3 },
      { code: DEPTHS.thingInTheBog, name: 'The Thing in the Bog', doomThreshold: 10 },
    ],
    acts: [
      {
        code: DEPTHS.aBotanicalSurvey,
        name: 'A Botanical Survey',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        advanceTiming: 'endOfRound',
        cluesAtLocation: byPosition(NORTH_SHORE),
      },
      {
        code: DEPTHS.discoveryOfALifetime,
        name: 'Discovery of a Lifetime',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: encounterDeck ?? depthsEncounters(day),
    setAside: [thingInTheDepths, chelydranHybrid, ...copies(graspingTendril, 5)],
    chaosBag: hemlockValeChaosBag(context),
    tokenValues: {},
    setup: [
      { type: 'SetValleyTime', day, time: time.time },
      ...(day === 2 && !night ? introMessages(context, day, night) : []),
      ...(day === 1 && !night ? introMessages(context, day, night) : []),
      { type: 'Story', entry: entry('sinkingLocations') },
      ...(doom ? [{ type: 'PlaceDoom', amount: doom } as Message] : []),
      ...(night ? [] : residentSetup(context, day, byPosition(NORTH_SHORE))),
    ],
  }
}

// ---------------------------------------------------------------------------
// Códice (p. 29) y resoluciones (p. 30)
// ---------------------------------------------------------------------------

const raise = (resident: ValleyResident): Message[] => [
  { type: 'ChangeRelationship', resident },
  { type: 'EarnExperience', amount: 1 },
]
const residentNote = (state: GameState, resident: ValleyResident, note: string) =>
  !!state.campaignLog?.valley?.residents?.[resident]?.notes?.includes(note)
const controlledAsset = (state: GameState, code: string) =>
  Object.values(state.assets).find((a) => a.code === code)
const placedAsset = (state: GameState, code: string) =>
  Object.values(state.placedAssets ?? {}).find((a) => a.code === code)

function depthsCodex(state: GameState, n: number, investigator: InvestigatorId): Message[] {
  const done = setMeta(`codex:${n}`, 1)
  if (n === RESIDENTS.riverHawthorne.codex) {
    const owned = controlledAsset(state, RESIDENTS.riverHawthorne.code)
    if (owned)
      return [
        done,
        ...read(state, 'codex5Controlled'),
        ...raise('riverHawthorne'),
        { type: 'RemoveAssetFromGame', asset: owned.id },
      ]
    const placed = placedAsset(state, RESIDENTS.riverHawthorne.code)
    // Sin controlar: te pide ayuda y la tomas; podrá volver a activarse en la Turbera de
    // arándanos (`registerCodexGate` no hace falta: el códice no queda resuelto).
    return [
      ...read(state, 'codex5Uncontrolled'),
      { type: 'RecordResidentNote', resident: 'riverHawthorne', note: 'riverAskedForHelp' },
      ...(placed
        ? [{ type: 'TakeControlOfPlaced', placed: placed.id, investigator } as Message]
        : []),
    ]
  }
  if (n === RESIDENTS.judithPark.codex) {
    const placed = placedAsset(state, RESIDENTS.judithPark.code)
    const grudge = residentNote(state, 'judithPark', 'judithSharedAGrudge')
    const targets = Object.values(state.enemies).filter((e) => !e.traits?.includes('Elite'))
    return [
      done,
      ...read(state, grudge ? 'codex7Grudge' : 'codex7'),
      ...(grudge && targets.length
        ? [
            chooseEnemy(investigator, targets, (e) => [
              { type: 'DefeatEnemy', enemy: e.id, by: investigator },
            ]),
          ]
        : []),
      ...(placed
        ? [{ type: 'TakeControlOfPlaced', placed: placed.id, investigator } as Message]
        : []),
    ]
  }
  return []
}

/** Resolución `r` (1–4) seguida de la R5; 0 = sin resolución. */
export function resolutionMessages(state: GameState, r: number): Message[] {
  const time = valleyTime(state.campaignLog)
  const next = time ? NEXT_PRELUDE[time.time + ':' + time.day] : undefined
  const note = (n: string): Message => ({ type: 'RecordNote', note: n })
  const xp = (amount: number): Message => ({ type: 'EarnExperience', amount })
  const thingDefeated = state.victoryDisplay.includes(DEPTHS.thingInTheDepths)
  const grudge = residentNote(state, 'judithPark', 'judithSharedAGrudge')
  const first: Message[] =
    r === 1
      ? [...read(state, 'resolution1'), note('hemlockValeChelydranHybridPerished'), xp(1)]
      : r === 2
        ? [...read(state, 'resolution2'), note('hemlockValeChelydranHybridLived'), xp(3)]
        : r === 3
          ? [
              ...read(state, 'resolution3'),
              note('hemlockValeChelydranHybridWasDevoured'),
              ...activeInvestigators(state).map((i): Message => ({
                type: 'SufferTrauma',
                mental: 1,
                investigator: i.id,
              })),
              xp(1),
            ]
          : r === 4
            ? [...read(state, 'resolution4'), note('hemlockValeThingInTheDepthsWasDefeated')]
            : [...read(state, 'noResolution'), xp(1)]
  return [
    ...first,
    ...read(state, 'resolution5'),
    // River «pidió» ayuda y un investigador la controla al terminar: baja su relación.
    ...(residentNote(state, 'riverHawthorne', 'riverAskedForHelp') &&
    controlledAsset(state, RESIDENTS.riverHawthorne.code)
      ? [{ type: 'ChangeRelationship', resident: 'riverHawthorne', amount: -1 } as Message]
      : []),
    ...(grudge && thingDefeated ? raise('judithPark') : []),
    { type: 'EarnExperience', amount: 0, victory: true },
    { type: 'SurveyArea', area: 'eastwickBog' },
    ...(next ? [{ type: 'ChooseValleyRoute', scenario: next } as Message] : []),
    {
      type: 'EndScenario',
      outcome: r ? { type: 'resolution', resolution: r } : { type: 'noResolution' },
      told: true,
    },
  ]
}

// Códice 5: si ya controlas a River, solo se repite en la Ciénaga de los arándanos.
registerCodexGate(THING_IN_THE_DEPTHS, (state, n, investigator) => {
  if (n !== RESIDENTS.riverHawthorne.codex) return true
  if (!controlledAsset(state, RESIDENTS.riverHawthorne.code)) return true
  const here = getInvestigator(state, investigator).location
  return here !== null && here === locationAt(state, CRANBERRY_BOG)?.id
})

const sunkenLocations = (state: GameState) =>
  Object.keys(state.locations).filter((l) => isSunken(state, l))

registerScenario({
  id: THING_IN_THE_DEPTHS,
  // Estanque fétido: +1 velo por socavón.
  shroudModifier: (state, location) =>
    printedCode(location.id) === DEPTHS.fetidPool && isBog(state, location.id)
      ? sinkholes(state, location.id)
      : 0,
  // Flor venenosa: +1 daño por maleza; de noche, también +1 combate.
  enemyStat: (state, e, stat) =>
    e.code === DEPTHS.poisonblossom && stat === 'fight' && nightForEnemy(state, e)
      ? overgrowth(state, e)
      : 0,
  enemyDamageModifier: (state, e) => (e.code === DEPTHS.poisonblossom ? overgrowth(state, e) : 0),
  enemyKeyword: (state, e, keyword) => {
    const night = nightForEnemy(state, e)
    if (e.code === DEPTHS.graspingTendril && keyword === 'aloof') return night
    if (e.code === DEPTHS.forestWatcher && keyword === 'elusive') return night
    if (e.code === DEPTHS.cochlealStag && keyword === 'hunter') return night
    return valeEnemyKeyword(state, e, keyword)
  },
  // La Cosa, al moverse, está conectada a cada Lugar Hundido.
  enemyConnections: (state, location, mover) =>
    mover?.code === DEPTHS.thingInTheDepths
      ? sunkenLocations(state).filter((l) => l !== location)
      : [],
  // Híbrido chelydra: no se mueve con una Abominación preparada en su Lugar o enfrentado.
  cannotMoveEnemy: (state, e) =>
    e.code === DEPTHS.chelydranHybrid &&
    (e.engagedWith !== null ||
      Object.values(state.enemies).some(
        (o) => o.location === e.location && !o.exhausted && !!o.traits?.includes('Abomination'),
      )),
  // Matorral enmarañado: salir cuesta una acción adicional.
  leaveCost: (state, location) =>
    printedCode(location) === DEPTHS.tangledThicket && isBog(state, location) ? 1 : 0,
  // Ciervo coclear: −2 a las habilidades de los investigadores de su Lugar y de los conectados
  // durante la fase de Mitos.
  skillModifier: (state, test) => {
    if (state.phase !== 'mythos') return 0
    const here = getInvestigator(state, test.investigator).location
    return Object.values(state.enemies).some(
      (e) =>
        e.code === DEPTHS.cochlealStag &&
        (e.location === here || !!state.locations[e.location]?.connections.includes(here ?? '')),
    )
      ? -2
      : 0
  },
  abilities: (state, _self, investigator) =>
    // Plan 1: [acción] Desistir. Huyes de la ciénaga.
    state.agendas[state.agendaIndex]?.code === DEPTHS.sinkingGround
      ? [
          {
            key: 'depths:resign',
            label: 'ability.hemlockVale.fleeTheBog',
            actions: 1,
            provokes: false,
            then: [{ type: 'Resign', investigator }],
          },
        ]
      : [],
  tokenEffect,
  forced: (state, trigger) => {
    // Introducción 5 o 6: −2 recursos al empezar o 1 acción menos en el primer turno.
    if (trigger.type === 'gameBegins' && meta(state, 'pushedTheTruck'))
      return activeInvestigators(state).map((i): Message => ({
        type: 'LoseResources',
        investigator: i.id,
        amount: 2,
      }))
    if (
      trigger.type === 'turnBegins' &&
      meta(state, 'revvedTheEngine') &&
      state.round === 1 &&
      !meta(state, `revved:${trigger.investigator}`)
    )
      return [
        setMeta(`revved:${trigger.investigator}`, 1),
        { type: 'LoseActions', investigator: trigger.investigator, amount: 1 },
      ]
    return []
  },
  reactions: (state, trigger) => {
    // Dra. Marquez: tras descubrir la última pista de tu Lugar, códice Θ.
    if (trigger.type !== 'afterDiscoverClues' || !trigger.last || meta(state, 'codex:theta'))
      return []
    const marquez = controlledAsset(state, HEATH.drRosaMarquez)
    if (!marquez || marquez.owner !== trigger.investigator) return []
    return [
      {
        key: 'depths:theta',
        investigator: trigger.investigator,
        label: 'ability.hemlockVale.codexTheta',
        then: [
          {
            type: 'ScenarioSpecific',
            key: 'codexTheta',
            data: { investigator: trigger.investigator },
          },
        ],
      },
    ]
  },
  onAllInvestigatorsEliminated: (state) => resolutionMessages(state, 0),
  specific: (state, key, data) => {
    if (key === 'resolution') return push(state, ...resolutionMessages(state, Number(data.r ?? 0)))
    if (key === 'codex')
      return push(state, ...depthsCodex(state, Number(data.n), String(data.investigator)))
    return valeSpecific(state, key, data) ?? depthsSpecific(state, key, data)
  },
})

// ---------------------------------------------------------------------------
// Mensajes propios del escenario
// ---------------------------------------------------------------------------

export function depthsSpecific(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState {
  const investigator = String(data.investigator ?? '')
  switch (key) {
    case 'truckChoice':
      return push(state, ask(lead(state), 'prompt.hemlockVale.stuckTruck', truckChoices()))
    case 'sinkhole':
      return addSinkholes(state, String(data.location), Number(data.amount ?? 1))
    case 'sink':
      return sink(state, String(data.location))
    case 'nearestSinkhole':
      return push(
        state,
        ...chooseLocation(state, investigator, nearestBogs(state, investigator), (l) => [
          placeSinkhole(l),
        ]),
      )
    case 'removeSinkhole': {
      const options = nearestBogs(state, investigator).filter((l) => sinkholes(state, l) > 0)
      if (!options.length) return state
      return push(
        state,
        ask(investigator, 'prompt.hemlockVale.removeSinkhole', [
          ...options.map((l) => ({
            label: 'choice.location',
            params: { location: state.locations[l]!.name },
            target: { type: 'location' as const, id: l },
            then: [setMeta(`sink:${l}`, sinkholes(state, l) - 1)],
          })),
          { label: 'choice.skip', then: [] },
        ]),
      )
    }
    case 'disturbance': {
      const bogs = nearestBogs(state, investigator)
      return push(
        state,
        ask(investigator, 'prompt.chooseEffect', [
          {
            label: 'choice.hemlockVale.takeDamage',
            params: { n: 1 },
            then: [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 }],
          },
          ...(bogs.length
            ? [
                {
                  label: 'choice.hemlockVale.placeSinkhole',
                  then: chooseLocation(state, investigator, bogs, (l) => [placeSinkhole(l)]),
                },
              ]
            : []),
        ]),
      )
    }
    case 'drawTendril': {
      // Busca un Tentáculo aferrador en el mazo y el descarte y róbalo, sin su Oleada.
      const inDeck = state.encounterDeck.findIndex((c) => c.code === DEPTHS.graspingTendril)
      const inDiscard = state.encounterDiscard.findIndex((c) => c.code === DEPTHS.graspingTendril)
      if (inDeck < 0 && inDiscard < 0) return state
      const [deck, rng] = shuffle(
        inDeck >= 0 ? state.encounterDeck.filter((_, n) => n !== inDeck) : state.encounterDeck,
        state.rng,
      )
      return push(
        {
          ...state,
          rng,
          encounterDeck: deck,
          encounterDiscard:
            inDeck >= 0
              ? state.encounterDiscard
              : state.encounterDiscard.filter((_, n) => n !== inDiscard),
        },
        {
          type: 'ResolveEncounterCard',
          investigator,
          card: { ...graspingTendril, keywords: [] },
        },
      )
    }
    case 'nearMiss': {
      // Reverso del plan 1: el centro pasa a Aguas abiertas y aparece la Cosa en él.
      const center = locationAt(state, CENTER)
      if (!center) return state
      const sunk = sink(withMeta(state, { [`sink:${center.id}`]: 0 }), center.id)
      return push(
        { ...sunk, setAside: sunk.setAside.filter((c) => c.code !== DEPTHS.thingInTheDepths) },
        { type: 'SpawnEnemy', card: thingInTheDepths, location: center.id, engageWith: null },
      )
    }
    case 'wiseMound': {
      const shore = locationAt(state, NORTH_SHORE)
      if (!shore) return state
      const tendrils = state.setAside.filter((c) => c.code === DEPTHS.graspingTendril)
      const rest = state.setAside.filter(
        (c) => c.code !== DEPTHS.graspingTendril && c.code !== DEPTHS.chelydranHybrid,
      )
      const [deck, rng] = shuffle(
        [...state.encounterDeck, ...tendrils.slice(1), ...state.encounterDiscard],
        state.rng,
      )
      const next: GameState = {
        ...state,
        rng,
        setAside: rest,
        encounterDeck: deck,
        encounterDiscard: [],
      }
      return push(
        next,
        { type: 'SpawnEnemy', card: chelydranHybrid, location: shore.id, engageWith: null },
        ...(tendrils.length
          ? chooseLocation(next, lead(next), shore.connections, (l) => [
              { type: 'SpawnEnemy', card: graspingTendril, location: l, engageWith: null },
            ])
          : []),
      )
    }
    case 'giveMarquez': {
      const list = activeInvestigators(state)
      const put = (who: InvestigatorId): Message => ({
        type: 'PutAssetIntoPlay',
        investigator: who,
        code: HEATH.drRosaMarquez,
        noSlot: true,
      })
      return push(
        state,
        ...(list.length <= 1
          ? list[0]
            ? [put(list[0].id)]
            : []
          : [
              ask(
                lead(state),
                'prompt.hemlockVale.takeControl',
                list.map((i) => ({
                  label: 'choice.investigator',
                  params: { name: i.name },
                  then: [put(i.id)],
                })),
              ),
            ]),
      )
    }
    case 'codexTheta': {
      // Elige un Lugar: si es Ciénaga, quita sus socavones; si está Hundido, dale la vuelta.
      const options = Object.keys(state.locations)
      return push(
        withMeta(state, { 'codex:theta': 1 }),
        ...read(state, 'codexTheta'),
        ...chooseLocation(state, investigator, options, (l) => [
          { type: 'ScenarioSpecific', key: 'thetaLocation', data: { location: l } },
        ]),
      )
    }
    case 'thetaLocation': {
      const l = String(data.location)
      return isSunken(state, l) ? unsink(state, l) : withMeta(state, { [`sink:${l}`]: 0 })
    }
    case 'bloomDraw': {
      const index = state.encounterDeck.findIndex((c) => !!c.traits?.includes('Flora'))
      const discarded = state.encounterDeck.slice(0, index < 0 ? undefined : index)
      const card = index < 0 ? undefined : state.encounterDeck[index]
      return push(
        {
          ...state,
          encounterDeck: index < 0 ? [] : state.encounterDeck.slice(index + 1),
          encounterDiscard: [...state.encounterDiscard, ...discarded],
        },
        ...(card ? [{ type: 'ResolveEncounterCard', investigator, card } as Message] : []),
      )
    }
    case 'callOfTheWild': {
      const enemies = nearestEnemies(state, investigator, () => true)
      if (!enemies.length)
        return push(state, { type: 'TakeDamage', investigator, damage: 2, horror: 0 })
      return push(
        state,
        chooseEnemy(investigator, enemies, (e) => [
          {
            type: 'EnemyAttack',
            enemy: e.id,
            investigator,
            exhaustAfter: false,
            evenIfExhausted: true,
          },
        ]),
      )
    }
  }
  return state
}
