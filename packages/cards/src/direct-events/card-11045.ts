import { registerPlayerCard } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

// RR: Fast, Discover. A revealed location need not be connected or occupied.
registerPlayerCard({
  code: '11045',
  canPlay: (s, by) =>
    s.activeTurn === by && Object.values(s.locations).some((l) => l.revealed && l.clues > 0),
  play: (s, by) =>
    ask(
      by,
      Object.values(s.locations)
        .filter((l) => l.revealed && l.clues > 0)
        .map((l) => ({
          label: 'choice.location',
          params: { location: l.name },
          target: { type: 'location', id: l.id },
          then: [{ type: 'DiscoverClues', investigator: by, location: l.id, amount: 1 }],
        })),
    ),
})
