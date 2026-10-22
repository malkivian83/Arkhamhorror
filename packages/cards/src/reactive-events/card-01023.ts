import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'

// RR: Cancel, Enemy Attacks. The attacked investigator must share your location.
registerPlayerCard({
  code: '01023',
  handReactions: (state, trigger, investigator) => {
    if (trigger.type !== 'whenEnemyAttacks' || state.canceledAttack === trigger.enemy) return []
    const me = getInvestigator(state, investigator)
    if (me.blockedTypes?.some((block) => block.cardType === 'event' && block.round === state.round))
      return []
    const attacked = getInvestigator(state, trigger.investigator)
    if (me.location === null || me.location !== attacked.location) return []
    return [
      {
        key: 'hand:01023',
        investigator,
        label: 'ability.playCard',
        params: { card: playerCardDef('01023')!.name },
        target: { type: 'hand', code: '01023' },
        then: [
          {
            type: 'PlayCard',
            investigator,
            code: '01023',
            effect: [{ type: 'CancelEnemyAttack', enemy: trigger.enemy }],
          },
        ],
      },
    ]
  },
})
