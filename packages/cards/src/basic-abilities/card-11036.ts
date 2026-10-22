import { enemiesAt, getInvestigator } from '@lcg/engine'
import { continuation } from '../dunwich-pilot/effects'
import { registerBasicAsset } from './register'
// Forensic Kit: intellect or agility at +1; on success, heal 1 horror if an exhausted
// enemy is at your location when the test resolves.
registerBasicAsset(
  '11036',
  [
    {
      action: 'investigate',
      skills: ['intellect', 'agility'],
      cost: ['use'],
      modifier: 1,
      onSuccess: ({ investigator }) => [continuation('11036', investigator, 'heal')],
    },
  ],
  () => ({
    effect: (state, investigator) => {
      const here = getInvestigator(state, investigator).location
      return here !== null && enemiesAt(state, here).some((e) => e.exhausted)
        ? [{ type: 'Heal', investigator, damage: 0, horror: 1 }]
        : []
    },
  }),
)
