import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
// RR: Fast; Additional Actions. Police Badge (2): +1 willpower. [fast] While an investigator at
// your location is taking their turn, discard it: that investigator may take 2 additional
// actions this turn.
const code = '01027'
registerPlayerCard({
  code,
  skillModifier: (_s, _a, test) => (test.skill === 'willpower' ? 1 : 0),
  fastOptions: (s, self) => {
    const here = getInvestigator(s, self.owner).location
    const active = s.activeTurn ? getInvestigator(s, s.activeTurn) : null
    return here !== null && active && !active.eliminated && active.location === here
      ? [
          {
            key: self.id + ':badge',
            investigator: self.owner,
            label: 'ability.policeBadge',
            params: { card: cardName(code), name: active.name },
            then: [
              { type: 'DiscardAsset', asset: self.id },
              { type: 'GainActions', investigator: active.id, amount: 2 },
            ],
          },
        ]
      : []
  },
})
