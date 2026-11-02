// RR: Search, Equipment Slots, Play, Put into Play, Reaction Opportunities, Opening Hand.
import { expect, it } from 'vitest'
import { dispatch, playerCardBehavior, playerCardDef, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import { holding, put, owned, discard } from '../restricted-slots/testing'
import './index'
const start = (hand: string[] = [], deck: string[] = []) =>
  patch({ hand, deck, discard: [], resources: 10 })({ ...game(), pending: null, queue: [] })
const title = (code: string) => playerCardDef(code)!.name
const take = (s: GameState, code: string) => choose(s, 'choice.takeCard', { card: title(code) })
it.each(['05283', '60260', '60181'])(
  '%s reacts only to its own entry or played instance and permits declining the search',
  (code) => {
    const s = withAsset(start(), code),
      a = s.assets[code]!,
      b = playerCardBehavior(code)!
    const right = code === '60181' ? 'afterPlayAsset' : 'afterAssetEntersPlay'
    const t = { type: right, investigator: 'a', code, asset: a.id } as const
    expect(b.reactions!(s, t, a)).toHaveLength(1)
    expect(b.reactions!(s, { ...t, asset: 'other' }, a)).toEqual([])
    expect(b.reactions!(s, { ...t, investigator: 'b' }, a)).toEqual([])
    expect(
      b.reactions!(
        s,
        { ...t, type: right === 'afterPlayAsset' ? 'afterAssetEntersPlay' : 'afterPlayAsset' },
        a,
      ),
    ).toEqual([])
  },
)
it('Archivist searches the top six for a Tome asset when put into play, without drawing it', () => {
  let s = withAsset(
    start(['60260', '01031'], ['01031', ...Array(5).fill('01088'), '01032']),
    '06159',
  )
  s = dispatch(s, { type: 'PutAssetIntoPlay', investigator: 'a', code: '60260', fromHand: true })
  s = choose(s, 'choice.slotSearch')
  expect(
    s
      .pending!.question.choices.filter((c) => c.label === 'choice.takeCard')
      .map((c) => c.params?.card),
  ).toEqual([title('01031')])
  s = take(s, '01031')
  expect(me(s).hand).toEqual(['01031', '01031'])
  expect(me(s).deck).toHaveLength(6)
  expect(s.assets['06159']!.exhausted).toBe(false)
})
it('Vest reacts to playing, not putting into play, and searches nine for Firearms or Upgrade events', () => {
  let s = start(['60181'], ['04020', ...Array(8).fill('01088'), '01016'])
  const placed = dispatch(s, {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code: '60181',
    fromHand: true,
  })
  expect(placed.pending).toBeNull()
  s = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '60181' })
  s = choose(s, 'choice.slotSearch')
  expect(
    s
      .pending!.question.choices.filter((c) => c.label === 'choice.takeCard')
      .map((c) => c.params?.card),
  ).toEqual([title('04020')])
  s = take(s, '04020')
  expect(me(s).hand).toEqual(['04020'])
  expect(me(s).resources).toBe(7)
})
it('Anna can enter from her opening hand without paying and put a Tarot from anywhere in her deck into play for free', () => {
  let s = patch({ resources: 0 })(start(['05283'], [...Array(10).fill('01088'), '05023']))
  const b = playerCardBehavior('05283')!,
    o = b.openingHandReactions!(s, 'a', me(s).hand)[0]!
  s = dispatch(s, ...o.then)
  expect(me(s).resources).toBe(0)
  expect(me(s).hand).toEqual([])
  expect(Object.values(s.assets).some((a) => a.code === '05283')).toBe(true)
  expect(b.openingHandReactions!(s, 'a', ['05283'])).toEqual([])
  s = choose(s, 'choice.slotSearch')
  s = take(s, '05023')
  expect(Object.values(s.assets).some((a) => a.code === '05023')).toBe(true)
  expect(me(s).resources).toBe(0)
  expect(me(s).hand).toEqual([])
  expect(me(s).deck).not.toContain('05023')
  expect(b.openingHandReactions!(s, 'a', [])).toEqual([])
})
it('an optional search can decline a match and still shuffles, or finish without matches', () => {
  let s = withAsset(start([], ['01031', '01088', '01089']), '60260')
  const b = playerCardBehavior('60260')!,
    a = s.assets['60260']!,
    t = { type: 'afterAssetEntersPlay' as const, investigator: 'a', asset: a.id }
  s = dispatch(s, ...b.reactions!(s, t, a)[0]!.then)
  const before = s.rng
  s = choose(s, 'choice.skip')
  expect(me(s).hand).toEqual([])
  expect(me(s).deck.slice().sort()).toEqual(['01031', '01088', '01089'].sort())
  expect(s.rng).not.toEqual(before)
  const noMatch = dispatch(start([], ['01088']), {
    type: 'SearchDeck',
    investigator: 'a',
    traits: ['Tarot'],
    to: 'put',
    optional: true,
  })
  expect(noMatch.pending).toBeNull()
  expect(me(noMatch).deck).toEqual(['01088'])
})
it.each([
  ['60260', '01031'],
  ['60181', '01016'],
])('%s grants a third hand only for the printed trait', (support, allowed) => {
  let s = put(holding(support, '01020', '01020'), allowed)
  expect(s.pending).toBeNull()
  expect(owned(s)).toContain(allowed)
  s = put(holding(support, '01020', '01020'), '01020')
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
})
it('Anna supports three Tarot slots and losing her requires resolving excess slots', () => {
  let s = put(holding('05283', '05023', '05027'), '05035')
  expect(s.pending).toBeNull()
  expect(owned(s)).toEqual(['05023', '05027', '05035', '05283'])
  const anna = Object.values(s.assets).find((a) => a.code === '05283')!
  s = discard(s, anna.id)
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
})
