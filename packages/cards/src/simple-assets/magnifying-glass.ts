import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
// Magnifying Glass (1): fast; +1 intellect while investigating. Fast: if there are no clues
// on your location, return it to your hand.
export function registerMagnifyingGlass(code: string): void {
  registerPlayerCard({
    code,
    skillModifier: (_s, _self, test) => (test.kind.type === 'investigate' ? 1 : 0),
    fastOptions: (s, self) => {
      const here = getInvestigator(s, self.owner).location
      return here === null || (s.locations[here]?.clues ?? 0) > 0
        ? []
        : [
            {
              key: self.id + ':return',
              investigator: self.owner,
              label: 'ability.simpleReturnToHand',
              params: { card: playerCardDef(code)!.name },
              then: [{ type: 'ReturnAssetToHand', asset: self.id }],
            },
          ]
    },
  })
}
