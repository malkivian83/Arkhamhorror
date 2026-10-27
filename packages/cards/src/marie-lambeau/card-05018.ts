import { registerPlayerCard } from '@lcg/engine'
import { MYSTIFYING_SONG } from './codes'

// RR: Fast, Agenda (doom threshold), Out of Play. Mystifying Song: play when the agenda
// would advance by reaching its doom threshold. Until the end of the phase it cannot advance
// that way. Then it is removed from the game instead of staying in the discard pile.
registerPlayerCard({
  code: MYSTIFYING_SONG,
  handReactions: (_state, trigger, investigator) =>
    trigger.type === 'agendaWouldAdvance'
      ? [
          {
            key: `hand:${MYSTIFYING_SONG}`,
            investigator,
            label: 'ability.playCard',
            params: { card: 'Mystifying Song' },
            target: { type: 'hand', code: MYSTIFYING_SONG },
            then: [
              {
                type: 'PlayCard',
                investigator,
                code: MYSTIFYING_SONG,
                effect: [
                  { type: 'HoldAgenda' },
                  { type: 'RemoveFromDiscard', investigator, code: MYSTIFYING_SONG },
                ],
              },
            ],
          },
        ]
      : [],
})
