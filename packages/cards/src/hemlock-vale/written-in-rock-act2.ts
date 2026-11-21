/**
 * Escrito en la roca, interludio «El derrumbe» y acto 2 (guía, pp. 10–13): la red
 * ferroviaria, la Vagoneta, deslizar e intercambiar Lugares y las resoluciones.
 *
 * Posiciones: la guía numera filas de abajo arriba; aquí la fila 1 de la guía es la 5.
 */
import {
  activeInvestigators,
  emptyAdjacentPositions,
  getInvestigator,
  gridNeighbors,
  leadInvestigator,
  playerCardDef,
  printedCode,
  push,
  registerEnemy,
  registerLocation,
  registerPlayerCards,
  registerTreachery,
  seedRng,
  shuffle,
  valleyTime,
  type AbilityOption,
  type Choice,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type Location,
  type LocationCard,
  type LocationId,
  type Message,
  type StoryEntry,
} from '@lcg/engine'
import { copies, effectTest, enemy, treachery } from '../scenario-helpers'
import { RESIDENTS } from './welcome'

export type Direction = 'N' | 'E' | 'S' | 'W'
const STEP: Record<Direction, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
const OPPOSITE: Record<Direction, Direction> = { N: 'S', E: 'W', S: 'N', W: 'E' }
const TURNS: Record<Direction, Direction[]> = {
  N: ['N', 'E', 'W'],
  E: ['E', 'N', 'S'],
  S: ['S', 'E', 'W'],
  W: ['W', 'N', 'S'],
}

export const RAIL = {
  mineCart: '10507',
  controlStation: '10508',
  railExit: '10509',
  leftTurnA: '10510a',
  leftTurnB: '10510b',
  rightTurnA: '10511a',
  rightTurnB: '10511b',
  alkalineRailA: '10512a',
  alkalineRailB: '10512b',
  warpedRailA: '10513a',
  warpedRailB: '10513b',
  sunkenRailA: '10514a',
  sunkenRailB: '10514b',
  forkedRail: '10515',
  railBridge: '10516',
  subterraneanBeast: '10517',
  burrowingHybrid: '10518',
  frenziedMiner: '10519',
  caveIn: '10520',
  wildRide: '10521',
  prismaticShard: '10522',
} as const

/** Iconos de raíl de cada Lugar Ferrocarril (los mismos en las dos caras). */
export const RAILS: Record<string, Direction[]> = {
  [RAIL.controlStation]: ['N', 'E'],
  [RAIL.railExit]: ['S'],
  [RAIL.leftTurnA]: ['N', 'W'],
  [RAIL.leftTurnB]: ['N', 'W'],
  [RAIL.rightTurnA]: ['E', 'S'],
  [RAIL.rightTurnB]: ['E', 'S'],
  [RAIL.alkalineRailA]: ['E', 'W'],
  [RAIL.alkalineRailB]: ['N', 'S'],
  [RAIL.warpedRailA]: ['E', 'W'],
  [RAIL.warpedRailB]: ['N', 'E', 'S'],
  [RAIL.sunkenRailA]: ['E', 'S', 'W'],
  [RAIL.sunkenRailB]: ['N', 'E', 'S'],
  [RAIL.forkedRail]: ['N', 'E', 'S', 'W'],
  [RAIL.railBridge]: ['N', 'S'],
}
export const railsOf = (id: string) => RAILS[printedCode(id)] ?? []

const rail = (
  id: string,
  name: string,
  shroud: number,
  clueValue: number,
  victory?: number,
): LocationCard => ({
  id,
  name,
  unrevealedName: 'Rail Tunnel',
  shroud,
  clueValue,
  cluesPerInvestigator: true,
  connections: [],
  ...(victory ? { victory } : {}),
})

export const RAIL_LOCATIONS: Record<string, LocationCard> = {
  [RAIL.railExit]: { ...rail(RAIL.railExit, 'Rail Exit', 1, 0, 1), cluesPerInvestigator: false },
  [RAIL.leftTurnA]: rail(RAIL.leftTurnA, 'Left Turn', 2, 1),
  [RAIL.leftTurnB]: rail(RAIL.leftTurnB, 'Left Turn', 2, 1),
  [RAIL.rightTurnA]: rail(RAIL.rightTurnA, 'Right Turn', 2, 1),
  [RAIL.rightTurnB]: rail(RAIL.rightTurnB, 'Right Turn', 2, 1),
  [RAIL.alkalineRailA]: rail(RAIL.alkalineRailA, 'Alkaline Rail', 3, 3),
  [RAIL.alkalineRailB]: rail(RAIL.alkalineRailB, 'Alkaline Rail', 3, 3),
  [RAIL.warpedRailA]: rail(RAIL.warpedRailA, 'Warped Rail', 2, 2, 1),
  [RAIL.warpedRailB]: rail(RAIL.warpedRailB, 'Warped Rail', 2, 2, 1),
  [RAIL.sunkenRailA]: rail(RAIL.sunkenRailA, 'Sunken Rail', 4, 2),
  [RAIL.sunkenRailB]: rail(RAIL.sunkenRailB, 'Sunken Rail', 4, 2),
  [RAIL.forkedRail]: rail(RAIL.forkedRail, 'Forked Rail', 3, 2),
  [`${RAIL.forkedRail}~2`]: rail(`${RAIL.forkedRail}~2`, 'Forked Rail', 3, 2),
  [`${RAIL.forkedRail}~3`]: rail(`${RAIL.forkedRail}~3`, 'Forked Rail', 3, 2),
  [RAIL.railBridge]: rail(RAIL.railBridge, 'Rail Bridge', 0, 2),
}

/** Posición de la guía (columna, fila desde abajo) en la mesa. */
const pos = (c: number, r: number): [number, number] => [c, 6 - r]

// ---------------------------------------------------------------------------
// Cartas de encuentro de Escrito en la roca (apartadas hasta el interludio)
// ---------------------------------------------------------------------------

export const subterraneanBeast = (players: number): EnemyCard =>
  enemy({
    code: RAIL.subterraneanBeast,
    name: 'Subterranean Beast',
    traits: ['Abomination', 'Mutated', 'Elite'],
    fight: 4,
    health: 4 + 3 * players,
    evade: 3,
    damage: 1,
    horror: 1,
    keywords: ['hunter', 'massive'],
    victory: 2,
  })

const burrowingHybrid = enemy({
  code: RAIL.burrowingHybrid,
  name: 'Burrowing Hybrid',
  traits: ['Creature', 'Mutated'],
  fight: 3,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
})

const frenziedMiner = enemy({
  code: RAIL.frenziedMiner,
  name: 'Frenzied Miner',
  traits: ['Humanoid'],
  fight: 0,
  health: 4,
  evade: 0,
  damage: 1,
  horror: 0,
  keywords: ['hunter'],
})

/** Lo que se baraja en el mazo de Encuentros durante el interludio. */
export const rockActTwoDeck = [
  ...copies(burrowingHybrid, 3),
  ...copies(frenziedMiner, 3),
  ...copies(treachery({ code: RAIL.caveIn, name: 'Cave-In', traits: ['Hazard'], keywords: [] }), 2),
  ...copies(
    treachery({ code: RAIL.wildRide, name: 'Wild Ride', traits: ['Hazard'], keywords: [] }),
    3,
  ),
]

registerPlayerCards([
  {
    code: RAIL.mineCart,
    name: 'Mine Cart',
    story: true,
    unique: true,
    type: 'asset',
    class: 'neutral',
    traits: ['Vehicle', 'Cart'],
  },
  {
    code: RAIL.prismaticShard,
    name: 'Prismatic Shard',
    story: true,
    unique: true,
    type: 'asset',
    class: 'neutral',
    traits: ['Item', 'Relic', 'Colour'],
    uses: { count: 4, type: 'brilliance' },
  },
])

// ---------------------------------------------------------------------------
// La Vagoneta
// ---------------------------------------------------------------------------

const meta = (state: GameState, key: string) => state.scenarioMeta?.[key]
const setMeta = (key: string, value: string | number): Message => ({
  type: 'SetScenarioMeta',
  key,
  value,
})
export const switches = (state: GameState) => Number(meta(state, 'switch') ?? 0)
export const cartLocation = (state: GameState) => meta(state, 'cartLocation') as string | undefined
export const cartFacing = (state: GameState) => meta(state, 'cartFacing') as Direction | undefined

const at = (state: GameState, position: [number, number]): Location | undefined =>
  Object.values(state.locations).find(
    (l) => l.position?.[0] === position[0] && l.position?.[1] === position[1],
  )

/** Lugar al que mira la Vagoneta, si hay uno en esa casilla. */
export function facedLocation(state: GameState): Location | undefined {
  const here = cartLocation(state)
  const facing = cartFacing(state)
  const position = here ? state.locations[here]?.position : undefined
  if (!position || !facing) return undefined
  const [dc, dr] = STEP[facing]
  return at(state, [position[0] + dc, position[1] + dr])
}

const story = (key: string): StoryEntry => ({
  title: `story.hemlockVale.writtenInRock.${key}.title`,
  body: `story.hemlockVale.writtenInRock.${key}.body`,
})

const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})

const lead = (state: GameState) => leadInvestigator(state)?.id ?? state.investigators[0]!.id

const beastBlocks = (state: GameState) =>
  Object.values(state.enemies).some(
    (e) => e.code === RAIL.subterraneanBeast && !e.exhausted && e.location === cartLocation(state),
  )

/**
 * «Mueve la Vagoneta una vez»: antes, el jefe puede gastar 1 aguja para cancelar o mover
 * una vez más (límite de grupo: dos veces por fase).
 */
export function moveCart(state: GameState, times = 1): Message[] {
  if (!cartLocation(state) || beastBlocks(state)) return []
  const usedKey = `switchUses:${state.round}:${state.phase}`
  const used = Number(meta(state, usedKey) ?? 0)
  const step: Message = { type: 'ScenarioSpecific', key: 'cartStep', data: { times } }
  // Viaje salvaje: al moverse la Vagoneta, se resuelve antes del movimiento.
  const ride = wildRides(state)
  if (!switches(state) || used >= 2) return [...ride, step]
  const spend = [setMeta('switch', switches(state) - 1), setMeta(usedKey, used + 1)]
  return [
    ...ride,
    ask(lead(state), 'prompt.hemlockVale.cartMoves', [
      { label: 'choice.hemlockVale.cartLetMove', then: [step] },
      { label: 'choice.hemlockVale.cartCancel', then: spend },
      {
        label: 'choice.hemlockVale.cartExtra',
        then: [...spend, { type: 'ScenarioSpecific', key: 'cartStep', data: { times: times + 1 } }],
      },
    ]),
  ]
}

/** Un paso de la Vagoneta en la dirección en la que mira. */
export function cartStep(state: GameState, times: number): GameState {
  if (times <= 0 || !cartLocation(state) || beastBlocks(state)) return state
  const facing = cartFacing(state)!
  const target = facedLocation(state)
  const players = activeInvestigators(state)
  // Derrumbe unido al Lugar de destino: se cancela y 2 daños a cada uno en la Vagoneta.
  const caveIn = target
    ? Object.values(state.treacheries).find(
        (t) =>
          t.code === RAIL.caveIn &&
          t.placement.type === 'location' &&
          t.placement.location === target.id,
      )
    : undefined
  if (caveIn)
    return push(
      state,
      ...players.map((i): Message => ({
        type: 'TakeDamage',
        investigator: i.id,
        damage: 2,
        horror: 0,
      })),
      ...residentsInCart(state).map((asset): Message => ({
        type: 'DamageAsset',
        asset,
        damage: 2,
        horror: 0,
      })),
    )
  // Descarrila si no hay Lugar o sus raíles no están alineados.
  if (!target || !railsOf(target.id).includes(OPPOSITE[facing])) {
    return push(
      state,
      ...(state.interactive ? [{ type: 'Story', entry: story('derailed') } as Message] : []),
      ...players.flatMap((i): Message[] => [
        { type: 'SufferTrauma', physical: 1, investigator: i.id },
        { type: 'DefeatInvestigator', investigator: i.id },
      ]),
    )
  }
  const cart = Object.values(state.placedAssets ?? {}).find((a) => a.code === RAIL.mineCart)
  const options = TURNS[facing].filter((d) => railsOf(target.id).includes(d))
  const next = {
    ...state,
    scenarioMeta: {
      ...state.scenarioMeta,
      cartLocation: target.id,
      ...(options.length === 1 ? { cartFacing: options[0]! } : {}),
    },
  }
  return push(
    next,
    ...(cart
      ? [
          {
            type: 'MovePlacedAsset',
            placed: cart.id,
            placement: { type: 'location', location: target.id },
          } as Message,
        ]
      : []),
    ...players.map((i): Message => ({ type: 'MoveTo', investigator: i.id, location: target.id })),
    ...(options.length > 1
      ? [
          ask(
            lead(state),
            'prompt.hemlockVale.cartFacing',
            options.map((d) => ({
              label: `choice.hemlockVale.face${d}`,
              then: [setMeta('cartFacing', d)],
            })),
          ),
        ]
      : []),
    { type: 'ScenarioSpecific', key: 'cartEntered', data: { location: target.id } },
    ...(times > 1
      ? [{ type: 'ScenarioSpecific', key: 'cartStep', data: { times: times - 1 } } as Message]
      : []),
  )
}

/** Habitantes controlados por investigadores: van en la Vagoneta con ellos. */
function residentsInCart(state: GameState): string[] {
  const codes = new Set(Object.values(RESIDENTS).map((r) => r.code))
  return Object.values(state.assets)
    .filter((a) => codes.has(a.code))
    .map((a) => a.id)
}

/** Después de que la Vagoneta entre en un Lugar. */
export function cartEntered(state: GameState, location: LocationId): Message[] {
  const code = printedCode(location)
  if (code === RAIL.railExit) return [{ type: 'AdvanceAct' }]
  // Curva deformada: la Vagoneta se mueve otra vez.
  if (code === RAIL.warpedRailA || code === RAIL.warpedRailB) return moveCart(state)
  return []
}

// ---------------------------------------------------------------------------
// Interludio «El derrumbe»
// ---------------------------------------------------------------------------

/** Coloca la red ferroviaria del acto 2 (p. 11) y la Vagoneta en el Puesto de control. */
export function caveIn(state: GameState, seed: number): GameState {
  let rng = seedRng(seed)
  const pick = (a: string, b: string): string => {
    let order: string[]
    ;[order, rng] = shuffle([a, b], rng)
    return order[0]!
  }
  const fixed: [string, [number, number]][] = [
    [RAIL.railExit, pos(5, 5)],
    [RAIL.sunkenRailA, pos(2, 4)],
    [RAIL.forkedRail, pos(2, 2)],
    [`${RAIL.forkedRail}~2`, pos(3, 3)],
    [pick(RAIL.alkalineRailA, RAIL.warpedRailA), pos(4, 2)],
    [pick(RAIL.rightTurnA, RAIL.rightTurnB), pos(4, 4)],
    [pick(RAIL.leftTurnA, RAIL.leftTurnB), pos(5, 1)],
    [pick(RAIL.railBridge, RAIL.alkalineRailB), pos(5, 3)],
  ]
  const used = new Set(fixed.map(([id]) => id))
  let rest = Object.keys(RAIL_LOCATIONS).filter((id) => !used.has(id) && !(id === RAIL.railExit))
  ;[rest, rng] = shuffle(rest, rng)
  const random: [number, number][] = [
    pos(1, 2),
    pos(1, 3),
    pos(1, 4),
    pos(2, 1),
    pos(3, 4),
    pos(4, 1),
    pos(5, 2),
  ]
  const placements = [...fixed, ...random.map((p, i): [string, [number, number]] => [rest[i]!, p])]
  const locations = { ...state.locations }
  // El Puesto de control pasa a la esquina inferior izquierda.
  const station = locations[RAIL.controlStation]
  if (station) locations[RAIL.controlStation] = { ...station, position: pos(1, 1) }
  for (const [id, position] of placements) {
    const card = RAIL_LOCATIONS[id]!
    locations[id] = {
      ...card,
      connections: [],
      revealed: id === RAIL.railExit,
      clues: 0,
      position,
    }
  }
  return { ...state, locations }
}

/** Mensajes del interludio una vez colocados los Lugares. */
export function caveInSetup(state: GameState): Message[] {
  const night = valleyTime(state.campaignLog)?.time === 'night'
  const shardAt = Object.values(state.locations).find(
    (l) => l.position?.[0] === 5 && l.position?.[1] === 5,
  )
  const sunken = RAIL.sunkenRailA
  const setAside = (['simeonAtwood', 'leahAtwood'] as const).filter(
    (r) => !!state.scenarioMeta?.[`setAside:${r}`],
  )
  return [
    ...(state.interactive
      ? (['caveIn1', 'caveIn2or3', 'caveIn4', 'slideSwap', 'mineCart'] as const).map(
          (key): Message => ({
            type: 'Story',
            entry: story(key === 'caveIn2or3' ? (night ? 'caveIn3' : 'caveIn2') : key),
          }),
        )
      : []),
    ...setAside.flatMap((resident): Message[] => [
      setMeta(`setAside:${resident}`, 0),
      {
        type: 'PlaceAsset',
        code: RESIDENTS[resident].code,
        name: RESIDENTS[resident].name,
        placement: { type: 'location', location: sunken },
      },
    ]),
    ...(shardAt
      ? [
          {
            type: 'PlaceAsset',
            code: RAIL.prismaticShard,
            name: 'Prismatic Shard',
            placement: { type: 'location', location: shardAt.id },
          } as Message,
        ]
      : []),
    ...(night
      ? [
          {
            type: 'SpawnEnemy',
            card: subterraneanBeast(state.startingInvestigatorCount),
            location: RAIL.controlStation,
            engageWith: null,
            entersExhausted: true,
          } as Message,
        ]
      : []),
    {
      type: 'PlaceAsset',
      code: RAIL.mineCart,
      name: 'Mine Cart',
      placement: { type: 'location', location: RAIL.controlStation },
    },
    setMeta('cartLocation', RAIL.controlStation),
    ask(lead(state), 'prompt.hemlockVale.cartFacing', [
      { label: 'choice.hemlockVale.faceN', then: [setMeta('cartFacing', 'N')] },
      { label: 'choice.hemlockVale.faceE', then: [setMeta('cartFacing', 'E')] },
    ]),
    { type: 'ScenarioSpecific', key: 'shuffleActTwo' },
  ]
}

// ---------------------------------------------------------------------------
// Deslizar e intercambiar
// ---------------------------------------------------------------------------

/** Los Lugares con Apoyos de historia y la Salida férrea no se deslizan ni intercambian. */
export function movable(state: GameState, location: LocationId): boolean {
  if (printedCode(location) === RAIL.railExit) return false
  return !Object.values(state.placedAssets ?? {}).some(
    (a) => a.placement.type === 'location' && a.placement.location === location,
  )
}

/** Opciones de deslizar (a un espacio vacío adyacente) dentro de la cuadrícula de 5×5. */
export function slideChoices(state: GameState, filter: (l: Location) => boolean = () => true) {
  const bounds = { columns: [1, 5] as [number, number], rows: [1, 5] as [number, number] }
  return Object.values(state.locations)
    .filter((l) => l.position && movable(state, l.id) && filter(l))
    .flatMap((l) =>
      emptyAdjacentPositions(state, l.id, bounds).map((position): Choice => ({
        label: 'choice.hemlockVale.slide',
        params: { location: l.name, column: position[0], row: 6 - position[1] },
        target: { type: 'location', id: l.id },
        then: [{ type: 'SlideLocation', location: l.id, position }],
      })),
    )
}

/** Opciones de intercambiar 2 Lugares adyacentes (con `rail`, solo Lugares Ferrocarril). */
export function swapChoices(state: GameState, rail = false): Choice[] {
  const seen = new Set<string>()
  return Object.values(state.locations).flatMap((a) =>
    gridNeighbors(state, a.id)
      .filter((b) => movable(state, a.id) && movable(state, b.id))
      .filter((b) => !rail || (railsOf(a.id).length && railsOf(b.id).length))
      .flatMap((b): Choice[] => {
        const key = [a.id, b.id].sort().join('|')
        if (seen.has(key)) return []
        seen.add(key)
        return [
          {
            label: 'choice.hemlockVale.swap',
            params: { a: a.name, b: b.name },
            then: [{ type: 'SwapLocations', a: a.id, b: b.id }],
          },
        ]
      }),
  )
}

export function actTwoAbilities(state: GameState, investigator: InvestigatorId): AbilityOption[] {
  const players = state.startingInvestigatorCount
  const clues = activeInvestigators(state).reduce((n, i) => n + i.clues, 0)
  const self = getInvestigator(state, investigator)
  const abilities: AbilityOption[] = []
  if (state.activeTurn === investigator && clues >= players) {
    const choices = [...slideChoices(state), ...swapChoices(state)]
    if (choices.length)
      abilities.push({
        key: 'maze:clues',
        label: 'ability.hemlockVale.mazeClues',
        params: { n: players },
        actions: 0,
        provokes: false,
        costs: [{ type: 'SpendGroupClues', amount: players }],
        then: [ask(investigator, 'prompt.hemlockVale.slideOrSwap', choices)],
      })
  }
  const revealed = slideChoices(state, (l) => l.revealed)
  if (self.resources >= players && revealed.length)
    abilities.push({
      key: 'maze:resources',
      label: 'ability.hemlockVale.mazeResources',
      params: { n: players },
      actions: 1,
      provokes: true,
      limit: { per: 'round', group: true },
      costs: [{ type: 'SpendResources', investigator, amount: players }],
      then: [ask(investigator, 'prompt.hemlockVale.slideOrSwap', revealed)],
    })
  const shard = Object.values(state.placedAssets ?? {}).find(
    (a) =>
      a.code === RAIL.prismaticShard &&
      a.placement.type === 'location' &&
      a.placement.location === self.location,
  )
  if (shard)
    abilities.push({
      key: 'maze:shard',
      label: 'ability.hemlockVale.takeShard',
      actions: 1,
      provokes: true,
      then: [{ type: 'TakeControlOfPlaced', placed: shard.id, investigator, noSlot: true }],
    })
  return abilities
}

// ---------------------------------------------------------------------------
// Lugares Ferrocarril
// ---------------------------------------------------------------------------

const turnAbility = (
  state: GameState,
  self: Location,
  investigator: InvestigatorId,
  kind: 'swap' | 'slide',
): AbilityOption[] => {
  const choices = kind === 'swap' ? swapChoices(state, true) : slideChoices(state)
  if (!choices.length) return []
  if (kind === 'slide' && getInvestigator(state, investigator).resources < 2) return []
  return [
    {
      key: `${self.id}:${kind}`,
      label: `ability.hemlockVale.turn${kind === 'swap' ? 'Swap' : 'Slide'}`,
      actions: kind === 'swap' ? 2 : 1,
      provokes: true,
      limit: { per: 'game', group: true },
      target: { type: 'location', id: self.id },
      ...(kind === 'slide'
        ? { costs: [{ type: 'SpendResources', investigator, amount: 2 } as Message] }
        : {}),
      then: [ask(investigator, 'prompt.hemlockVale.slideOrSwap', choices)],
    },
  ]
}

for (const code of [RAIL.leftTurnA, RAIL.rightTurnA])
  registerLocation({ code, abilities: (s, self, i) => turnAbility(s, self, i, 'swap') })
for (const code of [RAIL.leftTurnB, RAIL.rightTurnB])
  registerLocation({ code, abilities: (s, self, i) => turnAbility(s, self, i, 'slide') })

for (const code of [RAIL.alkalineRailA, RAIL.alkalineRailB])
  registerLocation({
    code,
    // Obligado: al final de la ronda, 1 horror a cada investigador y Habitante aquí.
    forced: (state, trigger, self) =>
      trigger.type === 'roundEnds'
        ? activeInvestigators(state)
            .filter((i) => i.location === self.id)
            .flatMap((i): Message[] => [
              { type: 'TakeDamage', investigator: i.id, damage: 0, horror: 1 },
              ...residentsOf(state, i.id).map((asset): Message => ({
                type: 'DamageAsset',
                asset,
                damage: 0,
                horror: 1,
              })),
            ])
        : [],
  })

const residentsOf = (state: GameState, investigator: InvestigatorId) =>
  residentsInCart(state).filter((id) => state.assets[id]?.owner === investigator)

for (const code of [RAIL.sunkenRailA, RAIL.sunkenRailB])
  registerLocation({
    code,
    // Obligado: después de revelarlo, descarta hasta un Enemigo; el jefe lo roba.
    onReveal: () => [{ type: 'ScenarioSpecific', key: 'sunkenRail' }],
  })

registerLocation({
  code: RAIL.forkedRail,
  forced: (state, trigger, self) =>
    trigger.type === 'roundEnds' && cartLocation(state) === self.id && switches(state) > 0
      ? [setMeta('switch', switches(state) - 1)]
      : [],
})

registerLocation({
  code: RAIL.railBridge,
  // [acción] Gasta 1 recurso por investigador: +1 aguja (límite de grupo: una vez por ronda).
  abilities: (state, self, investigator) =>
    getInvestigator(state, investigator).resources >= state.startingInvestigatorCount
      ? [
          {
            key: `${self.id}:switch`,
            label: 'ability.hemlockVale.bridgeSwitch',
            actions: 1,
            provokes: true,
            limit: { per: 'round', group: true },
            costs: [
              {
                type: 'SpendResources',
                investigator,
                amount: state.startingInvestigatorCount,
              },
            ],
            then: [setMeta('switch', switches(state) + 1)],
          },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// Enemigos y traiciones
// ---------------------------------------------------------------------------

registerEnemy({
  code: RAIL.subterraneanBeast,
  // [acción] Gasta 1 pista por investigador: agótala; no se prepara esta ronda.
  abilities: (state, self, investigator) =>
    !self.exhausted && getInvestigator(state, investigator).location === self.location
      ? [
          {
            key: `${self.id}:exhaust`,
            label: 'ability.hemlockVale.exhaustBeast',
            params: { n: state.startingInvestigatorCount },
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendGroupClues', amount: state.startingInvestigatorCount }],
            then: [{ type: 'ExhaustEnemy', enemy: self.id }],
          },
        ]
      : [],
})

registerEnemy({
  code: RAIL.burrowingHybrid,
  // Obligado: después de entrar en juego, si la Vagoneta mira a un Lugar conectado, deslízalo
  // a un espacio vacío adyacente; si no puedes, intercámbialo con uno adyacente.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'enemySpawned' || trigger.enemy !== self.id) return []
    const target = facedLocation(state)
    if (!target || !movable(state, target.id)) return []
    const bounds = { columns: [1, 5] as [number, number], rows: [1, 5] as [number, number] }
    const empty = emptyAdjacentPositions(state, target.id, bounds)
    if (empty.length)
      return [
        ask(
          lead(state),
          'prompt.hemlockVale.slideOrSwap',
          slideChoices(state, (l) => l.id === target.id),
        ),
      ]
    const swaps = gridNeighbors(state, target.id).filter((b) => movable(state, b.id))
    return swaps.length
      ? [
          ask(
            lead(state),
            'prompt.hemlockVale.slideOrSwap',
            swaps.map((b) => ({
              label: 'choice.hemlockVale.swap',
              params: { a: target.name, b: b.name },
              then: [{ type: 'SwapLocations', a: target.id, b: b.id } as Message],
            })),
          ),
        ]
      : []
  },
})

registerEnemy({
  code: RAIL.frenziedMiner,
  // Obligado: después de que te ataque, 1 daño a cada otro investigador y Habitante aquí.
  forced: (state, trigger, self) =>
    trigger.type === 'afterEnemyAttack' && trigger.enemy === self.id
      ? activeInvestigators(state)
          .filter((i) => i.id !== trigger.investigator && i.location === self.location)
          .flatMap((i): Message[] => [
            { type: 'TakeDamage', investigator: i.id, damage: 1, horror: 0 },
            ...residentsOf(state, i.id).map((asset): Message => ({
              type: 'DamageAsset',
              asset,
              damage: 1,
              horror: 0,
            })),
          ])
      : [],
})

/** Combate y evasión del Minero frenético: X es su columna. */
export function minerStat(state: GameState, code: string, location: LocationId | null): number {
  if (code !== RAIL.frenziedMiner || !location) return 0
  return state.locations[location]?.position?.[0] ?? 0
}

registerTreachery({
  code: RAIL.caveIn,
  // Se une al Lugar al que mira la Vagoneta; si no puede, gana Oleada.
  revelation: (state, investigator, self) => {
    const target = facedLocation(state)
    return target
      ? [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'location', location: target.id },
          },
        ]
      : [
          { type: 'DiscardTreachery', treachery: self.id },
          { type: 'DrawEncounterCard', investigator },
        ]
  },
  // [acción]: [combat] o [agility] (2) para descartarlo; también desde un Lugar adyacente.
  abilities: (state, self, investigator) => {
    if (self.placement.type !== 'location') return []
    const here = getInvestigator(state, investigator).location
    const location = self.placement.location
    if (here !== location && !gridNeighbors(state, location).some((l) => l.id === here)) return []
    return [
      {
        key: `${self.id}:clear`,
        label: 'ability.discardTreachery',
        params: { card: 'Cave-In' },
        actions: 1,
        provokes: true,
        then: [
          ask(
            investigator,
            'prompt.chooseSkill',
            (['combat', 'agility'] as const).map((skill) => ({
              label: `choice.test.${skill}`,
              params: { difficulty: 2 },
              then: [
                effectTest(investigator, 'Cave-In', skill, 2, {
                  onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
                }),
              ],
            })),
          ),
        ],
      },
    ]
  },
})

registerTreachery({
  code: RAIL.wildRide,
  // [agility] (5); si fallas, a tu zona de amenaza. Al moverse la Vagoneta, se resuelve.
  revelation: (_state, investigator, self) => [
    effectTest(investigator, 'Wild Ride', 'agility', 5, {
      onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
      onFail: [
        {
          type: 'PlaceTreachery',
          treachery: self.id,
          placement: { type: 'threatArea', investigator },
        },
      ],
    }),
  ],
})

/** Viaje salvaje en una zona de amenaza: al moverse la Vagoneta, el dueño elige. */
export function wildRides(state: GameState): Message[] {
  const ride = Object.values(state.treacheries).find(
    (t) => t.code === RAIL.wildRide && t.placement.type === 'threatArea',
  )
  if (!ride || ride.placement.type !== 'threatArea') return []
  const owner = ride.placement.investigator
  const hurt = activeInvestigators(state).flatMap((i): Message[] => [
    { type: 'TakeDamage', investigator: i.id, damage: 1, horror: 1, direct: true },
    ...Object.values(state.assets)
      .filter(
        (a) =>
          a.owner === i.id &&
          (residentsInCart(state).includes(a.id) ||
            !!playerCardDef(a.code)?.traits?.includes('Ally')),
      )
      .map((a): Message => ({ type: 'DamageAsset', asset: a.id, damage: 1, horror: 1 })),
  ])
  return [
    { type: 'DiscardTreachery', treachery: ride.id },
    ask(owner, 'prompt.chooseEffect', [
      {
        label: 'choice.hemlockVale.wildRideMove',
        then: [{ type: 'ScenarioSpecific', key: 'cartStep', data: { times: 2 } }],
      },
      { label: 'choice.hemlockVale.wildRideHurt', then: hurt },
    ]),
  ]
}

/**
 * Vía hundida: descarta cartas del mazo de Encuentros hasta descartar un Enemigo; el
 * investigador jefe lo roba.
 */
export function sunkenRail(state: GameState): GameState {
  const index = state.encounterDeck.findIndex((c) => c.kind === 'enemy')
  if (index < 0) return state
  const discarded = state.encounterDeck.slice(0, index)
  return push(
    {
      ...state,
      encounterDeck: state.encounterDeck.slice(index),
      encounterDiscard: [...state.encounterDiscard, ...discarded],
    },
    { type: 'DrawEncounterCard', investigator: lead(state) },
  )
}

// ---------------------------------------------------------------------------
// Resoluciones (p. 12–13)
// ---------------------------------------------------------------------------

const controlled = (state: GameState, code: string) =>
  Object.values(state.assets).some((a) => a.code === code)
const uncontrolled = (state: GameState, resident: 'simeonAtwood' | 'leahAtwood') =>
  !!state.scenarioMeta?.[`setAside:${resident}`] ||
  Object.values(state.placedAssets ?? {}).some((a) => a.code === RESIDENTS[resident].code)

/** Reverso del acto 2: la resolución según los Atwood. */
export function exitResolution(state: GameState): number {
  if (controlled(state, RESIDENTS.simeonAtwood.code)) return 1
  if (controlled(state, RESIDENTS.leahAtwood.code)) return 2
  if (uncontrolled(state, 'simeonAtwood')) return 3
  if (uncontrolled(state, 'leahAtwood')) return 4
  return 5
}

export const leadOf = lead
