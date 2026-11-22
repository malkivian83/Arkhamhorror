// RR: Skill Tests ST.6, Additional Actions, Direct Damage/Horror, Search, Weaknesses, Trauma.
import { expect, it } from 'vitest'
import {
  dispatch,
  investigatorBehavior,
  playerCardBehavior,
  playerCardDef,
  skillTestValue,
  availableAbilities,
  attackDamage,
  registerTreachery,
  registerScenario,
  type GameState,
  type Investigator,
  type Message,
} from '@lcg/engine'
import { newTestGame, throughSetup, choose, spawnAt, ghoul } from '@lcg/engine/testing'
import '../index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const me = (s: GameState) => s.investigators[0]!
const patch = (s: GameState, values: Partial<Investigator>): GameState => ({
  ...s,
  investigators: s.investigators.map((i, n) => (n ? i : { ...i, ...values })),
})
function base(code = '04003') {
  const s = clear(throughSetup(newTestGame({ players: [code, 'b'] })))
  const def = playerCardDef(code)!
  return patch(
    { ...s, interactive: true, phase: 'investigation', activeTurn: code, chaosBag: [0] },
    {
      skills: def.skills!,
      health: def.health!,
      sanity: def.sanity!,
      hand: [],
      discard: [],
      deck: ['01088', '01089', '01090'],
      damage: 0,
      horror: 0,
      resources: 10,
      actionsRemaining: 3,
    },
  )
}
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const put = (s: GameState, code: string) =>
  run(s, { type: 'PutAssetIntoPlay', investigator: me(s).id, code })
const play = (s: GameState, code: string) =>
  run(patch(s, { hand: [...me(s).hand, code] }), {
    type: 'PlayCard',
    investigator: me(s).id,
    code,
    byEffect: true,
  })
const enemy = (s: GameState) => Object.values(s.enemies)[0]!
const foe = (s = base(), location = 'A', exhausted = false) => {
  const spawned = run(s, spawnAt(location, { ...ghoul, health: 5 }, null))
  const e = Object.values(spawned.enemies).at(-1)!
  return { ...spawned, enemies: { ...spawned.enemies, [e.id]: { ...e, exhausted } } }
}

it('Finn gains one evade-only action at each turn start; basic resource actions cannot spend it', () => {
  let s = run(foe(), { type: 'BeginTurn', investigator: '04003' })
  expect(me(s).extraEvade).toBe(true)
  s = patch(clear(s), { actionsRemaining: 0 })
  expect(() =>
    run(s, { type: 'TakeAction', investigator: '04003', action: { kind: 'resource' } }),
  ).toThrow('No quedan acciones')
  expect(me(s).resources).toBe(10)
  s = run(s, {
    type: 'TakeAction',
    investigator: '04003',
    action: { kind: 'evade', enemy: enemy(s).id },
  })
  expect(me(s).extraEvade).toBe(false)
  expect(s.skillTest?.kind.type).toBe('evade')
})

it('Finn elder sign counts exhausted enemies everywhere and only offers the clue on success by at least two', () => {
  let s = foe(foe(base(), 'A', true), 'C', true)
  const b = investigatorBehavior('04003')!
  expect(b.elderSign!(s, me(s)).modifier).toBe(2)
  s = run(s, {
    type: 'BeginSkillTest',
    investigator: '04003',
    skill: 'intellect',
    difficulty: 2,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  const effect = playerCardBehavior('04003')!.effect!
  expect(
    effect(
      { ...s, skillTest: { ...s.skillTest!, modifiedSkill: 3, succeeded: true } },
      '04003',
      'clue',
      {},
    ),
  ).toEqual([])
  s = run(
    { ...s, skillTest: { ...s.skillTest!, modifiedSkill: 4, succeeded: true } },
    ...effect(
      { ...s, skillTest: { ...s.skillTest!, modifiedSkill: 4, succeeded: true } },
      '04003',
      'clue',
      {},
    ),
  )
  const clues = me(s).clues
  s = choose(s, 'choice.finnClue')
  expect(me(s).clues).toBe(clues + 1)
})

it('Smuggled Goods searches only the top nine, draws an Illicit card and shuffles its resolving copy', () => {
  let s = patch(base(), {
    deck: ['04011', ...Array.from({ length: 8 }, () => '01088'), '01044'],
    discard: ['04010'],
  })
  s = choose(play(s, '04010'), 'choice.finnSearchDeck')
  expect(s.pending?.question.choices.map((c) => c.params?.card)).toContain(cardName('04011'))
  expect(s.pending?.question.choices.map((c) => c.params?.card)).not.toContain(cardName('01044'))
  s = choose(s, 'choice.takeCard', { card: cardName('04011') })
  expect(me(s).hand).toContain('04011')
  expect(me(s).discard).toEqual(['04010'])
  expect(me(s).deck).toContain('04010')
})
const cardName = (c: string) => playerCardDef(c)!.name

it('Smuggled Goods draws a discarded Illicit event, leaves itself discarded and cannot retrieve itself from limbo', () => {
  let s = patch(base(), { discard: ['01044'] })
  s = choose(play(s, '04010'), 'choice.finnSearchDiscard')
  expect(s.pending?.question.choices.filter((c) => c.params?.card === cardName('04010'))).toEqual(
    [],
  )
  s = choose(s, 'choice.takeCard', { card: cardName('01044') })
  expect(me(s).hand).toContain('01044')
  expect(me(s).discard).toEqual(['04010'])
})

it('Smuggled Goods cannot be played near a ready enemy, but an exhausted enemy is allowed', () => {
  const b = playerCardBehavior('04010')!
  const s = foe()
  expect(b.canPlay!(s, '04003')).toBe(false)
  expect(
    b.canPlay!({ ...s, enemies: { [enemy(s).id]: { ...enemy(s), exhausted: true } } }, '04003'),
  ).toBe(true)
})

it.each([null, 'b', '04003'])(
  'Finn gun is fast, spends one ammo, adds +2 combat and extra damage only when not engaged with him (%s)',
  (engagedWith) => {
    let s = put(foe(), '04011')
    const e = enemy(s)
    s = { ...s, enemies: { [e.id]: { ...e, engagedWith } } }
    const a = Object.values(s.assets).find((a) => a.code === '04011')!
    expect(playerCardDef('04011')!.fast).toBe(true)
    const ability = availableAbilities(s, '04003').find((o) => o.key === a.id + ':fight')!
    s = run(s, ...(ability.costs ?? []), {
      type: 'UseAbility',
      investigator: '04003',
      key: ability.key,
      then: ability.then,
      actions: 1,
      provokes: false,
    })
    expect(s.skillTest?.baseModifier).toBe(2)
    expect(attackDamage(s, s.skillTest!)).toBe(engagedWith === '04003' ? 1 : 2)
    const changed = {
      ...s,
      enemies: {
        [e.id]: { ...s.enemies[e.id]!, engagedWith: engagedWith === '04003' ? null : '04003' },
      },
    }
    expect(attackDamage(changed, s.skillTest!)).toBe(engagedWith === '04003' ? 2 : 1)
    expect(s.assets[a.id]!.uses).toBe(2)
    s = { ...clear(s), assets: { [a.id]: { ...s.assets[a.id]!, uses: 0 } } }
    expect(availableAbilities(s, '04003').some((o) => o.key === a.id + ':fight')).toBe(false)
  },
)

it('Caught Red-Handed readies local/connecting enemies and moves even an engaged connecting Hunter, leaving distant enemies untouched', () => {
  let s = foe(foe(foe(base(), 'A', true), 'B', true), 'C', true)
  const [local, hunter, distant] = Object.values(s.enemies)
  s = {
    ...s,
    enemies: { ...s.enemies, [hunter!.id]: { ...hunter!, keywords: ['hunter'], engagedWith: 'b' } },
  }
  s = run(s, { type: 'ResolveWeakness', investigator: '04003', code: '04012' })
  while (s.pending?.question.prompt === 'prompt.chooseEngaged') s = choose(s, 'choice.investigator')
  expect(s.enemies[local!.id]!.exhausted).toBe(false)
  expect(s.enemies[hunter!.id]).toMatchObject({ location: 'A', exhausted: false })
  expect(s.enemies[distant!.id]!.exhausted).toBe(true)
  expect(me(s).discard).toContain('04012')
  expect(me(s).deck).not.toContain('04012')
})

it('Caught Red-Handed reshuffles when no enemy moves', () => {
  let s = base()
  s = run(s, { type: 'ResolveWeakness', investigator: '04003', code: '04012' })
  expect(me(s).deck).toContain('04012')
  expect(me(s).discard).not.toContain('04012')
})

it('Caught Red-Handed checks actual movement when a connecting Hunter is immobilized', () => {
  registerTreachery({ code: 'finn-immobile', attachedEnemyCannotMove: true, revelation: () => [] })
  let s = foe(base(), 'B', true)
  const e = enemy(s)
  s = {
    ...s,
    enemies: { [e.id]: { ...e, keywords: ['hunter'] } },
    treacheries: {
      trap: {
        id: 'trap',
        kind: 'treachery',
        code: 'finn-immobile',
        name: 'Trap',
        traits: [],
        keywords: [],
        placement: { type: 'enemy', enemy: e.id },
      },
    },
  }
  s = run(s, { type: 'ResolveWeakness', investigator: '04003', code: '04012' })
  expect(s.enemies[e.id]).toMatchObject({ location: 'B', exhausted: false })
  expect(me(s).deck).toContain('04012')
})

it('a forbidden draw leaves a searched discard card in place', () => {
  registerScenario({ id: 'finn-cannot-draw', cannotDrawCards: () => true })
  let s = patch(base(), { discard: ['01044'] })
  s = run(
    { ...s, scenarioId: 'finn-cannot-draw' },
    { type: 'DiscardToHand', investigator: '04003', code: '01044', drawFound: true },
  )
  expect(me(s).discard).toEqual(['01044'])
  expect(me(s).hand).toEqual([])
})

it('Smuggled Goods cannot bypass a locked discard pile or recover its resolving physical event', () => {
  let s = run(base(), spawnAt('A', { ...ghoul, code: '03017' }, '04003'))
  s = { ...s, enemies: { [enemy(s).id]: { ...enemy(s), exhausted: true } } }
  s = play(s, '04010')
  expect(s.pending?.question.choices.map((c) => c.label)).toEqual(['choice.finnSearchDeck'])
})

it.each(['willpower', 'intellect', 'combat', 'agility'] as const)(
  'Calvin constantly adds investigator horror/damage to %s, even with a replaced base',
  (skill) => {
    let s = patch(base('04005'), { damage: 3, horror: 2 })
    s = run(s, {
      type: 'BeginSkillTest',
      investigator: '04005',
      skill,
      difficulty: 1,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    })
    const bonus = ['willpower', 'intellect'].includes(skill) ? 2 : 3
    expect(skillTestValue(s).total).toBe(bonus)
    expect(skillTestValue({ ...s, skillTest: { ...s.skillTest!, baseSkill: 5 } }).total).toBe(
      5 + bonus,
    )
    expect(skillTestValue(patch(s, { damage: 1, horror: 1 })).total).toBe(1)
  },
)

it.each([
  'choice.calvinHealDamage',
  'choice.calvinHealHorror',
  'choice.calvinTakeDamage',
  'choice.calvinTakeHorror',
])('Calvin elder sign optionally heals or takes one direct point (%s)', (label) => {
  let s = patch(base('04005'), { damage: 2, horror: 2 })
  const effect = investigatorBehavior('04005')!.elderSign!(s, me(s))
  expect(effect.modifier).toBe(0)
  s = choose(run(s, ...effect.immediate!), label)
  expect(me(s).damage).toBe(label.endsWith('Damage') ? (label.includes('Heal') ? 1 : 3) : 2)
  expect(me(s).horror).toBe(label.endsWith('Horror') ? (label.includes('Heal') ? 1 : 3) : 2)
})

it('Until the End of Time can take direct damage/horror, ordinary assets and another owner cannot', () => {
  let s = put(put(base('04005'), '04015'), '01021')
  const talent = Object.values(s.assets).find((a) => a.code === '04015')!
  s = run(s, { type: 'TakeDamage', investigator: '04005', damage: 1, horror: 1, direct: true })
  expect(
    s.pending?.question.choices
      .filter((c) => c.label === 'choice.assignToAsset')
      .map((c) => c.params?.card),
  ).toEqual([cardName('04015')])
  s = choose(s, 'choice.assignToAsset', { card: cardName('04015') })
  s = choose(s, 'choice.assignToAsset', { card: cardName('04015') })
  expect(s.assets[talent.id]).toMatchObject({ damage: 1, horror: 1 })
  expect(me(s)).toMatchObject({ damage: 0, horror: 0 })
  s = run(s, { type: 'TakeDamage', investigator: 'b', damage: 1, horror: 0, direct: true })
  expect(s.investigators[1]!.damage).toBe(1)
  s = run(s, { type: 'TakeDamage', investigator: '04005', damage: 1, horror: 0, direct: true })
  s = choose(s, 'choice.assignToInvestigator')
  expect(me(s).damage).toBe(1)
})

it.each([true, false])(
  'Voice of the Messenger applies chosen trauma even when direct damage/horror is soaked (%s)',
  (physical) => {
    let s = put(base('04005'), '04015')
    s = run(s, { type: 'ResolveWeakness', investigator: '04005', code: '04016' })
    s = choose(s, physical ? 'choice.calvinPhysicalTrauma' : 'choice.calvinMentalTrauma')
    s = choose(s, 'choice.assignToAsset', { card: cardName('04015') })
    expect(s.campaignLog?.investigators['04005']).toMatchObject(
      physical ? { physicalTrauma: 1 } : { mentalTrauma: 1 },
    )
    expect(me(s)).toMatchObject({ damage: 0, horror: 0 })
  },
)

it('direct assignment exhausts the talent capacity and sends the rest to Calvin without offering ordinary assets', () => {
  let s = put(put(base('04005'), '04015'), '01021')
  s = run(s, { type: 'TakeDamage', investigator: '04005', damage: 3, horror: 0, direct: true })
  s = choose(s, 'choice.assignToAsset', { card: cardName('04015') })
  s = choose(s, 'choice.assignToAsset', { card: cardName('04015') })
  expect(Object.values(s.assets).some((a) => a.code === '04015')).toBe(false)
  expect(Object.values(s.assets).find((a) => a.code === '01021')!.damage).toBe(0)
  expect(me(s).damage).toBe(1)
})

it.each([true, false])(
  'the talent can absorb two damage and two horror from the same batch before defeat (direct %s)',
  (direct) => {
    let s = put(base('04005'), '04015')
    s = run(s, { type: 'TakeDamage', investigator: '04005', damage: 2, horror: 2, direct })
    for (let n = 0; n < 4; n++) s = choose(s, 'choice.assignToAsset', { card: cardName('04015') })
    expect(me(s)).toMatchObject({ damage: 0, horror: 0 })
    expect(Object.values(s.assets).some((a) => a.code === '04015')).toBe(false)
    expect(me(s).discard).toContain('04015')
  },
)

it('Voice of the Messenger records its trauma even if its damage defeats Calvin', () => {
  let s = patch(base('04005'), { damage: 5 })
  s = choose(
    run(s, { type: 'ResolveWeakness', investigator: '04005', code: '04016' }),
    'choice.calvinPhysicalTrauma',
  )
  expect(me(s).eliminated).toBe(true)
  expect(s.campaignLog?.investigators['04005']?.physicalTrauma).toBeGreaterThanOrEqual(1)
})
