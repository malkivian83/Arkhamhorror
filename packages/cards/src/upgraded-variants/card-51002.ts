// RR: Fight; Engaged with another investigator: +1 damage on success, none on failure.
import { registerBasicAsset } from '../basic-abilities/register'
import { engagedEnemies } from '@lcg/engine'
registerBasicAsset('51002', [
  {
    action: 'fight',
    modifier: 2,
    extraDamage: ({ investigator, state }, enemy) =>
      state.investigators.some(
        (i) =>
          i.id !== investigator &&
          !i.eliminated &&
          engagedEnemies(state, i.id).some((e) => e.id === enemy.id),
      )
        ? 1
        : 0,
    fight: { failDamagePerPoint: 0 },
  },
])
