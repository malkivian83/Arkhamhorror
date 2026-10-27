import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { REMAINING_CODES as C } from './remaining-codes'
export const wizardOfYogSothoth = enemy({
  code: C.wizardOfYogSothoth,
  name: 'Wizard of Yog-Sothoth',
  traits: ['Humanoid', 'Sorcerer'],
  fight: 4,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 2,
  keywords: ['hunter'],
  prey: { type: 'fewestCards' },
  victory: 1,
})
registerEnemy({
  code: C.wizardOfYogSothoth,
  forced: (state, trigger, self) => {
    if (trigger.type !== 'whenTreacheryDrawn' || self.engagedWith !== trigger.investigator)
      return []
    return state.treacheries[trigger.treachery]?.traits?.some((t) => t === 'Hex' || t === 'Pact')
      ? [
          {
            type: 'EnemyAttack',
            enemy: self.id,
            investigator: trigger.investigator,
            exhaustAfter: false,
            evenIfExhausted: true,
          },
        ]
      : []
  },
})
