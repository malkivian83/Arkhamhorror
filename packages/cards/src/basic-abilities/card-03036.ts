import { enemiesAt, getInvestigator, playerCardDef, type Message } from '@lcg/engine'
import { registerBasicAsset } from './register'
// Lantern (0, 2): -1 shroud investigation; discard it to deal 1 damage to an enemy at your
// location without provoking. Level 2 may instead be removed from the game for 2 damage.
for (const [code, removable] of [
  ['03036', false],
  ['52009', true],
] as const)
  registerBasicAsset(
    code,
    [{ action: 'investigate', shroud: -1 }],
    undefined,
    (_code, { state, self, investigator }) => {
      const here = getInvestigator(state, investigator).location
      if (here === null) return []
      const card = playerCardDef(code)!.name
      return enemiesAt(state, here).flatMap((enemy) =>
        (removable ? [1, 2] : [1]).map((amount) => ({
          key: `${self.id}:${amount === 1 ? 'discard' : 'remove'}`,
          label: amount === 1 ? 'ability.lanternDiscard' : 'ability.lanternRemove',
          params: { card, enemy: enemy.name },
          target: { type: 'enemy' as const, id: enemy.id },
          actions: 1,
          provokes: false,
          costs: [
            amount === 1
              ? ({ type: 'DiscardAsset', asset: self.id } as Message)
              : { type: 'RemoveAssetFromGame', asset: self.id },
          ],
          then: [{ type: 'DamageEnemy', enemy: enemy.id, amount, by: investigator } as Message],
        })),
      )
    },
  )
