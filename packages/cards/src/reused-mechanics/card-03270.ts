import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
// RR: Fast, Revelation, Cancel. Ward of Protection (2): when an investigator at any location
// draws a non-weakness treachery, cancel its revelation; the player of this card takes 1 horror.
const code = '03270'
registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (state, trigger, investigator) => {
    if (trigger.type !== 'whenTreacheryDrawn') return []
    const treachery = state.treacheries[trigger.treachery]
    if (!treachery || treachery.owner || getInvestigator(state, investigator).eliminated) return []
    return [
      {
        key: 'hand:' + code,
        investigator,
        label: 'ability.playCard',
        params: { card: playerCardDef(code)!.name },
        target: { type: 'hand', code },
        then: [
          {
            type: 'PlayCard',
            investigator,
            code,
            effect: [
              { type: 'CancelRevelation', treachery: treachery.id },
              { type: 'TakeDamage', investigator, damage: 0, horror: 1 },
            ],
          },
        ],
      },
    ]
  },
})
