import { registerTreachery } from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { B } from './altar-codes'
registerTreachery({
  code: B.unhallowed,
  blanksAssetTrait: 'Ally',
  blocksPlayTrait: 'Ally',
  revelation: (_s, i, t) => [
    { type: 'PlaceTreachery', treachery: t.id, placement: { type: 'threatArea', investigator: i } },
  ],
  forced: (_s, t, self) =>
    t.type === 'turnEnds' &&
    self.placement.type === 'threatArea' &&
    self.placement.investigator === t.investigator
      ? [
          effectTest(t.investigator, 'Unhallowed Country', 'willpower', 3, {
            onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
          }),
        ]
      : [],
})
