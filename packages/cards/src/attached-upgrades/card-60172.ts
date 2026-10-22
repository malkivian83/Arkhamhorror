import { registerUpgrade } from './register'
registerUpgrade('60172', 'Firearm', { behavior: { attachedAttackSkill: 1 } })
