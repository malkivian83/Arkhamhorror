// RR: Skill Tests ST.1/ST.7, Uses, Costs, Draw, Healing, Research, Lasting Effects.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerTreachery,
  registerPlayerCards,
  effectiveVitals,
  skillTestValue,
  turnStartedAt,
  type GameState,
  type Message,
  type AbilityOption,
  type Trigger,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = (players = ['a']) =>
  patch({ hand: [], resources: 20, skills: { willpower: 8, intellect: 8, combat: 8, agility: 8 } })(
    { ...clear(game(players)), chaosBag: [0] },
  )
const b = (code: string) => playerCardBehavior(code)!
const run = (s: GameState, ms: Message[]) =>
  ms.reduce<GameState>((s, m) => dispatch(s, m), clear(s))
const options = (s: GameState, code: string) => b(code).abilities!(s, s.assets[code]!, 'a')
const activate = (s: GameState, o: AbilityOption) =>
  dispatch(clear(s), {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    ...(o.costs ? { costs: o.costs } : {}),
    then: o.then,
  })
const foe = (
  s: GameState,
  id = 'foe',
  changes: Partial<GameState['enemies'][string]> = {},
): GameState => ({
  ...s,
  enemies: {
    ...s.enemies,
    [id]: {
      ...ghoul,
      id,
      location: 'A',
      engagedWith: 'a',
      health: 20,
      maxHealth: 20,
      damageTaken: 0,
      exhausted: false,
      doom: 0,
      traits: ['Humanoid'],
      ...changes,
    },
  },
})
const clues = (s: GameState, n = 10): GameState => ({
  ...s,
  locations: { ...s.locations, A: { ...s.locations.A!, clues: n, shroud: 2, shroudModifier: 0 } },
})
const begin = (s: GameState, source?: string) =>
  dispatch(patch({ hand: ['01093'] })(clear(s)), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 3,
    ...(source ? { source } : {}),
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const charges = ['08090', '08092', '08101', '08103', '08109', '08111']
it.each(charges)('%s pays charges only on success and preserves its printed result', (code) => {
  let s = withAsset(foe(clues(start())), code)
  const uses = s.assets[code]!.uses,
    high = ['08092', '08103', '08111'].includes(code),
    amount = code === '08109' ? 1 : high && code !== '08111' ? 3 : 2
  s = activate(s, options(s, code)[0]!)
  if (s.pending?.question.choices.some((c) => c.label === 'choice.recoverySpend'))
    s = choose(s, 'choice.recoverySpend', { n: amount })
  expect(s.assets[code]!.uses).toBe(uses - amount)
  if (code.startsWith('0809')) expect(s.enemies.foe!.damageTaken).toBe(amount)
  else if (['08101', '08103'].includes(code)) expect(me(s).clues).toBe(amount)
  else {
    expect(s.enemies.foe!.exhausted).toBe(true)
    expect(me(s).actionsRemaining).toBe(2 + amount)
  }
})
it.each(charges)('%s keeps its charges after a failed test', (code) => {
  let s = withAsset(foe(clues({ ...start(), chaosBag: ['autoFail'] })), code)
  const uses = s.assets[code]!.uses
  s = activate(s, options(s, code)[0]!)
  expect(s.assets[code]!.uses).toBe(uses)
  expect(me(s).clues).toBe(0)
  expect(s.enemies.foe!.damageTaken).toBe(0)
})
it.each(charges)(
  '%s applies its distinct success-by-zero penalty after choosing charges',
  (code) => {
    let s = withAsset(foe(clues(start())), code)
    s = begin(s, code)
    s = patch({ hand: ['01088', '01088', '01088'] })(s)
    s = {
      ...s,
      skillTest: {
        ...s.skillTest!,
        succeeded: true,
        modifiedSkill: 3,
        kind: code.startsWith('0809')
          ? { type: 'fight', enemy: 'foe' }
          : ['08101', '08103'].includes(code)
            ? { type: 'investigate', location: 'A' }
            : { type: 'evade', enemy: 'foe' },
      },
    }
    s = run(s, b(code).beforeResults!(s, s.skillTest!, s.assets[code]!))
    if (s.pending?.question.choices.some((c) => c.label === 'choice.recoverySpend'))
      s = choose(s, 'choice.recoverySpend', { n: 1 })
    const high = ['08092', '08103', '08111'].includes(code),
      penalty = high ? 2 : 1
    if (code.startsWith('0809')) expect(me(s).actionsRemaining).toBe(3 - penalty)
    else if (['08101', '08103'].includes(code)) {
      while (s.pending?.question.choices.some((c) => c.label === 'choice.discard'))
        s = choose(s, 'choice.discard')
      expect(me(s).hand).toHaveLength(3 - penalty)
    } else expect(me(s).damage).toBe(penalty)
  },
)
it('a depleted success source still applies its collateral and cannot spend imaginary charges', () => {
  let s = withAsset(foe(start()), '08090')
  s = begin(s, '08090')
  const a = s.assets['08090']!
  s = {
    ...s,
    assets: {},
    skillTest: {
      ...s.skillTest!,
      succeeded: true,
      modifiedSkill: 3,
      kind: { type: 'fight', enemy: 'foe' },
    },
  }
  s = run(s, b('08090').beforeResults!(s, s.skillTest!, a))
  expect(s.skillTest!.kind).toMatchObject({ extraDamage: -1 })
  expect(me(s).actionsRemaining).toBe(2)
})
it.each(['05119', '05194', '05195'])(
  '%s adds an existing icon only to the exact physical copy committed',
  (code) => {
    let s = withAsset(start(), code)
    s = begin(s)
    s = patch({ hand: ['01093', '01093'] })(s)
    s = dispatch(clear(s), { type: 'CommitCard', investigator: 'a', code: '01093' })
    s = choose(s, 'choice.recoveryUse')
    s = choose(s, 'choice.recoveryIcon', { skill: 'wild' })
    const boosted = skillTestValue(s).icons
    s = dispatch(clear(s), { type: 'CommitCard', investigator: 'a', code: '01093' })
    expect(skillTestValue(s).icons).toBe(boosted + 2)
    expect(s.skillTest!.committed[0]!.iconBonus).toEqual({ wild: 1 })
    expect(s.skillTest!.committed[1]!.iconBonus).toBeUndefined()
    expect(s.skillTest!.committed[0]!.id).not.toBe(s.skillTest!.committed[1]!.id)
    if (code === '05194')
      expect(s.skillTest!.tokenOnSuccess).toContainEqual({
        type: 'DrawCards',
        investigator: 'a',
        amount: 1,
      })
    if (code === '05195') expect(s.skillTest!.tokenOnFail).toHaveLength(1)
  },
)
it('Survivor Totem returns its copy after Take Heart resolves, retaining last-known effects', () => {
  let s = withAsset(patch({ deck: ['01088', '01088'] })(start()), '05195')
  s = begin(s)
  s = patch({ hand: ['04201'] })(s)
  s = dispatch(clear(s), { type: 'CommitCard', investigator: 'a', code: '04201' })
  s = choose(s, 'choice.recoveryUse')
  s = choose(s, 'choice.recoveryUse')
  s = { ...s, skillTest: { ...s.skillTest!, succeeded: false, modifiedSkill: 0 } }
  s = dispatch(clear(s), { type: 'ApplySkillTestResults' })
  expect(me(s).hand).toContain('04201')
  expect(me(s).hand.filter((c) => c === '01088')).toHaveLength(2)
  expect(me(s).resources).toBe(22)
  s = dispatch(clear(s), { type: 'EndSkillTest' })
  expect(me(s).hand.filter((c) => c === '04201')).toHaveLength(1)
  expect(me(s).discard).not.toContain('04201')
})
it('Totem copy identifiers do not shift when another committed card leaves the array', () => {
  let s = withAsset(start(), '05195')
  s = begin(s)
  s = patch({ hand: ['01093', '01093'] })(s)
  s = dispatch(clear(s), { type: 'CommitCard', investigator: 'a', code: '01093' })
  s = choose(s, 'choice.skip')
  s = dispatch(clear(s), { type: 'CommitCard', investigator: 'a', code: '01093' })
  s = choose(s, 'choice.recoveryUse')
  s = choose(s, 'choice.recoveryIcon')
  const after = s.skillTest!.tokenOnFail
  s = {
    ...s,
    skillTest: { ...s.skillTest!, committed: s.skillTest!.committed.slice(1), succeeded: false },
  }
  s = run(s, after)
  expect(me(s).hand).toEqual(['01093'])
})
it('a delayed Totem return cannot create a hand for an eliminated investigator', () => {
  let s = withAsset(start(), '05195')
  s = begin(s)
  s = {
    ...s,
    skillTest: {
      ...s.skillTest!,
      succeeded: false,
      committed: [{ id: 0, code: '01093', by: 'a' }],
    },
  }
  s = patch({ eliminated: true })(s)
  expect(b('05195').effect!(s, 'a', 'return', { commitId: 0 })).toEqual([])
})
it.each(['05117', '05190', '05191'])(
  '%s boosts treachery tests and distinguishes its attack upgrade',
  (code) => {
    let s = withAsset(foe(start()), code)
    s = begin(s)
    expect(b(code).testOptions!(s, s.skillTest!, s.assets[code]!)).toEqual([])
    s = { ...s, skillTest: { ...s.skillTest!, skill: 'willpower', tags: ['treachery'] } }
    const o = b(code).testOptions!(s, s.skillTest!, s.assets[code]!)[0]!
    const before = s.assets[code]!.uses
    s = run(s, o.then)
    expect(s.skillTest!.baseModifier).toBe(code === '05190' ? 3 : 2)
    expect(s.assets[code]!).toMatchObject({ exhausted: true, uses: before - 1 })
    s = withAsset(foe(start()), code)
    s = activate(s, options(s, code)[0]!)
    expect(me(s).discard).toContain(code)
    expect(s.enemies.foe!.damageTaken).toBe(code === '05190' ? 2 : 1)
    expect(s.enemies.foe!.exhausted).toBe(code === '05191')
  },
)
it('Tooth of Eztli uses explicit treachery provenance including player weaknesses, not generic scenario tags', () => {
  registerTreachery({
    code: 'treachery-provenance-test',
    revelation: (_s, by) => [
      {
        type: 'BeginSkillTest',
        investigator: by,
        skill: 'willpower',
        difficulty: 3,
        kind: { type: 'effect', source: 'Test', onSuccess: [], onFail: [], onFailEach: [] },
      },
    ],
  })
  let s = withAsset(patch({ hand: ['01093'] })(start()), '04023')
  s = {
    ...s,
    treacheries: {
      t: {
        id: 't',
        code: 'treachery-provenance-test',
        name: 'Test',
        kind: 'treachery',
        keywords: [],
        placement: { type: 'threatArea', investigator: 'a' },
        owner: 'a',
      },
    },
  }
  s = dispatch(clear(s), { type: 'RevealTreachery', investigator: 'a', treachery: 't' })
  expect(s.skillTest!.tags).toContain('treachery')
  expect(b('04023').skillModifier!(s, s.assets['04023']!, s.skillTest!)).toBe(1)
  const trig: Trigger = {
    type: 'afterSkillTest',
    investigator: 'a',
    kind: 'effect',
    succeeded: true,
    margin: 1,
  }
  expect(b('04023').reactions!(s, trig, s.assets['04023']!)).toHaveLength(1)
  s = { ...s, skillTest: { ...s.skillTest!, tags: ['scenario'] } }
  expect(b('04023').skillModifier!(s, s.assets['04023']!, s.skillTest!)).toBe(0)
})
it.each(['04230', '04231', '53004'])(
  '%s reads its researched initial secrets and requires the complete draw batch',
  (code) => {
    let s = withAsset(foe(start()), code, { uses: 1 })
    s = {
      ...s,
      campaignLog: {
        ...s.campaignLog!,
        values: { ...s.campaignLog!.values, identifiedStone: '7' },
      },
    }
    expect(b(code).initialUses!(s, 'a')).toBe(7)
    expect(b(code).requiredResearch).toBe('identifiedStone')
    expect(
      b(code).reactions!(
        s,
        { type: 'whenCardsDrawn', investigator: 'a', amount: 2 },
        s.assets[code]!,
      ),
    ).toEqual([])
  },
)
it('Knowledge of the Elders resolves its whole draw batch before drawn weakness effects', () => {
  let s = withAsset(foe(patch({ deck: ['01088', '01088'] })(start())), '04230', { uses: 5 })
  s = dispatch(clear(s), { type: 'DrawCards', investigator: 'a', amount: 2 })
  s = choose(s, 'choice.recoveryUse')
  s = choose(s, 'choice.recoveryTarget')
  expect(s.assets['04230']!.uses).toBe(3)
  expect(s.enemies.foe!.damageTaken).toBe(2)
  expect(me(s).hand).toHaveLength(2)
})
it('Minds in Harmony heals one local card, not a split of the batch', () => {
  let s = withAsset(withAsset(start(), '04231', { uses: 5 }), '05274', { horror: 3 })
  s = run(
    s,
    b('04231').reactions!(
      s,
      { type: 'whenCardsDrawn', investigator: 'a', amount: 2 },
      s.assets['04231']!,
    )[0]!.then,
  )
  s = choose(s, 'choice.recoveryTarget')
  expect(s.assets['04231']!.uses).toBe(3)
  expect(s.assets['05274']!.horror).toBe(1)
})
it('Minds in Harmony can heal before a drawn weakness resolves its revelation', () => {
  registerPlayerCards([
    {
      code: 'stone-timing-weakness',
      name: 'Timing',
      type: 'treachery',
      class: 'neutral',
      traits: [],
      weakness: 'basicweakness',
    },
  ])
  registerTreachery({
    code: 'stone-timing-weakness',
    revelation: (_s, by) => [{ type: 'TakeDamage', investigator: by, damage: 0, horror: 2 }],
  })
  let s = withAsset(start(), '04231', { uses: 2 })
  const sanity = effectiveVitals(s, me(s)).sanity
  s = patch({ horror: sanity - 2, deck: ['stone-timing-weakness'] })(s)
  s = dispatch(clear(s), { type: 'DrawCards', investigator: 'a', amount: 1 })
  expect(me(s).eliminated).toBe(false)
  s = choose(s, 'choice.recoveryUse')
  s = choose(s, 'choice.recoveryTarget')
  expect(me(s).horror).toBe(sanity - 1)
  expect(me(s).eliminated).toBe(false)
})
it('Transient Thoughts spends the full batch and makes consecutive mandatory moves', () => {
  let s = withAsset(start(), '53004', { uses: 5 })
  s = run(
    s,
    b('53004').reactions!(
      s,
      { type: 'whenCardsDrawn', investigator: 'a', amount: 2 },
      s.assets['53004']!,
    )[0]!.then,
  )
  s = choose(s, 'choice.recoveryUse')
  for (let n = 0; n < 2 && s.pending; n++) {
    expect(s.pending.question.choices.some((c) => c.label === 'choice.skip')).toBe(false)
    s = choose(s, 'action.move')
  }
  expect(s.assets['53004']!.uses).toBe(3)
})
it.each(['04149', '10032'])(
  '%s heals more only after an actual treachery draw in the current round',
  (code) => {
    registerTreachery({ code: 'draw-history-test', revelation: () => [] })
    let s = patch({ damage: 5, deck: ['01088'] })(start())
    s = dispatch(clear(s), {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: { kind: 'treachery', code: 'draw-history-test', name: 'Test', keywords: [] },
    })
    expect(me(s).drewTreacheryRound).toBe(s.round)
    expect(b(code).canPlay!(s, 'a')).toBe(true)
    s = run(s, b(code).play!(s, 'a'))
    expect(me(s).damage).toBe(code === '04149' ? 3 : 2)
    expect(b(code).canPlay!(patch({ actionsTaken: 1 })(s), 'a')).toBe(false)
    s = patch({ damage: 5, deck: ['01088'] })({ ...s, round: s.round + 1 })
    s = run(s, b(code).play!(s, 'a'))
    expect(me(s).damage).toBe(code === '04149' ? 4 : 3)
  },
)
it('Lupara records entry into the actual turn and loses the extra bonus in later turns or phases', () => {
  let s = foe(start())
  s = dispatch(clear(s), { type: 'PutAssetIntoPlay', investigator: 'a', code: '03309' })
  const a = Object.values(s.assets).find((a) => a.code === '03309')!
  expect(a.enteredAtTurn).toBe(turnStartedAt(s))
  const ability = b('03309').abilities!(s, a, 'a')[0]!
  expect(ability.then[0]).toMatchObject({ modifier: 2, kind: { extraDamage: 2 } })
  const late = { ...s, phase: 'mythos' as const }
  expect(b('03309').abilities!(late, a, 'a')[0]!.then[0]).toMatchObject({
    modifier: 1,
    kind: { extraDamage: 1 },
  })
})
it.each([
  ['08114', false, 'damage'],
  ['08114', true, 'horror'],
  ['08115', false, 'horror'],
  ['08115', true, 'damage'],
] as const)('%s heals %s/%s only at margin two or more', (code, success, kind) => {
  let s = withAsset(start(), code, { damage: 1, horror: 1 })
  const a = s.assets[code]!
  const t: Trigger = {
    type: 'afterSkillTest',
    investigator: 'a',
    kind: 'effect',
    succeeded: success,
    margin: success ? 2 : -2,
  }
  expect(b(code).reactions!(s, { ...t, margin: success ? 1 : -1 }, a)).toEqual([])
  s = run(s, b(code).reactions!(s, t, a)[0]!.then)
  expect(s.assets[code]![kind]).toBe(0)
  expect(s.assets[code]!.exhausted).toBe(true)
})
it.each([
  ['03197', 'skull', -1],
  ['03197', 0, 3],
  ['60429', 'skull', 1],
  ['60429', 'elderSign', 4],
] as const)(
  '%s resolves outside token %s with its reviewed recharge outcome',
  (code, token, amount) => {
    let s = withAsset({ ...start(), chaosBag: [token] }, '01060', { uses: 0 })
    s = run(s, b(code).play!(s, 'a'))
    s = choose(s, 'choice.recoveryTarget')
    if (amount < 0) expect(s.assets['01060']).toBeUndefined()
    else expect(s.assets['01060']!.uses).toBe(amount)
    expect(s.chaosBag).toEqual([token])
  },
)
it('Hypnotic Gaze 2 cancels a local attack, tests the token and lets its caster choose damage or horror', () => {
  let s = foe(patch({ hand: ['60423'] })({ ...start(), chaosBag: ['skull'] }), 'foe', {
    damage: 1,
    horror: 3,
  })
  s = run(
    s,
    b('60423').handReactions!(
      s,
      { type: 'whenEnemyAttacks', enemy: 'foe', investigator: 'a' },
      'a',
    )[0]!.then,
  )
  s = choose(s, 'choice.recoveryDamage', { n: 1 })
  expect(s.enemies.foe!.damageTaken).toBe(1)
  expect(s.canceledAttack).toBe('foe')
})
it('Dodge 2 cancels before its separate agility test and deals damage on success', () => {
  let s = foe(patch({ hand: ['08026'] })(start()))
  s = run(
    s,
    b('08026').handReactions!(
      s,
      { type: 'whenEnemyAttacks', enemy: 'foe', investigator: 'a' },
      'a',
    )[0]!.then,
  )
  expect(s.enemies.foe!.damageTaken).toBe(1)
  expect(s.canceledAttack).toBe('foe')
})
it('Lucky 2 adds skill value and draws a card while preserving the current test', () => {
  let s = begin(patch({ deck: ['01088'] })(start()))
  const t = s.skillTest!
  s = run(s, b('01084').play!(s, 'a'))
  expect(s.skillTest!.baseModifier).toBe(t.baseModifier + 2)
  expect(me(s).hand).toContain('01088')
})
it('Calling in Favors returns an Ally before searching with its printed-cost discount', () => {
  let s = withAsset(patch({ deck: ['01032'], resources: 10 })(start()), '05274')
  s = run(s, b('03158').play!(s, 'a'))
  s = choose(s, 'choice.recoveryReturn')
  expect(me(s).hand).toContain('05274')
  expect(s.assets['05274']).toBeUndefined()
  s = choose(s, 'choice.takeCard')
  expect(Object.values(s.assets).some((a) => a.code === '01032')).toBe(true)
  expect(me(s).resources).toBe(10)
})
it('Ghastly Revelation shares clues globally, then defeats its investigator with mental trauma', () => {
  let s = patch({ location: 'B' }, 'b')(clues(start(['a', 'b'])))
  s = run(s, b('05275').play!(s, 'a'))
  s = choose(s, 'choice.recoveryGive', { n: 2 })
  expect(s.investigators[1]!.clues).toBe(2)
  expect(me(s).eliminated).toBe(true)
  expect(s.campaignLog!.investigators.a!.mentalTrauma).toBe(1)
})
it('Truth from Fiction 2 distributes three secrets locally when a clue is present', () => {
  let s = withAsset(
    withAsset(patch({ location: 'A' }, 'b')(clues(start(['a', 'b']))), '05233'),
    '07111',
    { owner: 'b', uses: 0 },
  )
  s = run(s, b('53003').play!(s, 'a'))
  for (let n = 0; n < 3; n++)
    s = choose(s, 'choice.recoveryTarget', { name: playerCardDef('07111')!.name })
  expect(s.assets['07111']!.uses).toBe(3)
  expect(s.assets['05233']!.uses).toBe(0)
})
it('Clean Sneak assigns different options to different exhausted enemies', () => {
  let s = foe(foe(clues(start()), 'one', { exhausted: true }), 'two', { exhausted: true })
  s = run(s, b('09078').play!(s, 'a'))
  s = choose(s, 'choice.recoveryCleanResources', { enemy: s.enemies.one!.name })
  expect(s.pending!.question.choices.some((c) => c.label === 'choice.recoveryCleanResources')).toBe(
    false,
  )
  s = choose(s, 'choice.recoveryCleanClue')
  expect(me(s).resources).toBe(22)
  expect(me(s).clues).toBe(1)
})
