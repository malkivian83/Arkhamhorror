// RR: Search (top X, X = amount succeeded by), Draw, shuffle the rest.
import { registerPlayerCard } from '@lcg/engine'
import { exhaust, reaction } from '../core-2026/cards'
registerPlayerCard({
  code: '60326',
  reactions: (_s, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.investigator === self.owner &&
    trigger.succeeded &&
    trigger.margin >= 1 &&
    !self.exhausted
      ? [
          reaction(
            self,
            'ability.searchTop',
            [
              exhaust(self),
              {
                type: 'SearchDeck',
                investigator: self.owner,
                top: trigger.margin,
                traits: [],
                anyCard: true,
                includeWeaknesses: true,
                to: 'hand',
                drawFound: true,
                optional: true,
              },
            ],
            { n: trigger.margin },
          ),
        ]
      : [],
})
