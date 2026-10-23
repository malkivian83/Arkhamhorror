import { registerPlayerCard } from '@lcg/engine'

// RR: Search, Drawing Cards. Search belongs to the performer, not the committer.
registerPlayerCard({
  code: '60268',
  afterCommittedTest: (_s, t, success) =>
    success
      ? [
          {
            type: 'SearchDeck',
            investigator: t.investigator,
            top: 6,
            traits: ['Insight'],
            cardType: 'event',
            anyType: true,
            optional: true,
            drawFound: true,
            to: 'hand',
          },
        ]
      : [],
})
