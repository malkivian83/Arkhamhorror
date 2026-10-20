import { registerPlayerCard } from '@lcg/engine'
// RR: Player order; Victory Display. Finish every encounter draw before moving the event.
registerPlayerCard({
  code: '02111',
  play: (state, investigator) => [
    ...state.investigators
      .filter((i) => !i.eliminated)
      .map((i) => ({ type: 'DrawEncounterCard' as const, investigator: i.id })),
    { type: 'EventToVictory', investigator, code: '02111', points: 1 },
  ],
})
