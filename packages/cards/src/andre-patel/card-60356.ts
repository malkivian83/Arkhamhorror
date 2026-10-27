import { registerTreachery, withinLimit } from '@lcg/engine'
import { UNAWARE } from './codes'

// RR: Revelation, Threat Area, Forced Abilities, Limits. Unaware: the first time its owner
// fails a skill test during their turn, they draw the top card of the encounter deck; if
// that card is an enemy, Unaware is discarded.
registerTreachery({
  code: UNAWARE,
  revelation: (_s, by, self) => [
    {
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'threatArea', investigator: by },
    },
  ],
  forced: (state, trigger, self) => {
    if (
      trigger.type !== 'afterSkillTest' ||
      trigger.succeeded ||
      self.placement.type !== 'threatArea' ||
      trigger.investigator !== self.placement.investigator ||
      state.activeTurn !== trigger.investigator
    )
      return []
    const key = `${self.id}:unaware`
    const limit = { per: 'turn' } as const
    if (!withinLimit(state, key, trigger.investigator, limit)) return []
    return [
      {
        type: 'UseAbility',
        investigator: trigger.investigator,
        key,
        actions: 0,
        provokes: false,
        limit,
        then: [
          {
            type: 'DrawEncounterCard',
            investigator: trigger.investigator,
            ifEnemy: [{ type: 'DiscardTreachery', treachery: self.id }],
          },
        ],
      },
    ]
  },
})
