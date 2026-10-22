import { registerUpgrade } from './register'
// RR: Equipment Slots. The host takes up 1 fewer hand (or else accessory) slot.
registerUpgrade('10028', 'Tool', { limitPerAsset: true, behavior: { attachedSlotReduction: 1 } })
