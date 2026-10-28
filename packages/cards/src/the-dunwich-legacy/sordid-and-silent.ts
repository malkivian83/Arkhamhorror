import { activeInvestigators, getInvestigator, registerTreachery } from '@lcg/engine'
import { damage } from '../scenario-helpers'
import { B } from './altar-codes'
registerTreachery({
  code: B.sordid,
  revelation: (s, i, t) => [
    {
      type: 'PlaceTreachery',
      treachery: t.id,
      placement: { type: 'location', location: getInvestigator(s, i).location! },
    },
  ],
  forced: (s, t, self) =>
    t.type === 'agendaAdvances'
      ? [{ type: 'DiscardTreachery', treachery: self.id }]
      : t.type === 'roundEnds' && self.placement.type === 'location'
        ? activeInvestigators(s)
            .filter(
              (i) => self.placement.type === 'location' && i.location === self.placement.location,
            )
            .map((i) => damage(i.id, 0, 1))
        : [],
})
