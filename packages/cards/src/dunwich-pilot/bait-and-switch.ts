import { engagedEnemies, getInvestigator, getLocation, registerPlayerCard } from '@lcg/engine'
import { ask, continuation } from './effects'
const code = '02034'
registerPlayerCard({
  code,
  evadeAction: true,
  noAttacksOfOpportunity: true,
  canPlay: (state, investigator) => engagedEnemies(state, investigator).length > 0,
  play: (state, investigator) =>
    ask(
      investigator,
      engagedEnemies(state, investigator).map((enemy) => ({
        label: 'action.evade',
        params: { enemy: enemy.name },
        target: { type: 'enemy', id: enemy.id },
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'agility',
            difficulty: enemy.evade,
            kind: {
              type: 'evade',
              enemy: enemy.id,
              onSuccess: [continuation(code, investigator, 'move', { enemy: enemy.id })],
            },
          },
        ],
      })),
    ),
  effect: (state, investigator, _step, data) => {
    const enemy = state.enemies[String(data.enemy)],
      here = getInvestigator(state, investigator).location
    if (!enemy || here === null || enemy.traits?.includes('Elite')) return []
    return ask(
      investigator,
      getLocation(state, here)
        .connections.filter((to) => state.locations[to])
        .map((location) => ({
          label: 'choice.pilotMoveEnemy',
          params: { enemy: enemy.name, location: getLocation(state, location).name },
          target: { type: 'location', id: location },
          then: [{ type: 'MoveEnemy', enemy: enemy.id, location }],
        })),
    )
  },
})
