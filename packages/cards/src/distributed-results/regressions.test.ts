// RR: Uses, Automatic Evasion, Optional Abilities, Initiation Sequence.
import { dispatch, type Choice } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { patch } from '../dunwich-pilot/testing'
import { effect, fixture } from './testing'

const targetId = (c: Choice) => (c.target && 'id' in c.target ? c.target.id : undefined)

describe('distributed result choices', () => {
  it('distributes three tokens between charges and secrets, retaining its budget through JSON', () => {
    let s = effect(fixture(), '11077')
    expect(s.pending!.question.choices.map((c) => targetId(c))).not.toContain('remote')
    const first = s.pending!.question.choices.find((c) => targetId(c) === 'charge')!
    s = dispatch({ ...s, pending: null }, ...first.then)
    s = JSON.parse(JSON.stringify(s)) as typeof s
    const second = s.pending!.question.choices.find((c) => targetId(c) === 'secret')!
    s = dispatch({ ...s, pending: null }, ...second.then)
    const third = s.pending!.question.choices.find((c) => targetId(c) === 'secret')!
    s = dispatch({ ...s, pending: null }, ...third.then)
    expect(s.assets.charge!.uses).toBe(1)
    expect(s.assets.secret!.uses).toBe(2)
    expect(s.assets.remote!.uses).toBe(0)
    expect(s.pending).toBeNull()
  })
  it('can stop after placing a single token', () => {
    let s = effect(fixture(), '11077')
    const first = s.pending!.question.choices.find((c) => targetId(c) === 'charge')!
    s = dispatch({ ...s, pending: null }, ...first.then)
    s = choose(s, 'choice.skip')
    expect(s.assets.charge!.uses).toBe(1)
    expect(s.pending).toBeNull()
  })
  it('recomputes eligible owners after movement and excludes eliminated owners', () => {
    let s = effect(fixture(), '11077')
    const first = s.pending!.question.choices.find((c) => targetId(c) === 'charge')!
    s = patch({ location: 'B' }, 'b')(patch({ eliminated: true }, 'a')(s))
    s = dispatch({ ...s, pending: null }, ...first.then)
    expect(s.pending).toBeNull()
  })
  it('finishes without eligible assets or a location', () => {
    const s = fixture()
    expect(effect({ ...s, assets: {} }, '11077').pending).toBeNull()
    expect(effect(patch({ location: null })(s), '11077').pending).toBeNull()
  })
  it('excludes the original evasion target and enemies elsewhere', () => {
    let s = fixture()
    const [original, other] = Object.keys(s.enemies)
    s = {
      ...s,
      enemies: { ...s.enemies, remote: { ...s.enemies[other!]!, id: 'remote', location: 'B' } },
    }
    s = dispatch(
      { ...s, pending: null, queue: [] },
      {
        type: 'PlayerCardEffect',
        code: '10076',
        investigator: 'a',
        step: 'evade',
        data: { enemy: original! },
      },
    )
    expect(s.pending!.question.choices.filter((c) => c.target).map((c) => targetId(c))).toEqual([
      other,
    ])
  })
})
