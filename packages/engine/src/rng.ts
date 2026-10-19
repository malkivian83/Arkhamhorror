/**
 * Generador pseudoaleatorio determinista (mulberry32).
 *
 * El estado es un único entero de 32 bits que vive dentro del `GameState`,
 * de modo que una partida se puede serializar y reproducir exactamente.
 */
export type RngState = number

export function seedRng(seed: number): RngState {
  return seed >>> 0
}

/** Devuelve un número en [0, 1) y el nuevo estado del generador. */
export function nextFloat(state: RngState): [number, RngState] {
  const next = (state + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

/** Entero en [0, max). */
export function nextInt(state: RngState, max: number): [number, RngState] {
  const [f, next] = nextFloat(state)
  return [Math.floor(f * max), next]
}

/** Baraja (Fisher-Yates) sin mutar la entrada. */
export function shuffle<T>(items: readonly T[], state: RngState): [T[], RngState] {
  const result = [...items]
  let rng = state
  for (let i = result.length - 1; i > 0; i--) {
    let j: number
    ;[j, rng] = nextInt(rng, i + 1)
    ;[result[i], result[j]] = [result[j] as T, result[i] as T]
  }
  return [result, rng]
}
