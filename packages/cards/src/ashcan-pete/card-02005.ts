import {
  assetsCannotReady,
  getInvestigator,
  playerCardDef,
  registerInvestigator,
  registerPlayerCard,
} from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'

// RR: Setup, Free Triggered Abilities, Limits, Cannot. Discard is the cost.
registerInvestigator({
  code: '02005',
  startingAssets: ['02014'],
  elderSign: (s) => ({
    modifier: 2,
    immediate: Object.values(s.assets)
      .filter((a) => a.code === '02014')
      .map((a) => ({ type: 'ReadyAsset', asset: a.id })),
  }),
  fastOptions: (s, i) =>
    !assetsCannotReady(s, i.id) &&
    i.hand.some((c) => !playerCardDef(c)?.weakness) &&
    Object.values(s.assets).some((a) => a.owner === i.id && a.exhausted)
      ? [
          {
            key: 'pete:ready',
            investigator: i.id,
            label: 'ability.peteReady',
            params: { name: i.name },
            limit: { per: 'round' },
            then: [continuation('02005', i.id, 'discard')],
          },
        ]
      : [],
})
registerPlayerCard({
  code: '02005',
  effect: (s, by, step) => {
    if (assetsCannotReady(s, by)) return []
    if (step === 'discard')
      return ask(
        by,
        [...new Set(getInvestigator(s, by).hand)]
          .filter((c) => !playerCardDef(c)?.weakness)
          .map((card) => ({
            label: 'choice.discard',
            params: { card: playerCardDef(card)?.name ?? card },
            target: { type: 'hand' as const, code: card },
            then: [
              { type: 'DiscardFromHand' as const, investigator: by, card },
              continuation('02005', by, 'ready'),
            ],
          })),
        true,
      )
    if (step !== 'ready') return []
    return ask(
      by,
      Object.values(s.assets)
        .filter((a) => a.owner === by && a.exhausted)
        .map((a) => ({
          label: 'choice.peteReadyAsset',
          params: { card: playerCardDef(a.code)?.name ?? a.code },
          target: { type: 'asset' as const, id: a.id },
          then: [{ type: 'ReadyAsset' as const, asset: a.id }],
        })),
      true,
    )
  },
})
