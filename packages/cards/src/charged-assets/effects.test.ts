// RR: Skill Tests, Doom, Uses, Healing, Parley, Moving, Limits, Defeat.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  type GameState,
  type Message,
  type AbilityOption,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
import { canPlayByEffect, playerCardDef, withinLimit, emptyCampaignLog } from '@lcg/engine'
it('End of the Road is excluded from a reshuffle and overrides the Amulet provisional deck placement', () => {
  for (const amulet of [false, true]) {
    let s = patch({ hand: ['09104'], deck: [], discard: ['01093', '09104'] })(start())
    if (amulet) s = withAsset(s, '01014')
    s = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '09104' })
    const all = [...me(s).hand, ...me(s).deck, ...me(s).discard]
    expect(all.filter((c) => c === '09104')).toHaveLength(1)
  }
})
it.each(['10065', '10077'])(
  '%s enters for free only after its owner fails a Parley test',
  (code) => {
    let s = patch({ hand: [code, '01093'] })(start())
    s = dispatch(s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 3,
      tags: ['parley'],
      kind: { type: 'effect', source: 'parley', onSuccess: [], onFail: [], onFailEach: [] },
    })
    const b = playerCardBehavior(code)!,
      t = {
        type: 'afterSkillTest' as const,
        investigator: 'a',
        kind: 'effect' as const,
        succeeded: false,
        margin: -1,
      }
    const r = b.handReactions!(s, t, 'a')
    expect(r).toHaveLength(1)
    expect(b.handReactions!(s, { ...t, succeeded: true }, 'a')).toEqual([])
    const next = run(s, r[0]!.then)
    expect(Object.values(next.assets).some((a) => a.code === code)).toBe(true)
    expect(me(next).resources).toBe(20)
    expect(me(next).hand).not.toContain(code)
  },
)
it('Hypnotic Gaze cancels the attack and reveals a token through the engine', () => {
  let s = patch({ hand: ['02153'] })(foe(start()))
  s = { ...s, chaosBag: ['skull'] }
  const b = playerCardBehavior('02153')!
  const r = b.handReactions!(
    s,
    { type: 'whenEnemyAttacks', enemy: 'foe', investigator: 'a' },
    'a',
  )[0]!
  s = run(s, r.then)
  expect(s.canceledAttack).toBe('foe')
  expect(s.enemies.foe!.damageTaken).toBe(ghoul.damage)
  expect(me(s).resources).toBe(17)
})
it('Astral Travel reaches a revealed disconnected location and resolves a safe token', () => {
  const b = playerCardBehavior('03034')!
  let s = start()
  s = {
    ...s,
    chaosBag: [0],
    locations: {
      ...s.locations,
      B: { ...s.locations.A!, id: 'B', name: 'Remote', revealed: true, connections: [] },
    },
  }
  s = run(s, b.play!(s, 'a'))
  s = choose(s, 'choice.pilotMove', { location: 'Remote' })
  expect(me(s).location).toBe('B')
  expect(me(s).damage).toBe(0)
})
it('Vamp selects one skill and resolves its test before the next choice', () => {
  const b = playerCardBehavior('10074')!
  let s = foe(start())
  s = run(s, b.play!(s, 'a'))
  s = choose(s, 'choice.chargedSkill', { skill: 'combat' })
  s = choose(s, 'choice.chargedSkill', { skill: 'combat' })
  expect(s.enemies.foe!.damageTaken).toBe(2)
  expect(s.skillTest).toBeNull()
})
it('Vamp 3 chooses its skills before testing and does not repeat them', () => {
  const b = playerCardBehavior('10081')!
  let s = foe(start())
  s = run(s, b.play!(s, 'a'))
  s = choose(s, 'choice.chargedSkill', { skill: 'combat' })
  expect(s.pending?.question).toMatchObject({
    choices: expect.not.arrayContaining([expect.objectContaining({ params: { skill: 'combat' } })]),
  })
  s = choose(s, 'choice.chargedSkill', { skill: 'willpower' })
  s = choose(s, 'choice.chargedVampDone')
  s = choose(s, 'choice.chargedSkill', { skill: 'willpower' })
  s = choose(s, 'choice.chargedSkill', { skill: 'combat' })
  expect(s.enemies.foe).toMatchObject({ doom: 0, damageTaken: 2 })
  expect(s.skillTest).toBeNull()
})
it('Katana optional exact-margin bonus increases the attack damage and exhausts the blade', () => {
  let s = withAsset(
    foe(
      patch({ hand: ['01093'], skills: { combat: 2, agility: 2, intellect: 2, willpower: 2 } })(
        start(),
      ),
    ),
    '10021',
  )
  s = activate(s, options(s, '10021')[0]!)
  const t = s.skillTest!
  s = { ...s, skillTest: { ...t, difficulty: 2, tokenModifier: 0 } }
  const b = playerCardBehavior('10021')!,
    a = s.assets['10021']!
  const r = b.reactions!(s, { type: 'whenWouldSucceed', investigator: 'a' }, a)
  expect(r).toHaveLength(1)
  const next = run(s, r[0]!.then)
  expect(next.assets['10021']!.exhausted).toBe(true)
  expect(next.skillTest!.kind).toMatchObject({ extraDamage: 2 })
  expect(
    b.reactions!(
      { ...s, skillTest: { ...s.skillTest!, difficulty: 1 } },
      { type: 'whenWouldSucceed', investigator: 'a' },
      a,
    ),
  ).toEqual([])
})
it.each(['09103', '11085'])(
  '%s uses the discarded copy even with another in hand, and putting into play is permitted',
  (code) => {
    const s = patch({ hand: [code], discard: [code] })(start())
    expect(canPlayByEffect(s, 'a', code, 'hand')).toBe(false)
    expect(canPlayByEffect(s, 'a', code, 'discard')).toBe(true)
    const played = dispatch(s, { type: 'PlayCard', investigator: 'a', code })
    expect(me(played).hand).toContain(code)
    expect(me(played).discard).not.toContain(code)
    expect(me(played).resources).toBe(20 - playerCardDef(code)!.cost!)
    expect(Object.values(played.assets).some((a) => a.code === code)).toBe(true)
    const put = dispatch(patch({ hand: [code] })(start()), {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code,
      fromHand: true,
    })
    expect(Object.values(put.assets).some((a) => a.code === code)).toBe(true)
  },
)
it.each(['08120', '08121', '08122', '08123', '08124'])(
  '%s restricts payment and boosts to its own matching card',
  (code) => {
    const matches: Record<string, string> = {
      '08120': '02153',
      '08121': '03025',
      '08122': '10065',
      '08123': '05154',
      '08124': '02269',
    }
    const s = withAsset(withAsset(start(), code), matches[code]!)
    const b = playerCardBehavior(code)!,
      a = s.assets[code]!
    expect(b.usesAsResources!(s, a, 'a', matches[code]!)).toBe(true)
    expect(b.usesAsResources!(s, a, 'b', matches[code]!)).toBe(false)
    expect(b.usesAsResources!(s, a, 'a', '01093')).toBe(false)
    const t = {
      investigator: 'a',
      skill: 'combat',
      source: matches[code]!,
      effectSource: '01093',
      baseModifier: 0,
    } as never
    const boosts = b.testOptions!(s, t, a)
    expect(boosts).toHaveLength(1)
    const next = run({ ...s, skillTest: t }, boosts[0]!.then)
    expect(next.assets[code]!.uses).toBe(1)
    expect(next.skillTest!.baseModifier).toBe(1)
  },
)
it('Glyph translation records the campaign note, including when charges are added externally', () => {
  const s = { ...withAsset(start(), '03025', { uses: 2 }), campaignLog: emptyCampaignLog(['a']) }
  const next = dispatch(s, { type: 'AddUses', asset: '03025', amount: 1 })
  expect(next.campaignLog!.notes).toContain('translatedGlyphs')
})
it('Timeworn Brand has distinct attacks and shares its legendary maximum across copies', () => {
  let s = withAsset(foe(start(), 4), '04276')
  s = { ...s, enemies: { foe: { ...s.enemies.foe!, traits: ['Elite'] } } }
  const normal = options(s, '04276')[0]!,
    legend = options(s, '04276')[1]!
  expect(normal.then[0]).toMatchObject({ modifier: 2, kind: { extraDamage: 1 } })
  s = activate(s, legend)
  expect(s.enemies.foe).toBeUndefined()
  expect(me(s).hand).toHaveLength(3)
  expect(withinLimit(s, legend.key, 'a', legend.limit)).toBe(false)
  expect(withinLimit(s, legend.key, 'b', legend.limit)).toBe(true)
  expect(
    options(withAsset(s, '04276', { id: 'other' }), '04276').every((o) => o.key !== normal.key),
  ).toBe(true)
})
it('Katana offers a fast agility attack without an action cost', () => {
  let s = withAsset(foe(start()), '10021')
  const o = options(s, '10021')[1]!
  expect(o.actions).toBe(0)
  s = activate(s, o)
  expect(me(s).actionsRemaining).toBe(3)
  expect(s.assets['10021']!.exhausted).toBe(true)
  expect(s.enemies.foe!.damageTaken).toBe(1)
})
it.each(['10074', '10081'])(
  '%s resolves each successful skill effect against the chosen enemy',
  (code) => {
    const b = playerCardBehavior(code)!
    let s = foe(start())
    s = run(s, b.effect!(s, 'a', 'result', { enemy: 'foe', skill: 'willpower' }))
    expect(s.enemies.foe!.doom).toBe(0)
    s = run(s, b.effect!(s, 'a', 'result', { enemy: 'foe', skill: 'combat' }))
    expect(s.enemies.foe!.damageTaken).toBe(2)
    s = { ...s, locations: { ...s.locations, A: { ...s.locations.A!, clues: 2 } } }
    s = run(s, b.effect!(s, 'a', 'result', { enemy: 'foe', skill: 'intellect' }))
    expect(me(s).clues).toBe(1)
  },
)
it('Hypnotic Gaze only reflects damage on a symbol', () => {
  const b = playerCardBehavior('02153')!,
    s = foe(start())
  expect(b.effect!(s, 'a', 'token', { enemy: 'foe', damage: 3, token: 0 })).toEqual([])
  const next = run(s, b.effect!(s, 'a', 'token', { enemy: 'foe', damage: 3, token: 'skull' }))
  expect(next.enemies.foe!.damageTaken).toBe(3)
  expect(
    b.handReactions!(
      { ...s, canceledAttack: 'foe' },
      { type: 'whenEnemyAttacks', enemy: 'foe', investigator: 'a' },
      'a',
    ),
  ).toEqual([])
})
it('Astral Travel requires an Item or Ally on a bad token, or deals damage when none can be discarded', () => {
  const b = playerCardBehavior('03034')!
  let s = start()
  s = run(s, b.effect!(s, 'a', 'token', { token: 'skull' }))
  expect(me(s).damage).toBe(1)
  s = withAsset(start(), '10021')
  s = run(s, b.effect!(s, 'a', 'token', { token: 'skull' }))
  s = choose(s, 'choice.chargedTrash', { card: playerCardDef('10021')!.name })
  expect(s.assets['10021']).toBeUndefined()
  expect(me(s).damage).toBe(0)
})
const start = (): GameState =>
  patch({
    hand: [],
    resources: 20,
    skills: { combat: 10, agility: 10, intellect: 10, willpower: 10 },
  })({ ...game(), pending: null, queue: [] })
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const run = (s: GameState, ms: Message[]) => ms.reduce((s, m) => dispatch(s, m), clear(s))
const foe = (s: GameState, health = 20): GameState => ({
  ...s,
  enemies: {
    foe: {
      ...ghoul,
      id: 'foe',
      location: 'A',
      engagedWith: 'a',
      health,
      maxHealth: health,
      damageTaken: 0,
      exhausted: false,
      doom: 1,
      traits: ['Humanoid'],
    },
  },
})
const activate = (s: GameState, o: AbilityOption) =>
  dispatch(clear(s), {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    ...(o.costs ? { costs: o.costs } : {}),
    ...(o.limit ? { limit: o.limit } : {}),
    then: o.then,
  })
const options = (s: GameState, code: string) =>
  playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a')
it.each(['09082', '09096'])(
  '%s deals powered damage, adds doom, and clears doom only on an unpowered defeat',
  (code) => {
    let s = withAsset(foe(start()), code, { doom: 2 })
    s = activate(
      s,
      options(s, code).find(
        (o) => o.params?.skill === 'combat' && o.label === 'choice.chargedDoom',
      )!,
    )
    expect(s.enemies.foe!.damageTaken).toBe(2)
    expect(s.assets[code]).toMatchObject({ doom: 3, exhausted: true })
    s = withAsset(foe(start(), 1), code, { doom: 3, exhausted: true })
    s = activate(s, options(s, code)[0]!)
    expect(s.enemies.foe).toBeUndefined()
    expect(s.assets[code]!.doom).toBe(code === '09096' ? 0 : 2)
    expect(s.assets[code]!.exhausted).toBe(code !== '09096')
  },
)
it.each(['09085', '09098'])('%s clears doom after an unpowered evade succeeding by two', (code) => {
  let s = withAsset(foe(start()), code, { doom: 3, exhausted: true })
  s = activate(s, options(s, code)[0]!)
  expect(s.enemies.foe!.exhausted).toBe(true)
  expect(s.assets[code]!.doom).toBe(code === '09098' ? 0 : 2)
  expect(s.assets[code]!.exhausted).toBe(code !== '09098')
})
it('Chalice removes doom after healing the last damage; powered healing adds doom and heals two', () => {
  let s = withAsset(patch({ damage: 1 })(start()), '09084', { doom: 2 })
  s = activate(s, options(s, '09084')[0]!)
  expect(me(s).damage).toBe(0)
  expect(s.assets['09084']!.doom).toBe(1)
  s = withAsset(patch({ damage: 3 })(start()), '09084')
  s = activate(
    s,
    options(s, '09084').find((o) => o.params?.n === 2)!,
  )
  expect(me(s).damage).toBe(1)
  expect(s.assets['09084']).toMatchObject({ doom: 1, exhausted: true })
})
it.each(['09083', '09097'])(
  '%s removes doom when its unpowered investigation takes the last clue',
  (code) => {
    let s = withAsset(start(), code, { doom: 3, exhausted: true })
    s = { ...s, locations: { ...s.locations, A: { ...s.locations.A!, clues: 1 } } }
    s = activate(s, options(s, code)[0]!)
    expect(me(s).clues).toBe(1)
    expect(s.assets[code]!.doom).toBe(code === '09097' ? 0 : 2)
  },
)
it.each(['10065', '10077'])('%s actually spends ammunition and inflicts two damage', (code) => {
  let s = withAsset(foe(start()), code)
  s = activate(s, options(s, code)[1]!)
  expect(s.assets[code]!.uses).toBe(2)
  expect(s.enemies.foe!.damageTaken).toBe(2)
})
it.each(['10066', '10082'])(
  '%s successful Parley discovers a clue with its level-specific suspicion',
  (code) => {
    let s = withAsset(foe(start()), code)
    s = { ...s, locations: { ...s.locations, A: { ...s.locations.A!, clues: 2 } } }
    s = activate(s, options(s, code)[0]!)
    expect(me(s).clues).toBe(1)
    expect(s.assets[code]!.uses).toBe(code === '10066' ? 1 : 0)
  },
)
it.each(['04026', '53005'])(
  '%s gains a charge for a local defeat and converts charges into cards and resources',
  (code) => {
    let s = withAsset(foe(start()), code, { uses: 2 })
    const b = playerCardBehavior(code)!
    const r = b.reactions!(s, { type: 'enemyDefeated', enemy: s.enemies.foe! }, s.assets[code]!)
    s = run(s, r[0]!.then)
    expect(s.assets[code]!.uses).toBe(3)
    const before = me(s).resources
    s = activate(s, options(s, code)[0]!)
    if (code === '53005') s = choose(s, 'choice.chargedGain', { n: 3 })
    const n = code === '53005' ? 3 : 1
    expect(me(s).resources).toBe(before + n)
    expect(me(s).hand).toHaveLength(n)
    expect(s.assets[code]!.uses).toBe(3 - n)
  },
)
it('Camera evidence grants its three different thresholds and is keyed per location', () => {
  let s = withAsset(start(), '05154')
  const b = playerCardBehavior('05154')!
  const r = b.reactions!(
    s,
    { type: 'afterDiscoverClues', investigator: 'a', location: 'A', last: true, amount: 1 },
    s.assets['05154']!,
  )
  expect(r[0]).toMatchObject({ key: '05154:evidence:A', limit: { per: 'game' } })
  s = run(s, r[0]!.then)
  expect(s.assets['05154']!.uses).toBe(1)
  expect(b.skillModifier!(s, s.assets['05154']!, { skill: 'willpower' } as never)).toBe(1)
  expect(b.skillModifier!(s, s.assets['05154']!, { skill: 'intellect' } as never)).toBe(0)
  s = withAsset(s, '05154', { uses: 3 })
  expect(typeof b.ownerVitals === 'function' && b.ownerVitals(s, s.assets['05154']!)).toEqual({
    sanity: 1,
  })
})
it('Jewel triggers on local symbols, exhausts and grants the selected resources', () => {
  let s = withAsset(start(), '02269')
  const b = playerCardBehavior('02269')!
  expect(
    b.reactions!(
      s,
      { type: 'afterRevealChaosToken', investigator: 'a', token: 0 },
      s.assets['02269']!,
    ),
  ).toEqual([])
  s = run(
    s,
    b.reactions!(
      s,
      { type: 'afterRevealChaosToken', investigator: 'a', token: 'skull' },
      s.assets['02269']!,
    )[0]!.then,
  )
  s = choose(s, 'choice.gainResources', { n: 2 })
  expect(me(s).resources).toBe(22)
  expect(s.assets['02269']!.exhausted).toBe(true)
})
it('End of the Road grants all three effects and removes itself from discard', () => {
  const b = playerCardBehavior('09104')!
  let s = patch({ discard: ['09104'] })(start())
  expect(b.canPlay!({ ...s, agendaIndex: s.agendas.length - 1 }, 'a')).toBe(true)
  expect(b.canPlay!({ ...s, activeTurn: 'b' }, 'a')).toBe(false)
  s = run(s, b.play!(s, 'a'))
  expect(me(s).hand).toHaveLength(1)
  expect(me(s).resources).toBe(21)
  expect(me(s).actionsRemaining).toBe(4)
  expect(me(s).discard).not.toContain('09104')
})
