import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, type GameState } from '@lcg/engine'
import { throughSetup } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { APPLY_DELAY_MS, automaticTestAnswer, REVEAL_DELAY_MS } from './quickTests'

const choose = (s: GameState, label: string) =>
  applyInput(s, {
    investigator: s.pending!.investigator,
    choice: s.pending!.question.choices.findIndex((c) => c.label === label),
  })

it('answers alone only the reveal without options and the result to apply', () => {
  const start = throughSetup(
    startScenario(newCampaign('the-midwinter-gala', ['joe'], 'standard'), 13),
  )
  // The action menu is never answered automatically.
  expect(automaticTestAnswer(start)).toBeNull()
  const commit = choose(start, 'action.investigate')
  // With a card that can be committed, the player decides.
  expect(commit.pending!.question.choices.map((c) => c.label)).toContain('choice.commit')
  expect(automaticTestAnswer(commit)).toBeNull()
  // Nothing to commit: only the reveal remains.
  const empty: GameState = {
    ...commit,
    pending: {
      ...commit.pending!,
      question: {
        ...commit.pending!.question,
        choices: commit.pending!.question.choices.filter((c) => c.label === 'choice.revealToken'),
      },
    },
  }
  expect(automaticTestAnswer(empty)).toEqual({ index: 0, kind: 'reveal', delay: REVEAL_DELAY_MS })
  const result = choose(commit, 'choice.revealToken')
  expect(result.pending!.question.choices.map((c) => c.label)).toEqual(['choice.applyResults'])
  expect(automaticTestAnswer(result)).toEqual({ index: 0, kind: 'apply', delay: APPLY_DELAY_MS })
  // Once applied, the test is over and the next question is the player's again.
  expect(automaticTestAnswer(choose(result, 'choice.applyResults'))).toBeNull()
})
