import './index'
import {
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  registerPlayerCards,
  type Message,
} from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

// Synthetic cards isolate search semantics without approving unsupported Upgrade events.
registerPlayerCards([
  {
    code: 'vest-upgrade',
    name: 'Test Upgrade',
    type: 'event',
    class: 'neutral',
    traits: ['Upgrade'],
    cost: 0,
    icons: {},
  },
  {
    code: 'vest-gun',
    name: 'Test Firearm',
    type: 'asset',
    class: 'neutral',
    traits: ['Firearm'],
    cost: 0,
    icons: {},
  },
  {
    code: 'vest-other',
    name: 'Test Item',
    type: 'asset',
    class: 'neutral',
    traits: ['Item'],
    cost: 0,
    icons: {},
  },
  {
    code: 'vest-late',
    name: 'Late Upgrade',
    type: 'event',
    class: 'neutral',
    traits: ['Upgrade'],
    cost: 0,
    icons: {},
  },
])
registerPlayerCard({
  code: 'vest-draw-observer',
  forced: (_s, trigger) =>
    trigger.type === 'afterDrawCard'
      ? [{ type: 'GainResources', investigator: trigger.investigator, amount: 10 }]
      : [],
})
const deck = [
  'vest-upgrade',
  'vest-gun',
  'vest-other',
  'vest-upgrade',
  'vest-other',
  'vest-other',
  'vest-late',
]
const play = () =>
  choose(during(game(), patch({ hand: ['60159'], deck, resources: 5 })), 'action.play', {
    card: 'Protective Vest',
  })
const search: Message = {
  type: 'SearchDeck',
  investigator: 'a',
  top: 6,
  traits: ['Firearm', 'Upgrade'],
  to: 'hand',
  anyType: true,
  optional: true,
}

// RR: Play, Reaction Opportunities, Search, Draw, Damage and Equipment Slots.
describe('Protective Vest (0)', () => {
  it('pays for the body asset and optionally searches only six cards, deduplicating matches', () => {
    let s = play()
    expect(me(s).resources).toBe(2)
    expect(me(s).actionsRemaining).toBe(2)
    expect(playerCardDef('60159')).toMatchObject({ slots: ['body'], health: 2 })
    expect(Object.values(s.assets).map((a) => a.code)).toContain('60159')
    s = choose(s, 'ability.searchTop')
    expect(s.pending!.question.choices.map((c) => c.params?.card)).toEqual([
      'Test Upgrade',
      'Test Firearm',
      undefined,
    ])
    const rng = s.rng
    s = choose(s, 'choice.takeCard', { card: 'Test Upgrade' })
    expect(me(s).hand).toEqual(['vest-upgrade'])
    expect(me(s).deck.filter((c) => c === 'vest-upgrade')).toHaveLength(1)
    expect(me(s).deck).toHaveLength(6)
    expect(me(s).deck).toContain('vest-late')
    expect(s.rng).not.toEqual(rng)
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  })
  it('may decline the reaction without searching or shuffling', () => {
    let s = play()
    const rng = s.rng
    s = choose(s, 'choice.skip')
    expect(me(s).deck).toEqual(deck)
    expect(s.rng).toEqual(rng)
  })
  it('may fail to find even with matches, shuffling without taking a card', () => {
    let s = choose(play(), 'ability.searchTop')
    const rng = s.rng
    s = choose(s, 'choice.skip')
    expect(me(s).hand).toEqual([])
    expect([...me(s).deck].sort()).toEqual([...deck].sort())
    expect(s.rng).not.toEqual(rng)
  })
  it('shuffles when no eligible card is found', () => {
    const base = during(game(), patch({ deck: ['vest-other', 'vest-other', 'vest-other'] }))
    const s = during(base, (x) => x, search)
    expect(s.rng).not.toEqual(base.rng)
    expect(me(s).hand).toEqual(me(base).hand)
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  })
  it('adds rather than draws the selected event', () => {
    let s = during(game(), (s) => withAsset(patch({ deck })(s), 'vest-draw-observer'), search)
    s = choose(s, 'choice.takeCard', { card: 'Test Upgrade' })
    expect(me(s).resources).toBe(5)
  })
  it('does not react to another copy, another investigator, or being put directly into play', () => {
    const s = withAsset(game(), '60159'),
      self = s.assets['60159']!
    const reactions = playerCardBehavior('60159')!.reactions!
    expect(
      reactions(
        s,
        { type: 'afterPlayAsset', investigator: 'a', code: '60159', asset: 'another-copy' },
        self,
      ),
    ).toEqual([])
    expect(
      reactions(
        s,
        { type: 'afterPlayAsset', investigator: 'b', code: '60159', asset: self.id },
        self,
      ),
    ).toEqual([])
    const placed = during(game(), (x) => x, {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: '60159',
    })
    expect(placed.pending?.question.prompt).toBe('prompt.chooseAction')
  })
  it('replaces an occupied body slot before opening the correct reaction', () => {
    const s = choose(
      during(game(), (s) => withAsset(patch({ hand: ['60159'], deck })(s), '60159')),
      'action.play',
      { card: 'Protective Vest' },
    )
    expect(Object.values(s.assets).filter((a) => a.code === '60159')).toHaveLength(1)
    expect(me(s).discard).toContain('60159')
    expect(s.pending?.question.prompt).toBe('prompt.reaction')
    expect(s.pending!.question.choices.filter((c) => c.label === 'ability.searchTop')).toHaveLength(
      1,
    )
  })
  it('is defeated after absorbing two damage', () => {
    const s = during(game(), (s) => withAsset(s, '60159'), {
      type: 'DamageAsset',
      asset: '60159',
      damage: 2,
      horror: 0,
    })
    expect(s.assets['60159']).toBeUndefined()
    expect(me(s).discard).toContain('60159')
    expect(me(s).damage).toBe(0)
  })
  it('keeps existing searches asset-only and prevents putting Upgrade events into play', () => {
    for (const options of [{ anyType: false }, { to: 'play' as const }]) {
      const s = during(game(), patch({ deck }), { ...search, ...options })
      expect(s.pending!.question.choices.map((c) => c.params?.card)).toEqual([
        'Test Firearm',
        undefined,
      ])
    }
  })
})
