import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { ask, cardName, moveChoices } from './effects'
registerPlayerCard({
  code: '02025',
  canPlay: () => false,
  handReactions: (state, trigger, investigator) => {
    if (
      trigger.type !== 'beforeEnemySpawns' ||
      trigger.location !== getInvestigator(state, investigator).location
    )
      return []
    const choices = moveChoices(state, investigator)
    return choices.length
      ? [
          {
            key: 'hand:02025',
            investigator,
            label: 'ability.playCard',
            params: { card: cardName('02025') },
            then: [
              { type: 'PlayCard', investigator, code: '02025', effect: ask(investigator, choices) },
            ],
          },
        ]
      : []
  },
})
