// RR: Activate, Base Value, Fight, Investigate, Move, Damage Assignment, Equipment Slots.
import { availableAbilities, dispatch, skillTestValue } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { patch, withAsset } from '../dunwich-pilot/testing'
import { clear, duke, makeGame, PETE } from './testing'

it('fights at base four, deals two damage and costs one action and exhaustion', () => {
  let s = during(
    makeGame(),
    patch({ hand: [] }, PETE),
    spawnAt('A', { ...ghoul, health: 8, fight: 4 }, PETE),
  )
  const before = s.investigators[0]!.actionsRemaining
  s = choose(s, 'ability.fightWith', { card: 'Duke' })
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
  expect(s.investigators[0]!.actionsRemaining).toBe(before - 1)
  expect(duke(s).exhausted).toBe(true)
  expect(availableAbilities(s, PETE).some((a) => a.params?.card === 'Duke')).toBe(false)
})

it('uses a replacement base before passive bonuses and committed icons', () => {
  let s = withAsset(makeGame(), '12018', { owner: PETE })
  s = dispatch(clear(patch({ hand: ['12092'] }, PETE)(s)), {
    type: 'BeginSkillTest',
    investigator: PETE,
    skill: 'combat',
    difficulty: 3,
    baseSkill: 4,
    kind: { type: 'effect', source: 'duke-test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  expect(skillTestValue(s).base).toBe(4)
  expect(skillTestValue(s).total).toBe(5)
  s = JSON.parse(JSON.stringify(s)) as typeof s
  s = dispatch(clear(s), { type: 'CommitCard', investigator: PETE, code: '12092' })
  expect(skillTestValue(s).total).toBe(7)
  expect(s.investigators[0]!.skills.combat).toBe(2)
})

it('can investigate in place or move first, spending only one action', () => {
  for (const location of ['A', 'B']) {
    let s = during(makeGame(), patch({ hand: [] }, PETE))
    const before = s.investigators[0]!.actionsRemaining
    s = choose(s, 'ability.investigateWith', { card: 'Duke' })
    const selected = s.pending!.question.choices.find(
      (c) => c.target?.type === 'location' && c.target.id === location,
    )!
    expect(selected).toBeDefined()
    s = dispatch({ ...s, pending: null }, ...selected.then)
    expect(s.investigators[0]!.location).toBe(location)
    expect(s.investigators[0]!.actionsRemaining).toBe(before - 1)
    expect(duke(s).exhausted).toBe(true)
  }
})

it('does not grant basic-action skill bonuses to Duke tests', () => {
  let s = during(
    makeGame(),
    patch({ hand: ['06166'] }, PETE),
    spawnAt('A', { ...ghoul, health: 8, fight: 4 }, PETE),
  )
  s = choose(s, 'ability.fightWith', { card: 'Duke' })
  expect(s.skillTest!.baseSkill).toBe(4)
  expect(s.skillTest!.basicAction).toBeUndefined()
  s = choose(s, 'choice.commit')
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
})

it('Duke uses no ally slot and may be defeated by damage', () => {
  let s = dispatch(clear(makeGame()), {
    type: 'PutAssetIntoPlay',
    investigator: PETE,
    code: '02033',
  })
  expect(Object.values(s.assets).filter((a) => a.owner === PETE)).toHaveLength(2)
  const id = duke(s).id
  s = dispatch(clear(s), { type: 'DamageAsset', asset: id, damage: 2, horror: 0 })
  expect(s.assets[id]).toBeUndefined()
  expect(s.investigators[0]!.discard).toContain('02014')
})
