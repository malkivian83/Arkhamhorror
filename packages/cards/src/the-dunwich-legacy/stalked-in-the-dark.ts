import { activeInvestigators, getInvestigator, registerTreachery, type Message } from '@lcg/engine'
import { horrorInPlay } from './museum-helpers'
import { M } from './museum-codes'
registerTreachery({
  code: M.stalked,
  revelation: (s, investigator) => {
    const e = horrorInPlay(s),
      location = getInvestigator(s, investigator).location
    return e && location
      ? [
          { type: 'ReadyEnemy', enemy: e.id },
          { type: 'MoveEnemy', enemy: e.id, location },
          { type: 'EngageEnemy', enemy: e.id, investigator },
          ...activeInvestigators(s)
            .filter((i) => i.location === location)
            .map((i): Message => ({
              type: 'EnemyAttack',
              enemy: e.id,
              investigator: i.id,
              exhaustAfter: false,
              evenIfExhausted: true,
            })),
        ]
      : [{ type: 'DrawEncounterCard', investigator }]
  },
})
