// RR: Triggered Abilities (Reaction, Limits), Healing, Chaos Tokens (elder sign), Controller.
import { investigatorBehavior } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { C, finish, game, me, patch, put, run } from './testing'

const clues = (s: ReturnType<typeof game>) => me(s).clues

describe('Carolyn Fern', () => {
  it('discovers 1 clue after she heals horror from an investigator, once per round', () => {
    let s = patch(game(true), { horror: 3 }, 'b')
    s = run(s, { type: 'Heal', investigator: 'b', damage: 0, horror: 1, healer: C })
    expect(labels(s)).toContain('ability.carolynClue')
    s = finish(choose(s, 'ability.carolynClue'))
    expect(clues(s)).toBe(1)
    s = run(s, { type: 'Heal', investigator: 'b', damage: 0, horror: 1, healer: C })
    expect(labels(s)).not.toContain('ability.carolynClue')
    // A new round resets the limit.
    s = run(
      { ...s, round: s.round + 1 },
      {
        type: 'Heal',
        investigator: 'b',
        damage: 0,
        horror: 1,
        healer: C,
      },
    )
    expect(labels(s)).toContain('ability.carolynClue')
  })

  it('needs an effective heal by her own effect, from an investigator or an Ally asset', () => {
    const base = patch(patch(game(true), { horror: 2 }), { horror: 2 }, 'b')
    // Nothing healed: no trigger.
    expect(
      labels(run(game(true), { type: 'Heal', investigator: 'b', damage: 0, horror: 1, healer: C })),
    ).not.toContain('ability.carolynClue')
    // Another investigator heals.
    expect(
      labels(run(base, { type: 'Heal', investigator: C, damage: 0, horror: 1, healer: 'b' })),
    ).not.toContain('ability.carolynClue')
    // Damage only.
    expect(
      labels(
        run(patch(base, { damage: 2 }), {
          type: 'Heal',
          investigator: C,
          damage: 1,
          horror: 0,
          healer: C,
        }),
      ),
    ).not.toContain('ability.carolynClue')
    // Ally asset (Psychology Student) versus a non-Ally asset with horror (Typewriter-like item).
    const ally = put(base, '60258', { horror: 1 })
    expect(
      labels(run(ally, { type: 'HealAsset', asset: '60258', damage: 0, horror: 1, healer: C })),
    ).toContain('ability.carolynClue')
    const item = put(base, '60255', { horror: 1 })
    expect(
      labels(run(item, { type: 'HealAsset', asset: '60255', damage: 0, horror: 1, healer: C })),
    ).not.toContain('ability.carolynClue')
  })

  it('attributes heals without an explicit healer to the controller of the effect', () => {
    // Psychology Student (another lot) heals without naming a healer.
    let s = patch(patch(game(true), { hand: ['60258'] }), { horror: 2 }, 'b')
    s = run(s, { type: 'PlayCard', investigator: C, code: '60258' })
    s = choose(s, 'ability.healHorrorOf', { name: 'B' })
    expect(me(s, 'b').horror).toBe(0)
    expect(labels(s)).toContain('ability.carolynClue')
    // An effect controlled by another investigator is not "you heal".
    let other = patch(patch(game(true), { horror: 2 }), { hand: ['60258'], resources: 5 }, 'b')
    other = run(other, { type: 'PlayCard', investigator: 'b', code: '60258' })
    other = choose(other, 'ability.healHorrorOf', { name: 'Carolyn' })
    expect(me(other).horror).toBe(0)
    expect(labels(other)).not.toContain('ability.carolynClue')
  })

  it('elder sign: +1 and heals 1 horror from an investigator at her location', () => {
    let s = patch(patch(game(true), { horror: 1 }), { horror: 2 }, 'b')
    const sign = investigatorBehavior(C)!.elderSign!(s, me(s))
    expect(sign.modifier).toBe(1)
    expect(sign.onSuccess).toBeUndefined()
    s = run(s, ...sign.immediate!)
    s = choose(s, 'choice.healHorrorOf', { name: 'B' })
    expect(me(s, 'b').horror).toBe(1)
    expect(labels(s)).toContain('ability.carolynClue')
    // Investigators elsewhere cannot be chosen.
    const away = patch(patch(game(true), { horror: 0 }), { horror: 2, location: 'B' }, 'b')
    expect(run(away, ...sign.immediate!).pending).toBeNull()
  })
})
