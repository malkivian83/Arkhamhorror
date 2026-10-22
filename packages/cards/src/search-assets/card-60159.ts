import { registerPlayerCard } from '@lcg/engine'
import { reaction } from '../core-2026/cards'

// RR: Reaction Opportunities, Play, Search. Only the copy just played reacts.
registerPlayerCard({
  code: '60159',
  reactions: (_s, trigger, self) =>
    trigger.type === 'afterPlayAsset' &&
    trigger.investigator === self.owner &&
    trigger.asset === self.id
      ? [
          reaction(
            self,
            'ability.searchTop',
            [
              {
                type: 'SearchDeck',
                investigator: self.owner,
                top: 6,
                traits: ['Firearm', 'Upgrade'],
                to: 'hand',
                anyType: true,
                optional: true,
              },
            ],
            { n: 6 },
          ),
        ]
      : [],
})
