import {
  allPlayerCardDefs,
  playableCards,
  skillTestValue,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { enemy, fight, resolve } from '../basic-abilities/testing'
import { me, patch, withAsset } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import './index'

const activate = (s = holding('01036')) =>
  choose(s, 'action.playFast', { card: 'Mind over Matter' })
const begin = (skill: SkillType = 'combat', investigator = 'a'): Message => ({
  type: 'BeginSkillTest',
  investigator,
  skill,
  difficulty: 2,
  kind: { type: 'effect', source: 'replacement-test', onSuccess: [], onFail: [], onFailEach: [] },
})

// RR: Fast; Skill Test Timing ST.1; Lasting Effects.
it('pays for a fast event on your turn without spending an action or provoking', () => {
  const s = holding('01036')
  const next = activate(s)
  expect(me(next)).toMatchObject({
    resources: 9,
    actionsRemaining: me(s).actionsRemaining,
    damage: 0,
    horror: 0,
  })
  expect(me(next).discard).toContain('01036')
  expect(playableCards({ ...s, activeTurn: 'b' }, 'a', true)).not.toContain('01036')
  expect(playableCards(patch({ resources: 0 })(s), 'a', true)).not.toContain('01036')
  const duringTest = during(s, (x) => x, begin())
  expect(playableCards(duringTest, 'a', true)).not.toContain('01036')
})

it.each(['combat', 'agility'] as const)(
  'offers the original %s and intellect before committing',
  (skill) => {
    let s = during(
      activate(),
      patch({
        hand: ['12093', '12092'],
        skills: { willpower: 3, intellect: 5, combat: 2, agility: 1 },
      }),
      begin(skill),
    )
    expect(s.skillTest).toBeNull()
    expect(s.pending!.question.prompt).toBe('prompt.chooseSkill')
    expect(s.pending!.question.choices.map((c) => c.label)).toEqual([
      `choice.test.${skill}`,
      'choice.test.intellect',
    ])
    s = choose(s, 'choice.test.intellect')
    expect(s.skillTest!.skill).toBe('intellect')
    expect(skillTestValue(s).base).toBe(5)
    expect(s.pending!.question.prompt).not.toBe('prompt.chooseSkill')
    expect(
      s.pending!.question.choices.some(
        (c) => c.label === 'choice.commit' && c.params?.card === 'Perception',
      ),
    ).toBe(true)
    expect(
      s.pending!.question.choices.some(
        (c) => c.label === 'choice.commit' && c.params?.card === 'Overpower',
      ),
    ).toBe(false)
    s = choose(s, 'choice.commit', { card: 'Perception' })
    expect(skillTestValue(s).icons).toBe(2)
  },
)

it('lets you keep the original skill and its base-value override', () => {
  const s = during(activate(), (x) => x, { ...begin(), baseSkill: 4 } as Message)
  const original = choose(s, 'choice.test.combat')
  expect(original.skillTest).toMatchObject({ skill: 'combat', baseSkill: 4 })
  const replacement = choose(s, 'choice.test.intellect')
  expect(replacement.skillTest!.baseSkill).toBeUndefined()
  expect(skillTestValue(replacement).base).toBe(3)
})

it('preserves weapon damage and source but ignores its combat bonus when using intellect', () => {
  let s = activate(withAsset(holding('01036'), '01020'))
  s = fight(s, '01020')
  const enemyId = enemy(s).id
  s = choose(s, 'choice.test.intellect')
  expect(s.skillTest!.kind.type).toBe('fight')
  expect(s.skillTest!.source).toBe('01020')
  expect(skillTestValue(s).total).toBe(3)
  s = resolve(s)
  expect(s.enemies[enemyId]!.damageTaken).toBe(2)
})

it('ignores combat-only ammunition and aiming bonuses but retains bonuses to every skill', () => {
  let s = activate(
    withAsset(holding('01036'), '01016', {
      upgrades: [
        { code: '60172', owner: 'a' },
        { code: '04020', owner: 'a' },
      ],
      nextFightBonus: 3,
    }),
  )
  s = fight(s, '01016')
  const original = choose(s, 'choice.test.combat')
  expect(skillTestValue(original).total).toBe(9)
  const replacement = choose(s, 'choice.test.intellect')
  expect(skillTestValue(replacement).total).toBe(4)
})

it('works for encounter-style tests in later phases, expires next round and affects only its owner', () => {
  const s = activate(holding('01036', { players: ['a', 'b'] }))
  const saved = JSON.parse(JSON.stringify(s)) as GameState
  const later = during({ ...saved, phase: 'enemy' }, (x) => x, begin('agility'))
  expect(later.pending!.question.prompt).toBe('prompt.chooseSkill')
  const nextRound = during({ ...saved, round: saved.round + 1 }, (x) => x, begin())
  expect(nextRound.skillTest!.skill).toBe('combat')
  const other = during(saved, (x) => x, begin('agility', 'b'))
  expect(other.skillTest!.skill).toBe('agility')
  const willpower = during(saved, (x) => x, begin('willpower'))
  expect(willpower.skillTest!.skill).toBe('willpower')
})

it('uses the modifiers of the selected skill, including Fight or Flight only for combat/agility', () => {
  let s = activate(holding('01036', { hand: ['03155'] }))
  s = during(s, patch({ horror: 2 }))
  s = choose(s, 'action.playFast', { card: 'Fight or Flight' })
  const pending = during(s, (x) => x, begin())
  expect(skillTestValue(choose(pending, 'choice.test.combat')).total).toBe(5)
  expect(skillTestValue(choose(pending, 'choice.test.intellect')).total).toBe(3)
})

it('offers each skill once when two copies are active', () => {
  const s = activate(activate(holding('01036', { hand: ['01036'] })))
  const test = during(s, (x) => x, begin())
  expect(test.pending!.question.choices).toHaveLength(2)
})

// RR: Deck Customization, Campaign Upgrades.
it('has one catalog/shop entry and can enter a campaign deck and scenario', () => {
  expect(allPlayerCardDefs().filter((c) => c.code === '01036')).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', ['joe'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  expect(purchaseOptions(c, id).filter((o) => o.code === '01036')).toHaveLength(1)
  c = purchase(c, id, '01036', { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain('01036')
})
