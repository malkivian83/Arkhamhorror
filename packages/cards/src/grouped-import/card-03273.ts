import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'

// RR: Resolve as much as possible, Discard Pile. True Survivor FAQ (2020):
// return three Innate skills if able, otherwise all available copies.
registerPlayerCard({
  code: '03273',
  canPlay: (s, by) =>
    getInvestigator(s, by).discard.some((code) => {
      const card = playerCardDef(code)
      return card?.type === 'skill' && card.traits.includes('Innate')
    }),
  play: (_s, by) => [continuation('03273', by, 'return', { remaining: 3 })],
  effect: (s, by, step, data) => {
    const remaining = Number(data.remaining)
    if (step !== 'return' || remaining <= 0 || getInvestigator(s, by).eliminated) return []
    return ask(
      by,
      [...new Set(getInvestigator(s, by).discard)]
        .filter((code) => {
          const card = playerCardDef(code)
          return card?.type === 'skill' && card.traits.includes('Innate')
        })
        .map((code) => ({
          label: 'choice.takeCard',
          params: { card: playerCardDef(code)!.name },
          then: [
            { type: 'DiscardToHand' as const, investigator: by, code },
            continuation('03273', by, 'return', { remaining: remaining - 1 }),
          ],
        })),
      true,
    )
  },
})
