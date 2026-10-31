import { getInvestigator, playerCardDef } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'

// RR: Evade; Uses; Cancel; Enemy Attacks. Suggestion (4): add [willpower] to the evasion and
// remove a charge unless it succeeds by 2 (it is not discarded without charges). Spend 1
// charge when a non-Elite enemy would attack you to cancel that attack.
registerBasicAsset(
  '03268',
  [
    {
      action: 'evade',
      cost: ['exhaust'],
      modifier: ({ state, investigator }) => getInvestigator(state, investigator).skills.willpower,
      after: ({ self }) =>
        self.uses > 0
          ? [
              {
                type: 'IfTestResult',
                below: 2,
                then: [{ type: 'RemoveUses', asset: self.id, amount: 1 }],
              },
            ]
          : [],
    },
  ],
  () => ({
    reactions: (state, trigger, self) => {
      if (
        trigger.type !== 'whenEnemyAttacks' ||
        trigger.investigator !== self.owner ||
        self.uses < 1 ||
        state.canceledAttack === trigger.enemy
      )
        return []
      const enemy = state.enemies[trigger.enemy]
      if (!enemy || (enemy.traits ?? []).includes('Elite')) return []
      return [
        {
          key: `${self.id}:cancel`,
          investigator: self.owner,
          label: 'ability.suggestionCancel',
          params: { card: playerCardDef('03268')!.name, enemy: enemy.name },
          then: [
            { type: 'SpendUses', asset: self.id, amount: 1 },
            { type: 'CancelEnemyAttack', enemy: enemy.id },
          ],
        },
      ]
    },
  }),
)
