import { playerCardDef, type EnemyCard, type GameState } from '@lcg/engine'
import { choose, during, spawnAt } from '@lcg/engine/testing'
import { game, patch, withAsset } from '../dunwich-pilot/testing'
import { sturdy } from '../basic-abilities/testing'
import './index'
import '../basic-abilities/index'

export { enemy, resolve, sturdy } from '../basic-abilities/testing'

/** Event in hand for investigator "a" at Room A, with an enemy engaged with "a" by default. */
export function holding(
  code: string,
  options: {
    enemy?: EnemyCard | null
    engagedWith?: string | null
    hand?: string[]
    assets?: string[]
    players?: string[]
  } = {},
): GameState {
  const enemy = options.enemy === undefined ? sturdy : options.enemy
  return during(
    { ...game(options.players), interactive: true },
    (s) =>
      (options.assets ?? []).reduce(
        (x, asset) => withAsset(x, asset),
        patch({ hand: [code, ...(options.hand ?? [])], resources: 10 })(s),
      ),
    ...(enemy
      ? [spawnAt('A', enemy, options.engagedWith === undefined ? 'a' : options.engagedWith)]
      : []),
  )
}

export const play = (s: GameState, code: string) =>
  choose(s, 'action.play', { card: playerCardDef(code)!.name })
