/**
 * La fiesta del Valle de la Cicuta, Preludio: Alba del segundo día (guía, pp. 39–42).
 * Preludio jugable en el mapa del Valle de día, como el de bienvenida: fatiga, La maldición
 * Cicuta o Hambre de lobo según la comida de La primera tarde, códices 1 y 3–16 (Lugares y
 * habitantes), plan Nubes oscuras y acto Alba del segundo día.
 */
import {
  activeInvestigators,
  getInvestigator,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  registerPlayerCard,
  registerPlayerCards,
  registerScenario,
  residentAvailable,
  valleyTime,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
  type ScenarioDefinition,
  type StoryEntry,
  type ValleyResident,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { hemlockValeChaosBag } from './chaos-bag'
import { VALE, valeDayLocations } from './vale-locations'
import {
  codexKey,
  codexResolved,
  DAY_ONE_SCENARIOS,
  keepAsset,
  moveAnywhere,
  playFromHand,
  RESIDENTS,
  searchTop,
  startingValues,
} from './welcome'

export const DAWN_SECOND_DAY = 'hemlock-vale-dawn-second-day'

export const DAWN = {
  darkClouds: '10683',
  dawnOfTheSecondDay: '10684',
  hemlockCurse: '10685',
  cornHuskDoll: '10714',
} as const

/** Zona explorada de cada escenario de exploración (para elegir el del Día 2). */
const AREA: Record<string, string> = {
  'hemlock-vale-written-in-rock': 'northPointMine',
  'hemlock-vale-hemlock-house': 'hemlockHarbor',
  'hemlock-vale-silent-heath': 'pearlRidge',
  'hemlock-vale-lost-sister': 'akwanShoreline',
  'hemlock-vale-thing-in-the-depths': 'eastwickBog',
}

registerPlayerCards([
  {
    code: DAWN.hemlockCurse,
    name: 'The Hemlock Curse',
    type: 'skill',
    class: 'neutral',
    weakness: 'weakness',
    story: true,
    traits: ['Blight', 'Colour'],
    icons: { wild: 1 },
  },
  {
    code: DAWN.cornHuskDoll,
    name: 'Corn Husk Doll',
    story: true,
    type: 'asset',
    class: 'neutral',
    cost: 1,
    slots: ['accessory'],
    traits: ['Item', 'Charm'],
    icons: { willpower: 1, agility: 1 },
    fast: true,
    uses: { count: 3, type: 'wishes' },
  },
])

// La maldición Cicuta: sus iconos restan; si la prueba falla, descarta tu mano; al final de tu
// turno, si está en tu mano, descarta 1 carta al azar.
registerPlayerCard({
  code: DAWN.hemlockCurse,
  subtractsIcons: true,
})

const entry = (key: string): StoryEntry => ({
  title: `story.hemlockVale.dawnSecondDay.${key}.title`,
  body: `story.hemlockVale.dawnSecondDay.${key}.body`,
})
const read = (state: GameState, key: string): Message[] =>
  state.interactive ? [{ type: 'Story', entry: entry(key) }] : []
const meta = (state: GameState, key: string) => Number(state.scenarioMeta?.[key] ?? 0)
const setMeta = (key: string, value: number): Message => ({ type: 'SetScenarioMeta', key, value })
const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})
const xp = (amount = 1): Message => ({ type: 'EarnExperience', amount })
const raise = (resident: ValleyResident, amount = 1): Message => ({
  type: 'ChangeRelationship',
  resident,
  amount,
})
const lower = (resident: ValleyResident): Message => ({
  type: 'ChangeRelationship',
  resident,
  amount: -1,
})
const note = (resident: ValleyResident, n: string): Message => ({
  type: 'RecordResidentNote',
  resident,
  note: n,
})
const hasNote = (state: GameState, resident: ValleyResident, n: string) =>
  !!state.campaignLog?.valley?.residents?.[resident]?.notes?.includes(n)
const level = (state: GameState, resident: ValleyResident) =>
  state.campaignLog?.valley?.residents?.[resident]?.level ?? 0
const draw = (investigator: InvestigatorId, amount = 1): Message => ({
  type: 'DrawCards',
  investigator,
  amount,
})
const skip: Choice = { label: 'choice.skip', then: [] }

/** Coloca un habitante (sin tachar y aún apartado) en un Lugar del Valle. */
function place(state: GameState, resident: ValleyResident, location: string): Message[] {
  const code = RESIDENTS[resident].code
  const inPlay =
    Object.values(state.placedAssets ?? {}).some((a) => a.code === code) ||
    Object.values(state.assets).some((a) => a.code === code)
  if (inPlay || (state.campaignLog && !residentAvailable(state.campaignLog, resident))) return []
  return [
    {
      type: 'PlaceAsset',
      code,
      name: RESIDENTS[resident].name,
      placement: { type: 'location', location },
    },
  ]
}

/** Efectos de las entradas del códice (pp. 39–42). */
function dawnCodex(state: GameState, n: number, investigator: InvestigatorId): Message[] {
  const done = setMeta(codexKey(n), 1)
  switch (n) {
    case 1: {
      const intervened = hasNote(state, 'motherRachel', 'motherRachelIntervened')
      return [
        done,
        ...read(state, 'rachel1'),
        raise('motherRachel'),
        xp(),
        ...(intervened
          ? [
              ...read(state, 'rachel2'),
              { type: 'AddStoryAsset', investigator, code: DAWN.cornHuskDoll } as Message,
            ]
          : [
              ...read(state, 'rachel3'),
              draw(investigator),
              ...playFromHand(state, investigator, ['Charm', 'Spell'], true),
            ]),
      ]
    }
    case 3:
      return hasNote(state, 'simeonAtwood', 'simeonHasAPlan')
        ? [done, ...read(state, 'simeonPlan'), note('simeonAtwood', 'thePlanIsUnderway')]
        : [
            done,
            ...read(state, 'simeon'),
            draw(investigator),
            searchTop(investigator, ['Tactic', 'Trick']),
          ]
    case 4:
      return [
        done,
        ...read(state, 'william'),
        note('williamHemlock', 'williamTookHeart'),
        raise('williamHemlock'),
        lower('riverHawthorne'),
        xp(),
        searchTop(investigator, ['Tome', 'Talent']),
      ]
    case 5:
      return [
        done,
        ...read(state, 'river'),
        note('riverHawthorne', 'theSchemeIsInMotion'),
        raise('riverHawthorne', 2),
        lower('williamHemlock'),
        xp(2),
        { type: 'GainResources', investigator, amount: 4 },
      ]
    case 6:
      return [
        done,
        ...read(state, 'gideon1'),
        ...(hasNote(state, 'gideonMizrah', 'gideonToldTheStoryOfCaptainHemlock')
          ? [...read(state, 'gideon2'), note('gideonMizrah', 'gideonToldTheTaleOfTheAnnabelleLee')]
          : read(state, 'gideon3')),
        draw(investigator, 3),
        raise('gideonMizrah'),
        xp(),
      ]
    case 7:
      return [
        done,
        ...read(state, 'judith1'),
        ...(hasNote(state, 'judithPark', 'judithSavedTheInvestigators')
          ? [
              ...read(state, 'judith2'),
              ask(investigator, 'prompt.hemlockVale.judithAnswer', [
                {
                  label: 'choice.hemlockVale.iCanHandleIt',
                  then: [...read(state, 'judith3'), raise('judithPark'), xp()],
                },
                {
                  label: 'choice.hemlockVale.thanksForSaving',
                  then: [...read(state, 'judith4'), lower('judithPark'), xp()],
                },
              ]),
            ]
          : [draw(investigator), ...playFromHand(state, investigator, ['Weapon'], false)]),
      ]
    case 8:
      return hasNote(state, 'theoPeters', 'theoDistractedTheBear')
        ? [
            done,
            ...read(state, 'theoBear'),
            moveAnywhere(state, investigator),
            raise('theoPeters'),
            xp(),
          ]
        : [done, ...read(state, 'theo'), moveAnywhere(state, investigator)]
    case 9: {
      // Repetible: una de tres opciones (el grupo puede gastar acciones para más).
      const here = activeInvestigators(state).filter((i) => i.location === VALE.boardingHouse)
      return [
        ...read(state, 'boardingHouse'),
        ask(investigator, 'prompt.hemlockVale.boardingHouse', [
          ...(here.length
            ? [
                {
                  label: 'choice.hemlockVale.helpLeah',
                  then: [
                    ask(
                      investigator,
                      'prompt.hemlockVale.chooseInvestigator',
                      here.map((i) => ({
                        label: 'choice.investigator',
                        params: { name: i.name },
                        then: [
                          {
                            type: 'MoveTo',
                            investigator: i.id,
                            location: VALE.theCrossroads,
                          } as Message,
                        ],
                      })),
                    ),
                  ],
                },
              ]
            : []),
          ...(place(state, 'simeonAtwood', VALE.theOldMill).length
            ? [
                {
                  label: 'choice.hemlockVale.findSimeon',
                  then: place(state, 'simeonAtwood', VALE.theOldMill),
                },
              ]
            : []),
          ...(place(state, 'gideonMizrah', VALE.theCommons).length
            ? [
                {
                  label: 'choice.hemlockVale.findGideon',
                  then: place(state, 'gideonMizrah', VALE.theCommons),
                },
              ]
            : []),
          skip,
        ]),
      ]
    }
    case 10:
      return [
        done,
        ...read(state, 'crossroads'),
        draw(investigator),
        setMeta(`errand:${investigator}`, 1),
      ]
    case 11:
      return [done, ...read(state, 'chapel'), ...place(state, 'motherRachel', VALE.hemlockChapel)]
    case 12:
      return [done, ...read(state, 'oldMill'), draw(investigator, 3)]
    case 13:
      return [
        done,
        ...read(state, 'atwoodHouse'),
        ask(investigator, 'prompt.hemlockVale.argument', [
          ...(level(state, 'williamHemlock') >= 2
            ? [
                {
                  label: 'choice.hemlockVale.williamIsRight',
                  then: place(state, 'williamHemlock', VALE.theAtwoodHouse),
                },
              ]
            : []),
          ...(level(state, 'riverHawthorne') >= 2
            ? [
                {
                  label: 'choice.hemlockVale.riverIsRight',
                  then: place(state, 'riverHawthorne', VALE.theAtwoodHouse),
                },
              ]
            : []),
          {
            label: 'choice.hemlockVale.letThemArgue',
            then: [...read(state, 'atwoodArgue'), lower('williamHemlock'), lower('riverHawthorne')],
          },
        ]),
      ]
    case 14: {
      // Con el recado de Leah: sube su relación. Si no, puedes gastar 3 recursos para jugar un
      // Apoyo Objeto de tu mazo sin coste (y volver a activarlo con el recado).
      if (meta(state, `errand:${investigator}`))
        return [
          setMeta(codexKey(14, investigator), 1),
          ...read(state, 'tadsErrand'),
          raise('leahAtwood'),
          xp(),
        ]
      return [
        ...read(state, 'tads'),
        ...(getInvestigator(state, investigator).resources >= 3
          ? [
              ask(investigator, 'prompt.hemlockVale.tadsItem', [
                {
                  label: 'choice.hemlockVale.tadsItemThree',
                  then: [
                    { type: 'SpendResources', investigator, amount: 3 },
                    {
                      type: 'SearchDeck',
                      investigator,
                      traits: ['Item'],
                      to: 'play',
                      discount: 99,
                      optional: true,
                    } as Message,
                  ],
                },
                skip,
              ]),
            ]
          : []),
      ]
    }
    case 15:
      return [
        done,
        ...read(state, 'schoolhouse'),
        ...place(state, 'theoPeters', VALE.valeSchoolhouse),
      ]
    case 16: {
      // Retira un Apoyo de historia Objeto de tu mazo: sube a un habitante con nivel 2 o menos.
      const residents = (Object.keys(RESIDENTS) as ValleyResident[]).filter(
        (r) =>
          level(state, r) <= 2 && (!state.campaignLog || residentAvailable(state.campaignLog, r)),
      )
      const story = (state.campaignLog?.investigators[investigator]?.storyAssets ?? []).filter(
        (c) => playerCardDef(c)?.traits?.includes('Item'),
      )
      return [
        done,
        ...read(state, 'commons'),
        ...(story.length && residents.length
          ? [
              ask(investigator, 'prompt.hemlockVale.sendGift', [
                ...story.map((code): Choice => ({
                  label: 'choice.card',
                  params: { card: code },
                  then: [
                    {
                      type: 'ScenarioSpecific',
                      key: 'removeStoryAsset',
                      data: { investigator, code },
                    } as Message,
                    ask(
                      investigator,
                      'prompt.hemlockVale.chooseResident',
                      residents.map((r) => ({
                        label: 'choice.card',
                        params: { card: RESIDENTS[r].code },
                        then: [raise(r), xp()],
                      })),
                    ),
                  ],
                })),
                skip,
              ]),
            ]
          : []),
      ]
    }
  }
  return []
}

/** Retira del mazo, de forma permanente, un Apoyo de historia (códice 16). */
function removeStoryAsset(state: GameState, investigator: InvestigatorId, code: string): GameState {
  const log = state.campaignLog
  const record = log?.investigators[investigator]
  if (!log || !record) return state
  const index = record.storyAssets.indexOf(code)
  if (index < 0) return state
  return {
    ...state,
    campaignLog: {
      ...log,
      investigators: {
        ...log.investigators,
        [investigator]: {
          ...record,
          storyAssets: record.storyAssets.filter((_, n) => n !== index),
        },
      },
    },
  }
}

/** Escenarios de exploración sin tachar para el Día 2. */
function unexplored(state: GameState): string[] {
  const surveyed = state.campaignLog?.valley?.areasSurveyed ?? []
  return DAY_ONE_SCENARIOS.filter((id) => !surveyed.includes(AREA[id] as never))
}

/** Resolución: R1 (Bertie rescatado) o R2, R3 con preparativos y estudio del Día 2. */
export function dawnResolution(state: GameState): Message[] {
  const rescued = !!state.campaignLog?.notes?.includes('hemlockValeBertieWasRescued')
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
    ...read(state, rescued ? 'resolution1' : 'resolution2'),
    ...read(state, 'resolution3'),
    ...preparations,
    {
      type: 'Story',
      entry: entry('survey'),
      choices: unexplored(state).map((scenario): Choice => ({
        label: `choice.hemlockVale.route.${scenario}`,
        then: [{ type: 'ChooseValleyRoute', scenario }],
      })),
    },
    {
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: rescued ? 1 : 2 },
      told: true,
    },
  ]
}

registerAgenda({
  code: DAWN.darkClouds,
  // Reverso «Hambre voraz»: R1 si Bertie fue rescatado, R2 si no; luego R3.
  onAdvance: (state) => dawnResolution(state),
})
registerAct({ code: DAWN.dawnOfTheSecondDay })

const actInPlay = (state: GameState) => state.acts[state.actIndex]?.code === DAWN.dawnOfTheSecondDay
const agendaInPlay = (state: GameState) =>
  state.agendas[state.agendaIndex]?.code === DAWN.darkClouds

registerScenario({
  id: DAWN_SECOND_DAY,
  // Acto: los investigadores no pueden recibir daño ni horror ni ser derrotados.
  beforeDamage: (state) => (actInPlay(state) ? [] : null),
  forced: (state, trigger) => {
    // Plan: cuando robes una debilidad, cancela su revelación y descártala.
    if (
      trigger.type === 'whenPlayerCardDrawn' &&
      agendaInPlay(state) &&
      playerCardDef(trigger.card)?.weakness
    )
      return [{ type: 'DiscardFromHand', investigator: trigger.investigator, card: trigger.card }]
    return []
  },
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
            then: [
              {
                type: 'ScenarioSpecific',
                key: 'codex',
                data: { n: 12, investigator: trigger.investigator },
              },
            ],
          },
        ]
      : [],
  specific: (state, key, data) => {
    const investigator = String(data.investigator)
    if (key === 'codex') {
      const n = Number(data.n)
      if (n === 14 ? codexResolved(state, 14, investigator) : codexResolved(state, n)) return state
      return push(state, ...dawnCodex(state, n, investigator))
    }
    if (key === 'keepAsset')
      return push(state, keepAsset(state, investigator, Number(data.resources)))
    if (key === 'removeStoryAsset') return removeStoryAsset(state, investigator, String(data.code))
    return state
  },
  tokenEffect: (state, token, investigator) => {
    const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
    const parley = !!state.skillTest?.tags?.includes('parley')
    const hand = getInvestigator(state, investigator).hand.length
    const day = valleyTime(state.campaignLog)?.day ?? 2
    switch (token) {
      case 'skull':
        return { modifier: -(day + (hard ? 1 : 0)) }
      case 'cultist':
        return hard ? { modifier: parley ? 1 : -1 } : { modifier: 1, autoSucceed: parley }
      case 'tablet':
        return hard ? { modifier: hand < 2 ? -2 : -4 } : { modifier: hand < 3 ? 0 : -2 }
      case 'elderThing':
        return { modifier: hard ? -3 : -1, revealAnother: parley }
    }
    return { modifier: 0 }
  },
})

/** Antes de la preparación: fatiga y la comida de La primera tarde. */
function introMessages(context: ScenarioContext): Message[] {
  const notes = context.log.notes ?? []
  return [
    { type: 'ValleyFatigue' } as Message,
    ...context.investigators.flatMap((id): Message[] =>
      notes.includes(`hemlockValeFinishedTheirMeal:${id}`)
        ? [
            { type: 'Story', entry: entry('hemlockCurse') },
            { type: 'AddStoryAsset', investigator: id, code: DAWN.hemlockCurse },
          ]
        : [
            { type: 'Story', entry: entry('wolfishHunger') },
            { type: 'SufferTrauma', physical: 1, investigator: id },
          ],
    ),
  ]
}

export function dawnSecondDay(context: ScenarioContext): ScenarioDefinition {
  const available = (r: ValleyResident) => residentAvailable(context.log, r)
  return {
    id: DAWN_SECOND_DAY,
    intro: entry('intro'),
    setupInstructions: entry('setup'),
    locations: valeDayLocations,
    startingLocation: VALE.boardingHouse,
    agendas: [{ code: DAWN.darkClouds, name: 'Dark Clouds', doomThreshold: 6 }],
    acts: [
      {
        code: DAWN.dawnOfTheSecondDay,
        name: 'Dawn of the Second Day',
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
      { type: 'SetValleyTime', day: 2, time: 'day' },
      ...introMessages(context),
      ...(available('judithPark')
        ? [
            {
              type: 'PlaceAsset',
              code: RESIDENTS.judithPark.code,
              name: RESIDENTS.judithPark.name,
              placement: { type: 'location', location: VALE.theCrossroads },
            } as Message,
          ]
        : []),
      { type: 'PlaceDoom', amount: context.investigators.length },
    ],
  }
}
