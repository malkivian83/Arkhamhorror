import { getInvestigator, registerPlayerCard, type Asset, type GameState } from '@lcg/engine'
import { THE_BLACK_FAN } from './codes'

const resources = (state: GameState, self: Asset) => getInvestigator(state, self.owner).resources

// RR: Exceptional, Additional Actions, Health and Sanity, Defeat. The Black Fan: while you have
// 10+ resources, +1 health and +1 sanity (losing them can defeat you); 15+, one additional action
// during your turn (once per turn); 20+, +1 to each of your skills.
registerPlayerCard({
  code: THE_BLACK_FAN,
  ownerVitals: (state, self) => (resources(state, self) >= 10 ? { health: 1, sanity: 1 } : {}),
  additionalTurnActions: (state, self) => (resources(state, self) >= 15 ? 1 : 0),
  skillModifier: (state, self) => (resources(state, self) >= 20 ? 1 : 0),
})
