import {
  playerCardDef,
  skillTestValue,
  type ChaosToken,
  type GameState,
  type Investigator,
  type SkillType,
} from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { game, patch } from '../dunwich-pilot/testing'
import './index'

export { me } from '../dunwich-pilot/testing'

/** A plain skill test of investigator "a" (difficulty 3) with the given cards in hand. */
export function open(
  skill: SkillType,
  hand: string[],
  changes: Partial<Investigator> = {},
  options: {
    players?: string[]
    tester?: string
    difficulty?: number
    activeTurn?: string | null
  } = {},
): GameState {
  const prepare = (s: GameState): GameState => ({
    ...patch({ hand, ...changes })(s),
    ...(options.activeTurn !== undefined ? { activeTurn: options.activeTurn } : {}),
  })
  return during({ ...game(options.players), interactive: true }, prepare, {
    type: 'BeginSkillTest',
    investigator: options.tester ?? 'a',
    skill,
    difficulty: options.difficulty ?? 3,
    kind: { type: 'effect', source: 'skill-tricks', onSuccess: [], onFail: [], onFailEach: [] },
  })
}

export const commitLabels = (s: GameState) =>
  (s.pending?.question.choices ?? [])
    .filter((c) => c.label === 'choice.commit')
    .map((c) => c.params?.card)
export const commit = (s: GameState, code: string) =>
  choose(s, 'choice.commit', { card: playerCardDef(code)!.name })
export const icons = (s: GameState) => skillTestValue(s).icons
/** Reveals one chosen token and applies the results. */
export const resolve = (s: GameState, token: ChaosToken = 0) => {
  let x = s
  while (!x.pending?.question.choices.some((c) => c.label === 'choice.revealToken'))
    x = choose(x, x.pending!.question.choices.find((c) => c.label !== 'choice.commit')!.label)
  return choose(choose({ ...x, chaosBag: [token] }, 'choice.revealToken'), 'choice.applyResults')
}
