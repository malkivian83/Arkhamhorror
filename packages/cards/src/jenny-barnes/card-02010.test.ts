// RR: Costs (X), Uses (ammo), Fight, Equipment Slots.
import { availableAbilities, dispatch } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, hand, me, patch, withAsset } from '../dunwich-pilot/testing'

const twin = (s: Parameters<typeof me>[0]) =>
  Object.values(s.assets).find((a) => a.code === '02010')

it('asks for X up to the available resources and enters play with X ammo', () => {
  let s = choose(hand(game(), '02010'), 'action.play', { card: "Jenny's Twin .45s" })
  expect(s.pending!.question.prompt).toBe('prompt.chooseX')
  expect(s.pending!.question.choices).toHaveLength(11)
  s = choose(s, 'choice.payX', { n: 4 })
  expect(twin(s)!.uses).toBe(4)
  expect(me(s).resources).toBe(6)
  expect(me(s).actionsRemaining).toBe(2)
})

it('may be played for X = 0 and then offers no attack until it has ammo', () => {
  let s = choose(hand(game(), '02010'), 'action.play', { card: "Jenny's Twin .45s" })
  s = choose(s, 'choice.payX', { n: 0 })
  s = during(s, (s) => s, spawnAt('A', ghoul, 'a'))
  expect(me(s).resources).toBe(10)
  expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.fightWith')).toBe(false)
})

it('put into play without paying enters with zero ammo', () => {
  const s = dispatch(
    { ...patch({ hand: ['02010'] })(game()), pending: null, queue: [] },
    { type: 'PutAssetIntoPlay', investigator: 'a', code: '02010', fromHand: true },
  )
  expect(twin(s)!.uses).toBe(0)
})

it('spends one ammo to fight with +2 combat and one extra damage', () => {
  let s = during(
    game(),
    (s) =>
      withAsset(
        patch({ hand: [], skills: { willpower: 3, intellect: 3, combat: 1, agility: 3 } })(s),
        '02010',
        { uses: 2 },
      ),
    spawnAt('A', { ...ghoul, fight: 3, health: 5 }, 'a'),
  )
  s = choose(s, 'ability.fightWith')
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
  expect(s.assets['02010']!.uses).toBe(1)
  expect(me(s).actionsRemaining).toBe(2)
})
