import {
  canPlayByEffect,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type GameState,
} from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'

const items = (s: GameState, by: string) =>
  [...new Set(getInvestigator(s, by).discard)].filter((code) => {
    const d = playerCardDef(code)
    return d?.type === 'asset' && d.traits.includes('Item')
  })
// RR: Play, Remove from Game, X (outside payment, X is zero). Removal is not exile.
registerPlayerCard({
  code: '09116',
  canPlay: (s, by) => items(s, by).length > 0,
  play: (s, by) =>
    ask(
      by,
      items(s, by).map((code) => ({
        label: 'choice.card',
        params: { card: cardName(code) },
        then: ask(
          by,
          [
            {
              label: 'choice.salvageResources',
              params: { n: Math.max(0, playerCardDef(code)?.cost ?? 0) },
              then: [
                { type: 'RemoveCardFromDiscard', investigator: by, code },
                {
                  type: 'GainResources',
                  investigator: by,
                  amount: Math.max(0, playerCardDef(code)?.cost ?? 0),
                },
              ],
            },
            ...(canPlayByEffect(s, by, code, 'discard')
              ? [
                  {
                    label: 'choice.playFromDiscard',
                    then: [
                      {
                        type: 'PlayCard' as const,
                        investigator: by,
                        code,
                        from: 'discard' as const,
                        byEffect: true,
                      },
                    ],
                  },
                ]
              : []),
          ],
          true,
        ),
      })),
      true,
    ),
})
