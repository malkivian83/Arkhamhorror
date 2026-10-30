import { applyInput, createGame, type Difficulty, type GameState, type Message } from '@lcg/engine'
import { choose, during, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { carnevaleOfHorrors } from './scenario'
import { C } from './codes'
export function game(players = 1, difficulty: Difficulty = 'standard'): GameState {
  let s = throughSetup(
    createGame({
      seed: 42,
      difficulty,
      scenario: carnevaleOfHorrors({ seed: 42, difficulty }),
      investigators: ['a', 'b', 'c']
        .slice(0, players)
        .map((id) => testInvestigator(id, { health: 30, sanity: 30 })),
    }),
  )
  while (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator', { name: 'A' })
  return s
}
export const emit = (s: GameState, ...messages: Message[]) =>
  during(s, (state) => state, ...messages)
export function settle(s: GameState): GameState {
  for (let n = 0; n < 100 && s.pending; n++) {
    const p = s.pending.question.prompt
    if (p === 'prompt.reaction') s = choose(s, 'choice.skip')
    else if (p === 'prompt.commitCards') s = choose(s, 'choice.revealToken')
    else if (p === 'prompt.skillTestSucceeded' || p === 'prompt.skillTestFailed')
      s = choose(s, 'choice.applyResults')
    else if (p === 'prompt.assignDamage' || p === 'prompt.assignHorror')
      s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    else break
  }
  return s
}
export const boss = (s: GameState) => Object.values(s.enemies).find((e) => e.code === C.cnidathqua)!
