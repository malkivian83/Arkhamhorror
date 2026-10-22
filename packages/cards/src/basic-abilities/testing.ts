import {
  playerCardDef,
  type Asset,
  type ChaosToken,
  type EnemyCard,
  type GameState,
} from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { game, patch, withAsset } from '../dunwich-pilot/testing'
import './index'

export const sturdy: EnemyCard = { ...ghoul, health: 10 }

/** Asset in play for investigator "a" at Room A, optionally with an enemy engaged with "a". */
export function setup(
  code: string,
  options: {
    enemy?: EnemyCard | null
    engagedWith?: string | null
    asset?: Partial<Asset>
    players?: string[]
    resources?: number
  } = {},
): GameState {
  const enemy = options.enemy === undefined ? sturdy : options.enemy
  return during(
    { ...game(options.players), interactive: true },
    (s) =>
      withAsset(
        patch({ resources: options.resources ?? 5, hand: [] })(s),
        code,
        options.asset ?? {},
      ),
    ...(enemy ? [spawnAt('A', enemy, options.engagedWith ?? 'a')] : []),
  )
}

export const name = (code: string) => playerCardDef(code)!.name
export const enemy = (s: GameState) => Object.values(s.enemies)[0]!

/** Reveal a single chosen token and apply the results. */
export const resolve = (s: GameState, token: ChaosToken = 0) =>
  choose(choose({ ...s, chaosBag: [token] }, 'choice.revealToken'), 'choice.applyResults')

export const fight = (s: GameState, code: string, skill?: string) =>
  choose(
    s,
    skill ? 'ability.fightWithSkill' : 'ability.fightWith',
    skill ? { card: name(code), skill } : { card: name(code) },
  )
export const investigate = (s: GameState, code: string, skill = 'intellect') =>
  choose(s, 'ability.investigateWith', { card: name(code), skill })
export const evade = (s: GameState, code: string, skill = 'agility') =>
  choose(s, 'ability.evadeWith', { card: name(code), skill })
