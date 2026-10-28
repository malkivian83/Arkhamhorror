import { copies, treachery } from '../scenario-helpers'
import { devoteeOfTheKey } from './devotee-of-the-key'
import { crazedShoggoth } from './crazed-shoggoth'
import { W } from './doom-codes'
import './rites-howled'
import './spaces-between'
import './vortex-of-time'
export const DOOM_ENCOUNTERS = [
  ...copies(devoteeOfTheKey, 2),
  crazedShoggoth,
  ...[W.rites, W.spaces, W.vortex].flatMap((code) =>
    copies(
      treachery({
        code,
        name:
          code === W.rites
            ? 'Rites Howled'
            : code === W.spaces
              ? 'Spaces Between'
              : 'Vortex of Time',
        traits: code === W.rites ? ['Hex'] : ['Hex', 'Hazard'],
        keywords: [],
      }),
      3,
    ),
  ),
]
