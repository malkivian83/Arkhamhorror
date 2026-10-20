import {
  createGame,
  playerCardDef,
  type Asset,
  type GameState,
  type Investigator,
} from '@lcg/engine'
import { choose, during, testInvestigator, testScenario } from '@lcg/engine/testing'
import '../index'

export function game(players = ['a']): GameState {
  let state = createGame({
    seed: 3,
    scenario: testScenario(),
    investigators: players.map((id) => testInvestigator(id)),
  })
  if (state.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    state = choose(state, 'choice.investigator', { name: 'A' })
  return state
}
export const me = (state: GameState) => state.investigators[0]!
export const patch =
  (changes: Partial<Investigator>, who = 'a') =>
  (state: GameState): GameState => ({
    ...state,
    investigators: state.investigators.map((investigator) =>
      investigator.id === who ? { ...investigator, ...changes } : investigator,
    ),
  })
export function withAsset(state: GameState, code: string, changes: Partial<Asset> = {}): GameState {
  const asset: Asset = {
    id: code,
    code,
    owner: 'a',
    damage: 0,
    horror: 0,
    exhausted: false,
    uses: playerCardDef(code)?.uses?.count ?? 0,
    ...changes,
  }
  return { ...state, assets: { ...state.assets, [asset.id]: asset } }
}
export function hand(state: GameState, code: string): GameState {
  return during(state, patch({ hand: [code], resources: 10 }))
}
export const play = (state: GameState, code: string) =>
  choose(hand(state, code), 'action.play', { card: playerCardDef(code)!.name })
