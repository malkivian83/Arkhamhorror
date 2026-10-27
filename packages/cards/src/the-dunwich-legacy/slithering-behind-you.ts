import { getInvestigator, registerTreachery } from '@lcg/engine'
import { horrorInPlay, museumSpecific } from './museum-helpers'
import { M } from './museum-codes'
registerTreachery({
  code: M.slithering,
  revelation: (s, investigator) =>
    horrorInPlay(s)
      ? [museumSpecific('museumHorrorDoom')]
      : [
          museumSpecific('museumSpawn', {
            investigator,
            location: getInvestigator(s, investigator).location ?? M.halls,
            engage: true,
          }),
          museumSpecific('museumShuffle'),
        ],
})
