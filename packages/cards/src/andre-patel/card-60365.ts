import {
  enemiesAt,
  enemyMaxHealth,
  getInvestigator,
  registerPlayerCard,
  type Choice,
  type Enemy,
  type GameState,
  type Message,
} from '@lcg/engine'
import { PAY_YOUR_DUES } from './codes'

const remaining = (state: GameState, enemy: Enemy) =>
  Math.max(0, enemyMaxHealth(state, enemy) - enemy.damageTaken)

/** Non-Elite enemies at your location. */
function targets(state: GameState, investigator: string): Enemy[] {
  const here = getInvestigator(state, investigator).location
  return here === null ? [] : enemiesAt(state, here).filter((e) => !e.traits?.includes('Elite'))
}

// RR: Cost X, Parley, Engagement, Keywords (Aloof). Pay Your Dues: Parley. Choose a non-Elite
// enemy at your location with X remaining health: it disengages from each investigator and
// gains aloof until the end of the round. Discover 1 clue at your location.
registerPlayerCard({
  code: PAY_YOUR_DUES,
  costX: true,
  parley: true,
  xOptions: (state, investigator) =>
    [...new Set(targets(state, investigator).map((e) => remaining(state, e)))].sort(
      (a, b) => a - b,
    ),
  canPlay: (state, investigator) => {
    const resources = getInvestigator(state, investigator).resources
    return targets(state, investigator).some((e) => remaining(state, e) <= resources)
  },
  play: (state, investigator, x) => {
    const chosen = (e: Enemy): Message[] => [
      { type: 'DisengageEnemy', enemy: e.id },
      { type: 'EnemyGainsKeyword', enemy: e.id, keyword: 'aloof' },
      { type: 'DiscoverClues', investigator, amount: 1 },
    ]
    const eligible = targets(state, investigator).filter((e) => remaining(state, e) === x)
    if (eligible.length === 0) return []
    if (eligible.length === 1) return chosen(eligible[0]!)
    return [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEnemy',
          choices: eligible.map((e): Choice => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: chosen(e),
          })),
        },
      },
    ]
  },
})
