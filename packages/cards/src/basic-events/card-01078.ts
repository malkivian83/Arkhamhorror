import { enemiesAt, getInvestigator, registerPlayerCard } from '@lcg/engine'
// Cunning Distraction: automatically evade every enemy at your location (an evade action).
for (const code of ['01078', '01578'])
  registerPlayerCard({
    code,
    evadeAction: true,
    noAttacksOfOpportunity: true,
    canPlay: (state, investigator) => {
      const here = getInvestigator(state, investigator).location
      return here !== null && enemiesAt(state, here).length > 0
    },
    play: (state, investigator) => {
      const here = getInvestigator(state, investigator).location!
      return enemiesAt(state, here).map((e) => ({
        type: 'EvadeEnemy' as const,
        enemy: e.id,
        by: investigator,
      }))
    },
  })
