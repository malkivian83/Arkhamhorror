// RR: Move, Swap, Enemy Engagement, Attacks of Opportunity, Parley, Target.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  registerScenario,
  type Enemy,
  type GameState,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me } from '../dunwich-pilot/testing'
import './index'
const start = (code: string) => {
  const s = patch({ hand: [code], resources: 5 })({ ...game(['a', 'b']), pending: null, queue: [] })
  return {
    ...s,
    locations: Object.fromEntries(
      Object.entries(s.locations).map(([id, l]) => [id, { ...l, revealed: true }]),
    ),
  }
}
const foe = (s: GameState, id = 'foe', changes: Partial<Enemy> = {}): GameState => ({
  ...s,
  enemies: {
    ...s.enemies,
    [id]: {
      ...ghoul,
      id,
      name: id,
      location: 'C',
      engagedWith: null,
      exhausted: false,
      maxHealth: 2,
      damageTaken: 0,
      doom: 0,
      ...changes,
    },
  },
})
const play = (s: GameState, code: string) =>
  dispatch(s, { type: 'PlayCard', investigator: 'a', code })
const target = (s: GameState, id = 'foe') => choose(s, 'choice.relocationEnemy', { enemy: id })
it.each(['08108', '08110'])(
  '%s swaps positions atomically without the enemy following the investigator back',
  (code) => {
    const s = target(play(foe(start(code)), code))
    expect(me(s).location).toBe('C')
    expect(s.enemies.foe).toMatchObject({ location: 'A', engagedWith: 'b', exhausted: false })
    expect(me(s).resources).toBe(code === '08108' ? 3 : 4)
  },
)
it.each(['08108', '08110'])(
  '%s moves other engaged enemies with the investigator and breaks the swapped engagement',
  (code) => {
    let s = patch(
      { location: 'C' },
      'b',
    )(
      foe(foe(start(code), 'follower', { location: 'A', engagedWith: 'a' }), 'foe', {
        engagedWith: 'b',
      }),
    )
    s = target(play(s, code))
    expect(s.enemies.follower).toMatchObject({ location: 'C', engagedWith: 'a' })
    expect(s.enemies.foe).toMatchObject({ location: 'A', engagedWith: null })
    expect(s.investigators[1]!.location).toBe('C')
  },
)
it('Slip 0 is limited to two connections, while Slip 2 also reaches disconnected revealed locations', () => {
  const s = foe(start('08110'))
  s.locations.A = { ...s.locations.A!, connections: [] }
  expect(playerCardBehavior('08108')!.canPlay!(s, 'a')).toBe(false)
  expect(playerCardBehavior('08110')!.canPlay!(s, 'a')).toBe(true)
  expect(me(target(play(s, '08110'))).location).toBe('C')
})
it.each(['08108', '08110', '60466'])('%s excludes Elite and global enemies', (code) => {
  const s = foe(start(code), 'foe', { location: 'A', traits: ['Elite'] })
  expect(playerCardBehavior(code)!.canPlay!(s, 'a')).toBe(false)
  expect(
    playerCardBehavior(code)!.canPlay!(foe(s, 'foe', { location: 'A', global: true }), 'a'),
  ).toBe(false)
})
it.each(['08108', '08110'])(
  '%s requires the destination revealed and preserves exhaustion',
  (code) => {
    const s = foe(start(code), 'foe', { exhausted: true })
    s.locations.C = { ...s.locations.C!, revealed: false }
    expect(playerCardBehavior(code)!.canPlay!(s, 'a')).toBe(false)
    s.locations.C = { ...s.locations.C!, revealed: true }
    expect(target(play(s, code)).enemies.foe).toMatchObject({
      exhausted: true,
      engagedWith: null,
      location: 'A',
    })
  },
)
it('a blocked investigator move cancels the whole swap, including the enemy relocation', () => {
  registerScenario({ id: 'relocation-blocked', cannotLeave: () => true })
  const blocked = { ...foe(start('08108')), scenarioId: 'relocation-blocked' }
  expect(playerCardBehavior('08108')!.canPlay!(blocked, 'a')).toBe(false)
  const s = target({ ...play(foe(start('08108')), '08108'), scenarioId: 'relocation-blocked' })
  expect(me(s).location).toBe('A')
  expect(s.enemies.foe!.location).toBe('C')
})
it('a destination removed while choosing or a target that moved cannot partially swap', () => {
  const s = foe(start('08108'))
  const moved = dispatch(foe(s, 'foe', { location: 'B' }), {
    type: 'MoveTo',
    investigator: 'a',
    location: 'C',
    swapEnemy: 'foe',
  })
  expect(me(moved).location).toBe('A')
  expect(moved.enemies.foe!.location).toBe('B')
  const { C: _removed, ...locations } = s.locations
  const gone = dispatch(
    { ...s, locations },
    { type: 'MoveTo', investigator: 'a', location: 'C', swapEnemy: 'foe' },
  )
  expect(me(gone).location).toBe('A')
  expect(gone.enemies.foe!.location).toBe('C')
})
it.each(['08108', '08110', '60466'])(
  '%s uses the real play action and its correct attacks of opportunity',
  (code) => {
    const s = foe(foe(start(code), 'attacker', { location: 'A', engagedWith: 'a' }), 'foe', {
      location: 'B',
      keywords: ['aloof'],
    })
    const played = dispatch(s, {
      type: 'TakeAction',
      investigator: 'a',
      action: { kind: 'play', card: code },
    })
    expect(me(played).damage).toBe(code === '60466' ? 0 : 1)
    expect(me(played).horror).toBe(code === '60466' ? 0 : 1)
    expect(me(played).actionsRemaining).toBe(me(s).actionsRemaining - 1)
    const result = target(played)
    expect(result.enemies.foe!.location).toBe('A')
    expect(me(result).location).toBe(code === '60466' ? 'A' : 'B')
  },
)
it('swap entry and movement reactions observe both new positions', () => {
  registerScenario({
    id: 'relocation-observe',
    forced: (s, t) =>
      t.type === 'afterMove' && t.investigator === 'a'
        ? [
            {
              type: 'GainResources',
              investigator: 'a',
              amount: s.enemies.foe!.location === 'A' && me(s).location === 'C' ? 1 : 100,
            },
          ]
        : [],
  })
  const s = target(play({ ...foe(start('08108')), scenarioId: 'relocation-observe' }, '08108'))
  expect(me(s).resources).toBe(4)
})
it('Charm reaches a connecting unrevealed location, engages an aloof enemy and gains its damage plus horror', () => {
  let s = foe(start('60466'), 'foe', { location: 'B', keywords: ['aloof'], damage: 2, horror: 3 })
  s.locations.B = { ...s.locations.B!, revealed: false }
  s = target(play(s, '60466'))
  expect(s.enemies.foe).toMatchObject({ location: 'A', engagedWith: 'a', exhausted: false })
  expect(me(s).resources).toBe(10)
  expect(me(s).location).toBe('A')
  expect(s.locations.B!.revealed).toBe(false)
})
it('Charm cannot reach two connections away but can take an exhausted local enemy from another investigator', () => {
  const s = foe(start('60466'))
  expect(playerCardBehavior('60466')!.canPlay!(s, 'a')).toBe(false)
  const result = target(
    play(foe(s, 'foe', { location: 'A', engagedWith: 'b', exhausted: true }), '60466'),
  )
  expect(result.enemies.foe).toMatchObject({ engagedWith: 'a', exhausted: true })
  expect(me(result).resources).toBe(7)
})
