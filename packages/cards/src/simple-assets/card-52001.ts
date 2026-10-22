import { getInvestigator, playerCardDef } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
// .32 Colt (2): spend 1 ammo: fight for +1 damage. Fast: spend 1 resource to return it to hand.
registerBasicAsset('52001', [{ action: 'fight', cost: ['use'], extraDamage: 1 }], (code) => ({
  fastOptions: (s, self) =>
    getInvestigator(s, self.owner).resources < 1
      ? []
      : [
          {
            key: self.id + ':return',
            investigator: self.owner,
            label: 'ability.simpleColtReturn',
            params: { card: playerCardDef(code)!.name },
            then: [
              { type: 'SpendResources', investigator: self.owner, amount: 1 },
              { type: 'ReturnAssetToHand', asset: self.id },
            ],
          },
        ],
}))
