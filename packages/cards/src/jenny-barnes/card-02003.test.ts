// RR: Upkeep Phase, Elder Sign, Deckbuilding.
import { dispatch, investigatorBehavior, playerCardDef } from '@lcg/engine'
import { expect, it } from 'vitest'
import { clear, jenny, JENNY, makeGame } from './testing'

it('starts with her printed statistics and the default five resources', () => {
  const i = jenny(makeGame())
  expect(i.skills).toEqual({ willpower: 3, intellect: 3, combat: 3, agility: 3 })
  expect([i.health, i.sanity, i.resources]).toEqual([8, 7, 5])
  expect(playerCardDef(JENNY)!.signatures).toEqual(['02010', '02011'])
})

it('collects one additional resource only during the upkeep phase', () => {
  let s = clear(makeGame(true))
  const before = { jenny: jenny(s).resources, other: s.investigators[1]!.resources }
  s = dispatch(s, { type: 'UpkeepPhase' })
  expect(jenny(s).resources).toBe(before.jenny + 2)
  expect(s.investigators[1]!.resources).toBe(before.other + 1)
  s = dispatch(clear(s), { type: 'GainResources', investigator: JENNY, amount: 1, basic: true })
  expect(jenny(s).resources).toBe(before.jenny + 3)
})

it('elder sign adds one for each resource she has when it is revealed', () => {
  const s = makeGame()
  const effect = investigatorBehavior(JENNY)!.elderSign!
  expect(effect(s, { ...jenny(s), resources: 0 }).modifier).toBe(0)
  expect(effect(s, { ...jenny(s), resources: 7 }).modifier).toBe(7)
})

it('resolves a real elder sign against a difficulty only her resources can reach', () => {
  const run = (resources: number) =>
    dispatch(
      clear({
        ...makeGame(false, ['elderSign']),
        investigators: [{ ...jenny(makeGame()), resources, hand: [] }],
      }),
      {
        type: 'BeginSkillTest',
        investigator: JENNY,
        skill: 'willpower',
        difficulty: 7,
        kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
      },
    )
  expect(run(4).log.some((e) => e.key === 'log.testSuccess')).toBe(true)
  expect(run(3).log.some((e) => e.key === 'log.testSuccess')).toBe(false)
})
