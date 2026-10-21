/**
 * Asesinato en el hotel Excelsior: planes, actos, el interludio La verdad y las
 * diez versiones de El verdadero culpable.
 */
import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  shuffle,
  type AbilityOption,
  type Choice,
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
} from '@lcg/engine'
import { endScenario, resolution } from '../scenario-helpers'
import {
  CODES,
  CULPRIT_DOOM,
  ENCOUNTER_CARDS,
  LEAD_CARDS,
  SET_ASIDE_LOCATIONS,
  TRUE_CULPRIT,
  culpritName,
  type Lead,
} from './cards'
import { story } from './excelsior'
import {
  addReactions,
  ask,
  culprit,
  drawnLeads,
  enemiesWith,
  hasTrait,
  inVictory,
  isCrimeScene,
  leadAsset,
  leadAssets,
  leadId,
  log,
  onSpecific,
  perInv,
  remember,
  remembered,
  specific,
} from './helpers'

const COVER_UPS = ['cleanedUpTheBlood', 'hidTheBody', 'tidiedUpTheRoom'] as const

// ---------------------------------------------------------------------------
// Plan 1: El asesinato
// ---------------------------------------------------------------------------

registerAgenda({
  code: CODES.theMurder,
  // Despertar sospechas.
  onAdvance: (state) => {
    const lead = leadInvestigator(state)
    return [
      { type: 'Story', entry: story('murderBack') },
      {
        type: 'PlaceAsset',
        code: CODES.sergeantMonroe,
        name: 'Sergeant Monroe',
        placement: { type: 'location', location: CODES.foyer },
      },
      { type: 'SpawnSetAsideEnemy', code: CODES.arkhamOfficer, location: CODES.secondFloorHall },
      ...(state.startingInvestigatorCount >= 3
        ? [
            {
              type: 'SpawnSetAsideEnemy',
              code: CODES.arkhamOfficer,
              location: CODES.foyer,
            } as Message,
          ]
        : []),
      { type: 'ShuffleSetAsideIntoEncounter', codes: [CODES.arkhamOfficer] },
      specific('shuffleDiscardIntoEncounter'),
      ...(lead
        ? [
            {
              type: 'ResolveWeakness',
              investigator: lead.id,
              code: CODES.whatHaveYouDone,
            } as Message,
          ]
        : []),
    ]
  },
  // Con el plan 2 ya en juego: 1 pista en la Habitación 225 y 1 perdición en un
  // Agente de Arkham por cada cosa que los investigadores no hayan encubierto.
  afterAdvance: (state) =>
    COVER_UPS.filter((key) => !remembered(state, key)).flatMap((): Message[] => [
      { type: 'PlaceCluesOnLocationFromPool', location: CODES.room225, amount: 1 },
      specific('officerDoom'),
    ]),
})

onSpecific('officerDoom', (state) => {
  const officers = Object.values(state.enemies).filter((e) => e.code === CODES.arkhamOfficer)
  const [only] = officers
  if (!only) return state
  const doom = (id: string): Message => ({ type: 'PlaceDoomOnEnemy', enemy: id, amount: 1 })
  if (officers.length === 1) return push(state, doom(only.id))
  return push(
    state,
    ask(
      leadId(state),
      'prompt.excelsior.officerDoom',
      officers.map((e): Choice => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [doom(e.id)],
      })),
    ),
  )
})

// ---------------------------------------------------------------------------
// Plan 2: Investigación especial
// ---------------------------------------------------------------------------

/** Cada Policía preparado del Lugar se enfrenta al investigador y le ataca. */
function policeAttack(state: GameState, investigator: InvestigatorId): Message[] {
  const here = getInvestigator(state, investigator).location
  if (!here) return []
  return enemiesWith(state, 'Police')
    .filter((e) => e.location === here && !e.exhausted)
    .flatMap((e): Message[] => [
      { type: 'EngageEnemy', enemy: e.id, investigator },
      { type: 'EnemyAttack', enemy: e.id, investigator, exhaustAfter: false },
    ])
}

registerAgenda({
  code: CODES.specialInvestigation,
  forced: (state, trigger) => {
    // Tras descubrir pistas en su Lugar con un Policía preparado allí.
    if (trigger.type === 'afterDiscoverClues') {
      const here = getInvestigator(state, trigger.investigator).location
      return here === trigger.location ? policeAttack(state, trigger.investigator) : []
    }
    // Tras infligir daño a un Enemigo Humanoide.
    if (trigger.type === 'afterDealDamage') {
      const target = state.enemies[trigger.enemy]
      return target && hasTrait(target, 'Humanoid') ? policeAttack(state, trigger.investigator) : []
    }
    return []
  },
  // Más de lo que parece: no habéis resuelto el crimen (→R3).
  onAdvance: () => [
    { type: 'Story', entry: story('specialInvestigationBack') },
    { type: 'EndScenario', outcome: resolution(3) },
  ],
})

// ---------------------------------------------------------------------------
// Acto 1: ¿Qué ha pasado…?
// ---------------------------------------------------------------------------

registerAct({
  code: CODES.whatHappened,
  // [acción] Gasta 1 pista por investigador como grupo: roba la primera carta del mazo de Indicios.
  abilities: (state, _self, investigator): AbilityOption[] => {
    const cost = perInv(state, 1)
    const clues = activeInvestigators(state).reduce((n, i) => n + i.clues, 0)
    if (!(state.scenarioDecks?.leads?.length ?? 0) || clues < cost) return []
    return [
      {
        key: 'act:drawLead',
        label: 'ability.excelsior.drawLead',
        params: { n: cost },
        actions: 1,
        provokes: true,
        costs: [{ type: 'SpendGroupClues', amount: cost }],
        then: [specific('drawLead', { investigator })],
      },
    ]
  },
  // Objetivo: si los investigadores controlan 2 Apoyos Indicio.
  objectiveMet: (state) => leadAssets(state).length >= 2,
  // Hay que empezar por algún sitio…
  onAdvance: () => [
    { type: 'Story', entry: story('whatHappenedBack') },
    ...SET_ASIDE_LOCATIONS.map((l): Message => ({ type: 'PutLocationIntoPlay', location: l.id })),
    specific('leadEncounters'),
  ],
})

/** Revelación: el Indicio entra en juego en la zona de juego de quien lo roba. */
onSpecific('drawLead', (state, data) => {
  const [top, ...rest] = state.scenarioDecks?.leads ?? []
  if (!top) return state
  const investigator = String(data.investigator)
  const drawn = [
    ...String(state.scenarioMeta?.leads ?? '')
      .split(',')
      .filter(Boolean),
    top,
  ]
  return push(
    {
      ...state,
      scenarioDecks: { ...state.scenarioDecks, leads: rest },
      scenarioMeta: { ...(state.scenarioMeta ?? {}), leads: drawn.join(',') },
    },
    log('leadDrawn', {
      name: getInvestigator(state, investigator).name,
      card: playerCardDef(top)?.name ?? top,
    }),
    { type: 'PutAssetIntoPlay', investigator, code: top, noSlot: true },
    { type: 'CheckActObjective' },
  )
})

/**
 * Retira el resto del mazo de Indicios y añade al mazo de Encuentros las 3 copias
 * de la carta de cada Indicio en juego, junto con la pila de descartes.
 */
onSpecific('leadEncounters', (state) => {
  const codes = leadAssets(state).map((a) => LEAD_CARDS[a.code as Lead].code)
  return push(
    { ...state, scenarioDecks: { ...state.scenarioDecks, leads: [] } },
    { type: 'ShuffleSetAsideIntoEncounter', codes },
    specific('shuffleDiscardIntoEncounter'),
  )
})

// ---------------------------------------------------------------------------
// Acto 2: Investigando indicios (el permiso para avanzar está en excelsior.ts)
// ---------------------------------------------------------------------------

registerAct({
  code: CODES.followingLeads,
  // La verdad: lee el interludio del escenario.
  onAdvance: () => [specific('truth1')],
})

// ---------------------------------------------------------------------------
// Interludio del escenario: La verdad
// ---------------------------------------------------------------------------

onSpecific('truth1', (state) =>
  push(state, {
    type: 'Story',
    entry: story('truth1'),
    choices: [
      { label: 'story.excelsior.tellTheTruth', then: [specific('truth2')] },
      { label: 'story.excelsior.lie', then: [specific('truth3')] },
    ],
  }),
)

const noInnocents = (state: GameState) => inVictory(state, 'Innocent') === 0

onSpecific('truth2', (state) => {
  const nothingToHide = COVER_UPS.every((key) => !remembered(state, key))
  const evidence = leadAssets(state).every((a) => (a.clues ?? 0) >= perInv(state, 2))
  const believed = nothingToHide && evidence && noInnocents(state)
  return push(
    state,
    { type: 'Story', entry: story('truth2') },
    specific(believed ? 'truth5' : 'truth4'),
  )
})

onSpecific('truth3', (state) => {
  const coveredUp = COVER_UPS.every((key) => remembered(state, key))
  const believed = coveredUp && noInnocents(state)
  return push(
    state,
    { type: 'Story', entry: story('truth3') },
    specific(believed ? 'truth6' : 'truth4'),
  )
})

onSpecific('truth4', (state) =>
  push(
    state,
    { type: 'Story', entry: story('truth4') },
    remember('policeDontBelieveYou'),
    specific('removeMonroe'),
    specific('removeOfficers'),
    specific('shuffleDiscardIntoEncounter'),
    specific('truth7'),
  ),
)

const takeMonroe = (state: GameState): Message =>
  ask(
    leadId(state),
    'prompt.excelsior.takeMonroe',
    activeInvestigators(state).map((i): Choice => ({
      label: 'choice.investigator',
      params: { name: i.name },
      target: { type: 'investigator', id: i.id },
      then: [specific('giveMonroe', { investigator: i.id })],
    })),
  )

onSpecific('truth5', (state) =>
  push(
    state,
    { type: 'Story', entry: story('truth5') },
    remember('policeOnYourSide'),
    takeMonroe(state),
    specific('removeOfficers'),
    specific('truth7'),
  ),
)

onSpecific('truth6', (state) =>
  push(
    state,
    { type: 'Story', entry: story('truth6') },
    remember('policeOnYourSide'),
    takeMonroe(state),
    specific('removeOfficers'),
    specific('shuffleDiscardIntoEncounter'),
    specific('truth7'),
  ),
)

/** Retira de la partida al Sargento Monroe, esté donde esté. */
onSpecific('removeMonroe', (state) => {
  const placed = Object.values(state.placedAssets ?? {}).find(
    (p) => p.code === CODES.sergeantMonroe,
  )
  const asset = leadAsset(state, CODES.sergeantMonroe)
  const assets = { ...state.assets }
  if (asset) delete assets[asset.id]
  const placedAssets = { ...(state.placedAssets ?? {}) }
  if (placed) delete placedAssets[placed.id]
  return { ...state, assets, placedAssets }
})

/** El investigador elegido toma el control del Sargento Monroe (en su zona de amenaza). */
onSpecific('giveMonroe', (state, data) => {
  const investigator = String(data.investigator)
  const placed = Object.values(state.placedAssets ?? {}).find(
    (p) => p.code === CODES.sergeantMonroe,
  )
  if (placed) return push(state, { type: 'TakeControlOfPlaced', placed: placed.id, investigator })
  const asset = leadAsset(state, CODES.sergeantMonroe)
  if (asset) return push(state, specific('setOwner', { asset: asset.id, investigator }))
  return push(state, {
    type: 'PutAssetIntoPlay',
    investigator,
    code: CODES.sergeantMonroe,
    noSlot: true,
  })
})

/** Retira de la partida todas las copias del Agente de Arkham (mazo, descartes y juego). */
onSpecific('removeOfficers', (state) => {
  const isOfficer = (c: EncounterCard) => c.code === CODES.arkhamOfficer
  return push(
    {
      ...state,
      encounterDeck: state.encounterDeck.filter((c) => !isOfficer(c)),
      encounterDiscard: state.encounterDiscard.filter((c) => !isOfficer(c)),
      setAside: state.setAside.filter((c) => !isOfficer(c)),
    },
    ...Object.values(state.enemies)
      .filter((e) => e.code === CODES.arkhamOfficer)
      .map((e): Message => ({ type: 'RemoveEnemyFromGame', enemy: e.id })),
  )
})

/** Pares de Indicios de La verdad 7, en el orden del reglamento (v. I a v. X). */
const PAIRS: [Lead, Lead][] = [
  [CODES.alienDevice, CODES.timeWornLocket],
  [CODES.alienDevice, CODES.sinisterSolution],
  [CODES.alienDevice, CODES.managersKey],
  [CODES.alienDevice, CODES.tomeOfRituals],
  [CODES.timeWornLocket, CODES.sinisterSolution],
  [CODES.timeWornLocket, CODES.managersKey],
  [CODES.timeWornLocket, CODES.tomeOfRituals],
  [CODES.sinisterSolution, CODES.managersKey],
  [CODES.sinisterSolution, CODES.tomeOfRituals],
  [CODES.managersKey, CODES.tomeOfRituals],
]

/** Versión de El verdadero culpable según los dos Indicios que se robaron. */
export function culpritFor(leads: Lead[]): number {
  const index = PAIRS.findIndex(([a, b]) => leads.includes(a) && leads.includes(b))
  return index + 1
}

onSpecific('truth7', (state) => {
  const version = culpritFor(drawnLeads(state))
  if (version === 0) return push(state, log('noCulprit'))
  return push(
    state,
    { type: 'RemoveAllDoom' },
    { type: 'Story', entry: story('truth7') },
    { type: 'Story', entry: story(`culprit${version}`) },
    specific('culprit', { version }),
  )
})

/** El verdadero culpable pasa a ser a la vez el plan y el acto en curso. */
onSpecific('culprit', (state, data) => {
  const version = Number(data.version)
  const code = TRUE_CULPRIT[version - 1]!
  const name = culpritName(version)
  const next: GameState = {
    ...state,
    agendas: [...state.agendas, { code, name, doomThreshold: CULPRIT_DOOM[version - 1]! }],
    agendaIndex: state.agendas.length,
    acts: [
      ...state.acts,
      { code, name, clueThreshold: 0, cluesPerInvestigator: false, advanceTiming: 'objective' },
    ],
  }
  return push(next, ...culpritSetup(next, version), log('culprit', { card: name }))
})

const moveLeadClues = (from: Lead, to: Lead) => specific('moveLeadClues', { from, to })

onSpecific('moveLeadClues', (state, data) => {
  const from = leadAsset(state, String(data.from))
  const to = leadAsset(state, String(data.to))
  if (!from || !to || !from.clues) return state
  return push(state, {
    type: 'MoveClues',
    from: { type: 'asset', id: from.id },
    to: { type: 'asset', id: to.id },
    amount: from.clues,
  })
})

const spawn = (code: string, location: LocationId): Message => ({
  type: 'SpawnSetAsideEnemy',
  code,
  location,
})

/** Instrucciones de La verdad 7 para cada versión. */
function culpritSetup(state: GameState, version: number): Message[] {
  const meddlerDoom = (amount: number) => specific('meddlerDoom', { amount })
  const harvestedBrain: Message = {
    type: 'PlaceSetAsideTreachery',
    code: CODES.harvestedBrain,
    placement: { type: 'location', location: CODES.room212 },
  }
  switch (version) {
    case 1:
      return [
        moveLeadClues(CODES.timeWornLocket, CODES.alienDevice),
        spawn(CODES.vengefulSpecter, CODES.room245),
      ]
    case 2:
      return [
        moveLeadClues(CODES.alienDevice, CODES.sinisterSolution),
        spawn(CODES.otherworldlyMeddler, CODES.hotelRoof),
        meddlerDoom(perInv(state, 1)),
      ]
    case 3:
      return [
        moveLeadClues(CODES.managersKey, CODES.alienDevice),
        spawn(CODES.hotelManager, CODES.restaurant),
      ]
    case 4:
      return [
        moveLeadClues(CODES.alienDevice, CODES.tomeOfRituals),
        spawn(CODES.otherworldlyMeddler, CODES.hotelRoof),
        meddlerDoom(2 + perInv(state, 2)),
      ]
    case 5:
      return [
        moveLeadClues(CODES.timeWornLocket, CODES.sinisterSolution),
        spawn(CODES.vengefulSpecter, CODES.room245),
      ]
    case 6:
      return [
        moveLeadClues(CODES.managersKey, CODES.timeWornLocket),
        spawn(CODES.hotelManager, CODES.restaurant),
      ]
    case 7:
      return [
        spawn(CODES.dimensionalShambler, CODES.basement),
        specific('fromVictory', { trait: 'Guest' }),
        specific('discardUntil', {
          traits: 'Guest,Cultist',
          amount: 1 + perInv(state, 1),
          at: 'crimeScene',
        }),
        specific('cultify'),
      ]
    case 8:
      return [
        specific('fromVictory', { trait: 'Staff' }),
        specific('discardUntil', {
          traits: 'Staff',
          amount: state.startingInvestigatorCount >= 3 ? 2 : 1,
          at: CODES.foyer,
        }),
        harvestedBrain,
      ]
    case 9:
      return [moveLeadClues(CODES.sinisterSolution, CODES.tomeOfRituals), harvestedBrain]
    default:
      return [
        spawn(CODES.dimensionalShambler, CODES.basement),
        specific('fromVictory', { trait: 'Guest' }),
        specific('cultify'),
        { type: 'PlaceDoom', amount: perInv(state, 2) },
      ]
  }
}

onSpecific('meddlerDoom', (state, data) => {
  const meddler = Object.values(state.enemies).find((e) => e.code === CODES.otherworldlyMeddler)
  return meddler
    ? push(state, { type: 'PlaceDoomOnEnemy', enemy: meddler.id, amount: Number(data.amount) })
    : state
})

/**
 * Añade la pila de descartes de Encuentros y todos los Enemigos con el rasgo de la
 * zona de victoria al mazo de Encuentros y lo baraja.
 */
onSpecific('fromVictory', (state, data) => {
  const trait = String(data.trait)
  const back = state.victoryDisplay.filter((c) => ENCOUNTER_CARDS[c]?.traits?.includes(trait))
  const [encounterDeck, rng] = shuffle(
    [
      ...state.encounterDeck,
      ...state.encounterDiscard,
      ...back.map((c) => ({ ...ENCOUNTER_CARDS[c]! })),
    ],
    state.rng,
  )
  const points = back.reduce((n, c) => {
    const card = ENCOUNTER_CARDS[c]
    return n + (card?.kind === 'enemy' ? (card.victory ?? 0) : 0)
  }, 0)
  return {
    ...state,
    rng,
    encounterDeck,
    encounterDiscard: [],
    victoryDisplay: state.victoryDisplay.filter((c) => !back.includes(c)),
    victoryPoints: (state.victoryPoints ?? 0) - points,
  }
})

/**
 * Descarta cartas del mazo de Encuentros hasta descartar `amount` Enemigos con
 * alguno de los rasgos, y los hace aparecer: cada uno en una Escena del crimen
 * distinta al azar (vacía si es posible) o en el Lugar indicado.
 */
onSpecific('discardUntil', (state, data) => {
  const traits = String(data.traits).split(',')
  const amount = Number(data.amount)
  const found: EnemyCard[] = []
  const discarded: EncounterCard[] = []
  let deck = state.encounterDeck
  while (deck.length > 0 && found.length < amount) {
    const [card, ...rest] = deck
    deck = rest
    if (card!.kind === 'enemy' && traits.some((t) => hasTrait(card!, t)))
      found.push(card as EnemyCard)
    else discarded.push(card!)
  }
  let next: GameState = {
    ...state,
    encounterDeck: deck,
    encounterDiscard: [...state.encounterDiscard, ...discarded],
  }
  let places: LocationId[] = []
  if (data.at === 'crimeScene') {
    const scenes = Object.keys(next.locations).filter((l) => isCrimeScene(next, l))
    const occupied = (l: LocationId) =>
      activeInvestigators(next).some((i) => i.location === l) ||
      Object.values(next.enemies).some((e) => e.location === l)
    const [shuffled, rng] = shuffle(scenes, next.rng)
    next = { ...next, rng }
    places = [...shuffled.filter((l) => !occupied(l)), ...shuffled.filter(occupied)]
  }
  return push(
    next,
    ...found.map((card, n): Message => ({
      type: 'SpawnEnemy',
      card,
      location:
        data.at === 'crimeScene' ? (places[n % places.length] ?? CODES.foyer) : String(data.at),
      engageWith: null,
    })),
  )
})

/** v. VII y X: cada Cliente pierde Victoria 0 e Inocente, y obtiene Sectario. */
onSpecific('cultify', (state) => {
  const enemies = { ...state.enemies }
  for (const e of Object.values(enemies)) {
    if (!hasTrait(e, 'Guest') || hasTrait(e, 'Cultist')) continue
    const { victory: _lost, ...rest } = e
    enemies[e.id] = {
      ...rest,
      traits: [...(e.traits ?? []).filter((t) => t !== 'Innocent'), 'Cultist'],
    }
  }
  return { ...state, enemies }
})

// ---------------------------------------------------------------------------
// El verdadero culpable: objetivos, reverso y capacidades
// ---------------------------------------------------------------------------

const inPlay = (state: GameState, code: string) =>
  Object.values(state.enemies).find((e) => e.code === code)
const defeated = (state: GameState, code: string) => state.victoryDisplay.includes(code)

/** Cerebro extraído en juego. */
export const harvestedBrainCard = (state: GameState) =>
  Object.values(state.treacheries).find((t) => t.code === CODES.harvestedBrain)

const OBJECTIVES: ((state: GameState) => boolean)[] = [
  (s) => defeated(s, CODES.vengefulSpecter),
  (s) => defeated(s, CODES.otherworldlyMeddler),
  (s) => defeated(s, CODES.hotelManager),
  (s) => {
    const meddler = inPlay(s, CODES.otherworldlyMeddler)
    return defeated(s, CODES.otherworldlyMeddler) || (!!meddler && !meddler.doom)
  },
  (s) => {
    const specter = inPlay(s, CODES.vengefulSpecter)
    return (
      defeated(s, CODES.vengefulSpecter) ||
      (!!specter && (specter.clues ?? 0) >= specter.maxHealth - specter.damageTaken)
    )
  },
  (s) => defeated(s, CODES.hotelManager),
  (s) => enemiesWith(s, 'Cultist').length === 0,
  (s) => (harvestedBrainCard(s)?.horror ?? 0) >= 2 + perInv(s, 1),
  (s) => (harvestedBrainCard(s)?.clues ?? 0) >= perInv(s, 3),
  (s) => s.doom === 0,
]

TRUE_CULPRIT.forEach((code, n) => {
  const version = n + 1
  registerAct({
    code,
    objectiveMet: OBJECTIVES[n]!,
    // Si avanza porque habéis completado su objetivo (→R1).
    onAdvance: () => [
      { type: 'Story', entry: story(`culpritObjective${version}`) },
      endScenario(resolution(1)),
    ],
  })
  registerAgenda({
    code,
    // Si avanza por llegar a su umbral de perdición (→R2).
    onAdvance: () => [
      { type: 'Story', entry: story(`culpritDoom${version}`) },
      { type: 'EndScenario', outcome: resolution(2) },
    ],
    // v. VII y X: los Clientes que entren en juego también son Sectarios.
    forced: (_state, trigger) =>
      (version === 7 || version === 10) && trigger.type === 'enemySpawned'
        ? [specific('cultify')]
        : [],
    abilities: (state, _self, investigator) => culpritAbilities(state, version, investigator),
  })
})

/** Capacidades que obtienen los Lugares con El verdadero culpable (v. IX y X). */
function culpritAbilities(
  state: GameState,
  version: number,
  investigator: InvestigatorId,
): AbilityOption[] {
  const here = getInvestigator(state, investigator).location
  // v. IX, Habitación 212: si el Tomo de rituales está aquí, [willpower] o [intellect] (5).
  if (version === 9 && here === CODES.room212) {
    const tome = leadAsset(state, CODES.tomeOfRituals)
    if (!tome || getInvestigator(state, tome.owner).location !== here) return []
    return (['willpower', 'intellect'] as const).map((skill) => ({
      key: `culprit9:${skill}`,
      label: 'ability.excelsior.feedBrain',
      params: { skill },
      actions: 1,
      provokes: true,
      target: { type: 'location', id: CODES.room212 },
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          skill,
          difficulty: 5,
          kind: {
            type: 'effect',
            source: 'Room 212',
            onSuccess: [specific('feedBrain', { investigator })],
            onFail: [],
            onFailEach: [],
          },
        },
      ],
    }))
  }
  // v. X, Sótano: [willpower] o [agility] (4); retirar 1 pista de un Indicio aquí: -2.
  if (version === 10 && here === CODES.basement) {
    return [
      {
        key: 'culprit10',
        label: 'ability.excelsior.stopRitual',
        actions: 1,
        provokes: true,
        target: { type: 'location', id: CODES.basement },
        then: [specific('stopRitual', { investigator })],
      },
    ]
  }
  return []
}

/** v. IX: mueve hasta 1 pista por investigador del Tomo de rituales al Cerebro extraído. */
onSpecific('feedBrain', (state, data) => {
  const tome = leadAsset(state, CODES.tomeOfRituals)
  const brain = harvestedBrainCard(state)
  if (!tome || !brain || !tome.clues) return state
  const limit = Math.min(tome.clues, perInv(state, 1))
  return push(
    state,
    ask(
      String(data.investigator),
      'prompt.excelsior.feedBrain',
      Array.from({ length: limit + 1 }, (_, n): Choice => ({
        label: 'choice.excelsior.moveCluesTo',
        params: { n },
        then:
          n > 0
            ? [
                {
                  type: 'MoveClues',
                  from: { type: 'asset', id: tome.id },
                  to: { type: 'treachery', id: brain.id },
                  amount: n,
                },
                { type: 'CheckActObjective' },
              ]
            : [],
      })),
    ),
  )
})

/** v. X: elige la habilidad y, si quieres, retira 1 pista de un Indicio del Sótano (-2). */
onSpecific('stopRitual', (state, data) => {
  const investigator = String(data.investigator)
  const leads = leadAssets(state).filter(
    (a) => (a.clues ?? 0) > 0 && getInvestigator(state, a.owner).location === CODES.basement,
  )
  const test = (skill: 'willpower' | 'agility', difficulty: number): Message => ({
    type: 'BeginSkillTest',
    investigator,
    skill,
    difficulty,
    kind: {
      type: 'effect',
      source: 'Basement',
      onSuccess: [
        { type: 'RemoveDoom', target: { type: 'agenda' }, amount: 1 },
        { type: 'CheckActObjective' },
      ],
      onFail: [],
      onFailEach: [],
    },
  })
  const choices: Choice[] = (['willpower', 'agility'] as const).flatMap((skill) => [
    {
      label: `choice.test.${skill}`,
      params: { difficulty: 4 },
      then: [test(skill, 4)],
    },
    ...leads.map((a): Choice => ({
      label: 'choice.excelsior.leadClueEasier',
      params: { skill, card: playerCardDef(a.code)?.name ?? a.code },
      then: [
        {
          type: 'MoveClues',
          from: { type: 'asset', id: a.id },
          to: { type: 'pool' },
          amount: 1,
        },
        test(skill, 2),
      ],
    })),
  ])
  return push(state, ask(investigator, 'prompt.chooseSkill', choices))
})

// v. VIII: tras derrotar a un Enemigo Personal, 1 horror al Cerebro extraído (una vez).
addReactions((state, trigger) => {
  if (culprit(state) !== 8 || trigger.type !== 'enemyDefeated') return []
  if (!hasTrait(trigger.enemy, 'Staff')) return []
  const brain = harvestedBrainCard(state)
  if (!brain) return []
  return activeInvestigators(state).map((i) => ({
    key: `culprit8:${trigger.enemy.id}`,
    investigator: i.id,
    label: 'ability.excelsior.brainHorror',
    target: { type: 'treachery', id: brain.id },
    then: [specific('brainHorror'), { type: 'CheckActObjective' }],
  }))
})

onSpecific('brainHorror', (state) => {
  const brain = harvestedBrainCard(state)
  if (!brain) return state
  return {
    ...state,
    treacheries: {
      ...state.treacheries,
      [brain.id]: { ...brain, horror: (brain.horror ?? 0) + 1 },
    },
  }
})
