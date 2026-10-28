/**
 * Reglas compartidas por las dos partes de Fortuna e insensatez: fichas del caos, nivel de
 * alarma (con el daño de los Guardias), Indiferente, juegos, recursos ganados en el turno y
 * los forzados de todos los planes.
 */
import { nearestEnemyChoice } from '../nearest-choice'
import {
  getInvestigator,
  leadInvestigator,
  type Choice,
  type Enemy,
  type EnemyKeyword,
  type GameState,
  type Message,
  type ScenarioBehavior,
  type ScenarioSymbol,
  type TokenEffect,
  type Trigger,
} from '@lcg/engine'
import { adjustAlarm, adjustAlarmMessage, ALARM_SPECIFIC, alarmOf } from './check'
import { CODES, DEALERS, GUARDS, isCasino, ROLES } from './cards'
import { GAINED, nonUniqueCasino } from './encounter'
import { gameSpecific } from './games'
import { REVERSE } from './roles'

export const NO_ALOOF = 'fof:noAloof:'
/** Roles de cada investigador («código,código»), con su cara actual. */
export const ROLE = 'fof:role:'

export const specific = (
  key: string,
  data: Record<string, string | number | boolean> = {},
): Message => ({ type: 'ScenarioSpecific', key, data })

export const hard = (state: GameState) =>
  state.difficulty === 'hard' || state.difficulty === 'expert'
export const players = (state: GameState) => state.investigators.length

export const metaList = (state: GameState, key: string) =>
  String(state.scenarioMeta?.[key] ?? '')
    .split(',')
    .filter(Boolean)

/** Habilidades de un Lugar: +1 acción con un Crupier de la casa preparado en él. */
export const dealerTax = (state: GameState, location: string) =>
  Object.values(state.enemies).some(
    (e) => DEALERS.includes(e.code) && e.location === location && !e.exhausted,
  )
    ? 1
    : 0

export function setStoryClues(state: GameState, code: string, clues: number): GameState {
  const story = state.stories?.[code]
  if (!story) return state
  return {
    ...state,
    stories: { ...state.stories, [code]: { ...story, clues: Math.max(0, clues) } },
  }
}

export const leadChooses = (state: GameState, prompt: string, choices: Choice[]): Message[] => {
  if (choices.length <= 1) return choices[0]?.then ?? []
  const lead = leadInvestigator(state) ?? state.investigators[0]
  return lead
    ? [{ type: 'Ask', investigator: lead.id, question: { kind: 'chooseOne', prompt, choices } }]
    : []
}

/** Tarjeta de referencia (guía p. 3). */
export function tokenEffect(
  state: GameState,
  token: ScenarioSymbol,
  investigator: string,
): TokenEffect {
  switch (token) {
    case 'skull':
      return {
        modifier: -(hard(state)
          ? alarmOf(state, investigator)
          : Math.ceil(alarmOf(state, investigator) / 2)),
      }
    case 'cultist':
      return { modifier: 0, revealAnother: true, onFail: [adjustAlarmMessage(investigator, 1)] }
    case 'tablet': {
      const move = [specific('fofNearestMoves', { investigator })]
      return hard(state) ? { modifier: -4, immediate: move } : { modifier: -3, onFail: move }
    }
    case 'elderThing':
      return {
        modifier: hard(state) ? -6 : -5,
        immediate: [specific('fofElderThing', { investigator })],
      }
  }
  return { modifier: 0 }
}

/**
 * Con alarma 6 o más, los Casino del Lugar pierden Indiferente (también por el
 * Interrogatorio inoportuno, hasta el final de la ronda).
 */
export function casinoAloof(state: GameState, enemy: Enemy, keyword: EnemyKeyword) {
  if (keyword !== 'aloof' || !isCasino(enemy.traits)) return null
  if (state.scenarioMeta?.[`${NO_ALOOF}${enemy.id}`] === state.round) return false
  const alarmed = state.investigators.some(
    (i) => !i.eliminated && i.location === enemy.location && alarmOf(state, i.id) >= 6,
  )
  return alarmed ? false : null
}

/** Juego obsesivo: marca de recursos ganados en el turno (y la base para la acción básica). */
export function trackResources(state: GameState, trigger: Trigger): Message[] {
  if (trigger.type === 'turnBegins') {
    const me = getInvestigator(state, trigger.investigator)
    return [{ type: 'SetScenarioMeta', key: `${GAINED}${me.id}`, value: `0:${me.resources}:0` }]
  }
  if (trigger.type === 'afterGainResources' || trigger.type === 'afterSpendResources') {
    const key = `${GAINED}${trigger.investigator}`
    const [flag, start, spent] = String(state.scenarioMeta?.[key] ?? '0:0:0')
      .split(':')
      .map(Number)
    const value =
      trigger.type === 'afterGainResources'
        ? `1:${start}:${spent}`
        : `${flag}:${start}:${(spent ?? 0) + trigger.amount}`
    return [{ type: 'SetScenarioMeta', key, value }]
  }
  return []
}

/** Forzados de todos los planes: alarma al empezar la fase de Enemigos y al derrotar Casino. */
export function agendaForced(state: GameState, trigger: Trigger): Message[] {
  if (trigger.type === 'enemyPhaseBegins') {
    const ready = Object.values(state.enemies).filter((e) => isCasino(e.traits) && !e.exhausted)
    return state.investigators
      .filter((i) => !i.eliminated && ready.some((e) => e.location === i.location))
      .map((i) => adjustAlarmMessage(i.id, 1))
  }
  if (trigger.type === 'enemyDefeated' && trigger.by && isCasino(trigger.enemy.traits))
    return [adjustAlarmMessage(trigger.by, 1)]
  return []
}

/** Pasos compartidos (`ScenarioSpecific`); null si la clave no es de aquí. */
export function commonSpecific(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState | null {
  const game = gameSpecific(state, key, data)
  if (game) return game
  const push = (...messages: Message[]): GameState => ({
    ...state,
    queue: [...messages, ...state.queue],
  })
  const investigator = String(data.investigator ?? '')
  switch (key) {
    case ALARM_SPECIFIC: {
      // Guardia del casino: después de que subas tu alarma en su Lugar, recibes 1 daño.
      const who = getInvestigator(state, investigator)
      if (who.eliminated) return state
      const { state: next, raised } = adjustAlarm(state, investigator, Number(data.amount))
      const guards = Object.values(next.enemies).filter(
        (e) => GUARDS.includes(e.code) && e.location === who.location,
      )
      return {
        ...next,
        queue: [
          {
            type: 'Log',
            key: 'log.fof.alarm',
            params: { name: who.name, level: alarmOf(next, investigator) },
          },
          ...(raised > 0
            ? guards.map((): Message => ({
                type: 'TakeDamage',
                investigator,
                damage: 1,
                horror: 0,
              }))
            : []),
          ...state.queue,
        ],
      }
    }
    case 'fofRaiseAll': {
      // Reverso de los planes 2 y 3: cada investigador sube 1 su nivel de alarma.
      return push(
        ...state.investigators
          .filter((i) => !i.eliminated)
          .map((i) => adjustAlarmMessage(i.id, Number(data.amount ?? 1))),
      )
    }
    case 'fofNoAloof': {
      // Interrogatorio inoportuno: los Casino no únicos de tu Lugar pierden Indiferente.
      const here = getInvestigator(state, investigator).location
      const targets = nonUniqueCasino(state).filter((e) => e.location === here)
      return {
        ...state,
        scenarioMeta: {
          ...state.scenarioMeta,
          ...Object.fromEntries(targets.map((e) => [`${NO_ALOOF}${e.id}`, state.round])),
        },
        queue:
          here === null
            ? state.queue
            : [{ type: 'CheckEngagement', location: here }, ...state.queue],
      }
    }
    case 'fofNearestMoves': {
      // [tablet]: el enemigo más cercano se mueve una vez hacia ti.
      const here = getInvestigator(state, investigator).location
      if (here === null) return state
      return {
        ...state,
        queue: [
          ...nearestEnemyChoice(state, investigator, Object.values(state.enemies), (enemy) => [
            { type: 'HuntOnce', enemy: enemy.id, toward: here, attack: false },
          ]),
          ...state.queue,
        ],
      }
    }
    case 'fofElderThing':
      return push({
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.fof.elderThing',
          choices: [
            {
              label: 'choice.fof.autoSucceed',
              then: [adjustAlarmMessage(investigator, 1), { type: 'ForceSkillTestSuccess' }],
            },
            { label: 'choice.skip', then: [] },
          ],
        },
      })
    case 'fofThief': {
      const thief = state.assets[String(data.asset)]
      if (!thief || thief.exhausted) return state
      return {
        ...state,
        assets: { ...state.assets, [thief.id]: { ...thief, exhausted: true } },
        scenarioMeta: {
          ...state.scenarioMeta,
          [`${REVERSE}${String(data.enemy)}`]: `${state.round}:${state.phase}`,
        },
      }
    }
    case 'fofGamePlayed': {
      // Actos 1 y 2: tras la habilidad de un Lugar Juego, 1 pista menos en el manantial (2 si
      // ganaste recursos).
      const act = state.acts[state.actIndex]?.code
      const story = state.stories?.[CODES.wellspring]
      if (!story || (act !== CODES.casingTheJoint && act !== CODES.theTake)) return state
      if (story.clues <= 0) return state
      if (state.interactive)
        return push({
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            alwaysAsk: true,
            prompt: 'prompt.reaction',
            choices: [
              {
                label: 'ability.fof.reduceWellspring',
                params: { amount: data.gained ? 2 : 1 },
                then: [specific('fofRemoveWellspringClues', { amount: data.gained ? 2 : 1 })],
              },
              { label: 'choice.skip', then: [] },
            ],
          },
        })
      return setStoryClues(state, CODES.wellspring, story.clues - (data.gained ? 2 : 1))
    }
    case 'fofRemoveWellspringClues':
      return setStoryClues(
        state,
        CODES.wellspring,
        (state.stories?.[CODES.wellspring]?.clues ?? 0) - Number(data.amount),
      )
    // Cada investigador elige un Rol (parte I, o parte II sin Roles anotados).
    case 'fofRoleAsk': {
      // Cada investigador elige un Rol; con un solo investigador, elige otro más.
      const index = Number(data.index)
      const extra = !!data.extra
      const who = state.investigators[index]
      if (!who) return state
      const taken = state.investigators.flatMap((i) => metaList(state, `${ROLE}${i.id}`))
      const next =
        state.investigators.length === 1 && !extra
          ? { index, extra: true }
          : { index: index + 1, extra: false }
      return push({
        type: 'Ask',
        investigator: who.id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.fof.role',
          choices: ROLES.filter((r) => !taken.includes(r)).map((code) => ({
            label: `choice.fof.roleText.${code}`,
            params: { card: code },
            then: [
              { type: 'PutAssetIntoPlay', investigator: who.id, code },
              specific('fofRoleTaken', { investigator: who.id, code }),
              specific('fofRoleAsk', next),
            ],
          })),
        },
      })
    }
    case 'fofRoleTaken': {
      const roles = [...metaList(state, `${ROLE}${investigator}`), String(data.code)]
      return {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [`${ROLE}${investigator}`]: roles.join(',') },
      }
    }
    case 'fofCalmAll': {
      let next = state
      for (const i of state.investigators) next = adjustAlarm(next, i.id, -1).state
      return next
    }
  }
  return null
}

/** Comportamiento común de las dos partes. */
export const commonBehavior: Pick<ScenarioBehavior, 'tokenEffect'> = { tokenEffect }
