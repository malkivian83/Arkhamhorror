// RR: Modifiers and Lasting Effects. Added skills use modified values, without borrowing icons.
import { expect, it } from 'vitest'
import { registerPlayerCard, registerPlayerCards } from './content'
import { handle, skillTestValue } from './handlers'
import { newTestGame } from './testing'
import type { GameState } from './types'
registerPlayerCards([
  {
    code: 'starter-addition-asset',
    name: 'Addition test',
    type: 'asset',
    class: 'neutral',
    traits: [],
  },
])
registerPlayerCard({
  code: 'starter-addition-asset',
  skillModifier: (_s, _a, t) => (t.skill === 'intellect' ? 1 : t.skill === 'combat' ? 2 : 0),
})
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
it('adds the current modified intellect once, preserves combat modifiers, and expires next round', () => {
  let s = clear(
    newTestGame({
      investigator: { skills: { willpower: 3, intellect: 4, combat: 2, agility: 1 } },
    }),
  )
  s = {
    ...s,
    assets: {
      addition: {
        id: 'addition',
        code: 'starter-addition-asset',
        owner: 'a',
        uses: 0,
        damage: 0,
        horror: 0,
        exhausted: false,
      },
    },
  }
  s = handle(s, {
    type: 'RoundSkillAddition',
    investigator: 'a',
    from: 'intellect',
    skills: ['combat', 'agility'],
    code: 'test',
  })
  const test = (state: GameState) =>
    handle(clear(state), {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'combat',
      difficulty: 99,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    })
  s = test(s)
  expect(skillTestValue(s).total).toBe(9)
  expect(skillTestValue({ ...s, assets: {} }).total).toBe(6)
  expect(skillTestValue({ ...s, round: s.round + 1 }).total).toBe(4)
  const withIcons = {
    ...s,
    skillTest: { ...s.skillTest!, committed: [{ code: 'starter-addition-icon', by: 'a' }] },
  }
  registerPlayerCards([
    {
      code: 'starter-addition-icon',
      name: 'Icon',
      type: 'skill',
      class: 'neutral',
      traits: [],
      icons: { wild: 1 },
    },
  ])
  expect(skillTestValue(withIcons).total).toBe(10)
})
