import { registerPlayerCard } from '@lcg/engine'
import { reaction } from '../core-2026/cards'
registerPlayerCard({
  code: '02029',
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterRevealChaosToken' &&
    trigger.investigator === self.owner &&
    ['skull', 'cultist', 'tablet', 'elderThing'].includes(String(trigger.token))
      ? [reaction(self, 'ability.pilotCandle', [{ type: 'BoostSkillTest', amount: 1 }])]
      : [],
})
