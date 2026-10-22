import { registerUpgrade } from './register'
import { cardName } from '../dunwich-pilot/effects'
// RR: Reactions, Exhaust. Fine Tuning exhausts itself to ready the host once.
registerUpgrade('10054', ['Tool', 'Science'], {
  limitPerAsset: true,
  behavior: {
    afterHostExhausted: (_s, host, index) => ({
      label: 'choice.fineTuning',
      params: { card: cardName(host.code) },
      then: [
        { type: 'ExhaustUpgrade', asset: host.id, index },
        { type: 'ReadyAsset', asset: host.id },
      ],
    }),
  },
})
