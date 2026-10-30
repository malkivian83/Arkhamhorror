// RR: Fight; Engaged with another investigator: +1 damage on success, none on failure.
import { registerBasicAsset } from '../basic-abilities/register'
registerBasicAsset('51002', [
  {
    action: 'fight',
    modifier: 2,
    extraDamage: ({ investigator }, enemy) =>
      enemy.engagedWith !== null && enemy.engagedWith !== investigator ? 1 : 0,
    fight: { failDamagePerPoint: 0 },
  },
])
