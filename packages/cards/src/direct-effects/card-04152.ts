import { registerPlayerCard } from '@lcg/engine'
import { here, ownWithUses, placeOn } from './register'
// Truth from Fiction: play only if there is a clue on your location; place 2 secrets on
// an asset you control (one that uses secrets).
registerPlayerCard({
  code: '04152',
  canPlay: (s, by) => {
    const location = here(s, by)
    return (
      location !== null &&
      (s.locations[location]?.clues ?? 0) > 0 &&
      ownWithUses(s, by, 'secret').length > 0
    )
  },
  play: (s, by) => placeOn(by, ownWithUses(s, by, 'secret'), () => 2),
})
