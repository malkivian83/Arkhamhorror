import { enemiesAt, getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
// Dario El-Amin: +1 willpower and +1 intellect while you have 10 or more resources.
// Action: if there are no enemies at your location, exhaust him to gain 2 resources.
registerPlayerCard({
  code: '03151',
  skillModifier: (s, self, test) =>
    ['willpower', 'intellect'].includes(test.skill) &&
    getInvestigator(s, self.owner).resources >= 10
      ? 1
      : 0,
  abilities: (s, self) => {
    const here = getInvestigator(s, self.owner).location
    if (self.exhausted || here === null || enemiesAt(s, here).length) return []
    return [
      {
        key: self.id + ':resources',
        label: 'ability.simpleDarioResources',
        params: { card: playerCardDef('03151')!.name },
        actions: 1,
        provokes: true,
        costs: [{ type: 'ExhaustAsset', asset: self.id }],
        then: [{ type: 'GainResources', investigator: self.owner, amount: 2 }],
      },
    ]
  },
})
