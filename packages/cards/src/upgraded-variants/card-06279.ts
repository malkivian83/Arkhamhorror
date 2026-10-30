// RR: Activate, Search, Draw, Uses, Play by effect. Old Book of Lore (3): the chosen investigator
// searches their top 3 cards and draws one; you may then spend 1 secret so they immediately play
// that card, reducing its cost by 2.
import { canPlayByEffect, getInvestigator, investigatorsAt, registerPlayerCard } from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'

const code = '06279'
registerPlayerCard({
  code,
  abilities: (s, a, by) =>
    a.exhausted
      ? []
      : [
          {
            key: a.id + ':lore',
            label: 'ability.oldBookLore',
            actions: 1,
            provokes: true,
            costs: [{ type: 'ExhaustAsset', asset: a.id }],
            then: ask(
              by,
              investigatorsAt(s, getInvestigator(s, by).location!).map((i) => ({
                label: 'choice.investigator',
                params: { name: i.name },
                then: [continuation(code, by, 'search', { asset: a.id, target: i.id })],
              })),
              true,
            ),
          },
        ],
  effect: (s, by, step, data) => {
    const target = String(data.target)
    if (step === 'search')
      return [
        {
          type: 'SearchDeck',
          investigator: target,
          top: 3,
          traits: [],
          anyCard: true,
          includeWeaknesses: true,
          to: 'hand',
          drawFound: true,
          optional: true,
        },
        continuation(code, by, 'play', {
          asset: String(data.asset),
          target,
          hand: JSON.stringify(getInvestigator(s, target).hand),
        }),
      ]
    if (step !== 'play') return []
    const self = s.assets[String(data.asset)]
    if (!self || self.uses < 1) return []
    // The drawn card is the one now in hand that was not there before the search.
    const found = [...getInvestigator(s, target).hand]
    for (const card of JSON.parse(String(data.hand)) as string[]) {
      const index = found.indexOf(card)
      if (index >= 0) found.splice(index, 1)
    }
    const playable = [...new Set(found)].filter((card) =>
      canPlayByEffect(s, target, card, 'hand', false, 2),
    )
    return playable.length
      ? ask(
          by,
          [
            ...playable.map((card) => ({
              label: 'choice.upgradedPlayFound',
              params: { card: cardName(card), name: getInvestigator(s, target).name },
              target: { type: 'hand' as const, code: card },
              then: [
                { type: 'SpendUses' as const, asset: self.id, amount: 1 },
                {
                  type: 'PlayCard' as const,
                  investigator: target,
                  code: card,
                  discount: 2,
                  byEffect: true,
                },
              ],
            })),
            { label: 'choice.skip', then: [] },
          ],
          true,
        )
      : []
  },
})
