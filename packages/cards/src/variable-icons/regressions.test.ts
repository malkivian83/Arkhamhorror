// RR: Skill Tests (ST.2–ST.6), Committing Cards, Doom, Traits.
import { dispatch, registerPlayerCards, skillTestValue, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

it('uses the additional icons in the actual result of the test', () => {
  let s = during(game(), patch({ hand: ['05030'], resources: 10 }), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 6,
    kind: {
      type: 'effect',
      source: 'variable-test',
      onSuccess: [{ type: 'GainResources', investigator: 'a', amount: 1 }],
      onFail: [],
      onFailEach: [],
    },
  })
  s = choose(s, 'choice.commit')
  expect(me(s).resources).toBe(11)
})

it('offers Leadership with the helper bonus and resolves it for the tester', () => {
  let s = during(
    game(['a', 'b']),
    (s) => patch({ hand: ['02260'] }, 'b')(patch({ hand: [], resources: 0 })(s)),
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 6,
      kind: {
        type: 'effect',
        source: 'leadership-test',
        onSuccess: [{ type: 'GainResources', investigator: 'a', amount: 1 }],
        onFail: [],
        onFailEach: [],
      },
    },
  )
  expect(
    s.pending!.question.choices.find((c) => c.label === 'choice.commitFrom')?.params?.icons,
  ).toBe(3)
  s = choose(s, 'choice.commitFrom')
  expect(me(s).resources).toBe(1)
  expect(s.investigators[1]!.discard).toContain('02260')
})

const committed = (code: string, modify: (s: GameState) => GameState) => {
  const s = during(game(['a', 'b']), (s) => modify(patch({ hand: [code] })(s)), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'willpower',
    difficulty: 5,
    kind: { type: 'effect', source: 'variable-test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  return dispatch(
    { ...s, pending: null, queue: [] },
    { type: 'CommitCard', investigator: 'a', code },
  )
}

it('counts doom on other investigators, controlled assets and placed assets', () => {
  const s = committed('05034', (s) => ({
    ...withAsset(patch({ doom: 2 }, 'b')(s), '01087', { doom: 2 }),
    doom: 0,
    placedAssets: {
      marker: {
        id: 'marker',
        code: '01087',
        name: 'Marker',
        placement: { type: 'location', location: 'A' },
        exhausted: false,
        damage: 0,
        horror: 0,
        doom: 2,
      },
    },
  }))
  expect(skillTestValue(s).icons).toBe(3)
})

it('counts an asset with both qualifying traits once, and ignores another owner', () => {
  registerPlayerCards([
    {
      code: 'variable-both-traits',
      name: 'Synthetic tool',
      type: 'asset',
      class: 'seeker',
      traits: ['Science', 'Tool'],
      slots: [],
    },
  ])
  const s = committed('10051', (s) =>
    withAsset(
      withAsset(withAsset(s, 'variable-both-traits'), 'variable-both-traits', { id: 'second' }),
      'variable-both-traits',
      {
        id: 'other',
        owner: 'b',
      },
    ),
  )
  expect(skillTestValue(s).icons).toBe(2)
})

it('rejects upgraded Rise to the Occasion at equal base skill and on another investigator', () => {
  const s = committed('51010', (s) => s)
  const reset = patch({ hand: ['51010'] })({
    ...s,
    skillTest: { ...s.skillTest!, committed: [], difficulty: 3 },
  })
  expect(
    dispatch(reset, { type: 'CommitCard', investigator: 'a', code: '51010' }).skillTest!.committed,
  ).toEqual([])
  const helper = { ...reset, skillTest: { ...reset.skillTest!, investigator: 'b', difficulty: 6 } }
  expect(
    dispatch(helper, { type: 'CommitCard', investigator: 'a', code: '51010' }).skillTest!.committed,
  ).toEqual([])
})
