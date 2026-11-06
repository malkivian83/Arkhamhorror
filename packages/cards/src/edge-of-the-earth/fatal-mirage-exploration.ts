import {
  getInvestigator,
  investigatorsAt,
  push,
  spendableClues,
  type GameState,
  type Message,
  type ScenarioBehavior,
} from '@lcg/engine'
import { iceTreacheryBlank } from './companion-ellsworth'
import { mirageConclusion } from './fatal-mirage-decks'
import { EOTE_FATAL_MIRAGE } from './ice-and-death-cards'
import {
  accountedFor,
  clearedOfMirages,
  mirageClueCost,
  mirageClueValue,
  mirageDestinations,
} from './fatal-mirage-map'
import { evanescentMist } from './fatal-mirage-mist'
import { isMirageMemory, revealMirageMemory, resolveMirageMemory } from './fatal-mirage-memories'
import { horrifyingShade } from './fatal-mirage-shade'
import { mirageTokenEffect, resolveMirageToken } from './fatal-mirage-tokens'
import { resolveMirageEncounter, tormentPreventsReady } from './mirage-shared-encounters'
import { partTwoEncounterEffect } from './part-two-encounters'

function setAsideDestinations(state: GameState, origin: string) {
  return mirageDestinations(origin, accountedFor(state)).filter(
    (id) => state.setAsideLocations[id] || isMirageMemory(id),
  )
}

function explore(investigator: string, origin: string, mists: number): Message {
  return { type: 'ScenarioSpecific', key: 'exploreMirage', data: { investigator, origin, mists } }
}

function discover(investigator: string, origin: string, location: string): Message {
  return {
    type: 'ScenarioSpecific',
    key: 'discoverMirage',
    data: { investigator, origin, location },
  }
}

/** The location branches and supported terminal stories of Mirage. */
export const fatalMirageExploration: ScenarioBehavior = {
  id: EOTE_FATAL_MIRAGE,
  tokenEffect: mirageTokenEffect,
  assetCannotReady: tormentPreventsReady,
  onAllInvestigatorsEliminated: (state) => mirageConclusion(state, false),
  enemyKeyword: (state, enemy, keyword) =>
    enemy.code === horrifyingShade.code &&
    keyword === 'aloof' &&
    enemy.location &&
    clearedOfMirages(state, enemy.location)
      ? false
      : null,
  blanksTreachery: (state, card) => iceTreacheryBlank(state, card.id),
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
        actions: 1,
        provokes: true,
        target: { type: 'location', id: origin },
        costs: [{ type: 'PayGroupClues', amount, from: payers.map(({ id }) => id) }],
        then: [
          explore(
            investigator,
            origin,
            Object.values(state.treacheries).filter(
              (card) =>
                card.code === evanescentMist.code &&
                card.placement.type === 'location' &&
                card.placement.location === origin &&
                !iceTreacheryBlank(state, card.id),
            ).length,
          ),
        ],
      },
    ]
  },
  specific: (state, key, data) => {
    if (key === 'mirageRestoreVictory')
      return {
        ...state,
        victoryDisplay: String(data.codes ?? '')
          .split(',')
          .filter(Boolean),
      }
    if (key === 'resolveMirageMemory') return resolveMirageMemory(state, String(data.code))
    if (
      key === 'mirageMadnessWithin' ||
      key === 'mirageGlimpse' ||
      key === 'mirageGlimpseRecipient'
    )
      return resolveMirageEncounter(state, key, data)
    if (key !== 'exploreMirage' && key !== 'discoverMirage') {
      const next = resolveMirageToken(state, key, data)
      return partTwoEncounterEffect(next, key, data) ?? next
    }
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
      const mists = Number(data.mists ?? 0)
      if (mists > 0) {
        const payers = investigatorsAt(state, origin).map(({ id }) => id)
        const next = explore(investigator, origin, mists - 1)
        return push(state, {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEffect',
            choices: [
              ...(payers.reduce((sum, id) => sum + spendableClues(state, id), 0) >= 2
                ? [
                    {
                      label: 'choice.edgeOfTheEarth.mistClues',
                      then: [{ type: 'PayGroupClues' as const, amount: 2, from: payers }, next],
                    },
                  ]
                : []),
              {
                label: 'choice.edgeOfTheEarth.mistDamage',
                then: [
                  ...payers.map((id): Message => ({
                    type: 'TakeDamage',
                    investigator: id,
                    damage: 2,
                    horror: 0,
                    source: evanescentMist.code,
                  })),
                  next,
                ],
              },
            ],
          },
        })
      }
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
    if (isMirageMemory(location)) return revealMirageMemory(state, origin, location)
    // The destination's printed clue value depends on what is in play at entry, not at setup.
    const card = {
      ...state.setAsideLocations[location]!,
      clueValue: mirageClueValue(location, accountedFor(state)),
    }
    const shadeLocations = new Set(
      Object.values(state.enemies).flatMap((enemy) =>
        enemy.code === horrifyingShade.code && enemy.location ? [enemy.location] : [],
      ),
    )
    return push(
      { ...state, setAsideLocations: { ...state.setAsideLocations, [location]: card } },
      { type: 'PutLocationIntoPlay', location, investigator },
      { type: 'RevealLocation', location, investigator },
      ...Array.from(shadeLocations, (location): Message => ({ type: 'CheckEngagement', location })),
    )
  },
}
