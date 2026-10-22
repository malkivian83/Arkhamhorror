import { registerPlayerCard, withinLimit } from '@lcg/engine'
// RR Permanent, Forced Abilities, Discard: not a draw and only the first actual turn.
registerPlayerCard({
  code: '08071',
  permanent: {},
  forced: (s, t, a) =>
    t.type === 'turnBegins' &&
    t.investigator === a.owner &&
    withinLimit(s, a.id + ':short-supply', a.owner, { per: 'game' })
      ? [
          {
            type: 'UseAbility',
            investigator: a.owner,
            key: a.id + ':short-supply',
            actions: 0,
            provokes: false,
            limit: { per: 'game' },
            then: [{ type: 'MillDeck', investigator: a.owner, amount: 10 }],
          },
        ]
      : [],
})
