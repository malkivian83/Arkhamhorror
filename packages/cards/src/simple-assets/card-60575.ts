import { registerBasicAsset } from '../basic-abilities/register'
// Winchester Model 52 (2): spend 1 ammo: fight at +3 for +1 damage; or discard it to fight
// at +3 and, on success, automatically evade the targeted enemy.
registerBasicAsset('60575', [
  { action: 'fight', cost: ['use'], modifier: 3, extraDamage: 1 },
  {
    action: 'fight',
    cost: ['discard'],
    modifier: 3,
    key: ':discard',
    label: 'ability.simpleWinchesterDiscard',
    onSuccess: ({ investigator }, enemy) => [
      { type: 'EvadeEnemy', enemy: enemy!.id, by: investigator },
    ],
  },
])
