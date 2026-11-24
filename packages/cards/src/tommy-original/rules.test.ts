// RR: Defeat, Reaction Opportunities, Moving Damage/Horror, Control/Ownership, Fast and Myriad.
import { expect, it } from 'vitest'
import {
  availableAbilities,
  playableCards,
  dispatch,
  investigatorBehavior,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  type GameState,
  type Investigator,
  type Message,
} from '@lcg/engine'
import { choose, ghoul, newTestGame, spawnAt, throughSetup } from '@lcg/engine/testing'
import '../index'
const me = (s: GameState) => s.investigators[0]!
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const patch = (s: GameState, p: Partial<Investigator>): GameState => ({
  ...s,
  investigators: s.investigators.map((i, n) => (n ? i : { ...i, ...p })),
})
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
function game() {
  const s = clear(throughSetup(newTestGame({ players: ['06001', 'b'] })))
  return patch(
    { ...s, interactive: true, activeTurn: '06001', phase: 'investigation', chaosBag: [0] },
    {
      skills: playerCardDef('06001')!.skills!,
      hand: ['01093'],
      discard: [],
      deck: ['01088', '01087', '01089'],
      damage: 0,
      horror: 0,
      resources: 5,
      actionsRemaining: 3,
    },
  )
}
const put = (s: GameState, code: string, by = '06001') =>
  run(s, { type: 'PutAssetIntoPlay', investigator: by, code })
const asset = (s: GameState, code = '01018') =>
  Object.values(s.assets).find((a) => a.code === code)!
const hurt = (s: GameState, code = '01018', damage = 2, horror = 1) =>
  run(s, { type: 'DamageAsset', asset: asset(s, code).id, damage, horror })
const recover = (s: GameState) => choose(s, 'ability.tommyRecover')

it('offers the defeated physical asset before disposal, gains all its damage/horror and shuffles it', () => {
  let s = put(game(), '01018')
  const id = asset(s).id
  s = hurt(s)
  expect(s.assets[id]).toMatchObject({ damage: 2, horror: 1 })
  expect(me(s).discard).not.toContain('01018')
  s = recover(s)
  expect(me(s).resources).toBe(8)
  expect(s.assets[id]).toBeUndefined()
  expect(me(s).deck.filter((c) => c === '01018')).toHaveLength(1)
  expect(me(s).discard).not.toContain('01018')
})
it('can decline recovery, leaving ordinary defeat disposal intact', () => {
  let s = hurt(put(game(), '01018'))
  s = choose(s, 'choice.skip')
  expect(me(s).resources).toBe(5)
  expect(me(s).discard).toContain('01018')
})
it('does not react to ordinary discard or to another investigator’s defeated asset', () => {
  let s = put(game(), '01018')
  s = run(s, { type: 'DiscardAsset', asset: asset(s).id })
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.tommyRecover')).not.toBe(true)
  s = hurt(put(game(), '01018', 'b'))
  expect(me(s).resources).toBe(5)
  expect(s.investigators[1]!.discard).toContain('01018')
})
it('recovers the defeated controlled copy into its owner’s deck without touching an earlier discard', () => {
  let s = put(patch(game(), { discard: ['01018'] }), '01018')
  const a = asset(s)
  s = { ...s, assets: { ...s.assets, [a.id]: { ...a, originalOwner: 'b' } } }
  s = recover(hurt(s))
  expect(me(s).discard).toEqual(['01018'])
  expect(s.investigators[1]!.deck).toContain('01018')
  expect(me(s).deck).not.toContain('01018')
})
it.each([0, 1, 3])('Becky replaces exactly %i resources with ammo', (ammo) => {
  let s = put(put(game(), '06006'), '01018')
  s = choose(recover(hurt(s)), 'choice.tommyAmmo', { n: ammo })
  expect(asset(s, '06006').uses).toBe(2 + ammo)
  expect(me(s).resources).toBe(8 - ammo)
  expect(me(s).deck).toContain('01018')
})
it('does not react when a forced defeat replacement exiles an asset', () => {
  let s = put(game(), '01072')
  const a = asset(s, '01072')
  const before = playerCardBehavior('01072')!
  registerPlayerCard({
    ...before,
    whenDefeated: (_s, a) => [
      { type: 'ExileCard', investigator: a.owner, code: a.code, asset: a.id },
    ],
  })
  try {
    s = run(s, { type: 'DamageAsset', asset: a.id, damage: 2, horror: 0 })
    expect(s.pending?.question.choices.some((c) => c.label === 'ability.tommyRecover')).not.toBe(
      true,
    )
    expect(me(s).resources).toBe(5)
  } finally {
    registerPlayerCard(before)
  }
})
it('moves up to two different token kinds to one asset without healing', () => {
  let s = patch(put(game(), '01018'), { damage: 2, horror: 2 })
  s = run(s, ...investigatorBehavior('06001')!.elderSign!(s, me(s)).immediate!)
  s = choose(s, 'choice.tommyToAsset')
  s = choose(s, 'choice.tommyMove', { kind: 'damage' })
  s = choose(s, 'choice.tommyMove', { kind: 'horror' })
  expect(me(s)).toMatchObject({ damage: 1, horror: 1 })
  expect(asset(s)).toMatchObject({ damage: 1, horror: 1 })
})
it('moves tokens from the chosen asset to Tommy and can stop after one', () => {
  let s = put(game(), '01018')
  const a = asset(s)
  s = { ...s, assets: { ...s.assets, [a.id]: { ...a, damage: 1, horror: 1 } } }
  s = run(s, ...investigatorBehavior('06001')!.elderSign!(s, me(s)).immediate!)
  s = choose(s, 'choice.tommyFromAsset')
  s = choose(s, 'choice.tommyMove', { kind: 'horror' })
  s = choose(s, 'choice.skip')
  expect(me(s)).toMatchObject({ damage: 0, horror: 1 })
  expect(asset(s)).toMatchObject({ damage: 1, horror: 0 })
})
it('moving lethal damage defeats the asset and opens Tommy’s recovery', () => {
  let s = patch(put(game(), '01072'), { damage: 2 })
  s = run(s, ...investigatorBehavior('06001')!.elderSign!(s, me(s)).immediate!)
  s = choose(s, 'choice.tommyToAsset')
  s = choose(s, 'choice.tommyMove', { kind: 'damage' })
  s = choose(s, 'choice.tommyMove', { kind: 'damage' })
  s = recover(s)
  expect(me(s).deck).toContain('01072')
  expect(me(s).damage).toBe(0)
  expect(me(s).resources).toBe(7)
})
it('Becky occupies two hands, spends ammo and deals two damage with +2 combat', () => {
  let s = put(game(), '06006')
  expect(playerCardDef('06006')!.slots).toEqual(['hand', 'hand'])
  s = run(s, spawnAt('A', { ...ghoul, health: 5 }, '06001'))
  const e = Object.values(s.enemies)[0]!,
    a = asset(s, '06006')
  const o = availableAbilities(s, '06001').find((o) => o.key === a.id + ':fight')!
  s = run(s, ...o.costs!, ...o.then)
  expect(a.uses).toBe(2)
  expect(asset(s, '06006').uses).toBe(1)
  expect(s.skillTest).toMatchObject({ baseModifier: 2, kind: { type: 'fight', extraDamage: 1 } })
  s = choose(s, 'choice.revealToken')
  if (s.pending?.question.choices.some((c) => c.label === 'choice.applyResults'))
    s = choose(s, 'choice.applyResults')
  expect(s.enemies[e.id]!.damageTaken).toBe(2)
  s = { ...s, assets: { ...s.assets, [a.id]: { ...s.assets[a.id]!, uses: 0 } } }
  expect(availableAbilities(s, '06001').some((o) => o.key === a.id + ':fight')).toBe(false)
})
it('Rookie Mistake discards all damaged/horrified assets without rewarding Tommy', () => {
  let s = put(put(put(game(), '01018'), '01072'), '01019')
  const cop = asset(s),
    coat = asset(s, '01072')
  s = {
    ...s,
    assets: { ...s.assets, [cop.id]: { ...cop, horror: 1 }, [coat.id]: { ...coat, damage: 1 } },
  }
  s = run(s, { type: 'ResolveWeakness', investigator: '06001', code: '06007' })
  expect(s.assets[cop.id]).toBeUndefined()
  expect(s.assets[coat.id]).toBeUndefined()
  expect(asset(s, '01019')).toBeDefined()
  expect(me(s).discard).toEqual(expect.arrayContaining(['01018', '01072', '06007']))
  expect(me(s).resources).toBe(5)
})
it('Rookie Mistake shuffles back when nothing was actually discarded', () => {
  const s = run(game(), { type: 'ResolveWeakness', investigator: '06001', code: '06007' })
  expect(me(s).deck.filter((c) => c === '06007')).toHaveLength(1)
  expect(me(s).discard).not.toContain('06007')
  expect(Object.values(s.treacheries).some((t) => t.code === '06007')).toBe(false)
})
it('Solemn Vow enters directly under a local teammate’s control, retaining its owner', () => {
  let s = patch(game(), { hand: ['06020'] })
  s = run(s, { type: 'PlayCard', investigator: '06001', code: '06020', byEffect: true })
  s = choose(s, 'choice.solemnController')
  expect(asset(s, '06020')).toMatchObject({ owner: 'b', originalOwner: '06001' })
  expect(me(s).hand).toEqual([])
})
it('Solemn Vow is unplayable without another investigator at the location', () => {
  const s = game()
  const remote = {
    ...s,
    investigators: s.investigators.map((i, n) => (n ? { ...i, location: 'B' } : i)),
  }
  expect(playerCardBehavior('06020')!.canPlay!(remote, '06001')).toBe(false)
})
it('Solemn Vow can be played in a player window during another investigator’s turn', () => {
  const s = patch({ ...game(), activeTurn: 'b' }, { hand: ['06020'] })
  expect(playableCards(s, '06001', true)).toContain('06020')
})
it.each(['damage', 'horror'] as const)(
  'the controller moves %s to a card the owner controls; exhaustion and locality limit reuse',
  (kind) => {
    let s = patch(game(), { hand: ['06020'] })
    s = choose(
      run(s, { type: 'PlayCard', investigator: '06001', code: '06020', byEffect: true }),
      'choice.solemnController',
    )
    s = put(s, '01018')
    s = { ...s, investigators: s.investigators.map((i, n) => (n ? { ...i, [kind]: 1 } : i)) }
    const a = asset(s, '06020'),
      cop = asset(s)
    const o = availableAbilities(s, 'b').find(
      (o) => o.params?.to === cardName(cop.code) && o.params?.kind === kind,
    )!
    expect(o).toBeDefined()
    s = run(s, ...o.then)
    expect(s.investigators[1]![kind]).toBe(0)
    expect(s.assets[cop.id]![kind]).toBe(1)
    expect(s.assets[a.id]!.exhausted).toBe(true)
    expect(availableAbilities(s, 'b').some((o) => o.key === a.id + ':vow')).toBe(false)
  },
)
const cardName = (code: string) => playerCardDef(code)!.name
it('allows the original owner to use a Vow they now control, moving between distinct own cards', () => {
  let s = patch(put(put(game(), '06020'), '01018'), { damage: 1 })
  const vow = asset(s, '06020'),
    cop = asset(s)
  const o = availableAbilities(s, '06001').find(
    (o) =>
      o.key === vow.id + ':vow' &&
      o.params?.to === cardName(cop.code) &&
      o.params?.kind === 'damage',
  )!
  expect(o).toBeDefined()
  s = run(s, ...o.then)
  expect(me(s).damage).toBe(0)
  expect(s.assets[cop.id]!.damage).toBe(1)
})
it('rewards a defeated expedition partner but never shuffles that companion into a player deck', () => {
  let s = run(
    game(),
    { type: 'InitializeExpedition' },
    { type: 'SelectExpeditionPartner', investigator: '06001', partner: '08714' },
  )
  const partner = Object.values(s.assets).find((a) => a.expeditionPartner === '08714')!
  expect(partner).toBeDefined()
  s = run(s, {
    type: 'DamageAsset',
    asset: partner.id,
    damage: playerCardDef(partner.code)!.health!,
    horror: 0,
  })
  s = recover(s)
  expect(me(s).resources).toBe(5 + playerCardDef(partner.code)!.health!)
  expect(s.assets[partner.id]).toBeUndefined()
  expect(me(s).deck).not.toContain('08714')
  expect(s.campaignLog!.expedition!.partners['08714']!.status).toBe('eliminated')
})
it('Solemn Vow attributes playing the card to its player rather than its new controller', () => {
  const prior = playerCardBehavior('01019')!,
    actors: string[] = []
  registerPlayerCard({
    ...prior,
    reactions: (_s, t) => {
      if (t.type === 'afterPlayAsset' && t.code === '06020') actors.push(t.investigator)
      return []
    },
  })
  try {
    let s = patch(put(game(), '01019'), { hand: ['06020'] })
    s = choose(
      run(s, { type: 'PlayCard', investigator: '06001', code: '06020', byEffect: true }),
      'choice.solemnController',
    )
    expect(asset(s, '06020').owner).toBe('b')
    expect(actors).toEqual(['06001'])
  } finally {
    registerPlayerCard(prior)
  }
})
it('Rookie Mistake shuffles back when a damaged asset cannot leave play', () => {
  const before = playerCardBehavior('01072')!
  registerPlayerCard({ ...before, cannotLeavePlay: () => true })
  try {
    let s = put(game(), '01072')
    const a = asset(s, '01072')
    s = { ...s, assets: { ...s.assets, [a.id]: { ...a, damage: 1 } } }
    s = run(s, { type: 'ResolveWeakness', investigator: '06001', code: '06007' })
    expect(s.assets[a.id]).toBeDefined()
    expect(me(s).deck).toContain('06007')
    expect(me(s).discard).not.toContain('06007')
  } finally {
    registerPlayerCard(before)
  }
})
