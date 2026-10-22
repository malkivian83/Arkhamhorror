import { dispatch, skillTestValue, type GameState } from '@lcg/engine'
import { choose, during, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { me, patch } from '../dunwich-pilot/testing'
import { enemy, setup, sturdy } from '../basic-abilities/testing'
import './index'

const run = (s: GameState, ...messages: Parameters<typeof dispatch>[1][]) =>
  dispatch({ ...s, pending: null, queue: [] }, ...messages)
const combatTest = (s: GameState, skill: 'combat' | 'intellect' = 'combat') =>
  during(s, (x) => x, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty: 2,
    kind: { type: 'effect', source: 'ally-test', onSuccess: [], onFail: [], onFailEach: [] },
  })

// RR: Allies, Fast abilities, Forced, Reactions.
describe('Beat Cop', () => {
  it.each(['01018', '01518'])('%s: +1 combat; discard it to deal 1 damage', (code) => {
    expect(skillTestValue(combatTest(setup(code))).total).toBe(4)
    const s = choose(setup(code), 'ability.discardToDamage', { card: 'Beat Cop', enemy: 'Ghoul' })
    expect(enemy(s).damageTaken).toBe(1)
    expect(me(s).discard).toContain(code)
    expect(me(s).actionsRemaining).toBe(3)
  })
  it.each(['01028', '01528'])('%s: exhaust and take 1 damage on it to deal 1 damage', (code) => {
    expect(skillTestValue(combatTest(setup(code))).total).toBe(4)
    const s = choose(setup(code), 'ability.exhaustToDamage', { card: 'Beat Cop', enemy: 'Ghoul' })
    expect(enemy(s).damageTaken).toBe(1)
    expect(s.assets[code]).toMatchObject({ exhausted: true, damage: 1 })
  })
})

describe('Hired Muscle and Treasure Hunter', () => {
  it.each([
    ['02027', 'combat'],
    ['04025', 'intellect'],
  ] as const)('%s: +1 %s; pay 1 resource or discard it at the end of the round', (code, skill) => {
    expect(skillTestValue(combatTest(setup(code), skill)).total).toBe(4)
    const end = { type: 'Forced' as const, trigger: { type: 'roundEnds' as const } }
    let s = run(setup(code, { resources: 2 }), end)
    s = choose(s, 'choice.payResource')
    expect(me(s).resources).toBe(1)
    expect(s.assets[code]).toBeDefined()
    s = choose(run(setup(code, { resources: 2 }), end), 'choice.discard', {
      card: playerName(code),
    })
    expect(s.assets[code]).toBeUndefined()
    expect(run(setup(code, { resources: 0 }), end).assets[code]).toBeUndefined()
  })
})
const playerName = (code: string) => (code === '02027' ? 'Hired Muscle' : 'Treasure Hunter')

it('Field Agent: +1 intellect; exhaust and 1 horror on it discover 1 clue', () => {
  expect(skillTestValue(combatTest(setup('09033', { enemy: null }), 'intellect')).total).toBe(4)
  const s = choose(setup('09033', { enemy: null }), 'ability.discoverClue', { card: 'Field Agent' })
  expect(me(s).clues).toBe(1)
  expect(s.assets['09033']).toMatchObject({ exhausted: true, horror: 1 })
})

it.each(['01076', '01576'])('%s Stray Cat is discarded to evade a non-Elite enemy', (code) => {
  const s = choose(setup(code), 'ability.discardToEvade', { card: 'Stray Cat', enemy: 'Ghoul' })
  expect(enemy(s)).toMatchObject({ engagedWith: null, exhausted: true })
  const elite = setup(code, { enemy: { ...sturdy, traits: ['Elite'] } })
  expect(elite.pending!.question.choices.map((c) => c.label)).not.toContain(
    'ability.discardToEvade',
  )
})

it('Mysterious Raven is discarded with 1 horror to discover 1 clue', () => {
  const s = choose(setup('60509', { enemy: null }), 'ability.ravenClue', {
    card: 'Mysterious Raven',
  })
  expect(me(s)).toMatchObject({ clues: 1, horror: 1 })
  expect(me(s).discard).toContain('60509')
})

it.each(['01021', '01521'])('%s Guard Dog damages the enemy whose attack damaged it', (code) => {
  let s = setup(code, { enemy: null })
  s = during(s, (x) => x, spawnAt('A', { ...sturdy, damage: 1, horror: 0 }, 'a'))
  s = run(s, { type: 'EnemyAttack', enemy: enemy(s).id, investigator: 'a', exhaustAfter: false })
  if (
    s.pending?.question.prompt === 'prompt.assignDamage' ||
    s.pending?.question.choices.some((c) => c.params?.card === 'Guard Dog')
  )
    s = choose(s, s.pending!.question.choices.find((c) => c.params?.card === 'Guard Dog')!.label, {
      card: 'Guard Dog',
    })
  expect(s.assets[code]!.damage).toBe(1)
  s = choose(s, 'ability.guardDog', { card: 'Guard Dog', enemy: 'Ghoul' })
  expect(enemy(s).damageTaken).toBe(1)
})

it('Psychology Student heals 2 horror from an investigator or Ally at your location', () => {
  // Another investigator's Ally at your location (yours would compete for the ally slot).
  let s = setup('01018', { enemy: null, players: ['a', 'b'], asset: { owner: 'b', horror: 1 } })
  s = during(s, (x) => patch({ hand: ['60258'], resources: 10, horror: 3 })(x))
  s = choose(s, 'action.play', { card: 'Psychology Student' })
  expect(s.pending!.question.choices.map((c) => c.params?.name)).toEqual(
    expect.arrayContaining(['A', 'Beat Cop']),
  )
  s = choose(s, 'ability.healHorrorOf', { card: 'Psychology Student', name: 'A' })
  expect(me(s).horror).toBe(1)
})
