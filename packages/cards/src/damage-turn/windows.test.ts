// RR: Triggered Abilities, Additional Costs, Additional Actions, Lasting Effects, Slots.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  effectiveVitals,
  skillTestValue,
  engageActionsAvailable,
  availableActions,
  canPlayByEffect,
  shroudOf,
  registerEnemy,
  registerScenario,
  type GameState,
  type Message,
  type AbilityOption,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'

const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const run = (s: GameState, messages: Message[]) => messages.reduce((s, m) => dispatch(s, m), s)
const ability = (s: GameState, a: AbilityOption) =>
  dispatch(clear(s), {
    type: 'UseAbility',
    investigator: 'a',
    key: a.key,
    actions: a.actions,
    provokes: a.provokes,
    ...(a.costs ? { costs: a.costs } : {}),
    then: a.then,
    ...(a.limit ? { limit: a.limit } : {}),
  })
const start = () => patch({ resources: 10, hand: ['01093'] })(clear(game()))
const attackState = (): GameState => {
  const s = start()
  return {
    ...s,
    enemies: {
      foe: {
        ...ghoul,
        id: 'foe',
        location: 'A',
        engagedWith: 'a',
        exhausted: false,
        damageTaken: 0,
        maxHealth: 2,
        doom: 0,
      },
    },
  }
}
const tarot = ['05023', '05027', '05031', '05035', '05039', '54003', '54005']
it.each(tarot)(
  '%s enters from the actual opening hand for free and occupies the single tarot slot',
  (code) => {
    let s = patch({ hand: [code], resources: 0 })(start())
    s = dispatch(s, { type: 'GameBegins' })
    s = choose(s, 'choice.windowPut', { card: playerCardDef(code)!.name })
    expect(Object.values(s.assets).filter((a) => a.code === code)).toHaveLength(1)
    expect(me(s).resources).toBe(0)
    expect(me(s).hand).not.toContain(code)
    expect(playerCardDef(code)!.slots).toEqual(['tarot'])
    const second = code === '05023' ? '05027' : '05023'
    s = dispatch(clear(s), { type: 'PutAssetIntoPlay', investigator: 'a', code: second })
    expect(Object.values(s.assets)).toHaveLength(1)
    expect(Object.values(s.assets)[0]!.code).toBe(second)
    expect(me(s).discard).toContain(code)
  },
)
it('opening reactions exclude later draws and can distinguish both original copies', () => {
  const s = patch({ hand: ['05023'] })(start()),
    b = playerCardBehavior('05023')!
  expect(b.openingHandReactions!(s, 'a', [])).toEqual([])
  expect(new Set(b.openingHandReactions!(s, 'a', ['05023', '05023']).map((r) => r.key)).size).toBe(
    2,
  )
  registerScenario({ id: 'tarot-no-play', cannotPlay: () => true })
  const opened = dispatch({ ...s, scenarioId: 'tarot-no-play' }, { type: 'GameBegins' })
  expect(opened.pending!.question.choices.some((c) => c.label === 'choice.windowPut')).toBe(true)
})
it.each([
  ['05023', 'combat'],
  ['05027', 'intellect'],
  ['05031', 'agility'],
  ['05035', 'willpower'],
] as const)('%s grants its printed skill bonus', (code, skill) => {
  const s = withAsset(start(), code)
  const tested = dispatch(s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty: 3,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  expect(skillTestValue(tested).total).toBe(me(s).skills[skill] + 1)
})
it('Five of Pentacles increases both vitals', () => {
  const s = start(),
    next = withAsset(s, '05039')
  expect(effectiveVitals(next, me(next))).toEqual({
    health: me(s).health + 1,
    sanity: me(s).sanity + 1,
  })
})
it('The World requires eight cards, exhausts, and draws one', () => {
  let s = withAsset(patch({ hand: Array(7).fill('01093') })(start()), '54003')
  const b = playerCardBehavior('54003')!
  expect(b.abilities!(s, s.assets['54003']!, 'a')).toEqual([])
  s = patch({ hand: Array(8).fill('01093'), deck: ['01088'] })(s)
  s = ability(s, b.abilities!(s, s.assets['54003']!, 'a')[0]!)
  expect(me(s).hand).toHaveLength(9)
  expect(s.assets['54003']!.exhausted).toBe(true)
  expect(b.abilities!(s, s.assets['54003']!, 'a')).toEqual([])
})
it.each([1, 3])('Knight of Swords grants +%i once per test, discarding only for three', (n) => {
  let s = withAsset(start(), '54005')
  s = dispatch(s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty: 1,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  s = clear(s)
  const b = playerCardBehavior('54005')!,
    t = { type: 'whenWouldSucceed' as const, investigator: 'a' }
  const base = skillTestValue(s).total
  s = run(s, b.reactions!(s, t, s.assets['54005']!)[0]!.then)
  s = choose(s, n === 3 ? 'choice.windowDiscardBonus' : 'choice.windowBonus', { n })
  expect(skillTestValue(s).total).toBe(base + n)
  if (n === 3) expect(me(s).discard).toContain('54005')
  else expect(b.reactions!(s, t, s.assets['54005']!)).toEqual([])
})
it.each(['03266', '10108'])(
  '%s lowers the current location shroud through the real turn only',
  (code) => {
    let s = withAsset(start(), code)
    s.locations.A = { ...s.locations.A!, shroud: 5 }
    const b = playerCardBehavior(code)!,
      ab = b.abilities!(s, s.assets[code]!, 'a')[0]!
    s = ability(s, ab)
    expect(shroudOf(s, 'A')).toBe(code === '03266' ? 3 : 4)
    expect(s.assets[code]!.uses).toBe(2)
    expect(shroudOf(JSON.parse(JSON.stringify(s)), 'A')).toBe(shroudOf(s, 'A'))
    expect(shroudOf({ ...s, activeTurn: 'b' }, 'A')).toBe(5)
    expect(
      shroudOf({ ...s, log: [...s.log, { key: 'log.step.turnBegins', round: s.round }] }, 'A'),
    ).toBe(5)
    const other = { ...clear(s), activeTurn: 'b' }
    expect(
      b.abilities!(
        {
          ...other,
          assets: { ...other.assets, [code]: { ...other.assets[code]!, exhausted: false } },
        },
        { ...s.assets[code]!, exhausted: false },
        'a',
      ),
    ).toHaveLength(1)
    expect(b.abilities!({ ...other, phase: 'enemy' }, s.assets[code]!, 'a')).toEqual([])
    if (code === '10108') expect(s.assets[code]!.exhausted).toBe(true)
    else expect(ab.limit).toEqual({ per: 'turn' })
  },
)
it.each([
  ['03029', '01087'],
  ['09066', '01076'],
])('%s puts the selected asset in free and returns that exact instance', (code, asset) => {
  let s = withAsset(patch({ hand: [asset], resources: 0 })(start()), asset, {
    id: 'old',
    noSlot: true,
  })
  const b = playerCardBehavior(code)!
  expect(b.canPlay!(s, 'a')).toBe(true)
  expect(b.canPlay!({ ...s, activeTurn: 'b' }, 'a')).toBe(false)
  s = run(s, b.play!(s, 'a'))
  s = choose(s, 'choice.windowPut', { card: playerCardDef(asset)!.name })
  const entered = Object.values(s.assets).find((a) => a.id !== 'old')!
  expect(entered.code).toBe(asset)
  expect(me(s).resources).toBe(0)
  const delayed = s.endOfTurn!.find((e) => e.investigator === 'a')!.then
  s = run(clear(s), delayed)
  expect(s.assets.old).toBeDefined()
  expect(s.assets[entered.id]).toBeUndefined()
  expect(me(s).hand).toContain(asset)
  const gone = run({ ...clear(s), assets: {} }, delayed)
  expect(me(gone).hand).toEqual(me(s).hand)
})
it.each([
  ['10069', 8, false],
  ['10048', 5, true],
] as const)(
  '%s spends two actions normally and one when played by an effect',
  (code, total, draw) => {
    let s = patch({ hand: [code], resources: 10, deck: Array(10).fill('01093') })(
      clear(game(['a', 'b'])),
    )
    s = patch({ deck: Array(10).fill('01093') }, 'b')(s)
    const b = playerCardBehavior(code)!
    expect(
      availableActions(patch({ actionsRemaining: 1 })(s), 'a').some(
        (a) => a.kind === 'play' && a.card === code,
      ),
    ).toBe(false)
    expect(canPlayByEffect(patch({ actionsRemaining: 0 })(s), 'a', code, 'hand')).toBe(false)
    const effect = dispatch(clear(s), { type: 'PlayCard', investigator: 'a', code, byEffect: true })
    expect(me(effect).actionsRemaining).toBe(2)
    s = dispatch(s, { type: 'TakeAction', investigator: 'a', action: { kind: 'play', card: code } })
    expect(me(s).actionsRemaining).toBe(1)
    const before = s.investigators.map((i) => (draw ? i.hand.length : i.resources))
    const label = draw ? 'choice.windowDraw' : 'choice.windowResources'
    s = choose(s, label, { name: me(s).name, n: 2 })
    s = choose(s, label, { name: s.investigators[1]!.name, n: total - 2 })
    expect((draw ? me(s).hand.length : me(s).resources) - before[0]!).toBe(2)
    expect(
      (draw ? s.investigators[1]!.hand.length : s.investigators[1]!.resources) - before[1]!,
    ).toBe(total - 2)
    expect(b.additionalPlayActions).toBe(1)
  },
)
it('Riot Whistle grants only engage actions, continuously and once per turn per copy', () => {
  let s = withAsset(patch({ actionsRemaining: 0 })(attackState()), '07108')
  s.enemies.foe!.engagedWith = null
  expect(engageActionsAvailable(s, 'a')).toBe(1)
  expect(availableActions(s, 'a').map((a) => a.kind)).toEqual(['engage'])
  s = dispatch(s, {
    type: 'TakeAction',
    investigator: 'a',
    action: { kind: 'engage', enemy: 'foe' },
  })
  expect(s.enemies.foe!.engagedWith).toBe('a')
  expect(me(s).actionsRemaining).toBe(0)
  expect(engageActionsAvailable(s, 'a')).toBe(0)
  s = withAsset(clear(s), '07108', { id: 'second' })
  expect(engageActionsAvailable(s, 'a')).toBe(1)
  s = dispatch(s, { type: 'LoseAdditionalAction', investigator: 'a', action: 'engage' })
  expect(engageActionsAvailable(s, 'a')).toBe(0)
  expect(engageActionsAvailable({ ...s, activeTurn: 'b' }, 'a')).toBe(0)
  expect(engageActionsAvailable({ ...s, assets: {} }, 'a')).toBe(0)
})
it('Medical Student heals a local investigator or Ally, but never a remote target', () => {
  let s = withAsset(patch({ damage: 2, horror: 2 })(clear(game(['a', 'b']))), '08083')
  s = patch({ location: 'B', damage: 2, horror: 2 }, 'b')(s)
  s = withAsset(s, '01033', { damage: 1, horror: 1 })
  const b = playerCardBehavior('08083')!,
    a = s.assets['08083']!
  const reaction = b.reactions!(
    s,
    { type: 'afterAssetEntersPlay', investigator: 'a', asset: a.id },
    a,
  )[0]!
  s = run(s, reaction.then)
  expect(s.pending!.question.choices).toHaveLength(2)
  s = choose(s, 'choice.windowHeal', { name: me(s).name })
  expect(me(s)).toMatchObject({ damage: 1, horror: 1 })
  expect(s.investigators[1]).toMatchObject({ damage: 2, horror: 2 })
  expect(
    b.reactions!(s, { type: 'afterAssetEntersPlay', investigator: 'a', asset: 'other' }, a),
  ).toEqual([])
})
it('Lonnie Ritter heals an Item and her own horror, costs one resource and exhausts', () => {
  let s = withAsset(withAsset(start(), '60309', { horror: 2 }), '01094', { damage: 1 })
  const b = playerCardBehavior('60309')!
  s = ability(s, b.abilities!(s, s.assets['60309']!, 'a')[0]!)
  expect(s.assets['60309']).toMatchObject({ horror: 1, exhausted: true })
  expect(s.assets['01094']!.damage).toBe(0)
  expect(me(s).resources).toBe(9)
  expect(b.abilities!(s, s.assets['60309']!, 'a')).toEqual([])
})
it('Extra Rations heals its controller and discards when its final supply is spent', () => {
  let s = withAsset(patch({ damage: 2 })(start()), '60570', { uses: 1 })
  const b = playerCardBehavior('60570')!
  s = ability(s, b.abilities!(s, s.assets['60570']!, 'a')[0]!)
  expect(me(s).damage).toBe(1)
  expect(s.assets['60570']).toBeUndefined()
  expect(me(s).discard).toContain('60570')
})
it('Blood Ward cancels a non-Elite local attack and heals the targeted investigator', () => {
  let s = patch({ hand: ['60472'], damage: 3 })(attackState())
  s = dispatch(s, { type: 'EnemyAttack', enemy: 'foe', investigator: 'a', exhaustAfter: false })
  s = choose(s, 'ability.playCard', { card: playerCardDef('60472')!.name })
  expect(me(s)).toMatchObject({ damage: 1, horror: 0 })
  const b = playerCardBehavior('60472')!,
    t = { type: 'whenEnemyAttacks' as const, enemy: 'foe', investigator: 'a' }
  s.enemies.foe!.traits = ['Elite']
  expect(b.handReactions!(clear(s), t, 'a')).toEqual([])
})
it('Infighting cancels repeated non-Elite attacks only during the tagged phase', () => {
  let s = { ...attackState(), phase: 'enemy' as const }
  const b = playerCardBehavior('03314')!
  expect(b.handReactions!(s, { type: 'enemyPhaseBegins' }, 'a')).toHaveLength(1)
  s = dispatch(s, { type: 'ProtectFromAttacks', investigator: 'a', nonElite: true }) as typeof s
  for (let n = 0; n < 2; n++)
    s = dispatch(clear(s), {
      type: 'EnemyAttack',
      enemy: 'foe',
      investigator: 'a',
      exhaustAfter: false,
    }) as typeof s
  expect(me(s)).toMatchObject({ damage: 0, horror: 0 })
  const next = dispatch(
    { ...clear(s), phase: 'investigation' },
    { type: 'EnemyAttack', enemy: 'foe', investigator: 'a', exhaustAfter: false },
  )
  expect(me(next)).toMatchObject({ damage: 1, horror: 1 })
  s.enemies.foe!.traits = ['Elite']
  expect(
    me(
      dispatch(clear(s), {
        type: 'EnemyAttack',
        enemy: 'foe',
        investigator: 'a',
        exhaustAfter: false,
      }),
    ).damage,
  ).toBe(1)
})
it('Obfuscation cancels only attacks of opportunity and spends a charge without exhausting', () => {
  let s = withAsset(attackState(), '07027')
  const b = playerCardBehavior('07027')!,
    t = { type: 'whenEnemyAttacks' as const, enemy: 'foe', investigator: 'a' }
  expect(b.reactions!(s, t, s.assets['07027']!)).toEqual([])
  s = dispatch(s, { type: 'TakeAction', investigator: 'a', action: { kind: 'resource' } })
  s = choose(s, 'choice.windowCancelAttack')
  expect(me(s)).toMatchObject({ damage: 0, horror: 0 })
  expect(s.assets['07027']).toMatchObject({ uses: 2, exhausted: false })
  registerEnemy({ code: 'uncancellable-test', attacksCannotBeCanceled: true })
  s.enemies.foe!.code = 'uncancellable-test'
  expect(b.reactions!(s, { ...t, opportunity: true }, s.assets['07027']!)).toEqual([])
})
