// RR: Attach To, Face Down, Leaves Play, Uses, Search, Commit, Costs, Slots, Doom.
import { expect, it } from 'vitest'
import {
  allPlayerCardDefs,
  assetBehavior,
  assetSlots,
  assetTraits,
  availableAbilities,
  dispatch,
  playerCardBehavior,
  playerCardDef,
  playableCards,
  registerPlayerCard,
  registerPlayerCards,
  registerTreachery,
  skillTestValue,
  totalDoom,
  type GameState,
  type Message,
  type Asset,
  type ReactionOption,
  type SkillType,
} from '@lcg/engine'
import { choose, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { game, patch, withAsset, me } from '../dunwich-pilot/testing'
import data from '../data/asset-containers.json'
import './index'

const TOME = 'container-tome',
  GUN = 'container-gun',
  TOOL = 'container-tool',
  RELIC = 'container-relic'
registerPlayerCards([
  {
    code: TOME,
    name: 'Test Tome',
    type: 'asset',
    class: 'seeker',
    cost: 2,
    xp: 0,
    traits: ['Item', 'Tome'],
    slots: ['hand'],
    uses: { count: 3, type: 'secret' },
  },
  {
    code: GUN,
    name: 'Test Gun',
    type: 'asset',
    class: 'rogue',
    cost: 3,
    xp: 0,
    traits: ['Item', 'Weapon', 'Firearm', 'Illicit', 'Tool'],
    slots: ['hand'],
    uses: { count: 3, type: 'ammo' },
  },
  {
    code: TOOL,
    name: 'Test Tool',
    type: 'asset',
    class: 'seeker',
    cost: 2,
    xp: 0,
    traits: ['Item', 'Tool'],
    slots: ['hand'],
    uses: { count: 3, type: 'supply' },
  },
  {
    code: RELIC,
    name: 'Test Relic',
    type: 'asset',
    class: 'mystic',
    cost: 2,
    xp: 0,
    traits: ['Item', 'Relic'],
    slots: ['hand', 'arcane'],
  },
])
registerPlayerCard({
  code: TOME,
  abilities: (_s, a) =>
    a.exhausted || !a.uses
      ? []
      : [
          {
            key: a.id + ':read',
            label: 'ability.searchDeck',
            actions: 1,
            provokes: true,
            costs: [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'SpendUses', asset: a.id, amount: 1 },
            ],
            then: [{ type: 'DrawCards', investigator: a.owner, amount: 1 }],
          },
        ],
})
registerPlayerCard({
  code: GUN,
  abilities: (s, a) =>
    !a.uses
      ? []
      : Object.values(s.enemies).map((e) => ({
          key: a.id + ':shoot',
          label: 'action.fight',
          params: { enemy: e.name },
          actionKind: 'fight' as const,
          actions: 2,
          provokes: false,
          costs: [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }],
          then: [
            {
              type: 'BeginSkillTest' as const,
              investigator: a.owner,
              source: a.id,
              skill: 'combat' as const,
              difficulty: e.fight,
              modifier: 2,
              kind: { type: 'fight' as const, enemy: e.id, extraDamage: 1 },
            },
          ],
        })),
})
registerPlayerCard({
  code: TOOL,
  abilities: (s, a) =>
    !a.uses
      ? []
      : [
          {
            key: a.id + ':work',
            label: 'action.investigate',
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendUses', asset: a.id, amount: 1 }],
            then: [
              {
                type: 'BeginSkillTest',
                investigator: a.owner,
                source: a.id,
                skill: 'intellect',
                difficulty: 2,
                kind: { type: 'investigate', location: me(s).location! },
              },
            ],
          },
        ],
})
registerPlayerCard({ code: RELIC, skillModifier: (_s, _a, t) => (t.skill === 'willpower' ? 2 : 0) })
const b = (c: string) => playerCardBehavior(c)!
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = () => ({
  ...clear(
    patch({ hand: [], resources: 10, deck: ['01090', '01089', '01091', '01092'] })(
      game(['a', 'b']),
    ),
  ),
  interactive: true,
})
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const own = (s: GameState, c: string, p: Partial<Asset> = {}) => withAsset(s, c, p)
const fast = (
  s: GameState,
  c: string,
  find = (o: ReactionOption) => !o.key.includes(':detach:') && !o.key.endsWith(':use'),
) => {
  const a = s.assets[c]!,
    o = b(c).fastOptions!(s, a).find(find)!
  expect(o).toBeDefined()
  return run(s, ...o.then)
}
const take = (s: GameState, c: string) =>
  choose(s, 'choice.takeCard', { card: playerCardDef(c)!.name })
const react = (s: GameState, c: string) =>
  choose(s, 'ability.container', { card: playerCardDef(c)!.name })
const enter = (s: GameState, c: string) =>
  run(s, { type: 'PutAssetIntoPlay', investigator: 'a', code: c })
const id = (s: GameState, c: string) => Object.values(s.assets).find((a) => a.code === c)!.id
const attach = (s: GameState, a: string, host: string, swap?: string) =>
  run(s, { type: 'AttachControlledAsset', asset: a, host, ...(swap ? { swap } : {}) })
const test = (s: GameState, source?: string, skill: SkillType = 'intellect') =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty: 2,
    kind: { type: 'effect', source: 'Container test', onSuccess: [], onFail: [], onFailEach: [] },
    ...(source ? { source } : {}),
  })
const finish = (s: GameState, success: boolean) =>
  run(
    { ...s, skillTest: { ...s.skillTest!, succeeded: success, modifiedSkill: success ? 6 : 0 } },
    { type: 'EndSkillTest' },
  )
const store = (s: GameState, host: string, c: string, from: 'deck' | 'hand' | 'discard' = 'deck') =>
  run(s, { type: 'StorePlayerCard', asset: host, investigator: 'a', code: c, from })
const shoot = (s: GameState) => run(s, spawnAt('A', { ...ghoul, health: 20 }, 'a'))

it.each(data)('$code registers its reviewed definition and level', (c) => {
  expect(b(c.code)).toBeDefined()
  expect(playerCardDef(c.code)?.xp).toBe(c.xp)
})
it.each([
  ['04037', 6],
  ['53011', 12],
] as const)(
  '%s searches its own printed depth, stores at most three and shuffles the rest',
  (code, depth) => {
    let s = patch({ deck: [...Array(depth - 1).fill('01090'), GUN, '01088'] })(base())
    s = react(enter(s, code), code)
    s = take(s, GUN)
    s = choose(s, 'choice.done')
    const a = Object.values(s.assets).find((a) => a.code === code)!
    expect(a.storedCards).toEqual([{ code: GUN, owner: 'a' }])
    expect(me(s).hand).toEqual([])
    expect(me(s).deck).not.toContain(GUN)
    expect(me(s).deck).toHaveLength(depth)
    s = react(enter(patch({ deck: [GUN, GUN, GUN, GUN] })(base()), code), code)
    for (let n = 0; n < 3; n++) s = take(s, GUN)
    expect(Object.values(s.assets).find((a) => a.code === code)!.storedCards).toHaveLength(3)
    expect(me(s).deck).toEqual([GUN])
  },
)
it.each(['04037', '53011'])(
  '%s discards itself when its entry reaction is declined or its search takes nothing',
  (c) => {
    let s = choose(enter(base(), c), 'choice.skip')
    expect(Object.values(s.assets).some((a) => a.code === c)).toBe(false)
    expect(me(s).discard).toContain(c)
    s = choose(react(enter(base(), c), c), 'choice.done')
    expect(Object.values(s.assets).some((a) => a.code === c)).toBe(false)
  },
)
it('Backpack can play its stored Item, pays its cost once and discards only the empty host', () => {
  let s = own(patch({ deck: [GUN] })(base()), '04037')
  s = store(s, '04037', GUN)
  expect(playableCards(s, 'a', false)).toContain(GUN)
  s = run(s, { type: 'TakeAction', investigator: 'a', action: { kind: 'play', card: GUN } })
  expect(me(s).resources).toBe(7)
  expect(me(s).actionsRemaining).toBe(2)
  expect(Object.values(s.assets).some((a) => a.code === GUN)).toBe(true)
  expect(s.assets['04037']).toBeUndefined()
  expect(me(s).discard).toContain('04037')
  expect(me(s).hand).not.toContain(GUN)
})
it('stored cards grant no printed abilities, do not increase the hand, and stay stored if play is unaffordable', () => {
  let s = own(patch({ deck: [RELIC], resources: 0 })(base()), '04037')
  s = store(s, '04037', RELIC)
  expect(me(s).hand).toEqual([])
  expect(availableAbilities(s, 'a').some((o) => o.key.startsWith(RELIC))).toBe(false)
  const before = skillTestValue(test(s, undefined, 'willpower')).total
  expect(skillTestValue(test(own(base(), RELIC), undefined, 'willpower')).total).toBe(before + 2)
  s = run(s, { type: 'PlayCard', investigator: 'a', code: RELIC })
  expect(s.assets['04037']!.storedCards).toEqual([{ code: RELIC, owner: 'a' }])
  expect(me(s).hand).toEqual([])
})
it('playing the same code from hand or storage offers a source choice and conserves both copies', () => {
  let s = own(patch({ hand: [GUN], deck: [GUN] })(base()), '04037')
  s = store(s, '04037', GUN)
  s = run(s, { type: 'PlayCard', investigator: 'a', code: GUN })
  expect(labels(s)).toEqual(
    expect.arrayContaining(['choice.playFromHand', 'choice.playStoredCard']),
  )
  s = choose(s, 'choice.playFromHand')
  expect(me(s).hand).toEqual([])
  expect(s.assets['04037']!.storedCards).toHaveLength(1)
})
it('leaving play discards every stored physical copy to its owner without drawing or returning the host’s counters', () => {
  let s = own(base(), '08067', {
    storedCards: [
      { code: '01090', owner: 'a' },
      { code: '01090', owner: 'b' },
    ],
  })
  s = run(s, { type: 'ReturnAssetToHand', asset: '08067' })
  expect(me(s).hand).toEqual(['08067'])
  expect(me(s).discard).toEqual(['01090'])
  expect(s.investigators[1]!.discard).toContain('01090')
})
it('Atlas looks without drawing or searching, retains a weakness on top and respects five stored cards', () => {
  let s = own(patch({ deck: ['01090'] })(base()), '08067')
  s = fast(s, '08067')
  expect(s.assets['08067']).toMatchObject({
    exhausted: true,
    storedCards: [{ code: '01090', owner: 'a' }],
  })
  expect(me(s).hand).toEqual([])
  s = own(patch({ deck: ['01000'] })(base()), '08067')
  // A real registered weakness, not the random-weakness placeholder.
  const weak = allPlayerCardDefs().find((c) => c.weakness)!.code
  expect(playerCardDef(weak)?.weakness).toBeTruthy()
  s = fast(patch({ deck: [weak] })(s), '08067')
  expect(me(s).deck).toEqual([weak])
  expect(s.assets['08067']!.exhausted).toBe(true)
  s = own(base(), '08067', {
    storedCards: Array.from({ length: 5 }, () => ({ code: '01090', owner: 'a' })),
  })
  expect(b('08067').fastOptions!(s, s.assets['08067']!)).toEqual([])
})
it.each([true, false])(
  'Atlas commits an exact stored copy once per test and returns it only on success (%s)',
  (success) => {
    let s = test(
      own(base(), '08067', {
        storedCards: [
          { code: '01090', owner: 'a' },
          { code: '01090', owner: 'a' },
        ],
      }),
    )
    const o = b('08067').testOptions!(s, s.skillTest!, s.assets['08067']!)[0]!
    s = run(s, ...o.then)
    expect(s.skillTest!.committed).toContainEqual({
      code: '01090',
      by: 'a',
      returnAfterSuccess: true,
    })
    expect(s.assets['08067']!.storedCards).toHaveLength(1)
    expect(b('08067').testOptions!(s, s.skillTest!, s.assets['08067']!)).toEqual([])
    s = finish(s, success)
    expect(me(s).hand.filter((c) => c === '01090')).toHaveLength(success ? 1 : 0)
    expect(me(s).discard.filter((c) => c === '01090')).toHaveLength(success ? 0 : 1)
    s = test(s)
    expect(b('08067').testOptions!(s, s.skillTest!, s.assets['08067']!)).toHaveLength(1)
  },
)
it('Hunting Jacket stores from hand, grants resources by the total attached and draws the group only when its defeat reaction is chosen', () => {
  let s = own(patch({ hand: ['01090', '01089'] })(base()), '10121')
  s = take(fast(s, '10121'), '01090')
  expect(me(s).resources).toBe(11)
  s = { ...s, assets: { ...s.assets, '10121': { ...s.assets['10121']!, exhausted: false } } }
  s = take(fast(s, '10121'), '01089')
  expect(me(s).resources).toBe(13)
  const before = s
  s = run(s, { type: 'DiscardAsset', asset: '10121', defeated: true })
  s = choose(s, 'choice.containerDrawAll')
  expect(me(s).hand).toEqual(['01090', '01089'])
  expect(me(s).discard).toContain('10121')
  s = choose(run(before, { type: 'DiscardAsset', asset: '10121', defeated: true }), 'choice.skip')
  expect(me(s).hand).toEqual([])
  expect(me(s).discard).toEqual(expect.arrayContaining(['10121', '01090', '01089']))
})
it('Mob Connections catches an actually discarded Illicit asset once, and its draw costs an action and two resources', () => {
  let s = own(own(base(), '11059'), GUN)
  s = react(run(s, { type: 'DiscardAsset', asset: GUN }), '11059')
  expect(s.assets['11059']).toMatchObject({
    exhausted: true,
    storedCards: [{ code: GUN, owner: 'a' }],
  })
  expect(me(s).discard).not.toContain(GUN)
  const o = b('11059').abilities!(s, s.assets['11059']!, 'a')[0]!
  s = run(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    costs: o.costs!,
    then: o.then,
  })
  expect(me(s).resources).toBe(8)
  expect(me(s).actionsRemaining).toBe(2)
  expect(me(s).hand).toContain(GUN)
  expect(s.assets['11059']!.storedCards).toEqual([])
})
it('Mob Connections never catches an asset returned to hand or removed from play, and does not replace a stored card', () => {
  let s = own(own(base(), '11059'), GUN)
  expect(labels(run(s, { type: 'ReturnAssetToHand', asset: GUN }))).not.toContain(
    'ability.container',
  )
  expect(labels(run(s, { type: 'RemoveAssetFromGame', asset: GUN }))).not.toContain(
    'ability.container',
  )
  s = own(s, '11059', { storedCards: [{ code: GUN, owner: 'a' }] })
  expect(labels(run(s, { type: 'DiscardAsset', asset: GUN }))).not.toContain('ability.container')
})
it('Elli puts a found Relic directly into play attached, retains its abilities and frees all its slots', () => {
  let s = react(enter(patch({ deck: [RELIC] })(base()), '04021'), '04021')
  s = take(s, RELIC)
  const a = s.assets[id(s, RELIC)]!
  expect(a.attachedTo).toBe(id(s, '04021'))
  expect(assetSlots(a, s)).toEqual([])
  expect(assetBehavior(s, a)?.skillModifier).toBeDefined()
  expect(me(s).resources).toBe(10)
})
it.each(['06324', '08089', '09120', '09092'])(
  '%s attaches/switches only its printed eligible targets',
  (c) => {
    let s = own(own(own(own(base(), c), TOME), GUN), TOOL, { doom: 1 })
    const expected = c === '06324' ? TOME : c === '08089' ? GUN : TOOL
    s = fast(s, c, (o) => o.target?.type === 'asset' && o.target.id === expected)
    expect(s.assets[expected]!.attachedTo).toBe(c)
    expect(s.assets[c]!.exhausted).toBe(c === '09120' || c === '09092')
  },
)
it('Tool Belt blanks an attached Tool and frees all slots, detaching restores its text and checks slots', () => {
  let s = attach(own(own(base(), '09120'), TOOL), TOOL, '09120')
  expect(assetBehavior(s, s.assets[TOOL]!)).toBeUndefined()
  expect(assetSlots(s.assets[TOOL]!, s)).toEqual([])
  s = run(s, { type: 'DetachControlledAsset', asset: TOOL })
  expect(assetBehavior(s, s.assets[TOOL]!)?.abilities).toBeDefined()
  expect(assetSlots(s.assets[TOOL]!, s)).toEqual(['hand'])
})
it('swapping between Tool Belt and Trigger Man conserves uses, doom and damage, without requiring the incoming swap card to be Illicit', () => {
  let s = own(own(own(own(base(), '09120'), '09076'), TOOL, { uses: 2, doom: 2, damage: 1 }), GUN, {
    uses: 1,
    doom: 1,
  })
  s = attach(attach(s, TOOL, '09120'), GUN, '09076')
  s = fast(
    s,
    '09120',
    (o) =>
      o.label === 'choice.containerSwap' &&
      o.target?.type === 'asset' &&
      o.target.id === GUN &&
      o.params?.old === playerCardDef(TOOL)!.name,
  )
  expect(s.assets[TOOL]).toMatchObject({ attachedTo: '09076', uses: 2, doom: 2, damage: 1 })
  expect(s.assets[GUN]).toMatchObject({ attachedTo: '09120', uses: 1, doom: 1 })
  expect(assetBehavior(s, s.assets[TOOL]!)?.abilities).toBeDefined()
  expect(b('09076').fastOptions!(s, s.assets['09076']!)).toHaveLength(1)
})
it('an attachment cycle is refused, while leaving the host discards face-up children and their own attachments', () => {
  let s = attach(own(own(base(), '09120'), TOOL), TOOL, '09120')
  s = attach(s, '09120', TOOL)
  expect(s.assets['09120']!.attachedTo).toBeUndefined()
  s = run(s, { type: 'ReturnAssetToHand', asset: '09120' })
  expect(s.assets[TOOL]).toBeUndefined()
  expect(me(s).discard).toContain(TOOL)
  expect(me(s).hand).toContain('09120')
})
it('Elle discounts exactly one doom on each of up to two attachments and gives +1 only to their tests', () => {
  let s = own(own(own(base(), '09092'), TOOL, { doom: 3 }), TOME, { doom: 1 })
  s = attach(attach(s, TOOL, '09092'), TOME, '09092')
  expect(totalDoom(s) - s.doom).toBe(2)
  expect(skillTestValue(test(s, TOOL)).total).toBe(skillTestValue(test(s)).total + 1)
  s = run(s, { type: 'DetachControlledAsset', asset: TOOL })
  expect(totalDoom(s) - s.doom).toBe(3)
})
it('Abigail repeats just the resolved Tome effects without spending another action, secret or exhausting the Tome again', () => {
  let s = attach(own(own(base(), '06324'), TOME), TOME, '06324')
  const o = availableAbilities(s, 'a').find((o) => o.key === TOME + ':read')!
  s = run(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    costs: o.costs!,
    then: o.then,
  })
  expect(me(s).hand).toHaveLength(1)
  s = react(s, '06324')
  expect(me(s).hand).toHaveLength(2)
  expect(me(s).actionsRemaining).toBe(2)
  expect(s.assets[TOME]).toMatchObject({ uses: 2, exhausted: true })
  expect(s.assets['06324']!.exhausted).toBe(true)
})
it('Trigger Man puts an Illicit asset into play from hand without paying its price, with normal slots', () => {
  let s = react(enter(patch({ hand: [GUN] })(base()), '09076'), '09076')
  s = take(s, GUN)
  const a = s.assets[id(s, GUN)]!
  expect(a.attachedTo).toBe(id(s, '09076'))
  expect(assetSlots(a, s)).toEqual(['hand'])
  expect(me(s).resources).toBe(10)
})
it.each(['09076', '08089'])(
  '%s waives printed action arrows but still pays ammo, with Trigger Man setting base four',
  (c) => {
    let s = shoot(attach(own(own(base(), c), GUN), GUN, c))
    s = fast(s, c, (o) => o.key.endsWith(c === '08089' ? ':use' : ':advanced'))
    s = choose(s, 'action.fight', { enemy: ghoul.name })
    expect(me(s).actionsRemaining).toBe(3)
    expect(s.assets[GUN]!.uses).toBe(2)
    expect(s.assets[c]!.exhausted).toBe(true)
    expect(me(s).resources).toBe(c === '09076' ? 9 : 10)
    expect(s.skillTest!.baseSkill).toBe(c === '09076' ? 4 : undefined)
    expect(skillTestValue(s).total).toBe((c === '09076' ? 4 : me(s).skills.combat) + 2)
  },
)
it('Quickdraw accepts only a one-hand Firearm and keeps its other slots', () => {
  const s = own(own(base(), '08089'), GUN, { upgrades: [{ code: '07261', owner: 'a' }] })
  const o = b('08089').fastOptions!(s, s.assets['08089']!).find(
    (o) => o.target?.type === 'asset' && o.target.id === GUN,
  )!
  const after = run(s, ...o.then)
  expect(assetSlots(after.assets[GUN]!, after)).toEqual(['arcane'])
})
it('Jury-Rig spends durability on that physical upgrade and modifies only a test on its host', () => {
  let s = own(base(), TOOL, { upgrades: [{ code: '08074', owner: 'b', uses: 3 }] })
  s = test(s, TOOL)
  expect(labels(s)).toContain('ability.container')
  const options = b('08074').attachedTestOptions!(s, s.assets[TOOL]!, 0, s.skillTest!)
  expect(options[0]!.investigator).toBe('a')
  const before = skillTestValue(s).total
  s = run(s, ...options[0]!.then)
  expect(skillTestValue(s).total).toBe(before + 2)
  expect(s.assets[TOOL]!.upgrades![0]!.uses).toBe(2)
  expect(
    b('08074').attachedTestOptions!(s, s.assets[TOOL]!, 0, { ...s.skillTest!, source: 'other' }),
  ).toEqual([])
})
it('Enchant Weapon gives a Relic trait and arcane slot, uses its owner’s willpower for the weapon controller, and adds one damage', () => {
  let s = shoot(own(base(), GUN, { upgrades: [{ code: '07261', owner: 'b' }] }))
  expect(assetTraits(s.assets[GUN]!)).toContain('Relic')
  expect(assetSlots(s.assets[GUN]!, s)).toEqual(['hand', 'arcane'])
  const o = availableAbilities(s, 'a').find((o) => o.key === GUN + ':shoot')!
  s = run(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: 0,
    provokes: false,
    costs: o.costs!,
    then: o.then,
  })
  const before = skillTestValue(s).total
  s = react(s, '07261')
  expect(skillTestValue(s).total).toBe(before + s.investigators[1]!.skills.willpower)
  expect(s.skillTest!.kind).toMatchObject({ type: 'fight', extraDamage: 2 })
  expect(s.assets[GUN]!.upgrades![0]!.exhausted).toBe(true)
})

it('a gained Relic trait is seen by existing Whitton Greene rules', () => {
  let s = own(own(base(), GUN), '60213')
  const before = skillTestValue(test(s)).total
  s = {
    ...s,
    assets: {
      ...s.assets,
      [GUN]: { ...s.assets[GUN]!, upgrades: [{ code: '07261', owner: 'a' }] },
    },
  }
  expect(skillTestValue(test(s)).total).toBe(before + 1)
})
it('Atlas once-per-test usage expires with the test even when its text is blank at cleanup', () => {
  registerTreachery({ code: 'container-blank', blanksAssetTrait: 'Tome', revelation: () => [] })
  let s = test(
    own(base(), '08067', {
      storedCards: [
        { code: '01090', owner: 'a' },
        { code: '01090', owner: 'a' },
      ],
    }),
  )
  s = run(s, ...b('08067').testOptions!(s, s.skillTest!, s.assets['08067']!)[0]!.then)
  expect(s.skillTest!.usedAbilities).toContain('08067')
  s = {
    ...s,
    treacheries: {
      ...s.treacheries,
      blank: {
        id: 'blank',
        kind: 'treachery',
        code: 'container-blank',
        name: 'Blank',
        keywords: [],
        placement: { type: 'threatArea', investigator: 'a' },
      },
    },
  }
  expect(assetBehavior(s, s.assets['08067']!)).toBeUndefined()
  s = finish(s, false)
  s = { ...s, treacheries: {} }
  s = test(s)
  expect(b('08067').testOptions!(s, s.skillTest!, s.assets['08067']!)).toHaveLength(1)
})
it('Mob retains the owner of a borrowed asset, returns it to that owner’s hand and credits the actual drawer', () => {
  const code = 'container-draw-watcher'
  registerPlayerCards([{ code, name: 'Draw watcher', type: 'asset', class: 'neutral', traits: [] }])
  registerPlayerCard({
    code,
    forced: (_s, t, a) =>
      t.type === 'afterDrawCard' && t.investigator === a.owner
        ? [{ type: 'GainResources', investigator: a.owner, amount: 1 }]
        : [],
  })
  let s = own(own(own(base(), '11059'), GUN, { originalOwner: 'b' }), code)
  s = react(run(s, { type: 'DiscardAsset', asset: GUN }), '11059')
  expect(s.assets['11059']!.storedCards).toEqual([{ code: GUN, owner: 'b' }])
  const o = b('11059').abilities!(s, s.assets['11059']!, 'a')[0]!
  s = run(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    costs: o.costs!,
    then: o.then,
  })
  expect(me(s).resources).toBe(9)
  expect(me(s).hand).not.toContain(GUN)
  expect(s.investigators[1]!.hand).toContain(GUN)
})
