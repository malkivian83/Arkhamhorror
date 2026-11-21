import {
  applyValleyFatigue,
  nextInt,
  seedRng,
  type ChaosToken,
  type Difficulty,
  type ValleyDay,
  type ValleyTime,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'

const symbols: ChaosToken[] = ['skull', 'skull', 'elderSign']

/**
 * Guía, p. 3. Experto con la errata v2.3 de la FAQ (−6, −7 en lugar de −6, −6).
 * Sin fallo automático: lo añade la resolución del preludio de bienvenida.
 */
export const hemlockValeChaosBags: Record<Difficulty, ChaosToken[]> = {
  easy: [1, 1, 0, 0, 0, -1, -1, -1, -2, -2, -3, ...symbols],
  standard: [1, 0, 0, -1, -1, -1, -2, -2, -3, -3, -4, ...symbols],
  hard: [0, 0, 0, -1, -1, -2, -2, -3, -3, -5, -5, -7, ...symbols],
  expert: [0, -1, -1, -2, -2, -3, -3, -4, -5, -5, -6, -7, -8, ...symbols],
}

/**
 * Bolsa base de un escenario de campaña: la de la dificultad con la fatiga anotada.
 * Las fichas añadidas por decisiones (`log.chaosTokens`) las suma la campaña al preparar.
 */
export function hemlockValeChaosBag(context: ScenarioContext): ChaosToken[] {
  return applyValleyFatigue(
    hemlockValeChaosBags[context.difficulty],
    context.log.valley?.fatigue ?? [],
  )
}

/** Partida independiente: carta Indicador de tiempo al azar y moneda para la hora. */
export function randomValleyTime(seed: number): { day: ValleyDay; time: ValleyTime } {
  const [day, rng] = nextInt(seedRng(seed), 3)
  const [coin] = nextInt(rng, 2)
  return { day: (day + 1) as ValleyDay, time: coin ? 'night' : 'day' }
}
