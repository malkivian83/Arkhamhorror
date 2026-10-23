import { registerPlayerCard } from '@lcg/engine'

// RR: Commit Cards. Distance is waived, but test type, icons and peril still apply.
registerPlayerCard({
  code: '09030',
  canCommit: (_s, t) => t.kind.type === 'fight' || t.kind.type === 'evade',
  commitFromLocation: () => true,
})
