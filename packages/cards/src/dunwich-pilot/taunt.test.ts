import { playerCardDef } from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, hand } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('engages a chosen subset without spending an action', () => {
  let s = during(
    hand(game(['a', 'b']), '02017'),
    (s) => s,
    spawnAt('A', { ...ghoul, name: 'One' }, 'b'),
    spawnAt('A', { ...ghoul, name: 'Two' }, 'b'),
  )
  s = choose(s, 'action.playFast', { card: playerCardDef('02017')!.name })
  s = choose(s, 'action.engage', { enemy: 'One' })
  s = choose(s, 'choice.pilotDone')
  expect(Object.values(s.enemies).find((e) => e.name === 'One')!.engagedWith).toBe('a')
  expect(Object.values(s.enemies).find((e) => e.name === 'Two')!.engagedWith).toBe('b')
  expect(me(s).actionsRemaining).toBe(3)
})
