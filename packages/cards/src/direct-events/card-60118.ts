import { registerPlayerCard } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
import { atLocation } from '../dunwich-pilot/helpers'

// RR: Target, Gain Resources. Choose another active investigator at your location.
registerPlayerCard({
  code: '60118',
  canPlay: (s, by) => atLocation(s, by).some((i) => i.id !== by),
  play: (s, by) =>
    ask(
      by,
      atLocation(s, by)
        .filter((i) => i.id !== by)
        .map((i) => ({
          label: 'choice.equipmentInvestigator',
          params: { name: i.name },
          target: { type: 'investigator', id: i.id },
          then: [
            { type: 'GainResources', investigator: by, amount: 2 },
            { type: 'GainResources', investigator: i.id, amount: 2 },
          ],
        })),
    ),
})
