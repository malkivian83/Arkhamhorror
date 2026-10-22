import './index'
import {
  canCommitFrom,
  dispatch,
  playerCardBehavior,
  playerCardDef,
  playableCards,
  registerPlayerCards,
  registerTreachery,
  skillTestValue,
  type GameState,
  type Message,
  type SkillTestKind,
} from '@lcg/engine'
import { choose, spawnAt, ghoul } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const bare = (players = ['a']): GameState => ({
  ...game(players),
  interactive: true,
  pending: null,
  queue: [],
})
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const begin = (
  kind: SkillTestKind = {
    type: 'effect',
    source: 'survivor-test',
    onSuccess: [],
    onFail: [],
    onFailEach: [],
  },
  investigator = 'a',
): Message => ({
  type: 'BeginSkillTest',
  investigator,
  skill: kind.type === 'evade' ? 'agility' : 'combat',
  difficulty: 1,
  kind,
})
const options = (s: GameState) => s.pending?.question.choices.map((c) => c.label) ?? []
const resolveTest = (s: GameState) => choose(choose(s, 'choice.revealToken'), 'choice.applyResults')

// RR Additional Actions, Equipment Slots: continuous actions are spent before ordinary ones.
describe('Leo De Luca and Lone Wolf', () => {
  it('grants a fourth action, consumes it first and does not remove an ordinary action on leaving', () => {
    let s = dispatch(withAsset(bare(), '01048'), { type: 'BeginTurn', investigator: 'a' })
    expect(me(s).actionsRemaining).toBe(4)
    s = choose(s, 'action.resource')
    expect(me(s).actionsRemaining).toBe(3)
    s = dispatch(clear(s), { type: 'DiscardAsset', asset: '01048' })
    expect(me(s).actionsRemaining).toBe(3)
    expect(me(s).discard).toContain('01048')
  })
  it('adds an action when Leo enters mid-turn and removes his unused action if he leaves', () => {
    let s = dispatch(patch({ actionsRemaining: 2 })(bare()), {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: '01048',
    })
    expect(me(s).actionsRemaining).toBe(3)
    const id = Object.values(s.assets).find((a) => a.code === '01048')!.id
    s = dispatch(s, { type: 'DiscardAsset', asset: id })
    expect(me(s).actionsRemaining).toBe(2)
  })
  it('offers Lone Wolf only when alone at turn start and enforces its one-per-investigator limit', () => {
    const prepared = withAsset(patch({ hand: ['02188'] })(bare()), '02188')
    expect(playableCards(prepared, 'a', false)).not.toContain('02188')
    const s = choose(
      dispatch(prepared, { type: 'Forced', trigger: { type: 'turnBegins', investigator: 'a' } }),
      'ability.survivorWolfResource',
    )
    expect(me(s).resources).toBe(me(prepared).resources + 1)
    const together = withAsset(bare(['a', 'b']), '02188')
    expect(
      options(
        dispatch(together, { type: 'Forced', trigger: { type: 'turnBegins', investigator: 'a' } }),
      ),
    ).not.toContain('ability.survivorWolfResource')
  })
})

// RR Target, Level, Discard: signatures have no level, and the resolving event is in limbo.
describe('Scrounge for Supplies and Short Supply', () => {
  it('recovers any eligible level-zero class, excluding signatures, higher levels and the resolving copy', () => {
    let s = patch({ hand: ['06165'], discard: ['01048', '10023', '02014', '08105'], resources: 3 })(
      bare(),
    )
    s = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '06165' })
    expect(s.pending?.question.choices.map((c) => c.params?.card)).toEqual([
      'Leo De Luca',
      'Wolf Mask',
    ])
    s = choose(s, 'choice.reactiveRecover', { card: 'Leo De Luca' })
    expect(me(s).hand).toEqual(['01048'])
    expect(me(s).discard).toEqual(['10023', '02014', '08105', '06165'])
  })
  it('can recover a different discarded Scrounge copy but cannot play without an eligible target', () => {
    const empty = patch({ hand: ['06165'], discard: ['02014', '08105'] })(bare())
    expect(playableCards(empty, 'a', false)).not.toContain('06165')
    const s = dispatch(patch({ discard: ['06165'] })(empty), {
      type: 'PlayCard',
      investigator: 'a',
      code: '06165',
    })
    expect(me(s).hand).toEqual(['06165'])
    expect(me(s).discard).toEqual(['06165'])
  })
  it('mills up to ten cards including weaknesses once on the first actual turn, without drawing or reshuffling', () => {
    const original = withAsset(
      patch({ deck: ['02015', '01048', '08105'], hand: [], discard: [] })(bare()),
      '08071',
    )
    let s = dispatch(original, {
      type: 'Forced',
      trigger: { type: 'turnBegins', investigator: 'a' },
    })
    expect(me(s).deck).toEqual([])
    expect(me(s).discard).toEqual(['02015', '01048', '08105'])
    expect(me(s).horror).toBe(me(original).horror)
    s = dispatch(patch({ deck: ['01048'] })(s), {
      type: 'Forced',
      trigger: { type: 'turnBegins', investigator: 'a' },
    })
    expect(me(s).deck).toEqual(['01048'])
    expect(playerCardDef('08071')?.deckLimit).toBe(1)
  })
})

// RR Uses, Replenish, Skill Tests: no bonus leaks to later tests or unrelated skills.
describe('Ice Pick and Wolf Mask', () => {
  it('stacks two independent exhausted Ice Picks during investigation but not an unrelated effect test', () => {
    const prepared = withAsset(withAsset(bare(), '08105'), '08105', { id: 'second-pick' })
    let s = dispatch(prepared, begin({ type: 'investigate', location: 'A' }))
    const initial = skillTestValue(s).total
    s = choose(choose(s, 'ability.survivorIcePick'), 'ability.survivorIcePick')
    expect(skillTestValue(s).total).toBe(initial + 2)
    expect(options(s)).not.toContain('ability.survivorIcePick')
    expect(Object.values(s.assets).every((a) => a.exhausted)).toBe(true)
    expect(options(dispatch(withAsset(bare(), '08105'), begin()))).not.toContain(
      'ability.survivorIcePick',
    )
    expect(
      playableCards({ ...patch({ hand: ['08105'] })(bare()), activeTurn: 'b' }, 'a', true),
    ).not.toContain('08105')
  })
  it('spends one offering once per test and replenishes to at most two after engagement', () => {
    let s = dispatch(withAsset(bare(), '10023'), begin())
    const initial = skillTestValue(s).total
    s = choose(s, 'ability.survivorMaskBoost')
    expect(skillTestValue(s).total).toBe(initial + 2)
    expect(s.assets['10023']?.uses).toBe(1)
    expect(options(s)).not.toContain('ability.survivorMaskBoost')
    s = resolveTest(s)
    s = dispatch(s, {
      type: 'Forced',
      trigger: { type: 'afterEngage', investigator: 'a', enemy: 'any' },
    })
    s = dispatch(s, {
      type: 'Forced',
      trigger: { type: 'afterEngage', investigator: 'a', enemy: 'any' },
    })
    expect(s.assets['10023']?.uses).toBe(2)
    expect(
      options(dispatch(withAsset(bare(), '10023'), { ...begin(), skill: 'intellect' } as Message)),
    ).not.toContain('ability.survivorMaskBoost')
    expect(
      playableCards(withAsset(patch({ hand: ['10023'] })(bare()), '10023'), 'a', false),
    ).not.toContain('10023')
  })
})

// RR Move, Enemy Engagement; Track Shoes FAQ June 2023 (deferred test after ST.8).
describe('Track Shoes arrival window', () => {
  const prepared = () => dispatch(withAsset(bare(), '05036'), spawnAt('B'))
  it('escapes from the arrival location before its enemy engages, using the agility bonus', () => {
    let s = dispatch(prepared(), { type: 'MoveTo', investigator: 'a', location: 'B' })
    expect(Object.values(s.enemies)[0]?.engagedWith).toBeNull()
    s = choose(s, 'ability.survivorShoesMove')
    expect(skillTestValue(s).total).toBe(me(s).skills.agility + 1)
    s = resolveTest(s)
    s = choose(s, 'choice.pilotMove', { location: 'Room C' })
    expect(me(s).location).toBe('C')
    expect(Object.values(s.enemies)[0]).toMatchObject({ location: 'B', engagedWith: null })
  })
  it('allows normal engagement on failure and enforces one Footwear per investigator', () => {
    let s = dispatch(
      { ...prepared(), chaosBag: ['autoFail'] },
      { type: 'MoveTo', investigator: 'a', location: 'B' },
    )
    s = resolveTest(choose(s, 'ability.survivorShoesMove'))
    expect(me(s).location).toBe('B')
    expect(Object.values(s.enemies)[0]?.engagedWith).toBe('a')
    expect(playableCards(patch({ hand: ['05036'] })(s), 'a', false)).not.toContain('05036')
  })
  it('waits for an active test to close, keeping both engagement and movement together', () => {
    const effect: SkillTestKind = {
      type: 'effect',
      source: 'move-on-success',
      onSuccess: [{ type: 'MoveTo', investigator: 'a', location: 'B' }],
      onFail: [],
      onFailEach: [],
    }
    let s = resolveTest(dispatch(prepared(), begin(effect)))
    expect(s.skillTest).toBeNull()
    expect(Object.values(s.enemies)[0]?.engagedWith).toBeNull()
    s = choose(JSON.parse(JSON.stringify(s)) as GameState, 'ability.survivorShoesMove')
    expect(s.skillTest?.skill).toBe('agility')
    s = choose(resolveTest(s), 'choice.pilotMove', { location: 'Room C' })
    expect(me(s).location).toBe('C')
    expect(Object.values(s.enemies)[0]?.engagedWith).toBeNull()
  })
  it('resolves before Duke investigates, so Duke uses the final destination', () => {
    const original = withAsset(prepared(), '02014')
    const ability = playerCardBehavior('02014')!.abilities!(
      original,
      original.assets['02014']!,
      'a',
    ).find((a) => a.key.endsWith(':investigate'))!
    let s = dispatch(original, {
      type: 'UseAbility',
      investigator: 'a',
      key: ability.key,
      actions: ability.actions,
      provokes: ability.provokes,
      ...(ability.costs ? { costs: ability.costs } : {}),
      then: ability.then,
    })
    s = choose(s, 'choice.peteInvestigate', { location: 'Room B' })
    s = resolveTest(choose(s, 'ability.survivorShoesMove'))
    s = choose(s, 'choice.pilotMove', { location: 'Room C' })
    expect(s.skillTest?.kind).toEqual({ type: 'investigate', location: 'C' })
    expect(s.skillTest?.source).toBe('02014')
  })
})

// RR Commit, Skill Tests ST.7, Peril: adjacent permission never initiates a remote attack.
describe('Long Shot', () => {
  it.each(['fight', 'evade'] as const)(
    'commits from a connecting location and deals separate damage after a successful %s',
    (kind) => {
      let s = patch({ location: 'B', hand: [] }, 'b')(patch({ hand: ['10116'] })(bare(['a', 'b'])))
      s = dispatch(s, spawnAt('B', { ...ghoul, health: 5 }, 'b'))
      const enemy = Object.values(s.enemies)[0]!
      s = dispatch(
        s,
        begin(
          kind === 'fight'
            ? { type: 'fight', enemy: enemy.id }
            : { type: 'evade', enemy: enemy.id },
          'b',
        ),
      )
      expect(canCommitFrom(s, 'a', '10116')).toBe(true)
      expect(canCommitFrom(patch({ location: 'C' })(s), 'a', '10116')).toBe(true)
      expect(
        canCommitFrom({ ...s, skillTest: { ...s.skillTest!, tags: ['peril'] } }, 'a', '10116'),
      ).toBe(false)
      s = choose(s, 'choice.commitFrom', { card: 'Long Shot' })
      expect(skillTestValue(s).icons).toBe(0)
      s = resolveTest(s)
      expect(s.enemies[enemy.id]?.damageTaken).toBe(kind === 'fight' ? 2 : 1)
      expect(me(s).discard).toContain('10116')
    },
  )
  it('rejects unrelated tests and does not deal damage on failure', () => {
    let s = patch({ hand: ['10116'] })(bare())
    s = dispatch(s, spawnAt('A', { ...ghoul, health: 5 }, 'a'))
    const enemy = Object.values(s.enemies)[0]!
    s = dispatch({ ...s, chaosBag: ['autoFail'] }, begin({ type: 'evade', enemy: enemy.id }))
    s = resolveTest(choose(s, 'choice.commit', { card: 'Long Shot' }))
    expect(s.enemies[enemy.id]?.damageTaken).toBe(0)
    const unrelated = dispatch(patch({ hand: ['10116'] })(bare()), begin())
    expect(canCommitFrom(unrelated, 'a', '10116')).toBe(false)
  })
})

registerPlayerCards([
  {
    code: 'dilemma-test-weakness',
    name: 'Dilemma test weakness',
    type: 'treachery',
    class: 'neutral',
    traits: [],
    weakness: 'basicweakness',
  },
])
registerTreachery({
  code: 'dilemma-test-weakness',
  revelation: (_s, investigator) => [
    { type: 'DiscardCardsOfType', investigator, cardType: 'event', all: true },
  ],
})
// RR Revelation, Max, As If; FAQ 2.25 Revelation Ability Priority.
describe('At a Crossroads', () => {
  it('draws three immediately and loses one action only on the next actual turn', () => {
    let s = patch({ hand: [], deck: ['09109', '01048', '10116', '08105'] })(bare())
    const actions = me(s).actionsRemaining
    s = dispatch(s, { type: 'DrawCards', investigator: 'a', amount: 1 })
    expect(me(s).hand).not.toContain('09109')
    s = choose(s, 'choice.crossroadsCards', { name: 'A' })
    expect(me(s).hand).toEqual(['01048', '10116', '08105'])
    expect(me(s).actionsRemaining).toBe(actions)
    expect(me(s).discard).toContain('09109')
    s = dispatch(s, { type: 'BeginTurn', investigator: 'a' })
    expect(me(s).actionsRemaining).toBe(2)
    expect(me(s).nextTurnActionLoss).toBe(0)
  })
  it('takes exactly one action for another investigator then restores the original turn before discarding', () => {
    let s = patch({ hand: ['01048'] }, 'b')(patch({ hand: [], deck: ['09109'] })(bare(['a', 'b'])))
    const before = s.investigators[1]!
    s = dispatch(s, { type: 'DrawCards', investigator: 'a', amount: 1 })
    s = choose(s, 'choice.crossroadsAction', { name: 'B' })
    expect(s.activeTurn).toBe('b')
    expect(options(s)).not.toContain('action.playFast')
    s = choose(s, 'action.resource')
    expect(s.activeTurn).toBe('a')
    expect(s.investigators[1]).toMatchObject({
      actionsRemaining: before.actionsRemaining,
      resources: before.resources + 1,
      hand: [],
      discard: ['01048'],
    })
    expect(s.immediateActions).toBeUndefined()
    expect(me(s).discard).toContain('09109')
  })
  it('resolves a weakness first in a multi-card draw and ignores a third Dilemma across all investigators', () => {
    let s = patch({ hand: [], deck: ['09109', 'dilemma-test-weakness'], discard: [] })(bare())
    s = dispatch(s, { type: 'DrawCards', investigator: 'a', amount: 2 })
    expect(s.pending).toBeNull()
    expect(me(s).discard).toContain('09109')
    expect(s.dilemmasResolved).toBeUndefined()
    s = patch({ deck: ['09109'], hand: [] })(s)
    s = dispatch(
      { ...s, dilemmasResolved: { round: s.round, count: 2 } },
      { type: 'DrawCards', investigator: 'a', amount: 1 },
    )
    expect(s.pending).toBeNull()
    expect(me(s).hand).toEqual([])
    expect(me(s).nextTurnActionLoss).toBeUndefined()
  })
})
