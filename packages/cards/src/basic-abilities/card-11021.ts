import { registerBasicAsset } from './register'
// Crowbar: investigate with combat or fight at +2, each exhausting it.
registerBasicAsset('11021', [
  { action: 'investigate', skills: ['combat'], cost: ['exhaust'] },
  { action: 'fight', cost: ['exhaust'], modifier: 2 },
])
