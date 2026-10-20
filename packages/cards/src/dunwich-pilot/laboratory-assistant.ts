import { registerPlayerCard } from '@lcg/engine'
import { reaction } from '../core-2026/cards'

// RR: Reactions; Hand Size. Applies to each entry, including effects other than playing.
registerPlayerCard({
  code: '02020',
  handSize: 2,
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterAssetEntersPlay' && trigger.asset === self.id
      ? [
          reaction(
            self,
            'ability.drawCards',
            [{ type: 'DrawCards', investigator: self.owner, amount: 2 }],
            { n: 2 },
          ),
        ]
      : [],
})
