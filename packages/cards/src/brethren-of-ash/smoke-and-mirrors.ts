/**
 * Escenario II de Brethren of Ash: "Smoke and Mirrors" (caja básica de 2026).
 * Análisis en docs-proyecto/11-smoke-and-mirrors.md.
 *
 * Los investigadores buscan a seis sospechosos por Arkham: pueden derrotarlos o
 * interrogarlos con su entrada del códex (pistas puestas sobre ellos hasta tener
 * 1 por investigador). Seis Élite en la zona de victoria y/o debajo del acto
 * avanzan el acto (resolución 1).
 *
 * Los efectos están implementados a partir de su descripción; no se incluye el
 * texto de las cartas.
 */
import {
  activeInvestigators,
  enemiesAt,
  getInvestigator,
  getLocation,
  investigatorsAt,
  nearestLocation,
  nextInt,
  playerCardDef,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerPlayerCards,
  registerScenario,
  registerTreachery,
  seedRng,
  shuffle,
  type CampaignLog,
  type Choice,
  type Enemy,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type Message,
  type ReactionOption,
  type ScenarioDefinition,
  type ScenarioOutcome,
  type StoryEntry,
} from '@lcg/engine'
import { CHAOS_BAGS, type Difficulty } from './campaign'
import {
  chooseSkillTest,
  copies,
  damage,
  effectTest,
  enemy,
  noteEffect,
  recordNote,
  resignAbility,
  storyEntries,
  treachery,
} from '../scenario-helpers'
import { DR_ARMITAGE } from './spreading-flames'

export const SMOKE_AND_MIRRORS = 'smoke-and-mirrors'

export const CODES = {
  arkhamAlive: '12134',
  emergentEvils: '12135',
  augursOfFlame: '12136',
  markOfElokoss: '12137',
  servantOfFlame: '12138',
  davidRenfield: '12139',
  corneliaAkely: '12140',
  naomiOBannion: '12141',
  earlMonroe: '12142',
  abigailForeman: '12143',
  margaretLiu: '12144',
  downtownBank: '12145',
  downtownSanatorium: '12146',
  uptownHospital: '12147',
  uptownShoppe: '12148',
  northside: '12149',
  easttown: '12150',
  merchantDistrict: '12151',
  waterfrontDistrict: '12152',
  southside: '12153',
  frenchHill: '12154',
  universityInFlames: '12155',
  universityQuietCampus: '12156',
  arcaneLock: '12157',
  downpour: '12158',
  flashFlood: '12159',
  raisingSuspicions: '12160',
  redHerring: '12161',
  batHorror: '12162',
  aerialPursuit: '12163',
  rogueGangster: '12164',
  crossfire: '12165',
  whippoorwill: '12166',
  eagerForDeath: '12167',
} as const

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

export const servantOnTheRun = enemy({
  code: CODES.servantOfFlame,
  name: 'Servant of Flame',
  traits: ['Humanoid', 'Cultist', 'Elite'],
  fight: 4,
  health: 5,
  healthPerInvestigator: true,
  evade: 4,
  damage: 2,
  horror: 2,
  keywords: ['elusive', 'hunter', 'retaliate'],
  victory: 1,
})

/** Los seis sospechosos (conjunto People of Arkham). */
export const suspects: EnemyCard[] = [
  enemy({
    code: CODES.davidRenfield,
    name: 'David Renfield',
    traits: ['Humanoid', 'Silver Twilight', 'Elite'],
    fight: 1,
    health: 5,
    evade: 4,
    damage: 0,
    horror: 1,
    keywords: ['aloof'],
    victory: 1,
  }),
  enemy({
    code: CODES.corneliaAkely,
    name: 'Cornelia Akely',
    traits: ['Humanoid', 'Worker', 'Elite'],
    fight: 3,
    health: 4,
    evade: 3,
    damage: 1,
    horror: 0,
    keywords: ['alert'],
    victory: 1,
  }),
  enemy({
    code: CODES.naomiOBannion,
    name: "Naomi O'Bannion",
    traits: ['Humanoid', 'Syndicate', 'Elite'],
    fight: 4,
    health: 5,
    evade: 2,
    damage: 1,
    horror: 1,
    keywords: ['retaliate'],
    victory: 1,
  }),
  enemy({
    code: CODES.earlMonroe,
    name: 'Sgt. Earl Monroe',
    traits: ['Humanoid', 'Police', 'Elite'],
    fight: 3,
    health: 4,
    evade: 3,
    damage: 1,
    horror: 1,
    keywords: ['elusive'],
    victory: 1,
  }),
  enemy({
    code: CODES.abigailForeman,
    name: 'Abigail Foreman',
    traits: ['Humanoid', 'Miskatonic', 'Elite'],
    fight: 2,
    health: 4,
    evade: 4,
    damage: 0,
    horror: 1,
    keywords: ['aloof'],
    victory: 1,
  }),
  enemy({
    code: CODES.margaretLiu,
    name: 'Margaret Liu',
    traits: ['Humanoid', 'Socialite', 'Elite'],
    fight: 1,
    health: 3,
    evade: 5,
    damage: 0,
    horror: 1,
    keywords: ['aloof'],
    victory: 1,
  }),
]

const ELITES = new Set<string>([CODES.servantOfFlame, ...suspects.map((s) => s.code)])

const batHorror = enemy({
  code: CODES.batHorror,
  name: 'Bat Horror',
  traits: ['Monster'],
  fight: 3,
  health: 4,
  evade: 4,
  damage: 1,
  horror: 1,
  keywords: ['elusive', 'hunter'],
})
const rogueGangster = enemy({
  code: CODES.rogueGangster,
  name: 'Rogue Gangster',
  traits: ['Humanoid', 'Syndicate'],
  fight: 3,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: ['hunter', 'retaliate'],
  prey: { type: 'mostResources' },
})
const whippoorwill = enemy({
  code: CODES.whippoorwill,
  name: 'Whippoorwill',
  traits: ['Creature'],
  fight: 2,
  health: 1,
  evade: 4,
  damage: 0,
  horror: 1,
  keywords: ['aloof', 'hunter'],
})

export const markOfElokoss = treachery({
  code: CODES.markOfElokoss,
  name: 'Mark of Elokoss',
  traits: ['Curse'],
  keywords: [],
})

// La marca también es una debilidad de jugador: los portadores la llevan en el mazo.
registerPlayerCards([
  {
    code: CODES.markOfElokoss,
    name: 'Mark of Elokoss',
    type: 'treachery',
    class: 'neutral',
    traits: ['Curse'],
    weakness: 'story',
  },
])

const encounterDeck = [
  ...copies(
    treachery({
      code: CODES.arcaneLock,
      name: 'Arcane Lock',
      traits: ['Hex', 'Obstacle'],
      keywords: [],
    }),
    2,
  ),
  ...copies(
    treachery({ code: CODES.downpour, name: 'Downpour', traits: ['Hazard'], keywords: [] }),
    2,
  ),
  ...copies(
    treachery({ code: CODES.flashFlood, name: 'Flash Flood', traits: ['Hazard'], keywords: [] }),
    2,
  ),
  ...copies(
    treachery({
      code: CODES.raisingSuspicions,
      name: 'Raising Suspicions',
      traits: ['Blunder'],
      keywords: [],
    }),
    2,
  ),
  ...copies(
    treachery({ code: CODES.redHerring, name: 'Red Herring', traits: ['Scheme'], keywords: [] }),
    2,
  ),
  ...copies(batHorror, 2),
  ...copies(
    treachery({
      code: CODES.aerialPursuit,
      name: 'Aerial Pursuit',
      traits: ['Scheme'],
      keywords: ['surge'],
    }),
    2,
  ),
  ...copies(rogueGangster, 2),
  ...copies(
    treachery({ code: CODES.crossfire, name: 'Crossfire', traits: ['Hazard'], keywords: [] }),
    2,
  ),
  ...copies(whippoorwill, 3),
  ...copies(
    treachery({
      code: CODES.eagerForDeath,
      name: 'Eager for Death',
      traits: ['Omen'],
      keywords: [],
    }),
    2,
  ),
]

const location = (card: LocationCard): LocationCard => card

/** Localizaciones con sus conexiones (símbolos de las cartas). */
const LOCATIONS = {
  northside: location({
    id: CODES.northside,
    position: [0, 0],
    name: 'Northside',
    shroud: 3,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: ['university', 'downtown'],
  }),
  downtownBank: location({
    id: CODES.downtownBank,
    position: [1, 0],
    name: 'Downtown',
    shroud: 4,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [CODES.easttown, CODES.northside],
    victory: 1,
  }),
  downtownSanatorium: location({
    id: CODES.downtownSanatorium,
    position: [1, 0],
    name: 'Downtown',
    shroud: 4,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [CODES.easttown, CODES.northside],
    victory: 1,
  }),
  easttown: location({
    id: CODES.easttown,
    position: [2, 0],
    name: 'Easttown',
    shroud: 2,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [CODES.merchantDistrict, 'downtown', CODES.waterfrontDistrict],
  }),
  merchantDistrict: location({
    id: CODES.merchantDistrict,
    position: [1, 1],
    name: 'Merchant District',
    shroud: 3,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [CODES.easttown, 'university', CODES.southside, CODES.waterfrontDistrict],
  }),
  waterfrontDistrict: location({
    id: CODES.waterfrontDistrict,
    position: [2, 1],
    name: 'Waterfront District',
    shroud: 1,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [CODES.merchantDistrict, CODES.easttown],
    victory: 1,
    investigateExtraActions: 1,
  }),
  universityInFlames: location({
    id: CODES.universityInFlames,
    position: [0, 1],
    name: 'Miskatonic University',
    shroud: 4,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [CODES.northside, 'uptown', CODES.merchantDistrict],
    victory: 1,
  }),
  universityQuietCampus: location({
    id: CODES.universityQuietCampus,
    position: [0, 1],
    name: 'Miskatonic University',
    shroud: 2,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [CODES.northside, 'uptown', CODES.merchantDistrict],
    victory: 1,
  }),
  uptownHospital: location({
    id: CODES.uptownHospital,
    position: [0, 2],
    name: 'Uptown',
    shroud: 2,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: ['university', CODES.southside],
  }),
  uptownShoppe: location({
    id: CODES.uptownShoppe,
    position: [0, 2],
    name: 'Uptown',
    shroud: 3,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: ['university', CODES.southside],
  }),
  southside: location({
    id: CODES.southside,
    position: [1, 2],
    name: 'Southside',
    shroud: 2,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: ['uptown', CODES.frenchHill, CODES.merchantDistrict],
  }),
  frenchHill: location({
    id: CODES.frenchHill,
    position: [2, 2],
    name: 'French Hill',
    shroud: 4,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [CODES.southside],
    victory: 1,
  }),
}

export interface SmokeAndMirrorsOptions {
  difficulty?: Difficulty
  /** Registro de campaña (Universidad quemada o salvada, portador de Armitage). */
  log?: CampaignLog
  /** Semilla para las elecciones al azar de la preparación. */
  seed?: number
  /** Investigadores en la partida (1 perdición inicial por cada uno). */
  players?: number
}

/**
 * Preparación (guía de campaña, página 6): un Downtown y un Uptown al azar, la
 * Universidad según el registro, un sospechoso apartado al azar (el heraldo) y
 * los otros cinco más Servant of Flame boca abajo bajo seis localizaciones.
 */
export function smokeAndMirrors(options: SmokeAndMirrorsOptions = {}): ScenarioDefinition {
  const { difficulty = 'standard', log } = options
  let rng = seedRng(options.seed ?? 1)
  let pick: number
  ;[pick, rng] = nextInt(rng, 2)
  const downtown = pick === 0 ? LOCATIONS.downtownBank : LOCATIONS.downtownSanatorium
  ;[pick, rng] = nextInt(rng, 2)
  const uptown = pick === 0 ? LOCATIONS.uptownHospital : LOCATIONS.uptownShoppe
  const saved = log?.notes.includes('savedUniversity') ?? false
  const university = saved ? LOCATIONS.universityQuietCampus : LOCATIONS.universityInFlames
  // Las conexiones genéricas ("downtown", "uptown", "university") apuntan a la versión elegida.
  const resolve = (id: string) =>
    id === 'downtown'
      ? downtown.id
      : id === 'uptown'
        ? uptown.id
        : id === 'university'
          ? university.id
          : id
  const inPlay = [
    LOCATIONS.northside,
    downtown,
    LOCATIONS.easttown,
    university,
    LOCATIONS.merchantDistrict,
    LOCATIONS.waterfrontDistrict,
    uptown,
    LOCATIONS.southside,
    LOCATIONS.frenchHill,
  ].map((l) => ({ ...l, connections: l.connections.map(resolve) }))

  // El heraldo de Elokoss: un sospechoso apartado al azar, sin mirar.
  const [order, afterOrder] = shuffle(suspects, rng)
  const [harbinger, ...rest] = order as [EnemyCard, ...EnemyCard[]]
  const [beneath] = shuffle([...rest, servantOnTheRun], afterOrder)
  const dealt = [
    CODES.northside,
    downtown.id,
    CODES.southside,
    CODES.frenchHill,
    uptown.id,
    CODES.waterfrontDistrict,
  ]
  const locations = inPlay.map((l) => {
    const n = dealt.indexOf(l.id)
    return n >= 0 && beneath[n] ? { ...l, beneath: [{ ...beneath[n]! }] } : l
  })

  // Dr. Armitage entra en juego bajo el control de su portador, sin ocupar ranura.
  const bearer = Object.entries(log?.investigators ?? {}).find(([, r]) =>
    r.storyAssets.includes(DR_ARMITAGE),
  )?.[0]
  const perInvestigatorDoom = options.players ?? 1

  return {
    id: SMOKE_AND_MIRRORS,
    intro: { title: 'story.smokeAndMirrors.introTitle', body: 'story.smokeAndMirrors.intro' },
    locations,
    startingLocation: university.id,
    agendas: [
      { code: CODES.arkhamAlive, name: 'Arkham Alive', doomThreshold: 10 },
      { code: CODES.emergentEvils, name: 'Emergent Evils', doomThreshold: 8 },
    ],
    acts: [
      {
        code: CODES.augursOfFlame,
        name: 'Augurs of Flame',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck,
    setAside: [{ ...harbinger }, ...copies(markOfElokoss, 4)],
    // Se añaden 2 fichas de sectario a la bolsa para el resto de la campaña.
    chaosBag: [...CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      ...(log?.chaosTokens.filter((t) => t === 'cultist').length
        ? []
        : [{ type: 'AddChaosTokens', tokens: ['cultist', 'cultist'] } as Message]),
      { type: 'PlaceDoom', amount: perInvestigatorDoom + (saved ? 1 : 0) },
      ...(bearer
        ? [
            {
              type: 'PutAssetIntoPlay',
              investigator: bearer,
              code: DR_ARMITAGE,
              noSlot: true,
            } as Message,
          ]
        : []),
    ],
  }
}

// ---------------------------------------------------------------------------
// Tarjeta de referencia
// ---------------------------------------------------------------------------

/** Enemigos Élite en la zona de victoria y debajo del acto. */
export const eliteCount = (state: GameState) =>
  state.victoryDisplay.filter((c) => ELITES.has(c)).length + (state.underAct ?? []).length

/** La prueba en curso se dirige contra un enemigo Élite (lucha, evitar o parlamento con él). */
function targetsElite(state: GameState): boolean {
  const test = state.skillTest
  if (!test) return false
  if (test.tags?.includes('elite')) return true
  if (test.kind.type === 'fight' || test.kind.type === 'evade') {
    const target = state.enemies[test.kind.enemy]
    return !!target && (target.traits ?? []).includes('Elite')
  }
  return false
}

registerScenario({
  id: SMOKE_AND_MIRRORS,
  resolution: resolutionStory,
  tokenEffect: (state, token, investigator) => {
    const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
    const clues = getInvestigator(state, investigator).clues
    switch (token) {
      case 'skull':
        return { modifier: -(eliteCount(state) + (hard ? 2 : 0)) }
      case 'cultist':
        return { modifier: hard ? -3 : -1, revealAnother: targetsElite(state) }
      case 'tablet':
        return {
          modifier: hard ? -4 : -3,
          onFail: clues > 0 ? [{ type: 'PlaceCluesOnLocation', investigator, amount: 1 }] : [],
        }
      case 'elderThing':
        return { modifier: -(hard ? 2 : 1) * clues }
    }
  },
})

// ---------------------------------------------------------------------------
// Plan y acto
// ---------------------------------------------------------------------------

registerAgenda({
  code: CODES.arkhamAlive,
  abilities: (_state, _self, investigator) => [resignAbility(investigator, 'agenda:resign')],
  // Cada investigador recibe una Mark of Elokoss apartada y pasa a ser su portador.
  onAdvance: (state) =>
    activeInvestigators(state).flatMap((i): Message[] => [
      { type: 'ResolveWeakness', investigator: i.id, code: CODES.markOfElokoss },
      { type: 'AddStoryAsset', investigator: i.id, code: CODES.markOfElokoss },
    ]),
})

registerAgenda({
  code: CODES.emergentEvils,
  abilities: (_state, _self, investigator) => [resignAbility(investigator, 'agenda:resign')],
  // Todos se retiran.
  onAdvance: (state) =>
    activeInvestigators(state).map((i): Message => ({ type: 'Resign', investigator: i.id })),
})

registerAct({
  code: CODES.augursOfFlame,
  // Acción: gastar 2 pistas por investigador en grupo para robar la carta de debajo de tu localización.
  abilities: (state, _self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (here === null || !getLocation(state, here).beneath?.length) return []
    const cost = 2 * state.startingInvestigatorCount
    const groupClues = activeInvestigators(state).reduce((sum, i) => sum + i.clues, 0)
    if (groupClues < cost) return []
    return [
      {
        key: 'act:drawBeneath',
        label: 'ability.drawBeneath',
        params: { clues: cost },
        actions: 1,
        provokes: true,
        then: [
          { type: 'SpendGroupClues', amount: cost },
          { type: 'DrawBeneath', investigator, location: here },
        ],
      },
    ]
  },
  // Objetivo: 6 Élite en la zona de victoria y/o debajo del acto.
  objectiveMet: (state) => eliteCount(state) >= 6,
  onAdvance: () => [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } }],
})

// ---------------------------------------------------------------------------
// Sospechosos y su códex
// ---------------------------------------------------------------------------

const codexEntry = (n: string): StoryEntry => ({
  title: `story.smokeAndMirrors.codex${n}Title`,
  body: `story.smokeAndMirrors.codex${n}`,
})

/**
 * Entrada del códex de un sospechoso: su efecto, 1 pista sobre él y, con 1 pista
 * por investigador, queda interrogado (debajo del acto).
 */
function codex(state: GameState, self: Enemy, n: string, effect: Message[]): Message[] {
  return [
    ...effect,
    { type: 'AddLead', enemy: self.id },
    {
      type: 'IfEnemyLeads',
      enemy: self.id,
      atLeast: state.startingInvestigatorCount,
      then: [
        ...(state.interactive ? [{ type: 'Story', entry: codexEntry(n) } as Message] : []),
        { type: 'PlaceUnderAct', enemy: self.id },
      ],
    },
  ]
}

const codexReaction = (
  self: Enemy,
  investigator: InvestigatorId,
  then: Message[],
): ReactionOption => ({
  key: `${self.id}:codex`,
  investigator,
  label: 'ability.codex',
  params: { enemy: self.name },
  then,
})

const atLocation = (state: GameState, investigator: InvestigatorId, location: string) =>
  getInvestigator(state, investigator).location === location

// 1. David Renfield: tras investigar con éxito su localización, se escabulle a una
// localización conectada sin investigadores.
registerEnemy({
  code: CODES.davidRenfield,
  reactions: (state, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.kind === 'investigate' &&
    trigger.succeeded &&
    trigger.location === self.location
      ? [
          codexReaction(
            self,
            trigger.investigator,
            codex(state, self, '1', [{ type: 'ElusiveRetreat', enemy: self.id, exhaust: false }]),
          ),
        ]
      : [],
})

// 2. Cornelia Akely: tras evitarla con éxito, se prepara; curas 1 horror.
registerEnemy({
  code: CODES.corneliaAkely,
  reactions: (state, trigger, self) =>
    trigger.type === 'afterEvade' && trigger.enemy === self.id
      ? [
          codexReaction(
            self,
            trigger.investigator,
            codex(state, self, '2', [
              { type: 'ReadyEnemy', enemy: self.id },
              { type: 'Heal', investigator: trigger.investigator, damage: 0, horror: 1 },
            ]),
          ),
        ]
      : [],
})

// 3. Naomi O'Bannion: parlamento gastando 1 recurso por investigador; puedes derrotar
// automáticamente a un enemigo no Humanoide de cualquier localización.
registerEnemy({
  code: CODES.naomiOBannion,
  abilities: (state, self, investigator) => {
    const cost = state.startingInvestigatorCount
    if (getInvestigator(state, investigator).resources < cost) return []
    const monsters = Object.values(state.enemies).filter(
      (e) => !(e.traits ?? []).includes('Humanoid'),
    )
    const defeat: Message[] = monsters.length
      ? [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.optional',
              choices: [
                ...monsters.map((e): Choice => ({
                  label: 'choice.defeatEnemy',
                  params: { enemy: e.name },
                  target: { type: 'enemy', id: e.id },
                  then: [{ type: 'DefeatEnemy', enemy: e.id, by: investigator }],
                })),
                { label: 'choice.skip', then: [] },
              ],
            },
          },
        ]
      : []
    return [
      {
        key: `${self.id}:parley`,
        label: 'ability.parleyPay',
        params: { enemy: self.name, resources: cost },
        actions: 1,
        provokes: false,
        then: [
          { type: 'SpendResources', investigator, amount: cost },
          ...codex(state, self, '3', defeat),
        ],
      },
    ]
  },
})

// 4. Sgt. Earl Monroe: parlamento con [combat] (4), −1 por cada daño que tenga; si
// aciertas, curas 1 daño.
registerEnemy({
  code: CODES.earlMonroe,
  abilities: (state, self, investigator) => [
    {
      key: `${self.id}:parley`,
      label: 'ability.parleyTest',
      params: { enemy: self.name, skill: 'combat' },
      actions: 1,
      provokes: false,
      then: [
        parleyTest(
          investigator,
          self.name,
          'combat',
          Math.max(0, 4 - self.damageTaken),
          codex(state, self, '4', [{ type: 'Heal', investigator, damage: 1, horror: 0 }]),
        ),
      ],
    },
  ],
})

// 5. Abigail Foreman: parlamento con [intellect] (X = pistas en su localización); si
// aciertas, pon 1 pista en su localización y roba 1 carta.
registerEnemy({
  code: CODES.abigailForeman,
  abilities: (state, self, investigator) => [
    {
      key: `${self.id}:parley`,
      label: 'ability.parleyTest',
      params: { enemy: self.name, skill: 'intellect' },
      actions: 1,
      provokes: false,
      then: [
        parleyTest(investigator, self.name, 'intellect', getLocation(state, self.location).clues, [
          { type: 'PlaceCluesOnLocationFromPool', location: self.location, amount: 1 },
          ...codex(state, self, '5', [{ type: 'DrawCards', investigator, amount: 1 }]),
        ]),
      ],
    },
  ],
})

// 6. Margaret Liu: tras superar una prueba por 2 o más en su localización, miras la
// carta superior del mazo de encuentros y puedes descartarla.
registerEnemy({
  code: CODES.margaretLiu,
  reactions: (state, trigger, self) => {
    if (
      trigger.type !== 'afterSkillTest' ||
      !trigger.succeeded ||
      trigger.margin < 2 ||
      !atLocation(state, trigger.investigator, self.location)
    ) {
      return []
    }
    const top = state.encounterDeck[0]
    const look: Message[] = top
      ? [
          {
            type: 'Ask',
            investigator: trigger.investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.topEncounter',
              choices: [
                {
                  label: 'choice.discard',
                  params: { card: top.name },
                  then: [{ type: 'DiscardTopEncounter' }],
                },
                { label: 'choice.skip', then: [] },
              ],
            },
          },
        ]
      : []
    return [codexReaction(self, trigger.investigator, codex(state, self, '6', look))]
  },
})

/** Prueba de parlamento contra un sospechoso (cuenta como prueba contra un Élite). */
function parleyTest(
  investigator: InvestigatorId,
  source: string,
  skill: 'combat' | 'intellect',
  difficulty: number,
  onSuccess: Message[],
): Message {
  return {
    type: 'BeginSkillTest',
    investigator,
    skill,
    difficulty,
    tags: ['parley', 'elite'],
    kind: { type: 'effect', source, onSuccess, onFail: [], onFailEach: [] },
  }
}

// Servant of Flame: al ser derrotado, los investigadores deciden (códex Φ):
// rematarlo (queda en la zona de victoria y cada uno roba 3) o retenerlo para
// interrogarlo (debajo del acto y cada uno gana 1 pista).
registerEnemy({
  code: CODES.servantOfFlame,
  forced: (state, trigger) =>
    trigger.type === 'enemyDefeated' && trigger.enemy.code === CODES.servantOfFlame
      ? [
          {
            type: 'Story',
            entry: codexEntry('Servant'),
            choices: [
              {
                label: 'story.smokeAndMirrors.finishThem',
                then: activeInvestigators(state).map((i): Message => ({
                  type: 'DrawCards',
                  investigator: i.id,
                  amount: 3,
                })),
              },
              {
                label: 'story.smokeAndMirrors.holdThem',
                then: [
                  { type: 'VictoryToUnderAct', code: CODES.servantOfFlame, victory: 1 },
                  ...activeInvestigators(state).map((i): Message => ({
                    type: 'GainClues',
                    investigator: i.id,
                    amount: 1,
                  })),
                ],
              },
            ],
          },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// Otras cartas de encuentro
// ---------------------------------------------------------------------------

registerTreachery({
  code: CODES.markOfElokoss,
  // En tu zona de amenaza. Forzado al acabar tu turno: 1 daño (a un apoyo tuyo si puedes).
  // [acción][acción]: descartarla.
  revelation: (_state, investigator, self) => [
    { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'threatArea', investigator } },
  ],
  abilities: (_state, self) => [
    {
      key: `${self.id}:discard`,
      label: 'ability.discardTreachery',
      params: { card: 'Mark of Elokoss' },
      actions: 2,
      provokes: true,
      then: [{ type: 'DiscardTreachery', treachery: self.id }],
    },
  ],
  forced: (state, trigger, self) => {
    if (
      trigger.type !== 'turnEnds' ||
      self.placement.type !== 'threatArea' ||
      self.placement.investigator !== trigger.investigator
    ) {
      return []
    }
    const investigator = trigger.investigator
    const soaks = Object.values(state.assets).filter(
      (a) => a.owner === investigator && (playerCardDef(a.code)?.health ?? 0) > a.damage,
    )
    if (soaks.length === 0) return [damage(investigator, 1)]
    return [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.assignDamage',
          choices: soaks.map((a): Choice => ({
            label: 'choice.assignToAsset',
            params: { card: playerCardDef(a.code)?.name ?? a.code },
            target: { type: 'asset', id: a.id },
            then: [{ type: 'DamageAsset', asset: a.id, damage: 1, horror: 0 }],
          })),
        },
      },
    ]
  },
})

registerTreachery({
  code: CODES.arcaneLock,
  // Se une a tu localización (máx. 1 por localización): entrar o salir cuesta 1 acción más.
  // Acción: [willpower] o [intellect] (4) para descartarla.
  moveCost: 1,
  revelation: (state, investigator, self) => {
    const here = getInvestigator(state, investigator).location
    const locked = Object.values(state.treacheries).some(
      (t) =>
        t.code === CODES.arcaneLock &&
        t.placement.type === 'location' &&
        t.placement.location === here,
    )
    if (here === null || locked) return []
    return [
      {
        type: 'PlaceTreachery',
        treachery: self.id,
        placement: { type: 'location', location: here },
      },
    ]
  },
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:break`,
      label: 'ability.breakLock',
      actions: 1,
      provokes: true,
      then: [
        chooseSkillTest(investigator, 'Arcane Lock', ['willpower', 'intellect'], 4, {
          onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
        }),
      ],
    },
  ],
})

registerTreachery({
  code: CODES.downpour,
  // [agility] (3): por cada punto de fallo, pierdes 1 acción o dejas 1 pista en tu localización.
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Downpour', 'agility', 3, {
      onFailEach: [
        {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEffect',
            choices: [
              {
                label: 'choice.loseAction',
                then: [{ type: 'LoseActions', investigator, amount: 1 }],
              },
              {
                label: 'choice.placeClue',
                requires: { type: 'hasClues', investigator },
                then: [{ type: 'PlaceCluesOnLocation', investigator, amount: 1 }],
              },
            ],
          },
        },
      ],
    }),
  ],
})

registerTreachery({
  code: CODES.flashFlood,
  // Tu localización tiene +4 al velo hasta el final de la ronda.
  revelation: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return here === null ? [] : [{ type: 'ModifyShroud', location: here, amount: 4 }]
  },
})

registerTreachery({
  code: CODES.raisingSuspicions,
  // 1 perdición en el enemigo más cercano sin perdición; si no hay, oleada.
  revelation: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    const noDoom = (l: string) => enemiesAt(state, l).some((e) => !e.doom)
    const target = here === null ? null : nearestLocation(state, here, noDoom)
    const enemy = target === null ? undefined : enemiesAt(state, target).find((e) => !e.doom)
    return enemy
      ? [{ type: 'PlaceDoomOnEnemy', enemy: enemy.id, amount: 1 }]
      : [{ type: 'GainSurge' }]
  },
})

registerTreachery({
  code: CODES.redHerring,
  // [intellect] (2, +2 si controlas 2 o más pistas). Si fallas: 1 horror y dejas 1 pista.
  revelation: (state, investigator) => {
    const clues = getInvestigator(state, investigator).clues
    return [
      effectTest(investigator, 'Red Herring', 'intellect', clues >= 2 ? 4 : 2, {
        onFail: [
          damage(investigator, 0, 1),
          ...(clues > 0
            ? [{ type: 'PlaceCluesOnLocation', investigator, amount: 1 } as Message]
            : []),
        ],
      }),
    ]
  },
})

registerTreachery({
  code: CODES.aerialPursuit,
  // Oleada. El enemigo no Élite más cercano se mueve una vez hacia ti; si se enfrenta, ataca.
  revelation: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (here === null) return []
    const nonElite = (l: string) =>
      enemiesAt(state, l).some((e) => !(e.traits ?? []).includes('Elite'))
    const at = nearestLocation(state, here, nonElite)
    const enemy =
      at === null
        ? undefined
        : enemiesAt(state, at).find((e) => !(e.traits ?? []).includes('Elite'))
    return enemy && at !== here ? [{ type: 'HuntOnce', enemy: enemy.id, toward: here }] : []
  },
})

registerTreachery({
  code: CODES.crossfire,
  // [agility] (3). Si fallas, cada investigador de tu localización recibe 1 daño.
  revelation: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    const everyone = here === null ? [] : investigatorsAt(state, here)
    return [
      effectTest(investigator, 'Crossfire', 'agility', 3, {
        onFail: everyone.map((i) => damage(i.id, 1)),
      }),
    ]
  },
})

registerTreachery({
  code: CODES.eagerForDeath,
  // [willpower] (2 + tu daño). Si fallas, 2 horror.
  revelation: (state, investigator) => [
    effectTest(
      investigator,
      'Eager for Death',
      'willpower',
      2 + getInvestigator(state, investigator).damage,
      { onFail: [damage(investigator, 0, 2)] },
    ),
  ],
})

registerEnemy({
  code: CODES.rogueGangster,
  // Forzado: tras enfrentarse a ti, pierdes 1 recurso; si no puedes, te ataca.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'afterEngage' || trigger.enemy !== self.id) return []
    return getInvestigator(state, trigger.investigator).resources > 0
      ? [{ type: 'LoseResources', investigator: trigger.investigator, amount: 1 }]
      : [
          {
            type: 'EnemyAttack',
            enemy: self.id,
            investigator: trigger.investigator,
            exhaustAfter: false,
          },
        ]
  },
})

registerEnemy({
  code: CODES.whippoorwill,
  // Los investigadores de su localización tienen −1 a todas sus habilidades.
  skillModifier: () => -1,
})

// ---------------------------------------------------------------------------
// Localizaciones
// ---------------------------------------------------------------------------

/** Reacción opcional de una localización ("puedes…"), con su límite. */
function locationReaction(
  state: GameState,
  investigator: InvestigatorId,
  key: string,
  label: string,
  then: Message[],
  limit?: { per: 'round' | 'game'; group?: boolean },
): Message[] {
  return [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.reaction',
        choices: [
          {
            label,
            then: [
              {
                type: 'UseAbility',
                investigator,
                key,
                actions: 0,
                provokes: false,
                ...(limit ? { limit } : {}),
                then,
              },
            ],
          },
          { label: 'choice.skip', then: [] },
        ],
      },
    },
  ]
}

// Downtown (First Bank of Arkham): tras descubrir pistas aquí, ganas 1 recurso.
registerLocation({
  code: CODES.downtownBank,
  forced: (_state, trigger, self) =>
    trigger.type === 'afterDiscoverClues' && trigger.location === self.id
      ? [{ type: 'GainResources', investigator: trigger.investigator, amount: 1 }]
      : [],
})

// Downtown (Arkham Sanatorium): tras descubrir pistas aquí, puedes curar 1 horror a
// un investigador de esta localización.
registerLocation({
  code: CODES.downtownSanatorium,
  forced: (state, trigger, self) => {
    if (trigger.type !== 'afterDiscoverClues' || trigger.location !== self.id) return []
    const hurt = investigatorsAt(state, self.id).filter((i) => i.horror > 0)
    if (hurt.length === 0) return []
    return [
      {
        type: 'Ask',
        investigator: trigger.investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.reaction',
          choices: [
            ...hurt.map((i): Choice => ({
              label: 'choice.healHorrorOf',
              params: { name: i.name },
              then: [{ type: 'Heal', investigator: i.id, damage: 0, horror: 1 }],
            })),
            { label: 'choice.skip', then: [] },
          ],
        },
      },
    ]
  },
})

// Uptown (St. Mary's Hospital): acción: cura hasta 2 daño entre los investigadores de
// aquí (una vez por partida).
registerLocation({
  code: CODES.uptownHospital,
  abilities: (state, self, investigator) => {
    const hurt = investigatorsAt(state, self.id).filter((i) => i.damage > 0)
    if (hurt.length === 0) return []
    const healOne = (): Message => ({
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseHeal',
        choices: [
          ...hurt.map((i): Choice => ({
            label: 'choice.healDamageOf',
            params: { name: i.name },
            then: [{ type: 'Heal', investigator: i.id, damage: 1, horror: 0 }],
          })),
          { label: 'choice.skip', then: [] },
        ],
      },
    })
    return [
      {
        key: `${self.id}:heal`,
        label: 'ability.hospitalHeal',
        actions: 1,
        provokes: true,
        limit: { per: 'game', group: true },
        then: [healOne(), healOne()],
      },
    ]
  },
})

// Uptown (Ye Olde Magick Shoppe): acción: busca entre las 9 primeras un apoyo Spell o
// Ritual; si no encuentras ninguno, robas 1 carta.
registerLocation({
  code: CODES.uptownShoppe,
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:search`,
      label: 'ability.shoppeSearch',
      actions: 1,
      provokes: true,
      then: [
        {
          type: 'SearchDeck',
          investigator,
          top: 9,
          traits: ['Spell', 'Ritual'],
          to: 'hand',
          orDraw: 1,
        },
      ],
    },
  ],
})

// Northside: acción, gasta 5 recursos: descubre 1 pista de cualquier localización
// Arkham revelada (una vez por ronda).
registerLocation({
  code: CODES.northside,
  abilities: (state, self, investigator) => {
    if (getInvestigator(state, investigator).resources < 5) return []
    return Object.values(state.locations)
      .filter((l) => l.revealed && l.clues > 0)
      .map((l) => ({
        key: `${self.id}:clue`,
        label: 'ability.northsideClue',
        params: { location: l.name },
        actions: 1,
        provokes: true,
        limit: { per: 'round' },
        then: [
          { type: 'SpendResources', investigator, amount: 5 },
          { type: 'DiscoverClues', investigator, amount: 1, location: l.id },
        ],
      }))
  },
})

// Easttown: tras descubrir la última pista de aquí, puedes buscar en tu mazo un aliado y
// jugarlo pagando su coste (una vez por partida).
registerLocation({
  code: CODES.easttown,
  forced: (state, trigger, self) =>
    trigger.type === 'afterDiscoverClues' &&
    trigger.location === self.id &&
    getLocation(state, self.id).clues === 0
      ? locationReaction(
          state,
          trigger.investigator,
          `${self.id}:ally`,
          'ability.easttownAlly',
          [
            {
              type: 'SearchDeck',
              investigator: trigger.investigator,
              traits: ['Ally'],
              to: 'play',
            },
          ],
          { per: 'game' },
        )
      : [],
})

// Merchant District: rápida, en tu turno, con 1 o 2 investigadores: muévete a una
// localización conectada (una vez por ronda).
registerLocation({
  code: CODES.merchantDistrict,
  abilities: (state, self, investigator) => {
    const count = activeInvestigators(state).length
    if (count < 1 || count > 2 || state.activeTurn !== investigator) return []
    return self.connections
      .filter((l) => state.locations[l])
      .map((l) => ({
        key: `${self.id}:move`,
        label: 'ability.quadMove',
        params: { location: getLocation(state, l).name },
        actions: 0,
        provokes: false,
        limit: { per: 'round' },
        then: [{ type: 'MoveTo', investigator, location: l }],
      }))
  },
})

// Southside: [acción][acción]: los investigadores de aquí roban entre todos 3 cartas,
// repartidas como quieran (límite de grupo 1 por ronda).
registerLocation({
  code: CODES.southside,
  abilities: (state, self, investigator) => {
    const here = investigatorsAt(state, self.id)
    const drawOne = (): Message =>
      here.length === 1
        ? { type: 'DrawCards', investigator: here[0]!.id, amount: 1 }
        : {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.whoDraws',
              choices: here.map((i): Choice => ({
                label: 'choice.investigator',
                params: { name: i.name },
                then: [{ type: 'DrawCards', investigator: i.id, amount: 1 }],
              })),
            },
          }
    return [
      {
        key: `${self.id}:draw`,
        label: 'ability.southsideDraw',
        actions: 2,
        provokes: true,
        limit: { per: 'round', group: true },
        then: [drawOne(), drawOne(), drawOne()],
      },
    ]
  },
})

// French Hill: acción, descarta 1 carta de tu mano: pon 1 carga o secreto en un apoyo
// tuyo (una vez por ronda).
registerLocation({
  code: CODES.frenchHill,
  abilities: (state, self, investigator) => {
    if (getInvestigator(state, investigator).hand.length === 0) return []
    return Object.values(state.assets)
      .filter((a) => {
        const uses = playerCardDef(a.code)?.uses?.type
        return a.owner === investigator && (uses === 'charges' || uses === 'secrets')
      })
      .map((a) => ({
        key: `${self.id}:charge`,
        label: 'ability.frenchHillCharge',
        params: { card: playerCardDef(a.code)?.name ?? a.code },
        actions: 1,
        provokes: true,
        limit: { per: 'round' },
        then: [
          { type: 'ChooseDiscardFromHand', investigator, amount: 1 },
          { type: 'AddUses', asset: a.id, amount: 1 },
        ],
      }))
  },
})

// Miskatonic University (In Flames): al terminar la fase de investigación, 1 daño directo
// a cada investigador de aquí.
registerLocation({
  code: CODES.universityInFlames,
  forced: (state, trigger, self) =>
    trigger.type === 'investigationPhaseEnds'
      ? investigatorsAt(state, self.id).map((i): Message => ({
          type: 'TakeDamage',
          investigator: i.id,
          damage: 1,
          horror: 0,
          direct: true,
        }))
      : [],
})

// Miskatonic University (Quiet Campus): acción: juega un apoyo Tome o Spell de tu pila de
// descartes con 2 de descuento (una vez por partida).
registerLocation({
  code: CODES.universityQuietCampus,
  abilities: (state, self, investigator) => {
    const me = getInvestigator(state, investigator)
    return [...new Set(me.discard)]
      .filter((code) => {
        const def = playerCardDef(code)
        return (
          def?.type === 'asset' &&
          def.traits.some((t) => t === 'Tome' || t === 'Spell') &&
          Math.max(0, (def.cost ?? 0) - 2) <= me.resources
        )
      })
      .map((code) => ({
        key: `${self.id}:play`,
        label: 'ability.playFromDiscard',
        params: { card: playerCardDef(code)?.name ?? code },
        actions: 1,
        provokes: true,
        limit: { per: 'game' },
        then: [
          { type: 'DiscardToHand', investigator, code },
          { type: 'PlayCard', investigator, code, discount: 2 },
        ],
      }))
  },
})

// ---------------------------------------------------------------------------
// Resoluciones (guía de campaña, página 10)
// ---------------------------------------------------------------------------

const entry = storyEntries('smokeAndMirrors')
const note = noteEffect
const record = recordNote
const PROCEED = { key: 'story.effect.proceed', params: { scenario: 'story.scenario.queenOfAsh' } }

/** El heraldo de Elokoss: el sospechoso apartado al principio. */
const harbingerOf = (state: GameState) =>
  state.setAside.find((c) => c.kind === 'enemy' && suspects.some((s) => s.code === c.code))

function resolutionStory(state: GameState, outcome: ScenarioOutcome): Message[] {
  const harbinger = harbingerOf(state)
  const name = harbinger?.name ?? '?'
  const underAct = state.underAct ?? []
  const servantKilled = state.victoryDisplay.includes(CODES.servantOfFlame)
  const servantHeld = underAct.includes(CODES.servantOfFlame)
  const xp: Message = { type: 'EarnExperience', amount: underAct.length, victory: true }
  const common: Message[] = [
    record('harbinger', name),
    ...(servantKilled ? [record('killedServant')] : []),
    xp,
  ]
  const end = (resolution: ScenarioOutcome): Message => ({
    type: 'EndScenario',
    outcome: resolution,
    told: true,
  })
  const r2: Message[] = [
    {
      type: 'Story',
      entry: entry('resolution2', [
        note('servantEscaped'),
        { key: 'story.effect.bonusXp', params: { n: 1 } },
        PROCEED,
      ]),
    },
    record('servantEscaped'),
    { type: 'EarnExperience', amount: 1 },
    end({ type: 'resolution', resolution: 2 }),
  ]

  if (outcome.type === 'noResolution') {
    // Se baraja el heraldo con los Élite en juego o debajo de localizaciones y se roba uno al azar.
    const pool = [
      ...Object.values(state.enemies)
        .filter((e) => ELITES.has(e.code))
        .map((e) => e.code),
      ...Object.values(state.locations).flatMap((l) =>
        (l.beneath ?? []).filter((c) => ELITES.has(c.code)).map((c) => c.code),
      ),
      ...(harbinger ? [harbinger.code] : []),
    ]
    const [drawn] = pool.length ? nextInt(state.rng, pool.length) : [0]
    const found = harbinger !== undefined && pool[drawn] === harbinger.code
    return [
      {
        type: 'Story',
        entry: entry('noResolution', [
          { key: 'story.effect.harbinger', params: { name } },
          note(found ? 'discoveredWhereabouts' : 'failedSearch'),
        ]),
      },
      record(found ? 'discoveredWhereabouts' : 'failedSearch'),
      ...common,
      ...(servantHeld ? r2 : [end(outcome)]),
    ]
  }

  const scoured = underAct.filter((c) => ELITES.has(c)).length >= 6
  const stirred = state.victoryDisplay.filter((c) => ELITES.has(c)).length >= 6
  return [
    {
      type: 'Story',
      entry: entry('resolution1', [
        note('discoveredWhereabouts'),
        { key: 'story.effect.harbinger', params: { name } },
        ...(servantHeld ? [] : [PROCEED]),
      ]),
    },
    record('discoveredWhereabouts'),
    ...common,
    ...(scoured ? [record('scouredArkham')] : []),
    ...(stirred ? [record('stirredUpTrouble')] : []),
    ...(servantHeld ? r2 : [end(outcome)]),
  ]
}
