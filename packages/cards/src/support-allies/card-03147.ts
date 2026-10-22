import { engagedEnemies } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
// Trench Knife: your engage actions do not provoke attacks of opportunity. Fight at +X,
// where X is the number of enemies engaged with you.
registerBasicAsset(
  '03147',
  [
    {
      action: 'fight',
      modifier: ({ state, investigator }) => engagedEnemies(state, investigator).length,
    },
  ],
  () => ({ engageWithoutOpportunity: true }),
)
