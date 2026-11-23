// RR: ST.2/ST.8. Saving a pending draw/return must retain physical commitments and timing.
import { expect, it } from 'vitest'
import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, dispatch, type GameState } from '@lcg/engine'
import { choose, throughSetup } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'
it('restores Winifred’s closed commit window and resolves her draw without allowing the new card to be committed', () => {
  const initial = throughSetup(
    startScenario(newCampaign('night-of-the-zealot', ['silas', 'winifred'], 'standard'), 7, true),
  )
  const ready: GameState = {
    ...initial,
    pending: null,
    queue: [],
    interactive: true,
    chaosBag: [0],
    investigators: initial.investigators.map((i) => ({
      ...i,
      hand: i.id === '60301' ? ['01091', '60302'] : [],
      discard: [],
      deck: ['60303', '01088'],
    })),
  }
  let s = dispatch(ready, {
    type: 'BeginSkillTest',
    investigator: '60301',
    skill: 'combat',
    difficulty: 2,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  s = choose(choose(s, 'choice.commit', { card: 'Overpower' }), 'choice.commit', {
    card: 'Anything You Can Do, Better',
  })
  s = choose(s, 'choice.revealToken')
  expect(s.skillTest!.commitWindowClosed).toBe(true)
  expect(s.pending!.question.choices.some((c) => c.label === 'ability.winifredDraw')).toBe(true)
  const loaded = decodeSession(
    JSON.stringify(session(s, { base: s, inputs: [], marks: [markOf(s)] }, null)),
  ).state!
  expect(loaded).toEqual(s)
  const input = { investigator: s.pending!.investigator, choice: 0 }
  const result = applyInput(loaded, input)
  expect(result).toEqual(applyInput(s, input))
  expect(result.investigators.find((i) => i.id === '60301')!.hand).toContain('60303')
  expect(result.pending!.question.choices.every((c) => c.label !== 'choice.commit')).toBe(true)
})
