// RR: Fight, Evade, Discard Pile, Complete Resolution, Automatic Failure.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playableCards,
  type GameState,
  type Enemy,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = (code: string, discard = false) =>
  patch({
    hand: discard ? [] : [code],
    discard: discard ? [code] : [],
    deck: ['01088', '01089'],
    resources: 10,
    skills: { willpower: 5, intellect: 5, combat: 5, agility: 5 },
  })({ ...clear(game(['a', 'b'])), chaosBag: [0] })
const foe = (s: GameState, id = 'foe', extra: Partial<Enemy> = {}): GameState => ({
  ...s,
  enemies: {
    ...s.enemies,
    [id]: {
      ...ghoul,
      id,
      location: 'A',
      engagedWith: 'a',
      exhausted: false,
      maxHealth: 10,
      health: 10,
      damageTaken: 0,
      ...extra,
    },
  },
})
const play = (s: GameState, code: string, fromDiscard = false) =>
  dispatch(clear(s), {
    type: 'PlayCard',
    investigator: 'a',
    code,
    ...(fromDiscard ? { from: 'discard' as const } : {}),
  })
const target = (s: GameState) => choose(s, 'choice.improvisedEnemy', { enemy: 'Ghoul' })
const count = (cards: string[], code: string) => cards.filter((c) => c === code).length
it.each(['04033', '11092'])(
  '%s reduces the enemy difficulty rather than boosting combat, with the correct discard damage',
  (code) => {
    for (const fromDiscard of [false, true]) {
      const s = foe(start(code, fromDiscard))
      const options = playerCardBehavior(code)!.play!(s, 'a', undefined, fromDiscard)
      const ask = options.find((m) => m.type === 'Ask')!
      if (ask.type !== 'Ask') throw Error('Expected enemy choice')
      expect(ask.question.choices[0]!.then[0]).toMatchObject({
        type: 'BeginSkillTest',
        skill: 'combat',
        difficulty: code === '11092' ? 0 : 1,
        kind: { type: 'fight', ...(fromDiscard ? { extraDamage: 1 } : {}) },
      })
      const result = target(play(s, code, fromDiscard))
      expect(result.enemies.foe!.damageTaken).toBe(fromDiscard ? 2 : 1)
      expect(me(result).resources).toBe(9)
      expect(count(me(result).deck, code) + count(me(result).hand, code)).toBe(fromDiscard ? 1 : 0)
      expect(count(me(result).discard, code)).toBe(fromDiscard ? 0 : 1)
      expect(me(result).hand).toHaveLength(code === '11092' && fromDiscard ? 1 : 0)
    }
  },
)
it.each(['04033', '11092'])(
  '%s returns after failure too; only its upgrade draws from discard',
  (code) => {
    const s = target(play({ ...foe(start(code, true)), chaosBag: ['autoFail'] }, code, true))
    expect(s.enemies.foe!.damageTaken).toBe(0)
    expect(count([...me(s).deck, ...me(s).hand], code)).toBe(1)
    expect(me(s).discard).not.toContain(code)
    expect(me(s).hand).toHaveLength(code === '11092' ? 1 : 0)
  },
)
it.each(['04033', '11092', '04312'])(
  '%s preserves earlier discard copies when Wendy sends the resolving event to deck bottom',
  (code) => {
    const initial = withAsset(
      foe(patch({ discard: [code, code], hand: [] })(start(code, true))),
      '01014',
    )
    let s = target(play(initial, code, true))
    if (code === '04312') s = choose(s, 'choice.skip')
    expect(count(me(s).discard, code)).toBe(1)
    expect(count([...me(s).deck, ...me(s).hand], code)).toBe(1)
    expect([...me(s).deck, ...me(s).hand, ...me(s).discard].filter((c) => c === code)).toHaveLength(
      2,
    )
  },
)
it('Improvised Weapon 2 finishes the attack before shuffling and drawing', () => {
  const initial = foe(start('11092', true))
  const p = play(initial, '11092', true)
  expect(me(p).discard).toContain('11092')
  expect(me(p).hand).toEqual([])
  expect(me(p).deck).toEqual(initial.investigators[0]!.deck)
  const s = target(p)
  expect(s.enemies.foe!.damageTaken).toBe(2)
  expect(me(s).hand).toHaveLength(1)
})
it('Impromptu Barrier from hand only evades the chosen engaged enemy and stays discarded', () => {
  let s = foe(foe(start('04312'), 'other', { engagedWith: 'b', name: 'Other' }))
  s = target(play(s, '04312'))
  expect(s.enemies.foe).toMatchObject({ exhausted: true, engagedWith: null })
  expect(s.enemies.other).toMatchObject({ exhausted: false, engagedWith: 'b' })
  expect(me(s).discard).toContain('04312')
})
it('Impromptu Barrier can additionally evade an aloof enemy engaged with another investigator, within the success margin', () => {
  let s = foe(
    foe(
      foe(start('04312', true), 'other', {
        engagedWith: 'b',
        name: 'Other',
        evade: 4,
        keywords: ['aloof'],
      }),
      'too-high',
      { name: 'Too high', evade: 5 },
    ),
  )
  s = target(play(s, '04312', true))
  expect(me(s).discard).toContain('04312')
  expect(s.pending!.question.choices.map((c) => c.params?.enemy)).toContain('Other')
  expect(s.pending!.question.choices.map((c) => c.params?.enemy)).not.toContain('Too high')
  s = choose(s, 'choice.improvisedExtra', { enemy: 'Other' })
  expect(s.enemies.other).toMatchObject({ exhausted: true, engagedWith: null })
  expect(me(s).discard).not.toContain('04312')
  expect(me(s).deck).toContain('04312')
})
it('Barrier offers no extra evasion after a failed test and still shuffles', () => {
  let s = {
    ...foe(foe(start('04312', true), 'other', { name: 'Other' })),
    chaosBag: ['autoFail'],
  } as GameState
  s = target(play(s, '04312', true))
  expect(s.enemies.foe!.exhausted).toBe(false)
  expect(s.enemies.other!.exhausted).toBe(false)
  expect(me(s).deck).toContain('04312')
})
it.each(['04033', '11092', '04312'])(
  '%s requires a legal first target and is available from discard',
  (code) => {
    const s = start(code, true)
    expect(playerCardBehavior(code)!.canPlay!(s, 'a')).toBe(false)
    expect(playableCards(foe(s), 'a', false)).toContain(code)
    if (code === '04312')
      expect(playerCardBehavior(code)!.canPlay!(foe(s, 'foe', { engagedWith: 'b' }), 'a')).toBe(
        false,
      )
    else
      expect(
        playerCardBehavior(code)!.canPlay!(
          foe(s, 'foe', { keywords: ['aloof'], engagedWith: null }),
          'a',
        ),
      ).toBe(false)
  },
)
it('ShufflePlayedEvent never creates a copy when its resolving source is gone', () => {
  const initial = start('04033')
  for (const fromBottom of [false, true]) {
    const s = dispatch(initial, {
      type: 'ShufflePlayedEvent',
      investigator: 'a',
      code: '04033',
      fromBottom,
    })
    expect(s).toEqual(initial)
  }
})
it('ShufflePlayedEvent retains its original Wendy disposition even if the amulet has since left play', () => {
  let s = patch({ discard: ['04033'], deck: ['01088', '04033'] })(start('04033'))
  s = dispatch(s, {
    type: 'ShufflePlayedEvent',
    investigator: 'a',
    code: '04033',
    fromBottom: true,
  })
  expect(me(s).discard).toEqual(['04033'])
  expect(me(s).deck.slice().sort()).toEqual(['01088', '04033'].sort())
})
