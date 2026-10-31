// RR: Activate, Costs, Fast, Skill Tests, Uses, Healing, Play, Parley, Drawing Cards.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  skillTestValue,
  restrictedSlotCapacity,
  emptyCampaignLog,
  registerScenario,
  type AbilityOption,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = () =>
  patch({
    hand: [],
    resources: 20,
    skills: { combat: 10, agility: 10, willpower: 10, intellect: 10 },
  })(clear(game()))
const run = (s: GameState, m: Message[]) => m.reduce((s, m) => dispatch(s, m), s)
const activate = (s: GameState, a: AbilityOption) =>
  dispatch(clear(s), {
    type: 'UseAbility',
    investigator: 'a',
    key: a.key,
    actions: a.actions,
    provokes: a.provokes,
    ...(a.costs ? { costs: a.costs } : {}),
    ...(a.limit ? { limit: a.limit } : {}),
    then: a.then,
  })
const foe = (
  s: GameState,
  id = 'foe',
  extra: Partial<GameState['enemies'][string]> = {},
): GameState => ({
  ...s,
  enemies: {
    ...s.enemies,
    [id]: {
      ...ghoul,
      id,
      health: 20,
      maxHealth: 20,
      location: 'A',
      engagedWith: 'a',
      exhausted: false,
      doom: 0,
      damageTaken: 0,
      traits: ['Humanoid'],
      ...extra,
    },
  },
})
const options = (s: GameState, code: string) =>
  playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a')
const test = (s: GameState, skill: SkillType = 'willpower') =>
  dispatch(patch({ hand: ['01093'] })(clear(s)), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty: 3,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const event = (s: GameState, code: string) => run(clear(s), playerCardBehavior(code)!.play!(s, 'a'))
it.each([
  ['05115', 0, 2, 2, 1, 1],
  ['08094', 0, -1, 2, 1, 0],
  ['08094', 1, 2, 3, 2, 0],
  ['08096', 0, 1, 2, 1, 0],
  ['08096', 1, 5, 6, 3, 0],
  ['05118', 0, 1, 1, 1, 0],
  ['05118', 1, 2, 2, 1, 1],
] as const)(
  '%s mode %i pays its actual costs and deals its distinct damage',
  (code, mode, bonus, damage, actions, uses) => {
    let s = withAsset(foe(start()), code)
    const a = options(s, code)[mode]!,
      before = s.assets[code]!.uses
    expect((a.then[0] as Extract<Message, { type: 'BeginSkillTest' }>).modifier).toBe(bonus)
    s = activate(s, a)
    expect(s.enemies.foe!.damageTaken).toBe(damage)
    expect(me(s).actionsRemaining).toBe(3 - actions)
    expect(s.assets[code]!.uses).toBe(before - uses)
    if (uses)
      expect(
        options(
          { ...s, assets: { ...s.assets, [code]: { ...s.assets[code]!, uses: 0 } } },
          code,
        ).some((o) => o.costs?.some((c) => c.type === 'SpendUses')),
      ).toBe(false)
  },
)
it.each([0, 1])(
  'Cryptographic Cipher mode %i changes shroud, exhausts, and spends one secret',
  (mode) => {
    let s = withAsset(start(), '07021')
    s.locations.A = { ...s.locations.A!, shroud: 4 }
    const a = options(s, '07021')[mode]!,
      m = a.then.find((m) => m.type === 'BeginSkillTest') as Extract<
        Message,
        { type: 'BeginSkillTest' }
      >
    expect(m.difficulty).toBe(mode === 0 ? 5 : 2)
    s = activate(s, a)
    expect(me(s).clues).toBe(1)
    expect(me(s).actionsRemaining).toBe(mode === 0 ? 3 : 2)
    expect(s.assets['07021']).toMatchObject({ uses: 2, exhausted: true })
    expect(options(s, '07021')).toEqual([])
  },
)
it('Cipher carries additional investigation costs into either mode', () => {
  const s = withAsset(start(), '07021')
  s.locations.A = { ...s.locations.A!, investigateExtraActions: 1 }
  expect(options(s, '07021').map((o) => o.actions)).toEqual([0, 2])
  const paid = activate(foe(s), options(s, '07021')[0]!)
  expect(me(paid).actionsRemaining).toBe(2)
  expect(me(paid).actionsTaken ?? 0).toBe(0)
  expect(me(paid).damage).toBe(0)
  expect(me(paid).horror).toBe(0)
  expect(options(patch({ actionsRemaining: 0 })(s), '07021')).toHaveLength(1)
})
it.each(['combat', 'intellect', 'willpower'] as const)(
  'Abyssal Tome can use %s and add doom up to three',
  (skill) => {
    let s = withAsset(foe(start()), '07159', { doom: 2 })
    const a = options(s, '07159').find((o) => o.params?.skill === skill && o.params.doom === 1)!
    s = activate(s, a)
    expect(s.assets['07159']).toMatchObject({ doom: 3, exhausted: true })
    expect(s.enemies.foe!.damageTaken).toBe(4)
    s = { ...s, assets: { ...s.assets, '07159': { ...s.assets['07159']!, exhausted: false } } }
    expect(options(s, '07159').filter((o) => o.params?.doom === 1)).toEqual([])
    expect(options(s, '07159')).toHaveLength(3)
  },
)
it.each(['07029', '11074'])(
  '%s enters with a free fight/evade that ignores exhaustion costs',
  (code) => {
    let s = withAsset(foe(start()), code, { exhausted: true })
    const b = playerCardBehavior(code)!,
      a = s.assets[code]!
    const r = b.reactions!(
      s,
      { type: 'afterAssetEntersPlay', investigator: 'a', asset: a.id },
      a,
    )[0]!
    s = run(s, r.then)
    if (code === '11074') s = choose(s, 'choice.toolDamage', { n: 1, enemy: 'Ghoul' })
    s = choose(s, 'ability.fightWithSkill', { skill: 'combat' })
    expect(me(s).actionsRemaining).toBe(3)
    expect(s.assets[code]!.exhausted).toBe(true)
    expect(s.enemies.foe!.damageTaken).toBe(code === '11074' ? 2 : 1)
    const ready = {
      ...s,
      assets: { ...s.assets, [code]: { ...s.assets[code]!, exhausted: false } },
    }
    const evade = options(ready, code).find((o) => o.key.includes(':evade:willpower'))!
    s = activate(ready, evade)
    expect(s.enemies.foe).toMatchObject({ exhausted: true, engagedWith: null })
    expect(s.assets[code]!.exhausted).toBe(true)
  },
)
it('David Renfield grants willpower only with doom and gains the resulting total resources', () => {
  let s = withAsset(start(), '03112')
  const b = playerCardBehavior('03112')!
  expect(b.skillModifier!(s, s.assets['03112']!, test(s).skillTest!)).toBe(0)
  s = activate(s, options(s, '03112')[0]!)
  s = choose(s, 'choice.toolDoom', { n: 1 })
  expect(me(s).resources).toBe(21)
  expect(s.assets['03112']).toMatchObject({ doom: 1, exhausted: true })
  expect(b.skillModifier!(s, s.assets['03112']!, test(s).skillTest!)).toBe(1)
})
it('Bangle gains a charge after an attack and boosts a test only once', () => {
  let s = withAsset(start(), '08075')
  const b = playerCardBehavior('08075')!
  s = run(
    s,
    b.reactions!(
      s,
      { type: 'afterEnemyAttack', enemy: 'foe', investigator: 'a' },
      s.assets['08075']!,
    )[0]!.then,
  )
  expect(s.assets['08075']!.uses).toBe(2)
  s = clear(test(s))
  const before = skillTestValue(s).total
  s = run(s, b.fastOptions!(s, s.assets['08075']!)[0]!.then)
  expect(skillTestValue(s).total).toBe(before + 2)
  expect(s.assets['08075']!.uses).toBe(1)
  expect(b.fastOptions!(s, s.assets['08075']!)).toEqual([])
  expect(
    b.reactions!(
      s,
      { type: 'afterEnemyAttack', enemy: 'foe', investigator: 'b' },
      s.assets['08075']!,
    ),
  ).toEqual([])
})
it.each(['damage', 'horror'] as const)(
  'Thermos heals %s with the target investigator trauma bonus',
  (kind) => {
    let s = withAsset(patch({ damage: 3, horror: 3 })(start()), '04274')
    s.campaignLog = emptyCampaignLog(['a'])
    s.campaignLog.investigators.a!.physicalTrauma = 2
    s.campaignLog.investigators.a!.mentalTrauma = 2
    s = activate(
      s,
      options(s, '04274').find(
        (o) => o.label === (kind === 'damage' ? 'choice.healDamageOf' : 'choice.healHorrorOf'),
      )!,
    )
    expect(me(s)[kind]).toBe(1)
    expect(s.assets['04274']).toMatchObject({ uses: 2, exhausted: true })
  },
)
it.each(['resources', 'draw'])('Drawing Thin increases actual difficulty and grants %s', (mode) => {
  let s = withAsset(patch({ deck: ['01093'] })(start()), '05159')
  s = test(s)
  s = choose(s, 'choice.toolThin')
  s = choose(
    s,
    mode === 'draw' ? 'choice.drawCards' : 'choice.gainResources',
    mode === 'draw' ? { n: 1 } : { n: 2 },
  )
  expect(s.skillTest!.difficulty).toBe(5)
  expect(s.assets['05159']!.exhausted).toBe(true)
  expect(mode === 'draw' ? me(s).hand.length : me(s).resources).toBe(mode === 'draw' ? 2 : 22)
})
it('Michael Leigh caps evidence, boosts intellect/combat, and spends evidence when initiating an attack', () => {
  let s = withAsset(foe(start()), '08086', { uses: 2 })
  const b = playerCardBehavior('08086')!,
    a = s.assets['08086']!
  s = run(
    s,
    b.reactions!(
      s,
      {
        type: 'afterSkillTest',
        investigator: 'a',
        kind: 'investigate',
        succeeded: true,
        margin: 1,
      },
      a,
    )[0]!.then,
  )
  expect(s.assets['08086']!.uses).toBe(3)
  expect(
    b.reactions!(
      s,
      {
        type: 'afterSkillTest',
        investigator: 'a',
        kind: 'investigate',
        succeeded: true,
        margin: 1,
      },
      s.assets['08086']!,
    ),
  ).toEqual([])
  s = dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty: 2,
    kind: { type: 'fight', enemy: 'foe' },
  })
  s = choose(s, 'choice.toolAttackDamage')
  expect(s.enemies.foe!.damageTaken).toBe(2)
  expect(s.assets['08086']).toMatchObject({ uses: 2, exhausted: true })
})
it('Dr. Charles West adds a Tool slot and deals damage only on an exact margin of one or three', () => {
  let s = withAsset(foe(start()), '10041')
  const b = playerCardBehavior('10041')!
  expect(b.restrictedSlots).toEqual([{ slot: 'hand', count: 1, trait: 'Tool' }])
  expect(restrictedSlotCapacity(s, 'a', 'hand')).toEqual([{ trait: 'Tool', count: 1 }])
  for (const n of [0, 2, 4])
    expect(
      b.reactions!(
        s,
        {
          type: 'afterSkillTest',
          investigator: 'a',
          kind: 'investigate',
          succeeded: true,
          margin: n,
        },
        s.assets['10041']!,
      ),
    ).toEqual([])
  s = run(
    s,
    b.reactions!(
      s,
      {
        type: 'afterSkillTest',
        investigator: 'a',
        kind: 'investigate',
        succeeded: true,
        margin: 3,
      },
      s.assets['10041']!,
    )[0]!.then,
  )
  s = choose(s, 'choice.toolDamage', { n: 1, enemy: 'Ghoul' })
  expect(s.enemies.foe!.damageTaken).toBe(1)
  expect(s.assets['10041']!.exhausted).toBe(true)
})
it.each([0, 1])(
  'Kirby reveals five cards and draws only parity %i, including X as zero',
  (parity) => {
    let s = withAsset(
      patch({ deck: ['01087', '01088', '02010', '01093', '01075', '01089'] })(start()),
      '08032',
    )
    const b = playerCardBehavior('08032')!
    s = run(
      s,
      b.reactions!(
        s,
        { type: 'afterAssetEntersPlay', investigator: 'a', asset: '08032' },
        s.assets['08032']!,
      )[0]!.then,
    )
    s = choose(s, parity ? 'choice.toolOdd' : 'choice.toolEven')
    expect(s.pending!.question.story!.effects).toHaveLength(5)
    s = choose(s, 'choice.continue')
    const matched = parity ? ['01075'] : ['01087', '01088', '02010']
    expect(me(s).hand.sort()).toEqual(matched.sort())
    expect(me(s).deck).toContain('01089')
  },
)
it('Mortar and Pestle puts resources on the asset and makes them available for Spells only', () => {
  let s = withAsset(start(), '11037')
  const b = playerCardBehavior('11037')!
  s = run(
    s,
    b.reactions!(
      s,
      { type: 'afterDiscoverClues', investigator: 'a', location: 'A', amount: 1 },
      s.assets['11037']!,
    )[0]!.then,
  )
  expect(s.assets['11037']).toMatchObject({ uses: 1, exhausted: true })
  expect(b.usesAsResources!(s, s.assets['11037']!, 'a', '01060')).toBe(true)
  expect(b.usesAsResources!(s, s.assets['11037']!, 'a', '01087')).toBe(false)
  expect(b.usesAsResources!(s, s.assets['11037']!, 'b', '01060')).toBe(false)
})
it('Alton earns evidence on exactly three and spends shroud evidence for a clue', () => {
  let s = withAsset(start(), '11033')
  const b = playerCardBehavior('11033')!
  const t = {
    type: 'afterSkillTest' as const,
    investigator: 'a',
    kind: 'effect' as const,
    succeeded: true,
    margin: 3,
  }
  for (let n = 0; n < 2; n++) s = run(s, b.reactions!(s, t, s.assets['11033']!)[0]!.then)
  expect(options(s, '11033')[0]!.costs).toContainEqual({
    type: 'SpendUses',
    asset: '11033',
    amount: 2,
  })
  s = activate(s, options(s, '11033')[0]!)
  expect(me(s).clues).toBe(1)
  expect(s.assets['11033']).toMatchObject({ uses: 0, exhausted: true })
  expect(b.reactions!(s, { ...t, margin: 2 }, s.assets['11033']!)).toEqual([])
})
it('Ever Vigilant plays sequential assets at a discount and stops after three', () => {
  let s = patch({ hand: ['01087', '01087', '01075', '01088'], resources: 10 })(start())
  s = event(s, '03023')
  for (const c of ['01087', '01087', '01075'])
    s = choose(s, 'choice.toolPlay', { card: playerCardDef(c)!.name })
  expect(Object.values(s.assets)).toHaveLength(3)
  expect(me(s).resources).toBe(8)
  expect(me(s).hand).toEqual(['01088'])
})
it.each(['03033', '09095'])(
  '%s plays Spell/Ritual cards at minus three, with discard access only at level three',
  (code) => {
    let s = patch({
      hand: code === '03033' ? ['01060'] : [],
      discard: code === '09095' ? ['01060'] : [],
      resources: 0,
    })(start())
    s = event(s, code)
    if (code === '09095') s = choose(s, 'choice.skip')
    s = choose(s, 'choice.toolPlay', { card: playerCardDef('01060')!.name })
    expect(Object.values(s.assets).some((a) => a.code === '01060')).toBe(true)
    expect(me(s).resources).toBe(0)
    expect(
      playerCardBehavior('03033')!.canPlay!(patch({ hand: [], discard: ['01060'] })(start()), 'a'),
    ).toBe(false)
  },
)
it('Uncage the Soul 3 can discard and replay a Spell asset with refreshed uses', () => {
  let s = withAsset(patch({ resources: 0 })(start()), '01060', { uses: 0 })
  s = event(s, '09095')
  s = choose(s, 'choice.toolDiscardSpell', { card: playerCardDef('01060')!.name })
  s = choose(s, 'choice.toolPlay', { card: playerCardDef('01060')!.name })
  expect(s.assets['01060']).toBeUndefined()
  expect(Object.values(s.assets)[0]!.uses).toBe(4)
})
it('Word of Command draws a Spell, excludes other traits, and shuffles the remainder', () => {
  let s = patch({ deck: ['01060', '01087', '01093'] })(start())
  s = event(s, '06202')
  expect(s.pending!.question.choices.filter((c) => c.label === 'choice.takeCard')).toHaveLength(1)
  s = choose(s, 'choice.takeCard', { card: playerCardDef('01060')!.name })
  expect(me(s).hand).toEqual(['01060'])
  expect(me(s).deck).toHaveLength(2)
})
it('Quantum Flux shuffles prior discard including duplicate copies and removes only the event being played', () => {
  let s = patch({
    hand: ['03196'],
    discard: ['03196', '01093', '01093'],
    deck: ['01088'],
    resources: 10,
  })(start())
  s = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '03196', byEffect: true })
  expect(me(s).discard).toEqual([])
  expect([...me(s).hand, ...me(s).deck].filter((c) => c === '03196')).toHaveLength(1)
  expect([...me(s).hand, ...me(s).deck].filter((c) => c === '01093')).toHaveLength(2)
  expect(me(s).hand).toHaveLength(1)
})
it('Nothing Left to Lose tops up independently and is absent from all scenario piles afterward', () => {
  let s = patch({ hand: ['06284'], deck: Array(10).fill('01093'), resources: 1 })(start())
  s = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '06284', byEffect: true })
  expect(me(s).resources).toBe(5)
  expect(me(s).hand).toHaveLength(5)
  expect([...me(s).deck, ...me(s).hand, ...me(s).discard]).not.toContain('06284')
  const high = patch({ hand: Array(6).fill('01093'), resources: 7 })(start()),
    next = event(high, '06284')
  expect(me(next).resources).toBe(7)
  expect(me(next).hand).toHaveLength(6)
})
it('Hand-Eye Coordination ignores only the action cost while preserving ammo and own-turn restrictions', () => {
  let s = withAsset(foe(patch({ actionsRemaining: 0 })(start())), '05115')
  expect(playerCardBehavior('10030')!.canPlay!(s, 'a')).toBe(true)
  s = event(s, '10030')
  s = choose(s, 'choice.toolAttack', { card: playerCardDef('05115')!.name })
  expect(me(s).actionsRemaining).toBe(0)
  expect(s.assets['05115']!.uses).toBe(4)
  expect(s.enemies.foe!.damageTaken).toBe(2)
  expect(playerCardBehavior('10030')!.canPlay!({ ...clear(s), activeTurn: 'b' }, 'a')).toBe(false)
})
it('Hand-Eye Coordination preserves the extra investigation cost without taking an action or provoking', () => {
  let s = withAsset(foe(patch({ actionsRemaining: 1 })(start())), '07021')
  s.locations.A = { ...s.locations.A!, investigateExtraActions: 1 }
  expect(playerCardBehavior('10030')!.canPlay!(patch({ actionsRemaining: 0 })(s), 'a')).toBe(false)
  s = event(s, '10030')
  s = choose(s, 'ability.investigateWith')
  expect(me(s).actionsRemaining).toBe(0)
  expect(me(s).actionsTaken ?? 0).toBe(0)
  expect(me(s).damage).toBe(0)
  expect(me(s).horror).toBe(0)
  expect(me(s).clues).toBe(1)
  expect(s.assets['07021']).toMatchObject({ uses: 2, exhausted: true })
})
it.each(['10057', '10094', '10073', '10083', '05020', '11056', '11072'])(
  '%s resolves its distinct Parley effect against an ordinary enemy',
  (code) => {
    let s = foe(patch({ damage: 3 })(start()), 'foe', {
      damage: 2,
      horror: 1,
      health: 4,
      maxHealth: 4,
    })
    s.locations.B = { ...s.locations.B!, revealed: true, clues: 2 }
    s = event(s, code)
    s = choose(s, 'choice.toolParley', { enemy: 'Ghoul' })
    if (code === '10094') s = choose(s, 'choice.toolDrain', { n: 2 })
    if (['10073', '10083'].includes(code)) s = choose(s, 'choice.skip')
    if (code === '05020') s = choose(s, 'choice.location', { location: 'Room B' })
    if (code === '10057') {
      expect(me(s).clues).toBe(2)
      expect(s.enemies.foe).toMatchObject({
        engagedWith: null,
        exhausted: true,
        stayExhausted: true,
      })
    }
    if (code === '10094') {
      expect(me(s).damage).toBe(1)
      expect(s.enemies.foe!.damageTaken).toBe(2)
    }
    if (code === '10073') expect(s.enemies.foe!.damageTaken).toBe(2)
    if (code === '10083') expect(s.enemies.foe!.damageTaken).toBe(3)
    if (code === '05020') expect(me(s).clues).toBe(2)
    if (code === '11056') {
      expect(s.enemies.foe).toBeUndefined()
      expect(s.encounterDeck.some((c) => c.code === 'test-ghoul')).toBe(true)
    }
    if (code === '11072') expect(s.enemies.foe).toBeUndefined()
  },
)
it.each(['10057', '10094', '11056', '11072'])('%s respects its Elite branch', (code) => {
  let s = foe(patch({ damage: 3 })(start()), 'foe', { traits: ['Elite'], health: 4, maxHealth: 4 })
  s = event(s, code)
  s = choose(s, 'choice.toolParley', { enemy: 'Ghoul' })
  if (code === '10094') {
    expect(s.pending!.question.choices).toHaveLength(1)
    s = choose(s, 'choice.toolDrain', { n: 1 })
    expect(me(s).damage).toBe(2)
  }
  expect(s.enemies.foe).toBeDefined()
  if (code === '10057') expect(s.enemies.foe).toMatchObject({ engagedWith: 'a', exhausted: false })
  if (code === '11056') expect(s.enemies.foe!.damageTaken).toBe(2)
  if (code === '11072') expect(s.enemies.foe!.damageTaken).toBe(3)
})
it('Whispers of Doom places doom on failure and rejects weakness enemies', () => {
  let s = foe(patch({ skills: { willpower: 0, combat: 0, intellect: 0, agility: 0 } })(start()))
  s = event(s, '11072')
  s = choose(s, 'choice.toolParley')
  expect(s.enemies.foe!.doom).toBe(1)
  expect(playerCardBehavior('11072')!.canPlay!(foe(start(), 'foe', { owner: 'a' }), 'a')).toBe(
    false,
  )
})
it('new doom placements do not cause an immediate agenda advance', () => {
  let s = withAsset(start(), '03112', { doom: 2 })
  s = activate(s, options(s, '03112')[0]!)
  s = choose(s, 'choice.toolDoom', { n: 1 })
  expect(s.agendaIndex).toBe(0)
  expect(s.assets['03112']!.doom).toBe(3)
  expect(me(s).resources).toBe(23)
  let failed = foe(
    patch({ skills: { willpower: 0, combat: 0, intellect: 0, agility: 0 } })(start()),
    'foe',
    { doom: 2 },
  )
  failed = event(failed, '11072')
  failed = choose(failed, 'choice.toolParley')
  expect(failed.agendaIndex).toBe(0)
  expect(failed.enemies.foe!.doom).toBe(3)
})
it('doom replaced with damage grants neither a new Tome bonus nor Renfield income', () => {
  let s = withAsset({ ...start(), doomBecomesDamage: true }, '03112')
  s = activate(s, options(s, '03112')[0]!)
  s = choose(s, 'choice.toolDoom', { n: 1 })
  expect(me(s).resources).toBe(20)
  expect(me(s).damage).toBe(1)
  expect(s.assets['03112']!.doom ?? 0).toBe(0)
  let attack = withAsset(foe({ ...start(), doomBecomesDamage: true }), '07159')
  attack = activate(
    attack,
    options(attack, '07159').find((o) => o.params?.doom === 1 && o.params.skill === 'combat')!,
  )
  expect(attack.enemies.foe!.damageTaken).toBe(1)
  expect(me(attack).damage).toBe(1)
})
it('event-granted play respects play restrictions and pays remaining costs', () => {
  registerScenario({ id: 'tools-no-spells', cannotPlay: (_s, _by, c) => c === '01060' })
  const s = patch({ hand: ['01060'], resources: 0 })(start())
  expect(playerCardBehavior('03033')!.canPlay!({ ...s, scenarioId: 'tools-no-spells' }, 'a')).toBe(
    false,
  )
  const poor = patch({ hand: ['01033'], resources: 0 })(start())
  expect(playerCardBehavior('03023')!.canPlay!(poor, 'a')).toBe(false)
})
it.each([
  ['03112', ['willpower']],
  ['08086', ['intellect', 'combat']],
  ['08032', ['intellect']],
  ['11033', ['agility']],
] as const)('%s applies exactly its printed continuous skill bonuses', (code, boosted) => {
  const s = withAsset(start(), code, { doom: code === '03112' ? 1 : 0 })
  for (const skill of ['willpower', 'intellect', 'combat', 'agility'] as const) {
    const opened = test(s, skill)
    expect(skillTestValue(opened).total).toBe(10 + (boosted.some((k) => k === skill) ? 1 : 0))
  }
})
