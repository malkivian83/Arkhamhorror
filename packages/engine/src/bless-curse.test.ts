import { describe, expect, it } from 'vitest'
import { poolTokensAvailable } from './handlers'
import { getInvestigator } from './state'
import { choose, during, newTestGame, withBag } from './testing'
import type { ChaosToken, GameState } from './types'

// RR Bless/Curse tokens: +2 / -2 and reveal another token. After the skill test, a resolved
// bless/curse token returns to the token pool instead of the chaos bag; at most 10 of each.
const inv = (s: GameState) => getInvestigator(s, 'a')
const investigate = (bag: ChaosToken[], shroud: number) =>
  choose(
    during(newTestGame(), (s) => ({
      ...withBag(...bag)(s),
      locations: { ...s.locations, A: { ...s.locations.A!, shroud } },
    })),
    'action.investigate',
  )

describe('Bendición y maldición', () => {
  it('la bendición suma +2, revela otra y vuelve a la reserva tras la prueba', () => {
    // Intellect 3 + 2 = 5 against shroud 5; the bag is then empty.
    const game = investigate(['bless'], 5)
    expect(inv(game).clues).toBe(1)
    expect(game.chaosBag).toEqual([])
  })

  it('la maldición resta 2 y se acumula con la ficha adicional', () => {
    // 3 - 2 = 1 against shroud 2: fails. The curse leaves the bag.
    const game = investigate(['curse'], 2)
    expect(inv(game).clues).toBe(0)
    expect(game.chaosBag).toEqual([])
  })

  it('a token added to the bag counts only within the pool limit of 10 and stays scenario-only', () => {
    let s = newTestGame()
    const log = s.campaignLog?.chaosTokens.length
    s = during(s, (x) => ({ ...x, chaosBag: Array(8).fill('bless'), sealed: [] }), {
      type: 'AddChaosTokens',
      tokens: ['bless', 'bless', 'bless', 'curse'],
    })
    expect(s.chaosBag.filter((t) => t === 'bless')).toHaveLength(10)
    expect(s.chaosBag.filter((t) => t === 'curse')).toHaveLength(1)
    expect(poolTokensAvailable(s, 'bless')).toBe(0)
    expect(poolTokensAvailable(s, 'curse')).toBe(9)
    expect(s.campaignLog?.chaosTokens.length).toBe(log)
  })

  it('RemoveChaosTokens returns only the tokens present in the bag to the pool', () => {
    const s = during(newTestGame(), withBag('curse', 0, 'bless'), {
      type: 'RemoveChaosTokens',
      tokens: ['curse', 'curse', 'bless'],
    })
    expect(s.chaosBag).toEqual([0])
  })
})
