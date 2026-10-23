import { registerPlayerCard } from '@lcg/engine'

// RR: Actions, Commit Cards, Duration. Include every investigator's completed
// actions, including eliminated investigators, but not the action in progress.
registerPlayerCard({
  code: '04150',
  canCommit: (_s, t, by) => by === t.investigator,
  additionalIcons: (s) => ({
    wild: -Math.min(
      3,
      s.investigators.reduce(
        (n, i) =>
          n +
          (i.completedActions?.phase === s.phase && i.completedActions.round === s.round
            ? i.completedActions.count
            : 0),
        0,
      ),
    ),
  }),
})
