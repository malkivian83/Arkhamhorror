/** Consultas comunes y mensajes propios de Asesinato en el hotel Excelsior. */
import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  leadInvestigator,
  nextInt,
  playerCardDef,
  type Asset,
  type ChaosToken,
  type Choice,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
  type ReactionOption,
  type Trigger,
} from '@lcg/engine'
import { CODES, culpritVersion, printedLocationTraits, printedTraits, type Lead } from './cards'

export type Data = Record<string, string | number | boolean>

export const perInv = (state: GameState, n: number) => n * state.startingInvestigatorCount

export const hard = (state: GameState) =>
  state.difficulty === 'hard' || state.difficulty === 'expert'

export const ask = (
  investigator: InvestigatorId,
  prompt: string,
  choices: Choice[],
  promptParams?: Record<string, string | number>,
): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices, ...(promptParams ? { promptParams } : {}) },
})

export const specific = (key: string, data: Data = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})

export const log = (key: string, params?: Record<string, string | number>): Message => ({
  type: 'Log',
  key: `log.excelsior.${key}`,
  ...(params ? { params } : {}),
})

/** Versión de El verdadero culpable en curso (0 antes del interludio). */
export const culprit = (state: GameState) => culpritVersion(state.agendas[state.agendaIndex]?.code)

/** "Recuerda que…" del escenario. */
export const remembered = (state: GameState, key: string) => state.scenarioMeta?.[key] === 1
export const remember = (key: string): Message => ({ type: 'SetScenarioMeta', key, value: 1 })

// ---------------------------------------------------------------------------
// Rasgos
// ---------------------------------------------------------------------------

export const hasTrait = (enemy: { traits?: string[] }, trait: string) =>
  (enemy.traits ?? []).includes(trait)

export const enemiesWith = (state: GameState, trait: string): Enemy[] =>
  Object.values(state.enemies).filter((e) => hasTrait(e, trait))

/** Rasgos de una localización: los impresos y Escena del crimen por Pruebas incriminatorias. */
export function locationTraits(state: GameState, location: LocationId): string[] {
  const evidence = Object.values(state.treacheries).some(
    (t) =>
      t.code === CODES.incriminatingEvidence &&
      t.placement.type === 'location' &&
      t.placement.location === location,
  )
  const printed = printedLocationTraits(location)
  return evidence && !printed.includes('Crime Scene') ? [...printed, 'Crime Scene'] : printed
}

export const isCrimeScene = (state: GameState, location: LocationId) =>
  locationTraits(state, location).includes('Crime Scene')

/** Cartas de la zona de victoria con el rasgo impreso. */
export const inVictory = (state: GameState, trait: string) =>
  state.victoryDisplay.filter((code) => printedTraits(code).includes(trait)).length

// ---------------------------------------------------------------------------
// Apoyos Indicio
// ---------------------------------------------------------------------------

export const isLead = (code: string) => (playerCardDef(code)?.traits ?? []).includes('Lead')

/** Apoyos Indicio en juego (todos tienen dueño). */
export const leadAssets = (state: GameState): Asset[] =>
  Object.values(state.assets).filter((a) => isLead(a.code))

export const leadAsset = (state: GameState, code: Lead | string): Asset | undefined =>
  Object.values(state.assets).find((a) => a.code === code)

/** Indicios robados del mazo de Indicios (aunque luego abandonen el juego). */
export const drawnLeads = (state: GameState): Lead[] =>
  String(state.scenarioMeta?.leads ?? '')
    .split(',')
    .filter(Boolean) as Lead[]

/** El investigador controla el apoyo y está en su localización. */
export const controlsHere = (state: GameState, asset: Asset | undefined, location: LocationId) =>
  !!asset && getInvestigator(state, asset.owner).location === location

// ---------------------------------------------------------------------------
// Distancias
// ---------------------------------------------------------------------------

/** Localizaciones más cercanas a `from` (incluida) que cumplen `matches`. */
export function nearestLocations(
  state: GameState,
  from: LocationId,
  matches: (location: LocationId) => boolean,
): LocationId[] {
  const distances = distancesFrom(state, from)
  const found = [...distances.entries()].filter(([l]) => state.locations[l] && matches(l))
  if (found.length === 0) return []
  const best = Math.min(...found.map(([, d]) => d))
  return found.filter(([, d]) => d === best).map(([l]) => l)
}

/** Enemigos más cercanos a `from` que cumplen `matches` (los de `from` incluidos). */
export function nearestEnemies(
  state: GameState,
  from: LocationId,
  matches: (enemy: Enemy) => boolean,
): Enemy[] {
  const distances = distancesFrom(state, from)
  const found = Object.values(state.enemies).filter((e) => matches(e) && distances.has(e.location))
  if (found.length === 0) return []
  const best = Math.min(...found.map((e) => distances.get(e.location)!))
  return found.filter((e) => distances.get(e.location) === best)
}

/** Investigadores que siguen en juego en la localización. */
export const investigatorsHere = (state: GameState, location: LocationId) =>
  activeInvestigators(state).filter((i) => i.location === location)

export const leadId = (state: GameState) => leadInvestigator(state)?.id ?? ''

// ---------------------------------------------------------------------------
// Fichas del caos fuera de una prueba
// ---------------------------------------------------------------------------

/** "Revela una ficha aleatoria de la bolsa": se mira y vuelve a la bolsa. */
export function revealRandomToken(state: GameState): [ChaosToken | undefined, GameState] {
  if (state.chaosBag.length === 0) return [undefined, state]
  const [index, rng] = nextInt(state.rng, state.chaosBag.length)
  return [state.chaosBag[index], { ...state, rng }]
}

export const isSymbol = (token: ChaosToken | undefined) =>
  token === 'skull' ||
  token === 'cultist' ||
  token === 'tablet' ||
  token === 'elderThing' ||
  token === 'autoFail'

export const tokenText = (token: ChaosToken) =>
  typeof token === 'number' ? (token > 0 ? `+${token}` : `${token}`) : token

// ---------------------------------------------------------------------------
// Ganchos de las otras partes del escenario
// ---------------------------------------------------------------------------

type Specific = (state: GameState, data: Data) => GameState
type Reactions = (state: GameState, trigger: Trigger) => ReactionOption[]
type Forced = (state: GameState, trigger: Trigger) => Message[]

const specifics = new Map<string, Specific>()
const reactionSources: Reactions[] = []
const forcedSources: Forced[] = []

/** Registra el manejador de un mensaje propio (`ScenarioSpecific`). */
export function onSpecific(key: string, handler: Specific): void {
  specifics.set(key, handler)
}

export function addReactions(source: Reactions): void {
  reactionSources.push(source)
}

export function addForced(source: Forced): void {
  forcedSources.push(source)
}

export const runSpecific = (state: GameState, key: string, data: Data): GameState =>
  specifics.get(key)?.(state, data) ?? state

export const scenarioReactions: Reactions = (state, trigger) =>
  reactionSources.flatMap((source) => source(state, trigger))

export const scenarioForced: Forced = (state, trigger) =>
  forcedSources.flatMap((source) => source(state, trigger))
