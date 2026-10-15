import { describe, expect, it } from 'vitest'
import { CHAOS_BAGS } from './campaign'

describe('Brethren of Ash: bolsas del caos', () => {
  it('tienen el número de fichas de la guía', () => {
    expect(CHAOS_BAGS.easy).toHaveLength(16)
    expect(CHAOS_BAGS.standard).toHaveLength(16)
    expect(CHAOS_BAGS.hard).toHaveLength(17)
    expect(CHAOS_BAGS.expert).toHaveLength(18)
  })

  it('todas llevan 2 calaveras, tablilla, primigenio, fallo automático y signo arcano', () => {
    for (const bag of Object.values(CHAOS_BAGS)) {
      const symbols = bag.filter((t) => typeof t === 'string').sort()
      expect(symbols).toEqual(['autoFail', 'elderSign', 'elderThing', 'skull', 'skull', 'tablet'])
    }
  })
})
