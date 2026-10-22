import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { assetsHere } from '../dunwich-pilot/helpers'
import { heal, healStep } from './register'
// Infuse Life: heal 3 damage, one at a time, from among investigators and/or Ally assets
// at your location.
registerPlayerCard({
  code: '60464',
  canPlay: (s, by) => {
    const here = getInvestigator(s, by).location
    return (
      s.investigators.some((i) => !i.eliminated && i.location === here && i.damage > 0) ||
      assetsHere(s, by).some((a) => a.damage > 0 && playerCardDef(a.code)?.traits.includes('Ally'))
    )
  },
  play: (_s, by) => [heal('60464', by, 'damage', 3, 'location')],
  effect: (s, by, _step, data) => healStep(s, '60464', by, data),
})
