import {
  distancesFrom,
  canEnter,
  canAffordEntry,
  getInvestigator,
  push,
  type GameState,
  type Message,
  type ScenarioBehavior,
} from '@lcg/engine'
import { L } from './locations'
import { specific } from './helpers'

const moveKey = 'plaguebearer.moveTowardOmega'
const moveMessage = (investigator: string): Message => ({
  type: 'ScenarioSpecific',
  key: moveKey,
  data: { investigator },
})

/** Referencia Trasnochadores, colección 1a/1b. */
export const lateRisersTokenEffect: NonNullable<ScenarioBehavior['tokenEffect']> = (
  s,
  token,
  investigator,
) => {
  const hard = s.difficulty === 'hard' || s.difficulty === 'expert'
  if (token === 'cultist')
    return {
      modifier: hard ? -6 : -3,
      onSuccess: [specific('plaguebearer.chooseBarricade', { investigator })],
    }
  if (token === 'skull') {
    const here = getInvestigator(s, investigator).location
    const distance = here ? distancesFrom(s, here).get(L.omega) : undefined
    if (distance === undefined) throw new Error('Late Risers: Lab Omega must be reachable')
    return { modifier: -(distance * (hard ? 2 : 1)) }
  }
  if (token === 'tablet')
    return {
      modifier: hard ? -3 : -2,
      ...(hard ? { after: [moveMessage(investigator)] } : { onFail: [moveMessage(investigator)] }),
    }
  throw new Error(`Late Risers: token ${token} is not implemented`)
}

/** Recalcula los caminos al resolver el efecto: la prueba puede cambiar el mapa. */
export const lateRisersSpecific: NonNullable<ScenarioBehavior['specific']> = (s, key, data) => {
  if (key !== moveKey) return s
  const investigator = String(data.investigator)
  const from = getInvestigator(s, investigator).location
  if (!from || from === L.omega) return s
  const distance = distancesFrom(s, from).get(L.omega)
  if (distance === undefined) return s
  const destinations = (s.locations[from]?.connections ?? []).filter(
    (to) =>
      s.locations[to] &&
      canEnter(s, investigator, to) &&
      canAffordEntry(s, to) &&
      distancesFrom(s, to).get(L.omega) === distance - 1,
  )
  if (!destinations.length) return s
  const move = (location: string): Message => ({ type: 'MoveTo', investigator, location })
  if (destinations.length === 1) return push(s, move(destinations[0]!))
  return choosePath(s, investigator, destinations, move)
}

function choosePath(
  s: GameState,
  investigator: string,
  destinations: string[],
  move: (id: string) => Message,
): GameState {
  return push(s, {
    type: 'Ask',
    investigator,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.chooseLocation',
      choices: destinations.map((id) => ({
        label: 'choice.location',
        params: { location: s.locations[id]!.name },
        target: { type: 'location', id },
        then: [move(id)],
      })),
    },
  })
}
