import { playerCardDef, registerPlayerCard } from '@lcg/engine'
import { ownWithUses, placeOn } from './register'
// Winds of Power (1): place 2 charges on an asset you control. After you draw it during
// your turn, you may play it (paying its cost).
registerPlayerCard({
  code: '08063',
  canPlay: (s, by) => ownWithUses(s, by, 'charge').length > 0,
  play: (s, by) => placeOn(by, ownWithUses(s, by, 'charge'), () => 2),
  handReactions: (s, t, by) =>
    t.type !== 'afterDrawCard' ||
    t.investigator !== by ||
    t.card !== '08063' ||
    s.activeTurn !== by ||
    !ownWithUses(s, by, 'charge').length
      ? []
      : [
          {
            key: 'hand:08063',
            investigator: by,
            label: 'ability.playCard',
            params: { card: playerCardDef('08063')!.name },
            target: { type: 'hand', code: '08063' },
            then: [{ type: 'PlayCard', investigator: by, code: '08063' }],
          },
        ],
})
