// RR: Triggered Abilities. An investigator puts the location into play even during another turn;
// setup and unowned scenario advancement do not acquire an author from activeTurn.
import { locationBehavior, type GameState } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import {
  M,
  MUSEUM_LOCATIONS,
  THE_MISKATONIC_MUSEUM,
} from '../the-dunwich-legacy/the-miskatonic-museum'
import { CODES, locationCards, THE_PALLID_MASK } from '../the-path-to-carcosa/the-pallid-mask'
import { game, H, me, patch, put, run } from './testing'

it('Whitton sees the investigator who activates the Museum exhibit ability, independently of activeTurn', () => {
  let s = put(patch(game(true), { location: M.halls, clues: 2, deck: ['60206'] }), '60213')
  s = {
    ...s,
    scenarioId: THE_MISKATONIC_MUSEUM,
    activeTurn: 'b',
    scenarioMeta: { museumExhibits: M.athabaskan },
    setAsideLocations: { [M.athabaskan]: MUSEUM_LOCATIONS.athabaskan },
    locations: { ...s.locations, [M.halls]: { ...s.locations.A!, id: M.halls } },
  }
  const ability = locationBehavior(M.halls)!.abilities!(s, s.locations[M.halls]!, H)[0]!
  s = run(s, ...ability.then)
  expect(labels(s)).toContain('ability.whittonSearch')
  s = choose(s, 'ability.whittonSearch')
  s = choose(s, 'choice.takeCard', { card: 'Celaeno Fragments' })
  expect(me(s).hand).toContain('60206')
})
it('the same Museum placement without an explicit investigator does not trigger Whitton', () => {
  let s = put(patch(game(), { deck: ['60206'] }), '60213')
  s = {
    ...s,
    scenarioId: THE_MISKATONIC_MUSEUM,
    scenarioMeta: { museumExhibits: M.athabaskan },
    setAsideLocations: { [M.athabaskan]: MUSEUM_LOCATIONS.athabaskan },
  }
  s = run(s, { type: 'ScenarioSpecific', key: 'museumDrawExhibit' })
  expect(s.locations[M.athabaskan]).toBeDefined()
  expect(labels(s)).not.toContain('ability.whittonSearch')
})
it('the Pallid Mask preserves the revealer through its catacomb-placement continuation', () => {
  let s = put(patch(game(), { location: CODES.stoneArchways, deck: ['60206'] }), '60213')
  s = {
    ...s,
    scenarioId: THE_PALLID_MASK,
    scenarioDecks: { catacombs: [CODES.labyrinthOfBones] },
    setAsideLocations: { [CODES.labyrinthOfBones]: locationCards[CODES.labyrinthOfBones]! },
    locations: {
      [CODES.stoneArchways]: {
        ...s.locations.A!,
        id: CODES.stoneArchways,
        position: [0, 0],
        revealed: false,
      },
    },
  } satisfies GameState
  s = run(s, { type: 'RevealLocation', location: CODES.stoneArchways, investigator: H })
  expect(s.locations[CODES.labyrinthOfBones]).toBeDefined()
  expect(labels(s)).toContain('ability.whittonSearch')
  s = choose(s, 'ability.whittonSearch')
  s = choose(s, 'choice.takeCard', { card: 'Celaeno Fragments' })
  expect(me(s).hand).toContain('60206')
})
