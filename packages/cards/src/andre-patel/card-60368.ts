import { getInvestigator, registerPlayerCard, type Choice, type Message } from '@lcg/engine'
import { RIGHT_UNDER_THEIR_NOSES } from './codes'

// RR: Fast, Evade (successful evasion), Discovering Clues. Right Under Their Noses: play after you
// successfully evade an enemy (an evasion test you succeed at; automatic evasion is not one).
// Discover 1 clue at your location or, if you succeeded by 2 or more, at a connecting location
// instead.
registerPlayerCard({
  code: RIGHT_UNDER_THEIR_NOSES,
  handReactions: (state, trigger, investigator) => {
    const test = state.skillTest
    if (
      trigger.type !== 'afterEvade' ||
      trigger.investigator !== investigator ||
      !test ||
      test.investigator !== investigator ||
      test.kind.type !== 'evade' ||
      test.kind.enemy !== trigger.enemy ||
      !test.succeeded
    )
      return []
    const here = getInvestigator(state, investigator).location
    if (here === null) return []
    const margin = (test.modifiedSkill ?? 0) - test.difficulty
    const atHere: Message = { type: 'DiscoverClues', investigator, amount: 1 }
    const effect: Message[] =
      margin >= 2
        ? [
            {
              type: 'Ask',
              investigator,
              question: {
                kind: 'chooseOne',
                prompt: 'prompt.rightUnderTheirNoses',
                choices: [
                  {
                    label: 'choice.discoverHere',
                    target: { type: 'location', id: here },
                    then: [atHere],
                  },
                  ...state.locations[here]!.connections.filter((l) => !!state.locations[l]).map(
                    (l): Choice => ({
                      label: 'choice.discoverAt',
                      params: { location: state.locations[l]!.name },
                      target: { type: 'location', id: l },
                      then: [{ type: 'DiscoverClues', investigator, amount: 1, location: l }],
                    }),
                  ),
                ],
              },
            },
          ]
        : [atHere]
    return [
      {
        key: `hand:${RIGHT_UNDER_THEIR_NOSES}`,
        investigator,
        label: 'ability.playCard',
        params: { card: 'Right Under Their Noses' },
        target: { type: 'hand', code: RIGHT_UNDER_THEIR_NOSES },
        then: [{ type: 'PlayCard', investigator, code: RIGHT_UNDER_THEIR_NOSES, effect }],
      },
    ]
  },
})
