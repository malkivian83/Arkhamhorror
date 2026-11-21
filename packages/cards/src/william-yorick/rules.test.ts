// RR: Defeat, Reaction Opportunities, Play, Costs, Victory Display, Prey; ST.6.
import { expect, it } from 'vitest'
import {
  dispatch,
  investigatorBehavior,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCards,
  type GameState,
  type PlayerCardDef,
} from '@lcg/engine'
import { choose, ghoul, newTestGame, spawnAt, throughSetup } from '@lcg/engine/testing'
import '../index'
import definitions from '../data/william-yorick.json'
import { registerYorickCard } from './register'
registerPlayerCards(definitions as PlayerCardDef[])
for (const code of ['03005', '03016', '03017']) registerYorickCard(code)
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
function game(): GameState {
  const s = clear(throughSetup(newTestGame({ players: ['03005', 'b'] })))
  return {
    ...s,
    phase: 'investigation',
    activeTurn: '03005',
    interactive: true,
    investigators: s.investigators.map((i) => ({
      ...i,
      hand: [],
      discard: [],
      resources: 5,
      actionsRemaining: 3,
    })),
  }
}
const patch = (s: GameState, discard: string[], hand: string[] = []): GameState => ({
  ...s,
  investigators: s.investigators.map((i, n) => (n === 0 ? { ...i, discard, hand } : i)),
})
const enemy = () => ({
  ...ghoul,
  id: 'defeated',
  location: 'A',
  engagedWith: null,
  maxHealth: 2,
  damageTaken: 0,
  exhausted: false,
  doom: 0,
})
const trigger = (by = '03005') => ({ type: 'enemyDefeated' as const, enemy: enemy(), by })

it('offers only affordable assets after Yorick himself defeats an enemy', () => {
  const s = patch(game(), ['01087', '01088'])
  const behavior = investigatorBehavior('03005')!
  const options = behavior.reactions!(s, trigger(), s.investigators[0]!)
  expect(options).toHaveLength(1)
  expect(options[0]!.limit).toEqual({ per: 'round' })
  expect(behavior.reactions!(s, trigger('b'), s.investigators[0]!)).toEqual([])
  const poor = { ...s, investigators: s.investigators.map((i) => ({ ...i, resources: 0 })) }
  expect(behavior.reactions!(poor, trigger(), poor.investigators[0]!)).toEqual([])
})

it('plays the recovered asset through normal payment without spending an action', () => {
  let s = patch(game(), ['01087'])
  s = dispatch(s, { type: 'Forced', trigger: trigger() })
  s = choose(s, 'ability.playCard', { card: playerCardDef('01087')!.name })
  expect(Object.values(s.assets).map((a) => a.code)).toContain('01087')
  expect(s.investigators[0]!.discard).toEqual([])
  expect(s.investigators[0]!.resources).toBe(5 - playerCardDef('01087')!.cost!)
  expect(s.investigators[0]!.actionsRemaining).toBe(3)
  s = patch(clear(s), ['01087'])
  s = dispatch(s, { type: 'Forced', trigger: trigger() })
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.playCard')).not.toBe(true)
})

it('elder sign gives +2 and returns a card only through the success continuation', () => {
  const s = patch(game(), ['01088', '01088'])
  const effect = investigatorBehavior('03005')!.elderSign!(s, s.investigators[0]!)
  expect(effect.modifier).toBe(2)
  expect(effect.immediate).toBeUndefined()
  let next = dispatch(s, ...effect.onSuccess!)
  next = choose(next, 'choice.recoveryReturn')
  expect(next.investigators[0]!.hand).toEqual(['01088'])
  expect(next.investigators[0]!.discard).toEqual(['01088'])
})

it('Bury Them Deep accepts another investigator’s defeat at your location, but excludes Elite and remote enemies', () => {
  const s = game(),
    b = playerCardBehavior('03016')!
  expect(b.handReactions!(s, trigger('b'), '03005')).toHaveLength(1)
  expect(
    b.handReactions!(s, { ...trigger(), enemy: { ...enemy(), traits: ['Elite'] } }, '03005'),
  ).toEqual([])
  expect(
    b.handReactions!(s, { ...trigger(), enemy: { ...enemy(), location: 'B' } }, '03005'),
  ).toEqual([])
})

it('moves the actually defeated enemy and event to victory without retaining a discard copy', () => {
  let s = patch(game(), [], ['03016'])
  s = dispatch(s, spawnAt('A', { ...ghoul, code: 'buried-foe' }))
  const foe = Object.values(s.enemies)[0]!
  s = dispatch(clear(s), { type: 'DefeatEnemy', enemy: foe.id, by: 'b' })
  s = choose(s, 'ability.playCard', { card: playerCardDef('03016')!.name })
  expect(s.victoryDisplay).toEqual(['buried-foe', '03016'])
  expect(s.victoryPoints).toBe(1)
  expect(s.encounterDiscard.some((c) => c.code === 'buried-foe')).toBe(false)
  expect(s.investigators[0]!.hand).toEqual([])
  expect(s.investigators[0]!.discard).toEqual([])
})

it('does not double-count an enemy that already entered victory on defeat', () => {
  let s = patch(game(), [], ['03016'])
  s = dispatch(s, spawnAt('A', { ...ghoul, code: 'victory-foe', victory: 2 }))
  s = dispatch(clear(s), { type: 'DefeatEnemy', enemy: Object.values(s.enemies)[0]!.id, by: 'b' })
  s = choose(s, 'ability.playCard', { card: playerCardDef('03016')!.name })
  expect(s.victoryDisplay).toEqual(['victory-foe', '03016'])
  expect(s.victoryPoints).toBe(3)
})

it('Graveyard Ghouls has printed enemy values, Hunter and exclusive prey', () => {
  expect(playerCardBehavior('03017')!.enemy).toMatchObject({
    fight: 3,
    health: 3,
    evade: 2,
    damage: 1,
    horror: 1,
    keywords: ['hunter'],
    prey: { type: 'only', investigator: '03005' },
  })
})

it('the engaged weakness prevents both Yorick recovery effects and releases them on leaving engagement', () => {
  let s = patch(game(), ['01087', '01088'])
  s = dispatch(s, spawnAt('A', playerCardBehavior('03017')!.enemy!, '03005'))
  const b = investigatorBehavior('03005')!
  expect(b.reactions!(s, trigger(), s.investigators[0]!)).toEqual([])
  const next = dispatch(clear(s), ...b.elderSign!(s, s.investigators[0]!).onSuccess!)
  expect(next.investigators[0]!.hand).toEqual([])
  const unlocked = { ...s, enemies: {} }
  expect(b.reactions!(unlocked, trigger(), unlocked.investigators[0]!)).toHaveLength(1)
})
