// RR: Investigators, Damage Placement vs Moving, Costs, ST.7 ordering, Flip, Charges.
import { expect, it } from 'vitest'
import {
  dispatch,
  investigatorBehavior,
  playerCardBehavior,
  playerCardDef,
  treacheryBehavior,
  deckOptionAllows,
  type GameState,
  type Message,
} from '@lcg/engine'
import { newTestGame, throughSetup, choose, spawnAt, ghoul } from '@lcg/engine/testing'
import '../index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = (code = '03001'): GameState => {
  const s = clear(throughSetup(newTestGame({ players: [code, 'b'] })))
  return {
    ...s,
    activeTurn: code,
    interactive: true,
    phase: 'investigation',
    chaosBag: [0],
    investigators: s.investigators.map((i) => ({
      ...i,
      damage: 0,
      horror: 0,
      hand: [],
      deck: ['01088', '01089', '01090'],
      resources: 10,
      actionsRemaining: 3,
    })),
  }
}
const by = (s: GameState) => s.investigators[0]!
const patch = (s: GameState, values: Partial<GameState['investigators'][number]>): GameState => ({
  ...s,
  investigators: s.investigators.map((i, n) => (n === 0 ? { ...i, ...values } : i)),
})
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const asset = (s: GameState, code: string, uses = 4, owner = by(s).id): GameState => ({
  ...s,
  assets: {
    ...s.assets,
    [code]: { id: code, code, owner, uses, damage: 0, horror: 0, exhausted: false },
  },
})
const test = (s: GameState) =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: by(s).id,
    skill: 'combat',
    difficulty: 1,
    kind: { type: 'effect', source: 'carcosa-test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const sophie = (s: GameState) => Object.values(s.assets).find((a) => a.code.startsWith('03009'))!
const ability = (s: GameState, code: string) => {
  const a = Object.values(s.assets).find((a) => a.code === code)!
  const o = playerCardBehavior(code)!.testOptions!(s, s.skillTest!, a)[0]!
  return dispatch(clear(s), ...o.then)
}
it('Mark starts with exactly one front-face Sophie in play, outside the opening deck and hand', () => {
  const s = throughSetup(newTestGame({ players: ['03001'] }))
  expect(Object.values(s.assets).filter((a) => a.code === '03009')).toHaveLength(1)
  expect([...by(s).hand, ...by(s).deck]).not.toContain('03009')
})
it('Mark may draw for damage on himself once per phase, and a new phase restores the limit', () => {
  let s = run(base(), {
    type: 'TakeDamage',
    investigator: '03001',
    damage: 1,
    horror: 0,
    direct: true,
  })
  s = choose(s, 'ability.markDraw')
  expect(by(s).hand).toHaveLength(1)
  s = run(s, { type: 'TakeDamage', investigator: '03001', damage: 1, horror: 0, direct: true })
  expect(s.pending).toBeNull()
  s = run(
    { ...s, phase: 'enemy' },
    { type: 'TakeDamage', investigator: '03001', damage: 1, horror: 0, direct: true },
  )
  s = choose(s, 'ability.markDraw')
  expect(by(s).hand).toHaveLength(2)
})
it('Mark sees damage on a defeated controlled asset after it leaves play, but not horror or other owners', () => {
  let s = run(asset(base(), '01018'), { type: 'DamageAsset', asset: '01018', damage: 2, horror: 0 })
  expect(s.assets['01018']).toBeUndefined()
  s = choose(s, 'ability.markDraw')
  expect(by(s).hand).toHaveLength(1)
  const t = run(asset(base(), '01018', 0, 'b'), {
    type: 'DamageAsset',
    asset: '01018',
    damage: 2,
    horror: 0,
  })
  expect(t.pending).toBeNull()
  const h = run(base(), {
    type: 'TakeDamage',
    investigator: '03001',
    damage: 0,
    horror: 1,
    direct: true,
  })
  expect(h.pending).toBeNull()
})
it('moving damage onto Mark counts as placement and moving it away does not trigger another draw', () => {
  let s = asset(base(), '01016')
  s.assets['01016']!.damage = 1
  s = run(s, {
    type: 'MoveDamage',
    from: { type: 'asset', id: '01016' },
    to: { type: 'investigator', id: '03001' },
    kind: 'damage',
  })
  s = choose(s, 'ability.markDraw')
  expect(by(s).damage).toBe(1)
  expect(investigatorBehavior('03001')!.elderSign!(s, by(s)).modifier).toBe(1)
})
it('Sophie pays direct damage and grants +2, flipping at five damage while the granted bonus remains', () => {
  let s = test(patch(base(), { damage: 4 }))
  s = ability(s, '03009')
  s = choose(s, 'choice.skip')
  expect(by(s).damage).toBe(5)
  expect(sophie(s).code).toBe('03009b')
  expect(s.skillTest?.baseModifier).toBe(2)
  expect(playerCardBehavior('03009b')!.skillModifier!(s, sophie(s), s.skillTest!)).toBe(-1)
  expect(playerCardBehavior('03009b')!.testOptions).toBeUndefined()
})
it('healing back to four flips the same Sophie back without leaving play; no normal removal is allowed', () => {
  let s = run(patch(base(), { damage: 5 }), { type: 'Forced', trigger: { type: 'roundEnds' } })
  const id = sophie(s).id
  expect(sophie(s).code).toBe('03009b')
  s = run(s, { type: 'Heal', investigator: '03001', damage: 1, horror: 0 })
  expect(sophie(s)).toMatchObject({ id, code: '03009' })
  for (const type of ['DiscardAsset', 'ReturnAssetToHand', 'RemoveAssetFromGame'] as const)
    expect(run(s, { type, asset: id }).assets[id]).toBeDefined()
})
it('Home Front can resolve before weapon damage, moves rather than heals, and unflips Sophie', () => {
  let s = run(patch(base(), { damage: 5 }), spawnAt('A', { ...ghoul, health: 3 }, '03001'))
  const enemy = Object.keys(s.enemies)[0]!
  s = run(patch(s, { hand: ['03007'] }), {
    type: 'BeginSkillTest',
    investigator: '03001',
    skill: 'combat',
    difficulty: 0,
    kind: { type: 'fight', enemy, extraDamage: 1 },
  })
  s = patch(s, { hand: ['03007'] })
  s = choose(s, 'choice.commit', { card: 'The Home Front' })
  s = choose(s, 'choice.revealToken')
  s = choose(s, 'choice.applyResults')
  expect(
    s.pending?.question.choices.some((c) => c.label === 'choice.cancelRemainingTestResults'),
  ).toBe(false)
  s = choose(s, 'choice.card', { card: 'The Home Front' })
  expect(by(s).damage).toBe(4)
  expect(s.enemies[enemy]).toBeUndefined()
  expect(sophie(s).code).toBe('03009')
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.markDraw')).not.toBe(true)
})
it.each([0, 1, 2, 5, 8])('Shell Shock at %s damage takes floor(damage/2) horror', (damage) => {
  const s = patch(base(), { damage }),
    t = {
      id: 'shock',
      kind: 'treachery' as const,
      code: '03008',
      name: 'Shell Shock',
      keywords: [],
      placement: { type: 'limbo' as const },
      owner: '03001',
    }
  const after = dispatch(clear(s), ...treacheryBehavior('03008')!.revelation(s, '03001', t))
  expect(by(after).horror).toBe(Math.floor(damage / 2))
})
it('Akachi grants one charge only when a charged asset enters, not to other uses or other controllers', () => {
  let s = run(base('03004'), { type: 'PutAssetIntoPlay', investigator: '03004', code: '01060' })
  expect(Object.values(s.assets).find((a) => a.code === '01060')?.uses).toBe(5)
  s = run(s, { type: 'PutAssetIntoPlay', investigator: '03004', code: '01087' })
  expect(Object.values(s.assets).find((a) => a.code === '01087')?.uses).toBe(3)
  s = run(s, { type: 'PutAssetIntoPlay', investigator: 'b', code: '01060' })
  expect(Object.values(s.assets).find((a) => a.code === '01060' && a.owner === 'b')?.uses).toBe(4)
})
it('Akachi elder sign grants +1 and chooses a controlled asset for one charge without refilling it', () => {
  const s = asset(base('03004'), '01060', 7),
    e = investigatorBehavior('03004')!.elderSign!(s, by(s))
  expect(e.modifier).toBe(1)
  const done = choose(dispatch(clear(s), ...(e.immediate ?? [])), 'choice.asset', {
    asset: playerCardDef('01060')!.name,
  })
  expect(done.assets['01060']?.uses).toBe(8)
  expect(
    investigatorBehavior('03004')!.elderSign!(base('03004'), by(base('03004'))).immediate,
  ).toEqual([])
})
it('Spirit-Speaker returns a spell with no resources gained, then replaying it receives the entry bonus anew', () => {
  let s = test(asset(asset(base('03004'), '03014', 0), '01060', 3))
  s = ability(s, '03014')
  s = choose(s, 'choice.carcosaReturn', { card: playerCardDef('01060')!.name })
  expect(s.assets['01060']).toBeUndefined()
  expect(by(s).hand).toContain('01060')
  expect(by(s).resources).toBe(10)
  expect(s.assets['03014']?.exhausted).toBe(true)
  s = run(s, { type: 'PutAssetIntoPlay', investigator: '03004', code: '01060', fromHand: true })
  expect(Object.values(s.assets).find((a) => a.code === '01060')?.uses).toBe(5)
})
it('Spirit-Speaker moves all remaining charges to resources and discards the selected asset', () => {
  let s = test(asset(asset(base('03004'), '03014', 0), '01060', 3))
  s = ability(s, '03014')
  s = choose(s, 'choice.carcosaCash', { card: playerCardDef('01060')!.name })
  expect(by(s).resources).toBe(13)
  expect(by(s).discard).toContain('01060')
  expect(s.assets['03014']?.exhausted).toBe(true)
})
it('Angered Spirits accepts a charge from a ready controlled Spell, exhausts it and retains the weakness at four charges', () => {
  const t = {
    id: 'spirits',
    kind: 'treachery' as const,
    code: '03015',
    name: 'Angered Spirits',
    keywords: [],
    placement: { type: 'threatArea' as const, investigator: '03004' },
    owner: '03004',
    tokens: 3,
  }
  let s = asset(base('03004'), '01060', 2)
  s = { ...s, treacheries: { spirits: t } }
  const o = treacheryBehavior('03015')!.abilities!(s, t, '03004')[0]!
  s = dispatch(clear(s), ...o.then)
  expect(s.assets['01060']).toMatchObject({ uses: 1, exhausted: true })
  expect(s.treacheries.spirits?.tokens).toBe(4)
  expect(treacheryBehavior('03015')!.whenGameEnds!(s, s.treacheries.spirits!)).toEqual([])
  expect(treacheryBehavior('03015')!.whenGameEnds!(s, { ...t, tokens: 3 })).toEqual([
    { type: 'SufferTrauma', investigator: '03004', physical: 1 },
  ])
})
it('Angered Spirits cannot spend offerings/secrets or charges from exhausted assets', () => {
  const s = asset(asset(base('03004'), '01060', 0), '10091', 6),
    t = {
      id: 'spirits',
      kind: 'treachery' as const,
      code: '03015',
      name: 'Angered Spirits',
      keywords: [],
      placement: { type: 'threatArea' as const, investigator: '03004' },
      owner: '03004',
    }
  expect(treacheryBehavior('03015')!.abilities!(s, t, '03004')).toEqual([])
})
it('Akachi off-class options admit charges 0-4 and Occult 0, while Mark admits only level zero Tactics', () => {
  const mk = playerCardDef('03001')!,
    ak = playerCardDef('03004')!
  const sample = { ...playerCardDef('01060')!, class: 'rogue', xp: 4 }
  expect(ak.deckOptions!.some((o) => deckOptionAllows(o, sample))).toBe(true)
  expect(ak.deckOptions!.some((o) => deckOptionAllows(o, { ...sample, xp: 5 }))).toBe(false)
  expect(
    mk.deckOptions!.some((o) =>
      deckOptionAllows(o, { ...sample, xp: 0, traits: ['Tactic'], uses: undefined } as never),
    ),
  ).toBe(true)
  expect(
    mk.deckOptions!.some((o) => deckOptionAllows(o, { ...sample, xp: 1, traits: ['Tactic'] })),
  ).toBe(false)
})
it('fatal damage moved onto Mark checks defeat before offering his draw reaction', () => {
  let s = asset(patch(base(), { damage: 8 }), '01018')
  s.assets['01018']!.damage = 1
  s = run(s, {
    type: 'MoveDamage',
    from: { type: 'asset', id: '01018' },
    to: { type: 'investigator', id: '03001' },
    kind: 'damage',
  })
  expect(by(s).eliminated).toBe(true)
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.markDraw')).not.toBe(true)
})
it('another investigator at Akachi location can contribute a charge to Angered Spirits', () => {
  const t = {
    id: 'spirits',
    kind: 'treachery' as const,
    code: '03015',
    name: 'Angered Spirits',
    keywords: [],
    placement: { type: 'threatArea' as const, investigator: '03004' },
    owner: '03004',
  }
  let s = asset(base('03004'), '01060', 2, 'b')
  s = { ...s, treacheries: { spirits: t } }
  const o = treacheryBehavior('03015')!.abilities!(s, t, 'b')[0]!
  s = dispatch(clear(s), ...o.then)
  expect(s.assets['01060']?.uses).toBe(1)
  expect(s.treacheries.spirits?.tokens).toBe(1)
})
it('ordered successful results preserve repeated attacks and Home Front effects without allowing cancellation', () => {
  let s = run(
    patch(base(), { damage: 5, hand: ['03007'] }),
    spawnAt('A', { ...ghoul, health: 10 }, '03001'),
  )
  const enemy = Object.keys(s.enemies)[0]!
  s = run(s, {
    type: 'BeginSkillTest',
    investigator: '03001',
    skill: 'combat',
    difficulty: 0,
    kind: { type: 'fight', enemy, extraDamage: 1 },
  })
  s = choose(s, 'choice.commit', { card: 'The Home Front' })
  s = { ...s, skillTest: { ...s.skillTest!, resultRepetitions: 2 } }
  s = choose(s, 'choice.revealToken')
  s = choose(s, 'choice.applyResults')
  expect(
    s.pending?.question.choices.some((c) => c.label === 'choice.cancelRemainingTestResults'),
  ).toBe(false)
  s = choose(s, 'choice.card', { card: 'The Home Front' })
  s = choose(s, 'choice.card', { card: 'The Home Front' })
  s = choose(s, 'choice.resolveTestConsequences')
  expect(by(s).damage).toBe(3)
  expect(s.enemies[enemy]?.damageTaken).toBe(6)
})
