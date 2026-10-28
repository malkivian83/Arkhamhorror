import { registerPlayerCard } from '@lcg/engine'
import { CHERISHED_KEEPSAKE_1, LEATHER_COAT_1 } from './codes'

// RR: Exile, Forced Abilities, Defeat (assets). Cherished Keepsake (1): sanity 4; when it is
// defeated by horror, exile it. Leather Coat (1): health 4; when defeated by damage, exile it.
// Each has only that kind of hit point, so any defeat is the printed one.
for (const code of [CHERISHED_KEEPSAKE_1, LEATHER_COAT_1])
  registerPlayerCard({
    code,
    whenDefeated: (_state, self) => [
      { type: 'ExileCard', investigator: self.originalOwner ?? self.owner, code, asset: self.id },
    ],
  })
