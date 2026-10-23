import {
  allPlayerCardDefs,
  canCommitFrom,
  dispatch,
  playerCardDef,
  skillTestValue,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { choose, chooseWithConsent } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { resolve } from '../basic-abilities/testing'
import { me, patch } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import './index'

const code = '11025'
const name = 'Hardboiled'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
function setup(): GameState {
  const s = holding(code, { players: ['a', 'b'] })
  return {
    ...s,
    investigators: s.investigators.map((i) => ({ ...i, hand: [] })),
    enemies: Object.fromEntries(
      Object.entries(s.enemies).map(([id, e]) => [id, { ...e, health: 100 }]),
    ),
  }
}
function begin(
  s: GameState,
  options: { fight?: boolean; by?: string; skill?: SkillType; difficulty?: number } = {},
): GameState {
  return dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: options.by ?? 'a',
    skill: options.skill ?? (options.fight ? 'combat' : 'intellect'),
    difficulty: options.difficulty ?? 0,
    kind: options.fight
      ? { type: 'fight', enemy: Object.keys(s.enemies)[0]!, extraDamage: 0 }
      : { type: 'effect', source: 'history-test', onSuccess: [], onFail: [], onFailEach: [] },
  })
}
const attack = (s: GameState, by = 'a') => resolve(begin(s, { fight: true, by }))
const commit = (s: GameState, by = 'a') =>
  chooseWithConsent(s, by === s.skillTest!.investigator ? 'choice.commit' : 'choice.commitFrom', {
    card: name,
  })

// RR: Skill Tests, Commit Cards, Duration. One combat and one wild per attack,
// added to the printed pair, using the committer's history for this round.
it.each([0, 1, 3])('adds matching icons after %s successful attacks', (count) => {
  let s = setup()
  for (let n = 0; n < count; n++) s = attack(s)
  for (const skill of ['combat', 'intellect'] as const) {
    const test = begin(patch({ hand: [code] })(s), { skill })
    const icons = (1 + count) * (skill === 'combat' ? 2 : 1)
    expect(
      test.pending!.question.choices.find((c) => c.label === 'choice.commit')!.params!.icons,
    ).toBe(icons)
    expect(skillTestValue(commit(test)).icons).toBe(icons)
  }
})
it('does not count the current attack before it has finished', () => {
  let s = begin(patch({ hand: [code] })(setup()), { fight: true })
  s = commit(s)
  expect(skillTestValue(s).icons).toBe(2)
  expect(me(s).successfulAttacks).toBeUndefined()
  s = resolve(s)
  expect(me(s).successfulAttacks).toEqual({ round: s.round, count: 1 })
})
it('keeps a helper history separate from that of the performer', () => {
  let s = attack(setup(), 'b')
  s = begin(patch({ hand: [code] }, 'b')(s), { fight: true })
  s = commit(s, 'b')
  expect(skillTestValue(s).icons).toBe(4)
  expect(me(s).successfulAttacks).toBeUndefined()
  s = resolve(s)
  expect(me(s).successfulAttacks!.count).toBe(1)
  expect(s.investigators[1]!.successfulAttacks!.count).toBe(1)
})
it('counts attacks outside the investigator turn, survives JSON and lasts across phases', () => {
  let s = setup()
  s = attack({ ...s, phase: 'mythos', activeTurn: null })
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = begin(patch({ hand: [code] })({ ...s, phase: 'investigation' }), { fight: true })
  expect(skillTestValue(commit(s)).icons).toBe(4)
})
it('expires at the next round and starts a fresh count', () => {
  let s = attack(setup())
  s = { ...s, round: s.round + 1 }
  expect(skillTestValue(commit(begin(patch({ hand: [code] })(s)))).icons).toBe(1)
  s = attack(s)
  expect(me(s).successfulAttacks).toEqual({ round: s.round, count: 1 })
})
it.each([false, true])('does not count a failed attack (auto failure: %s)', (auto) => {
  const s = resolve(
    begin(setup(), { fight: true, difficulty: auto ? 0 : 99 }),
    auto ? 'autoFail' : 0,
  )
  expect(me(s).successfulAttacks).toBeUndefined()
})
it('does not count successful non-attacks or direct damage', () => {
  let s = resolve(begin(setup()))
  s = dispatch(clear(s), {
    type: 'DamageEnemy',
    enemy: Object.keys(s.enemies)[0]!,
    amount: 1,
    by: 'a',
  })
  expect(me(s).successfulAttacks).toBeUndefined()
})
it('counts one attack when Double or Nothing resolves its results twice', () => {
  let s = begin(patch({ hand: ['02026'] })(setup()), { fight: true })
  s = choose(s, 'choice.commit', { card: playerCardDef('02026')!.name })
  s = resolve(s)
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
  expect(me(s).successfulAttacks!.count).toBe(1)
})
it('records success even if the attack deals no damage', () => {
  let s = begin(setup(), { fight: true })
  // RR: Damage and Skill Test Results. Success and damage are independent.
  s = { ...s, skillTest: { ...s.skillTest!, succeeded: true, modifiedSkill: 3 } }
  s = dispatch(clear(s), { type: 'EndSkillTest' })
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(0)
  expect(me(s).successfulAttacks!.count).toBe(1)
  s = dispatch(clear(s), { type: 'EndSkillTest' })
  expect(me(s).successfulAttacks!.count).toBe(1)
})
it('enforces max one copy across investigators', () => {
  let s = begin(patch({ hand: [code, code] })(patch({ hand: [code] }, 'b')(setup())), {
    fight: true,
  })
  s = commit(s)
  expect(canCommitFrom(s, 'a', code)).toBe(false)
  expect(canCommitFrom(s, 'b', code)).toBe(false)
  const before = skillTestValue(s).icons
  const msg: Message = { type: 'CommitCard', investigator: 'b', code }
  s = dispatch(clear(s), msg)
  expect(skillTestValue(s).icons).toBe(before)
})
// RR: Deck Customization. The real shop and scenario use one catalog entry.
it('has one catalog/shop entry and starts in a legal investigator deck', () => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', ['jenny'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  expect(purchaseOptions(c, id).filter((o) => o.code === code)).toHaveLength(1)
  c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
  expect(playerCardDef(code)!.commitLimit).toBe(1)
})
