import { registerTreachery, type Treachery } from '@lcg/engine'
import { ATYCHIPHOBIA, CALLED_BY_THE_MISTS } from './codes'

const toThreatArea = (by: string, self: Treachery) => [
  {
    type: 'PlaceTreachery' as const,
    treachery: self.id,
    placement: { type: 'threatArea' as const, investigator: by },
  },
]
// [action] [action]: Discard it (investigators at the same location may help, RR Activate).
const discard = (self: Treachery) => [
  {
    key: self.id + ':discard',
    label: 'ability.discardTreachery',
    params: { card: self.name },
    actions: 2,
    provokes: true,
    then: [{ type: 'DiscardTreachery' as const, treachery: self.id }],
  },
]
const owner = (self: Treachery) =>
  self.placement.type === 'threatArea' ? self.placement.investigator : null

// RR: Revelation, Threat Area, Forced Abilities, Activate. Called by the Mists (Stella Clark's
// weakness): after you initiate a skill test with a difficulty of 4 or higher, take 1 damage.
registerTreachery({
  code: CALLED_BY_THE_MISTS,
  revelation: (_s, by, self) => toThreatArea(by, self),
  forced: (s, trigger, self) =>
    trigger.type === 'afterSkillTestInitiated' &&
    trigger.investigator === owner(self) &&
    (s.skillTest?.difficulty ?? 0) >= 4
      ? [
          {
            type: 'TakeDamage',
            investigator: trigger.investigator,
            damage: 1,
            horror: 0,
            source: self.name,
          },
        ]
      : [],
  abilities: (_s, self) => discard(self),
})

// RR: Revelation, Threat Area, Forced Abilities, Activate. Atychiphobia (basic weakness):
// after you fail a skill test, take 1 horror.
registerTreachery({
  code: ATYCHIPHOBIA,
  revelation: (_s, by, self) => toThreatArea(by, self),
  forced: (_s, trigger, self) =>
    trigger.type === 'afterSkillTest' && !trigger.succeeded && trigger.investigator === owner(self)
      ? [
          {
            type: 'TakeDamage',
            investigator: trigger.investigator,
            damage: 0,
            horror: 1,
            source: self.name,
          },
        ]
      : [],
  abilities: (_s, self) => discard(self),
})
