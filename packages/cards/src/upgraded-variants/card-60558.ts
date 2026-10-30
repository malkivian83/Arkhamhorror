// RR: Investigate (additional location costs apply); retry the same test once by exhausting.
import {
  getInvestigator,
  getLocation,
  playerCardDef,
  registerPlayerCard,
  shroudOf,
  type GameState,
  type LocationId,
} from '@lcg/engine'
import { exhaust, reaction } from '../core-2026/cards'
const code = '60558'
const investigate = (s: GameState, investigator: string, source: string, here: LocationId) => ({
  type: 'BeginSkillTest' as const,
  investigator,
  skill: 'intellect' as const,
  difficulty: Math.max(0, shroudOf(s, here) - 1),
  source,
  kind: { type: 'investigate' as const, location: here },
})
registerPlayerCard({
  code,
  abilities: (s, self, investigator) => {
    const here = getInvestigator(s, investigator).location
    return here === null
      ? []
      : [
          {
            key: `${self.id}:investigate`,
            label: 'ability.investigateWith',
            params: { card: playerCardDef(code)!.name, skill: 'intellect' },
            target: { type: 'location', id: here },
            actions: 1 + (getLocation(s, here).investigateExtraActions ?? 0),
            provokes: true,
            then: [investigate(s, investigator, self.id, here)],
          },
        ]
  },
  reactions: (s, trigger, self) =>
    trigger.type === 'skillTestEnded' &&
    trigger.source === self.id &&
    trigger.kind === 'investigate' &&
    !trigger.succeeded &&
    !self.exhausted &&
    trigger.location !== undefined
      ? [
          reaction(self, 'ability.retryCompass', [
            exhaust(self),
            investigate(s, self.owner, self.id, trigger.location),
          ]),
        ]
      : [],
})
