import { getInvestigator, playerCardDef, registerPlayerCard, scenarioBehavior } from '@lcg/engine'
// RR: Fast, Revelation, Cancel, "Then". Forewarned (1): when you draw a non-weakness treachery,
// place 1 of your clues on your location; only then is its revelation canceled.
const code = '03150'
registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (state, trigger, investigator) => {
    if (trigger.type !== 'whenTreacheryDrawn' || trigger.investigator !== investigator) return []
    const treachery = state.treacheries[trigger.treachery]
    const me = getInvestigator(state, investigator)
    if (
      !treachery ||
      treachery.owner ||
      me.clues < 1 ||
      me.location === null ||
      scenarioBehavior(state.scenarioId)?.cannotPlaceClues?.(state, me.location)
    )
      return []
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
              { type: 'PlaceCluesOnLocation', investigator, amount: 1 },
              { type: 'CancelRevelation', treachery: treachery.id },
            ],
          },
        ],
      },
    ]
  },
})
