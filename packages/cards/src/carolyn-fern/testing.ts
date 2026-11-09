import {
  applyInput,
  availableAbilities,
  createGame,
  dispatch,
  playerCardDef,
  type Asset,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, labels, testInvestigator, testScenario } from '@lcg/engine/testing'
import '../index'
import './index'

export const C = '60251'
export const cards = (n: number) => Array.from({ length: n }, () => '01088')
export function game(others = false): GameState {
  let s = createGame({
    seed: 4,
    scenario: testScenario(),
    investigators: [
      testInvestigator(C, {
        name: 'Carolyn',
        skills: { willpower: 3, intellect: 5, combat: 1, agility: 3 },
        health: 6,
        sanity: 9,
      }),
      ...(others ? [testInvestigator('b')] : []),
    ],
  })
  for (let n = 0; n < 20 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return patch(
    { ...s, pending: null, queue: [], phase: 'investigation', interactive: true, activeTurn: C },
    { hand: [], resources: 10, deck: cards(30), damage: 0, horror: 0, actionsRemaining: 4 },
  )
}
export const patch = (
  s: GameState,
  changes: Partial<GameState['investigators'][number]>,
  by = C,
): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === by ? { ...i, ...changes } : i)),
})
export const me = (s: GameState, by = C) => s.investigators.find((i) => i.id === by)!
export const run = (s: GameState, ...messages: Message[]) =>
  dispatch({ ...s, pending: null, queue: [] }, ...messages)
export function put(
  s: GameState,
  code: string,
  changes: Partial<Asset> = {},
  id = code,
): GameState {
  return {
    ...s,
    assets: {
      ...s.assets,
      [id]: {
        id,
        code,
        owner: C,
        exhausted: false,
        damage: 0,
        horror: 0,
        uses: playerCardDef(code)?.uses?.count ?? 0,
        ...changes,
      },
    },
  }
}
/** Use an available ability by key, paying its costs as the action menu does. */
export function use(s: GameState, key: string, by = C): GameState {
  const option = availableAbilities(s, by).find((o) => o.key === key)
  if (!option) throw new Error('Ability not available: ' + key)
  return run(s, {
    type: 'UseAbility',
    investigator: by,
    key: option.key,
    actions: option.actions,
    provokes: option.provokes,
    ...(option.costs ? { costs: option.costs } : {}),
    then: option.then,
  })
}
export const abilityKeys = (s: GameState, by = C) => availableAbilities(s, by).map((o) => o.key)
/** Skip optional windows and accept the first choice until nothing is pending. */
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
