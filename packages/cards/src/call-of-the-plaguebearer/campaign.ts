import type { ChaosToken, Difficulty } from '@lcg/engine'

export const CALL_OF_THE_PLAGUEBEARER = {
  id: 'call-of-the-plaguebearer',
  scenarios: [
    'late-risers',
    'night-on-the-town',
    'dead-by-dawn',
    'mourning-chorus',
    'high-noon-descent',
    'the-afternoon-war',
    'death-at-sundown',
    'the-midnight-hour',
  ],
} as const

// Guías EN/ES, inventario contrastado en docs-proyecto/94. Sin Antiguo inicial.
const SYMBOLS: ChaosToken[] = [
  'skull',
  'skull',
  'cultist',
  'tablet',
  'tablet',
  'autoFail',
  'elderSign',
]
export const PLAGUEBEARER_CHAOS_BAGS: Record<Difficulty, ChaosToken[]> = {
  easy: [1, 1, 1, 0, 0, 0, -1, -1, -1, -2, ...SYMBOLS],
  standard: [1, 0, 0, -1, -1, -1, -2, -2, -3, -4, ...SYMBOLS],
  hard: [0, 0, -1, -1, -2, -3, -3, -3, -4, -5, ...SYMBOLS],
  expert: [0, -1, -2, -2, -3, -3, -4, -4, -4, -6, ...SYMBOLS],
}

/**
 * Bolsa inicial de cada escenario desde el VI: los Susurros insidiosos (VI) retiran para el
 * resto de la campaña la calavera o tablilla anotada en `plaguebearerRemovedTokens`; el
 * sectario que la sustituye queda en las fichas añadidas del registro.
 */
export function plaguebearerChaosBag(
  difficulty: Difficulty,
  log?: { values: Record<string, string> },
): ChaosToken[] {
  const bag: ChaosToken[] = [...PLAGUEBEARER_CHAOS_BAGS[difficulty]]
  for (const token of (log?.values.plaguebearerRemovedTokens ?? '').split(',').filter(Boolean)) {
    const index = bag.indexOf(token as ChaosToken)
    if (index >= 0) bag.splice(index, 1)
  }
  return bag
}
