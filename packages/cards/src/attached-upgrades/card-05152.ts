import { playerCardDef, type Message } from '@lcg/engine'
import { registerUpgrade } from './register'
import { cardName } from '../dunwich-pilot/effects'
// RR: Leaves Play, Reactions. The host and each other Upgrade go back to their owners' hands.
registerUpgrade('05152', 'Item', {
  limitPerAsset: true,
  behavior: {
    afterHostDiscarded: (_s, host, self) => ({
      label: 'choice.wellMaintained',
      params: { card: cardName(host.code) },
      then: [
        { type: 'DiscardToHand', investigator: host.originalOwner ?? host.owner, code: host.code },
        ...(host.upgrades ?? [])
          .filter((u) => u !== self && playerCardDef(u.code)?.traits.includes('Upgrade'))
          .map((u): Message => ({ type: 'DiscardToHand', investigator: u.owner, code: u.code })),
      ],
    }),
  },
})
