import { getInvestigator, registerPlayerCard, type GameState } from '@lcg/engine'

const nearby = (s: GameState, by: string, performer: string) => {
  const from = getInvestigator(s, by).location
  const to = getInvestigator(s, performer).location
  return (
    from !== null && to !== null && (from === to || !!s.locations[from]?.connections.includes(to))
  )
}
// RR: Commit Cards, Discover Clues. The card has no printed icons; its permission
// overrides that requirement, not the investigation/parley or location restriction.
registerPlayerCard({
  code: '11088',
  commitWithoutIcons: true,
  canCommit: (s, t, by) =>
    (t.kind.type === 'investigate' || !!t.tags?.includes('parley')) &&
    nearby(s, by, t.investigator),
  commitFromLocation: (s, t, by) => nearby(s, by, t.investigator),
  afterCommittedTest: (_s, t, success) =>
    success ? [{ type: 'DiscoverClues', investigator: t.investigator, amount: 1 }] : [],
})
