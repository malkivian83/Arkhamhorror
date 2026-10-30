// RR: Shuffle, Draw, Hand Size, Out of Play. Glimpse the Unthinkable (5): shuffle any number of
// non-weakness cards from hand into the deck, draw up to your maximum hand size, then it is
// removed from the game instead of staying in the discard pile.
import { getInvestigator, handSize, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'

const code = '05318'
registerPlayerCard({
  code,
  play: (_s, by) => [continuation(code, by, 'choose', { selected: '[]' })],
  effect: (s, by, step, data) => {
    if (step === 'fill') {
      const missing = handSize(s, by) - getInvestigator(s, by).hand.length
      return missing > 0 ? [{ type: 'DrawCards', investigator: by, amount: missing }] : []
    }
    if (step !== 'choose') return []
    const selected = JSON.parse(String(data.selected)) as string[]
    const available = [...getInvestigator(s, by).hand]
    for (const card of selected) {
      const index = available.indexOf(card)
      if (index >= 0) available.splice(index, 1)
    }
    return ask(
      by,
      [
        {
          label: 'choice.upgradedGlimpseFinish',
          then: [
            ...(selected.length
              ? [
                  {
                    type: 'ShuffleCardsIntoDeck' as const,
                    investigator: by,
                    cards: selected,
                    fromHand: true,
                  },
                ]
              : []),
            continuation(code, by, 'fill'),
            { type: 'RemoveFromDiscard', investigator: by, code },
          ],
        },
        ...[...new Set(available)]
          .filter((card) => !playerCardDef(card)?.weakness)
          .map((card) => ({
            label: 'choice.harveyShuffle',
            params: { card: cardName(card) },
            target: { type: 'hand' as const, code: card },
            then: [
              continuation(code, by, 'choose', { selected: JSON.stringify([...selected, card]) }),
            ],
          })),
      ],
      true,
    )
  },
})
