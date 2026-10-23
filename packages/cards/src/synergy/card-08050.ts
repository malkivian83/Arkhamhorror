import { registerPlayerCard } from '@lcg/engine'
import { controlledClasses } from './classes'
registerPlayerCard({
  code: '08050',
  playInAnyFastWindow: true,
  canPlay: (s, by) => controlledClasses(s, by) > 0,
  play: (s, by) => [{ type: 'GainResources', investigator: by, amount: controlledClasses(s, by) }],
})
