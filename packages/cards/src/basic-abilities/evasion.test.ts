import { skillTestValue } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { enemy, evade, resolve, setup, sturdy } from './testing'

// RR: Evade, Uses; "does not ready during the next upkeep phase".
describe('Disguise', () => {
  it('evades at +2 and keeps a non-Elite enemy exhausted in the next upkeep', () => {
    let s = evade(setup('09062'), '09062')
    expect(skillTestValue(s).total).toBe(5)
    s = resolve(s)
    expect(enemy(s)).toMatchObject({ engagedWith: null, exhausted: true, stayExhausted: true })
    expect(s.assets['09062']!.uses).toBe(3)
  })
  it('does not affect an Elite enemy', () => {
    const s = resolve(evade(setup('09062', { enemy: { ...sturdy, traits: ['Elite'] } }), '09062'))
    expect(enemy(s).stayExhausted).toBeUndefined()
  })
})
