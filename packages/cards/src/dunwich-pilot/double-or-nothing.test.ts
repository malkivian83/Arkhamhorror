import { playerCardDef } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, hand } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('doubles difficulty and successful clue results', () => {
  let s = during(hand(game(), '02026'), (s) => ({
    ...patch({ skills: { willpower: 3, intellect: 6, combat: 3, agility: 3 } })(s),
    interactive: true,
  }))
  s = choose(s, 'action.investigate')
  s = choose(s, 'choice.commit', { card: playerCardDef('02026')!.name })
  expect(s.skillTest!.difficulty).toBe(4)
  s = choose(s, 'choice.revealToken')
  s = choose(s, 'choice.applyResults')
  expect(me(s).clues).toBe(2)
  expect(me(s).discard).toContain('02026')
})

// FAQ Double or Nothing: committed skill success effects repeat; symbol effects do not.
it('repeats committed draws but resolves token consequences once', () => {
  let s = during(game(), (s) => ({
    ...patch({
      hand: ['02026', '12093'],
      skills: { willpower: 3, intellect: 6, combat: 3, agility: 3 },
    })(s),
    interactive: true,
  }))
  s = choose(s, 'action.investigate')
  s = choose(s, 'choice.commit', { card: playerCardDef('02026')!.name })
  s = choose(s, 'choice.commit', { card: playerCardDef('12093')!.name })
  s = choose(s, 'choice.revealToken')
  const resources = me(s).resources
  s = {
    ...s,
    skillTest: {
      ...s.skillTest!,
      tokenOnSuccess: [{ type: 'GainResources', investigator: 'a', amount: 1 }],
    },
  }
  s = choose(s, 'choice.applyResults')
  expect(me(s).clues).toBe(2)
  expect(me(s).hand).toHaveLength(2)
  expect(me(s).resources).toBe(resources + 1)
})
