import { enemiesAt, getInvestigator, registerPlayerCard } from '@lcg/engine'
// RR: Play Restrictions; Healing. Any enemy here blocks play, including exhausted and unengaged enemies.
registerPlayerCard({
  code: '02273',
  canPlay: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return here !== null && enemiesAt(state, here).length === 0
  },
  play: (_state, investigator) => [
    { type: 'Heal', investigator, damage: 0, horror: 3 },
    { type: 'DrawCards', investigator, amount: 1 },
  ],
})
