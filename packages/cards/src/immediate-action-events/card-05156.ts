import { registerPlayerCard } from '@lcg/engine'

// RR: Fast, Player Windows; Swift Reflexes. CompleteAction remains queued until
// the action (including tests and reactions) has finished; it is not an action cost.
registerPlayerCard({
  code: '05156',
  playInAnyFastWindow: true,
  canPlay: (s) =>
    s.phase === 'investigation' &&
    s.activeTurn != null &&
    !s.skillTest &&
    !s.immediateActions?.length &&
    !s.queue.some((m) => m.type === 'CompleteAction'),
  play: (_s, by) => [{ type: 'TakeImmediateAction', investigator: by }],
})
