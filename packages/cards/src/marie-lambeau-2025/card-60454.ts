// RR: Weakness, Threat Area, Forced Abilities, Activated Abilities.
import { getInvestigator, registerTreachery } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
import { HEMOPHOBIA } from './codes'

const roundKey = (id: string) => `hemophobia:${id}`

// Hemophobia: Forced - the first time each round an investigator at your location takes damage,
// take 1 horror. [action][action]: discard it.
registerTreachery({
  code: HEMOPHOBIA,
  revelation: (_s, investigator, self) => [
    {
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'threatArea', investigator },
    },
  ],
  forced: (s, t, self) => {
    if (
      t.type !== 'afterTakeDamage' ||
      t.damage <= 0 ||
      self.placement.type !== 'threatArea' ||
      s.scenarioMeta?.[roundKey(self.id)] === s.round
    )
      return []
    const owner = getInvestigator(s, self.placement.investigator)
    const damaged = getInvestigator(s, t.investigator)
    if (owner.eliminated || owner.location === null || damaged.location !== owner.location)
      return []
    return [
      { type: 'SetScenarioMeta', key: roundKey(self.id), value: s.round },
      {
        type: 'TakeDamage',
        investigator: owner.id,
        damage: 0,
        horror: 1,
        source: cardName(HEMOPHOBIA),
      },
    ]
  },
  abilities: (_s, self) => [
    {
      key: `${self.id}:discard`,
      label: 'ability.discardTreachery',
      params: { card: self.name },
      target: { type: 'treachery', id: self.id },
      actions: 2,
      provokes: true,
      then: [{ type: 'DiscardTreachery', treachery: self.id }],
    },
  ],
})
