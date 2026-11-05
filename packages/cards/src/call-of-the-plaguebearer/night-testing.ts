import { applyInput, createGame, type Difficulty } from '@lcg/engine'
import { throughSetup, testInvestigator } from '@lcg/engine/testing'
import { nightOnTheTown } from './night-on-the-town'
export function nightGame(players = 1, difficulty: Difficulty = 'standard', seed = 42) {
  let s = throughSetup(
    createGame({
      seed,
      difficulty,
      interactive: true,
      scenario: nightOnTheTown({ difficulty, seed }),
      investigators: ['a', 'b', 'c', 'd'].slice(0, players).map((id) => testInvestigator(id)),
    }),
  )
  for (let n = 0; n < 50 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = applyInput(s, {
      investigator: s.pending.investigator,
      choice:
        s.pending.question.choices.findIndex((c) => c.label === 'choice.skip') >= 0
          ? s.pending.question.choices.findIndex((c) => c.label === 'choice.skip')
          : 0,
    })
  return s
}
