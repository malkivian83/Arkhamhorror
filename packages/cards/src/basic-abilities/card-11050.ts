import { getInvestigator, playerCardDef } from '@lcg/engine'
import { registerBasicAsset } from './register'
// Luger P08: fast attack; an action and 1 resource replenish its ammo and ready it.
registerBasicAsset(
  '11050',
  [{ action: 'fight', actions: 0, key: ':fast', cost: ['exhaust', 'use'], modifier: 1 }],
  undefined,
  (code, { state, self, investigator }) =>
    getInvestigator(state, investigator).resources < 1
      ? []
      : [
          {
            key: `${self.id}:reload`,
            label: 'ability.replenishAndReady',
            params: { card: playerCardDef(code)!.name },
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendResources', investigator, amount: 1 }],
            then: [
              {
                type: 'AddUses',
                asset: self.id,
                amount: Math.max(0, (playerCardDef(code)!.uses?.count ?? 0) - self.uses),
              },
              { type: 'ReadyAsset', asset: self.id },
            ],
          },
        ],
)
