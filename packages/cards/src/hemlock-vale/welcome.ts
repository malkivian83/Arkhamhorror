/**
 * La fiesta del Valle de la Cicuta, Preludio: ¡Bienvenidos al Valle de la Cicuta!
 * (guía, pp. 4–9). Plan y documentación en docs-proyecto/165-la-fiesta-del-valle-de-la-cicuta.md.
 *
 * Partida sin mazo de Encuentros: los investigadores visitan el Valle, leen el códice de
 * Lugares y habitantes y, cuando avanza el plan, preparan el primer estudio (R1).
 */
import {
  activeInvestigators,
  getInvestigator,
  playerCardBehavior,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  registerLocation,
  registerPlayerCard,
  registerPlayerCards,
  registerScenario,
  valleyTime,
  type AbilityOption,
  type CardCode,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
  type ScenarioDefinition,
  type SkillType,
  type StoryEntry,
  type ValleyResident,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { hemlockValeChaosBag } from './chaos-bag'
import { VALE, valeDayLocations } from './vale-locations'

export const HEMLOCK_WELCOME = 'hemlock-vale-welcome'

export const WELCOME_CODES = {
  dayOne: '10675',
  agenda: '10681',
  act: '10682',
  reference: '10704',
} as const

/** Habitantes: carta, entrada del códice que lee su Negociar y Lugar donde entra en juego. */
export const RESIDENTS: Record<
  ValleyResident,
  { code: CardCode; name: string; codex: number; health: number; sanity: number }
> = {
  motherRachel: { code: '10693', name: 'Mother Rachel', codex: 1, health: 4, sanity: 4 },
  leahAtwood: { code: '10694', name: 'Leah Atwood', codex: 2, health: 3, sanity: 1 },
  simeonAtwood: { code: '10695', name: 'Simeon Atwood', codex: 3, health: 3, sanity: 2 },
  williamHemlock: { code: '10696', name: 'William Hemlock', codex: 4, health: 2, sanity: 2 },
  riverHawthorne: { code: '10697', name: 'River Hawthorne', codex: 5, health: 2, sanity: 2 },
  gideonMizrah: { code: '10698', name: 'Gideon Mizrah', codex: 6, health: 1, sanity: 3 },
  judithPark: { code: '10699', name: 'Judith Park', codex: 7, health: 3, sanity: 2 },
  theoPeters: { code: '10700', name: 'Theo Peters', codex: 8, health: 2, sanity: 3 },
}

registerPlayerCards(
  Object.values(RESIDENTS).map(({ code, name, health, sanity }) => ({
    code,
    name,
    story: true,
    unique: true,
    type: 'asset' as const,
    class: 'neutral',
    traits: ['Resident'],
    health,
    sanity,
  })),
)

const entry = (key: string): StoryEntry => ({
  title: `story.hemlockVale.welcome.${key}.title`,
  body: `story.hemlockVale.welcome.${key}.body`,
})
const read = (state: GameState, key: string): Message[] =>
  state.interactive ? [{ type: 'Story', entry: entry(key) }] : []

// ---------------------------------------------------------------------------
// Códice (guía, p. 2): cada entrada se resuelve una vez por preludio.
// ---------------------------------------------------------------------------

const codexKey = (n: number, investigator?: InvestigatorId) =>
  investigator ? `codex:${n}:${investigator}` : `codex:${n}`
export const codexResolved = (state: GameState, n: number, investigator?: InvestigatorId) =>
  !!state.scenarioMeta?.[codexKey(n, investigator)]

const day = (state: GameState) => valleyTime(state.campaignLog)?.day ?? 1

const raise = (resident: ValleyResident): Message => ({ type: 'ChangeRelationship', resident })

const place = (resident: ValleyResident, location: string): Message => ({
  type: 'PlaceAsset',
  code: RESIDENTS[resident].code,
  name: RESIDENTS[resident].name,
  placement: { type: 'location', location },
})

const skip: Choice = { label: 'choice.skip', then: [] }

const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})

const drawOrGain = (investigator: InvestigatorId): Message =>
  ask(investigator, 'prompt.hemlockVale.drawOrGain', [
    {
      label: 'choice.drawCards',
      params: { n: 1 },
      then: [{ type: 'DrawCards', investigator, amount: 1 }],
    },
    { label: 'choice.gainResource', then: [{ type: 'GainResources', investigator, amount: 1 }] },
    skip,
  ])

/** «Puedes jugar … de tu mano, ignorando su coste.» */
function playFromHand(
  state: GameState,
  investigator: InvestigatorId,
  traits: string[],
  assetsOnly: boolean,
): Message[] {
  const cards = [...new Set(getInvestigator(state, investigator).hand)].filter((code) => {
    const def = playerCardDef(code)
    return (
      !!def &&
      (!assetsOnly || def.type === 'asset') &&
      traits.some((trait) => def.traits?.includes(trait))
    )
  })
  if (!cards.length) return []
  return [
    ask(investigator, 'prompt.hemlockVale.playFree', [
      ...cards.map((code): Choice => ({
        label: 'choice.card',
        params: { card: code },
        then: [
          { type: 'PlayCard', investigator, code, byEffect: true, noCost: true, asFast: true },
        ],
      })),
      skip,
    ]),
  ]
}

const searchTop = (investigator: InvestigatorId, traits: string[]): Message => ({
  type: 'SearchDeck',
  investigator,
  top: 9,
  traits,
  to: 'hand',
  anyType: true,
  optional: true,
})

function moveAnywhere(state: GameState, investigator: InvestigatorId): Message {
  const here = getInvestigator(state, investigator).location
  return ask(investigator, 'prompt.hemlockVale.moveAnywhere', [
    ...Object.values(state.locations)
      .filter((l) => l.id !== here)
      .map((l): Choice => ({
        label: 'choice.location',
        params: { location: l.name },
        target: { type: 'location', id: l.id },
        then: [{ type: 'MoveTo', investigator, location: l.id }],
      })),
    skip,
  ])
}

const residentPlaced = (state: GameState, resident: ValleyResident) =>
  Object.values(state.placedAssets ?? {}).some((a) => a.code === RESIDENTS[resident].code) ||
  Object.values(state.assets).some((a) => a.code === RESIDENTS[resident].code)

/** Efectos de las entradas 1–16 (pp. 7–9). */
function codexEffects(state: GameState, n: number, investigator: InvestigatorId): Message[] {
  switch (n) {
    case 1:
      return playFromHand(state, investigator, ['Charm', 'Spell'], true)
    case 2:
      return [raise('leahAtwood'), ...playFromHand(state, investigator, ['Tool'], false)]
    case 3:
      return [raise('simeonAtwood'), searchTop(investigator, ['Tactic', 'Trick'])]
    case 4:
      return [raise('williamHemlock'), searchTop(investigator, ['Tome', 'Talent'])]
    case 5:
      return [raise('riverHawthorne'), { type: 'GainResources', investigator, amount: 3 }]
    case 6:
      return [raise('gideonMizrah'), { type: 'DrawCards', investigator, amount: 3 }]
    case 7:
      return [raise('judithPark'), ...playFromHand(state, investigator, ['Weapon'], false)]
    case 8:
      return [raise('theoPeters'), moveAnywhere(state, investigator)]
    case 9:
      return [drawOrGain(investigator), place('riverHawthorne', VALE.boardingHouse)]
    case 10:
      return [drawOrGain(investigator), place('theoPeters', VALE.theCrossroads)]
    case 11:
      return [drawOrGain(investigator), place('motherRachel', VALE.hemlockChapel)]
    case 12:
      return [drawOrGain(investigator), place('leahAtwood', VALE.theOldMill)]
    case 13:
      return [drawOrGain(investigator), place('simeonAtwood', VALE.theAtwoodHouse)]
    case 14: {
      // Repetible: cada investigador que no lo haya resuelto puede volver a activarlo.
      const item: Message[] =
        getInvestigator(state, investigator).resources > 0
          ? [
              ask(investigator, 'prompt.hemlockVale.tadsItem', [
                {
                  label: 'choice.hemlockVale.tadsItem',
                  then: [
                    { type: 'SetScenarioMeta', key: codexKey(14, investigator), value: 1 },
                    { type: 'SpendResources', investigator, amount: 1 },
                    {
                      type: 'SearchDeck',
                      investigator,
                      traits: ['Item'],
                      to: 'play',
                      discount: 99,
                      optional: true,
                    },
                  ],
                },
                skip,
              ]),
            ]
          : []
      return [
        ...item,
        ...(residentPlaced(state, 'judithPark')
          ? []
          : [place('judithPark', VALE.tadsGeneralStore)]),
      ]
    }
    case 15:
      return [drawOrGain(investigator), place('williamHemlock', VALE.valeSchoolhouse)]
    case 16:
      return [searchTop(investigator, ['Ally']), place('gideonMizrah', VALE.theCommons)]
    default:
      return []
  }
}

/** Lee la entrada `n` del códice (se resuelve al llegar, con el estado de ese momento). */
export const codex = (_state: GameState, n: number, investigator: InvestigatorId): Message[] => [
  { type: 'ScenarioSpecific', key: 'codex', data: { n, investigator } },
]

function resolveCodex(state: GameState, n: number, investigator: InvestigatorId): Message[] {
  if (n === 14 ? codexResolved(state, 14, investigator) : codexResolved(state, n)) return []
  return [
    ...(n === 14 ? [] : [{ type: 'SetScenarioMeta', key: codexKey(n), value: 1 } as Message]),
    ...read(state, `codex${n}`),
    ...codexEffects(state, n, investigator),
  ]
}

const codexAvailable = (state: GameState, n: number, investigator: InvestigatorId) =>
  !(n === 14 ? codexResolved(state, 14, investigator) : codexResolved(state, n))

const codexAbility = (
  state: GameState,
  investigator: InvestigatorId,
  location: string,
  n: number,
  parley = false,
): AbilityOption[] =>
  codexAvailable(state, n, investigator)
    ? [
        {
          key: `${location}:codex`,
          label: 'ability.hemlockVale.codex',
          params: { n },
          actions: 1,
          provokes: !parley,
          ...(parley ? { parley: true } : {}),
          target: { type: 'location', id: location },
          then: codex(state, n, investigator),
        },
      ]
    : []

// ---------------------------------------------------------------------------
// Lugares de El Valle, cara de Día (10705a–10712a)
// ---------------------------------------------------------------------------

registerLocation({
  code: VALE.boardingHouse,
  abilities: (state, self, investigator) => [
    ...codexAbility(state, investigator, self.id, 9),
    {
      key: `${self.id}:heal`,
      label: 'ability.hemlockVale.boardingHouseHeal',
      actions: 1,
      provokes: true,
      limit: { per: 'game' },
      target: { type: 'location', id: self.id },
      then: [
        ask(investigator, 'prompt.hemlockVale.heal', [
          {
            label: 'choice.healDamage',
            then: [{ type: 'Heal', investigator, damage: 1, horror: 0 }],
          },
          {
            label: 'choice.healHorror',
            then: [{ type: 'Heal', investigator, damage: 0, horror: 1 }],
          },
        ]),
      ],
    },
  ],
})

registerLocation({
  code: VALE.theCrossroads,
  abilities: (state, self, investigator) => [
    ...codexAbility(state, investigator, self.id, 10),
    // [rápida] Con 1 o 2 investigadores en la partida, durante tu turno: Moverte.
    ...(state.activeTurn === investigator && activeInvestigators(state).length <= 2
      ? [
          {
            key: `${self.id}:move`,
            label: 'ability.hemlockVale.crossroadsMove',
            actions: 0,
            provokes: false,
            actionKind: 'move' as const,
            limit: { per: 'round' as const, group: true },
            target: { type: 'location' as const, id: self.id },
            then: [{ type: 'ChooseMove', investigator, mandatory: true } as Message],
          },
        ]
      : []),
  ],
})

registerLocation({
  code: VALE.hemlockChapel,
  abilities: (state, self, investigator) => [
    ...codexAbility(state, investigator, self.id, 11),
    {
      key: `${self.id}:spell`,
      label: 'ability.hemlockVale.chapelSpell',
      actions: 1,
      provokes: true,
      limit: { per: 'game' },
      target: { type: 'location', id: self.id },
      then: [{ ...searchTop(investigator, ['Spell']), drawFound: true } as Message],
    },
  ],
})

registerLocation({
  code: VALE.theAtwoodHouse,
  abilities: (state, self, investigator) => codexAbility(state, investigator, self.id, 13),
})

registerLocation({
  code: VALE.tadsGeneralStore,
  abilities: (state, self, investigator) => codexAbility(state, investigator, self.id, 14, true),
})

registerLocation({
  code: VALE.valeSchoolhouse,
  abilities: (state, self, investigator) => [
    ...codexAbility(state, investigator, self.id, 15),
    {
      key: `${self.id}:tome`,
      label: 'ability.hemlockVale.schoolTome',
      actions: 1,
      provokes: true,
      limit: { per: 'game' },
      target: { type: 'location', id: self.id },
      then: [
        {
          type: 'SearchDeck',
          investigator,
          traits: ['Tome'],
          to: 'hand',
          drawFound: true,
          optional: true,
        },
      ],
    },
  ],
})

registerLocation({
  code: VALE.theCommons,
  abilities: (state, self, investigator) => codexAbility(state, investigator, self.id, 16),
})

// ---------------------------------------------------------------------------
// Habitantes por su lado de Apoyo de historia: Negociar lee su entrada del códice.
// ---------------------------------------------------------------------------

const parleyTest = (
  investigator: InvestigatorId,
  name: string,
  skill: SkillType,
  difficulty: number,
  onSuccess: Message[],
): Message => ({
  type: 'BeginSkillTest',
  investigator,
  skill,
  difficulty,
  tags: ['parley'],
  kind: { type: 'effect', source: name, onSuccess, onFail: [], onFailEach: [] },
})

function residentParley(
  state: GameState,
  resident: ValleyResident,
  investigator: InvestigatorId,
): { actions: number; costs?: Message[]; then: Message[] } | null {
  const { name, codex: n } = RESIDENTS[resident]
  const read = codex(state, n, investigator)
  const test = (skill: SkillType, difficulty: number) => [
    parleyTest(investigator, name, skill, difficulty, read),
  ]
  const self = getInvestigator(state, investigator)
  switch (resident) {
    case 'motherRachel':
      return { actions: 1, then: test('willpower', 2) }
    case 'leahAtwood':
      return { actions: 1, then: test('combat', 2) }
    case 'simeonAtwood':
      return { actions: 1, then: test('agility', 2) }
    case 'williamHemlock':
      return { actions: 1, then: test('intellect', 2) }
    case 'riverHawthorne':
      return {
        actions: 1,
        then: [
          ask(investigator, 'prompt.chooseSkill', [
            ...(['willpower', 'intellect'] as const).map((skill): Choice => ({
              label: `choice.test.${skill}`,
              params: { difficulty: 3 },
              then: test(skill, 3),
            })),
          ]),
        ],
      }
    case 'gideonMizrah':
      return { actions: 2, then: read }
    case 'judithPark': {
      const x = day(state)
      if (self.resources < x) return null
      return {
        actions: 1,
        costs: [{ type: 'SpendResources', investigator, amount: x }],
        then: read,
      }
    }
    case 'theoPeters': {
      const x = day(state)
      if (self.hand.length < x) return null
      return {
        actions: 1,
        costs: [{ type: 'DiscardDownTo', investigator, size: self.hand.length - x }],
        then: read,
      }
    }
  }
}

for (const resident of Object.keys(RESIDENTS) as ValleyResident[]) {
  registerPlayerCard({
    code: RESIDENTS[resident].code,
    placedAbilities: (state, self, investigator) => {
      if (state.scenarioId !== HEMLOCK_WELCOME || self.faceDown) return []
      if (codexResolved(state, RESIDENTS[resident].codex)) return []
      const parley = residentParley(state, resident, investigator)
      if (!parley) return []
      return [
        {
          key: `${self.id}:parley`,
          label: 'ability.hemlockVale.parley',
          params: { card: RESIDENTS[resident].code },
          actions: parley.actions,
          provokes: false,
          parley: true,

          target: { type: 'placed', id: self.id },
          ...(parley.costs ? { costs: parley.costs } : {}),
          then: parley.then,
        },
      ]
    },
  })
}

// ---------------------------------------------------------------------------
// Plan, acto y tarjeta de referencia
// ---------------------------------------------------------------------------

/** Tamaño de mano y recursos iniciales, con las bonificaciones de las cartas permanentes. */
function startingValues(state: GameState, investigator: InvestigatorId) {
  const permanents = Object.values(state.assets)
    .filter((asset) => asset.owner === investigator)
    .map((asset) => playerCardBehavior(asset.code)?.permanent)
    .filter((p) => !!p)
  return {
    hand: 5 + permanents.reduce((n, p) => n + (p.openingHand ?? 0), 0),
    resources: 5 + permanents.reduce((n, p) => n + (p.resources ?? 0), 0),
  }
}

/** «Elige 1 Apoyo que normalmente no empiece en juego» (R1, p. 9). */
function keepAsset(state: GameState, investigator: InvestigatorId, resources: number): Message {
  const record = (asset?: string): Message => ({
    type: 'RecordPreludeCarry',
    investigator,
    resources,
    ...(asset ? { asset } : {}),
  })
  const candidates = Object.values(state.assets).filter(
    (asset) =>
      asset.owner === investigator &&
      !playerCardBehavior(asset.code)?.permanent &&
      !playerCardDef(asset.code)?.story,
  )
  if (!candidates.length) return record()
  return ask(investigator, 'prompt.hemlockVale.keepAsset', [
    ...candidates.map((asset): Choice => ({
      label: 'choice.card',
      params: { card: asset.code },
      target: { type: 'asset', id: asset.id },
      then: [record(asset.id)],
    })),
    { label: 'choice.hemlockVale.keepNothing', then: [record()] },
  ])
}

export const DAY_ONE_SCENARIOS = [
  'hemlock-vale-written-in-rock',
  'hemlock-vale-hemlock-house',
  'hemlock-vale-silent-heath',
  'hemlock-vale-lost-sister',
  'hemlock-vale-thing-in-the-depths',
] as const

/** Final del preludio (R1): preparativos, fallo automático y elección del estudio. */
export function welcomeResolution(state: GameState): Message[] {
  const preparations = activeInvestigators(state).flatMap((i): Message[] => {
    const start = startingValues(state, i.id)
    return [
      { type: 'DiscardDownTo', investigator: i.id, size: start.hand },
      {
        type: 'ScenarioSpecific',
        key: 'keepAsset',
        data: { investigator: i.id, resources: start.resources },
      },
    ]
  })
  return [
    ...read(state, 'resolution1'),
    ...preparations,
    { type: 'AddChaosTokens', tokens: ['autoFail'] },
    {
      type: 'Story',
      entry: {
        title: 'story.hemlockVale.welcome.survey.title',
        body: 'story.hemlockVale.welcome.survey.body',
      },
      choices: DAY_ONE_SCENARIOS.map((scenario): Choice => ({
        label: `choice.hemlockVale.route.${scenario}`,
        then: [{ type: 'ChooseValleyRoute', scenario }],
      })),
    },
    { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 }, told: true },
  ]
}

registerAgenda({
  code: WELCOME_CODES.agenda,
  // Reverso: cada investigador se retira (→R1). Se prepara todo antes de abandonar la mesa.
  onAdvance: (state) => welcomeResolution(state),
})

registerAct({ code: WELCOME_CODES.act })

const actInPlay = (state: GameState) => state.acts[state.actIndex]?.code === WELCOME_CODES.act
const agendaInPlay = (state: GameState) =>
  state.agendas[state.agendaIndex]?.code === WELCOME_CODES.agenda

registerScenario({
  id: HEMLOCK_WELCOME,
  // Acto: los investigadores no pueden recibir daño ni horror ni ser derrotados.
  beforeDamage: (state) => (actInPlay(state) ? [] : null),
  forced: (state, trigger) =>
    // Plan: cuando robes una debilidad, cancela su revelación y descártala.
    trigger.type === 'whenPlayerCardDrawn' &&
    agendaInPlay(state) &&
    playerCardDef(trigger.card)?.weakness
      ? [{ type: 'DiscardFromHand', investigator: trigger.investigator, card: trigger.card }]
      : [],
  reactions: (state, trigger) =>
    // El viejo molino: después de que descubras una pista aquí, códice 12.
    trigger.type === 'afterDiscoverClues' &&
    trigger.location === VALE.theOldMill &&
    !codexResolved(state, 12)
      ? [
          {
            key: `${VALE.theOldMill}:codex`,
            investigator: trigger.investigator,
            label: 'ability.hemlockVale.codex',
            params: { n: 12 },
            target: { type: 'location', id: VALE.theOldMill },
            then: codex(state, 12, trigger.investigator),
          },
        ]
      : [],
  specific: (state, key, data) => {
    const investigator = String(data.investigator)
    if (key === 'codex') return push(state, ...resolveCodex(state, Number(data.n), investigator))
    if (key === 'keepAsset')
      return push(state, keepAsset(state, investigator, Number(data.resources)))
    return state
  },
  tokenEffect: (state, token, investigator) => {
    const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
    const parley = !!state.skillTest?.tags?.includes('parley')
    const hand = getInvestigator(state, investigator).hand.length
    switch (token) {
      case 'skull':
        return { modifier: -(day(state) + (hard ? 1 : 0)) }
      case 'cultist':
        return hard ? { modifier: parley ? 1 : -1 } : { modifier: 1, autoSucceed: parley }
      case 'tablet':
        return hard ? { modifier: hand < 2 ? -2 : -4 } : { modifier: hand < 3 ? 0 : -2 }
      case 'elderThing':
        return { modifier: hard ? -3 : -1, revealAnother: parley }
    }
  },
})

/** Preparación (p. 6) e introducción (pp. 4–5). */
export function welcomeToHemlockVale(context: ScenarioContext): ScenarioDefinition {
  const intro2: Message[] = [
    { type: 'Story', entry: entry('intro2') },
    { type: 'AddChaosTokens', tokens: ['tablet'] },
    { type: 'Story', entry: entry('intro4') },
  ]
  const intro3: Message[] = [
    { type: 'Story', entry: entry('intro3') },
    { type: 'AddChaosTokens', tokens: ['elderThing'] },
    { type: 'Story', entry: entry('intro4') },
  ]
  return {
    id: HEMLOCK_WELCOME,
    intro: {
      ...entry('intro1'),
      choices: [
        { label: 'choice.hemlockVale.survey', then: intro2 },
        { label: 'choice.hemlockVale.feast', then: intro3 },
      ],
    },
    setupInstructions: entry('setup'),
    locations: valeDayLocations,
    startingLocation: VALE.theCrossroads,
    agendas: [{ code: WELCOME_CODES.agenda, name: 'Welcome to Hemlock Vale!', doomThreshold: 6 }],
    acts: [
      {
        code: WELCOME_CODES.act,
        name: 'Dawn of the First Day',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [],
    noEncounterDeck: true,
    chaosBag: hemlockValeChaosBag(context),
    tokenValues: {},
    setup: [
      { type: 'InitializeValley' },
      { type: 'SetValleyTime', day: 1, time: 'day' },
      { type: 'PlaceDoom', amount: context.investigators.length },
    ],
  }
}
