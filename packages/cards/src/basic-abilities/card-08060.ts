import { assetSlots, type GameState, type InvestigatorId } from '@lcg/engine'
import { registerBasicAsset } from './register'
const filledArcane = (state: GameState, investigator: InvestigatorId) =>
  Object.values(state.assets)
    .filter((a) => a.owner === investigator && !a.noSlot)
    .reduce((n, a) => n + assetSlots(a).filter((s) => s === 'arcane').length, 0)
// Dragon Pole: one more arcane slot; the attack scales with filled arcane slots.
registerBasicAsset(
  '08060',
  [
    {
      action: 'fight',
      modifier: ({ state, investigator }) => filledArcane(state, investigator),
      extraDamage: ({ state, investigator }) => (filledArcane(state, investigator) >= 2 ? 1 : 0),
    },
  ],
  () => ({ extraSlots: { arcane: 1 } }),
)
