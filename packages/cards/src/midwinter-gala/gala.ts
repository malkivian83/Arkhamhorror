/**
 * La gala del ecuador del invierno: preparación, plan, acto, localizaciones,
 * tarjeta de referencia, Invitados hechizados, interludio de la Joya, puntuación
 * y resoluciones. Los efectos se describen con palabras propias.
 */
import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  nextInt,
  placedLocation,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  registerLocation,
  registerScenario,
  seedRng,
  shroudOf,
  shuffle,
  type AbilityOption,
  type Asset,
  type ChaosToken,
  type Choice,
  type Difficulty,
  type EncounterCard,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type Message,
  type ScenarioBehavior,
  type ScenarioDefinition,
  type ScenarioOutcome,
  type SkillType,
  type StoryEntry,
} from '@lcg/engine'
import { endScenario, resolution } from '../scenario-helpers'
import {
  CODES,
  declanPearce,
  encounterDeck,
  FACTION_CARDS,
  FACTIONS,
  GROUND_FLOOR,
  isGuest,
  isLeader,
  isSingleSidedGuest,
  jewelCard,
  LOCATIONS,
  MANOR,
  MIDWINTER_GALA,
  MONSTERS,
  RIVAL_LEADERS,
  RIVAL_TREACHERIES,
  rookieCop,
  SECOND_FLOOR,
  viciousAmbush,
  type Faction,
} from './cards'
import {
  agendaNumber,
  ally,
  bloodlessMan,
  controlledGuestsAt,
  guestCountAt,
  guestsControlledBy,
  jewel,
  perInv,
  placedGuestsAt,
  rival,
  skillIcons,
  spellbind,
  spellbound,
} from './helpers'

// ---------------------------------------------------------------------------
// Bolsa del caos (escenario independiente)
// ---------------------------------------------------------------------------

const STANDARD: ChaosToken[] = [
  1,
  0,
  0,
  -1,
  -1,
  -1,
  -2,
  -2,
  -3,
  -4,
  'skull',
  'skull',
  'cultist',
  'tablet',
  'elderThing',
  'autoFail',
  'elderSign',
]
const HARD: ChaosToken[] = [
  0,
  0,
  -1,
  -1,
  -1,
  -2,
  -3,
  -4,
  -6,
  'skull',
  'skull',
  'cultist',
  'tablet',
  'elderThing',
  'elderThing',
  'autoFail',
  'elderSign',
]
const EXPERT: ChaosToken[] = [
  0,
  -1,
  -1,
  -2,
  -3,
  -4,
  -5,
  -6,
  -8,
  'skull',
  'skull',
  'cultist',
  'tablet',
  'elderThing',
  'elderThing',
  'autoFail',
  'elderSign',
]

export const CHAOS_BAGS: Record<Difficulty, ChaosToken[]> = {
  easy: STANDARD,
  standard: STANDARD,
  hard: HARD,
  expert: EXPERT,
}

// ---------------------------------------------------------------------------
// Preparación
// ---------------------------------------------------------------------------

const story = (key: string): StoryEntry => ({
  title: `story.midwinterGala.${key}Title`,
  body: `story.midwinterGala.${key}`,
})

const at = (card: LocationCard, position: [number, number]): LocationCard => ({ ...card, position })

/**
 * Prepara el escenario. La facción aliada se elige al empezar (pregunta de la
 * introducción); la rival se sortea ahora con la semilla para cada posible aliada.
 */
export function midwinterGala(options: {
  difficulty?: Difficulty
  seed?: number
  players: number
}): ScenarioDefinition {
  const { difficulty = 'standard', seed = 1, players } = options
  const [ground, afterGround] = shuffle(GROUND_FLOOR, seedRng(seed))
  let rng = afterGround
  const rivals = {} as Record<Faction, Faction>
  for (const f of FACTIONS) {
    const others = FACTIONS.filter((o) => o !== f)
    let pick: number
    ;[pick, rng] = nextInt(rng, others.length)
    rivals[f] = others[pick]!
  }
  const byCode = Object.fromEntries(Object.values(LOCATIONS).map((l) => [l.id, l]))
  const [encounter] = shuffle(encounterDeck(), rng)

  const chooseContact: Message = {
    type: 'Story',
    entry: story('contact'),
    choices: FACTIONS.map((f): Choice => ({
      label: `story.midwinterGala.contactChoice.${f}`,
      then: [
        { type: 'Story', entry: story(`faction.${f}`) },
        { type: 'ScenarioSpecific', key: 'setupFaction', data: { ally: f, rival: rivals[f] } },
        { type: 'Story', entry: story('setup') },
      ],
    })),
  }

  return {
    id: MIDWINTER_GALA,
    intro: [story('intro1'), story('intro2')],
    locations: [
      at(LOCATIONS.lobby, [0, 1]),
      at(LOCATIONS.lanternChamber, [0, 2]),
      ...ground.map((code, n) => at(byCode[code]!, [n + 1, 1])),
    ],
    setAsideLocations: SECOND_FLOOR.map((code) => byCode[code]!),
    startingLocation: CODES.lobby,
    agendas: [
      { code: CODES.maskedRevelers, name: 'Masked Revelers', doomThreshold: 4 },
      { code: CODES.unexpectedGuests, name: 'Unexpected Guests', doomThreshold: 6 },
      { code: CODES.aKillerParty, name: 'A Killer Party', doomThreshold: 6 },
    ],
    acts: [
      {
        code: CODES.meetAndGreet,
        name: 'Meet and Greet',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      {
        code: CODES.findingTheJewel,
        name: 'Finding the Jewel',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: encounter,
    setAside: [
      ...MONSTERS,
      { ...viciousAmbush },
      { ...viciousAmbush },
      { ...declanPearce, health: 2 + 2 * players },
      { ...jewelCard },
      ...Object.values(RIVAL_LEADERS).map((e) => ({ ...e })),
      { ...rookieCop },
      ...Object.values(RIVAL_TREACHERIES).map((t) => ({ ...t })),
    ],
    chaosBag: [...CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      chooseContact,
      // El Exangüe, agotado en la Sala de la Lámpara, con La Lámpara Mortecina.
      { type: 'ScenarioSpecific', key: 'setupBloodlessMan' },
    ],
  }
}

/** Retira de los apartados las cartas de las facciones que no participan. */
function removeUnused(state: GameState, allied: Faction, rivalF: Faction): GameState {
  const keepLeader = RIVAL_LEADERS[rivalF].code
  const keepRival = FACTION_CARDS[rivalF].rivalCard
  return {
    ...state,
    setAside: state.setAside.filter((c) => {
      if (Object.values(RIVAL_LEADERS).some((l) => l.code === c.code)) return c.code === keepLeader
      if (c.code === CODES.rookieCop || RIVAL_TREACHERIES[c.code]) return c.code === keepRival
      return true
    }),
    // La carta Rival de la facción aliada se retira de la partida.
    scenarioMeta: { ...(state.scenarioMeta ?? {}), ally: allied, rival: rivalF },
  }
}

function setupFaction(state: GameState, allied: Faction, rivalF: Faction): GameState {
  let next = removeUnused(state, allied, rivalF)
  const lead = leadInvestigator(next)
  const otherGuests = FACTIONS.filter((f) => f !== allied && f !== rivalF).flatMap(
    (f) => FACTION_CARDS[f].guests,
  )
  const [deck, afterDeck] = shuffle(otherGuests, next.rng)
  const [allies, rng] = shuffle([...FACTION_CARDS[allied].guests], afterDeck)
  const inPlay = deck.slice(0, 3)
  next = { ...next, rng, scenarioDecks: { ...(next.scenarioDecks ?? {}), guests: deck.slice(3) } }
  const rooms = groundFloorRooms(next)
  const place = (code: string, location: string): Message => ({
    type: 'PlaceAsset',
    code,
    name: playerCardDef(code)?.name ?? code,
    placement: { type: 'location', location },
  })
  return push(
    next,
    ...(lead
      ? [
          {
            type: 'PutAssetIntoPlay',
            investigator: lead.id,
            code: FACTION_CARDS[allied].leader,
            noSlot: true,
          } as Message,
        ]
      : []),
    ...allies.map((code, n) => place(code, rooms[n]!)),
    ...inPlay.map((code, n) => place(code, rooms[n]!)),
  )
}

/** Las 3 salas de la planta baja, de izquierda a derecha. */
function groundFloorRooms(state: GameState): string[] {
  return GROUND_FLOOR.filter((c) => state.locations[c]).sort(
    (a, b) => (state.locations[a]!.position?.[0] ?? 0) - (state.locations[b]!.position?.[0] ?? 0),
  )
}

// ---------------------------------------------------------------------------
// Mensajes propios del escenario
// ---------------------------------------------------------------------------

type Data = Record<string, string | number | boolean>

/** Pone la carta superior del mazo de Invitados en juego en esa localización. */
function revealGuest(state: GameState, location: string): GameState {
  const [top, ...rest] = state.scenarioDecks?.guests ?? []
  if (!top) return state
  return push(
    { ...state, scenarioDecks: { ...state.scenarioDecks, guests: rest } },
    {
      type: 'PlaceAsset',
      code: top,
      name: playerCardDef(top)?.name ?? top,
      placement: { type: 'location', location },
    },
    {
      type: 'Log',
      key: 'log.gala.guestArrives',
      params: { card: playerCardDef(top)?.name ?? top },
    },
  )
}

/**
 * Hechizado: el investigador pierde el control del Invitado, que queda boca
 * abajo en su localización sin daño ni horror. Un Líder se retira de la partida.
 */
function doSpellbind(state: GameState, data: Data): GameState {
  if (typeof data.asset === 'string') {
    const asset = state.assets[data.asset]
    if (!asset) return state
    if (isLeader(asset.code)) return removeAsset(state, asset)
    if (!isSingleSidedGuest(asset.code)) return state
    const location = getInvestigator(state, asset.owner).location
    if (!location) return state
    return push(
      state,
      {
        type: 'ReleaseAsset',
        asset: asset.id,
        placement: { type: 'location', location },
        faceDown: true,
      },
      {
        type: 'Log',
        key: 'log.gala.spellbound',
        params: { card: playerCardDef(asset.code)?.name ?? asset.code },
      },
    )
  }
  if (typeof data.placed === 'string') {
    const placed = state.placedAssets?.[data.placed]
    if (!placed || placed.faceDown || !isSingleSidedGuest(placed.code)) return state
    return push(
      {
        ...state,
        placedAssets: {
          ...state.placedAssets,
          [placed.id]: { ...placed, faceDown: true, damage: 0, horror: 0 },
        },
      },
      { type: 'Log', key: 'log.gala.spellbound', params: { card: placed.name } },
    )
  }
  return state
}

/** Retira un apoyo controlado de la partida (sin pasar por la pila de descartes). */
function removeAsset(state: GameState, asset: Asset): GameState {
  const { [asset.id]: _gone, ...assets } = state.assets
  return {
    ...state,
    assets,
    log: [
      ...state.log,
      {
        key: 'log.gala.removed',
        round: state.round,
        params: { card: playerCardDef(asset.code)?.name ?? asset.code },
      },
    ],
  }
}

/** El Exangüe, agotado en la Sala de la Lámpara, con La Lámpara Mortecina vinculada. */
function setupBloodlessMan(state: GameState): GameState {
  return push(
    state,
    {
      type: 'SpawnEnemy',
      card: {
        kind: 'enemy',
        code: CODES.bloodlessMan,
        name: 'The Bloodless Man',
        traits: ['Humanoid', 'Lantern Club', 'Elite'],
        fight: 4,
        health: 3,
        healthPerInvestigator: true,
        evade: 2,
        damage: 1,
        horror: 1,
        keywords: ['aloof'],
      },
      location: CODES.lanternChamber,
      engageWith: null,
    },
    { type: 'ScenarioSpecific', key: 'attachLantern' },
  )
}

function attachLantern(state: GameState): GameState {
  const man = bloodlessMan(state)
  if (!man) return state
  return push(
    { ...state, enemies: { ...state.enemies, [man.id]: { ...man, exhausted: true } } },
    {
      type: 'PlaceAsset',
      code: CODES.paleLantern,
      name: 'The Pale Lantern',
      placement: { type: 'enemy', enemy: man.id },
    },
  )
}

/** Acto 1b: el primer piso, la carta de Historia rival y el interludio de la Joya. */
function contactsAcquired(state: GameState): GameState {
  const [order, rng] = shuffle(SECOND_FLOOR, state.rng)
  const locations = { ...state.locations }
  const setAsideLocations = { ...state.setAsideLocations }
  order.forEach((code, n) => {
    const card = setAsideLocations[code]
    if (!card) return
    delete setAsideLocations[code]
    locations[code] = {
      ...card,
      connections: [...card.connections],
      revealed: false,
      clues: 0,
      position: [n, 0],
    }
  })
  const above = order[0]!
  const r = rival(state)
  const rivalStory = r ? FACTION_CARDS[r] : undefined
  return push(
    { ...state, rng, locations, setAsideLocations },
    { type: 'ConnectLocations', a: CODES.lobby, b: above },
    ...(rivalStory
      ? [
          {
            type: 'PutStoryIntoPlay',
            code: `${rivalStory.story}b`,
            name: rivalStory.storyName,
          } as Message,
        ]
      : []),
    { type: 'ScenarioSpecific', key: 'interlude' },
  )
}

/** Interludio: La Joya fabulosa (según la facción aliada). */
function interlude(state: GameState): GameState {
  const a = ally(state)
  if (!a) return state
  const lead = leadInvestigator(state)
  const cards = FACTION_CARDS[a]
  const enterStory: Message[] = [
    { type: 'Story', entry: story(`interlude.${a}`) },
    { type: 'PutStoryIntoPlay', code: cards.story, name: cards.storyName },
  ]
  const declanAt = (location: string, exhausted: boolean): Message[] => [
    { type: 'SpawnSetAsideEnemy', code: CODES.declanPearce, location },
    ...(exhausted ? [{ type: 'ScenarioSpecific', key: 'exhaustDeclan' } as Message] : []),
  ]
  const jewelOn = (target: 'bloodless' | 'declan' | 'lantern', extra: Data = {}): Message => ({
    type: 'ScenarioSpecific',
    key: 'placeJewel',
    data: { target, ...extra },
  })
  const rightmost = SECOND_FLOOR.filter((c) => state.locations[c]).sort(
    (x, y) => (state.locations[y]!.position?.[0] ?? 0) - (state.locations[x]!.position?.[0] ?? 0),
  )[0]
  switch (a) {
    case 'foundation':
      return push(
        state,
        ...enterStory,
        ...declanAt(CODES.lanternChamber, true),
        jewelOn(bloodlessMan(state) ? 'bloodless' : 'lantern'),
      )
    case 'miskatonic':
      return push(
        state,
        ...enterStory,
        ...declanAt(rightmost ?? CODES.lobby, false),
        jewelOn('declan'),
      )
    case 'syndicate':
      return push(state, ...enterStory, { type: 'ScenarioSpecific', key: 'hideMysteries' })
    case 'lodge':
      return push(state, ...enterStory, { type: 'ScenarioSpecific', key: 'buryJewel' })
    case 'kingsport':
      return push(
        state,
        ...enterStory,
        ...declanAt(CODES.lanternChamber, true),
        jewelOn('declan', { damage: perInv(state, 1), doom: 1 }),
        ...(lead
          ? [
              {
                type: 'ScenarioSpecific',
                key: 'revealGuest',
                data: { location: CODES.lobby },
              } as Message,
            ]
          : []),
      )
  }
}

/** Saca una carta apartada (por código). */
function takeSetAside(state: GameState, code: string): [EncounterCard | undefined, GameState] {
  const index = state.setAside.findIndex((c) => c.code === code)
  if (index < 0) return [undefined, state]
  const card = state.setAside[index]
  return [card, { ...state, setAside: state.setAside.filter((_, n) => n !== index) }]
}

/** El Sindicato: la carta superior de encuentros, la Joya y Declan, uno bajo cada sala del primer piso. */
function hideMysteries(state: GameState): GameState {
  let next = state
  const [top, ...deck] = next.encounterDeck
  next = { ...next, encounterDeck: deck }
  const [jewelC, withoutJewel] = takeSetAside(next, CODES.jewelOfSarnath)
  const [declanC, withoutDeclan] = takeSetAside(withoutJewel, CODES.declanPearce)
  next = withoutDeclan
  const cards = [top, jewelC, declanC].filter((c): c is EncounterCard => !!c)
  const [mixed, rng] = shuffle(cards, next.rng)
  const locations = { ...next.locations }
  SECOND_FLOOR.forEach((code, n) => {
    const l = locations[code]
    const card = mixed[n]
    if (l && card) locations[code] = { ...l, beneath: [...(l.beneath ?? []), card] }
  })
  return { ...next, rng, locations }
}

/** La Logia: la Joya y Declan, entre 7 cartas, al fondo del mazo de encuentros. */
function buryJewel(state: GameState): GameState {
  const [all, mixed] = shuffle([...state.encounterDeck, ...state.encounterDiscard], state.rng)
  const seven = all.slice(0, 7)
  const [jewelC, withoutJewel] = takeSetAside({ ...state, rng: mixed }, CODES.jewelOfSarnath)
  const [declanC, next] = takeSetAside(withoutJewel, CODES.declanPearce)
  const [bottom, rng] = shuffle(
    [...seven, ...[jewelC, declanC].filter((c): c is EncounterCard => !!c)],
    next.rng,
  )
  const deck = [...all.slice(7), ...bottom]
  const players = activeInvestigators(next).length
  const discard = players === 2 ? 6 : players === 1 ? 12 : 0
  return {
    ...next,
    rng,
    encounterDeck: deck.slice(discard),
    encounterDiscard: deck.slice(0, discard),
  }
}

/** Coloca la Joya de Sarnath apartada (sin su Revelación). */
function placeJewel(state: GameState, data: Data): GameState {
  let next = state
  ;[, next] = takeSetAside(next, CODES.jewelOfSarnath)
  const target = data.target
  const man = bloodlessMan(next)
  const dec = Object.values(next.enemies).find((e) => e.code === CODES.declanPearce)
  const placement =
    target === 'bloodless' && man
      ? ({ type: 'enemy', enemy: man.id } as const)
      : target === 'declan' && dec
        ? ({ type: 'enemy', enemy: dec.id } as const)
        : ({ type: 'location', location: CODES.lanternChamber } as const)
  return push(next, {
    type: 'PlaceAsset',
    code: CODES.jewelOfSarnath,
    name: 'Jewel of Sarnath',
    placement,
    ...(typeof data.damage === 'number' ? { damage: data.damage } : {}),
    ...(typeof data.doom === 'number' ? { doom: data.doom } : {}),
  })
}

const galaBehavior: ScenarioBehavior = {
  id: MIDWINTER_GALA,
  rulesVersion: 2,
  tokenEffect: (state, token, investigator) => {
    const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
    const here = getInvestigator(state, investigator).location
    switch (token) {
      case 'skull':
        return { modifier: -(agendaNumber(state) + (hard ? 1 : 0)) }
      case 'cultist': {
        if (!here) return { modifier: 0 }
        const n = hard ? storyAssetsAt(state, here) : Math.min(5, guestCountAt(state, here))
        return { modifier: -n }
      }
      case 'tablet': {
        const privateRoom = !!here && isPrivate(here)
        return { modifier: -(privateRoom ? (hard ? 5 : 4) : hard ? 3 : 2) }
      }
      case 'elderThing': {
        const horror: Message = { type: 'TakeDamage', investigator, damage: 0, horror: 1 }
        const man = bloodlessMan(state)
        const withHim = !!man && man.location === here
        // "Si fallas o si El Exangüe está en tu localización": 1 horror (una sola vez).
        return withHim
          ? { modifier: hard ? -4 : -3, immediate: [horror] }
          : { modifier: hard ? -4 : -3, onFail: [horror] }
      }
    }
  },
  specific: (state, key, data) => {
    switch (key) {
      case 'setupFaction':
        return setupFaction(state, data.ally as Faction, data.rival as Faction)
      case 'setupBloodlessMan':
        return setupBloodlessMan(state)
      case 'attachLantern':
        return attachLantern(state)
      case 'spellbind':
        return doSpellbind(state, data)
      case 'placedDefeated': {
        const placed = state.placedAssets?.[data.placed as string]
        if (!placed) return state
        if (isSingleSidedGuest(placed.code)) return doSpellbind(state, { placed: placed.id })
        return push(state, { type: 'RemovePlacedAsset', placed: placed.id })
      }
      case 'revealGuest':
        return revealGuest(state, data.location as string)
      case 'contactsAcquired':
        return contactsAcquired(state)
      case 'interlude':
        return interlude(state)
      case 'hideMysteries':
        return hideMysteries(state)
      case 'buryJewel':
        return buryJewel(state)
      case 'placeJewel':
        return placeJewel(state, data)
      case 'exhaustDeclan': {
        const dec = Object.values(state.enemies).find((e) => e.code === CODES.declanPearce)
        return dec
          ? { ...state, enemies: { ...state.enemies, [dec.id]: { ...dec, exhausted: true } } }
          : state
      }
      case 'giveGuest': {
        const asset = state.assets[data.asset as string]
        if (!asset) return state
        return {
          ...state,
          assets: { ...state.assets, [asset.id]: { ...asset, owner: data.investigator as string } },
        }
      }
      case 'shuffleDiscardIntoEncounter': {
        const [deck, rng] = shuffle([...state.encounterDeck, ...state.encounterDiscard], state.rng)
        return { ...state, rng, encounterDeck: deck, encounterDiscard: [] }
      }
      default:
        return gameSpecific(state, key, data)
    }
  },
  // Plan 1, 2 y 3: un Invitado de una sola cara que fuera a abandonar el juego queda hechizado.
  assetLeavesPlay: (_state, asset) => {
    // La Joya, al abandonar el juego, se baraja en el mazo de encuentros.
    if (asset.code === CODES.jewelOfSarnath)
      return [{ type: 'ScenarioSpecific', key: 'jewelLeaves' }]
    // La Lámpara (Aura seductora) vuelve a su otra cara, vinculada a su localización.
    if (asset.code === CODES.paleLanternAura)
      return [{ type: 'ScenarioSpecific', key: 'lanternBack' }]
    if (isSingleSidedGuest(asset.code)) return [spellbind({ asset: asset.id })]
    // Los Líderes, al abandonar el juego, se retiran de la partida.
    if (isLeader(asset.code)) return [spellbind({ asset: asset.id })]
    return null
  },
  // Meet and Greet: avanzar solo si todos controlan un Invitado y el plan es el 2a o 3a.
  actAdvanceAllowed: (state) => {
    if (state.acts[state.actIndex]?.code !== CODES.meetAndGreet) return true
    return (
      agendaNumber(state) >= 2 &&
      activeInvestigators(state).every((i) => guestsControlledBy(state, i.id).length > 0)
    )
  },
  // Los Líderes rivales no pueden recibir daño; Declan tampoco con la Joya vinculada (Universidad).
  enemyImmune: (state, enemy) => {
    if ((enemy.traits ?? []).includes('Leader')) return true
    if (enemy.code === CODES.declanPearce && ally(state) === 'miskatonic') {
      return Object.values(state.placedAssets ?? {}).some(
        (p) =>
          p.code === CODES.jewelOfSarnath &&
          p.placement.type === 'enemy' &&
          p.placement.enemy === enemy.id,
      )
    }
    return false
  },
  // Savage Shantak: +1 de combate y de evasión por cada Invitado en su localización.
  enemyStat: (state, enemy) =>
    enemy.code === CODES.savageShantak ? guestCountAt(state, enemy.location) : 0,
  // Declan Pearce: tienes 1 acción menos mientras está enfrentado contigo.
  actionsModifier: (state, investigator) =>
    Object.values(state.enemies).some(
      (e) => e.code === CODES.declanPearce && e.engagedWith === investigator,
    )
      ? -1
      : 0,
  // William Bain (rival): los investigadores de su localización no pueden comprometer cartas.
  cannotCommit: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return Object.values(state.enemies).some((e) => e.code === '71040b' && e.location === here)
  },
  // Ward of Preservation: al jugar un evento se cancelan sus efectos, 1 horror y se descarta.
  eventPlayed: (state, investigator) => {
    const ward = Object.values(state.treacheries).find(
      (t) =>
        t.code === CODES.wardOfPreservation &&
        t.placement.type === 'threatArea' &&
        t.placement.investigator === investigator,
    )
    if (!ward) return null
    return [
      { type: 'Log', key: 'log.gala.eventCancelled' },
      { type: 'TakeDamage', investigator, damage: 0, horror: 1 },
      { type: 'DiscardTreachery', treachery: ward.id },
    ]
  },
  shroudModifier: (state, location) => {
    // Parlor: -1 al velo por cada Invitado (mínimo 1).
    if (location.id !== CODES.parlor) return 0
    const reduced = Math.max(1, location.shroud - guestCountAt(state, location.id))
    return reduced - location.shroud
  },
  skillModifier: (state, test) => {
    const investigator = getInvestigator(state, test.investigator)
    let bonus = 0
    // Library: +1 al negociar aquí.
    if ((test.tags ?? []).includes('parley') && investigator.location === CODES.library) bonus += 1
    return bonus + modifiers.reduce((n, modifier) => n + modifier(state, test), 0)
  },
  // La bonificación a "tu siguiente prueba" (Valeriya, Miranda) se gasta al terminarla.
  forced: (state, trigger) =>
    trigger.type === 'skillTestEnded' &&
    state.scenarioMeta?.[`bonus:${trigger.investigator}:${state.round}`]
      ? [{ type: 'SetScenarioMeta', key: `bonus:${trigger.investigator}:${state.round}`, value: 0 }]
      : [],
}

/**
 * Ganchos que añaden las otras partes del escenario (encuentros, facciones,
 * Invitados) sin dependencias circulares.
 */
type Specific = (state: GameState, key: string, data: Data) => GameState
type Modifier = (state: GameState, test: NonNullable<GameState['skillTest']>) => number
/** Manejadores de mensajes propios: el primero que cambia el estado lo resuelve. */
const specifics: Specific[] = []
const modifiers: Modifier[] = []
const gameSpecific: Specific = (state, key, data) => {
  for (const handle of specifics) {
    const next = handle(state, key, data)
    if (next !== state) return next
  }
  return state
}

export function extendGala(hooks: { specific?: Specific; skillModifier?: Modifier }) {
  if (hooks.specific) specifics.push(hooks.specific)
  if (hooks.skillModifier) modifiers.push(hooks.skillModifier)
}

const isPrivate = (location: string) =>
  location === CODES.lanternChamber || SECOND_FLOOR.includes(location)

/** Apoyos de historia en la localización (Invitados, Joya, Lámpara), con o sin dueño. */
function storyAssetsAt(state: GameState, location: string): number {
  const controlled = Object.values(state.assets).filter(
    (a) =>
      (isGuest(a.code) ||
        a.code === CODES.jewelOfSarnath ||
        a.code.startsWith(CODES.paleLantern)) &&
      getInvestigator(state, a.owner).location === location,
  ).length
  const placed = Object.values(state.placedAssets ?? {}).filter(
    (p) => !p.faceDown && placedLocation(state, p) === location,
  ).length
  return controlled + placed
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

const lanternClub = (traits: string[] | undefined) => (traits ?? []).includes('Lantern Club')

registerAgenda({
  code: CODES.maskedRevelers,
  // Los enemigos del Club de la Lámpara no pueden recibir daño.
  enemyImmune: (_state, enemy) => lanternClub(enemy.traits),
  // ¿Quién soltó a los gugs?: monstruos, Emboscadas y descartes al mazo de encuentros.
  onAdvance: () => [
    {
      type: 'ShuffleSetAsideIntoEncounter',
      codes: [CODES.enragedGug, CODES.moonBeast, CODES.savageShantak, CODES.viciousAmbush],
    },
    { type: 'ScenarioSpecific', key: 'shuffleDiscardIntoEncounter' },
  ],
})

registerAgenda({
  code: CODES.unexpectedGuests,
  // Se desata el caos: si El Exangüe (Acechador silencioso) está en juego, se transforma.
  onAdvance: (state) => {
    const man = Object.values(state.enemies).find((e) => e.code === CODES.bloodlessMan)
    if (man) {
      return [
        { type: 'Story', entry: story('mayhem') },
        { type: 'ScenarioSpecific', key: 'unleash' },
      ]
    }
    return [
      { type: 'Story', entry: story('calm') },
      ...activeInvestigators(state).map((i): Message => ({
        type: 'ScenarioSpecific',
        key: 'calmHeal',
        data: { investigator: i.id },
      })),
    ]
  },
})

registerAgenda({
  code: CODES.aKillerParty,
  // Una despedida de Kingsport: todos son derrotados y sufren 1 trauma mental.
  onAdvance: (state) => [
    { type: 'Story', entry: story('goodbye') },
    { type: 'SufferTrauma', mental: 1 },
    ...activeInvestigators(state).map((i): Message => ({
      type: 'DefeatInvestigator',
      investigator: i.id,
    })),
  ],
})

// ---------------------------------------------------------------------------
// Acto
// ---------------------------------------------------------------------------

/** Negociar con un Invitado de tu localización que no controles: prueba (3) con uno de sus iconos. */
function parleyWithGuests(state: GameState, investigator: InvestigatorId): AbilityOption[] {
  const here = getInvestigator(state, investigator).location
  if (!here) return []
  const placed = placedGuestsAt(state, here).map((p) => ({
    code: p.code,
    name: p.name,
    take: { type: 'TakeControlOfPlaced', placed: p.id, investigator } as Message,
    target: { type: 'placed', id: p.id } as const,
  }))
  const others = controlledGuestsAt(state, here)
    .filter((a) => a.owner !== investigator)
    .map((a) => ({
      code: a.code,
      name: playerCardDef(a.code)?.name ?? a.code,
      take: {
        type: 'ScenarioSpecific',
        key: 'giveGuest',
        data: { asset: a.id, investigator },
      } as Message,
      target: { type: 'asset', id: a.id } as const,
    }))
  return [...placed, ...others].flatMap((g) =>
    skillIcons(playerCardDef(g.code)?.icons).map((skill: SkillType): AbilityOption => ({
      key: `act:parleyGuest:${g.code}:${skill}`,
      label: 'ability.gala.parleyGuest',
      params: { card: g.name, skill },
      actions: 1,
      provokes: false,
      target: g.target,
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          skill,
          difficulty: 3,
          tags: ['parley'],
          kind: { type: 'effect', source: g.name, onSuccess: [g.take], onFail: [], onFailEach: [] },
        },
      ],
    })),
  )
}

registerAct({
  code: CODES.meetAndGreet,
  abilities: (state, _self, investigator) => {
    const here = getInvestigator(state, investigator).location
    const mine = guestsControlledBy(state, investigator)
    const others = activeInvestigators(state).filter(
      (i) => i.id !== investigator && i.location === here,
    )
    // Dar el control de un Invitado tuyo a otro investigador de tu localización.
    const give = mine.flatMap((a) =>
      others.map((o): AbilityOption => ({
        key: `act:giveGuest:${a.id}:${o.id}`,
        label: 'ability.gala.giveGuest',
        params: { card: playerCardDef(a.code)?.name ?? a.code, name: o.name },
        actions: 1,
        provokes: true,
        target: { type: 'asset', id: a.id },
        then: [
          { type: 'ScenarioSpecific', key: 'giveGuest', data: { asset: a.id, investigator: o.id } },
        ],
      })),
    )
    return [...parleyWithGuests(state, investigator), ...give]
  },
  // Contactos conseguidos: el primer piso, la facción rival y el interludio.
  onAdvance: () => [{ type: 'ScenarioSpecific', key: 'contactsAcquired' }],
})

registerAct({
  code: CODES.findingTheJewel,
  abilities: (state, _self, investigator) => parleyWithGuests(state, investigator),
  // El objetivo lo cumple la carta de Historia de la facción aliada (stories.ts).
  objectiveMet: (state) => state.scenarioMeta?.jewelObjective === 1,
})

// ---------------------------------------------------------------------------
// Localizaciones
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.lobby,
  // Alguien llega con estilo: si el plan es el 2a o 3a, paga 1 recurso por investigador y
  // pon en juego aquí la carta superior del mazo de Invitados (una vez por ronda, en grupo).
  abilities: (state, self, investigator) => {
    const cost = perInv(state, 1)
    if (agendaNumber(state) < 2 || !(state.scenarioDecks?.guests?.length ?? 0)) return []
    if (getInvestigator(state, investigator).resources < cost) return []
    return [
      {
        key: `${self.id}:late`,
        label: 'ability.gala.fashionablyLate',
        params: { n: cost },
        actions: 0,
        provokes: false,
        limit: { per: 'round', group: true },
        then: [
          { type: 'SpendResources', investigator, amount: cost },
          { type: 'ScenarioSpecific', key: 'revealGuest', data: { location: self.id } },
        ],
      },
    ]
  },
})

registerLocation({
  code: CODES.lanternChamber,
  abilities: (state, self, investigator) => {
    const options: AbilityOption[] = []
    // Durante tu turno: nombra una carta y roba la superior de encuentros; si acertaste,
    // se cancela y descubres 1 pista aquí (una vez por turno).
    if (state.activeTurn === investigator && state.encounterDeck.length > 0) {
      const names = [
        ...new Set([...state.encounterDeck, ...state.encounterDiscard].map((c) => c.name)),
      ].sort()
      options.push({
        key: `${self.id}:guess:${state.round}`,
        label: 'ability.gala.nameACard',
        actions: 0,
        provokes: false,
        limit: { per: 'round' },
        then: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.gala.nameACard',
              choices: names.map((name) => ({
                label: 'choice.gala.namedCard',
                params: { card: name },
                then: [
                  { type: 'ScenarioSpecific', key: 'lanternGuess', data: { investigator, name } },
                ],
              })),
            },
          },
        ],
      })
    }
    // Sin pistas aquí: [willpower] (4) para dar la vuelta a una carta hechizada.
    if (self.clues === 0 && spellbound(state).length > 0) {
      options.push({
        key: `${self.id}:flip`,
        label: 'ability.gala.breakSpell',
        actions: 1,
        provokes: true,
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'willpower',
            difficulty: 4,
            kind: {
              type: 'effect',
              source: 'Lantern Chamber',
              onSuccess: [{ type: 'ScenarioSpecific', key: 'chooseFlip', data: { investigator } }],
              onFail: [],
              onFailEach: [],
            },
          },
        ],
      })
    }
    return options
  },
})

registerLocation({
  code: CODES.artGallery,
  // Pon hasta 2 pistas de la reserva aquí y gana 2 recursos (una vez por ronda, en grupo).
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:art`,
      label: 'ability.gala.artGallery',
      actions: 1,
      provokes: true,
      limit: { per: 'round', group: true },
      then: [
        { type: 'PlaceCluesOnLocationFromPool', location: self.id, amount: 2 },
        { type: 'GainResources', investigator, amount: 2 },
      ],
    },
  ],
})

registerLocation({
  code: CODES.ballroom,
  // Negociar: agota 2 Invitados de aquí y cura 1 horror de cada uno.
  abilities: (state, self) => {
    const ready = [
      ...controlledGuestsAt(state, self.id)
        .filter((a) => !a.exhausted)
        .map((a) => ({ asset: a.id })),
      ...placedGuestsAt(state, self.id)
        .filter((p) => !p.exhausted)
        .map((p) => ({ placed: p.id })),
    ]
    if (ready.length < 2) return []
    return [
      {
        key: `${self.id}:dance`,
        label: 'ability.gala.dance',
        actions: 1,
        provokes: false,
        then: [{ type: 'ScenarioSpecific', key: 'dance', data: { location: self.id } }],
      },
    ]
  },
})

registerLocation({
  code: CODES.barroom,
  // Gasta 1 recurso: cura 1 daño o 1 horror de un investigador o Invitado de aquí (una vez por ronda, en grupo).
  abilities: (state, self, investigator) =>
    getInvestigator(state, investigator).resources < 1
      ? []
      : [
          {
            key: `${self.id}:drink`,
            label: 'ability.gala.buyDrink',
            actions: 0,
            provokes: false,
            limit: { per: 'round', group: true },
            then: [
              { type: 'SpendResources', investigator, amount: 1 },
              { type: 'ScenarioSpecific', key: 'drink', data: { investigator, location: self.id } },
            ],
          },
        ],
})

registerLocation({
  code: CODES.bedroom,
  // Combatir contra un enemigo de cualquier sala del primer piso; puedes usar [agility];
  // si tienes éxito, puedes gastar 1 pista para +2 de daño (una vez por turno).
  abilities: (state, self, investigator) =>
    Object.values(state.enemies)
      .filter((e) => SECOND_FLOOR.includes(e.location))
      .flatMap((e) =>
        (['combat', 'agility'] as SkillType[]).map((skill): AbilityOption => ({
          key: `${self.id}:fight`,
          label: 'ability.gala.bedroomFight',
          params: { enemy: e.name, skill },
          actions: 1,
          provokes: false,
          limit: { per: 'turn' },
          target: { type: 'enemy', id: e.id },
          then: [
            {
              type: 'BeginSkillTest',
              investigator,
              skill,
              difficulty: e.fight,
              kind: {
                type: 'fight',
                enemy: e.id,
                onSuccess: [
                  {
                    type: 'ScenarioSpecific',
                    key: 'bedroomBonus',
                    data: { investigator, enemy: e.id },
                  },
                ],
              },
            },
          ],
        })),
      ),
})

registerLocation({
  code: CODES.library,
  // Si la Joya está aquí: [intellect] (3); si tienes éxito, 1 daño en la Joya o quítale 1 ficha
  // (una vez por partida, en grupo).
  abilities: (state, self, investigator) => {
    const j = jewel(state)
    const here =
      (j.placed && placedLocation(state, j.placed) === self.id) ||
      (j.asset && getInvestigator(state, j.asset.owner).location === self.id)
    if (!here) return []
    return [
      {
        key: `${self.id}:jewel`,
        label: 'ability.gala.studyJewel',
        actions: 0,
        provokes: false,
        limit: { per: 'game', group: true },
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'intellect',
            difficulty: 3,
            kind: {
              type: 'effect',
              source: 'Library',
              onSuccess: [{ type: 'ScenarioSpecific', key: 'jewelToken', data: { investigator } }],
              onFail: [],
              onFailEach: [],
            },
          },
        ],
      },
    ]
  },
})

registerLocation({
  code: CODES.parlor,
  // Si controlas la Joya: agota un enemigo de cualquier localización (una vez por partida, en grupo).
  abilities: (state, self, investigator) => {
    const j = jewel(state).asset
    if (!j || j.owner !== investigator) return []
    const ready = Object.values(state.enemies).filter((e) => !e.exhausted)
    return ready.map((e): AbilityOption => ({
      key: `${self.id}:exhaust`,
      label: 'ability.gala.exhaustEnemy',
      params: { enemy: e.name },
      actions: 0,
      provokes: false,
      limit: { per: 'game', group: true },
      target: { type: 'enemy', id: e.id },
      then: [{ type: 'ExhaustEnemy', enemy: e.id }],
    }))
  },
})

// ---------------------------------------------------------------------------
// Puntuación y resoluciones
// ---------------------------------------------------------------------------

export interface Score {
  tasks: { key: string; points: number; n?: number }[]
  total: number
}

/** Puntuación de fin de partida (página 24 del reglamento del escenario). */
export function score(state: GameState): Score {
  const inVictory = (code: string) => state.victoryDisplay.includes(code)
  const manorNoClues = MANOR.filter((c) => {
    const l = state.locations[c]
    return l && l.revealed && l.clues === 0
  }).length
  const guests = Object.values(state.assets).filter((a) => isGuest(a.code)).length
  const investigators = state.investigators
  const defeated = investigators.some((i) => i.eliminated && !i.resigned)
  const players = state.startingInvestigatorCount
  const damage = investigators.reduce((n, i) => n + i.damage, 0)
  const horror = investigators.reduce((n, i) => n + i.horror, 0)
  const r = rival(state)
  const tasks = [
    { key: 'manorsWithNoClues', points: manorNoClues, n: manorNoClues },
    { key: 'guestAssetsControlled', points: guests, n: guests },
    { key: 'noSpellboundInPlay', points: spellbound(state).length === 0 ? 4 : 0 },
    { key: 'agenda1Or2', points: agendaNumber(state) <= 2 ? 5 : 0 },
    {
      key: 'bloodlessManInVictory',
      points: inVictory(CODES.bloodlessMan) || inVictory(CODES.bloodlessManUnleashed) ? 4 : 0,
    },
    {
      key: 'paleLanternInVictory',
      points: inVictory(CODES.paleLantern) || inVictory(CODES.paleLanternAura) ? 3 : 0,
    },
    { key: 'declanPearceInVictory', points: inVictory(CODES.declanPearce) ? 3 : 0 },
    { key: 'rivalInVictory', points: r && inVictory(`${FACTION_CARDS[r].story}b`) ? 4 : 0 },
    { key: 'damageBonus', points: !defeated && damage <= players * 2 ? 3 : 0 },
    { key: 'horrorBonus', points: !defeated && horror <= players * 2 ? 3 : 0 },
    { key: 'hardMode', points: state.difficulty === 'hard' ? 3 : 0 },
    { key: 'expertMode', points: state.difficulty === 'expert' ? 6 : 0 },
    { key: 'factionBonus', points: factionScore(state) },
  ]
  return { tasks, total: tasks.reduce((n, t) => n + t.points, 0) }
}

/** Puntos de la carta de Historia de la facción aliada. */
function factionScore(state: GameState): number {
  const players = state.startingInvestigatorCount
  switch (ally(state)) {
    case 'foundation': {
      const enemies = Object.values(state.enemies).filter((e) => !e.owner).length
      return enemies === 0 ? 4 : enemies === 1 ? 2 : 0
    }
    case 'miskatonic': {
      const cards = state.investigators.reduce((n, i) => n + i.hand.length, 0)
      return Math.min(4, Math.floor(cards / (2 * players)))
    }
    case 'syndicate': {
      const resources = state.investigators.reduce((n, i) => n + i.resources, 0)
      return Math.min(4, Math.floor(resources / (3 * players)))
    }
    case 'lodge':
      // Traiciones sin puntos de victoria en la zona de victoria (Carl Sanford las añade).
      return Math.min(4, state.victoryDisplay.filter((c) => TREACHERY_CODES.has(c)).length)
    case 'kingsport':
      return Math.max(0, 4 - (state.scenarioDecks?.guests?.length ?? 0))
    default:
      return 0
  }
}

/** Traiciones de este escenario (ninguna tiene puntos de victoria). */
const TREACHERY_CODES: Set<string> = new Set([
  ...encounterDeck()
    .filter((c) => c.kind === 'treachery')
    .map((c) => c.code),
  ...Object.keys(RIVAL_TREACHERIES),
  CODES.viciousAmbush,
])

const FACTION_RESOLUTION: Record<Faction, number> = {
  foundation: 2,
  miskatonic: 3,
  syndicate: 4,
  lodge: 5,
  kingsport: 6,
}

function scoreBonus(total: number): number {
  return total >= 50 ? 5 : total >= 40 ? 4 : total >= 30 ? 3 : total >= 20 ? 2 : total >= 10 ? 1 : 0
}

function resolutionStory(state: GameState, outcome: ScenarioOutcome): Message[] {
  const s = score(state)
  const bonus = scoreBonus(s.total)
  const final: Message[] = [
    {
      type: 'Story',
      entry: {
        ...story('resolution7'),
        effects: [
          { key: 'story.effect.experience', params: { bonus } },
          { key: 'story.midwinterGala.score.total', params: { n: s.total } },
          ...s.tasks
            .filter((t) => t.points > 0)
            .map((t) => ({
              key: `story.midwinterGala.score.${t.key}`,
              params: { points: t.points, n: t.n ?? 0 },
            })),
        ],
      },
    },
    { type: 'SetScenarioMeta', key: 'score', value: s.total },
    { type: 'EarnExperience', amount: bonus, victory: true },
  ]
  if (outcome.type === 'noResolution') {
    return [
      { type: 'Story', entry: story('noResolution') },
      ...final,
      { type: 'EndScenario', outcome, told: true },
    ]
  }
  const a = ally(state)
  return [
    { type: 'Story', entry: story('resolution1') },
    ...(a
      ? [{ type: 'Story', entry: story(`resolution${FACTION_RESOLUTION[a]}`) } as Message]
      : []),
    ...final,
    endScenario(resolution(a ? FACTION_RESOLUTION[a] : 1)),
  ]
}

registerScenario({ ...galaBehavior, resolution: resolutionStory })

/** Velo de la localización del investigador (Bleeding Walls). */
export const shroudHere = (state: GameState, investigator: InvestigatorId) => {
  const here = getInvestigator(state, investigator).location
  return here ? shroudOf(state, here) : 0
}
