import { registerPlayerCard } from '@lcg/engine'
// RR: Committing Cards; original printed Daredevil, without optional Taboo.
registerPlayerCard({
  code: '06240',
  onCommit: (_s, by) => [
    { type: 'RevealUntilCommittableSkill', investigator: by, faction: 'rogue' },
  ],
})
