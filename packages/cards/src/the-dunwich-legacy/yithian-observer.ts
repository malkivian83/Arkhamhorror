import { getInvestigator, registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { REMAINING_CODES as C } from './remaining-codes'
export const yithianObserver = enemy({
  code: C.yithianObserver,
  name: 'Yithian Observer',
  traits: ['Monster', 'Yithian'],
  fight: 4,
  health: 4,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: [],
  prey: { type: 'fewestCards' },
  victory: 1,
})
registerEnemy({
  code: C.yithianObserver,
  onAttack: (_state, _self, investigator) => [
    { type: 'DiscardRandomFromHand', investigator, amount: 1 },
  ],
  attackModifier: (state, _self, investigator) =>
    getInvestigator(state, investigator).hand.length === 0
      ? { damage: 1, horror: 1 }
      : { damage: 0, horror: 0 },
})
