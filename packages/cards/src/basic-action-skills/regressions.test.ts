// RR: Skill Test Results (ST.7), Discover Clues, Defeat, Automatic Evasion.
import { dispatch, registerPlayerCard } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { patch, withAsset } from '../dunwich-pilot/testing'
import { open } from './testing'

registerPlayerCard({
  code: 'basic-clue-observer',
  forced: (_s, t, a) =>
    t.type === 'afterDiscoverClues'
      ? [{ type: 'GainResources', investigator: a.owner, amount: 1 }]
      : [],
})

it('discovers Sharp Vision clues in a single discovery event', () => {
  let s = withAsset(patch({ resources: 0 })(open('06204')), 'basic-clue-observer')
  s = choose(s, 'choice.commit')
  expect(s.investigators[0]!.clues).toBe(2)
  expect(s.investigators[0]!.resources).toBe(1)
})

it('does not discover bonus clues when the investigation result replaces discovery', () => {
  let s = open('06204')
  const t = s.skillTest!
  if (t.kind.type !== 'investigate') throw new Error('Expected investigation')
  s = { ...s, skillTest: { ...t, kind: { ...t.kind, replaceClue: true } } }
  s = choose(s, 'choice.commit')
  expect(s.locations.A!.clues).toBe(10)
})

it('includes Brute Force damage before defeat continuations', () => {
  let s = open('06166')
  const [id] = Object.keys(s.enemies)
  const t = s.skillTest!
  if (t.kind.type !== 'fight') throw new Error('Expected fight')
  s = {
    ...patch({ resources: 0 })(s),
    enemies: { ...s.enemies, [id!]: { ...s.enemies[id!]!, health: 3, maxHealth: 3 } },
    skillTest: {
      ...t,
      kind: { ...t.kind, onDefeat: [{ type: 'GainResources', investigator: 'a', amount: 1 }] },
    },
  }
  s = choose(s, 'choice.commit')
  expect(s.enemies[id!]).toBeUndefined()
  expect(s.investigators[0]!.resources).toBe(1)
})

it('does not add Brute Force damage to a failed attack against another investigator', () => {
  let s = open('06166', 'a', 99)
  const [id] = Object.keys(s.enemies)
  s = { ...s, enemies: { ...s.enemies, [id!]: { ...s.enemies[id!]!, engagedWith: 'b' } } }
  s = choose(s, 'choice.commit')
  expect(s.investigators[1]!.damage).toBe(1)
})

it('lets the committer decline Expeditious Retreat without a second evasion', () => {
  let s = choose(open('06246', 'b'), 'choice.commitFrom')
  expect(s.pending!.investigator).toBe('b')
  s = choose(s, 'choice.skip')
  expect(Object.values(s.enemies)[0]!.exhausted).toBe(true)
  expect(Object.values(s.enemies)[1]!.exhausted).toBe(false)
})

it('discards its basic-action identity before a later unrelated test', () => {
  const s = choose(open('06204'), 'choice.commit')
  const next = dispatch(
    { ...patch({ hand: ['06204'] })(s), pending: null, queue: [] },
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'investigate', location: 'A' },
    },
  )
  expect(next.skillTest!.basicAction).toBeUndefined()
})
