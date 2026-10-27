import {
  distancesFrom,
  getInvestigator,
  registerPlayerCard,
  type Choice,
  type GameState,
  type Message,
} from '@lcg/engine'
import { THE_GRAPEVINE } from './codes'

/** Enemies at revealed locations up to 2 connections away (including your own location). */
function targets(state: GameState, investigator: string) {
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  const distances = distancesFrom(state, here)
  return Object.values(state.enemies).filter(
    (e) => state.locations[e.location]?.revealed && (distances.get(e.location) ?? 3) <= 2,
  )
}

const approach = (investigator: string, enemy: string, from?: string): Message => ({
  type: 'PlayerCardEffect',
  code: THE_GRAPEVINE,
  investigator,
  step: 'approach',
  data: { enemy, ...(from ? { from } : {}) },
})

// RR: Uses, Parley, Movement, Engaging. The Grapevine: [action] spend 1 rumor and exhaust it:
// Parley. Choose an enemy at a revealed location up to 2 connections away, move one location
// at a time along the shortest path to its location and engage it. Discarded without rumors.
registerPlayerCard({
  code: THE_GRAPEVINE,
  discardWhenEmpty: true,
  abilities: (state, self, investigator) => {
    const enemies = targets(state, investigator)
    if (self.uses < 1 || self.exhausted || enemies.length === 0) return []
    return [
      {
        key: `${self.id}:parley`,
        label: 'ability.grapevine',
        actions: 1,
        provokes: false,
        parley: true,
        costs: [
          { type: 'SpendUses', asset: self.id, amount: 1 },
          { type: 'ExhaustAsset', asset: self.id },
        ],
        then: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.grapevine',
              choices: enemies.map((e): Choice => ({
                label: 'choice.enemy',
                params: { enemy: e.name },
                target: { type: 'enemy', id: e.id },
                then: [approach(investigator, e.id)],
              })),
            },
          },
        ],
      },
    ]
  },
  effect: (state, investigator, step, data) => {
    if (step !== 'approach') return []
    const enemy = state.enemies[String(data.enemy)]
    const here = getInvestigator(state, investigator).location
    // Stops if the enemy left play or the last move could not be made.
    if (!enemy || here === null || data.from === here) return []
    if (enemy.location === here)
      return enemy.engagedWith === investigator
        ? []
        : [{ type: 'EngageEnemy', enemy: enemy.id, investigator }]
    // Shortest path in the direction of movement (connections may be one-way).
    const distance = distancesFrom(state, here).get(enemy.location)
    if (distance === undefined) return []
    const steps = state.locations[here]!.connections.filter(
      (l) => !!state.locations[l] && distancesFrom(state, l).get(enemy.location) === distance - 1,
    )
    const move = (to: string): Message[] => [
      { type: 'MoveTo', investigator, location: to },
      approach(investigator, enemy.id, here),
    ]
    if (steps.length === 1) return move(steps[0]!)
    return [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.grapevineStep',
          choices: steps.map((l): Choice => ({
            label: 'choice.location',
            params: { location: state.locations[l]!.name },
            target: { type: 'location', id: l },
            then: move(l),
          })),
        },
      },
    ]
  },
})
