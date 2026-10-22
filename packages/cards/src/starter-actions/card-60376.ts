import { registerBasicEvent, skillValue } from '../basic-events/register'
// Clean Sweep (2): investigate with agility adding your intellect; after the test,
// successful or not, you may move to a connecting location.
registerBasicEvent('60376', {
  action: 'investigate',
  skill: 'agility',
  modifier: ({ state, investigator }) => skillValue(state, investigator, 'intellect'),
  tags: ['tactic', 'trick'],
  after: ({ investigator }) => [
    { type: 'AfterCurrentSkillTest', then: [{ type: 'ChooseMove', investigator }] },
  ],
})
