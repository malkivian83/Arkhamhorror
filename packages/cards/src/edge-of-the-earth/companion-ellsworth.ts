import {
  playerCardDef,
  turnActionTiming,
  turnStartedAt,
  type AbilitiesFn,
  type Asset,
  type GameState,
  type Message,
} from '@lcg/engine'
import { continuation } from '../dunwich-pilot/effects'

export const iceTreacheryBlank = (state: GameState, id: string): boolean =>
  state.phase === 'investigation' && state.scenarioMeta?.[`blank:${id}`] === turnStartedAt(state)

export function ellsworth(resolute: boolean): AbilitiesFn<Asset> {
  return (state, self, investigator) => {
    if (!turnActionTiming(state) || (!resolute && (self.exhausted || self.uses < 1))) return []
    const exhaust: Message = { type: 'ExhaustAsset', asset: self.id }
    const spend: Message = { type: 'SpendUses', asset: self.id, amount: 1 }
    const costs = resolute
      ? [...(self.exhausted ? [] : [[exhaust]]), ...(self.uses < 1 ? [] : [[spend]])]
      : [[exhaust, spend]]
    return Object.values(state.treacheries)
      .filter(
        (card) =>
          !iceTreacheryBlank(state, card.id) &&
          (resolute
            ? !['limbo', 'hand'].includes(card.placement.type) &&
              !playerCardDef(card.code)?.weakness
            : card.placement.type === 'location'),
      )
      .flatMap((card) =>
        costs.map((cost, index) => ({
          key: `${self.id}:blank:${card.id}:${index}`,
          label:
            cost.length === 2
              ? 'ability.edgeOfTheEarth.ellsworth'
              : cost[0] === exhaust
                ? 'ability.edgeOfTheEarth.ellsworthExhaust'
                : 'ability.edgeOfTheEarth.ellsworthSpend',
          params: { card: card.name },
          target: { type: 'treachery' as const, id: card.id },
          actions: 0,
          provokes: false,
          costs: cost,
          then: [continuation(self.code, investigator, 'blank', { treachery: card.id })],
        })),
      )
  }
}
