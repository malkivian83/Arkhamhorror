import { registerBasicAsset } from '../basic-abilities/register'
// Fingerprint Kit (4): exhaust and spend 1 supply: investigate at +2 for 2 additional clues.
registerBasicAsset('09057', [
  { action: 'investigate', cost: ['exhaust', 'use'], modifier: 2, extraClues: 2 },
])
