import { getInvestigator, registerPlayerCard, type GameState, type Message } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
import { A_TEST_OF_WILL, A_TEST_OF_WILL_2 } from './codes'

const willTest = (investigator: string, onSuccess: Message[], onFail: Message[]): Message => ({
  type: 'BeginSkillTest',
  investigator,
  skill: 'willpower',
  difficulty: 3,
  kind: { type: 'effect', source: cardName(A_TEST_OF_WILL), onSuccess, onFail, onFailEach: [] },
})

/** A non-weakness treachery just drawn by an investigator at your location. */
function drawnHere(state: GameState, drawer: string, investigator: string, treachery: string) {
  const here = getInvestigator(state, investigator).location
  const card = state.treacheries[treachery]
  return here !== null && getInvestigator(state, drawer).location === here && card && !card.owner
    ? card
    : null
}

// RR: Fast, Revelation, Cancel. A Test of Will (0): play when an investigator at your location
// draws a non-weakness treachery card. Test [willpower] (3); if you succeed, cancel that card's
// revelation effect. Level 2: cancel it, then test [willpower] (3); if you fail, exile this event.
for (const [code, upgraded] of [
  [A_TEST_OF_WILL, false],
  [A_TEST_OF_WILL_2, true],
] as const)
  registerPlayerCard({
    code,
    canPlay: () => false,
    handReactions: (state, trigger, investigator) => {
      if (trigger.type !== 'whenTreacheryDrawn') return []
      const card = drawnHere(state, trigger.investigator, investigator, trigger.treachery)
      if (!card || card.canceled) return []
      const cancel: Message = { type: 'CancelRevelation', treachery: card.id }
      return [
        {
          key: 'hand:' + code,
          investigator,
          label: 'ability.playCard',
          params: { card: cardName(code) },
          then: [
            {
              type: 'PlayCard',
              investigator,
              code,
              effect: upgraded
                ? [cancel, willTest(investigator, [], [{ type: 'ExileCard', investigator, code }])]
                : [willTest(investigator, [cancel], [])],
            },
          ],
        },
      ]
    },
  })
