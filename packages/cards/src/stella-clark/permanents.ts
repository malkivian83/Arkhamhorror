import { registerPlayerCard, turnActionTiming } from '@lcg/engine'
import { DEJA_VU, QUICK_LEARNER } from './codes'

// RR: Permanent, Difficulty. Quick Learner: during your turn (FAQ v2.4), each skill test you
// perform gets +1 difficulty until your first action resolves, and -1 difficulty from your third
// action on (an action performed by an ability counts, FAQ; Live and Learn keeps the action).
registerPlayerCard({
  code: QUICK_LEARNER,
  permanent: {},
  ownerTestDifficulty: (state, self) => {
    const timing = turnActionTiming(state, self.owner)
    return timing === 'early' ? 1 : timing === 'late' ? -1 : 0
  },
})

// RR: Permanent, Exile, Campaign Play. Déjà Vu: between two scenarios, reduce by 1 each the
// experience cost to repurchase up to 3 cards you exiled during the last scenario (campaign.ts).
registerPlayerCard({ code: DEJA_VU, permanent: {} })
