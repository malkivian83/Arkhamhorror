import {
  engagedEnemies,
  getInvestigator,
  getLocation,
  registerPlayerCard,
  type GameState,
  type InvestigatorId,
} from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'

// RR: Evade designator (no attacks of opportunity); "Either (choose one)"; Move. The first mode
// is Bait and Switch (0). The second evades a non-Elite enemy at a connecting location and
// switches places with it: the investigator moves (engaged enemies follow) and the evaded,
// exhausted enemy moves to the location the investigator left, only if the move happened.
const code = '05282'
const nonElite = (traits?: string[]) => !traits?.includes('Elite')
function distant(state: GameState, investigator: InvestigatorId) {
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  const connections = getLocation(state, here).connections
  return Object.values(state.enemies).filter(
    (e) => connections.includes(e.location) && nonElite(e.traits),
  )
}
registerPlayerCard({
  code,
  evadeAction: true,
  noAttacksOfOpportunity: true,
  canPlay: (state, investigator) =>
    engagedEnemies(state, investigator).length > 0 || distant(state, investigator).length > 0,
  play: (state, investigator) =>
    ask(investigator, [
      ...engagedEnemies(state, investigator).map((enemy) => ({
        label: 'action.evade',
        params: { enemy: enemy.name },
        target: { type: 'enemy' as const, id: enemy.id },
        then: [
          {
            type: 'BeginSkillTest' as const,
            investigator,
            skill: 'agility' as const,
            difficulty: enemy.evade,
            kind: {
              type: 'evade' as const,
              enemy: enemy.id,
              onSuccess: [continuation(code, investigator, 'move', { enemy: enemy.id })],
            },
          },
        ],
      })),
      ...distant(state, investigator).map((enemy) => ({
        label: 'choice.baitAndSwitchSwap',
        params: { enemy: enemy.name },
        target: { type: 'enemy' as const, id: enemy.id },
        then: [
          {
            type: 'BeginSkillTest' as const,
            investigator,
            skill: 'agility' as const,
            difficulty: enemy.evade,
            kind: {
              type: 'evade' as const,
              enemy: enemy.id,
              onSuccess: [continuation(code, investigator, 'switch', { enemy: enemy.id })],
            },
          },
        ],
      })),
    ]),
  effect: (state, investigator, step, data) => {
    const enemy = state.enemies[String(data.enemy)],
      here = getInvestigator(state, investigator).location
    if (!enemy || here === null || !nonElite(enemy.traits)) return []
    if (step === 'switch')
      return getLocation(state, here).connections.includes(enemy.location)
        ? [
            { type: 'MoveTo', investigator, location: enemy.location },
            continuation(code, investigator, 'swap', { enemy: enemy.id, from: here }),
          ]
        : []
    if (step === 'swap')
      return here !== data.from
        ? [{ type: 'MoveEnemy', enemy: enemy.id, location: String(data.from) }]
        : []
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
