import {
  getInvestigator,
  playerCardDef,
  uniqueAssetInPlay,
  type GameState,
  type InvestigatorId,
} from '@lcg/engine'
import { registerUpgrade } from './register'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'

// Computed after the host returns to hand, so the same Firearm can be played again.
function firearms(state: GameState, by: InvestigatorId): string[] {
  const investigator = getInvestigator(state, by)
  return [...new Set(investigator.hand)].filter((code) => {
    const def = playerCardDef(code)
    return (
      def?.type === 'asset' &&
      def.traits.includes('Firearm') &&
      (def.cost ?? 0) <= investigator.resources &&
      !uniqueAssetInPlay(state, code)
    )
  })
}
// RR: Fast, Paying costs. "Except during an action": only offered between actions.
registerUpgrade('60162', 'Firearm', {
  behavior: {
    attachedAbilities: (s, host, index, by) =>
      s.activeTurn !== by || s.skillTest
        ? []
        : [
            {
              key: `upgrade:${host.id}:${index}:60162`,
              label: 'ability.customGrip',
              params: { card: cardName(host.code) },
              actions: 0,
              provokes: false,
              costs: [{ type: 'DiscardUpgrade', asset: host.id, index }],
              then: [
                { type: 'ReturnAssetToHand', asset: host.id },
                continuation('60162', by, 'play'),
              ],
            },
          ],
    effect: (s, by) => {
      const options = firearms(s, by)
      return options.length
        ? ask(by, [
            ...options.map((code) => ({
              label: 'ability.playCard',
              params: { card: cardName(code) },
              then: [{ type: 'PlayCard' as const, investigator: by, code }],
            })),
            { label: 'choice.skip', then: [] },
          ])
        : []
    },
  },
})
