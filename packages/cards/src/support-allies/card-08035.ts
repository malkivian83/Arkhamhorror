import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { cardName, connecting, moveTo } from './register'
// Hiking Boots (1): limit 1 Footwear per investigator; +1 agility. After the last clue is
// discovered from your location, exhaust them: move to a connecting location with at least
// 1 clue, or to a connecting unrevealed location.
registerPlayerCard({
  code: '08035',
  limitTrait: 'Footwear',
  skillModifier: (_s, _self, test) => (test.skill === 'agility' ? 1 : 0),
  reactions: (s, trigger, self) => {
    if (
      trigger.type !== 'afterDiscoverClues' ||
      !trigger.last ||
      self.exhausted ||
      trigger.location !== getInvestigator(s, self.owner).location
    )
      return []
    const to = connecting(s, self.owner, (id) => {
      const location = s.locations[id]!
      return !location.revealed || location.clues > 0
    })
    return to.length
      ? [
          {
            key: self.id + ':move',
            investigator: self.owner,
            label: 'ability.supportHikingBoots',
            params: { card: cardName('08035') },
            then: [{ type: 'ExhaustAsset', asset: self.id }, ...moveTo(self.owner, s, to)],
          },
        ]
      : []
  },
})
