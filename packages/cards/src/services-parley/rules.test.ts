// RR: Initiation, Costs, Target, Evade, Parley, Skill Tests ST.7, Weaknesses.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playableCards,
  canPlayByEffect,
  playRestriction,
  type GameState,
  type Enemy,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = (code: string, resources = 10) => {
  const s = patch({
    hand: [code],
    resources,
    skills: { willpower: 8, intellect: 8, combat: 8, agility: 8 },
  })(clear(game()))
  return {
    ...s,
    chaosBag: [0],
    locations: Object.fromEntries(
      Object.entries(s.locations).map(([id, l]) => [id, { ...l, revealed: true, clues: 8 }]),
    ),
  } as GameState
}
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
      maxHealth: 20,
      health: 20,
      damageTaken: 0,
      traits: ['Humanoid'],
      ...extra,
    },
  },
})
const play = (s: GameState, code: string, extra = {}) =>
  dispatch(clear(s), { type: 'PlayCard', investigator: 'a', code, ...extra })
const b = (code: string) => playerCardBehavior(code)!
it.each(['05111', '05234', '05277'])(
  '%s offers only affordable optional replacements before spending',
  (code) => {
    const s = play(foe(start(code, 4)), code)
    expect(me(s).resources).toBe(4)
    expect(me(s).hand).toContain(code)
    expect(s.pending?.question.choices.map((c) => c.label)).toEqual([
      'choice.serviceMode0',
      'choice.serviceMode1',
      'choice.serviceMode2',
    ])
  },
)
it.each([0, 1, 2, 3])(
  'Intel Report mode %s pays both increases and discovers the printed amount at the chosen range',
  (variant) => {
    let s = play(start('05111'), '05111')
    s = choose(s, 'choice.serviceMode' + variant)
    expect(me(s).resources).toBe(8 - ((variant & 1) + ((variant >> 1) & 1)) * 2)
    const where = variant & 2 ? 'Room B' : 'Room A'
    const choices = s.pending!.question.choices
    if (!(variant & 2)) expect(choices).toHaveLength(1)
    s = choose(s, 'choice.location', { location: where })
    expect(me(s).clues).toBe(variant & 1 ? 2 : 1)
  },
)
it.each([0, 1, 2, 3])('Small Favor mode %s damages just one non-Elite target', (variant) => {
  const ranged = !!(variant & 2)
  let s = foe(foe(start('05277')), 'elite', { traits: ['Elite'] })
  s = foe(s, 'distant', { location: 'B', engagedWith: null })
  s = choose(play(s, '05277'), 'choice.serviceMode' + variant)
  expect(
    s.pending!.question.choices.some((c) => c.target?.type === 'enemy' && c.target.id === 'elite'),
  ).toBe(false)
  expect(s.pending!.question.choices).toHaveLength(ranged ? 2 : 1)
  const target = s.pending!.question.choices[0]!
  s = choose(s, target.label, target.params)
  expect(s.enemies.foe!.damageTaken).toBe(variant & 1 ? 2 : 1)
  expect(s.enemies.distant!.damageTaken).toBe(0)
})
it('Decoy evades up to two distinct enemies and may stop after one', () => {
  let s = foe(foe(start('05234')), 'other', { name: 'Other' })
  s = choose(play(s, '05234'), 'choice.serviceMode1')
  s = choose(s, 'choice.serviceEnemy', { enemy: 'Ghoul' })
  expect(s.enemies.foe).toMatchObject({ exhausted: false, engagedWith: 'a' })
  expect(s.pending!.question.choices.filter((c) => c.label === 'choice.serviceEnemy')).toHaveLength(
    1,
  )
  s = choose(s, 'choice.serviceDone')
  expect(s.enemies.foe).toMatchObject({ exhausted: true, engagedWith: null })
  expect(s.enemies.other!.exhausted).toBe(false)
})
it('Decoy can choose its second enemy at distance without evading any enemy twice', () => {
  let s = foe(foe(start('05234')), 'other', { name: 'Other', location: 'B', engagedWith: null })
  s = choose(play(s, '05234'), 'choice.serviceMode3')
  s = choose(s, 'choice.serviceEnemy', { enemy: 'Ghoul' })
  s = choose(s, 'choice.serviceEnemy', { enemy: 'Other' })
  expect(Object.values(s.enemies).every((e) => e.exhausted && !e.engagedWith)).toBe(true)
})
it('cost increases combine with discounts before clamping and are waived by playing without paying the cost', () => {
  const discounted = choose(
    play(start('05111', 4), '05111', { discount: 2 }),
    'choice.serviceMode3',
  )
  expect(me(discounted).resources).toBe(0)
  const free = choose(play(start('05111', 4), '05111', { noCost: true }), 'choice.serviceMode3')
  expect(me(free).resources).toBe(4)
  const reduced = choose(play(start('05111', 1), '05111', { discount: 3 }), 'choice.serviceMode1')
  expect(me(reduced).resources).toBe(0)
})
it('a forged variant cannot spend resources or remove a card', () => {
  const s = play(start('05111'), '05111', { variant: 99 })
  expect(me(s).resources).toBe(10)
  expect(me(s).hand).toContain('05111')
})
it.each([false, true])(
  'Persuasion shuffles ordinary Humanoids and automatically evades Elites: %s',
  (isElite) => {
    let s = foe(start('04105'), 'foe', {
      traits: ['Humanoid', ...(isElite ? ['Elite'] : [])],
      horror: 2,
    })
    s = choose(play(s, '04105'), 'choice.serviceEnemy')
    if (isElite) expect(s.enemies.foe).toMatchObject({ exhausted: true, engagedWith: null })
    else {
      expect(s.enemies.foe).toBeUndefined()
      expect(s.encounterDeck.some((c) => c.code === ghoul.code)).toBe(true)
    }
  },
)
it('Persuasion excludes weaknesses and non-Humanoids, preserving its printed version', () => {
  const s = foe(foe(start('04105'), 'weak', { owner: 'a' }), 'monster', { traits: ['Monster'] })
  expect(b('04105').canPlay!(s, 'a')).toBe(false)
})
it.each([false, true])(
  'Stall for Time exhausts without disengaging and only prevents a non-Elite ready: %s',
  (isElite) => {
    let s = foe(start('10114'), 'foe', { traits: isElite ? ['Elite'] : [] })
    s = choose(play(s, '10114'), 'choice.serviceEnemy')
    expect(s.enemies.foe).toMatchObject({ exhausted: true, engagedWith: 'a' })
    expect(!!s.enemies.foe!.stayExhausted).toBe(!isElite)
  },
)
it('Stall for Time returns the played copy on failure', () => {
  let s = foe({ ...start('10114'), chaosBag: ['autoFail'] })
  s = choose(play(s, '10114'), 'choice.serviceEnemy')
  expect(me(s).hand).toContain('10114')
  expect(me(s).discard).not.toContain('10114')
})
it('Stall for Time returns the copy sent to the deck by Wendy’s Amulet', () => {
  let s = withAsset(foe({ ...start('10114'), chaosBag: ['autoFail'] }), '01014')
  s = choose(play(s, '10114'), 'choice.serviceEnemy')
  expect(me(s).hand).toContain('10114')
  expect(me(s).deck).not.toContain('10114')
})
it.each([0, 'skull', 'elderSign'])(
  'Banish moves its successfully evaded enemy and uses only the four printed symbols: %s',
  (token) => {
    let s = foe({ ...start('05113'), chaosBag: [token] } as GameState)
    s = choose(play(s, '05113'), 'choice.serviceEnemy')
    s = choose(s, 'choice.location', { location: 'Room B' })
    expect(s.enemies.foe).toMatchObject({ location: 'B', exhausted: true, engagedWith: null })
    expect(!!s.enemies.foe!.stayExhausted).toBe(token === 'skull')
  },
)
it('Banish requires an engaged, evadable non-Elite', () => {
  expect(b('05113').canPlay!(foe(start('05113'), 'foe', { engagedWith: null }), 'a')).toBe(false)
  expect(b('05113').canPlay!(foe(start('05113'), 'foe', { traits: ['Elite'] }), 'a')).toBe(false)
})
it('True Understanding requires a scenario-card test and discovers at its committer’s location', () => {
  // A manually constructed test remains observable in interactive mode.
  let s = dispatch(
    { ...start('04153'), interactive: true },
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 2,
      tags: ['scenario'],
      kind: { type: 'effect', source: 'scenario', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  const t = s.skillTest!
  expect(b('04153').canCommit!(s, t, 'a')).toBe(true)
  expect(b('04153').canCommit!(s, { ...t, tags: [] }, 'a')).toBe(false)
  expect(b('04153').canCommit!(s, { ...t, effectSource: '04105' }, 'a')).toBe(false)
  expect(b('04153').afterCommittedTest!(s, t, false, 'a')).toEqual([])
  const effects = b('04153').afterCommittedTest!(s, t, true, 'a')
  s = effects.reduce((state, m) => dispatch(clear(state), m), s)
  expect(me(s).clues).toBe(1)
})
it('other cards retain their normal cost and receive no variant prompt', () => {
  const s = play(start('01088'), '01088')
  expect(
    s.pending?.question.choices.some((c) => c.label.startsWith('choice.serviceMode')),
  ).not.toBe(true)
  expect(me(s).resources).toBe(13)
})
it('a distant target requires the range surcharge, including when another effect grants the play', () => {
  let s = foe(start('05277', 2), 'foe', { location: 'C', engagedWith: null })
  expect(playableCards(s, 'a', false)).not.toContain('05277')
  expect(playRestriction(s, 'a', '05277')?.params?.cost).toBe(4)
  expect(canPlayByEffect(s, 'a', '05277', 'hand')).toBe(false)
  expect(canPlayByEffect(s, 'a', '05277', 'hand', true)).toBe(true)
  s = play(s, '05277', { byEffect: true, noCost: true })
  expect(s.pending!.question.choices.map((c) => c.label)).toEqual([
    'choice.serviceMode2',
    'choice.serviceMode3',
  ])
  s = choose(s, 'choice.serviceMode2')
  expect(me(s).resources).toBe(2)
})
it('no legal target leaves no playable Favor or empty modal prompt', () => {
  const s = start('05277')
  expect(playableCards(s, 'a', false)).not.toContain('05277')
  const rejected = play(s, '05277')
  expect(rejected.pending).toBeNull()
  expect(me(rejected).hand).toContain('05277')
})
it('Persuasion cannot shuffle a non-Elite without an encounter card back', () => {
  let s = foe(start('04105'), 'foe', { encounterBack: false })
  const before = s.encounterDeck.length
  s = choose(play(s, '04105'), 'choice.serviceEnemy')
  expect(s.enemies.foe).toBeDefined()
  expect(s.encounterDeck).toHaveLength(before)
})
