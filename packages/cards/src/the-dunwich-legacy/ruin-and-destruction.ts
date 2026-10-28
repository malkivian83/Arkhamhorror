import { activeInvestigators, registerTreachery } from '@lcg/engine'
import { damage, effectTest } from '../scenario-helpers'
import { U } from './unseen-codes'
import { broods } from './unseen-helpers'
registerTreachery({
  code: U.ruin,
  revelation: (s, i) => {
    const actors = activeInvestigators(s).filter((a) =>
      broods(s).some((e) => e.location === a.location),
    )
    return actors.length
      ? actors.map((a) =>
          effectTest(a.id, 'Ruin and Destruction', 'agility', 3, { onFailEach: [damage(a.id, 1)] }),
        )
      : [{ type: 'DrawEncounterCard', investigator: i }]
  },
})
