import { registerBasicEvent } from '../basic-events/register'
import { heal, healStep } from './register'
// Unflappable (1): evade at +3; on success heal 2 horror from among cards you control.
registerBasicEvent(
  '60271',
  {
    action: 'evade',
    modifier: 3,
    tags: ['insight'],
    onSuccess: ({ investigator }) => [heal('60271', investigator, 'horror', 2, 'controlled')],
  },
  { effect: (s, by, _step, data) => healStep(s, '60271', by, data) },
)
