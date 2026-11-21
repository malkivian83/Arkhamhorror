/**
 * Cartas de encuentro de Escrito en la roca, acto 1: Horrores en la roca (Parásito de
 * cristal, Plaga cromática, Calcificación), Refracciones y las traiciones de El primer
 * día, El segundo día y El último día. Las Cuevas están en `written-in-rock.ts`.
 */
import {
  getInvestigator,
  playerCardDef,
  registerEnemy,
  registerTreachery,
  valleyTime,
  type Choice,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type Message,
  type Treachery,
  type TreacheryCard,
} from '@lcg/engine'
import { copies, effectTest, enemy, treachery } from '../scenario-helpers'

export const ROCK_CODES = {
  crystalParasite: '10721',
  chromaBlight: '10722',
  calcification: '10723',
  empyreanBrilliance: '10730',
  captivatingGleam: '10731',
  swarm: '10676',
  downpour: '10678',
  otherworldlyVisions: '10680',
} as const

const isNight = (state: GameState) => valleyTime(state.campaignLog)?.time === 'night'

export const crystalParasite: EnemyCard = enemy({
  code: ROCK_CODES.crystalParasite,
  name: 'Crystal Parasite',
  traits: ['Monster', 'Insect', 'Blight'],
  fight: 2,
  health: 6,
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

/** Horrores en la roca sin Lugares: el Parásito de cristal empieza apartado. */
export const horrorsInTheRockDeck = [
  ...copies(t(ROCK_CODES.chromaBlight, 'Chroma Blight', ['Power', 'Blight']), 2),
  ...copies(t(ROCK_CODES.calcification, 'Calcification', ['Hazard', 'Blight']), 2),
]
export const refractionsDeck = [
  ...copies(t(ROCK_CODES.empyreanBrilliance, 'Empyrean Brilliance', ['Power', 'Colour']), 2),
  ...copies(t(ROCK_CODES.captivatingGleam, 'Captivating Gleam', ['Power', 'Colour'], ['surge']), 3),
]
/** Conjunto del día actual (sin su Indicador de tiempo, que es una Historia). */
export const daySetDeck = (day: 1 | 2 | 3) =>
  day === 1
    ? copies(t(ROCK_CODES.swarm, 'Swarm', ['Hazard']), 3)
    : day === 2
      ? copies(t(ROCK_CODES.downpour, 'Downpour', ['Hazard']), 3)
      : copies(t(ROCK_CODES.otherworldlyVisions, 'Otherworldly Visions', ['Terror', 'Power']), 3)

const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})

const toThreatArea = (self: Treachery, investigator: InvestigatorId): Message => ({
  type: 'PlaceTreachery',
  treachery: self.id,
  placement: { type: 'threatArea', investigator },
})

/** «Límite de 1 por investigador»: si ya tiene una copia, la nueva se descarta. */
const alreadyThreatened = (state: GameState, self: Treachery, investigator: InvestigatorId) =>
  Object.values(state.treacheries).some(
    (other) =>
      other.id !== self.id &&
      other.code === self.code &&
      other.placement.type === 'threatArea' &&
      other.placement.investigator === investigator,
  )

const inThreatAreaOf = (self: Treachery, investigator: InvestigatorId) =>
  self.placement.type === 'threatArea' && self.placement.investigator === investigator

// Parásito de cristal: (Día) tras atacar se cura 2; (Noche) +2 combate y +1 daño por cada
// 2 daños que tenga.
registerEnemy({
  code: ROCK_CODES.crystalParasite,
  forced: (state, trigger, self) =>
    !isNight(state) && trigger.type === 'afterEnemyAttack' && trigger.enemy === self.id
      ? [{ type: 'HealEnemy', enemy: self.id, amount: 2 }]
      : [],
  attackModifier: (state, self) => ({
    damage: isNight(state) ? Math.floor(self.damage / 2) : 0,
    horror: 0,
  }),
})

/** (Noche) +2 de combate por cada 2 daños del Parásito de cristal (en `enemyStat` del escenario). */
export const crystalParasiteFight = (state: GameState, enemyCode: string, damage: number) =>
  enemyCode === ROCK_CODES.crystalParasite && isNight(state) ? 2 * Math.floor(damage / 2) : 0

// Plaga cromática: tras robar cartas de tu mazo, 1 brillo; con 6, aparece un Parásito.
registerTreachery({
  code: ROCK_CODES.chromaBlight,
  revelation: (state, investigator, self) =>
    alreadyThreatened(state, self, investigator)
      ? [{ type: 'DiscardTreachery', treachery: self.id }]
      : [toThreatArea(self, investigator)],
  forced: (state, trigger, self) => {
    if (trigger.type !== 'afterCardsDrawn' || !inThreatAreaOf(self, trigger.investigator)) return []
    if ((self.tokens ?? 0) + 1 < 6)
      return [{ type: 'AddTreacheryTokens', treachery: self.id, amount: 1 }]
    const here = getInvestigator(state, trigger.investigator).location
    const parasite = state.setAside.some((card) => card.code === ROCK_CODES.crystalParasite)
    return [
      ...(here !== null && parasite
        ? [
            {
              type: 'SpawnSetAsideEnemy',
              code: ROCK_CODES.crystalParasite,
              location: here,
            } as Message,
          ]
        : []),
      // «Retira de la partida»: no va a la pila de descartes de Encuentros.
      { type: 'DiscardTreachery', treachery: self.id } as Message,
      { type: 'ScenarioSpecific', key: 'removeDiscarded', data: { code: self.code } } as Message,
    ]
  },
})

// Calcificación: la primera vez que te mueves cada ronda, 1 daño directo.
// [acción]: [agility] (3) para descartarla, o recibe 1 daño directo para tener éxito.
registerTreachery({
  code: ROCK_CODES.calcification,
  revelation: (state, investigator, self) =>
    alreadyThreatened(state, self, investigator)
      ? [{ type: 'DiscardTreachery', treachery: self.id }]
      : [toThreatArea(self, investigator)],
  forced: (state, trigger, self) => {
    if (trigger.type !== 'afterMove' || !inThreatAreaOf(self, trigger.investigator)) return []
    const key = `calcification:${self.id}`
    if (state.scenarioMeta?.[key] === state.round) return []
    return [
      { type: 'SetScenarioMeta', key, value: state.round },
      {
        type: 'TakeDamage',
        investigator: trigger.investigator,
        damage: 1,
        horror: 0,
        direct: true,
      },
    ]
  },
  abilities: (_state, self, investigator) =>
    inThreatAreaOf(self, investigator)
      ? [
          {
            key: `${self.id}:discard`,
            label: 'ability.discardTreachery',
            params: { card: 'Calcification' },
            actions: 1,
            provokes: true,
            then: [
              ask(investigator, 'prompt.chooseEffect', [
                {
                  label: 'choice.test.agility',
                  params: { difficulty: 3 },
                  then: [
                    effectTest(investigator, 'Calcification', 'agility', 3, {
                      onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
                    }),
                  ],
                },
                {
                  label: 'choice.hemlockVale.directDamageToSucceed',
                  then: [
                    { type: 'TakeDamage', investigator, damage: 1, horror: 0, direct: true },
                    { type: 'DiscardTreachery', treachery: self.id },
                  ],
                },
              ]),
            ],
          },
        ]
      : [],
})

// Fulgor empíreo: (Día) [willpower] (2), +2 con 5 o más cartas en la mano; si fallas,
// elige y descarta 2 cartas. (Noche) descarta 1 carta al azar y [willpower] (su coste);
// si fallas, 2 de horror.
registerTreachery({
  code: ROCK_CODES.empyreanBrilliance,
  revelation: (state, investigator) => {
    if (!isNight(state)) {
      const hand = getInvestigator(state, investigator).hand.length
      return [
        effectTest(investigator, 'Empyrean Brilliance', 'willpower', hand >= 5 ? 4 : 2, {
          onFail: [{ type: 'DiscardDownTo', investigator, size: Math.max(0, hand - 2) }],
        }),
      ]
    }
    return [{ type: 'ScenarioSpecific', key: 'empyreanNight', data: { investigator } }]
  },
})

/** (Noche) de Fulgor empíreo: la carta se elige al azar con el generador de la partida. */
export function empyreanNight(state: GameState, investigator: InvestigatorId): Message[] {
  const hand = getInvestigator(state, investigator).hand
  if (!hand.length) return [effectTest(investigator, 'Empyrean Brilliance', 'willpower', 0, {})]
  return [
    { type: 'DiscardRandomFromHand', investigator, amount: 1 },
    { type: 'ScenarioSpecific', key: 'empyreanTest', data: { investigator } },
  ]
}

export function empyreanTest(state: GameState, investigator: InvestigatorId): Message[] {
  const card = getInvestigator(state, investigator).discard.at(-1)
  const cost = card ? (playerCardDef(card)?.cost ?? 0) : 0
  return [
    effectTest(
      investigator,
      'Empyrean Brilliance',
      'willpower',
      typeof cost === 'number' ? cost : 0,
      {
        onFail: [{ type: 'TakeDamage', investigator, damage: 0, horror: 2 }],
      },
    ),
  ]
}

// Destello cautivador: en tu zona de amenaza (límite 1). Si no tienes cartas en la mano,
// recibe 5 de horror y descártala.
registerTreachery({
  code: ROCK_CODES.captivatingGleam,
  revelation: (state, investigator, self) =>
    alreadyThreatened(state, self, investigator)
      ? [{ type: 'DiscardTreachery', treachery: self.id }]
      : [toThreatArea(self, investigator)],
  forced: (state, _trigger, self) => {
    if (self.placement.type !== 'threatArea') return []
    const investigator = self.placement.investigator
    if (getInvestigator(state, investigator).hand.length > 0) return []
    return [
      { type: 'DiscardTreachery', treachery: self.id },
      { type: 'TakeDamage', investigator, damage: 0, horror: 5 },
    ]
  },
})

const perPointFailed = (
  investigator: InvestigatorId,
  name: string,
  skill: 'agility' | 'intellect' | 'willpower',
  difficulty: number,
  choices: Choice[],
): Message =>
  effectTest(investigator, name, skill, difficulty, {
    onFailEach: [ask(investigator, 'prompt.chooseEffect', choices)],
  })

// Enjambre: [agility] (3); por cada punto de fallo, pierde 1 recurso o recibe 1 daño.
registerTreachery({
  code: ROCK_CODES.swarm,
  revelation: (_state, investigator) => [
    perPointFailed(investigator, 'Swarm', 'agility', 3, [
      {
        label: 'choice.loseResource',
        requires: { type: 'hasResources', investigator },
        then: [{ type: 'LoseResources', investigator, amount: 1 }],
      },
      {
        label: 'choice.takeDamage',
        params: { n: 1 },
        then: [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 }],
      },
    ]),
  ],
})

// Aguacero: [intellect] (3); por cada punto de fallo, pierde 1 acción o deja 1 pista.
registerTreachery({
  code: ROCK_CODES.downpour,
  revelation: (_state, investigator) => [
    perPointFailed(investigator, 'Downpour', 'intellect', 3, [
      { label: 'choice.loseAction', then: [{ type: 'LoseActions', investigator, amount: 1 }] },
      {
        label: 'choice.placeClue',
        requires: { type: 'hasClues', investigator },
        then: [{ type: 'PlaceCluesOnLocation', investigator, amount: 1 }],
      },
    ]),
  ],
})

// Visiones de otro mundo: [willpower] (3), +2 con un Enemigo [[Colour]] en tu Lugar; por
// cada punto de fallo, 1 de horror o descarta 1 carta al azar.
registerTreachery({
  code: ROCK_CODES.otherworldlyVisions,
  revelation: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    const colour = Object.values(state.enemies).some(
      (e) => e.location === here && e.traits?.includes('Colour'),
    )
    return [
      perPointFailed(investigator, 'Otherworldly Visions', 'willpower', colour ? 5 : 3, [
        {
          label: 'choice.takeHorror',
          then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 1 }],
        },
        {
          label: 'choice.hemlockVale.discardRandom',
          requires: { type: 'hasCardsInHand', investigator },
          then: [{ type: 'DiscardRandomFromHand', investigator, amount: 1 }],
        },
      ]),
    ]
  },
})
