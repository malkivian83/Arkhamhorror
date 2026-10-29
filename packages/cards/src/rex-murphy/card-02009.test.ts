// RR: Forced, Skill Tests ST.6; FAQ: leave in play when the deck is empty.
import { expect, it } from 'vitest'
import { dispatch, treacheryBehavior, type Treachery } from '@lcg/engine'
import { makeGame, clear } from './testing'
const curse: Treachery = {
  id: 'curse',
  kind: 'treachery',
  keywords: [],
  code: '02009',
  name: "Rex's Curse",
  owner: '02002',
  placement: { type: 'threatArea', investigator: '02002' },
}
it('shuffles after an actual successful test becomes an automatic failure', () => {
  let s = dispatch(clear(makeGame()), {
    type: 'BeginSkillTest',
    investigator: '02002',
    skill: 'intellect',
    difficulty: 1,
    kind: { type: 'investigate', location: 'A' },
  })
  s = {
    ...clear(s),
    rng: 7,
    chaosBag: ['autoFail'],
    treacheries: { curse },
    skillTest: { ...s.skillTest!, tokens: [0], tokenModifier: 0, autoFail: false },
  }
  s = dispatch(s, { type: 'ResolveSkillTest' })
  expect(s.skillTest?.autoFail).toBe(true)
  expect(s.skillTest?.succeeded).toBe(false)
  expect(s.treacheries.curse).toBeUndefined()
  expect(s.investigators[0]!.deck).toContain('02009')
  expect(s.investigators[0]!.clues).toBe(0)
})
it('places the weakness and redraws once only when its owner would succeed', () => {
  const s = makeGame(),
    b = treacheryBehavior('02009')!
  expect(b.revelation!(s, '02002', curse)).toEqual([
    { type: 'PlaceTreachery', treachery: 'curse', placement: curse.placement },
  ])
  expect(b.forced!(s, { type: 'whenWouldSucceed', investigator: '02002' }, curse)).toEqual([
    { type: 'RedrawSkillTestTokens', use: 'curse:redraw' },
  ])
  expect(b.forced!(s, { type: 'whenWouldFail', investigator: '02002' }, curse)).toEqual([])
  expect(b.forced!(s, { type: 'whenWouldSucceed', investigator: 'other' }, curse)).toEqual([])
})
it('redraws before results, preserving commitments and recording per-test use', () => {
  let s = dispatch(clear(makeGame()), {
    type: 'BeginSkillTest',
    investigator: '02002',
    skill: 'intellect',
    difficulty: 1,
    kind: { type: 'investigate', location: 'A' },
  })
  const test = s.skillTest!
  expect(test).toBeTruthy()
  s = {
    ...clear(s),
    chaosBag: [0],
    treacheries: { curse },
    skillTest: { ...test, tokens: [0], tokenModifier: 0, committed: [], autoFail: false },
  }
  s = dispatch(s, { type: 'ResolveSkillTest' })
  expect(s.skillTest?.abilityCounts?.['curse:redraw']).toBe(1)
  expect(s.skillTest?.tokens).toEqual([0])
  expect(s.skillTest?.succeeded).toBe(true)
})
it('returns physical transformed and ignored tokens and clears old token effects', () => {
  let s = dispatch(clear(makeGame()), {
    type: 'BeginSkillTest',
    investigator: '02002',
    skill: 'intellect',
    difficulty: 1,
    kind: { type: 'investigate', location: 'A' },
  })
  s = {
    ...clear(s),
    chaosBag: [],
    skillTest: {
      ...s.skillTest!,
      tokens: [0],
      treatedAs: [{ token: 'autoFail', face: 0 }],
      ignoredTokens: [-3],
      tokenModifier: 5,
      tokenOnFail: [{ type: 'DrawCards', investigator: '02002', amount: 2 }],
      tokenOnSuccess: [{ type: 'GainResources', investigator: '02002', amount: 3 }],
      committed: [{ code: '01090', by: '02002' }],
    },
  }
  s = dispatch(s, { type: 'RedrawSkillTestTokens', use: 'test-redraw' })
  expect([...s.chaosBag, ...s.skillTest!.tokens].sort()).toEqual([-3, 'autoFail'].sort())
  expect(s.skillTest!.committed).toEqual([{ code: '01090', by: '02002' }])
  expect(s.skillTest!.tokenOnSuccess).toEqual([])
  expect(s.skillTest!.tokenOnFail).toEqual([])
  expect(s.skillTest!.tokenModifier).not.toBe(5)
  const loaded = JSON.parse(JSON.stringify(s))
  expect(loaded.skillTest.abilityCounts['test-redraw']).toBe(1)
})
it.each([false, true])(
  'shuffles after a redraw failure only with a nonempty deck (%s)',
  (empty) => {
    let s = dispatch(clear(makeGame()), {
      type: 'BeginSkillTest',
      investigator: '02002',
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'investigate', location: 'A' },
    })
    s = {
      ...clear(s),
      treacheries: { curse },
      investigators: s.investigators.map((i) => ({ ...i, deck: empty ? [] : ['01088'] })),
      skillTest: { ...s.skillTest!, abilityCounts: { 'curse:redraw': 1 } },
    }
    const b = treacheryBehavior('02009')!
    expect(b.forced!(s, { type: 'whenWouldSucceed', investigator: '02002' }, curse)).toEqual([])
    const messages = b.forced!(
      s,
      {
        type: 'afterSkillTest',
        investigator: '02002',
        kind: 'investigate',
        succeeded: false,
        margin: -1,
      },
      curse,
    )
    expect(messages).toHaveLength(empty ? 0 : 1)
    for (const message of messages) s = dispatch(s, message)
    expect(!!s.treacheries.curse).toBe(empty)
    if (!empty) expect(s.investigators[0]!.deck).toContain('02009')
  },
)
