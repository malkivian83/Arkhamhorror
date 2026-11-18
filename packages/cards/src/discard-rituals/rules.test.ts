// RR: Play, Commit, Draw, Exile, Uses, Parley, Attach To, Lasting Effects.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  playableCards,
  canPlayByEffect,
  enemyHasKeyword,
  skillValueFor,
  type GameState,
  type Message,
  type AbilityOption,
} from '@lcg/engine'
import { choose, ghoul, spawnAt } from '@lcg/engine/testing'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import data from '../data/discard-rituals.json'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = () => ({
  ...clear(
    patch({ hand: [], discard: [], deck: ['01088', '01089'], resources: 30, actionsRemaining: 3 })(
      game(['a', 'b']),
    ),
  ),
  interactive: true,
})
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const b = (c: string) => playerCardBehavior(c)!
const effect = (s: GameState, c: string) => dispatch(clear(s), ...b(c).play!(s, 'a'))
const play = (s: GameState, c: string) =>
  run(s, { type: 'TakeAction', investigator: 'a', action: { kind: 'play', card: c } })
const foe = () => clear(dispatch(base(), spawnAt('A', { ...ghoul, health: 20 }, 'a')))
const eid = (s: GameState) => Object.keys(s.enemies)[0]!
const done = (s: GameState) =>
  choose(choose({ ...s, chaosBag: [0] }, 'choice.revealToken'), 'choice.applyResults')
const use = (s: GameState, c: string) => {
  const a = s.assets[c]!,
    o = b(c).abilities!(s, a, 'a')[0]! as AbilityOption
  return run(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    ...(o.costs ? { costs: o.costs } : {}),
    ...(o.parley ? { parley: o.parley } : {}),
    ...(o.limit ? { limit: o.limit } : {}),
    then: o.then,
  })
}
it.each(data)('$code registers its reviewed distinct level', (c) => {
  expect(b(c.code)).toBeDefined()
  expect(playerCardDef(c.code)?.xp).toBe(c.xp)
})
it('Moonstone cannot be played or committed from hand, but can be played from discard with resources', () => {
  const s = patch({ hand: ['06203'], discard: ['06203'] })(base())
  expect(playableCards(s, 'a', false)).not.toContain('06203')
  expect(canPlayByEffect(s, 'a', '06203', 'hand')).toBe(false)
  expect(canPlayByEffect(s, 'a', '06203', 'discard', false, 0, false, true, true)).toBe(true)
  expect(b('06203').canCommit!(s, {} as never, 'a', 'hand')).toBe(false)
  expect(b('06203').canCommit!(s, {} as never, 'a', 'discard')).toBe(true)
})
it('discarding Moonstone offers its reaction, pays its cost and grants both bonuses without an action', () => {
  let s = run(patch({ hand: ['06203'] })(base()), {
    type: 'DiscardFromHand',
    investigator: 'a',
    card: '06203',
  })
  s = choose(s, 'ability.playCard', { card: 'Moonstone' })
  expect(Object.values(s.assets).some((a) => a.code === '06203')).toBe(true)
  expect(me(s).resources).toBe(27)
  expect(me(s).actionsRemaining).toBe(3)
  for (const skill of ['willpower', 'agility'] as const)
    expect(skillValueFor(s, 'a', skill, { type: 'investigate', location: 'A' })).toBe(
      skillValueFor(base(), 'a', skill, { type: 'investigate', location: 'A' }) + 1,
    )
})
it('Moonstone cannot react when discarded without enough resources or when exiled from hand', () => {
  const s = patch({ hand: ['06203'], resources: 0 })(base())
  expect(
    b('06203').discardReactions!(
      s,
      { type: 'afterHandDiscard', investigator: 'a', cards: ['06203'] },
      'a',
    ),
  ).toEqual([])
  const exiled = run(patch({ hand: ['06203'] })(base()), {
    type: 'ExileCard',
    investigator: 'a',
    code: '06203',
    from: 'hand',
  })
  expect(me(exiled).hand).not.toContain('06203')
  expect(me(exiled).discard).not.toContain('06203')
  expect(exiled.pending?.question.choices.some((c) => c.label === 'ability.playCard')).not.toBe(
    true,
  )
})
it.each(['draw', 'play', 'commit'])('Geas records the %s promise on its physical asset', (p) => {
  let s = run(base(), { type: 'PutAssetIntoPlay', investigator: 'a', code: '07265' })
  s = choose(s, 'choice.geas.' + p)
  const a = Object.values(s.assets).find((a) => a.code === '07265')!
  expect(a.abilityState?.promise).toBe(p)
  for (const skill of ['willpower', 'intellect', 'combat', 'agility'] as const)
    expect(skillValueFor(s, 'a', skill, { type: 'investigate', location: 'A' })).toBe(
      skillValueFor(base(), 'a', skill, { type: 'investigate', location: 'A' }) + 1,
    )
})
it.each([
  ['draw', { type: 'afterDrawCard', investigator: 'a', card: '01088' }],
  ['play', { type: 'afterPlayCard', investigator: 'a', code: '01088' }],
  ['commit', { type: 'afterCommit', by: 'a', card: '01088' }],
] as const)(
  'Geas discards itself and adds ten curses for breaking %s during its turn',
  (promise, trigger) => {
    const s = withAsset(base(), '07265', { abilityState: { promise } }),
      a = s.assets['07265']!
    const then = b('07265').forced!(s, trigger as never, a)
    const after = dispatch(clear(s), ...then)
    expect(after.assets['07265']).toBeUndefined()
    expect(after.chaosBag.filter((t) => t === 'curse')).toHaveLength(10)
    expect(b('07265').forced!({ ...s, activeTurn: 'b' }, trigger as never, a)).toEqual([])
  },
)
it('playing Geas itself does not break its subsequently chosen play promise', () => {
  let s = play(patch({ hand: ['07265'] })(base()), '07265')
  s = choose(s, 'choice.geas.play')
  expect(Object.values(s.assets).some((a) => a.code === '07265')).toBe(true)
  expect(s.chaosBag.filter((t) => t === 'curse')).toHaveLength(0)
})
it('Geas counts encounter draws and caps curses at the remaining supply', () => {
  const s = withAsset({ ...base(), chaosBag: ['curse', 'curse', 'curse'] }, '07265', {
    abilityState: { promise: 'draw' },
  })
  const queued = {
    ...s,
    queue: [
      { type: 'ResolveEncounterCard', investigator: 'a', draw: { id: 'draw-geas' } } as Message,
    ],
  }
  const then = b('07265').forced!(
    queued,
    { type: 'whenEncounterDrawn', draw: 'draw-geas' } as never,
    s.assets['07265']!,
  )
  expect(dispatch(clear(s), ...then).chaosBag.filter((t) => t === 'curse')).toHaveLength(10)
})
it.each(['skull', 'curse', 0] as const)(
  'Speak to the Dead spends offerings, returns %s and recovers only on skull or curse',
  (token) => {
    let s = withAsset({ ...patch({ discard: ['09088'] })(base()), chaosBag: [token] }, '10091')
    s = use(s, '10091')
    s = choose(s, 'choice.card', { card: playerCardDef('09088')!.name })
    s = choose(s, 'choice.ritualOfferings', { n: 1 })
    expect(s.assets['10091']?.uses).toBe(5)
    expect(me(s).hand.includes('09088')).toBe(token !== 0)
    expect(s.chaosBag).toEqual([token])
    expect(s.heldChaosTokens).toEqual({})
    expect(me(s).actionsRemaining).toBe(2)
  },
)
it('Speak to the Dead reveals several distinct physical tokens, including a bag smaller than its offerings', () => {
  let s = withAsset({ ...patch({ discard: ['09088'] })(base()), chaosBag: ['skull', 0] }, '10091')
  s = use(s, '10091')
  s = choose(s, 'choice.card', { card: playerCardDef('09088')!.name })
  s = choose(s, 'choice.ritualOfferings', { n: 6 })
  expect(s.assets['10091']?.uses).toBe(0)
  expect(me(s).hand).toContain('09088')
  expect(s.chaosBag.sort()).toEqual([0, 'skull'].sort())
  expect(s.heldChaosTokens).toEqual({})
})
it('Speak to the Dead requires an offering and a Spell or Ritual event in the owner discard', () => {
  const s = withAsset(patch({ discard: ['01088'] })(base()), '10091')
  expect(b('10091').abilities!(s, s.assets['10091']!, 'a')).toEqual([])
  const t = patch({ discard: ['09088'] })(s)
  expect(b('10091').abilities!(t, { ...t.assets['10091']!, uses: 0 }, 'a')).toEqual([])
  expect(b('10091').abilities!(t, t.assets['10091']!, 'b')).toEqual([])
})
it('Call the Beyond pays three curses, restores printed charges and permits declining activation', () => {
  let s = withAsset(patch({ hand: ['10099'] })(base()), '01060', { uses: 0, exhausted: true })
  s = play(s, '10099')
  s = choose(s, 'choice.asset', { asset: playerCardDef('01060')!.name })
  s = choose(s, 'choice.skip')
  expect(s.assets['01060']).toMatchObject({ uses: 4, exhausted: true })
  expect(s.chaosBag.filter((t) => t === 'curse')).toHaveLength(3)
  expect(me(s).actionsRemaining).toBe(2)
})
it('Call the Beyond cannot pay with fewer than three curses available and excludes ammo', () => {
  const s = withAsset({ ...base(), chaosBag: Array(8).fill('curse') }, '01060', { uses: 0 })
  expect(b('10099').canPlay!(s, 'a')).toBe(false)
  expect(b('10099').canPlay!(withAsset(base(), '01087', { uses: 0 }), 'a')).toBe(false)
  expect(b('10099').canPlay!(withAsset(base(), '01016', { uses: 0 }), 'a')).toBe(false)
})
it('Call the Beyond resolves a spell ability without its first action while paying its charge', () => {
  let s = withAsset(patch({ hand: ['10099'] })(foe()), '01060', { uses: 0 })
  s = play(s, '10099')
  s = choose(s, 'choice.asset', { asset: playerCardDef('01060')!.name })
  s = choose(s, 'ability.fightWithSkill', {
    card: playerCardDef('01060')!.name,
    enemy: ghoul.name,
    skill: 'willpower',
  })
  expect(s.assets['01060']?.uses).toBe(3)
  expect(me(s).actionsRemaining).toBe(2)
  expect(s.skillTest).not.toBeNull()
})
it.each([
  ['01088', false],
  ['07265', true],
] as const)(
  'Burn After Reading exiles level of %s, discovers two clues and removes doom only at level two or more',
  (other, doom) => {
    let s = patch({ hand: ['08076', other] })(base())
    s = { ...s, doom: 2 }
    s = play(s, '08076')
    s = choose(s, 'choice.card', { card: playerCardDef(other)!.name })
    expect(me(s).clues).toBe(2)
    expect(me(s).hand).not.toContain(other)
    expect(me(s).discard).not.toContain(other)
    expect(me(s).discard).not.toContain('08076')
    expect(s.doom).toBe(doom ? 1 : 2)
  },
)
it('Burn After Reading still does as much as possible without another eligible card', () => {
  const s = play(patch({ hand: ['08076'] })(base()), '08076')
  expect(me(s).clues).toBe(2)
  expect(me(s).discard).not.toContain('08076')
})
it.each(['willpower', 'intellect'] as const)(
  'Existential Riddle tests %s against eight minus the remaining hand, then evades and attaches aloof',
  (skill) => {
    let s = patch({ hand: ['09052', '01088', '01089', '01090', '01091', '01092', '01093'] })(foe())
    const id = eid(s)
    s = play(s, '09052')
    s = choose(s, 'choice.ritualRiddle.' + skill, { enemy: ghoul.name })
    expect(s.skillTest).toMatchObject({ skill, difficulty: 2 })
    s = done(s)
    expect(s.enemies[id]?.exhausted).toBe(true)
    expect(enemyHasKeyword(s, s.enemies[id]!, 'aloof')).toBe(true)
    expect(Object.values(s.treacheries).some((t) => t.code === '09052')).toBe(true)
    s = run(s, { type: 'DiscardEnemy', enemy: id })
    expect(me(s).discard).toContain('09052')
  },
)
it('both parley events reject Elite, remote and immune enemies', () => {
  for (const code of ['09052', '09088']) {
    const s = foe(),
      id = eid(s)
    expect(b(code).canPlay!(s, 'a')).toBe(true)
    for (const changes of [{ traits: ['Elite'] }, { location: 'B' }])
      expect(
        b(code).canPlay!({ ...s, enemies: { [id]: { ...s.enemies[id]!, ...changes } } }, 'a'),
      ).toBe(false)
  }
})
it('String of Curses evades, places doom without advancing and grants a clue; all damage is blocked until round end', () => {
  let s = foe()
  const id = eid(s)
  s = effect(s, '09088')
  s = choose(s, 'choice.ritualCurseEvade', { enemy: ghoul.name })
  expect(s.enemies[id]).toMatchObject({ doom: 1, exhausted: true })
  expect(me(s).clues).toBe(1)
  for (const by of ['a', 'b', undefined]) {
    s = run(s, { type: 'DamageEnemy', enemy: id, amount: 3, ...(by ? { by } : {}) })
    expect(s.enemies[id]?.damageTaken ?? 0).toBe(0)
  }
})
it('String of Curses defeats an enemy with doom even if damage is prevented and grants one resource per doom', () => {
  let s = foe()
  const id = eid(s)
  s = {
    ...s,
    enemies: {
      [id]: {
        ...s.enemies[id]!,
        doom: 3,
        modifiers: [{ source: '09088', until: 'round', round: s.round, cannotTakeDamage: true }],
      },
    },
  }
  s = effect(s, '09088')
  s = choose(s, 'choice.ritualCurseDefeat', { enemy: ghoul.name })
  expect(s.enemies[id]).toBeUndefined()
  expect(me(s).resources).toBe(33)
})

it('Geas breaks on a real draw during its own turn and returns no further penalty after leaving play', () => {
  let s = withAsset(base(), '07265', { abilityState: { promise: 'draw' } })
  s = run(s, { type: 'DrawCards', investigator: 'a', amount: 1 })
  expect(s.assets['07265']).toBeUndefined()
  expect(s.chaosBag.filter((t) => t === 'curse')).toHaveLength(10)
  s = run(s, { type: 'DrawCards', investigator: 'a', amount: 1 })
  expect(s.chaosBag.filter((t) => t === 'curse')).toHaveLength(10)
})
it('Moonstone cannot react to another investigator discard or during another player Peril test', () => {
  const s = patch({ discard: ['06203'] })(base()),
    t = { type: 'afterHandDiscard' as const, investigator: 'a', cards: ['06203'] }
  expect(b('06203').discardReactions!(s, { ...t, investigator: 'b' }, 'a')).toEqual([])
  expect(
    b('06203').discardReactions!(
      { ...s, skillTest: { investigator: 'b', tags: ['peril'] } as never },
      t,
      'a',
    ),
  ).toEqual([])
})
it('Call the Beyond can activate a fast ability while retaining its exhaust and use costs', () => {
  let s = withAsset(patch({ hand: ['10099'] })(base()), '08062', { uses: 0 })
  s = play(s, '10099')
  s = choose(s, 'choice.asset', { asset: playerCardDef('08062')!.name })
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('08062')!.name })
  expect(s.assets['08062']).toMatchObject({ exhausted: true, uses: 0 })
  expect(s.pending?.question.choices.length).toBeGreaterThan(0)
})
it('Riddle failing its test does not evade, attach or add aloof', () => {
  let s = patch({ hand: ['09052'] })(foe())
  const id = eid(s)
  s = play(s, '09052')
  s = choose(s, 'choice.ritualRiddle.intellect', { enemy: ghoul.name })
  s = done(s)
  expect(s.enemies[id]?.exhausted).toBe(false)
  expect(enemyHasKeyword(s, s.enemies[id]!, 'aloof')).toBe(false)
  expect(Object.values(s.treacheries)).toHaveLength(0)
  expect(me(s).discard).toContain('09052')
})
it('String of Curses damage protection expires with the round', () => {
  let s = foe()
  const id = eid(s)
  s = effect(s, '09088')
  s = choose(s, 'choice.ritualCurseEvade', { enemy: ghoul.name })
  s = run({ ...s, round: s.round + 1 }, { type: 'DamageEnemy', enemy: id, amount: 2 })
  expect(s.enemies[id]?.damageTaken).toBe(2)
})

it('Call the Beyond cannot resolve its post-then ability without replenishing any uses', () => {
  for (const uses of [4, 6]) {
    const s = withAsset(foe(), '01060', { uses })
    expect(b('10099').canPlay!(s, 'a')).toBe(false)
  }
})
