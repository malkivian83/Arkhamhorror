// RR: Forced, Skill Tests ST.6. FAQ: an empty deck leaves Rex's Curse in play.
import { getInvestigator, registerTreachery } from '@lcg/engine'
registerTreachery({
  code: '02009',
  revelation: (_s, by, t) => [
    {
      type: 'PlaceTreachery',
      treachery: t.id,
      placement: { type: 'threatArea', investigator: by },
    },
  ],
  forced: (s, trigger, t) => {
    if (
      t.placement.type !== 'threatArea' ||
      !('investigator' in trigger) ||
      trigger.investigator !== t.placement.investigator
    )
      return []
    const key = t.id + ':redraw'
    if (trigger.type === 'whenWouldSucceed' && !s.skillTest?.abilityCounts?.[key])
      return [{ type: 'RedrawSkillTestTokens', use: key }]
    if (
      trigger.type === 'afterSkillTest' &&
      !trigger.succeeded &&
      s.skillTest?.abilityCounts?.[key] &&
      getInvestigator(s, trigger.investigator).deck.length > 0
    )
      return [
        { type: 'ShuffleTreacheryIntoDeck', treachery: t.id, investigator: trigger.investigator },
      ]
    return []
  },
})
