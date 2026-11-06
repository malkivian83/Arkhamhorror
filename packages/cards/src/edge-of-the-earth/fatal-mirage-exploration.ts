import {
  getInvestigator,
  investigatorsAt,
  push,
  spendableClues,
  type GameState,
  type Message,
  type ScenarioBehavior,
} from '@lcg/engine'
import { EOTE_FATAL_MIRAGE } from './ice-and-death-cards'
import {
  mirageClueCost,
  mirageClueValue,
  mirageDestinations,
  readMirageMemories,
} from './fatal-mirage-map'

function accountedFor(state: GameState): Set<string> {
  const banished = state.campaignLog ? readMirageMemories(state.campaignLog).banished : []
  return new Set([
    ...Object.keys(state.locations),
    ...Object.values(state.enemies).map(({ code }) => code),
    ...Array.from(banished, (code) => code.replace(/b$/, '')),
    ...state.victoryDisplay.map((code) => code.replace(/b$/, '')),
  ])
}

function setAsideDestinations(state: GameState, origin: string) {
  return mirageDestinations(origin, accountedFor(state)).filter((id) => state.setAsideLocations[id])
}

function explore(investigator: string, origin: string): Message {
  return { type: 'ScenarioSpecific', key: 'exploreMirage', data: { investigator, origin } }
}

function discover(investigator: string, origin: string, location: string): Message {
  return {
    type: 'ScenarioSpecific',
    key: 'discoverMirage',
    data: { investigator, origin, location },
  }
}

/** The location branches of Mirage. Terminal stories require the memory-enemy rules. */
export const fatalMirageExploration: ScenarioBehavior = {
  id: EOTE_FATAL_MIRAGE,
  abilities: (state, _, investigator) => {
    const origin = getInvestigator(state, investigator).location
    if (
      !origin ||
      !state.locations[origin]?.revealed ||
      !setAsideDestinations(state, origin).length
    )
      return []
    const amount = mirageClueCost(origin, state.startingInvestigatorCount, accountedFor(state))
    const payers = investigatorsAt(state, origin)
    if (
      amount === undefined ||
      payers.reduce((sum, { id }) => sum + spendableClues(state, id), 0) < amount
    )
      return []
    return [
      {
        key: origin + ':mirage',
        label: 'ability.edgeOfTheEarth.exploreMirage',
        actions: 0,
        provokes: false,
        target: { type: 'location', id: origin },
        costs: [{ type: 'PayGroupClues', amount, from: payers.map(({ id }) => id) }],
        then: [explore(investigator, origin)],
      },
    ]
  },
  specific: (state, key, data) => {
    if (key !== 'exploreMirage' && key !== 'discoverMirage') return state
    const investigator = String(data.investigator)
    const origin = String(data.origin)
    if (
      !state.locations[origin]?.revealed ||
      getInvestigator(state, investigator).location !== origin
    )
      return state
    const destinations = setAsideDestinations(state, origin)
    if (key === 'exploreMirage') {
      if (!destinations.length) return state
      if (destinations.length === 1)
        return push(state, discover(investigator, origin, destinations[0]!))
      return push(state, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseLocation',
          choices: destinations.map((location) => ({
            label: 'choice.location',
            params: { location: state.setAsideLocations[location]!.name },
            then: [discover(investigator, origin, location)],
          })),
        },
      })
    }
    const location = String(data.location)
    if (!destinations.includes(location)) return state
    // The destination's printed clue value depends on what is in play at entry, not at setup.
    const card = {
      ...state.setAsideLocations[location]!,
      clueValue: mirageClueValue(location, accountedFor(state)),
    }
    return push(
      { ...state, setAsideLocations: { ...state.setAsideLocations, [location]: card } },
      { type: 'PutLocationIntoPlay', location, investigator },
      { type: 'RevealLocation', location, investigator },
    )
  },
}
