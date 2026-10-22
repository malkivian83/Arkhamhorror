import { skillTestValue } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { withAsset } from '../dunwich-pilot/testing'
import { enemy, holding, me, play, resolve, set, sturdy } from './testing'

// RR: Evade; evade events do not provoke attacks of opportunity.
describe('Unflappable', () => {
  it('level 0 evades at +2 and heals 1 horror only with 2 or more clues', () => {
    let s = play(set(holding('60262'), { horror: 2, clues: 2 }), '60262')
    expect(skillTestValue(s).total).toBe(5)
    s = resolve(s)
    expect(enemy(s).engagedWith).toBeNull()
    expect(me(s).horror).toBe(1)
    s = resolve(play(set(holding('60262'), { horror: 2, clues: 1 }), '60262'))
    expect(me(s).horror).toBe(2)
  })
  it('level 1 evades at +3 and heals 2 horror from among the cards you control', () => {
    let s = set(holding('60271'), { horror: 1 })
    s = withAsset(s, '12016', { horror: 1 })
    s = play(s, '60271')
    expect(skillTestValue(s).total).toBe(6)
    s = resolve(s)
    s = choose(s, 'choice.healHorrorOf', { name: 'A' })
    // Bodyguard is then the only card with horror left and is healed automatically.
    expect(me(s).horror).toBe(0)
    expect(s.assets['12016']!.horror).toBe(0)
  })
})

describe('Quick Exit', () => {
  it('level 0 keeps a non-Elite enemy exhausted when it succeeds by 2', () => {
    let s = play(holding('60366'), '60366')
    expect(skillTestValue(s).total).toBe(5)
    expect(enemy(resolve(s)).stayExhausted).toBe(true)
    s = resolve(play(holding('60366', { enemy: { ...sturdy, evade: 4 } }), '60366'))
    expect(enemy(s).stayExhausted).toBeUndefined()
    s = resolve(play(holding('60366', { enemy: { ...sturdy, traits: ['Elite'] } }), '60366'))
    expect(enemy(s).stayExhausted).toBeUndefined()
  })
  it('level 2 adds willpower and keeps a non-Elite enemy exhausted on any success', () => {
    let s = play(holding('60377', { enemy: { ...sturdy, evade: 6 } }), '60377')
    expect(skillTestValue(s).total).toBe(6)
    expect(enemy(resolve(s)).stayExhausted).toBe(true)
    s = resolve(play(holding('60377', { enemy: { ...sturdy, traits: ['Elite'] } }), '60377'))
    expect(enemy(s).stayExhausted).toBeUndefined()
  })
})
