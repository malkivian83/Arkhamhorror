// RR: Skill Value, Massive, Elimination, Trauma, Search, Ownership and Control.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  registerScenario,
  type GameState,
  type SkillType,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from './dunwich-pilot/testing'
import './index'
const start = (players = ['a']) =>
  patch({ hand: [], resources: 10, skills: { willpower: 5, intellect: 5, combat: 5, agility: 5 } })(
    { ...game(players), pending: null, queue: [] },
  )
const enemy = (s: GameState, massive = false): GameState => ({
  ...s,
  enemies: {
    foe: {
      ...ghoul,
      id: 'foe',
      location: 'A',
      engagedWith: massive ? null : 'a',
      keywords: massive ? ['massive'] : [],
      exhausted: false,
      damageTaken: 0,
      maxHealth: 2,
      doom: 0,
    },
  },
})
const play = (s: GameState, code: string) =>
  dispatch(patch({ hand: [code] })(s), { type: 'PlayCard', investigator: 'a', code })
it('I’ll see you in hell records trauma before the last investigator ends the scenario', () => {
  const s = play(enemy(start()), '03189')
  expect(s.outcome).toMatchObject({ type: 'noResolution' })
  expect(s.campaignLog!.investigators.a!.physicalTrauma).toBe(1)
})
it('I’ll see you in hell defeats ready non-Elite Massive enemies considered engaged', () => {
  const s = play(enemy(start(['a', 'b']), true), '03189')
  expect(s.enemies.foe).toBeUndefined()
})
it.each(['05117', '05190', '05191'])(
  '%s boosts willpower on treacheries, never agility or intellect',
  (code) => {
    const initial = withAsset(patch({ hand: ['01093'] })(start()), code)
    for (const skill of ['willpower', 'agility', 'intellect'] as SkillType[]) {
      const s = dispatch(initial, {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill,
        difficulty: 2,
        tags: ['treachery'],
        kind: {
          type: 'effect',
          source: 'test treachery',
          onSuccess: [],
          onFail: [],
          onFailEach: [],
        },
      })
      expect(playerCardBehavior(code)!.testOptions!(s, s.skillTest!, s.assets[code]!).length).toBe(
        skill === 'willpower' ? 1 : 0,
      )
    }
  },
)
it('Archaic Glyphs can evade a ready Massive enemy engaged by its keyword', () => {
  let s = withAsset(enemy(start(), true), '03193')
  const o = playerCardBehavior('03193')!.abilities!(s, s.assets['03193']!, 'a')[0]!
  s = dispatch(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    ...(o.costs ? { costs: o.costs } : {}),
    then: o.then,
  })
  expect(s.pending?.question.choices.some((c) => c.params?.enemy === 'Ghoul')).toBe(true)
  s = choose(s, 'choice.chargedEnemy', { enemy: 'Ghoul' })
  expect(s.enemies.foe!.exhausted).toBe(true)
})
it('Spiritual Charm uses modified damage and horror values, each with a minimum of zero', () => {
  registerScenario({
    id: 'rules-review-stats',
    enemyDamageModifier: () => 2,
    enemyHorrorModifier: () => -3,
  })
  let s = play({ ...enemy(start()), scenarioId: 'rules-review-stats' }, '60466')
  s = choose(s, 'choice.relocationEnemy', { enemy: 'Ghoul' })
  expect(me(s).resources).toBe(13)
})
it('Tetsuo lets the selected investigator decide between their deck and discard pile', () => {
  let s = withAsset(patch({ discard: ['01087'], deck: ['01016'] }, 'b')(start(['a', 'b'])), '06155')
  const a = s.assets['06155']!
  s = dispatch(
    s,
    ...playerCardBehavior('06155')!.reactions!(s, { type: 'assetDefeated', asset: a }, a)[0]!.then,
  )
  expect(s.pending!.investigator).toBe('a')
  s = choose(s, 'choice.investigator', { name: 'B' })
  expect(s.pending!.investigator).toBe('b')
  s = choose(s, 'choice.protectionDiscard', { card: 'Flashlight' })
  expect(s.investigators[1]!.hand).toContain('01087')
  expect(me(s).hand).not.toContain('01087')
})
it('Persuasion tests against the modified horror value of its target', () => {
  registerScenario({ id: 'rules-review-horror', enemyHorrorModifier: () => 2 })
  const initial = enemy(start())
  initial.enemies.foe = { ...initial.enemies.foe!, traits: ['Humanoid'] }
  const s = play({ ...initial, scenarioId: 'rules-review-horror' }, '04105')
  const option = s.pending!.question.choices.find((c) => c.params?.enemy === 'Ghoul')!
  expect(option.then[0]).toMatchObject({ type: 'BeginSkillTest', difficulty: 6 })
})
it('Banish can target a ready non-Elite Massive enemy', () => {
  let s = enemy(start(), true)
  expect(playerCardBehavior('05113')!.canPlay!(s, 'a')).toBe(true)
  s = choose(play(s, '05113'), 'choice.serviceEnemy', { enemy: 'Ghoul' })
  s = choose(s, 'choice.location', { location: 'Room B' })
  expect(s.enemies.foe).toMatchObject({ location: 'B', exhausted: true })
})
it.each(['08090', '08092', '08101', '08103'])(
  '%s may perform its test without charges, with no standard damage or clue',
  (code) => {
    let s = withAsset(enemy(start()), code, { uses: 0 })
    const clues = s.locations.A!.clues
    const options = playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a')
    expect(options.length).toBeGreaterThan(0)
    const o = options[0]!
    s = dispatch(s, {
      type: 'UseAbility',
      investigator: 'a',
      key: o.key,
      actions: o.actions,
      provokes: o.provokes,
      ...(o.costs ? { costs: o.costs } : {}),
      then: o.then,
    })
    expect(s.enemies.foe!.damageTaken).toBe(0)
    expect(s.locations.A!.clues).toBe(clues)
  },
)
it.each(['08109', '08111'])('%s explicitly requires charges before its evasion', (code) => {
  const s = withAsset(enemy(start()), code, { uses: 0 })
  expect(playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a')).toEqual([])
})
it.each([0, 1, 2])(
  'Second Wind 0 needs its full healing before drawing, with %s damage and a treachery drawn',
  (damage) => {
    const initial = patch({ damage, drewTreacheryRound: 1, deck: ['01088', '01089'] })(start())
    const s = play(initial, '04149')
    expect(me(s).hand.includes('01088')).toBe(damage >= 2)
  },
)
it('Second Wind 2 can draw without healing, unlike level 0', () => {
  const initial = patch({ damage: 0, deck: ['01088', '01089'] })(start())
  expect(playerCardBehavior('04149')!.canPlay!(initial, 'a')).toBe(false)
  expect(playerCardBehavior('10032')!.canPlay!(initial, 'a')).toBe(true)
  expect(me(play(initial, '10032')).hand).toContain('01088')
})
it('Sword Cane 2 offers its entry damage against an engaged Massive enemy', () => {
  const s = withAsset(enemy(start(), true), '11074')
  const messages = playerCardBehavior('11074')!.effect!(s, 'a', 'entry', { asset: '11074' })
  const asked = dispatch(s, ...messages)
  expect(asked.pending!.question.choices.some((c) => c.params?.enemy === 'Ghoul')).toBe(true)
})
it('The Necronomicon can spend four secrets to damage an engaged Massive enemy', () => {
  let s = withAsset(enemy(start(), true), '60233', { uses: 4 })
  s.enemies.foe = { ...s.enemies.foe!, health: 5, maxHealth: 5 }
  const o = playerCardBehavior('60233')!.fastOptions!(s, s.assets['60233']!).find(
    (o) => o.label === 'ability.necronomiconDamage',
  )
  expect(o).toBeDefined()
  s = dispatch(s, ...o!.then)
  expect(s.enemies.foe!.damageTaken).toBe(3)
  expect(s.assets['60233']!.uses).toBe(0)
})
it('Aetheric Shotcaster Translocator can target a Massive enemy but not one that cannot be evaded', () => {
  const s = withAsset(enemy(start(), true), '09119', {
    uses: 2,
    form: 'translocator',
    customization: { translocator: 2 },
  })
  const b = playerCardBehavior('09119')!,
    o = b.abilities!(s, s.assets['09119']!, 'a').find((o) => o.key.endsWith(':manifest'))
  expect(o).toBeDefined()
  const asked = dispatch(s, ...o!.then)
  expect(asked.pending!.question.choices.some((c) => c.params?.enemy === 'Ghoul')).toBe(true)
  const blocked = { ...s, enemies: { foe: { ...s.enemies.foe!, cannotBeEvaded: true } } }
  expect(
    b.abilities!(blocked, blocked.assets['09119']!, 'a').some((o) => o.key.endsWith(':manifest')),
  ).toBe(false)
})
it.each([
  ['08090', '01025'],
  ['08101', '01039'],
])('%s retains additional results from %s even with no charges', (code, skill) => {
  let s = withAsset(patch({ hand: [skill] })(enemy(start())), code, { uses: 0 })
  const clues = s.locations.A!.clues
  const o = playerCardBehavior(code)!.abilities!(s, s.assets[code]!, 'a')[0]!
  s = dispatch(s, {
    type: 'UseAbility',
    investigator: 'a',
    key: o.key,
    actions: o.actions,
    provokes: o.provokes,
    ...(o.costs ? { costs: o.costs } : {}),
    then: o.then,
  })
  s = choose(s, 'choice.commit', { card: playerCardDef(skill)!.name })
  if (s.pending?.question.choices.some((c) => c.label === 'choice.revealToken'))
    s = choose(s, 'choice.revealToken')
  expect(code === '08090' ? s.enemies.foe!.damageTaken : clues - s.locations.A!.clues).toBe(1)
})
