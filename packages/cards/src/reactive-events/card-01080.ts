import { registerPlayerCard } from '@lcg/engine'

// RR: Skill Test Timing, step 6. Only the would-fail window permits this event.
registerPlayerCard({
  code: '01080',
  canPlay: () => false,
  playWhenFailing: true,
  play: () => [{ type: 'BoostSkillTest', amount: 2 }],
})
