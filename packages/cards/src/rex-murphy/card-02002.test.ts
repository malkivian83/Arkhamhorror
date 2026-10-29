// RR: Skill Tests ST.6, Discover, Elder Sign.
import { expect, it } from 'vitest'
import { dispatch, investigatorBehavior } from '@lcg/engine'
import { makeGame, clear } from './testing'
it('reacts only to his successful investigation by at least two', () => {
  const s = makeGame(),
    i = s.investigators[0]!,
    b = investigatorBehavior('02002')!
  const t = {
    type: 'afterSkillTest' as const,
    investigator: i.id,
    kind: 'investigate' as const,
    succeeded: true,
    margin: 2,
  }
  const r = b.reactions!(s, t, i)
  expect(r).toHaveLength(1)
  const next = dispatch(clear(s), r[0]!.then[0]!)
  expect(next.investigators[0]!.clues).toBe(i.clues + 1)
  for (const change of [
    { margin: 1 },
    { succeeded: false },
    { kind: 'fight' as const },
    { investigator: 'other' },
  ])
    expect(b.reactions!(s, { ...t, ...change }, i)).toEqual([])
  const effect = b.elderSign!(s, i)
  expect(effect.modifier).toBe(2)
  expect(effect.immediate?.[0]).toMatchObject({
    type: 'Ask',
    question: {
      alwaysAsk: true,
      choices: [
        { then: [] },
        { then: [{ type: 'ForceSkillTestFailure' }, { type: 'DrawCards', amount: 3 }] },
      ],
    },
  })
})
