import { enemiesAt, getInvestigator, registerPlayerCard, type Choice } from '@lcg/engine'
// RR: Parley, Healing. De-Escalate: choose an enemy at your location (Elite included) and heal
// as much of your horror as that enemy's printed horror value.
registerPlayerCard({
  code: '60265',
  parley: true,
  canPlay: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return here !== null && enemiesAt(state, here).length > 0
  },
  play: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (here === null) return []
    return [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEnemy',
          choices: enemiesAt(state, here).map((e): Choice => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [{ type: 'Heal', investigator, damage: 0, horror: e.horror }],
          })),
        },
      },
    ]
  },
})
