import { registerUpgrade } from './register'
registerUpgrade('04019', 'Ally', { behavior: { attachedVitals: { health: 1, sanity: 1 } } })
