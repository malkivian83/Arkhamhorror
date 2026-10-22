import { playableCards } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { withAsset } from '../dunwich-pilot/testing'
import { holding, me, play, set } from './testing'

// RR: Heal; "from among" lets the healing be split one point at a time.
it('Infuse Life heals 3 damage from among investigators and Ally assets at your location', () => {
  let s = withAsset(set(holding('60464', { enemy: null }), { damage: 2 }), '02035', { damage: 1 })
  s = play(s, '60464')
  s = choose(s, 'choice.healDamageOf', { name: 'Peter Sylvestre' })
  for (
    let n = 0;
    n < 2 && s.pending?.question.choices.some((c) => c.label === 'choice.healDamageOf');
    n++
  )
    s = choose(s, 'choice.healDamageOf', { name: 'A' })
  expect(me(s).damage).toBe(0)
  expect(s.assets['02035']!.damage).toBe(0)
  expect(me(s).discard).toContain('60464')
  expect(playableCards(holding('60464', { enemy: null }), 'a', false)).not.toContain('60464')
})
