import {
  engagedEnemies,
  getInvestigator,
  getLocation,
  registerPlayerCard,
  type Choice,
  type Enemy,
  type GameState,
  type InvestigatorId,
} from '@lcg/engine'
import { attackable } from '../core-2026/player-cards'
import { ask } from '../dunwich-pilot/effects'
import { basicTest, type BasicEvent } from '../basic-events/register'

// RR: Fight, Evade, Engagement. Guerrilla Tactics: Fight (combat) or Evade (agility) with +1
// skill value; it may target an enemy at a connecting location as if you were engaged with it.
const code = '60564'
const modes: Record<'fight' | 'evade', BasicEvent> = {
  fight: { action: 'fight', modifier: 1, tags: ['tactic'] },
  evade: { action: 'evade', modifier: 1, tags: ['tactic'] },
}
const connected = (state: GameState, investigator: InvestigatorId): Enemy[] => {
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  const near = new Set(getLocation(state, here).connections)
  return Object.values(state.enemies).filter((e) => near.has(e.location))
}
const targets = (state: GameState, investigator: InvestigatorId, mode: 'fight' | 'evade') => [
  ...(mode === 'fight' ? attackable(state, investigator) : engagedEnemies(state, investigator)),
  ...connected(state, investigator),
]
registerPlayerCard({
  code,
  fightAction: true,
  evadeAction: true,
  noAttacksOfOpportunity: true,
  canPlay: (state, investigator) =>
    getInvestigator(state, investigator).location !== null &&
    (targets(state, investigator, 'fight').length > 0 ||
      targets(state, investigator, 'evade').length > 0),
  play: (state, investigator) => {
    const ctx = { state, investigator, code }
    return ask(
      investigator,
      (['fight', 'evade'] as const).flatMap((mode) =>
        targets(state, investigator, mode).map((enemy): Choice => ({
          label: mode === 'fight' ? 'choice.guerrillaFight' : 'choice.guerrillaEvade',
          // Global enemies (Cnidathqua) have no location of their own.
          params: { enemy: enemy.name, location: state.locations[enemy.location]?.name ?? '' },
          target: { type: 'enemy', id: enemy.id },
          then: [basicTest(modes[mode], ctx, enemy)],
        })),
      ),
      true,
    )
  },
})
