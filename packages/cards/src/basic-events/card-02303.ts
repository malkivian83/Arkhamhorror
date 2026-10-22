import { shroudOf, type Message } from '@lcg/engine'
import { registerBasicEvent } from './register'
const revealed = (state: Parameters<typeof shroudOf>[0]) =>
  Object.values(state.locations).filter((l) => l.revealed)
// Deciphered Reality (5): the difficulty is the highest revealed shroud; a success discovers
// 1 clue at each revealed location instead of the usual clue.
registerBasicEvent('02303', {
  action: 'investigate',
  replaceClue: true,
  difficulty: ({ state }) => Math.max(0, ...revealed(state).map((l) => shroudOf(state, l.id))),
  onSuccess: ({ state, investigator }) =>
    revealed(state).map((l): Message => ({
      type: 'DiscoverClues',
      investigator,
      amount: 1,
      location: l.id,
    })),
})
