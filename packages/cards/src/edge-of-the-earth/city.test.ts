import {
  availableAbilities,
  dispatch,
  getInvestigator,
  type ChaosToken,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, startScenario, type Campaign } from '../campaign'
import { campaignDefinition } from '../campaign-definition'
import {
  cityOfTheElderThings,
  cityRules,
  cityVersion,
  cityVersionChoices,
  cityVersionKey,
} from './city'
import { TUNNEL, cityKeys, cityMaps, outermost } from './city-cards'
import { EOTE_CITY } from './ice-and-death-cards'

// The scenario is not in the campaign selector yet: connect its builder for these tests only.
const definition = campaignDefinition('edge-of-the-earth')
const index = definition.scenarios.findIndex(({ id }) => id === EOTE_CITY)
definition.scenarios[index] = { ...definition.scenarios[index]!, build: cityOfTheElderThings }

function campaignAt(setup: Message[] = []): Campaign {
  const campaign = newCampaign('edge-of-the-earth', ['joe'], 'standard')
  const initial = startScenario({ ...campaign, scenarioIndex: 0 }, 45)
  const game = dispatch(
    { ...initial, pending: null, queue: [] },
    { type: 'InitializeExpedition' },
    ...setup,
  )
  return { ...campaign, log: game.campaignLog!, scenarioIndex: index }
}
/** Cross off the partners of the other columns so that `version` wins the vote. */
const versionOf = (version: 1 | 2 | 3): Message[] =>
  (
    ({
      1: ['08715', '08722', '08716', '08714', '08718', '08719'],
      2: ['08720', '08721', '08717', '08714', '08718', '08719'],
      3: ['08720', '08721', '08717', '08715', '08722', '08716'],
    }) as const
  )[version].map((partner) => ({
    type: 'SetExpeditionPartnerStatus',
    partner,
    status: 'eliminated',
  }))
function start(campaign: Campaign, seed = 75): GameState {
  let game = throughSetup(startScenario(campaign, seed))
  for (let n = 0; n < 6 && game.pending; n++) {
    const prompt = game.pending.question.prompt
    if (prompt === 'prompt.edgeOfTheEarth.partner')
      game = throughSetup(choose(game, 'choice.edgeOfTheEarth.noPartner'))
    else if (prompt === 'prompt.edgeOfTheEarth.cityStart')
      game = throughSetup(
        choose(
          game,
          game.pending.question.choices[0]!.label,
          game.pending.question.choices[0]!.params,
        ),
      )
    else break
  }
  return game
}
const ready = (game: GameState): GameState => ({ ...game, pending: null, queue: [] })
const me = (game: GameState) => game.investigators[0]!.id
const sorted = (keys: ChaosToken[]) => keys.map(String).sort()

describe('City of the Elder Things', () => {
  it('follows the column with more living members, and the lead breaks ties', () => {
    const all = campaignAt()
    expect(cityVersionChoices(all.log)).toEqual([1, 2, 3])
    expect(cityVersion(all.log)).toBe(1)
    expect(cityVersion({ ...all.log, values: { ...all.log.values, [cityVersionKey]: '3' } })).toBe(
      3,
    )
    expect(cityVersionChoices(campaignAt(versionOf(2)).log)).toEqual([2])
  })

  it.each([1, 2, 3] as const)(
    'version %i: 16 City Landscapes with one random key each',
    (version) => {
      const game = start(campaignAt(versionOf(version)))
      const landscapes = Object.values(game.locations).filter(({ id }) => id !== TUNNEL)
      expect(landscapes).toHaveLength(16)
      expect(landscapes.every(({ keys }) => keys?.length === 1)).toBe(true)
      expect(sorted(landscapes.flatMap(({ keys }) => keys ?? []))).toEqual(sorted(cityKeys))
      expect(game.locations[TUNNEL]).toMatchObject({
        revealed: false,
        position: cityMaps[version].tunnel,
      })
      const at = game.locations[getInvestigator(game, me(game)).location!]!.position!
      if (version === 1) expect(outermost).toContainEqual(at)
      else expect(at).toEqual(version === 2 ? [8, 4] : [0, 0])
      expect(game.acts.map(({ code }) => code)).toEqual(
        { 1: ['08624', '08627'], 2: ['08625', '08628'], 3: ['08626', '08629'] }[version],
      )
    },
  )

  it('connects only the locations that share a side', () => {
    const game = start(campaignAt(versionOf(1)))
    for (const location of Object.values(game.locations)) {
      const [column, row] = location.position!
      for (const other of location.connections) {
        const [c, r] = game.locations[other]!.position!
        expect(Math.abs(c - column) + Math.abs(r - row)).toBe(1)
        expect(game.locations[other]!.connections).toContain(location.id)
      }
    }
    expect(game.locations[TUNNEL]!.connections).toHaveLength(4)
  })

  it('keeps the Hidden Tunnel closed until the first act advances', () => {
    let game = ready(start(campaignAt(versionOf(1))))
    const neighbour = game.locations[TUNNEL]!.connections[0]!
    game = {
      ...game,
      investigators: game.investigators.map((player) => ({ ...player, location: neighbour })),
    }
    game = dispatch(game, { type: 'MoveTo', investigator: me(game), location: TUNNEL })
    expect(getInvestigator(game, me(game)).location).toBe(neighbour)
  })

  it('values the skull by the keys you control', () => {
    const game = ready(start(campaignAt(versionOf(1))))
    const withKeys = {
      ...game,
      investigators: game.investigators.map((player) => ({
        ...player,
        keys: [0, -1, 'tablet'] as ChaosToken[],
      })),
    }
    expect(cityRules.tokenEffect!(withKeys, 'skull', me(game)).modifier).toBe(-3)
    expect(
      cityRules.tokenEffect!({ ...withKeys, difficulty: 'hard' }, 'skull', me(game)).modifier,
    ).toBe(-5)
  })

  it('remembers facts by spending two matching keys and opens the tunnel (v. I)', () => {
    let game = ready(start(campaignAt(versionOf(1))))
    game = {
      ...game,
      investigators: game.investigators.map((player) => ({
        ...player,
        keys: ['elderThing', 'elderThing', 'tablet', 'tablet'] as ChaosToken[],
      })),
    }
    const spend = (key: string) => {
      const ability = availableAbilities(game, me(game)).find((option) => option.key === key)!
      game = dispatch(game, ...(ability.costs ?? []), ...ability.then)
    }
    spend('city:cityHistory')
    expect(game.scenarioMeta?.['city:history']).toBe(1)
    spend('city:cityShoggoths')
    expect(game.keysSpent).toHaveLength(4)
    game = dispatch(game, { type: 'CheckActObjective' })
    while (game.pending?.question.prompt === 'prompt.story') game = choose(game, 'choice.continue')
    expect(game.actIndex).toBe(1)
    expect(game.locations[TUNNEL]?.revealed).toBe(true)
    expect(Object.values(game.enemies)).toMatchObject([
      { code: '08641', location: TUNNEL, exhausted: true },
    ])
    expect(game.encounterDeck.filter(({ code }) => code === '08710')).toHaveLength(2)
  })
})
