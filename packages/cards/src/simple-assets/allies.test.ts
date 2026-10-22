import { dispatch, skillTestValue } from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game } from '../dunwich-pilot/testing'
import { clues, labels, me, setup, withAsset } from './testing'

const investigateHere = (s: ReturnType<typeof setup>) =>
  choose(s, 'action.investigate', { location: 'Room A' })

// RR: Allies, Constant abilities, Fast, Actions.
it.each(['01054', '01554'])('%s Leo De Luca gives one additional action each turn', (code) => {
  let s = dispatch(
    { ...withAsset(game(), code), pending: null, queue: [] },
    {
      type: 'BeginTurn',
      investigator: 'a',
    },
  )
  expect(me(s).actionsRemaining).toBe(4)
  s = dispatch({ ...s, pending: null, queue: [] }, { type: 'DiscardAsset', asset: code })
  expect(me(s).actionsRemaining).toBe(3)
})

describe('Lola Santiago', () => {
  it('gives +1 intellect and agility', () => {
    expect(skillTestValue(investigateHere(setup('04196', { enemy: null }))).total).toBe(4)
  })
  it('exhausts and spends resources equal to the shroud to discover 1 clue', () => {
    let s = setup('04196', { enemy: null, resources: 2 })
    s = choose(s, 'ability.simpleLolaClue', { card: 'Lola Santiago', n: 2 })
    expect(me(s)).toMatchObject({ resources: 0, clues: 1, actionsRemaining: 3 })
    expect(s.assets['04196']!.exhausted).toBe(true)
    expect(labels(setup('04196', { enemy: null, resources: 1 }))).not.toContain(
      'ability.simpleLolaClue',
    )
    expect(labels(clues(setup('04196', { enemy: null }), 'A', 0))).not.toContain(
      'ability.simpleLolaClue',
    )
  })
})

describe('Dario El-Amin', () => {
  it('gives +1 willpower and intellect only with 10 or more resources', () => {
    expect(skillTestValue(investigateHere(setup('03151', { enemy: null }))).total).toBe(3)
    expect(
      skillTestValue(investigateHere(setup('03151', { enemy: null, resources: 10 }))).total,
    ).toBe(4)
  })
  it('exhausts for 2 resources only without enemies at your location', () => {
    let s = setup('03151', { enemy: null })
    s = choose(s, 'ability.simpleDarioResources', { card: 'Dario El-Amin' })
    expect(me(s)).toMatchObject({ resources: 7, actionsRemaining: 2 })
    expect(s.assets['03151']!.exhausted).toBe(true)
    const enemyHere = during(setup('03151', { enemy: null }), (x) => x, spawnAt('A', ghoul, null))
    expect(labels(enemyHere)).not.toContain('ability.simpleDarioResources')
  })
})
