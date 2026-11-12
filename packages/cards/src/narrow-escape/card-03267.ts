// RR: Attacks of Opportunity, Cancel, Delayed Effects (next test this turn).
import { registerPlayerCard } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
const code = '03267'
registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (s, t, by) =>
    t.type === 'whenEnemyAttacks' &&
    t.opportunity === true &&
    t.investigator === by &&
    s.canceledAttack !== t.enemy
      ? [
          {
            key: 'hand:' + code,
            investigator: by,
            label: 'ability.playCard',
            params: { card: cardName(code) },
            target: { type: 'hand', code },
            then: [
              {
                type: 'PlayCard',
                investigator: by,
                code,
                effect: [
                  { type: 'CancelEnemyAttack', enemy: t.enemy },
                  { type: 'NextTestBonus', investigator: by, amount: 2, thisTurn: true },
                ],
              },
            ],
          },
        ]
      : [],
})
