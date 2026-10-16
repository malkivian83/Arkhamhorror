/**
 * Escenario I de Brethren of Ash: "Spreading Flames" (caja básica de 2026).
 * Análisis completo en docs-proyecto/09-spreading-flames.md.
 *
 * Los códigos son los números de carta de la caja (12xxx). Los efectos están
 * implementados a partir de su descripción; no se incluye el texto de las cartas.
 *
 * Pendiente: Dr. Henry Armitage (requiere apoyos en juego), el forzado de
 * Hellhound, la victoria de las localizaciones y las resoluciones de campaña.
 */
import {
  activeInvestigators,
  enemiesAt,
  getInvestigator,
  getLocation,
  investigatorsAt,
  leadInvestigator,
  nearestLocation,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerScenario,
  registerTreachery,
  withinLimit,
  type AbilityOption,
  type EnemyCard,
  type LocationCard,
  type GameState,
  type InvestigatorId,
  type Message,
  type ScenarioDefinition,
  type ScenarioOutcome,
  type SkillType,
  type StoryEntry,
  type TreacheryCard,
} from '@lcg/engine'
import { CHAOS_BAGS, type Difficulty } from './campaign'

export const SPREADING_FLAMES = 'spreading-flames'

export const CODES = {
  pastCurfew: '12106',
  litUp: '12107',
  wildFlames: '12108',
  whereTheresSmoke: '12109',
  escapeTheDorms: '12110',
  searchingForDrArmitage: '12111',
  blazeOfGlory: '12112',
  yourFriendsRoom: '12113',
  miskatonicQuad: '12116',
  dormitories: '12117',
  scienceHall: '12118',
  warrenObservatory: '12119',
  orneLibrary: '12120',
  servantOfFlame: '12114',
  cantorOfFlame: '12121',
  hellhound: '12122',
  bystander: '12123',
  cosmicEvils: '12124',
  unspeakableTruths: '12125',
  forbiddenSecrets: '12126',
  extraplanarVisions: '12127',
  wildCompulsion: '12128',
  fire: '12129',
  noxiousSmoke: '12130',
  mutated: '12131',
  mutatedExperiment: '12132',
} as const

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

const enemy = (card: Omit<EnemyCard, 'kind'>): EnemyCard => ({ kind: 'enemy', ...card })
const treachery = (card: Omit<TreacheryCard, 'kind'>): TreacheryCard => ({
  kind: 'treachery',
  ...card,
})

export const servantOfFlame = enemy({
  code: CODES.servantOfFlame,
  name: 'Servant of Flame',
  traits: ['Humanoid', 'Elite'],
  fight: 4,
  health: 5,
  healthPerInvestigator: true,
  evade: 4,
  damage: 2,
  horror: 2,
  keywords: ['hunter', 'retaliate'],
  prey: { type: 'lowestSkill', skill: 'agility' },
  victory: 2,
})

const cantorOfFlame = enemy({
  code: CODES.cantorOfFlame,
  name: 'Cantor of Flame',
  traits: ['Humanoid', 'Cultist'],
  fight: 2,
  health: 2,
  evade: 2,
  damage: 1,
  horror: 0,
  keywords: ['retaliate'],
})

const hellhound = enemy({
  code: CODES.hellhound,
  name: 'Hellhound',
  traits: ['Creature', 'Monster'],
  fight: 2,
  health: 3,
  evade: 4,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
})

const bystander = enemy({
  code: CODES.bystander,
  name: 'Bystander',
  traits: ['Humanoid', 'Civilian'],
  fight: 1,
  health: 1,
  evade: 1,
  damage: 1,
  horror: 0,
  keywords: ['doomed'],
})

const mutatedExperiment = enemy({
  code: CODES.mutatedExperiment,
  name: 'Mutated Experiment',
  traits: ['Creature', 'Mutated'],
  fight: 3,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: [],
})

export const fire = treachery({ code: CODES.fire, name: 'Fire!', traits: ['Hazard'], keywords: [] })

const cosmicEvils = treachery({
  code: CODES.cosmicEvils,
  name: 'Cosmic Evils',
  traits: ['Omen'],
  keywords: ['peril'],
})
const unspeakableTruths = treachery({
  code: CODES.unspeakableTruths,
  name: 'Unspeakable Truths',
  traits: ['Terror'],
  keywords: [],
})
const forbiddenSecrets = treachery({
  code: CODES.forbiddenSecrets,
  name: 'Forbidden Secrets',
  traits: ['Pact'],
  keywords: [],
})
const extraplanarVisions = treachery({
  code: CODES.extraplanarVisions,
  name: 'Extraplanar Visions',
  traits: ['Power'],
  keywords: [],
})
const wildCompulsion = treachery({
  code: CODES.wildCompulsion,
  name: 'Wild Compulsion',
  traits: ['Madness', 'Bane'],
  keywords: [],
})
const noxiousSmoke = treachery({
  code: CODES.noxiousSmoke,
  name: 'Noxious Smoke',
  traits: ['Hazard'],
  keywords: [],
})
const mutated = treachery({
  code: CODES.mutated,
  name: 'Mutated!',
  traits: ['Mutation'],
  keywords: [],
})

const copies = <T>(card: T, n: number): T[] => Array.from({ length: n }, () => ({ ...card }))

/** Mazo de encuentros tras apartar Fire!, Servant of Flame y Dr. Armitage (24 cartas). */
export const encounterDeck = [
  ...copies(cantorOfFlame, 2),
  ...copies(hellhound, 2),
  ...copies(bystander, 3),
  ...copies(cosmicEvils, 3),
  ...copies(unspeakableTruths, 2),
  ...copies(forbiddenSecrets, 2),
  ...copies(extraplanarVisions, 2),
  ...copies(wildCompulsion, 2),
  ...copies(noxiousSmoke, 2),
  ...copies(mutated, 2),
  ...copies(mutatedExperiment, 2),
]

const location = (card: LocationCard): LocationCard => card

/** Conexiones según los símbolos de las cartas (ver docs-proyecto/09). */
export const locationCards = {
  yourFriendsRoom: location({
    id: CODES.yourFriendsRoom,
    name: "Your Friend's Room",
    shroud: 2,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [CODES.dormitories],
  }),
  dormitories: location({
    id: CODES.dormitories,
    name: 'Dormitories',
    shroud: 3,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [CODES.yourFriendsRoom, CODES.miskatonicQuad],
  }),
  miskatonicQuad: location({
    id: CODES.miskatonicQuad,
    name: 'Miskatonic Quad',
    shroud: 1,
    clueValue: 0,
    cluesPerInvestigator: false,
    connections: [CODES.dormitories, CODES.scienceHall, CODES.warrenObservatory, CODES.orneLibrary],
  }),
  scienceHall: location({
    id: CODES.scienceHall,
    name: 'Science Hall',
    shroud: 2,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [CODES.miskatonicQuad],
    victory: 1,
  }),
  warrenObservatory: location({
    id: CODES.warrenObservatory,
    name: 'Warren Observatory',
    shroud: 3,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [CODES.miskatonicQuad],
  }),
  orneLibrary: location({
    id: CODES.orneLibrary,
    name: 'Orne Library',
    shroud: 4,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [CODES.miskatonicQuad],
    victory: 1,
  }),
}

export function spreadingFlames(difficulty: Difficulty = 'standard'): ScenarioDefinition {
  const { yourFriendsRoom, ...others } = locationCards
  return {
    id: SPREADING_FLAMES,
    intro: { title: 'story.spreadingFlames.introTitle', body: 'story.spreadingFlames.intro' },
    locations: [yourFriendsRoom],
    setAsideLocations: Object.values(others),
    startingLocation: CODES.yourFriendsRoom,
    agendas: [
      { code: CODES.pastCurfew, name: 'Past Curfew', doomThreshold: 3 },
      { code: CODES.litUp, name: 'Lit Up', doomThreshold: 5 },
      { code: CODES.wildFlames, name: 'Wild Flames', doomThreshold: 10 },
    ],
    acts: [
      {
        code: CODES.whereTheresSmoke,
        name: "Where There's Smoke…",
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'endOfRound',
      },
      {
        code: CODES.escapeTheDorms,
        name: 'Escape the Dorms',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: CODES.searchingForDrArmitage,
        name: 'Searching for Dr. Armitage',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        advanceTiming: 'endOfRound',
        cluesAtLocation: CODES.orneLibrary,
      },
      {
        code: CODES.blazeOfGlory,
        name: 'Blaze of Glory',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck,
    setAside: [...copies(fire, 5), { ...servantOfFlame }],
    chaosBag: [...CHAOS_BAGS[difficulty]],
    tokenValues: {},
  }
}

// ---------------------------------------------------------------------------
// Tarjeta de referencia: efectos de las fichas
// ---------------------------------------------------------------------------

/** Texto de resolución con sus efectos de campaña (guía de campaña, página 4). */
const entry = (key: string, effects: StoryEntry['effects'] = []): StoryEntry => ({
  title: `story.spreadingFlames.${key}Title`,
  body: `story.spreadingFlames.${key}`,
  effects,
})
const note = (key: string) => ({
  key: 'story.effect.record',
  params: { note: `story.note.${key}` },
})
const PROCEED = {
  key: 'story.effect.proceed',
  params: { scenario: 'story.scenario.smokeAndMirrors' },
}
const MENTAL_TRAUMA = { key: 'story.effect.mentalTrauma' }
const xp = (bonus: number) => ({ key: 'story.effect.experience', params: { bonus } })

const end = (resolution: number): Message => ({
  type: 'EndScenario',
  outcome: { type: 'resolution', resolution },
  told: true,
})

/** Resoluciones de Spreading Flames, con las decisiones que pide la guía. */
function resolutionStory(state: GameState, outcome: ScenarioOutcome): Message[] {
  if (outcome.type === 'noResolution') {
    return [
      {
        type: 'Story',
        entry: entry('noResolution', [note('universityBurned'), MENTAL_TRAUMA, xp(2), PROCEED]),
      },
      { type: 'EndScenario', outcome, told: true },
    ]
  }
  const bearer: Message = {
    type: 'Story',
    entry: entry('armitageBearer'),
    choices: state.investigators.map((i) => ({
      label: 'choice.investigator',
      params: { name: i.name },
      then: [{ type: 'Log', key: 'log.armitageBearer', params: { name: i.name } }],
    })),
  }
  return [
    {
      type: 'Story',
      entry: entry('resolution1', [
        note('defeatedPursuer'),
        { key: 'story.effect.armitage' },
        xp(3),
      ]),
    },
    bearer,
    {
      type: 'Story',
      entry: entry('decide'),
      choices: [
        {
          label: 'story.spreadingFlames.stay',
          then: [
            {
              type: 'Story',
              entry: entry('resolution2', [
                note('savedUniversity'),
                { key: 'story.effect.bonusAndPhysicalTrauma' },
                PROCEED,
              ]),
            },
            end(2),
          ],
        },
        {
          label: 'story.spreadingFlames.go',
          then: [
            {
              type: 'Story',
              entry: entry('resolution3', [note('universityBurned'), MENTAL_TRAUMA, PROCEED]),
            },
            end(3),
          ],
        },
      ],
    },
  ]
}

registerScenario({
  id: SPREADING_FLAMES,
  resolution: resolutionStory,
  tokenEffect: (state, token, investigator) => {
    const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
    const actNumber = state.actIndex + 1
    const drawFire: Message = { type: 'DrawFromEncounterDiscard', investigator, code: CODES.fire }
    switch (token) {
      case 'skull':
        return { modifier: -(hard ? actNumber + 1 : actNumber) }
      case 'tablet':
        return {
          modifier: hard ? -2 : -1,
          revealAnother: true,
          onFail: [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 }],
        }
      case 'elderThing':
        return hard
          ? { modifier: -4, onFail: [drawFire] }
          : { modifier: -3, onFailBy: { atLeast: 2, then: [drawFire] } }
      case 'cultist':
        // Esta campaña no usa sectario en este escenario.
        return { modifier: 0 }
    }
  },
})

// ---------------------------------------------------------------------------
// Comportamiento de las cartas de encuentro
// ---------------------------------------------------------------------------

function effectTest(
  investigator: InvestigatorId,
  source: string,
  skill: SkillType,
  difficulty: number,
  results: { onSuccess?: Message[]; onFail?: Message[]; onFailEach?: Message[] },
): Message {
  return {
    type: 'BeginSkillTest',
    investigator,
    skill,
    difficulty,
    kind: {
      type: 'effect',
      source,
      onSuccess: results.onSuccess ?? [],
      onFail: results.onFail ?? [],
      onFailEach: results.onFailEach ?? [],
    },
  }
}

/** "Prueba X o Y": el investigador elige la habilidad. */
function chooseSkillTest(
  investigator: InvestigatorId,
  source: string,
  skills: SkillType[],
  difficulty: number,
  results: Parameters<typeof effectTest>[4],
): Message {
  return {
    type: 'Ask',
    investigator,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.chooseSkill',
      choices: skills.map((skill) => ({
        label: `choice.test.${skill}`,
        params: { difficulty },
        then: [effectTest(investigator, source, skill, difficulty, results)],
      })),
    },
  }
}

const damage = (investigator: InvestigatorId, amount: number, horror = 0): Message => ({
  type: 'TakeDamage',
  investigator,
  damage: amount,
  horror,
})

registerTreachery({
  code: CODES.cosmicEvils,
  // Peligro. Elige: 1 perdición (puede avanzar el plan), o 1 daño y 1 horror directos y oleada.
  revelation: (_state, investigator) => [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEffect',
        choices: [
          {
            label: 'choice.placeDoom',
            then: [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }],
          },
          {
            label: 'choice.damageHorrorSurge',
            then: [damage(investigator, 1, 1), { type: 'GainSurge' }],
          },
        ],
      },
    },
  ],
})

registerTreachery({
  code: CODES.unspeakableTruths,
  // Acción doble: descartarla.
  abilities: (_state, self) => [
    {
      key: `${self.id}:discard`,
      label: 'ability.discardTreachery',
      params: { card: 'Unspeakable Truths' },
      actions: 2,
      provokes: true,
      then: [{ type: 'DiscardTreachery', treachery: self.id }],
    },
  ],
  // Se queda en tu zona de amenaza (máximo 1 por investigador).
  revelation: (state, investigator, self) => {
    const already = Object.values(state.treacheries).some(
      (t) =>
        t.code === CODES.unspeakableTruths &&
        t.placement.type === 'threatArea' &&
        t.placement.investigator === investigator,
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
  // Forzado: tras descubrir pistas, 1 horror.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterDiscoverClues' &&
    self.placement.type === 'threatArea' &&
    self.placement.investigator === trigger.investigator
      ? [damage(trigger.investigator, 0, 1)]
      : [],
})

registerTreachery({
  code: CODES.forbiddenSecrets,
  // Sin pistas: oleada. Si no, intelecto (3): por cada punto de fallo, dejar 1 pista o 1 horror.
  revelation: (state, investigator) => {
    if (getInvestigator(state, investigator).clues === 0) return [{ type: 'GainSurge' }]
    return [
      effectTest(investigator, 'Forbidden Secrets', 'intellect', 3, {
        onFailEach: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEffect',
              choices: [
                {
                  label: 'choice.placeClue',
                  requires: { type: 'hasClues', investigator },
                  then: [{ type: 'PlaceCluesOnLocation', investigator, amount: 1 }],
                },
                { label: 'choice.takeHorror', then: [damage(investigator, 0, 1)] },
              ],
            },
          },
        ],
      }),
    ]
  },
})

registerTreachery({
  code: CODES.extraplanarVisions,
  // Voluntad o intelecto (X = cartas en mano). Si fallas: 1 daño y descartar 1 al azar.
  revelation: (state, investigator) => [
    chooseSkillTest(
      investigator,
      'Extraplanar Visions',
      ['willpower', 'intellect'],
      getInvestigator(state, investigator).hand.length,
      {
        onFail: [
          damage(investigator, 1),
          { type: 'DiscardRandomFromHand', investigator, amount: 1 },
        ],
      },
    ),
  ],
})

registerTreachery({
  code: CODES.wildCompulsion,
  // Voluntad (3): por cada punto de fallo, descartar 1 carta al azar o perder 1 recurso.
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Wild Compulsion', 'willpower', 3, {
      onFailEach: [
        {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEffect',
            choices: [
              {
                label: 'choice.discardRandom',
                requires: { type: 'hasCardsInHand', investigator },
                then: [{ type: 'DiscardRandomFromHand', investigator, amount: 1 }],
              },
              {
                label: 'choice.loseResource',
                requires: { type: 'hasResources', investigator },
                then: [{ type: 'LoseResources', investigator, amount: 1 }],
              },
            ],
          },
        },
      ],
    }),
  ],
})

registerTreachery({
  code: CODES.noxiousSmoke,
  // Voluntad o agilidad (3): 1 daño por cada punto de fallo.
  revelation: (_state, investigator) => [
    chooseSkillTest(investigator, 'Noxious Smoke', ['willpower', 'agility'], 3, {
      onFailEach: [damage(investigator, 1)],
    }),
  ],
})

registerTreachery({
  code: CODES.mutated,
  // Voluntad (2, +2 si hay un enemigo en tu localización). Si fallas: 2 daño,
  // o 1 horror a cada investigador de tu localización.
  revelation: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    const enemyHere = here !== null && enemiesAt(state, here).length > 0
    const everyoneHere = here === null ? [] : investigatorsAt(state, here)
    return [
      effectTest(investigator, 'Mutated!', 'willpower', enemyHere ? 4 : 2, {
        onFail: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEffect',
              choices: [
                { label: 'choice.takeTwoDamage', then: [damage(investigator, 2)] },
                {
                  label: 'choice.horrorToEachHere',
                  then: everyoneHere.map((i) => damage(i.id, 0, 1)),
                },
              ],
            },
          },
        ],
      }),
    ]
  },
})

const hasFire = (state: GameState, location: string) =>
  Object.values(state.treacheries).some(
    (t) =>
      t.code === CODES.fire && t.placement.type === 'location' && t.placement.location === location,
  )

registerTreachery({
  code: CODES.fire,
  // Acción: agilidad (3); si aciertas, descartas Fire!.
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:discard`,
      label: 'ability.discardFire',
      actions: 1,
      provokes: true,
      then: [
        effectTest(investigator, 'Fire!', 'agility', 3, {
          onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
        }),
      ],
    },
  ],
  // Se une a la localización más cercana sin Fire!.
  revelation: (state, investigator, self) => {
    const here = getInvestigator(state, investigator).location
    if (here === null) return []
    const target = nearestLocation(state, here, (l) => !hasFire(state, l))
    return target === null
      ? []
      : [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'location', location: target },
          },
        ]
  },
  // Forzado al terminar la fase de investigación: 1 daño directo a cada carta no
  // Élite con salud en esa localización (investigadores y enemigos; apoyos, pendiente).
  forced: (state, trigger, self) => {
    if (trigger.type !== 'investigationPhaseEnds' || self.placement.type !== 'location') return []
    const location = self.placement.location
    return [
      ...investigatorsAt(state, location).map((i) => damage(i.id, 1)),
      ...enemiesAt(state, location)
        .filter((e) => !(e.traits ?? []).includes('Elite'))
        .map((e): Message => ({ type: 'DamageEnemy', enemy: e.id, amount: 1 })),
    ]
  },
})

registerEnemy({
  code: CODES.mutatedExperiment,
  // Forzado al ser derrotado: 1 horror a cada investigador de su localización.
  forced: (state, trigger, self) =>
    trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id
      ? activeInvestigators(state)
          .filter((i) => i.location === self.location)
          .map((i) => damage(i.id, 0, 1))
      : [],
})

// Hellhound: "tras atacarte en la fase de enemigos, descarta un apoyo que controles".
// Se implementará cuando existan los apoyos en juego.

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

/** En orden de jugadores, cada investigador hace una prueba; quien falla sufre `penalty`. */
const eachInvestigatorTests = (
  state: GameState,
  source: string,
  skill: SkillType,
  difficulty: number,
  penalty: (investigator: InvestigatorId) => Message,
): Message[] =>
  activeInvestigators(state).map((i) =>
    effectTest(i.id, source, skill, difficulty, { onFail: [penalty(i.id)] }),
  )

/** Parlamento de los tres planes: intelecto (2) para descartar un Bystander de tu localización. */
const parleyBystander = (state: GameState, investigator: InvestigatorId): AbilityOption[] => {
  const here = getInvestigator(state, investigator).location
  const bystanders =
    here === null ? [] : enemiesAt(state, here).filter((e) => e.code === CODES.bystander)
  const [first] = bystanders
  if (!first) return []
  return [
    {
      key: 'agenda:parley',
      label: 'ability.parleyBystander',
      actions: 1,
      provokes: false,
      then: [
        effectTest(investigator, 'Parley', 'intellect', 2, {
          onSuccess: [{ type: 'DiscardEnemy', enemy: first.id }],
        }),
      ],
    },
  ]
}

registerAgenda({
  code: CODES.pastCurfew,
  abilities: (state, _self, investigator) => parleyBystander(state, investigator),
  onAdvance: (state) =>
    eachInvestigatorTests(state, 'Past Curfew', 'willpower', 3, (i) => damage(i, 0, 1)),
})

registerAgenda({
  code: CODES.litUp,
  abilities: (state, _self, investigator) => parleyBystander(state, investigator),
  onAdvance: (state) => [
    { type: 'MoveSetAsideToEncounterDiscard', code: CODES.fire, count: 4 },
    ...eachInvestigatorTests(state, 'Lit Up', 'agility', 3, (i) => damage(i, 1)),
  ],
})

registerAgenda({
  code: CODES.wildFlames,
  abilities: (state, _self, investigator) => parleyBystander(state, investigator),
  // Forzado: tras colocar perdición, el jefe roba el Fire! superior del descarte.
  forced: (state, trigger) => {
    const lead = leadInvestigator(state)
    return trigger.type === 'afterDoomPlaced' && lead
      ? [{ type: 'DrawFromEncounterDiscard', investigator: lead.id, code: CODES.fire }]
      : []
  },
  // Todos los que siguen en juego son derrotados (y sufrirán 1 trauma físico).
  onAdvance: (state) =>
    activeInvestigators(state).map((i): Message => ({
      type: 'DefeatInvestigator',
      investigator: i.id,
    })),
})

// ---------------------------------------------------------------------------
// Acto
// ---------------------------------------------------------------------------

const discardEachEnemy = (state: GameState): Message[] =>
  Object.values(state.enemies).map((e): Message => ({ type: 'DiscardEnemy', enemy: e.id }))

registerAct({
  code: CODES.whereTheresSmoke,
  onAdvance: (state) => [
    ...discardEachEnemy(state),
    { type: 'PutLocationIntoPlay', location: CODES.dormitories },
    { type: 'PutLocationIntoPlay', location: CODES.miskatonicQuad },
    { type: 'SpawnSetAsideEnemy', code: CODES.servantOfFlame, location: CODES.dormitories },
    {
      type: 'PlaceSetAsideTreachery',
      code: CODES.fire,
      placement: { type: 'location', location: CODES.yourFriendsRoom },
    },
    { type: 'MoveSetAsideToEncounterDiscard', code: CODES.fire },
  ],
})

registerAct({
  code: CODES.escapeTheDorms,
  // Objetivo: todos los investigadores no derrotados en Miskatonic Quad.
  objectiveMet: (state) => {
    const active = activeInvestigators(state)
    return active.length > 0 && active.every((i) => i.location === CODES.miskatonicQuad)
  },
  onAdvance: (state) => [
    { type: 'SetAsideEnemy', code: CODES.servantOfFlame },
    ...discardEachEnemy(state).filter(
      (m) => m.type !== 'DiscardEnemy' || state.enemies[m.enemy]?.code !== CODES.servantOfFlame,
    ),
    { type: 'RemoveLocation', location: CODES.yourFriendsRoom },
    { type: 'PutLocationIntoPlay', location: CODES.orneLibrary },
    { type: 'PutLocationIntoPlay', location: CODES.scienceHall },
    { type: 'PutLocationIntoPlay', location: CODES.warrenObservatory },
  ],
})

registerAct({
  code: CODES.searchingForDrArmitage,
  // Pendiente: Dr. Henry Armitage entra en juego bajo el control de un investigador.
  onAdvance: (state) => {
    const lead = leadInvestigator(state)
    const perInv = state.startingInvestigatorCount
    return [
      { type: 'SpawnSetAsideEnemy', code: CODES.servantOfFlame, location: CODES.miskatonicQuad },
      { type: 'PlaceCluesOnLocationFromPool', location: CODES.miskatonicQuad, amount: 3 * perInv },
      ...(lead
        ? [
            {
              type: 'SearchAndDrawEncounter',
              investigator: lead.id,
              code: CODES.fire,
              amount: perInv,
            } as const,
          ]
        : []),
    ]
  },
})

registerAct({
  code: CODES.blazeOfGlory,
  // Objetivo: Servant of Flame derrotado.
  objectiveMet: (state) => state.victoryDisplay.includes(CODES.servantOfFlame),
  abilities: (state, _self, investigator) => {
    const perInv = state.startingInvestigatorCount
    const here = getInvestigator(state, investigator).location
    const groupClues = activeInvestigators(state).reduce((sum, i) => sum + i.clues, 0)
    const damageOptions: AbilityOption[] =
      here === null || groupClues < perInv
        ? []
        : enemiesAt(state, here).map((e) => ({
            key: 'act:blaze',
            label: 'ability.blazeDamage',
            params: { enemy: e.name, clues: perInv, damage: perInv },
            actions: 0,
            provokes: false,
            then: [
              { type: 'SpendGroupClues', amount: perInv },
              { type: 'DamageEnemy', enemy: e.id, amount: perInv },
            ],
          }))
    return [
      ...damageOptions,
      {
        key: 'act:resign',
        label: 'ability.resign',
        actions: 1,
        provokes: false,
        then: [{ type: 'Resign', investigator }],
      },
    ]
  },
})

// ---------------------------------------------------------------------------
// Localizaciones
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.yourFriendsRoom,
  // Acción: un enemigo de una localización conectada viene y se enfrenta a ti (sin ataques de oportunidad).
  abilities: (state, self, investigator) =>
    self.connections
      .filter((l) => state.locations[l])
      .flatMap((l) => enemiesAt(state, l))
      .map((e) => ({
        key: `${self.id}:engage`,
        label: 'ability.engageFromConnecting',
        params: { enemy: e.name, location: getLocation(state, e.location).name },
        actions: 1,
        provokes: false,
        then: [
          { type: 'MoveEnemy', enemy: e.id, location: self.id },
          { type: 'EngageEnemy', enemy: e.id, investigator },
        ],
      })),
})

registerLocation({
  code: CODES.dormitories,
  // Acción: curar 1 daño y 1 horror (una vez por partida, por investigador).
  abilities: (state, self, investigator) => {
    const i = getInvestigator(state, investigator)
    if (i.damage === 0 && i.horror === 0) return []
    return [
      {
        key: `${self.id}:heal`,
        label: 'ability.heal',
        actions: 1,
        provokes: true,
        limit: { per: 'game' },
        then: [{ type: 'Heal', investigator, damage: 1, horror: 1 }],
      },
    ]
  },
})

registerLocation({
  code: CODES.miskatonicQuad,
  // Rápida, en tu turno, con 1 o 2 investigadores: moverse a una conexión (límite de grupo 1 por ronda).
  abilities: (state, self, investigator) => {
    const count = activeInvestigators(state).length
    if (count < 1 || count > 2) return []
    return self.connections
      .filter((l) => state.locations[l])
      .map((l) => ({
        key: `${self.id}:move`,
        label: 'ability.quadMove',
        params: { location: getLocation(state, l).name },
        actions: 0,
        provokes: false,
        limit: { per: 'round', group: true },
        then: [{ type: 'MoveTo', investigator, location: l }],
      }))
  },
})

registerLocation({
  code: CODES.scienceHall,
  // Forzado: tras descubrir pistas aquí, eliges y descartas 1 carta de tu mano.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterDiscoverClues' && trigger.location === self.id
      ? [{ type: 'ChooseDiscardFromHand', investigator: trigger.investigator, amount: 1 }]
      : [],
})

registerLocation({
  code: CODES.warrenObservatory,
  // Reacción: tras descubrir pistas aquí, puedes robar 1 carta (límite 1 por ronda).
  forced: (state, trigger, self) => {
    if (trigger.type !== 'afterDiscoverClues' || trigger.location !== self.id) return []
    const key = `${self.id}:draw`
    const limit = { per: 'round' } as const
    if (!withinLimit(state, key, trigger.investigator, limit)) return []
    return [
      {
        type: 'Ask',
        investigator: trigger.investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.reaction',
          choices: [
            {
              label: 'ability.observatoryDraw',
              then: [
                {
                  type: 'UseAbility',
                  investigator: trigger.investigator,
                  key,
                  actions: 0,
                  provokes: false,
                  limit,
                  then: [{ type: 'DrawCards', investigator: trigger.investigator, amount: 1 }],
                },
              ],
            },
            { label: 'choice.skip', then: [] },
          ],
        },
      },
    ]
  },
})

registerLocation({
  code: CODES.orneLibrary,
  // Acción doble: robar 3 cartas (una vez por partida, por investigador).
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:draw`,
      label: 'ability.orneDraw',
      actions: 2,
      provokes: true,
      limit: { per: 'game' },
      then: [{ type: 'DrawCards', investigator, amount: 3 }],
    },
  ],
})

/** Posición de cada localización en la mesa (columna, fila), según su mapa. */
export const SPREADING_FLAMES_LAYOUT: Record<string, [number, number]> = {
  [CODES.yourFriendsRoom]: [0, 1],
  [CODES.dormitories]: [1, 1],
  [CODES.miskatonicQuad]: [2, 1],
  [CODES.scienceHall]: [2, 0],
  [CODES.orneLibrary]: [2, 2],
  [CODES.warrenObservatory]: [3, 1],
}
