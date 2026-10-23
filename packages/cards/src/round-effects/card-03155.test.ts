import { allPlayerCardDefs, playableCards, skillTestValue, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import { holding } from '../basic-events/testing'
import { me, patch, withAsset } from '../dunwich-pilot/testing'
import { value } from '../phase-bonuses/testing'
import './index'

const prepared = (horror = 2, players = ['a']) =>
  during(holding('03155', { players }), patch({ horror }))
const play = (s: GameState, _code: string) =>
  choose(s, 'action.playFast', { card: 'Fight or Flight' })

// RR: Fast, Lasting Effects, Skill Tests. Play through the real action window.
it('plays only on your turn, paying 1 resource without an action or opportunity attack', () => {
  const before = prepared()
  const after = play(before, '03155')
  expect(me(after).resources).toBe(me(before).resources - 1)
  expect(me(after).actionsRemaining).toBe(me(before).actionsRemaining)
  expect(me(after).damage).toBe(0)
  expect(me(after).horror).toBe(2)
  expect(me(after).discard).toContain('03155')
  expect(playableCards({ ...before, activeTurn: 'b' }, 'a', true)).not.toContain('03155')
  const poor = patch({ resources: 0 })(before)
  expect(playableCards(poor, 'a', true)).not.toContain('03155')
})

it('tracks gains and healing of investigator horror, ignoring horror on assets', () => {
  let s = play(prepared(), '03155')
  expect(value(s, 'combat')).toBe(5)
  expect(value(s, 'agility')).toBe(5)
  expect(value(s, 'intellect')).toBe(3)
  s = patch({ horror: 4 })(s)
  expect(value(s, 'combat')).toBe(7)
  s = patch({ horror: 0 })(s)
  s = withAsset(s, '01018', { horror: 2 })
  expect(value(s, 'agility')).toBe(3)
})

it('survives phase changes and serialization but expires at the next round for its owner only', () => {
  const s = play(prepared(2, ['a', 'b']), '03155')
  const saved = JSON.parse(JSON.stringify(s)) as GameState
  expect(value({ ...saved, phase: 'enemy' }, 'combat')).toBe(5)
  expect(value({ ...saved, phase: 'upkeep' }, 'agility')).toBe(5)
  expect(value(saved, 'combat', 'b')).toBe(3)
  expect(value({ ...saved, round: saved.round + 1 }, 'combat')).toBe(3)
})

it('stacks two copies and a phase bonus without changing base skills', () => {
  let s = during(holding('03155', { hand: ['03155'] }), patch({ horror: 2 }))
  s = play(play(s, '03155'), '03155')
  s = during(s, (x) => x, {
    type: 'PhaseSkillBonus',
    investigator: 'a',
    skill: 'combat',
    amount: 2,
    code: '01042',
  })
  expect(value(s, 'combat')).toBe(9)
  expect(value({ ...s, phase: 'enemy' }, 'combat')).toBe(7)
  expect(me(s).skills.combat).toBe(3)
  // The test UI exposes both lasting sources rather than hiding the bonus.
  const test: NonNullable<GameState['skillTest']> = {
    investigator: 'a',
    skill: 'combat',
    committed: [],
    baseModifier: 0,
    kind: { type: 'investigate', location: 'A' },
    difficulty: 1,
    tokens: [],
    tokenModifier: 0,
    autoFail: false,
    tokenOnFail: [],
    tokenOnFailBy: [],
    modifiedSkill: null,
    succeeded: null,
  }
  expect(
    skillTestValue({ ...s, skillTest: test }).sources.filter((x) => x.name === 'Fight or Flight'),
  ).toHaveLength(2)
})

// RR: Deck Customization, Campaign Upgrades. Catalog and scenario use the real definition.
it('is unique in the catalog and can be bought and included in a campaign scenario', () => {
  expect(allPlayerCardDefs().filter((c) => c.code === '03155')).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', ['pete'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  const options = purchaseOptions(c, id).filter((o) => o.code === '03155')
  expect(options).toHaveLength(1)
  c = purchase(c, id, '03155', { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain('03155')
})
