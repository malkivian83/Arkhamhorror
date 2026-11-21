// RR: Evade, Limits, Elder Sign, Replacement Effects, Movement, Hunter, Forced Attacks.
import { expect, it } from 'vitest'
import { dispatch, investigatorBehavior, playerCardBehavior, type GameState } from '@lcg/engine'
import { choose, ghoul, newTestGame, spawnAt, throughSetup } from '@lcg/engine/testing'
import '../index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
function game(): GameState {
  const s = clear(throughSetup(newTestGame({ players: ['05005', 'b'] })))
  return {
    ...s,
    phase: 'investigation',
    activeTurn: '05005',
    interactive: true,
    investigators: s.investigators.map((i) => ({
      ...i,
      hand: [],
      discard: [],
      resources: 5,
      damage: 0,
      horror: 0,
      actionsRemaining: 3,
    })),
  }
}
function foe(s = game(), code = 'rita-foe') {
  return dispatch(clear(s), spawnAt('A', { ...ghoul, code, health: 5 }, '05005'))
}
const enemy = (s: GameState) => Object.values(s.enemies)[0]!
const evade = (s: GameState) =>
  dispatch(clear(s), { type: 'EvadeEnemy', enemy: enemy(s).id, by: '05005' })

it('deals one damage after her evasion, without spending an action, once per round', () => {
  let s = evade(foe())
  s = choose(s, 'ability.ritaEvade')
  s = choose(s, 'choice.ritaDamage')
  expect(enemy(s).damageTaken).toBe(1)
  expect(s.investigators[0]!.actionsRemaining).toBe(3)
  const repeated = evade(s)
  expect(repeated.pending?.question.choices.some((c) => c.label === 'ability.ritaEvade')).not.toBe(
    true,
  )
})

it('may move to a connecting location instead of dealing damage', () => {
  let s = choose(evade(foe()), 'ability.ritaEvade')
  s = choose(s, 'choice.ritaMove')
  expect(s.investigators[0]!.location).toBe('B')
  expect(enemy(s).damageTaken).toBe(0)
  expect(s.investigators[0]!.actionsRemaining).toBe(3)
})

it('does not react to another investigator’s evasion', () => {
  const s = foe()
  expect(
    investigatorBehavior('05005')!.reactions!(
      s,
      { type: 'afterEvade', investigator: 'b', enemy: enemy(s).id },
      s.investigators[0]!,
    ),
  ).toEqual([])
})

it('elder sign gives +2 and ignores even an already-used limit until this round ends', () => {
  let s = choose(choose(evade(foe()), 'ability.ritaEvade'), 'choice.ritaDamage')
  const b = investigatorBehavior('05005')!,
    effect = b.elderSign!(s, s.investigators[0]!)
  expect(effect.modifier).toBe(2)
  s = dispatch(clear(s), ...effect.immediate!)
  for (let n = 0; n < 2; n++) s = choose(choose(evade(s), 'ability.ritaEvade'), 'choice.ritaDamage')
  expect(enemy(s).damageTaken).toBe(3)
  const nextRound = { ...s, round: s.round + 1 }
  expect(
    b.reactions!(
      nextRound,
      { type: 'afterEvade', investigator: '05005', enemy: enemy(s).id },
      nextRound.investigators[0]!,
    )[0]!.limit,
  ).toEqual({ per: 'round' })
})

function signature() {
  let s = foe()
  s = {
    ...s,
    enemies: { [enemy(s).id]: { ...enemy(s), exhausted: true, engagedWith: 'b' } },
    investigators: s.investigators.map((i, n) => (n === 0 ? { ...i, hand: ['05016'] } : i)),
  }
  return dispatch(s, { type: 'PlayCard', investigator: '05005', code: '05016' })
}

it('signature readies and engages all local enemies and can only be played during her turn', () => {
  const s = signature()
  expect(enemy(s)).toMatchObject({ exhausted: false, engagedWith: '05005' })
  expect(s.investigators[0]!.actionsRemaining).toBe(3)
  expect(playerCardBehavior('05016')!.canPlay!({ ...s, activeTurn: 'b' }, '05005')).toBe(false)
})

it('may replace exhaustion and disengagement with damage, while preserving the successful evasion reaction', () => {
  let s = choose(evade(signature()), 'choice.ritaDamage')
  expect(enemy(s)).toMatchObject({ damageTaken: 1, exhausted: false, engagedWith: '05005' })
  s = choose(choose(s, 'ability.ritaEvade'), 'choice.ritaDamage')
  expect(enemy(s).damageTaken).toBe(2)
})

it('may decline the replacement and loses it outside her turn', () => {
  const normal = choose(evade(signature()), 'choice.ritaNormalEvade')
  expect(enemy(normal)).toMatchObject({ damageTaken: 0, exhausted: true, engagedWith: null })
  const s = signature()
  const later = evade({ ...s, activeTurn: 'b' })
  expect(enemy(later)).toMatchObject({ exhausted: true, engagedWith: null })
})

it('Hoods attacks after being evaded even while exhausted and disengaged', () => {
  let s = dispatch(game(), spawnAt('A', playerCardBehavior('05017')!.enemy!, '05005'))
  s = evade(s)
  expect(s.investigators[0]!.damage).toBe(1)
  expect(s.investigators[0]!.horror).toBe(1)
  expect(enemy(s).exhausted).toBe(true)
})

it('the weakness has exclusive prey, Alert and Hunter', () => {
  expect(playerCardBehavior('05017')!.enemy).toMatchObject({
    fight: 3,
    health: 3,
    evade: 3,
    damage: 1,
    horror: 1,
    keywords: ['alert', 'hunter'],
    prey: { type: 'only', investigator: '05005' },
  })
})
