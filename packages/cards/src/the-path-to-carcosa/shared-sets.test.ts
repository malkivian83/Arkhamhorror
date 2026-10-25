import { scenarioBehavior, type Enemy, type GameState } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { newCampaign, startScenario } from '../campaign'
import '../index'
import { THE_PATH_TO_CARCOSA } from './campaign'
import { EDICT, PSYCHOPATH, SETS } from './encounter-sets'

/** Cartas de encuentro de la partida: mazo y apartadas. */
const cardsOf = (state: GameState) => [...state.encounterDeck, ...state.setAside]

/** Un enemigo de la partida (sin colocar en juego) en el Lugar del investigador. */
function enemyFrom(state: GameState, code: string, extra: Partial<Enemy> = {}): Enemy {
  const card = cardsOf(state).find((c) => c.code === code)!
  const me = state.investigators[0]!
  return {
    ...card,
    id: 'x',
    location: me.location!,
    engagedWith: null,
    damageTaken: 0,
    exhausted: false,
    clues: 0,
    doom: 0,
    ...extra,
  } as Enemy
}

// Los conjuntos compartidos cambian el combate de sus enemigos; cada escenario que los usa
// debe sumar esos modificadores en su `enemyStat`.
describe('The Path to Carcosa: shared encounter sets in every scenario', () => {
  it.each(THE_PATH_TO_CARCOSA.scenarios.map((id, n) => [id, n] as const))('%s', (id, n) => {
    const campaign = newCampaign('the-path-to-carcosa', ['joe'], 'standard')
    campaign.scenarioIndex = n
    let state = startScenario(campaign, 5)
    const me = state.investigators[0]!
    const stat = (e: Enemy, which: 'fight' | 'evade' = 'fight') =>
      scenarioBehavior(id)?.enemyStat?.(state, e, which) ?? 0
    const has = (code: string) => cardsOf(state).some((c) => c.code === code)
    // Byakhee chillador: +1 de combate y evasión enfrentado a alguien con 4 o menos de cordura.
    if (has(SETS.screechingByakhee)) {
      state = {
        ...state,
        investigators: state.investigators.map((i) => ({ ...i, horror: i.sanity - 3 })),
      }
      const byakhee = enemyFrom(state, SETS.screechingByakhee, { engagedWith: me.id })
      expect(stat(byakhee, 'evade') - stat({ ...byakhee, engagedWith: null }, 'evade')).toBe(1)
    }
    // El edicto del Rey: +1 de combate por cada pista o perdición sobre el Sectario.
    if (has(SETS.theKingsEdict)) {
      const fanatic = enemyFrom(state, SETS.fanatic, { clues: 2 })
      const before = stat(fanatic)
      state = {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [`${EDICT}x`]: `${state.round}:1` },
      }
      expect(stat(fanatic) - before).toBe(2)
    }
    // Psicópata joven: +3 de combate hasta el final de la fase de investigación.
    if (has(SETS.youngPsychopath)) {
      const psychopath = enemyFrom(state, SETS.youngPsychopath)
      const before = stat(psychopath)
      state = {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [`${PSYCHOPATH}x`]: state.round + 1 },
      }
      expect(stat(psychopath) - before).toBe(3)
    }
  })
})
