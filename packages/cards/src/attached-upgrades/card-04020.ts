import { registerUpgrade } from './register'
registerUpgrade('04020', 'Item', { behavior: { attachedResolvingSkills: 1 } })
