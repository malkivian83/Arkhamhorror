// RR: Investigate, As If, Cannot, Evade, Fast Abilities, Costs, Then, Weaknesses.
import { expect, it } from 'vitest'
import {
  dispatch,
  investigatorBehavior,
  playerCardBehavior,
  playerCardDef,
  playableCards,
  skillTestValue,
  registerPlayerCards,
  registerPlayerCard,
  registerScenario,
  getInvestigator,
  type GameState,
  type Investigator,
  type Message,
} from '@lcg/engine'
import { choose, ghoul, newTestGame, spawnAt, throughSetup } from '@lcg/engine/testing'
import '../index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const me = (s: GameState) => s.investigators[0]!
const patch = (s: GameState, p: Partial<Investigator>): GameState => ({
  ...s,
  investigators: s.investigators.map((i, n) => (n ? i : { ...i, ...p })),
})
function game(code = '07003'): GameState {
  const s = clear(throughSetup(newTestGame({ players: [code, 'b'] }))),
    d = playerCardDef(code)!
  return patch(
    {
      ...s,
      activeTurn: code,
      interactive: true,
      phase: 'investigation',
      chaosBag: [0],
      locations: Object.fromEntries(
        Object.entries(s.locations).map(([k, l]) => [k, { ...l, revealed: true, clues: 5 }]),
      ),
    },
    {
      skills: d.skills!,
      health: d.health!,
      sanity: d.sanity!,
      hand: [],
      discard: [],
      deck: ['01088', '01089', '01090'],
      resources: 10,
      damage: 0,
      horror: 0,
      actionsRemaining: 3,
    },
  )
}
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const put = (s: GameState, code: string) =>
  run(s, { type: 'PutAssetIntoPlay', investigator: me(s).id, code })
const enemy = (s: GameState) => Object.values(s.enemies)[0]!
const foe = (s = game(), location = 'A') => run(s, spawnAt(location, { ...ghoul, health: 6 }, null))
const discover = (s: GameState, location = 'A', investigating = false) =>
  run(s, { type: 'DiscoverClues', investigator: me(s).id, location, amount: 1, investigating })
const test = (s: GameState, skill: 'willpower' | 'intellect' = 'willpower', source?: string) =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: me(s).id,
    skill,
    ...(source ? { source } : {}),
    difficulty: 1,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const has = (s: GameState, label: string) =>
  !!s.pending?.question.choices.some((c) => c.label === label)

it('Trish chooses one additional clue after discovering clues with an enemy, once per round', () => {
  let s = choose(discover(foe()), 'ability.trishClues')
  s = choose(s, 'choice.trishClue')
  expect(me(s).clues).toBe(2)
  expect(has(discover(s), 'ability.trishClues')).toBe(false)
})

it('Trish can evade an enemy at the discovery location without being there or engaged, including after the last clue', () => {
  let s = foe(game(), 'B')
  const e = enemy(s)
  s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, clues: 1 } } }
  s = choose(discover(s, 'B'), 'ability.trishClues')
  expect(has(s, 'choice.trishClue')).toBe(false)
  s = choose(s, 'choice.trishEvade')
  expect(s.enemies[e.id]!.exhausted).toBe(true)
  expect(me(s).location).toBe('A')
})

it('Trish does not react to another investigator or a discovery with no enemy', () => {
  expect(has(discover(game()), 'ability.trishClues')).toBe(false)
  const s = foe(),
    b = investigatorBehavior('07003')!
  expect(
    b.reactions!(
      s,
      { type: 'afterDiscoverClues', investigator: 'b', location: 'A', amount: 1 },
      me(s),
    ),
  ).toEqual([])
})

it('Shadow Agents blocks non-investigation discoveries for whoever is engaged, even exhausted, then is discarded after any evasion', () => {
  let s = run(game(), { type: 'ResolveWeakness', investigator: '07003', code: '07011' })
  const e = enemy(s)
  s = { ...s, enemies: { [e.id]: { ...e, exhausted: true } } }
  expect(me(discover(s)).clues).toBe(0)
  s = discover(s, 'A', true)
  expect(me(s).clues).toBe(1)
  s = choose(s, 'ability.trishClues')
  expect(has(s, 'choice.trishClue')).toBe(false)
  s = choose(s, 'choice.trishEvade')
  expect(s.enemies[e.id]).toBeUndefined()
  expect(me(s).discard).toContain('07011')
  expect(s.victoryDisplay).not.toContain('07011')
  let other = run(game(), { type: 'ResolveWeakness', investigator: '07003', code: '07011' })
  other = { ...other, enemies: { [enemy(other).id]: { ...enemy(other), engagedWith: 'b' } } }
  other = run(other, { type: 'DiscoverClues', investigator: 'b', location: 'A', amount: 1 })
  expect(other.investigators[1]!.clues).toBe(0)
})

it('Trish elder sign relocates the whole investigation until its end, changes shroud and restores physical positions without moving', () => {
  registerScenario({
    id: 'trish-end-location',
    forced: (s, t) =>
      t.type === 'skillTestEnded'
        ? [
            {
              type: 'SetScenarioMeta',
              key: 'endedAt',
              value: getInvestigator(s, t.investigator).location ?? '',
            },
          ]
        : [],
  })
  let s = foe()
  const e = enemy(s)
  s = {
    ...s,
    scenarioId: 'trish-end-location',
    chaosBag: ['elderSign'],
    enemies: { [e.id]: { ...e, engagedWith: '07003' } },
  }
  s = run(s, {
    type: 'BeginSkillTest',
    investigator: '07003',
    skill: 'intellect',
    difficulty: 2,
    kind: { type: 'investigate', location: 'A' },
  })
  const effect = investigatorBehavior('07003')!.elderSign!(s, me(s))
  expect(effect.modifier).toBe(2)
  s = choose(choose(s, 'choice.revealToken'), 'choice.trishInvestigate', {
    location: s.locations.B!.name,
  })
  expect(me(s).location).toBe('B')
  expect(s.enemies[e.id]!.location).toBe('B')
  expect(s.skillTest?.kind).toMatchObject({ location: 'B' })
  expect(s.skillTest?.difficulty).toBe(3)
  expect(s.asIfLocations).toHaveLength(1)
  s = choose(s, 'choice.applyResults')
  if (has(s, 'ability.trishClues')) s = choose(s, 'choice.skip')
  expect(me(s).location).toBe('A')
  expect(s.enemies[e.id]).toMatchObject({ location: 'A', engagedWith: '07003' })
  expect(s.asIfLocations).toBeUndefined()
  expect(s.scenarioMeta?.endedAt).toBe('A')
  expect(s.locations.B!.clues).toBe(4)
  expect(me(s).actionsRemaining).toBe(3)
  expect(s.log.some((l) => l.key === 'log.move')).toBe(false)
})

it('In the Shadows is only offered after her turn begins; it blocks engagement and damage through the round', () => {
  let s = patch(foe(), { hand: ['07010'] })
  const e = enemy(s)
  s = { ...s, enemies: { [e.id]: { ...e, engagedWith: '07003' } } }
  expect(playableCards(s, '07003', true)).not.toContain('07010')
  s = run(s, { type: 'Forced', trigger: { type: 'turnBegins', investigator: '07003' } })
  s = choose(s, 'ability.playCard', { card: playerCardDef('07010')!.name })
  expect(s.enemies[e.id]!.engagedWith).toBeNull()
  s = run(
    s,
    { type: 'EngageEnemy', enemy: e.id, investigator: '07003' },
    { type: 'DamageEnemy', enemy: e.id, by: '07003', amount: 2 },
  )
  expect(s.enemies[e.id]!.engagedWith).toBeNull()
  expect(s.enemies[e.id]!.damageTaken).toBe(0)
  s = run(
    { ...s, round: s.round + 1 },
    { type: 'EngageEnemy', enemy: e.id, investigator: '07003' },
    { type: 'DamageEnemy', enemy: e.id, by: '07003', amount: 1 },
  )
  expect(s.enemies[e.id]!.engagedWith).toBe('07003')
  expect(s.enemies[e.id]!.damageTaken).toBe(1)
})

function swap(s: GameState, card: string) {
  s = run(s, { type: 'PlayerWindow', investigator: '07004' })
  return choose(s, 'ability.dexterSwap', {
    discard: playerCardDef(Object.values(s.assets)[0]!.code)!.name,
    card: playerCardDef(card)!.name,
  })
}
it('Dexter discards an asset to play a differently titled asset at -1 cost, without action or opportunity, once per round', () => {
  let s = put(patch(foe(game('07004')), { hand: ['01020'], resources: 2 }), '01087')
  s = swap(s, '01020')
  expect(me(s).discard).toContain('01087')
  expect(Object.values(s.assets).map((a) => a.code)).toContain('01020')
  expect(me(s)).toMatchObject({ resources: 0, actionsRemaining: 3, damage: 0 })
  expect(investigatorBehavior('07004')!.fastOptions!({ ...s, activeTurn: 'b' }, me(s))).toEqual([])
  expect(has(run(s, { type: 'PlayerWindow', investigator: '07004' }), 'ability.dexterSwap')).toBe(
    false,
  )
})

it('Dexter cannot exchange an asset for the same title, a permanent or an unaffordable asset', () => {
  let s = put(patch(game('07004'), { hand: ['01087', '01020'], resources: 0 }), '01087')
  expect(investigatorBehavior('07004')!.fastOptions!(s, me(s))).toEqual([])
  s = put(patch(game('07004'), { hand: ['01020'], resources: 5 }), '02158')
  expect(playerCardBehavior('02158')?.permanent).toBeDefined()
  expect(investigatorBehavior('07004')!.fastOptions!(s, me(s))).toEqual([])
})

it('a replaced discard cannot pay Dexter cost or play the target', () => {
  registerPlayerCards([
    {
      code: 'dexter-return',
      name: 'Returning asset',
      type: 'asset',
      class: 'neutral',
      traits: [],
      cost: 0,
    },
  ])
  registerPlayerCard({
    code: 'dexter-return',
    leavesPlay: (_s, a, reason) =>
      reason === 'discard' ? [{ type: 'ReturnAssetToHand', asset: a.id }] : null,
  })
  let s = put(patch(game('07004'), { hand: ['01020'] }), 'dexter-return')
  s = swap(s, '01020')
  expect(me(s).hand).toContain('dexter-return')
  expect(me(s).hand).toContain('01020')
  expect(Object.values(s.assets)).toHaveLength(0)
  expect(me(s).abilityState?.dexterSwapRound).toBeUndefined()
})

it('Dexter elder sign returns one owned asset and only then draws; declining draws nothing', () => {
  let s = put(game('07004'), '01087')
  const e = investigatorBehavior('07004')!.elderSign!(s, me(s))
  expect(e.modifier).toBe(2)
  const pending = run(s, ...e.immediate!)
  expect(me(choose(pending, 'choice.skip')).hand).toEqual([])
  s = choose(pending, 'choice.dexterReturn', { card: playerCardDef('01087')!.name })
  expect(me(s).hand).toEqual(['01087', '01088'])
})

it('Showmanship grants +2 only to tests resolving the chosen new asset ability, and expires with the round', () => {
  let s = put(game('07004'), '07012')
  if (has(s, 'ability.showmanship')) s = choose(s, 'choice.skip')
  s = put(s, '01020')
  s = choose(s, 'ability.showmanship', { card: playerCardDef('01020')!.name })
  const weapon = Object.values(s.assets).find((a) => a.code === '01020')!
  const shown = test(s, 'willpower', weapon.id)
  expect(skillTestValue(shown).total).toBe(7)
  expect(skillTestValue({ ...shown, round: shown.round + 1 }).total).toBe(5)
  expect(skillTestValue(test(s)).total).toBe(5)
})

it('Occult Scraps stays in hand when drawn, applies -2 willpower there, and cannot use a play action', () => {
  let s = patch(game('07004'), { deck: ['07013', '01088'] })
  s = run(s, { type: 'DrawCards', investigator: '07004', amount: 1 })
  expect(me(s).hand).toEqual(['07013'])
  expect(playableCards(s, '07004', false)).not.toContain('07013')
  expect(skillTestValue(test(s)).total).toBe(3)
  expect(skillTestValue(test(s, 'intellect')).total).toBe(2)
  expect(
    Object.values(run(s, { type: 'PlayCard', investigator: '07004', code: '07013' }).assets),
  ).toHaveLength(0)
})

it('Dexter may play Occult Scraps through his effect; it applies -1 in play and can later be discarded', () => {
  let s = put(patch(game('07004'), { hand: ['07013'] }), '01087')
  s = swap(s, '07013')
  expect(Object.values(s.assets).map((a) => a.code)).toEqual(['07013'])
  expect(skillTestValue(test(s)).total).toBe(4)
  const a = Object.values(s.assets)[0]!
  s = run(s, { type: 'DiscardAsset', asset: a.id })
  expect(skillTestValue(test(s)).total).toBe(5)
})

it('a separate fast-play permission allows Occult Scraps without a play action', () => {
  let s = patch(game('07004'), { hand: ['07013'], nextAssetFast: true })
  expect(playableCards(s, '07004', true)).toContain('07013')
  s = run(s, { type: 'PlayCard', investigator: '07004', code: '07013', fastWindow: true })
  expect(Object.values(s.assets).map((a) => a.code)).toContain('07013')
  expect(me(s).actionsRemaining).toBe(3)
})

it('Dexter can play a seal asset with a token released by discarding the previous asset', () => {
  let s = put({ ...game('07004'), chaosBag: [0, 'elderSign'] }, '04031')
  s = choose(s, 'choice.sealTokenOn', { token: 'elderSign', card: playerCardDef('04031')!.name })
  s = patch(s, { hand: ['04235'], resources: 10 })
  expect(s.chaosBag).not.toContain('elderSign')
  s = swap(s, '04235')
  expect(Object.values(s.assets).some((a) => a.code === '04235')).toBe(true)
  if (has(s, 'choice.sealTokenOn'))
    s = choose(s, 'choice.sealTokenOn', { token: 'elderSign', card: playerCardDef('04235')!.name })
  expect(
    s.sealed?.some(
      (e) =>
        e.token === 'elderSign' &&
        e.holder?.type === 'asset' &&
        s.assets[e.holder.id]?.code === '04235',
    ),
  ).toBe(true)
})

it('the printed non-Taboo Trish ability can automatically evade an Elite enemy', () => {
  let s = foe()
  const e = enemy(s)
  s = { ...s, enemies: { [e.id]: { ...e, traits: ['Elite'] } } }
  s = choose(choose(discover(s), 'ability.trishClues'), 'choice.trishEvade')
  expect(s.enemies[e.id]!.exhausted).toBe(true)
})
