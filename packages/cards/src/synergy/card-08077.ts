import { registerPlayerCard } from '@lcg/engine'
import { controlledClasses } from './classes'
registerPlayerCard({
  code: '08077',
  additionalIcons: (s, _t, by) => ({ wild: controlledClasses(s, by) }),
})
