import { registerTreachery } from '@lcg/engine'
import { WEIGHT_OF_THE_WORLD } from './codes'

// RR: Revelation, Threat Area, Forced Abilities. Weight of the World stays in its
// owner's threat area; when they fail a test, they take 1 horror and shuffle it back.
registerTreachery({
  code: WEIGHT_OF_THE_WORLD,
  revelation: (_s, by, self) => [
    {
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'threatArea', investigator: by },
    },
  ],
  forced: (_s, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    !trigger.succeeded &&
    self.placement.type === 'threatArea' &&
    trigger.investigator === self.placement.investigator
      ? [
          {
            type: 'TakeDamage',
            investigator: trigger.investigator,
            damage: 0,
            horror: 1,
            source: self.name,
          },
          { type: 'ShuffleTreacheryIntoDeck', treachery: self.id },
        ]
      : [],
})
