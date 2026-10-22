import { registerPlayerCard } from '@lcg/engine'
import { cardName, connecting, moveTo } from './register'
// Cat Burglar (1): +1 agility. Action, exhaust: disengage from each enemy engaged with you
// and move to a connecting location, without provoking attacks of opportunity.
export function registerCatBurglar(code: string): void {
  registerPlayerCard({
    code,
    skillModifier: (_s, _self, test) => (test.skill === 'agility' ? 1 : 0),
    abilities: (s, self) => {
      const to = connecting(s, self.owner)
      return self.exhausted || !to.length
        ? []
        : [
            {
              key: self.id + ':escape',
              label: 'ability.supportCatBurglar',
              params: { card: cardName(code) },
              actions: 1,
              provokes: false,
              costs: [{ type: 'ExhaustAsset', asset: self.id }],
              then: [
                { type: 'DisengageAll', investigator: self.owner },
                ...moveTo(self.owner, s, to),
              ],
            },
          ]
    },
  })
}
