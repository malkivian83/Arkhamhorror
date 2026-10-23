import {
  allPlayerCardDefs,
  attackDamage,
  playableCards,
  playerCardDef,
  skillTestValue,
  type GameState,
} from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding, play } from '../basic-events/testing'
import { enemy, resolve } from '../basic-abilities/testing'
import { me, patch, withAsset } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import './index'
const code = '08022'
const classes = (s: GameState) => withAsset(withAsset(s, '01044'), '08105')
const open = () =>
  during(holding(code, { players: ['a', 'b'] }), (s) => classes(patch({ hand: [] }, 'b')(s)))
// RR: Fight, Limbo, Lasting Effects. Bonuses belong to this attack, follow the
// classes in play dynamically, and the resolving event itself does not count.
it('pays three resources and an action, fights at +3 for four damage without an opportunity attack', () => {
  const before = open()
  let s = play(before, code)
  expect(s.skillTest!.effectSource).toBe(code)
  expect(skillTestValue(s).total).toBe(6)
  expect(skillTestValue(s).sources).toContainEqual({ name: 'Gang Up', amount: 3 })
  expect(attackDamage(s, s.skillTest!)).toBe(4)
  s = resolve(s)
  expect(enemy(s).damageTaken).toBe(4)
  expect(me(s)).toMatchObject({
    resources: 7,
    damage: 0,
    horror: 0,
    actionsRemaining: me(before).actionsRemaining - 1,
  })
  expect(me(s).discard).toContain(code)
})
it('does not count its own guardian class or cards in other zones', () => {
  const before = during(
    holding(code),
    patch({ hand: [code, '01044'], deck: ['08105'], discard: ['01048'] }),
  )
  let s = play(before, code)
  expect(skillTestValue(s).total).toBe(3)
  expect(attackDamage(s, s.skillTest!)).toBe(1)
  s = resolve(s)
  expect(enemy(s).damageTaken).toBe(1)
})
it('updates both bonuses when assets change controller before resolution', () => {
  let s = play(open(), code)
  s = {
    ...s,
    assets: Object.fromEntries(
      Object.entries(s.assets).map(([id, a]) => [id, { ...a, owner: 'b' }]),
    ),
  }
  expect(skillTestValue(s).total).toBe(3)
  expect(attackDamage(s, s.skillTest!)).toBe(1)
  s = resolve(s)
  expect(enemy(s).damageTaken).toBe(1)
})
it('uses newly controlled cards and counts multiclass only once per class', () => {
  let s = play(holding(code), code)
  s = classes(withAsset(s, '01044', { id: 'another-copy' }))
  expect(skillTestValue(s).total).toBe(6)
  expect(attackDamage(s, s.skillTest!)).toBe(4)
})
it('only grants the skill bonus to combat while retaining attack damage when intellect replaces it', () => {
  let s = during(
    open(),
    (x) => x,
    ...(['combat', 'agility'] as const).map((from) => ({
      type: 'RoundSkillReplacement' as const,
      investigator: 'a',
      from,
      to: 'intellect' as const,
      code: '01036',
    })),
  )
  s = play(s, code)
  s = choose(s, 'choice.test.intellect')
  expect(s.skillTest!.skill).toBe('intellect')
  expect(s.skillTest!.effectSource).toBe(code)
  expect(skillTestValue(s).total).toBe(3)
  expect(attackDamage(s, s.skillTest!)).toBe(4)
})
it('survives JSON restoration and stacks matching committed icons', () => {
  let s = play(during(open(), patch({ hand: [code, '12092'] })), code)
  s = choose(s, 'choice.commit', { card: playerCardDef('12092')!.name })
  s = JSON.parse(JSON.stringify(s)) as GameState
  expect(skillTestValue(s).total).toBe(8)
  expect(attackDamage(s, s.skillTest!)).toBe(4)
})
it('cannot play without a legal target or enough resources and excludes unengaged aloof enemies', () => {
  expect(playableCards(holding(code, { enemy: null }), 'a', false)).not.toContain(code)
  expect(playableCards(patch({ resources: 2 })(open()), 'a', false)).not.toContain(code)
  let s = open()
  s = { ...s, enemies: { [enemy(s).id]: { ...enemy(s), engagedWith: null, keywords: ['aloof'] } } }
  expect(playableCards(s, 'a', false)).not.toContain(code)
})
it('does not apply bonuses to a later basic attack', () => {
  let s = resolve(play(open(), code))
  s = choose(s, 'action.fight', { enemy: enemy(s).name })
  expect(s.skillTest!.effectSource).toBeUndefined()
  expect(skillTestValue(s).sources.some((x) => x.name === 'Gang Up')).toBe(false)
  expect(attackDamage(s, s.skillTest!)).toBe(1)
})
it('does not damage the enemy on failure', () => {
  const s = resolve(play(open(), code), 'autoFail')
  expect(enemy(s).damageTaken).toBe(0)
})
it('routes attack damage to the other engaged investigator on failure', () => {
  let s = open()
  s = during(s, (x) => ({ ...x, enemies: { [enemy(x).id]: { ...enemy(x), engagedWith: 'b' } } }))
  s = resolve(play(s, code), 'autoFail')
  expect(s.investigators[1]!.damage).toBe(4)
  expect(enemy(s).damageTaken).toBe(0)
})
// RR: Deck Customization. Real campaign purchase and scenario integration.
it('has one catalog/shop entry and enters a scenario', () => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', ['daniela'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  expect(purchaseOptions(c, id).filter((o) => o.code === code)).toHaveLength(1)
  c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
})
