import { registerPlayerCard } from '@lcg/engine'
import { reaction } from '../core-2026/cards'
// RR: Damage and Horror (assignment); Reactions. Rookie Cop may be assigned damage and/or horror
// dealt to other investigators at your location. When it is defeated: discover 1 clue at your
// location.
registerPlayerCard({
  code: '60157',
  soaksForOthers: true,
  reactions: (_s, trigger, self) =>
    trigger.type === 'assetDefeated' && trigger.asset.id === self.id
      ? [
          reaction(self, 'ability.discoverClue', [
            { type: 'DiscoverClues', investigator: self.owner, amount: 1 },
          ]),
        ]
      : [],
})
