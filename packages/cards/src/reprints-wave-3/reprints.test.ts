// RR: Card identity. Each reprint has the same English and Spanish text as a playable printing
// (equivalence fingerprint in approvals.json) and reuses its reviewed behavior under its own code.
import {
  playerCardBehavior,
  type Asset,
  type GameState,
  playerCardDef,
  registerEnemy,
} from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import approvals from './approvals.json'
import en from './source-en.json'
import es from './source-es.json'
import originalsEn from './originals-en.json'
import originalsEs from './originals-es.json'
import '../index'

type Printed = Record<string, unknown> & { code: string }
const find = (list: Printed[], code: string) => list.find((c) => c.code === code)!
const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : (v ?? null))
// Same canonical mechanical fields as scripts/cards-import/equivalence.mjs.
const FIELDS = [
  'name',
  'type_code',
  'faction_code',
  'faction2_code',
  'cost',
  'xp',
  'health',
  'sanity',
  'skill_willpower',
  'skill_intellect',
  'skill_combat',
  'skill_agility',
  'skill_wild',
  'is_unique',
  'permanent',
  'exceptional',
  'myriad',
  'exile',
  'deck_limit',
  'slot',
  'traits',
  'text',
  'restrictions',
  'bonded_count',
  'bonded_to',
]

describe.each(approvals.cards)('$code reprint of $behaviorSource', ({ code, behaviorSource }) => {
  it('has the same printed English and Spanish text and an equivalence fingerprint', () => {
    const target = find(en as Printed[], code),
      source = find(originalsEn as Printed[], behaviorSource)
    for (const field of FIELDS) expect(clean(target[field]), field).toEqual(clean(source[field]))
    const targetEs = find(es as Printed[], code),
      sourceEs = find(originalsEs as Printed[], behaviorSource)
    for (const field of ['name', 'text', 'traits'])
      expect(clean(targetEs[field]), field).toEqual(clean(sourceEs[field]))
    expect(approvals.cards.find((c) => c.code === code)!.equivalenceSha256).toMatch(
      /^[a-f0-9]{64}$/,
    )
  })
  // Subtitles are presentation only (ArkhamDB omits some on the original printing).
  it('keeps the reviewed definition and behavior of the original', () => {
    const { code: _a, subname: _s, ...actual } = playerCardDef(code)!
    const { code: _b, subname: _t, ...source } = playerCardDef(behaviorSource)!
    expect(actual).toEqual(source)
    expect(Object.keys(playerCardBehavior(code)!).sort()).toEqual(
      Object.keys(playerCardBehavior(behaviorSource)!).sort(),
    )
  })
})

it('Dodge (01523) cancels an attack against an investigator at its location', () => {
  registerEnemy({ code: 'reprint-dodge-enemy' })
  let s = during(
    game(),
    patch({ hand: ['01523'], resources: 3 }),
    spawnAt('A', { ...ghoul, code: 'reprint-dodge-enemy' }, 'a'),
  )
  s = during(s, (s) => s, {
    type: 'EnemyAttack',
    enemy: Object.keys(s.enemies)[0]!,
    investigator: 'a',
    exhaustAfter: true,
  })
  s = choose(s, 'ability.playCard', { card: 'Dodge' })
  expect(me(s).damage).toBe(0)
  expect(me(s).discard).toEqual(['01523'])
  expect(me(s).resources).toBe(2)
})

it('Lucky! (01580) turns a failed test into a success from the hand', () => {
  let s = during(game(), patch({ hand: ['01580'], resources: 3 }))
  s = during({ ...s, chaosBag: [0] }, (s) => s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 5,
    kind: { type: 'investigate', location: 'A' },
  })
  s = choose(s, 'ability.playCard', { card: 'Lucky!' })
  expect(me(s).clues).toBe(1)
  expect(me(s).discard).toContain('01580')
})

it('Scrying (01561) costs an action and provokes, like the original', () => {
  const s = withAsset(game(), '01561')
  const option = playerCardBehavior('01561')!.abilities!(s, s.assets['01561']!, 'a')[0]!
  expect(option).toMatchObject({ actions: 1, provokes: true })
})

type Fn<T> = (s: GameState, a: Asset) => T
const value = <T>(v: T | Fn<T> | undefined, s: GameState, code: string) =>
  typeof v === 'function' ? (v as Fn<T>)(s, s.assets[code]!) : v
it('Leo De Luca (01548) and The Black Fan (08057) keep their controller bonuses', () => {
  expect(playerCardBehavior('01548')!.additionalTurnActions).toBe(1)
  const fan = playerCardBehavior('08057')!
  const rich = withAsset(during(game(), patch({ resources: 15 })), '08057')
  expect(value(fan.ownerVitals, rich, '08057')).toEqual({ health: 1, sanity: 1 })
  expect(value(fan.additionalTurnActions, rich, '08057')).toBe(1)
  const poor = withAsset(during(game(), patch({ resources: 9 })), '08057')
  expect(value(fan.ownerVitals, poor, '08057')).toEqual({})
})
