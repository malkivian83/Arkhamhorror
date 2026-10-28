import { getInvestigator, registerPlayerCard, type Choice, type Message } from '@lcg/engine'
import { RIGHT_UNDER_THEIR_NOSES, RIGHT_UNDER_THEIR_NOSES_3 } from './codes'

// RR: Fast, Evade (successful evasion), Discovering Clues. Right Under Their Noses: play after you
// successfully evade an enemy (an evasion test you succeed at; automatic evasion is not one).
// Discover 1 clue at your location; if you succeeded by 2 or more, you may discover 1 clue at a
// connecting location instead (level 3: as well).
for (const [code, asWell] of [
  [RIGHT_UNDER_THEIR_NOSES, false],
  [RIGHT_UNDER_THEIR_NOSES_3, true],
] as const)
  registerPlayerCard({
    code,
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
      const connecting = state.locations[here]!.connections.filter((l) => !!state.locations[l])
      const elsewhere = (l: string): Choice => ({
        label: 'choice.discoverAt',
        params: { location: state.locations[l]!.name },
        target: { type: 'location', id: l },
        then: [{ type: 'DiscoverClues', investigator, amount: 1, location: l }],
      })
      const ask = (choices: Choice[]): Message => ({
        type: 'Ask',
        investigator,
        question: { kind: 'chooseOne', prompt: 'prompt.rightUnderTheirNoses', choices },
      })
      const effect: Message[] =
        margin < 2 || connecting.length === 0
          ? [atHere]
          : asWell
            ? [atHere, ask([...connecting.map(elsewhere), { label: 'choice.skip', then: [] }])]
            : [
                ask([
                  {
                    label: 'choice.discoverHere',
                    target: { type: 'location', id: here },
                    then: [atHere],
                  },
                  ...connecting.map(elsewhere),
                ]),
              ]
      return [
        {
          key: `hand:${code}`,
          investigator,
          label: 'ability.playCard',
          params: { card: 'Right Under Their Noses' },
          target: { type: 'hand', code },
          then: [{ type: 'PlayCard', investigator, code, effect }],
        },
      ]
    },
  })
