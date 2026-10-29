import {
  createGame,
  dispatch,
  playerCardDef,
  registerPlayerCards,
  type GameState,
  type Message,
  type PlayerCardDef,
  type Asset,
} from '@lcg/engine'
import { applyInput } from '@lcg/engine'
import { choose, labels, testInvestigator, testScenario } from '@lcg/engine/testing'
import data from '../data/harvey-walters.json'
import '../index'
import './index'
registerPlayerCards(data as PlayerCardDef[])
export const H = '60201'
export const cards = (n: number) => Array.from({ length: n }, () => '01088')
export function game(others = false): GameState {
  let s = createGame({
    seed: 4,
    scenario: testScenario(),
    investigators: [
      testInvestigator(H, {
        name: 'Harvey',
        skills: { willpower: 4, intellect: 5, combat: 1, agility: 2 },
      }),
      ...(others ? [testInvestigator('b')] : []),
    ],
  })
  for (let n = 0; n < 20 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return patch(
    { ...s, pending: null, queue: [], phase: 'investigation', interactive: true, activeTurn: H },
    { hand: [], resources: 20, deck: cards(30), damage: 0, horror: 0, actionsRemaining: 4 },
  )
}
export const patch = (
  s: GameState,
  changes: Partial<GameState['investigators'][number]>,
  by = H,
): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === by ? { ...i, ...changes } : i)),
})
export const me = (s: GameState) => s.investigators.find((i) => i.id === H)!
export const run = (s: GameState, ...messages: Message[]) =>
  dispatch({ ...s, pending: null, queue: [] }, ...messages)
export function put(s: GameState, code: string, changes: Partial<Asset> = {}): GameState {
  return {
    ...s,
    assets: {
      ...s.assets,
      [code]: {
        id: code,
        code,
        owner: H,
        exhausted: false,
        damage: 0,
        horror: 0,
        uses: playerCardDef(code)?.uses?.count ?? 0,
        ...changes,
      },
    },
  }
}
export function finish(s: GameState): GameState {
  for (
    let n = 0;
    n < 100 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction';
    n++
  ) {
    const ls = labels(s)
    const label = ['choice.skip', 'choice.pass', 'choice.revealToken', 'choice.continue'].find(
      (l) => ls.includes(l),
    )
    s = label
      ? choose(s, label)
      : applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  }
  return s
}
export const played = (s: GameState, code: string) =>
  run(patch(s, { hand: [code, ...me(s).hand] }), { type: 'PlayCard', investigator: H, code })
