import './index'
import {
  playerCardBehavior,
  treacheryBehavior,
  assetVitals,
  dispatch,
  playableCards,
  registerPlayerCards,
} from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
registerPlayerCards([
  {
    code: 'upgrade-ally',
    name: 'Test Ally',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally'],
    icons: {},
    health: 2,
    sanity: 2,
  },
  {
    code: 'upgrade-dash',
    name: 'Dash Ally',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally'],
    icons: {},
    health: 2,
  },
])
const prepared = () =>
  during(game(['a', 'b']), (s) => withAsset(patch({ hand: ['04019', '04019'] })(s), 'upgrade-ally'))
const play = (s = prepared()) => choose(s, 'action.playFast', { card: 'Trusted' })
// RR: Fast, Play Restrictions, Attach To, Modifiers, Damage/Horror and Leaves Play.
describe('Trusted', () => {
  it('attaches a paid fast event and stacks two copies without occupying slots', () => {
    let s = play()
    expect(me(s).resources).toBe(4)
    expect(me(s).actionsRemaining).toBe(3)
    expect(me(s).discard).not.toContain('04019')
    expect(assetVitals(s.assets['upgrade-ally']!)).toEqual({ health: 3, sanity: 3 })
    s = play(s)
    expect(assetVitals(s.assets['upgrade-ally']!)).toEqual({ health: 4, sanity: 4 })
    expect(Object.keys(s.assets)).toHaveLength(1)
    expect(s.assets['upgrade-ally']!.upgrades).toHaveLength(2)
  })
  it('requires your turn and your own Ally, and asks when two are eligible', () => {
    const base = prepared()
    expect(playableCards({ ...base, activeTurn: 'b' }, 'a', true)).not.toContain('04019')
    expect(playableCards({ ...base, assets: {} }, 'a', true)).not.toContain('04019')
    const foreign = withAsset(base, 'upgrade-ally', { owner: 'b' })
    expect(playableCards(foreign, 'a', true)).not.toContain('04019')
    const s = play(
      during(game(['a', 'b']), (s) =>
        withAsset(withAsset(patch({ hand: ['04019'] })(s), 'upgrade-ally'), 'upgrade-dash'),
      ),
    )
    expect(s.pending!.question.choices).toHaveLength(2)
  })
  it.each(['damage', 'horror'] as const)(
    'uses modified capacity when assigning %s and when checking defeat',
    (kind) => {
      let s = play()
      s = during(s, (x) => x, {
        type: 'DamageAsset',
        asset: 'upgrade-ally',
        damage: kind === 'damage' ? 2 : 0,
        horror: kind === 'horror' ? 2 : 0,
      })
      expect(s.assets['upgrade-ally']).toBeDefined()
      s = during(s, (x) => x, {
        type: 'AssignDamage',
        investigator: 'a',
        damage: kind === 'damage' ? 1 : 0,
        horror: kind === 'horror' ? 1 : 0,
      })
      s = choose(s, 'choice.assignToAsset', { card: 'Test Ally' })
      expect(s.assets['upgrade-ally']).toBeUndefined()
      expect(me(s).discard).toEqual(expect.arrayContaining(['upgrade-ally', '04019']))
      expect(me(s)[kind]).toBe(0)
    },
  )
  it('does not turn a printed dash into sanity', () => {
    const s = play(
      during(game(['a', 'b']), (s) => withAsset(patch({ hand: ['04019'] })(s), 'upgrade-dash')),
    )
    expect(assetVitals(s.assets['upgrade-dash']!)).toEqual({ health: 3 })
  })
  it.each(['DiscardAsset', 'ReturnAssetToHand'] as const)(
    'discards upgrades when the host leaves via %s, surviving serialization',
    (type) => {
      const s = during(JSON.parse(JSON.stringify(play())), (x) => x, {
        type,
        asset: 'upgrade-ally',
      })
      expect(me(s).discard.filter((c) => c === '04019')).toHaveLength(1)
      expect(s.assets['upgrade-ally']).toBeUndefined()
      if (type === 'ReturnAssetToHand') expect(me(s).hand).toContain('upgrade-ally')
    },
  )
  it('discards to the original event owner after control changes', () => {
    let s = play()
    s = during(
      s,
      (s) => ({
        ...s,
        assets: { ...s.assets, 'upgrade-ally': { ...s.assets['upgrade-ally']!, owner: 'b' } },
      }),
      { type: 'DiscardAsset', asset: 'upgrade-ally' },
    )
    expect(me(s).discard).toContain('04019')
  })
  it('removes attached events when the controller is eliminated', () => {
    const s = play()
    const ended = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'EliminateInvestigator', investigator: 'a' },
    )
    expect(Object.values(ended.assets)).toHaveLength(0)
    expect(me(ended).discard).toEqual([])
  })
})

it('offers Trusted capacity to Lucky Charm and Mark of Elokoss', () => {
  const attached = play()
  const s = withAsset(
    patch({ damage: 1 })({
      ...attached,
      assets: {
        ...attached.assets,
        'upgrade-ally': { ...attached.assets['upgrade-ally']!, damage: 2 },
      },
    }),
    '12061',
    { uses: 1 },
  )
  const options = playerCardBehavior('12061')!.abilities!(s, s.assets['12061']!, 'a')
  const move = options.find((o) => o.params?.from === 'A' && o.params?.kind === 'damage')!
  const ask = move.then.find((m) => m.type === 'Ask')!
  expect(
    ask.type === 'Ask' && ask.question.choices.some((c) => c.params?.card === 'Test Ally'),
  ).toBe(true)
  const messages = treacheryBehavior('12137')!.forced!(
    s,
    { type: 'turnEnds', investigator: 'a' },
    {
      id: 'mark',
      kind: 'treachery',
      keywords: [],
      code: '12137',
      name: 'Mark',
      placement: { type: 'threatArea', investigator: 'a' },
    },
  )
  expect(JSON.stringify(messages)).toContain('upgrade-ally')
})
