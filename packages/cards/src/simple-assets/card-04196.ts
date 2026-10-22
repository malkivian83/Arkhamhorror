import { getInvestigator, playerCardDef, registerPlayerCard, shroudOf } from '@lcg/engine'
// Lola Santiago (3): +1 intellect and +1 agility. Fast: exhaust her and spend resources equal
// to your location's shroud to discover 1 clue there.
registerPlayerCard({
  code: '04196',
  skillModifier: (_s, _self, test) => (['intellect', 'agility'].includes(test.skill) ? 1 : 0),
  fastOptions: (s, self) => {
    const me = getInvestigator(s, self.owner)
    if (self.exhausted || me.location === null || !(s.locations[me.location]?.clues ?? 0)) return []
    const cost = shroudOf(s, me.location)
    if (me.resources < cost) return []
    return [
      {
        key: self.id + ':clue',
        investigator: self.owner,
        label: 'ability.simpleLolaClue',
        params: { card: playerCardDef('04196')!.name, n: cost },
        then: [
          { type: 'ExhaustAsset', asset: self.id },
          { type: 'SpendResources', investigator: self.owner, amount: cost },
          { type: 'DiscoverClues', investigator: self.owner, location: me.location, amount: 1 },
        ],
      },
    ]
  },
})
