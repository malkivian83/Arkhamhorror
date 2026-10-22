import {
  canEnter,
  enemiesAt,
  getInvestigator,
  leavingBlocked,
  registerPlayerCard,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

const destinations = (s: Parameters<typeof getInvestigator>[0], by: string) => {
  const here = getInvestigator(s, by).location
  if (here !== null && leavingBlocked(s, here)) return []
  return Object.values(s.locations)
    .filter(
      (l) => l.revealed && l.id !== here && !enemiesAt(s, l.id).length && canEnter(s, by, l.id),
    )
    .map((l) => l.id)
}

// RR: Fast, Engagement, Movement. Disengaging always resolves; the move is
// skipped when no revealed location without enemies exists ("if able").
registerPlayerCard({
  code: '01050',
  canPlay: (s, by) => s.activeTurn === by,
  play: (s, by) => [
    { type: 'DisengageAll', investigator: by },
    ...ask(
      by,
      destinations(s, by).map((id) => ({
        label: 'choice.moveTo',
        params: { location: s.locations[id]!.name },
        target: { type: 'location' as const, id },
        then: [{ type: 'MoveTo' as const, investigator: by, location: id }],
      })),
      true,
    ),
  ],
})
