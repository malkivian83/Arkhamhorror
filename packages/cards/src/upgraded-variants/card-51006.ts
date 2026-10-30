import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { ask, cardName, moveChoices } from '../dunwich-pilot/effects'

// RR: Fast; Move; Engagement. One window per entering enemy, whether it spawned, hunted or was
// moved. Engagement is checked as the enemy arrives, so an enemy that already engaged you is
// disengaged first: it "still enters your previous location" and stays there.
const code = '51006'
registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (state, trigger, investigator) => {
    if (
      trigger.type !== 'enemyEntersLocation' ||
      trigger.location !== getInvestigator(state, investigator).location
    )
      return []
    const choices = moveChoices(state, investigator)
    const engaged = state.enemies[trigger.enemy]?.engagedWith === investigator
    return choices.length
      ? [
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
                  ...(engaged ? [{ type: 'DisengageEnemy' as const, enemy: trigger.enemy }] : []),
                  ...ask(investigator, choices),
                ],
              },
            ],
          },
        ]
      : []
  },
})
