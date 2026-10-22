import { registerUpgrade } from './register'
// RR: Attach To, Uses. The host may be controlled by another investigator at your location.
registerUpgrade('04193', 'Firearm', {
  behavior: { attachedMonsterDamage: 1 },
  atLocation: true,
  limitPerAsset: true,
  ammo: 2,
})
