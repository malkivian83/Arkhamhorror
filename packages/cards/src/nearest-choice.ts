import {
  distancesFrom,
  getInvestigator,
  leadInvestigator,
  type Choice,
  type Enemy,
  type GameState,
  type Message,
} from '@lcg/engine'
/** RR: Nearest / Farthest and Lead Investigator. Resolve ties explicitly. */
function chooseNearest(
  state: GameState,
  investigator: string,
  choices: Choice[],
  chooser?: string,
): Message[] {
  if (!choices.length) return []
  if (choices.length === 1) return choices[0]!.then
  return [
    {
      type: 'Ask',
      investigator: chooser ?? leadInvestigator(state)?.id ?? investigator,
      question: { kind: 'chooseOne', prompt: 'prompt.chooseEnemy', choices },
    },
  ]
}
export function nearestEnemyChoice(
  state: GameState,
  investigator: string,
  enemies: Enemy[],
  then: (enemy: Enemy) => Message[],
  options: { from?: string; chooser?: string } = {},
): Message[] {
  const here = options.from ?? getInvestigator(state, investigator).location
  if (here === null) return []
  const distances = distancesFrom(state, here, true)
  const reachable = enemies.filter((e) => distances.has(e.location))
  const best = Math.min(...reachable.map((e) => distances.get(e.location)!))
  return chooseNearest(
    state,
    investigator,
    reachable
      .filter((e) => distances.get(e.location) === best)
      .map((e) => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: then(e),
      })),
    options.chooser,
  )
}
export function nearestLocationChoice(
  state: GameState,
  investigator: string,
  locations: string[],
  then: (location: string) => Message[],
  chooser?: string,
): Message[] {
  const choices: Choice[] = locations.map((location) => ({
    label: 'choice.location',
    params: { location: state.locations[location]!.name },
    target: { type: 'location', id: location },
    then: then(location),
  }))
  if (!choices.length) return []
  if (choices.length === 1) return choices[0]!.then
  return [
    {
      type: 'Ask',
      investigator: chooser ?? leadInvestigator(state)?.id ?? investigator,
      question: { kind: 'chooseOne', prompt: 'prompt.chooseLocation', choices },
    },
  ]
}
