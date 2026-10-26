/**
 * Fortuna e insensatez, parte I: la vigilancia (guía ES pp. 6–8 y 14–15). Termina con el
 * Punto de control «El plan»: lo que la parte II necesita se anota en el registro de
 * campaña (valores `fof:*`), como en la preparación «desde cero» de la guía.
 */
import {
  distancesFrom,
  getInvestigator,
  playerCardDef,
  registerAct,
  registerAgenda,
  registerLocation,
  registerPlayerCard,
  registerScenario,
  seedRng,
  shuffle,
  type AbilityOption,
  type Choice,
  type Difficulty,
  type GameState,
  type InvestigatorId,
  type Message,
  type ScenarioDefinition,
  type ScenarioOutcome,
} from '@lcg/engine'
import {
  effectTest,
  endScenario,
  noteEffect,
  recordNote,
  resignAbility,
  resolution,
  storyEntries,
} from '../scenario-helpers'
import {
  adjustAlarm,
  adjustAlarmMessage,
  ALARM,
  alarmOf,
  checkedIcons,
  checkIcons,
  highestAlarm,
  CHECKED,
} from './check'
import {
  abarran,
  casinoGuard,
  CHAOS_BAGS,
  CODES,
  fortuneAndFollySet,
  GAME_LOCATIONS,
  GUARDS,
  practiced,
  PART_ONE,
  PUBLIC_LOCATIONS,
  roleOf,
  UNIQUE_ENEMIES,
} from './cards'
import {
  agendaForced,
  casinoAloof,
  commonSpecific,
  dealerTax,
  leadChooses,
  metaList,
  players,
  ROLE,
  setStoryClues,
  specific,
  tokenEffect,
  trackResources,
} from './common'
import { gameAbility, gameAt } from './games'
import { colorOf, formatIcon } from './icons'

/** El guardia que lleva el uniforme (Si el uniforme te vale…). */
const UNIFORM = 'fof:uniform'
/** Apoyos escondidos de cada investigador («código,código»). */
export const STASH = 'fof:stash:'
/** El guardia del uniforme: la primera copia del Guardia del casino. */
const UNIFORM_GUARD = GUARDS[0]!

const entry = storyEntries('fof')

// ---------------------------------------------------------------------------
// Preparación (guía p. 14)
// ---------------------------------------------------------------------------

export function fortuneAndFollyPartOne({
  difficulty = 'standard',
  seed = 1,
}: {
  difficulty?: Difficulty
  seed?: number
}): ScenarioDefinition {
  const deck = fortuneAndFollySet().filter((c) => c.code !== UNIFORM_GUARD)
  const [encounterDeck] = shuffle(deck, seedRng(seed))
  return {
    id: PART_ONE,
    intro: [entry('intro1'), entry('intro3'), entry('intro4'), entry('intro5')],
    setupInstructions: { title: 'story.fof.setupTitle', body: 'story.fof.setup' },
    locations: PUBLIC_LOCATIONS.map((l) => ({ ...l })),
    startingLocation: CODES.casinoFloor,
    agendas: [
      { code: CODES.theHouseAlwaysWatches, name: 'The House Always Watches', doomThreshold: 8 },
    ],
    acts: [
      {
        code: CODES.casingTheJoint,
        name: 'Casing the Joint',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck,
    setAside: [],
    chaosBag: [...CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      // Los Lugares públicos no tienen cara sin revelar (Noche tranquila / ajetreada): entran
      // revelados, con sus pistas.
      ...PUBLIC_LOCATIONS.filter((l) => l.id !== CODES.casinoFloor).map((l): Message => ({
        type: 'RevealLocation',
        location: l.id,
      })),
      {
        type: 'SpawnEnemy',
        card: { ...abarran },
        location: CODES.highRollersTable,
        engageWith: null,
      },
      {
        type: 'SpawnEnemy',
        card: casinoGuard(UNIFORM_GUARD),
        location: CODES.rouletteWheel,
        engageWith: null,
      },
      {
        type: 'PlaceAsset',
        code: CODES.isamara,
        name: 'Isamara Ordoñez',
        placement: { type: 'location', location: CODES.baccaratTable },
        clues: 0,
      },
      { type: 'PutStoryIntoPlay', code: CODES.theStakeout, name: 'The Stakeout' },
      { type: 'PutStoryIntoPlay', code: CODES.ifTheUniformFits, name: 'If the Uniform Fits…' },
      { type: 'PutStoryIntoPlay', code: CODES.wellspring, name: 'The Wellspring of Fortune' },
      specific('fofSetup'),
      specific('fofRoleAsk', { index: 0, extra: false }),
    ],
  }
}

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

function uniformGuard(state: GameState) {
  const id = state.scenarioMeta?.[UNIFORM]
  return typeof id === 'string' ? state.enemies[id] : undefined
}

// ---------------------------------------------------------------------------
// Pasos propios del escenario
// ---------------------------------------------------------------------------

function fofSpecific(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState {
  const common = commonSpecific(state, key, data)
  if (common) return common
  const push = (...messages: Message[]): GameState => ({
    ...state,
    queue: [...messages, ...state.queue],
  })
  const investigator = String(data.investigator ?? '')
  switch (key) {
    case 'fofSetup': {
      const guard = Object.values(state.enemies).find((e) => e.code === UNIFORM_GUARD)
      const withMeta = {
        ...state,
        scenarioMeta: {
          ...state.scenarioMeta,
          ...(guard ? { [UNIFORM]: guard.id } : {}),
          ...Object.fromEntries(state.investigators.map((i) => [`${ALARM}${i.id}`, 1])),
        },
      }
      // El manantial de fortuna: 7 pistas por investigador.
      return setStoryClues(withMeta, CODES.wellspring, 7 * players(state))
    }
    case 'fofAbarranKeys': {
      // Comprueba 1 icono: si es rojo, «robaste las llaves de Abarran».
      const checked = checkIcons(state, 1)
      const [icon] = checkedIcons(checked)
      const red = !!icon && colorOf(icon.suit) === 'red'
      return {
        ...checked,
        scenarioMeta: { ...checked.scenarioMeta, [CHECKED]: '' },
        queue: [
          { type: 'Log', key: 'log.fof.checked', params: { icons: icon ? formatIcon(icon) : '—' } },
          ...(red ? [recordNote('fofStoleAbarransKeys')] : []),
          ...state.queue,
        ],
      }
    }
    case 'fofKnockOut': {
      // Si el uniforme te vale…: el guardia queda inconsciente.
      const guard = uniformGuard(state)
      if (!guard) return state
      const here = getInvestigator(state, investigator).location
      const distances = here === null ? new Map() : distancesFrom(state, here)
      const witness = Object.values(state.enemies).some(
        (e) => e.id !== guard.id && (distances.get(e.location) ?? Infinity) <= 1,
      )
      return push(
        recordNote('fofObtainedAnEmployeeUniform'),
        ...(witness ? [adjustAlarmMessage(investigator, 1)] : []),
        { type: 'DiscardEnemy', enemy: guard.id },
        { type: 'RemoveStory', code: CODES.ifTheUniformFits },
      )
    }
    case 'fofIsamara': {
      // 1 pista sobre Isamara; con 1 por investigador, «la convencisteis».
      const placed = state.placedAssets?.[String(data.placed)]
      if (!placed) return state
      const clues = (placed.clues ?? 0) + 1
      return {
        ...state,
        placedAssets: { ...state.placedAssets, [placed.id]: { ...placed, clues } },
        queue: [
          ...(clues >= players(state) ? [recordNote('fofConvincedIsamara')] : []),
          ...state.queue,
        ],
      }
    }
    case 'fofStash': {
      // Escondite para el golpe: el Apoyo sale del juego y se anota para la parte II.
      const code = String(data.code)
      const list = [...metaList(state, `${STASH}${investigator}`), code]
      const stashed = {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [`${STASH}${investigator}`]: list.join(',') },
      }
      if (data.asset)
        return {
          ...stashed,
          queue: [{ type: 'RemoveAssetFromGame', asset: String(data.asset) }, ...state.queue],
        }
      const me = getInvestigator(state, investigator)
      const at = me.hand.indexOf(code)
      if (at < 0) return state
      return {
        ...stashed,
        investigators: stashed.investigators.map((i) =>
          i.id === investigator ? { ...i, hand: i.hand.filter((_, n) => n !== at) } : i,
        ),
      }
    }
    case 'fofCleanedOut': {
      // Con 10 recursos por investigador entre todos: «habéis dejado limpio el casino».
      const total = state.investigators.reduce(
        (sum, i) => sum + (i.eliminated ? (i.resourcesWhenEliminated ?? 0) : i.resources),
        0,
      )
      return total >= 10 * players(state) ? push(recordNote('fofCleanedOutTheHouse')) : state
    }
    case 'fofRaiseUnresigned': {
      // Cada investigador que no desistió sube 2 su nivel de alarma.
      let next = state
      for (const i of state.investigators.filter((i) => !i.resigned))
        next = adjustAlarm(next, i.id, 2).state
      return next
    }
    case 'fofPlan': {
      // Por cada pista por investigador en La vigilancia: bajar la alarma de todos o
      // pasar un Rol a Experimentado.
      const remaining = Number(data.remaining)
      if (remaining <= 0) return state
      const next = specific('fofPlan', { remaining: remaining - 1 })
      const roles = state.investigators.flatMap((i) =>
        metaList(state, `${ROLE}${i.id}`)
          .filter((code) => code === roleOf(code))
          .map((code): Choice => ({
            label: 'choice.fof.practice',
            params: { card: code, name: i.name },
            then: [specific('fofPractice', { investigator: i.id, code }), next],
          })),
      )
      return push(
        ...leadChooses(state, 'prompt.fof.plan', [
          { label: 'choice.fof.planCalm', then: [specific('fofCalmAll'), next] },
          ...roles,
        ]),
      )
    }
    case 'fofPractice': {
      const code = String(data.code)
      const roles = metaList(state, `${ROLE}${investigator}`).map((c) =>
        c === code ? practiced(c) : c,
      )
      return {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [`${ROLE}${investigator}`]: roles.join(',') },
      }
    }
    case 'fofRecord':
      return recordCheckpoint(state)
  }
  return state
}

/** El plan 3: anota alarma, roles, escondite y pistas del manantial en el registro. */
function recordCheckpoint(state: GameState): GameState {
  const log = state.campaignLog
  if (!log) return state
  const values: Record<string, string> = { ...log.values }
  for (const i of state.investigators) {
    values[`${ALARM}${i.id}`] = String(alarmOf(state, i.id))
    values[`${ROLE}${i.id}`] = metaList(state, `${ROLE}${i.id}`).join(',')
    values[`${STASH}${i.id}`] = metaList(state, `${STASH}${i.id}`).join(',')
  }
  values['fof:wellspring'] = String(state.stories?.[CODES.wellspring]?.clues ?? 0)
  const stashed = state.investigators
    .filter((i) => metaList(state, `${STASH}${i.id}`).length)
    .map(
      (i) =>
        `${i.name}: ${metaList(state, `${STASH}${i.id}`)
          .map((c) => playerCardDef(c)?.name ?? c)
          .join(', ')}`,
    )
  const notes: Message[] = [
    recordNote(
      'fofAlarmLevels',
      state.investigators.map((i) => `${i.name} ${alarmOf(state, i.id)}`).join(', '),
    ),
    ...state.investigators.flatMap((i) =>
      metaList(state, `${ROLE}${i.id}`).map((code) => recordNote(`fofRole${code}`, i.name)),
    ),
    ...(stashed.length ? [recordNote('fofStash', stashed.join('; '))] : []),
    recordNote('fofWellspringClues', values['fof:wellspring']),
    ...(state.investigators.some((i) => i.damage + i.horror >= 6)
      ? [recordNote('fofNeedRest')]
      : []),
  ]
  return { ...state, campaignLog: { ...log, values }, queue: [...notes, ...state.queue] }
}

// ---------------------------------------------------------------------------
// Resoluciones y Punto de control (guía p. 15)
// ---------------------------------------------------------------------------

function resolutionMessages(state: GameState, outcome: ScenarioOutcome): Message[] {
  const resigned = state.investigators.some((i) => i.resigned)
  // Sin resolución: si alguien desistió, avanza el acto (→R2); si todos fueron derrotados, R1.
  const number = outcome.type === 'resolution' ? outcome.resolution : resigned ? 2 : 1
  const stakeout = Math.floor((state.actClues ?? 0) / players(state))
  return [
    ...(outcome.type === 'noResolution' && !resigned
      ? [{ type: 'Story', entry: entry('noResolution') } as Message]
      : []),
    ...(outcome.type === 'noResolution' && resigned
      ? [{ type: 'Story', entry: entry('comeBackSoon') } as Message, specific('fofCleanedOut')]
      : []),
    {
      type: 'Story',
      entry: entry(`resolution${number}`, [
        { key: 'story.fof.raiseUnresigned' },
        { key: 'story.fof.noDeckChanges' },
      ]),
    },
    specific('fofRaiseUnresigned'),
    {
      type: 'Story',
      entry: entry('plan1', [
        { key: 'story.fof.planChoices', params: { n: stakeout } },
        noteEffect('fofAlarmLevels'),
      ]),
    },
    specific('fofPlan', { remaining: stakeout }),
    specific('fofRecord'),
    endScenario(resolution(number)),
  ]
}

// ---------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------

registerScenario({
  id: PART_ONE,
  resolution: resolutionMessages,
  tokenEffect,
  enemyKeyword: casinoAloof,
  // Abarran (El hombre del anillo de rubí) no tiene valores: no se le puede dañar.
  enemyImmune: (_state, enemy) => enemy.code === CODES.abarran,
  // Si el uniforme te vale…: [action] Luchar contra el guardia vinculado.
  abilities: (state, _self, investigator): AbilityOption[] => {
    const guard = uniformGuard(state)
    if (!guard || getInvestigator(state, investigator).location !== guard.location) return []
    return [
      {
        key: `${CODES.ifTheUniformFits}:fight`,
        label: 'ability.fof.uniform',
        actions: 1,
        provokes: true,
        target: { type: 'enemy', id: guard.id },
        then: [
          effectTest(investigator, CODES.ifTheUniformFits, 'combat', 3, {
            onSuccess: [specific('fofKnockOut', { investigator })],
            onFail: [adjustAlarmMessage(investigator, 1)],
          }),
        ],
      },
    ]
  },
  forced: (state, trigger) => {
    const tracked = trackResources(state, trigger)
    if (tracked.length) return tracked
    // El guardia del uniforme abandona el juego: la carta de Historia se retira.
    if (
      trigger.type === 'enemyDefeated' &&
      trigger.enemy.id === state.scenarioMeta?.[UNIFORM] &&
      state.stories?.[CODES.ifTheUniformFits]
    )
      return [{ type: 'RemoveStory', code: CODES.ifTheUniformFits }]
    return []
  },
  specific: fofSpecific,
})

// ---------------------------------------------------------------------------
// Plan y acto
// ---------------------------------------------------------------------------

registerAgenda({
  code: CODES.theHouseAlwaysWatches,
  forced: (state, trigger) => agendaForced(state, trigger),
  // Reverso «Ya no eres bienvenido»: ¿dejasteis limpio el casino? (→R1).
  onAdvance: () => [specific('fofCleanedOut'), { type: 'EndScenario', outcome: resolution(1) }],
})

registerAct({
  code: CODES.casingTheJoint,
  // La vigilancia: las pistas de los investigadores eliminados van a la carta de Historia.
  eliminatedCluesToAct: true,
  objectiveMet: () => false,
})

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.casinoFloor,
  abilities: (state, self, investigator) => {
    const tax = dealerTax(state, self.id)
    const me = getInvestigator(state, investigator)
    const stashable = (code: string) => {
      const def = playerCardDef(code)
      return def?.type === 'asset' && !def.story && !def.weakness
    }
    const fromHand = [...new Set(me.hand.filter(stashable))].map((code): Choice => ({
      label: 'choice.fof.stash',
      params: { card: playerCardDef(code)?.name ?? code },
      target: { type: 'hand', code },
      then: [specific('fofStash', { investigator, code })],
    }))
    const fromPlay = Object.values(state.assets)
      .filter((a) => a.owner === investigator && stashable(a.code) && !roleOf(a.code))
      .map((a): Choice => ({
        label: 'choice.fof.stash',
        params: { card: playerCardDef(a.code)?.name ?? a.code },
        target: { type: 'asset', id: a.id },
        then: [specific('fofStash', { investigator, code: a.code, asset: a.id })],
      }))
    const resign = resignAbility(investigator, `${self.id}:resign`)
    return [
      { ...resign, actions: resign.actions + tax },
      ...(fromHand.length + fromPlay.length
        ? [
            {
              key: `${self.id}:stash`,
              label: 'ability.fof.stash',
              actions: 1 + tax,
              provokes: true,
              limit: { per: 'turn' as const },
              then: [
                {
                  type: 'Ask',
                  investigator,
                  question: {
                    kind: 'chooseOne',
                    prompt: 'prompt.fof.stash',
                    choices: [...fromHand, ...fromPlay],
                  },
                } as Message,
              ],
            },
          ]
        : []),
    ]
  },
})

// Mesa de apuestas altas (noche tranquila). Las otras mesas las registra part-two para las
// dos partes.
for (const code of GAME_LOCATIONS.filter((c) => c === CODES.highRollersTable))
  registerLocation({
    code,
    abilities: (state, self, investigator) => {
      const game = gameAt(self.id)
      if (!game) return []
      // Mesa de apuestas altas: solo si no quedan pistas; «os hicisteis pasar por grandes
      // apostadores».
      if (game === 'highRoller') {
        if (self.clues > 0) return []
        return gameAbility(state, investigator, game, dealerTax(state, self.id)).map((a) => ({
          ...a,
          then: [recordNote('fofImpersonatedAHighRoller'), ...a.then],
        }))
      }
      return gameAbility(state, investigator, game, dealerTax(state, self.id))
    },
  })

registerLocation({
  code: CODES.casinoLounge,
  // [action] Si no quedan pistas: prueba [agility] (3); con éxito, «encontrasteis un conducto».
  abilities: (state, self, investigator) =>
    self.clues > 0
      ? []
      : [
          {
            key: `${self.id}:vent`,
            label: 'ability.fof.vent',
            actions: 1 + dealerTax(state, self.id),
            provokes: true,
            then: [
              effectTest(investigator, CODES.casinoLounge, 'agility', 3, {
                onSuccess: [recordNote('fofFoundAVent')],
              }),
            ],
          },
        ],
})

// ---------------------------------------------------------------------------
// Isamara Ordoñez (Cantante de bar, cara Discreta)
// ---------------------------------------------------------------------------

registerPlayerCard({
  code: CODES.isamara,
  // [action] Negociar: prueba [willpower] (X = la alarma más alta). Con éxito, 1 pista sobre
  // ella; con 1 por investigador, «convencisteis a Isamara para que participe en el golpe».
  placedAbilities: (state, self, investigator) =>
    state.campaignLog?.notes.includes('fofConvincedIsamara')
      ? []
      : [
          {
            key: `${self.id}:parley`,
            label: 'ability.fof.isamara',
            params: { difficulty: highestAlarm(state) },
            actions: 1,
            provokes: false,
            parley: true,
            target: { type: 'placed', id: self.id },
            then: [
              effectTest(investigator, CODES.isamara, 'willpower', highestAlarm(state), {
                onSuccess: [specific('fofIsamara', { placed: self.id })],
              }),
            ],
          },
        ],
})

/** Enemigos únicos: para presentación y pruebas. */
export const PART_ONE_UNIQUE = UNIQUE_ENEMIES
export type { InvestigatorId }

export { ROLE }
