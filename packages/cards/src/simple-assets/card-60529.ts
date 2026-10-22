import { playerCardDef } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { ask } from '../dunwich-pilot/effects'
// Chainsaw (4): spend 1 supply: fight at +2 for +2 damage; if it fails, either place
// 1 supply back on Chainsaw or deal 1 damage to the attacked enemy.
registerBasicAsset('60529', [
  {
    action: 'fight',
    cost: ['use'],
    modifier: 2,
    extraDamage: 2,
    onFail: ({ self, investigator }, enemy) =>
      ask(
        investigator,
        [
          {
            label: 'choice.simpleChainsawSupply',
            params: { card: playerCardDef('60529')!.name },
            target: { type: 'asset', id: self.id },
            then: [{ type: 'AddUses', asset: self.id, amount: 1 }],
          },
          {
            label: 'choice.simpleChainsawDamage',
            params: { enemy: enemy!.name },
            target: { type: 'enemy', id: enemy!.id },
            then: [{ type: 'DamageEnemy', enemy: enemy!.id, amount: 1, by: investigator }],
          },
        ],
        true,
      ),
  },
])
