/**
 * Escenario III de Brethren of Ash: "Queen of Ash" (caja básica de 2026).
 * Análisis en docs-proyecto/12-queen-of-ash.md.
 *
 * Los investigadores bajan a las alcantarillas para impedir el renacer de
 * Elokoss. Las conexiones cambian al revelar los túneles (símbolos de las
 * cartas) y entrar en la cisterna y en la compuerta cuesta pistas en grupo.
 *
 * Los efectos están implementados a partir de su descripción; no se incluye el
 * texto de las cartas.
 */
import {
  activeInvestigators,
  enemiesAt,
  getInvestigator,
  nearestLocation,
  playerCardDef,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerScenario,
  registerTreachery,
  seedRng,
  shuffle,
  type AbilityOption,
  type CampaignLog,
  type ChaosToken,
  type Choice,
  type Enemy,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type Message,
  type ScenarioDefinition,
  type ScenarioOutcome,
  type StoryEntry,
  type TreacheryCard,
} from '@lcg/engine'
import { CHAOS_BAGS, type Difficulty } from './campaign'
import {
  cantorOfFlame,
  chooseSkillTest,
  copies,
  cosmicEvils,
  damage,
  effectTest,
  extraplanarVisions,
  fire,
  hellhound,
  noxiousSmoke,
  CODES as SF,
  wildCompulsion,
} from './spreading-flames'

export const QUEEN_OF_ASH = 'queen-of-ash'

export const CODES = {
  aGathering: '12169',
  aRitual: '12170',
  brethrenOfAsh: '12171',
  searchTheSewers: '12172',
  stopTheRite: '12173',
  undergroundCistern: '12174',
  sluiceControl: '12175',
  ashenRebirth: '12176',
  queensKnight: '12177',
  heraldOfFlame: '12178',
  elokoss: '12179',
  elokossMother: '12179b',
  servantOfFlame: '12180',
  sewerCulvert: '12182',
  infestedPipes: '12183',
  overgrownTunnels: '12184',
  floodedCrypt: '12185',
  smugglersCache: '12186',
  toxicWastePit: '12187',
  zealot: '12188',
  darkMagician: '12189',
  blasphemousInvocation: '12190',
  unnaturalDecay: '12191',
  putridVapors: '12192',
  languor: '12193',
  dissonance: '12194',
  torment: '12195',
} as const

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

const enemy = (card: Omit<EnemyCard, 'kind'>): EnemyCard => ({ kind: 'enemy', ...card })
const treachery = (card: Omit<TreacheryCard, 'kind'>): TreacheryCard => ({
  kind: 'treachery',
  ...card,
})

/** Elokoss tiene 5 de salud más 5 por investigador. */
const elokossHealth = (players: number) => 5 + 5 * players

export const elokossFaintEmbers = (players: number) =>
  enemy({
    code: CODES.elokoss,
    name: 'Elokoss',
    traits: ['Ancient One', 'Flora', 'Elite'],
    fight: 5,
    health: elokossHealth(players),
    evade: 5,
    damage: 3,
    horror: 3,
    keywords: ['massive', 'retaliate'],
    noOpportunityAttacks: true,
    victory: 5,
  })

export const elokossMotherOfFlame = (players: number) =>
  enemy({
    code: CODES.elokossMother,
    name: 'Elokoss',
    traits: ['Ancient One', 'Flora', 'Elite'],
    fight: 5,
    health: elokossHealth(players),
    evade: 5,
    damage: 3,
    horror: 3,
    keywords: ['hunter', 'massive', 'retaliate'],
    victory: 5,
  })

const isElokoss = (code: string) => code === CODES.elokoss || code === CODES.elokossMother

export const servantSacrifice = enemy({
  code: CODES.servantOfFlame,
  name: 'Servant of Flame',
  traits: ['Humanoid', 'Cultist', 'Elite'],
  fight: 4,
  health: 5,
  healthPerInvestigator: true,
  evade: 4,
  damage: 2,
  horror: 2,
  keywords: ['hunter', 'retaliate'],
  victory: 2,
})

const queensKnight = enemy({
  code: CODES.queensKnight,
  name: "Queen's Knight",
  traits: ['Humanoid', 'Cultist'],
  fight: 2,
  health: 5,
  evade: 2,
  damage: 2,
  horror: 0,
  keywords: ['hunter'],
  victory: 1,
})

const heraldOfFlame = enemy({
  code: CODES.heraldOfFlame,
  name: 'Herald of Flame',
  traits: ['Monster'],
  fight: 4,
  health: 5,
  evade: 2,
  damage: 0,
  horror: 2,
  keywords: ['hunter'],
  victory: 1,
})

const zealot = enemy({
  code: CODES.zealot,
  name: 'Zealot',
  traits: ['Humanoid', 'Cultist'],
  fight: 2,
  health: 1,
  evade: 2,
  damage: 1,
  horror: 0,
  keywords: ['aloof'],
  startingDoom: 1,
})

const darkMagician = enemy({
  code: CODES.darkMagician,
  name: 'Dark Magician',
  traits: ['Humanoid', 'Cultist'],
  fight: 4,
  health: 4,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: ['hunter', 'retaliate'],
  victory: 1,
})

const t = (
  code: string,
  name: string,
  traits: string[],
  keywords: TreacheryCard['keywords'] = [],
) => treachery({ code, name, traits, keywords })

/** Enemigos Sectarios de Ashen Pilgrims y Cultists (para "armaron un buen lío"). */
const cultistEnemies = (): EnemyCard[] => [
  ...copies(cantorOfFlame, 2),
  ...copies(zealot, 3),
  { ...darkMagician },
]

const otherEncounterCards = (): (EnemyCard | TreacheryCard)[] => [
  ...copies(hellhound, 2),
  ...copies(cosmicEvils, 3),
  ...copies(t(CODES.blasphemousInvocation, 'Blasphemous Invocation', ['Hex']), 2),
  ...copies(extraplanarVisions, 2),
  ...copies(wildCompulsion, 2),
  ...copies(t(CODES.unnaturalDecay, 'Unnatural Decay', ['Curse']), 2),
  ...copies(t(CODES.putridVapors, 'Putrid Vapors', ['Hazard']), 2),
  ...copies(t(CODES.languor, 'Languor', ['Hex', 'Bane']), 2),
  ...copies(t(CODES.dissonance, 'Dissonance', ['Curse', 'Bane']), 2),
  ...copies(t(CODES.torment, 'Torment', ['Power', 'Bane'], ['peril']), 2),
  ...copies(t(CODES.ashenRebirth, 'Ashen Rebirth', ['Power']), 2),
  ...copies(noxiousSmoke, 2),
]

// Símbolos de las localizaciones (los túneles sin revelar son todos iguales).
const TUNNEL_BACK = { symbol: 'triangle', connectsTo: ['hourglass', 'circle'] }

const tunnel = (card: Omit<LocationCard, 'unrevealed' | 'connections'>): LocationCard => ({
  ...card,
  connections: [],
  unrevealed: TUNNEL_BACK,
})

const LOCATIONS = {
  sewerCulvert: {
    id: CODES.sewerCulvert,
    name: 'Sewer Culvert',
    shroud: 1,
    clueValue: 0,
    cluesPerInvestigator: false,
    connections: [],
    // Conecta con cada túnel, se vea la cara que se vea.
    symbol: 'hourglass',
    connectsTo: ['triangle', 'spade', 'square', 'star', 'trefoil', 'equals'],
    position: [2, 2],
  } satisfies LocationCard,
  undergroundCistern: {
    id: CODES.undergroundCistern,
    name: 'Underground Cistern',
    shroud: 4,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [],
    symbol: 'circle',
    connectsTo: ['triangle', 'plus', 'spade', 'star', 'equals'],
    enterCost: 3,
    position: [2, 0],
  } satisfies LocationCard,
  sluiceControl: {
    id: CODES.sluiceControl,
    name: 'Sluice Control',
    shroud: 4,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [],
    symbol: 'plus',
    connectsTo: ['circle'],
    enterCost: 1,
    position: [4, 0],
  } satisfies LocationCard,
  tunnels: [
    tunnel({
      id: CODES.infestedPipes,
      name: 'Sewer Tunnels',
      shroud: 1,
      clueValue: 1,
      cluesPerInvestigator: true,
      symbol: 'spade',
      connectsTo: ['hourglass', 'circle'],
    }),
    tunnel({
      id: CODES.overgrownTunnels,
      name: 'Sewer Tunnels',
      shroud: 2,
      clueValue: 1,
      cluesPerInvestigator: true,
      symbol: 'square',
      connectsTo: ['hourglass'],
    }),
    tunnel({
      id: CODES.floodedCrypt,
      name: 'Sewer Tunnels',
      shroud: 4,
      clueValue: 1,
      cluesPerInvestigator: true,
      symbol: 'star',
      connectsTo: ['hourglass', 'circle'],
      victory: 1,
    }),
    tunnel({
      id: CODES.smugglersCache,
      name: 'Sewer Tunnels',
      shroud: 3,
      clueValue: 0,
      cluesPerInvestigator: false,
      symbol: 'trefoil',
      connectsTo: ['hourglass'],
    }),
    tunnel({
      id: CODES.toxicWastePit,
      name: 'Sewer Tunnels',
      shroud: 3,
      clueValue: 1,
      cluesPerInvestigator: true,
      symbol: 'equals',
      connectsTo: ['hourglass', 'circle'],
      victory: 1,
    }),
  ],
}

export interface QueenOfAshOptions {
  difficulty?: Difficulty
  log?: CampaignLog
  seed?: number
  /** Investigadores en la partida (por orden de jugadores). */
  investigators?: InvestigatorId[]
}

/** Fichas que se añaden a la bolsa para el resto de la campaña, según la dificultad. */
const ADDED_TOKENS: Record<Difficulty, ChaosToken[]> = {
  easy: ['elderThing'],
  standard: ['elderThing', 'tablet'],
  hard: ['skull', 'tablet', 'elderThing'],
  expert: ['cultist', 'tablet', 'elderThing', 'skull'],
}

/** Preparación (guía de campaña, páginas 11 y 12). */
export function queenOfAsh(options: QueenOfAshOptions = {}): ScenarioDefinition {
  const { difficulty = 'standard', log } = options
  const investigators = options.investigators ?? []
  const players = Math.max(1, investigators.length)
  const notes = log?.notes ?? []
  let rng = seedRng(options.seed ?? 1)

  // Los túneles se barajan: no se sabe cuál es cuál hasta revelarlos.
  // Los túneles se colocan en fila, en el orden barajado.
  const [shuffled, afterTunnels] = shuffle(LOCATIONS.tunnels, rng)
  rng = afterTunnels
  const tunnels = shuffled.map((l, column): LocationCard => ({ ...l, position: [column, 1] }))

  const discovered = notes.includes('discoveredWhereabouts')
  const scoured = notes.includes('scouredArkham')
  const stirred = notes.includes('stirredUpTrouble')
  const servantDead = notes.includes('killedServant')

  // "Armaron un buen lío": 1 sectario por investigador, cada uno en un túnel distinto.
  const [cultists] = shuffle(cultistEnemies(), rng)
  const ambush = stirred ? cultists.slice(0, players) : []
  const remainingCultists = stirred ? cultists.slice(players) : cultistEnemies()

  return {
    id: QUEEN_OF_ASH,
    intro: { title: 'story.queenOfAsh.intro1Title', body: 'story.queenOfAsh.intro1' },
    locations: [LOCATIONS.undergroundCistern, ...tunnels, LOCATIONS.sewerCulvert],
    setAsideLocations: [LOCATIONS.sluiceControl],
    startingLocation: CODES.sewerCulvert,
    agendas: [
      { code: CODES.aGathering, name: 'A Gathering', doomThreshold: 6 },
      { code: CODES.aRitual, name: 'A Ritual', doomThreshold: 10 },
      { code: CODES.brethrenOfAsh, name: 'Brethren of Ash', doomThreshold: 1000 },
    ],
    acts: [
      {
        code: CODES.searchTheSewers,
        name: 'Search the Sewers',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: CODES.stopTheRite,
        name: 'Stop the Rite',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: CODES.brethrenOfAsh,
        name: 'Brethren of Ash',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [...remainingCultists, ...otherEncounterCards()],
    setAside: [
      ...copies(fire, 5),
      elokossFaintEmbers(players),
      { ...queensKnight },
      { ...heraldOfFlame },
      ...(servantDead ? [] : [{ ...servantSacrifice }]),
    ],
    chaosBag: [...CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      { type: 'AddChaosTokens', tokens: ADDED_TOKENS[difficulty] },
      {
        type: 'Story',
        entry: discovered
          ? { title: 'story.queenOfAsh.intro2Title', body: 'story.queenOfAsh.intro2' }
          : { title: 'story.queenOfAsh.intro3Title', body: 'story.queenOfAsh.intro3' },
      },
      ...(discovered ? [] : [{ type: 'PlaceDoom', amount: 1 } as Message]),
      ...(scoured
        ? investigators.map((id): Message => ({ type: 'GainClues', investigator: id, amount: 1 }))
        : []),
      ...ambush.map((card, n): Message => ({
        type: 'SpawnEnemy',
        card,
        location: tunnels[n]!.id,
        engageWith: null,
      })),
      ...(players >= 3 ? [{ type: 'PlaceDoom', amount: 1 } as Message] : []),
    ],
  }
}

// ---------------------------------------------------------------------------
// Tarjeta de referencia
// ---------------------------------------------------------------------------

/** Copias de Fire! en juego (unidas a localizaciones). */
const firesInPlay = (state: GameState) =>
  Object.values(state.treacheries).filter((x) => x.code === SF.fire && x.placement.type !== 'limbo')
    .length

const fireAt = (state: GameState, location: string) =>
  Object.values(state.treacheries).find(
    (x) =>
      x.code === SF.fire && x.placement.type === 'location' && x.placement.location === location,
  )

/** Ataque o evasión contra un enemigo Sectario. */
function targetsCultist(state: GameState): boolean {
  const test = state.skillTest
  if (!test || (test.kind.type !== 'fight' && test.kind.type !== 'evade')) return false
  return (state.enemies[test.kind.enemy]?.traits ?? []).includes('Cultist')
}

registerScenario({
  id: QUEEN_OF_ASH,
  resolution: resolutionStory,
  tokenEffect: (state, token, investigator) => {
    const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
    const atRitualSite = getInvestigator(state, investigator).location === CODES.undergroundCistern
    switch (token) {
      case 'skull':
        return { modifier: -(hard ? 2 : 1) * firesInPlay(state) }
      case 'cultist':
        return { modifier: hard ? -3 : -2, revealAnother: targetsCultist(state) }
      case 'tablet':
        if (hard) return atRitualSite ? { modifier: 0, autoFail: true } : { modifier: -4 }
        return { modifier: atRitualSite ? -4 : -2 }
      case 'elderThing':
        return {
          modifier: hard ? -5 : -3,
          onFail: [{ type: 'DrawFromEncounterDiscard', investigator, code: SF.fire }],
        }
    }
  },
})

// ---------------------------------------------------------------------------
// Plan y acto
// ---------------------------------------------------------------------------

/** "Cada enemigo en una localización con Fire! no puede recibir daño." */
const shieldedByFire = (state: GameState, e: Enemy) => fireAt(state, e.location) !== undefined

const findElokoss = (state: GameState) =>
  Object.values(state.enemies).find((e) => isElokoss(e.code))

registerAgenda({
  code: CODES.aGathering,
  enemyImmune: shieldedByFire,
  // Si Servant of Flame está apartado, aparece en la cisterna. Cada investigador prueba
  // [willpower] (4); quien falla, 1 horror directo.
  onAdvance: (state) => [
    ...(state.setAside.some((c) => c.code === CODES.servantOfFlame)
      ? [
          {
            type: 'SpawnSetAsideEnemy',
            code: CODES.servantOfFlame,
            location: CODES.undergroundCistern,
          } as Message,
        ]
      : []),
    ...activeInvestigators(state).map((i) =>
      effectTest(i.id, 'A Gathering', 'willpower', 4, {
        onFail: [{ type: 'TakeDamage', investigator: i.id, damage: 0, horror: 1, direct: true }],
      }),
    ),
  ],
})

registerAgenda({
  code: CODES.aRitual,
  enemyImmune: shieldedByFire,
  // Elokoss despierta (cara Mother of Flame). El plan y el acto pasan a ser
  // "Brethren of Ash": la perdición se convierte en daño.
  onAdvance: (state) => {
    const players = state.startingInvestigatorCount
    const elokoss = findElokoss(state)
    return [
      ...(elokoss
        ? [{ type: 'FlipEnemy', enemy: elokoss.id, card: elokossMotherOfFlame(players) } as Message]
        : [
            { type: 'RevealLocation', location: CODES.undergroundCistern } as Message,
            {
              type: 'SpawnEnemy',
              card: elokossMotherOfFlame(players),
              location: CODES.undergroundCistern,
              engageWith: null,
            } as Message,
          ]),
      { type: 'SetAct', index: 2 },
      { type: 'SetDoomBecomesDamage' },
    ]
  },
})

const elokossDefeated = (state: GameState) => state.victoryDisplay.some(isElokoss)

registerAct({
  code: CODES.searchTheSewers,
  // Objetivo: un investigador entra en la cisterna.
  objectiveMet: (state) =>
    activeInvestigators(state).some((i) => i.location === CODES.undergroundCistern),
  onAdvance: (state) => {
    const there = activeInvestigators(state).find((i) => i.location === CODES.undergroundCistern)
    return [
      { type: 'SpawnSetAsideEnemy', code: CODES.elokoss, location: CODES.undergroundCistern },
      ...(there
        ? [
            { type: 'MoveSetAsideToEncounterDiscard', code: SF.fire, count: 1 } as Message,
            { type: 'DrawFromEncounterDiscard', investigator: there.id, code: SF.fire } as Message,
          ]
        : []),
      {
        type: 'ShuffleSetAsideIntoEncounter',
        codes: [SF.fire, CODES.queensKnight, CODES.heraldOfFlame],
      },
      { type: 'PutLocationIntoPlay', location: CODES.sluiceControl },
    ]
  },
})

registerAct({
  code: CODES.stopTheRite,
  // Rápida: gastar 1 pista por investigador en grupo para descartar un Fire! de tu localización.
  abilities: (state, _self, investigator) => {
    const here = getInvestigator(state, investigator).location
    const burning = here === null ? undefined : fireAt(state, here)
    const cost = state.startingInvestigatorCount
    const group = activeInvestigators(state).reduce((sum, i) => sum + i.clues, 0)
    if (!burning || group < cost) return []
    return [
      {
        key: 'act:extinguish',
        label: 'ability.extinguish',
        params: { clues: cost },
        actions: 0,
        provokes: false,
        then: [
          { type: 'SpendGroupClues', amount: cost },
          { type: 'DiscardTreachery', treachery: burning.id },
        ],
      },
    ]
  },
  // Forzado al final de la ronda: cada Sectario se mueve una vez hacia la cisterna.
  forced: (state, trigger) =>
    trigger.type === 'roundEnds'
      ? Object.values(state.enemies)
          .filter((e) => (e.traits ?? []).includes('Cultist') && e.engagedWith === null)
          .map((e): Message => ({
            type: 'HuntOnce',
            enemy: e.id,
            toward: CODES.undergroundCistern,
            attack: false,
          }))
      : [],
  objectiveMet: elokossDefeated,
  onAdvance: () => [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } }],
})

registerAct({
  // Plan y acto especial "Brethren of Ash": objetivo, derrotar a Elokoss.
  code: CODES.brethrenOfAsh,
  objectiveMet: elokossDefeated,
  onAdvance: () => [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } }],
})

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.elokoss,
  // Rápida: gastar 1 pista por investigador para poner 1 pista sobre Elokoss; con 5, resolución 2.
  abilities: (state, self, investigator) => {
    const cost = state.startingInvestigatorCount
    const group = activeInvestigators(state).reduce((sum, i) => sum + i.clues, 0)
    if (group < cost || getInvestigator(state, investigator).location !== self.location) return []
    return [
      {
        key: `${self.id}:clue`,
        label: 'ability.weakenElokoss',
        params: { clues: cost, have: self.leads ?? 0 },
        actions: 0,
        provokes: false,
        then: [
          { type: 'SpendGroupClues', amount: cost },
          { type: 'AddLead', enemy: self.id },
          {
            type: 'IfEnemyLeads',
            enemy: self.id,
            atLeast: 5,
            then: [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } }],
          },
        ],
      },
    ]
  },
})

registerEnemy({
  code: CODES.elokossMother,
  // Forzado: tras evitarla, se prepara y no te ataca durante el resto de la ronda.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterEvade' && trigger.enemy === self.id
      ? [
          { type: 'ReadyEnemy', enemy: self.id },
          { type: 'SpareInvestigator', enemy: self.id, investigator: trigger.investigator },
        ]
      : [],
})

registerEnemy({
  code: CODES.queensKnight,
  // Forzado: cuando recibe daño, Elokoss recibe 1 daño.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'afterDealDamage' || trigger.enemy !== self.id) return []
    const elokoss = findElokoss(state)
    return elokoss ? [{ type: 'DamageEnemy', enemy: elokoss.id, amount: 1 }] : []
  },
})

registerEnemy({
  code: CODES.heraldOfFlame,
  // Forzado: tras atacar, cura 1 daño a cada enemigo de su localización.
  forced: (state, trigger, self) =>
    trigger.type === 'afterEnemyAttack' && trigger.enemy === self.id
      ? enemiesAt(state, self.location).map((e): Message => ({
          type: 'HealEnemy',
          enemy: e.id,
          amount: 1,
        }))
      : [],
})

registerEnemy({
  code: CODES.darkMagician,
  // Forzado al final de la ronda: 1 perdición en el enemigo sin perdición más cercano a él.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'roundEnds') return []
    const noDoom = (l: string) => enemiesAt(state, l).some((e) => !e.doom)
    const at = nearestLocation(state, self.location, noDoom)
    const target = at === null ? undefined : enemiesAt(state, at).find((e) => !e.doom)
    return target ? [{ type: 'PlaceDoomOnEnemy', enemy: target.id, amount: 1 }] : []
  },
})

// Servant of Flame (A Willing Sacrifice): al ser derrotado, códex Φ según quién era el heraldo.
const HARBINGER_EFFECTS: Record<string, (i: InvestigatorId) => Message[]> = {
  'David Renfield': (i) => [
    { type: 'SearchDeck', investigator: i, traits: ['Tome', 'Spell'], to: 'play', discount: 99 },
  ],
  'Cornelia Akely': (i) => [{ type: 'Heal', investigator: i, damage: 3, horror: 0 }],
  "Naomi O'Bannion": (i) => [{ type: 'GainResources', investigator: i, amount: 5 }],
  'Sgt. Earl Monroe': (i) => [
    { type: 'SearchDeck', investigator: i, traits: ['Weapon'], to: 'play', discount: 99 },
  ],
  'Abigail Foreman': (i) => [{ type: 'DrawCards', investigator: i, amount: 3 }],
  'Margaret Liu': (i) => [{ type: 'Heal', investigator: i, damage: 0, horror: 3 }],
}

registerEnemy({
  code: CODES.servantOfFlame,
  forced: (state, trigger) => {
    if (trigger.type !== 'enemyDefeated' || trigger.enemy.code !== CODES.servantOfFlame) return []
    const harbinger = state.campaignLog?.values.harbinger ?? ''
    const effect = HARBINGER_EFFECTS[harbinger]
    if (!effect) return []
    return [
      {
        type: 'Story',
        entry: {
          title: 'story.queenOfAsh.codexTitle',
          body: `story.queenOfAsh.codex.${harbinger.replace(/[^A-Za-z]/g, '')}`,
        },
        choices: [
          {
            label: 'choice.continue',
            then: activeInvestigators(state).flatMap((i) => effect(i.id)),
          },
        ],
      },
    ]
  },
})

// ---------------------------------------------------------------------------
// Traiciones
// ---------------------------------------------------------------------------

const chooseType = (
  investigator: InvestigatorId,
  then: (cardType: string) => Message[],
): Message => ({
  type: 'Ask',
  investigator,
  question: {
    kind: 'chooseOne',
    prompt: 'prompt.chooseCardType',
    choices: ['asset', 'event', 'skill'].map((cardType) => ({
      label: `choice.cardType.${cardType}`,
      then: then(cardType),
    })),
  },
})

registerTreachery({
  code: CODES.ashenRebirth,
  // [willpower] (4). Si fallas, 2 daño directo o 2 horror directo (de lo que más tengas).
  revelation: (state, investigator) => {
    const me = getInvestigator(state, investigator)
    const hurt: Message = { type: 'TakeDamage', investigator, damage: 2, horror: 0, direct: true }
    const scared: Message = { type: 'TakeDamage', investigator, damage: 0, horror: 2, direct: true }
    const onFail: Message[] =
      me.damage > me.horror
        ? [hurt]
        : me.horror > me.damage
          ? [scared]
          : [
              {
                type: 'Ask',
                investigator,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.chooseEffect',
                  choices: [
                    { label: 'choice.twoDirectDamage', then: [hurt] },
                    { label: 'choice.twoDirectHorror', then: [scared] },
                  ],
                },
              },
            ]
    return [effectTest(investigator, 'Ashen Rebirth', 'willpower', 4, { onFail })]
  },
})

registerTreachery({
  code: CODES.blasphemousInvocation,
  // [willpower] (3): por cada punto de fallo, 1 perdición en un Sectario sin perdición. Si
  // fallas y no hay ninguno, buscas un Sectario en el mazo o el descarte y lo robas.
  revelation: (state, investigator) => {
    const cultists = Object.values(state.enemies).filter(
      (e) => (e.traits ?? []).includes('Cultist') && !e.doom,
    )
    if (cultists.length === 0) {
      return [
        effectTest(investigator, 'Blasphemous Invocation', 'willpower', 3, {
          onFail: [{ type: 'SearchEncounterForTrait', investigator, trait: 'Cultist' }],
        }),
      ]
    }
    return [
      effectTest(investigator, 'Blasphemous Invocation', 'willpower', 3, {
        onFailEach: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEnemy',
              choices: cultists.map((e): Choice => ({
                label: 'choice.enemy',
                params: { enemy: e.name },
                target: { type: 'enemy', id: e.id },
                then: [{ type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 1 }],
              })),
            },
          },
        ],
      }),
    ]
  },
})

registerTreachery({
  code: CODES.unnaturalDecay,
  // [willpower] (4). Si fallas: 1 perdición en un apoyo tuyo, o 2 daño.
  revelation: (state, investigator) => {
    const mine = Object.values(state.assets).filter((a) => a.owner === investigator)
    return [
      effectTest(investigator, 'Unnatural Decay', 'willpower', 4, {
        onFail: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEffect',
              choices: [
                ...mine.map((a): Choice => ({
                  label: 'choice.doomOnAsset',
                  params: { card: playerCardDef(a.code)?.name ?? a.code },
                  target: { type: 'asset', id: a.id },
                  then: [{ type: 'PlaceDoomOnAsset', asset: a.id, amount: 1 }],
                })),
                { label: 'choice.takeTwoDamage', then: [damage(investigator, 2)] },
              ],
            },
          },
        ],
      }),
    ]
  },
})

registerTreachery({
  code: CODES.putridVapors,
  // [agility] (3). Si fallas: 1 horror y descartas un apoyo tuyo (que no sea de historia).
  revelation: (state, investigator) => {
    const mine = Object.values(state.assets).filter(
      (a) => a.owner === investigator && !(playerCardDef(a.code)?.traits ?? []).includes('Story'),
    )
    return [
      effectTest(investigator, 'Putrid Vapors', 'agility', 3, {
        onFail: [
          damage(investigator, 0, 1),
          ...(mine.length
            ? [
                {
                  type: 'Ask',
                  investigator,
                  question: {
                    kind: 'chooseOne',
                    prompt: 'prompt.chooseCardToDiscard',
                    choices: mine.map((a): Choice => ({
                      label: 'choice.discard',
                      params: { card: playerCardDef(a.code)?.name ?? a.code },
                      target: { type: 'asset', id: a.id },
                      then: [{ type: 'DiscardAsset', asset: a.id }],
                    })),
                  },
                } as Message,
              ]
            : []),
        ],
      }),
    ]
  },
})

registerTreachery({
  code: CODES.languor,
  // En tu zona de amenaza (máx. 1). Al empezar tu turno, descarta la primera carta de tu
  // mazo: si es una debilidad, la robas; si no, esta ronda no puedes jugar ni comprometer
  // cartas de ese tipo. [acción][acción]: descartarla.
  revelation: (state, investigator, self) => {
    const already = Object.values(state.treacheries).some(
      (x) =>
        x.code === CODES.languor &&
        x.placement.type === 'threatArea' &&
        x.placement.investigator === investigator,
    )
    return already
      ? []
      : [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'threatArea', investigator },
          },
        ]
  },
  abilities: (_state, self) => [
    {
      key: `${self.id}:discard`,
      label: 'ability.discardTreachery',
      params: { card: 'Languor' },
      actions: 2,
      provokes: true,
      then: [{ type: 'DiscardTreachery', treachery: self.id }],
    },
  ],
  forced: (state, trigger, self) => {
    if (
      trigger.type !== 'turnBegins' ||
      self.placement.type !== 'threatArea' ||
      self.placement.investigator !== trigger.investigator
    ) {
      return []
    }
    const investigator = trigger.investigator
    const top = getInvestigator(state, investigator).deck[0]
    if (!top) return []
    const def = playerCardDef(top)
    if (def?.weakness) return [{ type: 'DrawCards', investigator, amount: 1 }]
    return [
      { type: 'MillDeck', investigator, amount: 1 },
      ...(def ? [{ type: 'BlockCardType', investigator, cardType: def.type } as Message] : []),
    ]
  },
})

registerTreachery({
  code: CODES.dissonance,
  // [willpower] (3). Si fallas: pierdes 1 acción y descartas de tu mano todas las cartas
  // (no debilidades) del tipo que elijas.
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Dissonance', 'willpower', 3, {
      onFail: [
        { type: 'LoseActions', investigator, amount: 1 },
        chooseType(investigator, (cardType) => [
          { type: 'DiscardCardsOfType', investigator, cardType, all: true },
        ]),
      ],
    }),
  ],
})

registerTreachery({
  code: CODES.torment,
  // Peligro. [willpower] (3). Si fallas, nombras un tipo de carta: cada investigador
  // descarta 1 carta de ese tipo de su mano.
  revelation: (state, investigator) => [
    effectTest(investigator, 'Torment', 'willpower', 3, {
      onFail: [
        chooseType(investigator, (cardType) =>
          activeInvestigators(state).map((i): Message => ({
            type: 'DiscardCardsOfType',
            investigator: i.id,
            cardType,
            all: false,
          })),
        ),
      ],
    }),
  ],
})

// ---------------------------------------------------------------------------
// Localizaciones
// ---------------------------------------------------------------------------

const resign = (investigator: InvestigatorId): AbilityOption => ({
  key: 'culvert:resign',
  label: 'ability.resign',
  actions: 1,
  provokes: false,
  then: [{ type: 'Resign', investigator }],
})

registerLocation({
  code: CODES.sewerCulvert,
  abilities: (_state, _self, investigator) => [resign(investigator)],
})

const enteredHere = (state: GameState, investigator: InvestigatorId, location: string) =>
  getInvestigator(state, investigator).location === location

// Infested Pipes: tras entrar, descarta del mazo de encuentros hasta un enemigo y róbalo.
registerLocation({
  code: CODES.infestedPipes,
  forced: (state, trigger, self) =>
    trigger.type === 'afterMove' && enteredHere(state, trigger.investigator, self.id)
      ? [{ type: 'DiscardUntilEnemy', investigator: trigger.investigator }]
      : [],
})

// Overgrown Tunnels: tras entrar, pierdes 1 acción.
registerLocation({
  code: CODES.overgrownTunnels,
  forced: (state, trigger, self) =>
    trigger.type === 'afterMove' && enteredHere(state, trigger.investigator, self.id)
      ? [{ type: 'LoseActions', investigator: trigger.investigator, amount: 1 }]
      : [],
})

// Flooded Crypt: al acabar tu turno aquí, 1 horror.
registerLocation({
  code: CODES.floodedCrypt,
  forced: (state, trigger, self) =>
    trigger.type === 'turnEnds' && enteredHere(state, trigger.investigator, self.id)
      ? [damage(trigger.investigator, 0, 1)]
      : [],
})

// Smuggler's Cache: al acabar tu turno aquí, ganas 1 recurso.
registerLocation({
  code: CODES.smugglersCache,
  forced: (state, trigger, self) =>
    trigger.type === 'turnEnds' && enteredHere(state, trigger.investigator, self.id)
      ? [{ type: 'GainResources', investigator: trigger.investigator, amount: 1 }]
      : [],
})

// Toxic Waste Pit: al acabar tu turno aquí, eliges y descartas 1 carta de tu mano.
registerLocation({
  code: CODES.toxicWastePit,
  forced: (state, trigger, self) =>
    trigger.type === 'turnEnds' &&
    enteredHere(state, trigger.investigator, self.id) &&
    getInvestigator(state, trigger.investigator).hand.length > 0
      ? [{ type: 'ChooseDiscardFromHand', investigator: trigger.investigator, amount: 1 }]
      : [],
})

// Underground Cistern: sin pistas, se repone hasta su valor. Al terminar la fase de
// investigación, se descarta cada Sectario no Élite preparado de aquí y se pone 1
// perdición en el plan por cada uno.
registerLocation({
  code: CODES.undergroundCistern,
  forced: (state, trigger, self) => {
    if (trigger.type === 'afterDiscoverClues' && trigger.location === self.id) {
      const now = state.locations[self.id]
      return now && now.clues === 0
        ? [
            {
              type: 'PlaceCluesOnLocationFromPool',
              location: self.id,
              amount: 2 * state.startingInvestigatorCount,
            },
          ]
        : []
    }
    if (trigger.type === 'investigationPhaseEnds') {
      const sacrificed = enemiesAt(state, self.id).filter(
        (e) =>
          !e.exhausted &&
          (e.traits ?? []).includes('Cultist') &&
          !(e.traits ?? []).includes('Elite'),
      )
      return sacrificed.length
        ? [
            ...sacrificed.map((e): Message => ({ type: 'DiscardEnemy', enemy: e.id })),
            { type: 'PlaceDoom', amount: sacrificed.length },
            { type: 'CheckAgenda' },
          ]
        : []
    }
    return []
  },
})

// Sluice Control: acción: [agility] o [combat] (5); si aciertas, abres la compuerta (resolución 3).
registerLocation({
  code: CODES.sluiceControl,
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:open`,
      label: 'ability.openSluice',
      actions: 1,
      provokes: true,
      then: [
        chooseSkillTest(investigator, 'Sluice Control', ['agility', 'combat'], 5, {
          onSuccess: [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 3 } }],
        }),
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Resoluciones (guía de campaña, páginas 13 y 14)
// ---------------------------------------------------------------------------

const entry = (key: string, effects: StoryEntry['effects'] = []): StoryEntry => ({
  title: `story.queenOfAsh.${key}Title`,
  body: `story.queenOfAsh.${key}`,
  effects,
})
const note = (key: string) => ({
  key: 'story.effect.record',
  params: { note: `story.note.${key}` },
})
const record = (key: string): Message => ({ type: 'RecordNote', note: key })
const end = (outcome: ScenarioOutcome): Message => ({ type: 'EndScenario', outcome, told: true })
const trauma = (physical: number, mental: number): Message => ({
  type: 'SufferTrauma',
  physical,
  mental,
})

function resolutionStory(state: GameState, outcome: ScenarioOutcome): Message[] {
  if (outcome.type === 'noResolution') {
    return [
      {
        type: 'Story',
        entry: entry('noResolution', [
          note('elokossReborn'),
          { key: 'story.effect.allKilled' },
          { key: 'story.effect.campaignLost' },
        ]),
      },
      record('elokossReborn'),
      record('campaignLost'),
      { type: 'KillInvestigators' },
      end(outcome),
    ]
  }
  const victory = (bonus: number): Message => ({
    type: 'EarnExperience',
    amount: bonus,
    victory: true,
  })
  switch (outcome.resolution) {
    case 1:
      return [
        {
          type: 'Story',
          entry: entry('resolution1', [
            note('defeatedElokoss'),
            { key: 'story.effect.experience', params: { bonus: 5 } },
            { key: 'story.effect.collector' },
            { key: 'story.effect.traumaBoth', params: { n: 2 } },
            { key: 'story.effect.campaignWon' },
          ]),
        },
        record('defeatedElokoss'),
        record('campaignWon'),
        victory(5),
        trauma(2, 2),
        end(outcome),
      ]
    case 2:
      return [
        {
          type: 'Story',
          entry: entry('resolution2', [
            note('stoppedRebirth'),
            { key: 'story.effect.experience', params: { bonus: 5 } },
            { key: 'story.effect.collector' },
            { key: 'story.effect.traumaBoth', params: { n: 2 } },
            { key: 'story.effect.campaignWon' },
          ]),
        },
        record('stoppedRebirth'),
        record('campaignWon'),
        victory(5),
        trauma(2, 2),
        end(outcome),
      ]
    default: {
      // Resolución 3: mueren los que no se retiraron; los que sí, experiencia y trauma mental.
      const escaped = state.investigators.filter((i) => i.resigned)
      return [
        {
          type: 'Story',
          entry: entry('resolution3', [
            note('floodedRitual'),
            { key: 'story.effect.killedUnlessResigned' },
            { key: 'story.effect.escapedRewards' },
            { key: 'story.effect.campaignWon' },
          ]),
        },
        record('floodedRitual'),
        record('campaignWon'),
        { type: 'KillInvestigators', exceptResigned: true },
        ...escaped.flatMap((i): Message[] => [
          { type: 'EarnExperience', amount: 3, victory: true, investigator: i.id },
          { type: 'SufferTrauma', investigator: i.id, mental: 3 },
        ]),
        end(outcome),
      ]
    }
  }
}
