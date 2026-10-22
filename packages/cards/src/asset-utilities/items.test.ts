import { slotCapacity, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { me, patch, withAsset } from '../dunwich-pilot/testing'
import { resolve, setup } from '../basic-abilities/testing'
import './index'

const labels = (s: GameState) => s.pending!.question.choices.map((c) => c.label)

// RR: Uses, Exhaust, Fast abilities, Reactions, Moving.
it('Offering Bowl: take 1 damage for 2 resources; discarded without offerings', () => {
  let s = choose(setup('60456', { enemy: null }), 'ability.offeringBowl', { card: 'Offering Bowl' })
  expect(me(s)).toMatchObject({ damage: 1, resources: 7, actionsRemaining: 3 })
  expect(s.assets['60456']).toMatchObject({ exhausted: true, uses: 2 })
  s = choose(setup('60456', { enemy: null, asset: { uses: 1 } }), 'ability.offeringBowl', {
    card: 'Offering Bowl',
  })
  expect(s.assets['60456']).toBeUndefined()
})

it('Canteen heals 2 horror and is offered only with horror on you', () => {
  expect(labels(setup('60573', { enemy: null }))).not.toContain('ability.healHorror')
  const hurt = during(setup('60573', { enemy: null }), patch({ horror: 3 }))
  const s = choose(hurt, 'ability.healHorror', { card: 'Canteen', n: 2 })
  expect(me(s).horror).toBe(1)
  expect(s.assets['60573']).toMatchObject({ exhausted: true, uses: 2 })
})

it('Scroll of Prophecies: an investigator here draws 3 and discards 1', () => {
  let s = setup('06116', { enemy: null })
  const before = me(s).hand.length
  s = choose(s, 'ability.scrollOfProphecies', { card: 'Scroll of Prophecies', name: 'A' })
  if (s.pending?.question.prompt !== 'prompt.chooseAction')
    s = choose(s, 'choice.discard', { card: me(s).hand[0]! })
  expect(me(s).hand.length).toBe(before + 2)
  expect(me(s).discard).toHaveLength(1)
  expect(s.assets['06116']!.uses).toBe(3)
})

it('Feed the Mind draws 1 card per point succeeded by, up to 3', () => {
  for (const [token, drawn] of [
    [0, 2],
    [1, 3],
    [-3, 0],
  ] as const) {
    let s = setup('60209', { enemy: null })
    const before = me(s).hand.length
    s = resolve(choose(s, 'ability.feedTheMind', { card: 'Feed the Mind' }), token)
    expect(me(s).hand.length - before, String(token)).toBe(drawn)
  }
})

describe('Book of Shadows', () => {
  it.each(['01070', '01570'])('%s adds an arcane slot and a charge to a Spell', (code) => {
    let s = during(setup(code, { enemy: null }), (x) => withAsset(x, '01060', { uses: 1 }))
    expect(slotCapacity(s, 'a', 'arcane')).toBe(3)
    s = choose(s, 'ability.addCharge', { card: 'Book of Shadows', asset: 'Shrivelling' })
    expect(s.assets['01060']!.uses).toBe(2)
    expect(s.assets[code]!.exhausted).toBe(true)
  })
  it('level 1 costs a resource and adds no slot', () => {
    let s = during(setup('03154', { enemy: null }), (x) => withAsset(x, '01060', { uses: 1 }))
    expect(slotCapacity(s, 'a', 'arcane')).toBe(2)
    s = choose(s, 'ability.addCharge', { card: 'Book of Shadows', asset: 'Shrivelling' })
    expect(me(s).resources).toBe(4)
  })
})

describe('Movement', () => {
  it('Pathfinder moves without an action, only when no enemy is engaged with you', () => {
    expect(labels(setup('02108'))).not.toContain('ability.moveWithCard')
    let s = choose(setup('02108', { enemy: null }), 'ability.moveWithCard', { card: 'Pathfinder' })
    s = choose(s, 'action.move', { location: 'Room B' })
    expect(me(s)).toMatchObject({ location: 'B', actionsRemaining: 3 })
  })
  it('Loner moves only to an empty connecting location', () => {
    const s = choose(setup('60557', { enemy: null }), 'ability.moveTo', {
      card: 'Loner',
      location: 'Room B',
    })
    expect(me(s).location).toBe('B')
    const crowded = setup('60557', { enemy: null, players: ['a', 'b'] })
    const moved = during(crowded, (x) => patch({ location: 'B' }, 'b')(x))
    expect(labels(moved)).not.toContain('ability.moveTo')
  })
  it('Esoteric Atlas moves to a revealed location up to 3 connections away', () => {
    let s = setup('60222', { enemy: null })
    s = during(s, (x) => ({
      ...x,
      locations: { ...x.locations, C: { ...x.locations.C!, revealed: true } },
    }))
    s = choose(s, 'ability.moveWithCard', { card: 'Esoteric Atlas' })
    s = choose(s, 'action.move', { location: 'Room C' })
    expect(me(s).location).toBe('C')
    expect(s.assets['60222']!.uses).toBe(3)
  })
})

it.each(['01032', '01532'])(
  '%s Research Librarian searches for a Tome after entering play',
  (code) => {
    let s = setup('01060', { enemy: null })
    s = during(s, (x) =>
      patch({ hand: [code], deck: ['x-card', '09044', 'y-card'], resources: 10 })(x),
    )
    s = choose(s, 'action.play', { card: 'Research Librarian' })
    s = choose(s, 'ability.searchDeck', { card: 'Research Librarian' })
    if (s.pending?.question.prompt !== 'prompt.chooseAction')
      s = choose(
        s,
        s.pending!.question.choices.find((c) => c.params?.card === 'Grim Memoir')!.label,
        {
          card: 'Grim Memoir',
        },
      )
    expect(me(s).hand).toContain('09044')
  },
)

it('Venturer places supply or ammo on an asset at your location', () => {
  let s = during(setup('04018', { enemy: null }), (x) => withAsset(x, '01016', { uses: 1 }))
  s = choose(s, 'ability.placeUse', { card: 'Venturer', asset: '.45 Automatic' })
  expect(s.assets['01016']!.uses).toBe(2)
  expect(s.assets['04018']).toMatchObject({ exhausted: true, uses: 2 })
})
