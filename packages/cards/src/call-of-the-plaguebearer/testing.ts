import {
  applyInput,
  createGame,
  dispatch,
  type Difficulty,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { lateRisers } from './scenario'

export function game(
  players = 1,
  difficulty: Difficulty = 'standard',
  interactive = true,
): GameState {
  let s = throughSetup(
    createGame({
      seed: 42,
      difficulty,
      interactive,
      scenario: lateRisers({ difficulty }),
      investigators: ['a', 'b', 'c', 'd'].slice(0, players).map((id) => testInvestigator(id)),
    }),
  )
  for (let n = 0; n < 20 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    if (s.pending.question.prompt === 'prompt.plaguebearer.hidden') s = choose(s, 'choice.skip')
    else s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  }
  return s
}
export function settle(s: GameState): GameState {
  for (let n = 0; n < 100 && s.pending; n++) {
    const p = s.pending.question.prompt
    if (p === 'prompt.reaction' || p === 'prompt.plaguebearer.friendsHidden')
      s = choose(s, 'choice.skip')
    else if (p === 'prompt.commitCards') s = choose(s, 'choice.revealToken')
    else if (p === 'prompt.skillTestSucceeded' || p === 'prompt.skillTestFailed')
      s = choose(s, 'choice.applyResults')
    else if (
      p === 'prompt.assignDamage' ||
      p === 'prompt.assignHorror' ||
      p === 'prompt.story' ||
      p === 'prompt.plaguebearer.alive.path' ||
      p === 'prompt.plaguebearer.alive.west' ||
      p === 'prompt.chooseNextInvestigator'
    )
      s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    else break
  }
  return s
}
export const emit = (s: GameState, ...messages: Message[]) =>
  settle(
    dispatch({ ...s, pending: null, queue: [] }, ...messages, {
      type: 'PlayerWindow',
      investigator: s.activeTurn ?? 'a',
    }),
  )
