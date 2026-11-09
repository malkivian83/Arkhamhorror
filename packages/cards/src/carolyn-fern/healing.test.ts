// RR: Triggered Abilities, Healing, Limit 1 per investigator, Controller of an effect.
import { limitTitleReached, playerCardBehavior, type Message } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { C, game, me, patch, put, run } from './testing'

describe('Private Practice', () => {
  it('after you heal 1 or more horror, exhausts to gain 1 resource', () => {
    let s = put(patch(game(), { horror: 2 }), '60257')
    const resources = me(s).resources
    s = run(s, { type: 'Heal', investigator: C, damage: 0, horror: 1, healer: C })
    s = choose(s, 'ability.privatePractice')
    expect(me(s).resources).toBe(resources + 1)
    expect(s.assets['60257']!.exhausted).toBe(true)
    s = run(s, { type: 'Heal', investigator: C, damage: 0, horror: 1, healer: C })
    expect(labels(s)).not.toContain('ability.privatePractice')
  })

  it('also counts horror healed from assets, but not damage or heals by others', () => {
    const s = put(put(game(true), '60257'), '60258', { horror: 1 })
    expect(
      labels(run(s, { type: 'HealAsset', asset: '60258', damage: 0, horror: 1, healer: C })),
    ).toContain('ability.privatePractice')
    const hurt = patch(patch(s, { damage: 2 }), { horror: 2 }, 'b')
    expect(
      labels(run(hurt, { type: 'Heal', investigator: C, damage: 2, horror: 0, healer: C })),
    ).not.toContain('ability.privatePractice')
    expect(
      labels(run(hurt, { type: 'Heal', investigator: 'b', damage: 0, horror: 1, healer: 'b' })),
    ).not.toContain('ability.privatePractice')
  })

  it('is limited to 1 per investigator', () => {
    const s = game()
    expect(limitTitleReached(s, C, '60257')).toBe(false)
    expect(limitTitleReached(put(s, '60257'), C, '60257')).toBe(true)
  })
})

describe('horror healing hook', () => {
  it('fires for heals from asset fast abilities without an explicit healer (Occult Records)', () => {
    let s = put(patch(patch(game(true), { horror: 2 }), { horror: 2 }, 'b'), '60257')
    s = put(s, '60256')
    const option = playerCardBehavior('60256')!.fastOptions!(s, s.assets['60256']!).find(
      (o) => o.params?.name === 'B',
    )!
    const ability: Message = {
      type: 'UseAbility',
      investigator: C,
      key: option.key,
      actions: 0,
      provokes: false,
      then: option.then,
    }
    s = run(s, ability)
    expect(me(s, 'b').horror).toBe(0)
    expect(labels(s)).toEqual(
      expect.arrayContaining(['ability.carolynClue', 'ability.privatePractice']),
    )
  })

  it('fires for events played by Carolyn (Psychoanalysis level 3 heals each investigator here)', () => {
    let s = patch(patch(game(true), { horror: 3, hand: ['60278'] }), { horror: 3 }, 'b')
    s = put(s, '60257')
    s = run(s, { type: 'PlayCard', investigator: C, code: '60278' })
    for (let n = 0; n < 30 && s.pending && !labels(s).includes('ability.privatePractice'); n++)
      s = choose(s, labels(s)[0]!)
    expect(labels(s)).toContain('ability.privatePractice')
  })
})
