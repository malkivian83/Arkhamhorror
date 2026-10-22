import { playerCardDef, registerPlayerCard, type Choice, type GameState } from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
// Sacrifice (1): discard a Mystic asset you control; then draw 3 cards or gain 3 resources,
// or any combination, chosen one at a time.
const mystic = (s: GameState, by: string) =>
  Object.values(s.assets).filter((a) => a.owner === by && playerCardDef(a.code)?.class === 'mystic')
registerPlayerCard({
  code: '04234',
  canPlay: (s, by) => mystic(s, by).length > 0,
  play: (s, by) =>
    ask(
      by,
      mystic(s, by).map((a): Choice => ({
        label: 'choice.discardFromPlay',
        params: { card: playerCardDef(a.code)!.name },
        target: { type: 'asset', id: a.id },
        then: [
          { type: 'DiscardAsset', asset: a.id },
          continuation('04234', by, 'gain', { remaining: 3 }),
        ],
      })),
    ),
  effect: (_s, by, _step, data) => {
    const remaining = Number(data.remaining)
    if (remaining <= 0) return []
    const next = continuation('04234', by, 'gain', { remaining: remaining - 1 })
    return ask(
      by,
      [
        {
          label: 'choice.drawCards',
          params: { n: 1 },
          then: [{ type: 'DrawCards', investigator: by, amount: 1 }, next],
        },
        {
          label: 'choice.eventResources',
          params: { n: 1 },
          then: [{ type: 'GainResources', investigator: by, amount: 1 }, next],
        },
      ],
      true,
    )
  },
})
