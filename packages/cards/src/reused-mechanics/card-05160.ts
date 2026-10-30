import { registerPlayerCard } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'

// RR: Fast, Evade. Belly of the Beast: play after you successfully evade an enemy by 2 or more
// (a test you performed against that enemy): discover 1 clue at that enemy's location.
const code = '05160'
registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (state, trigger, investigator) => {
    if (trigger.type !== 'afterEvade' || trigger.investigator !== investigator) return []
    const test = state.skillTest
    const enemy = state.enemies[trigger.enemy]
    if (
      !enemy ||
      !test ||
      test.investigator !== investigator ||
      test.kind.type !== 'evade' ||
      test.kind.enemy !== enemy.id ||
      !test.succeeded ||
      (test.modifiedSkill ?? 0) - test.difficulty < 2
    )
      return []
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
            effect: [{ type: 'DiscoverClues', investigator, amount: 1, location: enemy.location }],
          },
        ],
      },
    ]
  },
})
