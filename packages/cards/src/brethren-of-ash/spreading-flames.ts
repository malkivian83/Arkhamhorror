/**
 * Escenario I de Brethren of Ash: "Spreading Flames" (caja básica de 2026).
 * Análisis completo en docs-proyecto/09-spreading-flames.md.
 *
 * Los códigos son los números de carta de la caja (12xxx). Los efectos están
 * implementados a partir de su descripción; no se incluye el texto de las cartas.
 *
 * Pendiente: efectos al avanzar plan y acto, habilidades activadas (parlamento,
 * acciones de localizaciones, descartar Fire! o Unspeakable Truths), el resto de
 * localizaciones (entran con el acto 1), Dr. Henry Armitage y resoluciones.
 */
import {
  activeInvestigators,
  enemiesAt,
  getInvestigator,
  investigatorsAt,
  nearestLocation,
  registerEnemy,
  registerScenario,
  registerTreachery,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type Message,
  type ScenarioDefinition,
  type SkillType,
  type TreacheryCard,
} from '@lcg/engine'
import { CHAOS_BAGS, type Difficulty } from './campaign'

export const SPREADING_FLAMES = 'spreading-flames'

export const CODES = {
  yourFriendsRoom: '12113',
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

export function spreadingFlames(difficulty: Difficulty = 'standard'): ScenarioDefinition {
  return {
    id: SPREADING_FLAMES,
    locations: [
      {
        id: CODES.yourFriendsRoom,
        name: "Your Friend's Room",
        shroud: 2,
        clueValue: 2,
        cluesPerInvestigator: true,
        connections: ['12117'],
      },
    ],
    startingLocation: CODES.yourFriendsRoom,
    agendas: [
      { name: 'Past Curfew', doomThreshold: 3 },
      { name: 'Lit Up', doomThreshold: 5 },
      { name: 'Wild Flames', doomThreshold: 10 },
    ],
    acts: [
      {
        name: "Where There's Smoke…",
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'endOfRound',
      },
      // Los objetivos de los actos 2–4 se implementan con los efectos de avance.
      {
        name: 'Escape the Dorms',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'endOfRound',
      },
      {
        name: 'Searching for Dr. Armitage',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        advanceTiming: 'endOfRound',
      },
      {
        name: 'Blaze of Glory',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'endOfRound',
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

registerScenario({
  id: SPREADING_FLAMES,
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
