import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'

// RR: Fast, Evade, Weakness, Elite. Close Call (2): play after a non-weakness, non-Elite enemy
// at your location is evaded (by any investigator): shuffle that enemy into the encounter deck.
const code = '01083'
registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (state, trigger, investigator) => {
    if (trigger.type !== 'afterEvade') return []
    const enemy = state.enemies[trigger.enemy]
    const here = getInvestigator(state, investigator).location
    if (
      !enemy ||
      here === null ||
      enemy.location !== here ||
      enemy.owner !== undefined ||
      (enemy.traits ?? []).includes('Elite')
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
            effect: [
              { type: 'PutEnemyOnEncounterDeck', enemy: enemy.id },
              { type: 'ShuffleSetAsideIntoEncounter', codes: [] },
            ],
          },
        ],
      },
    ]
  },
})
