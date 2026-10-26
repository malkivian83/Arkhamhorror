// RR: Prey breaks ties for Hunter; reaction windows resolve before their triggering change.
import { applyInput, dispatch, registerEnemy, scenarioBehavior, type GameState } from '@lcg/engine'
import { choose, during, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, patch, withAsset } from '../dunwich-pilot/testing'
import { sturdy } from '../basic-abilities/testing'
import { CODES, GUARDS, PART_ONE, PART_TWO, abarran, practiced } from './cards'
import { BEARER, HEIST_TASKS } from './part-two'
import { DUPLICATE_CODE } from './encounter-two'

function ready(players = ['a', 'b']): GameState {
  const s = game(players)
  return {
    ...s,
    interactive: true,
    scenarioId: PART_TWO,
    acts: [
      {
        code: CODES.theExit,
        name: 'The Exit',
        advanceTiming: 'objective',
        clueThreshold: 0,
        cluesPerInvestigator: false,
      },
    ],
    actIndex: 0,
    pending: s.pending,
    queue: [],
    scenarioMeta: { [BEARER]: players.includes('b') ? 'b' : 'a' },
  }
}
const settle = (s: GameState) => {
  for (
    let n = 0;
    s.pending && s.pending.question.prompt !== 'prompt.chooseAction' && n < 100;
    n++
  ) {
    const skip = s.pending.question.choices.findIndex((c) => c.label === 'choice.skip')
    s = applyInput(s, { investigator: s.pending.investigator, choice: Math.max(0, skip) })
  }
  return s
}

it('The Exit prey breaks equal-distance hunter ties in favor of the Wellspring bearer', () => {
  let s = during(
    ready(),
    patch({ location: 'C' }, 'b'),
    spawnAt('B', { ...sturdy, traits: ['Casino'], keywords: ['hunter'] }, null),
  )
  const enemy = Object.values(s.enemies)[0]!
  const moved = during(s, (x) => x, { type: 'HuntersMove', enemies: [enemy.id] })
  expect(moved.enemies[enemy.id]!.location).toBe('C')
  s = during(s, patch({ location: 'B' }, 'a'))
  s = during(s, (x) => x, { type: 'HuntersMove', enemies: [enemy.id] })
  expect(s.enemies[enemy.id]!.location).toBe('B')
})

it('The Exit also uses its dynamic prey when an enemy chooses whom to engage', () => {
  let s = during(
    ready(),
    (x) => x,
    spawnAt('B', { ...sturdy, traits: ['Casino'], keywords: ['hunter'] }, null),
  )
  const enemy = Object.values(s.enemies)[0]!
  s = during(s, (x) => patch({ location: 'B' }, 'b')(patch({ location: 'B' }, 'a')(x)), {
    type: 'CheckEngagement',
    location: 'B',
  })
  expect(s.enemies[enemy.id]!.engagedWith).toBe('b')
})

registerEnemy({
  code: 'fidelity-guard',
  forced: (_s, t) =>
    t.type === 'afterEngage'
      ? [{ type: 'SetScenarioMeta', key: 'fidelity:engaged', value: 1 }]
      : [],
})
it('Cash Cart prevents the engagement and its after-engage effects without granting aloof', () => {
  let s = patch({ location: 'C' }, 'b')(ready())
  s = {
    ...s,
    placedAssets: {
      cart: {
        id: 'cart',
        code: CODES.cashCart,
        name: 'Cash Cart',
        placement: { type: 'location', location: 'A' },
        exhausted: false,
        damage: 0,
        horror: 0,
      },
    },
  }
  s = during(s, (x) => x, spawnAt('A', { ...sturdy, code: 'fidelity-guard' }, 'a'))
  const enemy = Object.values(s.enemies)[0]!
  expect(enemy.engagedWith).toBeNull()
  s = choose(s, 'ability.fof.hideInCart')
  s = settle(s)
  expect(s.enemies[enemy.id]!.engagedWith).not.toBe('a')
  expect(s.scenarioMeta?.['fidelity:engaged']).toBeUndefined()
  expect(s.placedAssets!.cart!.damage).toBe(1)
})

it('The Thief is offered for the current patrol, not when the enemy phase begins', () => {
  let s = ready(['a'])
  s = { ...s, acts: [], scenarioMeta: {} }
  s = during(
    s,
    (x) => withAsset(x, CODES.theThief),
    spawnAt('B', { ...sturdy, code: GUARDS[0]!, traits: ['Casino'], keywords: [] }, null),
  )
  const enemy = Object.values(s.enemies)[0]!
  s = dispatch(
    { ...s, pending: null, queue: [] },
    { type: 'Forced', trigger: { type: 'enemyPhaseBegins' } },
  )
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.fof.thief')).not.toBe(true)
  s = dispatch({ ...s, pending: null, queue: [] }, { type: 'MoveHuntingEnemy', enemy: enemy.id })
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.fof.thief')).toBe(true)
})

it.each(['evade', 'disengage', 'move', 'transfer', 'defeat'])(
  'a dimensional duplicate keeps its source card out of both discards until it leaves play: %s',
  (reason) => {
    let s = during(ready(), patch({ deck: ['01088'] }), {
      type: 'ScenarioSpecific',
      key: 'fofDuplicate',
      data: { investigator: 'a' },
    })
    const copy = Object.values(s.enemies).find((e) => e.code === DUPLICATE_CODE)!
    expect(copy.originalCardCode).toBe('01088')
    expect(s.investigators[0]!.deck).not.toContain('01088')
    expect(s.investigators[0]!.discard).not.toContain('01088')
    const effect =
      reason === 'evade'
        ? { type: 'EvadeEnemy' as const, enemy: copy.id, by: 'a' }
        : reason === 'disengage'
          ? { type: 'DisengageAll' as const, investigator: 'a' }
          : reason === 'move'
            ? { type: 'MoveEnemy' as const, enemy: copy.id, location: 'B' }
            : reason === 'transfer'
              ? { type: 'EngageEnemy' as const, enemy: copy.id, investigator: 'b' }
              : { type: 'DamageEnemy' as const, enemy: copy.id, amount: 1, by: 'a' }
    s = settle(during(s, (x) => x, effect))
    expect(s.enemies[copy.id]).toBeUndefined()
    expect(s.investigators[0]!.discard.filter((c) => c === '01088')).toHaveLength(1)
    expect(s.encounterDiscard.some((c) => c.code === DUPLICATE_CODE || c.code === '01088')).toBe(
      false,
    )
  },
)

it('Shambler remembers consecutive actions across turns in one phase, but not across phases', () => {
  let s = during(
    ready(['a']),
    (x) => x,
    spawnAt('C', { ...sturdy, code: '88048', keywords: ['hunter'] }, null),
  )
  const id = Object.values(s.enemies)[0]!.id
  const action = (state: GameState) =>
    dispatch(
      { ...state, pending: null, queue: [] },
      ...scenarioBehavior(PART_TWO)!.afterAction!(state, 'a', 'resource'),
    )
  s = action(s)
  expect(s.enemies[id]!.location).toBe('C')
  s = { ...s, log: [...s.log, { ...s.log[0]!, key: 'log.step.turnBegins' }] }
  s = action(s)
  expect(s.enemies[id]!.location).toBe('B')
  s = action(s)
  expect(s.enemies[id]!.location).toBe('B')
  s = { ...s, phase: 'enemy', log: [...s.log, { ...s.log[0]!, key: 'log.step.turnBegins' }] }
  s = action(s)
  expect(s.enemies[id]!.location).toBe('B')
})

it('Personal Entanglement keeps its horror on the story card', () => {
  let s = ready(['a'])
  s = {
    ...s,
    stories: { '88027b': { code: '88027b', name: 'Personal Entanglement', clues: 0, horror: 0 } },
  }
  s = during(s, (x) => x, { type: 'ScenarioSpecific', key: 'fofEntanglement' })
  expect(s.stories!['88027b']!.horror).toBe(1)
})

it('Personal Entanglement cannot spend clues from investigators outside the office', () => {
  let s = ready()
  s = {
    ...s,
    locations: {
      ...s.locations,
      [CODES.ownersOffice]: { ...s.locations.A!, id: CODES.ownersOffice },
    },
    stories: { '88027b': { code: '88027b', name: 'Personal Entanglement', clues: 0, horror: 0 } },
  }
  s = during(s, (x) =>
    patch(
      { location: CODES.ownersOffice, clues: 2 },
      'a',
    )(patch({ location: 'C', clues: 10 }, 'b')(x)),
  )
  s = choose(s, 'ability.fof.rescue')
  expect(s.investigators[0]!.clues).toBe(0)
  expect(s.investigators[1]!.clues).toBe(10)
  expect(s.stories!['88027b']).toBeUndefined()
})

it('removing Wellspring clues after a game is optional', () => {
  let s = ready(['a'])
  s = {
    ...s,
    acts: [{ ...s.acts[0]!, code: CODES.casingTheJoint }],
    stories: { [CODES.wellspring]: { code: CODES.wellspring, name: 'Wellspring', clues: 7 } },
  }
  s = during(s, (x) => x, {
    type: 'ScenarioSpecific',
    key: 'fofGamePlayed',
    data: { investigator: 'a', gained: true },
  })
  s = choose(s, 'choice.skip')
  expect(s.stories![CODES.wellspring]!.clues).toBe(7)
  s = during(s, (x) => x, {
    type: 'ScenarioSpecific',
    key: 'fofGamePlayed',
    data: { investigator: 'a', gained: true },
  })
  s = choose(s, 'ability.fof.reduceWellspring')
  expect(s.stories![CODES.wellspring]!.clues).toBe(5)
})

it('the lead chooses movement order and each enemy resolves before the next', () => {
  let s = during(
    ready(),
    (x) => x,
    spawnAt('C', { ...sturdy, name: 'First', keywords: ['hunter'] }, null),
    spawnAt('B', { ...sturdy, name: 'Second', keywords: ['hunter'] }, null),
  )
  const first = Object.values(s.enemies).find((e) => e.name === 'First')!
  const second = Object.values(s.enemies).find((e) => e.name === 'Second')!
  s = during(s, (x) => x, { type: 'HuntersMove' })
  expect(s.pending!.question.prompt).toBe('prompt.chooseHunterOrder')
  s = choose(s, 'choice.moveEnemyNow', { enemy: 'Second' })
  expect(s.enemies[second.id]!.location).toBe('A')
  expect(s.enemies[first.id]!.location).toBe('C')
  s = settle(s)
  expect(s.enemies[first.id]!.location).toBe('B')
})

it('five completed tasks earn Isamara even if her Crew card is not in play', () => {
  const state = {
    ...ready(),
    campaignLog: {
      notes: HEIST_TASKS.slice(0, 5),
      values: {},
      crossedOut: [],
      chaosTokens: [],
      investigators: {},
    },
  }
  const effects = scenarioBehavior(PART_TWO)!.resolution!(state, {
    type: 'resolution',
    resolution: 1,
  })
  expect(effects.some((m) => m.type === 'RecordNote' && m.note === 'fofEarnedIsamara')).toBe(true)
})

it('Abarran’s printed dashes prevent damage and automatic evasion', () => {
  let s = during(ready(), (x) => x, spawnAt('B', abarran, null))
  const id = Object.values(s.enemies)[0]!.id
  s = during(
    s,
    (x) => x,
    { type: 'DamageEnemy', enemy: id, amount: 10, by: 'a' },
    { type: 'EvadeEnemy', enemy: id, by: 'a' },
  )
  expect(s.enemies[id]!.damageTaken).toBe(0)
  expect(s.enemies[id]!.exhausted).toBe(false)
})

it('the practiced Thief can react to a patrol at its own location', () => {
  let s = ready(['a'])
  s = { ...s, acts: [], scenarioMeta: {} }
  s = during(
    s,
    (x) => withAsset(x, practiced(CODES.theThief)),
    spawnAt('A', { ...sturdy, code: GUARDS[0]!, traits: ['Casino'], keywords: ['aloof'] }, null),
  )
  const id = Object.values(s.enemies)[0]!.id
  s = dispatch({ ...s, pending: null, queue: [] }, { type: 'MoveHuntingEnemy', enemy: id })
  expect(s.pending!.question.choices.some((c) => c.label === 'ability.fof.thief')).toBe(true)
})

it('Cash Cart protection cannot leave stale engagement choices for other enemies', () => {
  let s = during(
    ready(),
    (x) => x,
    spawnAt('C', { ...sturdy, name: 'One' }, null),
    spawnAt('C', { ...sturdy, name: 'Two' }, null),
  )
  s = {
    ...s,
    placedAssets: {
      cart: {
        id: 'cart',
        code: CODES.cashCart,
        name: 'Cash Cart',
        placement: { type: 'location', location: 'A' },
        exhausted: false,
        damage: 0,
        horror: 0,
      },
    },
  }
  s = during(
    s,
    (x) => ({
      ...x,
      enemies: Object.fromEntries(
        Object.values(x.enemies).map((e) => [e.id, { ...e, location: 'A' }]),
      ),
    }),
    { type: 'CheckEngagement', location: 'A' },
  )
  s = choose(s, 'choice.investigator', { name: 'A' })
  s = choose(s, 'ability.fof.hideInCart')
  s = settle(s)
  expect(Object.values(s.enemies).map((e) => e.engagedWith)).toEqual(['b', 'b'])
})

it('the checkpoint counts clues still held by investigators who were not eliminated', () => {
  let s = patch({ clues: 1 }, 'a')(patch({ clues: 2 }, 'b')(ready()))
  s = { ...s, scenarioId: PART_ONE, actClues: 1 }
  const effects = scenarioBehavior(PART_ONE)!.resolution!(s, { type: 'resolution', resolution: 1 })
  const plan = effects.find((m) => m.type === 'ScenarioSpecific' && m.key === 'fofPlan')!
  expect(plan.type === 'ScenarioSpecific' && plan.data?.remaining).toBe(2)
})

it('practicing a role flips its actual asset as well as the checkpoint record', () => {
  let s = ready(['a'])
  s = {
    ...s,
    scenarioId: PART_ONE,
    acts: [{ ...s.acts[0]!, code: CODES.casingTheJoint }],
    scenarioMeta: { 'fof:role:a': CODES.theThief },
  }
  s = during(s, (x) => withAsset(x, CODES.theThief), {
    type: 'ScenarioSpecific',
    key: 'fofPractice',
    data: { investigator: 'a', code: CODES.theThief },
  })
  expect(s.assets[CODES.theThief]!.code).toBe(practiced(CODES.theThief))
  expect(s.scenarioMeta!['fof:role:a']).toBe(practiced(CODES.theThief))
})
