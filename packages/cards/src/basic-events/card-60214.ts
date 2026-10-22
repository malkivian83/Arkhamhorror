import { type Message } from '@lcg/engine'
import { registerBasicEvent } from './register'
const gain = (investigator: string): Message => ({
  type: 'GainResources',
  investigator,
  amount: 2,
})
// Burning the Midnight Oil and Sneak By: gain 2 resources when the action begins.
registerBasicEvent('60214', {
  action: 'investigate',
  before: ({ investigator }) => [gain(investigator)],
})
registerBasicEvent('60316', {
  action: 'evade',
  tags: ['trick'],
  before: ({ investigator }) => [gain(investigator)],
})
