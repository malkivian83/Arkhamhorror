// RR: Skill Tests ST.2/ST.3/ST.7/ST.8, Committing Cards, Costs, Cannot, Then.
import { expect, it } from 'vitest'
import {
  availableAbilities,
  treacheryBehavior,
  canCommitFrom,
  dispatch,
  investigatorBehavior,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  registerPlayerCards,
  skillTestValue,
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
const run = (s: GameState, ...messages: Message[]) => dispatch(clear(s), ...messages)
function game(code = '07005') {
  const s = clear(throughSetup(newTestGame({ players: [code, 'b'] }))),
    d = playerCardDef(code)!
  return patch(
    { ...s, interactive: true, activeTurn: code, phase: 'investigation', chaosBag: [0] },
    {
      skills: d.skills!,
      health: d.health!,
      sanity: d.sanity!,
      hand: [],
      discard: [],
      resources: 10,
      deck: ['01088', '01088', '01087'],
      damage: 0,
      horror: 0,
      actionsRemaining: 3,
    },
  )
}
const begin = (s: GameState, difficulty = 2) =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: me(s).id,
    skill: 'combat',
    difficulty,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const commit = (s: GameState, code: string) =>
  choose(s, 'choice.commit', { card: playerCardDef(code)!.name })
const results = (s: GameState) =>
  has(s, 'choice.applyResults') ? choose(s, 'choice.applyResults') : s
const has = (s: GameState, label: string) =>
  !!s.pending?.question.choices.some((c) => c.label === label)
const finish = (s: GameState, success: boolean, margin = 2) =>
  run(
    {
      ...s,
      skillTest: {
        ...s.skillTest!,
        succeeded: success,
        modifiedSkill: s.skillTest!.difficulty + margin,
      },
    },
    { type: 'ApplySkillTestResults' },
    { type: 'EndSkillTest' },
  )
const call = (s: GameState) =>
  run(s, { type: 'ResolveWeakness', investigator: me(s).id, code: '07016' })
const put = (s: GameState, code: string) =>
  run(s, { type: 'PutAssetIntoPlay', investigator: me(s).id, code })

it('Silas returns exactly one own skill after seeing the token, removes its icons/effect and respects the round limit', () => {
  let s = begin(patch(game(), { hand: ['01091', '01091'] }), 7)
  s = commit(commit(s, '01091'), '01091')
  s = choose(s, 'choice.revealToken')
  s = results(choose(s, 'ability.silasReturn'))
  expect(me(s).hand.filter((c) => c === '01091')).toHaveLength(1)
  expect(me(s).discard.filter((c) => c === '01091')).toHaveLength(1)
  expect(me(s).hand).not.toContain('01088') // Removing one Overpower changes a success into failure.
  s = begin(patch(s, { hand: ['01091'] }), 7)
  s = choose(commit(s, '01091'), 'choice.revealToken')
  expect(has(s, 'ability.silasReturn')).toBe(false)
})

it('Silas cannot recover events, another investigator’s skill or already returned copies', () => {
  let s = begin(game())
  s = {
    ...s,
    skillTest: {
      ...s.skillTest!,
      committed: [
        { code: '01051', by: '07005' },
        { code: '01091', by: 'b' },
        { code: '01091', by: '07005', returnToHand: true },
      ],
    },
  }
  expect(
    investigatorBehavior('07005')!.reactions!(
      s,
      { type: 'afterRevealChaosToken', investigator: '07005', token: 0 },
      me(s),
    ),
  ).toEqual([])
})

it('Silas elder sign commits an eligible discarded skill with its effects, then returns it after success or failure', () => {
  let s = begin(patch({ ...game(), chaosBag: ['elderSign'] }, { discard: ['01091'] }), 7)
  s = choose(s, 'choice.revealToken')
  s = choose(s, 'choice.silasCommit', { card: 'Overpower' })
  // The optional reveal reaction can return it early; declining retains its icons and draw.
  if (has(s, 'ability.silasReturn')) s = choose(s, 'choice.skip')
  s = results(s)
  expect(me(s).hand).toContain('01091')
  expect(me(s).discard).not.toContain('01091')
})

it.each(['07014', '07015'])(
  '%s retrieves all own skill copies only after its asset actually returns',
  (code) => {
    let s = put(game(), code)
    const a = Object.values(s.assets).find((a) => a.code === code)!
    s = begin(patch(s, { hand: ['01091', '01091', '01051'] }))
    s = run(
      s,
      { type: 'CommitCard', investigator: '07005', code: '01091' },
      { type: 'CommitCard', investigator: '07005', code: '01091' },
      { type: 'CommitCard', investigator: '07005', code: '01051' },
    )
    s = { ...s, skillTest: { ...s.skillTest!, source: a.id } }
    s = choose(finish(s, true), 'choice.silasRetrieve')
    expect(me(s).hand.filter((c) => c === '01091')).toHaveLength(2)
    expect(me(s).hand).toContain(code)
    expect(me(s).discard).toContain('01051')
    expect(me(s).hand).not.toContain('01051')
  },
)

it('Harpoon retains its additional damage even after Silas recovers the only committed skill', () => {
  let s = put(game(), '07014')
  s = run(s, spawnAt('A', { ...ghoul, health: 5 }, null))
  const e = Object.values(s.enemies)[0]!,
    a = Object.values(s.assets).find((a) => a.code === '07014')!
  s = patch(s, { hand: ['01091'] })
  const ability = availableAbilities(s, '07005').find((o) => o.key === a.id + ':fight')!
  s = run(s, ...ability.then)
  expect(skillTestValue(s).modifier).toBe(1)
  s = choose(commit(s, '01091'), 'choice.revealToken')
  s = choose(s, 'ability.silasReturn')
  expect(s.skillTest!.source).toBe(a.id)
  expect(playerCardBehavior('07014')!.beforeResults!(s, s.skillTest!, a)).toEqual([
    { type: 'AdjustAttackDamage', amount: 1 },
  ])
  s = results(s)
  expect(s.enemies[e.id]!.damageTaken).toBe(2)
  expect(me(s).hand).toContain('01091')
})

it('Net automatically evades another engaged enemy even if the committed skill returned before results', () => {
  let s = put(game(), '07015')
  s = run(
    s,
    spawnAt('A', { ...ghoul, health: 5 }, '07005'),
    spawnAt('A', { ...ghoul, health: 5 }, '07005'),
  )
  const a = Object.values(s.assets).find((a) => a.code === '07015')!
  s = patch(s, { hand: ['01092'] })
  const ability = availableAbilities(s, '07005').find((o) => o.key === a.id + ':evade')!
  s = run(s, ...ability.then)
  s = choose(commit(s, '01092'), 'choice.revealToken')
  s = results(choose(s, 'ability.silasReturn'))
  s = choose(s, 'choice.silasEvade')
  expect(Object.values(s.enemies).every((e) => e.exhausted && !e.engagedWith)).toBe(true)
})

it('Siren Call charges matching icons to its owner, rejects unaffordable commitments, and costs two actions to discard', () => {
  let s = call(game())
  s = begin(patch(s, { hand: ['01091', '01093', '01088'], resources: 1 }))
  expect(canCommitFrom(s, '07005', '01091')).toBe(false)
  s = patch(s, { resources: 3 })
  s = run(s, { type: 'CommitCard', investigator: '07005', code: '01091' })
  expect(me(s).resources).toBe(1)
  const a = Object.values(s.treacheries).find((a) => a.code === '07016')!
  expect(treacheryBehavior('07016')!.abilities!(s, a, '07005')[0]).toMatchObject({
    actions: 2,
    provokes: true,
  })
  s = run(s, ...treacheryBehavior('07016')!.abilities!(s, a, '07005')[0]!.then)
  expect(s.treacheries[a.id]).toBeUndefined()
})

it('Winifred draws only for two different nonweakness cards, once per test, after commitments close', () => {
  let s = begin(patch(game('60301'), { hand: ['01091', '01091'] }))
  s = commit(commit(s, '01091'), '01091')
  expect(has(s, 'ability.winifredDraw')).toBe(false)
  s = choose(s, 'choice.revealToken')
  expect(me(s).hand).not.toContain('01088')
  s = begin(patch(game('60301'), { hand: ['01091', '60302'], deck: ['01088'] }))
  s = commit(commit(s, '01091'), '60302')
  expect(has(s, 'ability.winifredDraw')).toBe(false)
  s = choose(s, 'choice.revealToken')
  s = results(choose(s, 'ability.winifredDraw'))
  expect(me(s).hand).toContain('01088')
  expect(s.skillTest).toBeNull()
  expect(me(s).discard).not.toContain('01088')
})

it('Winifred’s six-icon signature cannot help another investigator’s test', () => {
  let s = begin(patch(game('60301'), { hand: ['60302'] }))
  expect(canCommitFrom(s, '60301', '60302')).toBe(true)
  s = { ...s, skillTest: { ...s.skillTest!, investigator: 'b' } }
  expect(canCommitFrom(s, '60301', '60302')).toBe(false)
})

it('Arrogance is compulsory when eligible, subtracts its icons, returns on success and discards on failure', () => {
  let s = begin(patch(game('60301'), { hand: ['60303'] }), 2)
  s = choose(s, 'choice.revealToken')
  expect(has(s, 'choice.revealToken')).toBe(true)
  expect(skillTestValue(s).icons).toBe(-1)
  s = results(choose(s, 'choice.revealToken'))
  expect(me(s).hand).toContain('60303')
  s = begin(patch({ ...game('60301'), chaosBag: ['autoFail'] }, { hand: ['60303'] }))
  s = results(choose(choose(s, 'choice.revealToken'), 'choice.revealToken'))
  expect(me(s).hand).not.toContain('60303')
  expect(me(s).discard).toContain('60303')
})

it('Arrogance drawn by Winifred after ST.2 waits until the next test', () => {
  let s = begin(patch(game('60301'), { hand: ['01091', '60302'], deck: ['60303', '01088'] }))
  s = commit(commit(s, '01091'), '60302')
  s = choose(choose(s, 'choice.revealToken'), 'ability.winifredDraw')
  expect(me(s).hand).toContain('60303')
  expect(me(s).discard).not.toContain('60303')
})

it('Winifred elder sign returns exactly floor(success margin / 2) chosen own physical copies at ST.8', () => {
  let s = begin(patch(game('60301'), { hand: ['01091', '01091', '01051'] }))
  s = run(
    s,
    { type: 'CommitCard', investigator: '60301', code: '01091' },
    { type: 'CommitCard', investigator: '60301', code: '01091' },
    { type: 'CommitCard', investigator: '60301', code: '01051' },
    { type: 'MarkTestAbility', key: 'wini:elder' },
  )
  s = finish(s, true, 4)
  s = choose(choose(s, 'choice.winifredReturn', { card: 'Overpower' }), 'choice.winifredReturn', {
    card: 'Overpower',
  })
  expect(me(s).hand.filter((c) => c === '01091')).toHaveLength(2)
  expect(me(s).discard).toContain('01051')
  expect(s.skillTest).toBeNull()
})

it('Reckless excludes all other cards, returns on failure, and loses two resources only in hand at end of turn', () => {
  let s = begin(patch(game('60301'), { hand: ['60304', '60303', '01091'] }))
  s = commit(s, '60304')
  expect(canCommitFrom(s, '60301', '01091')).toBe(false)
  expect(canCommitFrom(s, '60301', '60303')).toBe(false)
  s = finish(s, false, -1)
  expect(me(s).hand).toContain('60304')
  s = run(s, { type: 'Forced', trigger: { type: 'turnEnds', investigator: '60301' } })
  expect(me(s).resources).toBe(8)
})

it('A replaced asset return does not recover skills as if its cost were paid', () => {
  registerPlayerCards([
    { code: 'lot169-stuck', name: 'Stuck', type: 'asset', class: 'neutral', traits: [] },
  ])
  registerPlayerCard({ code: 'lot169-stuck', cannotLeavePlay: () => true })
  let s = put(game(), '07014')
  const a = Object.values(s.assets).find((a) => a.code === '07014')!
  s = begin(patch(s, { hand: ['01091'] }))
  s = run(s, { type: 'CommitCard', investigator: '07005', code: '01091' })
  s = {
    ...s,
    skillTest: { ...s.skillTest!, source: a.id },
    assets: { ...s.assets, [a.id]: { ...a, code: 'lot169-stuck' } },
  }
  s = run(s, {
    type: 'ReturnAssetToHand',
    asset: a.id,
    onReturn: [
      { type: 'PlayerCardEffect', code: '07014', investigator: '07005', step: 'returnSkills' },
    ],
  })
  expect(s.skillTest!.committed[0]!.returnAfterTest).toBeUndefined()
})

it('Siren Call pays a group atomically and cannot spend resources for an incomplete group', () => {
  let s = begin(patch(call(game()), { hand: ['01091', '01091'], resources: 3 }))
  s = run(s, { type: 'CommitCardGroup', investigator: '07005', cards: ['01091', '01091'] })
  expect(me(s).resources).toBe(3)
  expect(me(s).hand).toEqual(['01091', '01091'])
  expect(s.skillTest!.committed).toEqual([])
  s = run(patch(s, { resources: 4 }), {
    type: 'CommitCardGroup',
    investigator: '07005',
    cards: ['01091', '01091'],
  })
  expect(me(s).resources).toBe(0)
  expect(s.skillTest!.committed).toHaveLength(2)
})

it('Siren Call is placed by revelation and another investigator at its location can discard it', () => {
  let s = call(game())
  const t = Object.values(s.treacheries).find((t) => t.code === '07016')!
  expect(t.placement).toEqual({ type: 'threatArea', investigator: '07005' })
  s = {
    ...s,
    activeTurn: 'b',
    investigators: s.investigators.map((i) => (i.id === 'b' ? { ...i, actionsRemaining: 3 } : i)),
  }
  const ability = availableAbilities(s, 'b').find((a) => a.key === t.id + ':discard')!
  expect(ability).toMatchObject({ actions: 2, provokes: true })
  s = run(s, {
    type: 'UseAbility',
    investigator: 'b',
    key: ability.key,
    actions: ability.actions,
    provokes: ability.provokes,
    then: ability.then,
  })
  expect(s.treacheries[t.id]).toBeUndefined()
  expect(me(s).discard).toContain('07016')
  expect(s.investigators[1]!.actionsRemaining).toBe(1)
})

it('Siren Call counts wild icons and only charges the investigator with the weakness', () => {
  let s = begin(patch(call(game()), { hand: ['01093'], resources: 2 }))
  s = run(s, { type: 'CommitCard', investigator: '07005', code: '01093' })
  expect(me(s).resources).toBe(0)
  s = {
    ...s,
    investigators: s.investigators.map((i) =>
      i.id === 'b' ? { ...i, resources: 0, hand: ['01091'] } : i,
    ),
  }
  expect(canCommitFrom(s, 'b', '01091')).toBe(true)
})

it('Silas cannot use an elder sign to bypass Siren Call’s additional cost', () => {
  let s = begin(patch(call(game()), { discard: ['01091'], resources: 1 }))
  expect(investigatorBehavior('07005')!.elderSign!(s, me(s)).immediate![0]).toMatchObject({
    type: 'Ask',
    question: { choices: [{ label: 'choice.skip' }] },
  })
  s = patch(s, { resources: 2 })
  const effect = investigatorBehavior('07005')!.elderSign!(s, me(s)).immediate!
  s = choose(run(s, ...effect), 'choice.silasCommit', { card: 'Overpower' })
  expect(me(s).resources).toBe(0)
  expect(s.skillTest!.committed[0]).toMatchObject({ code: '01091', returnAfterTest: true })
})

it('Winifred excludes weaknesses when counting different committed cards and resets her draw in a new test', () => {
  let s = begin(patch(game('60301'), { hand: ['01091', '60303'] }))
  s = commit(commit(s, '01091'), '60303')
  s = choose(s, 'choice.revealToken')
  expect(has(s, 'ability.winifredDraw')).toBe(false)
  s = begin(patch(game('60301'), { hand: ['01091', '60302'] }))
  s = choose(commit(commit(s, '01091'), '60302'), 'choice.revealToken')
  s = choose(s, 'ability.winifredDraw')
  expect(investigatorBehavior('60301')!.fastOptions!(s, me(s))).toEqual([])
  s = begin(patch(results(s), { hand: ['01091', '60302'] }))
  s = choose(commit(commit(s, '01091'), '60302'), 'choice.revealToken')
  expect(has(s, 'ability.winifredDraw')).toBe(true)
})

it('Winifred elder sign retains skill effects until ST.8 and does not recover another investigator’s contribution', () => {
  let s = begin(patch({ ...game('60301'), chaosBag: ['elderSign'] }, { hand: ['60302'] }))
  s = commit(s, '60302')
  s = results(choose(s, 'choice.revealToken'))
  expect(has(s, 'choice.winifredReturn')).toBe(true)
  s = choose(s, 'choice.winifredReturn')
  expect(me(s).hand).toContain('60302')
  expect(s.skillTest).toBeNull()
  s = begin(game('60301'))
  s = {
    ...s,
    skillTest: {
      ...s.skillTest!,
      committed: [{ code: '01091', by: 'b', id: 0 }],
      usedAbilities: ['wini:elder'],
    },
  }
  s = finish(s, true, 6)
  expect(has(s, 'choice.winifredReturn')).toBe(false)
  expect(s.investigators[1]!.discard).toContain('01091')
})

it('Reckless can block mandatory Arrogance, while a successful Reckless is discarded', () => {
  let s = begin(patch(game('60301'), { hand: ['60304', '60303'] }))
  s = commit(s, '60304')
  s = results(choose(s, 'choice.revealToken'))
  expect(me(s).discard).toContain('60304')
  expect(me(s).hand).toContain('60303')
})
