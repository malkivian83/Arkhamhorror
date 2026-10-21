import { registerTreachery } from '@lcg/engine'

// RR: Revelation, Threat Area, Cannot, Activate. Other investigators here may help.
registerTreachery({
  code: '02015',
  blocksAssetReady: true,
  revelation: (s, by, self) => [
    ...Object.values(s.assets)
      .filter((a) => a.owner === by)
      .map((a) => ({ type: 'ExhaustAsset' as const, asset: a.id })),
    {
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'threatArea', investigator: by },
    },
  ],
  abilities: (_s, t) => [
    {
      key: t.id + ':discard',
      label: 'ability.discardTreachery',
      params: { card: 'Wracked by Nightmares' },
      actions: 2,
      provokes: true,
      then: [{ type: 'DiscardTreachery', treachery: t.id }],
    },
  ],
})
