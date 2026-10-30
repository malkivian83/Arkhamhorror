import {
  enemiesAt,
  getInvestigator,
  getLocation,
  playerCardDef,
  registerPlayerCard,
  type Choice,
  type GameState,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
import { atLocation } from '../dunwich-pilot/helpers'

// RR: Fast; Play only during your turn; Doom. Moonlight Ritual (2): remove all doom from one
// non-Elite card at your location: the location, an investigator, an asset they control or
// an enemy there.
const options = (s: GameState, by: string): Choice[] => {
  const here = getInvestigator(s, by).location
  if (here === null) return []
  const location = getLocation(s, here)
  const people = atLocation(s, by)
  const owners = new Set(people.map((i) => i.id))
  return [
    ...((location.doom ?? 0) > 0
      ? [
          {
            label: 'choice.location',
            params: { location: location.name },
            target: { type: 'location' as const, id: here },
            then: [{ type: 'PlaceLocationTokens' as const, location: here, doom: -location.doom! }],
          },
        ]
      : []),
    ...people
      .filter((i) => (i.doom ?? 0) > 0)
      .map((i): Choice => ({
        label: 'choice.investigator',
        params: { name: i.name },
        target: { type: 'investigator', id: i.id },
        then: [{ type: 'RemoveDoom', target: { type: 'investigator', id: i.id }, amount: i.doom! }],
      })),
    ...Object.values(s.assets)
      .filter((a) => owners.has(a.owner) && (a.doom ?? 0) > 0)
      .map((a): Choice => ({
        label: 'choice.assignToAsset',
        params: { card: playerCardDef(a.code)!.name },
        target: { type: 'asset', id: a.id },
        then: [{ type: 'RemoveDoom', target: { type: 'asset', id: a.id }, amount: a.doom! }],
      })),
    ...enemiesAt(s, here)
      .filter((e) => (e.doom ?? 0) > 0 && !(e.traits ?? []).includes('Elite'))
      .map((e): Choice => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [{ type: 'RemoveDoom', target: { type: 'enemy', id: e.id }, amount: e.doom! }],
      })),
  ]
}
registerPlayerCard({
  code: '09093',
  canPlay: (s, by) => s.activeTurn === by && options(s, by).length > 0,
  play: (s, by) => ask(by, options(s, by)),
})
