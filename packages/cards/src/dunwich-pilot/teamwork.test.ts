import { playerCardDef } from '@lcg/engine'

import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, play, withAsset, me } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('requires the giver’s agreement before transferring resources', () => {
  let s = play(game(['a', 'b']), '02018')
  const before = s.investigators[1]!.resources
  s = choose(s, 'choice.pilotGiveResources', { from: 'B', to: 'A', n: 1 })
  expect(s.pending!.investigator).toBe('b')
  expect(s.investigators[1]!.resources).toBe(before)
  s = choose(s, 'choice.pilotAgree')
  s = choose(s, 'choice.pilotDone')
  expect(s.investigators[1]!.resources).toBe(before - 1)
})

// RR: Ownership and Control. Transfer is not entering play.
it('preserves uses and damage and returns a discarded asset to its original owner', () => {
  let s = during(game(['a', 'b']), (s) =>
    withAsset(s, '02116', { owner: 'b', uses: 1, damage: 1, exhausted: true }),
  )
  s = play(s, '02018')
  s = choose(s, 'choice.pilotGiveAsset', { from: 'B', to: 'A', card: playerCardDef('02116')!.name })
  s = choose(s, 'choice.pilotAgree')
  s = choose(s, 'choice.pilotDone')
  expect(s.assets['02116']).toMatchObject({
    owner: 'a',
    originalOwner: 'b',
    uses: 1,
    damage: 1,
    exhausted: true,
  })
  s = during(s, (s) => s, { type: 'DiscardAsset', asset: '02116' })
  expect(s.investigators[1]!.discard).toContain('02116')
  expect(me(s).discard).not.toContain('02116')
})

// RR: Slots. Exchanging two full hand slots is simultaneous.
it('exchanges assets simultaneously without discarding for temporary slot overflow', () => {
  let s = during(game(['a', 'b']), (s) =>
    withAsset(
      withAsset(
        withAsset(withAsset(s, '02032', { id: 'axe-a' }), '02036', { id: 'kukri-a' }),
        '02032',
        { id: 'axe-b', owner: 'b' },
      ),
      '02036',
      { id: 'kukri-b', owner: 'b' },
    ),
  )
  s = play(s, '02018')
  s = choose(s, 'choice.pilotExchange', {
    first: playerCardDef('02032')!.name,
    second: playerCardDef('02032')!.name,
  })
  s = choose(s, 'choice.pilotAgree')
  s = choose(s, 'choice.pilotAgree')
  s = choose(s, 'choice.pilotDone')
  expect(s.assets['axe-a']!.owner).toBe('b')
  expect(s.assets['axe-b']!.owner).toBe('a')
  expect(Object.keys(s.assets)).toHaveLength(4)
})
