import {
  availableAbilities,
  dispatch,
  distancesFrom,
  getInvestigator,
  type GameState,
} from '@lcg/engine'
import { choose, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import {
  canPlayNext,
  currentScenario,
  finishScenario,
  newCampaign,
  startScenario,
} from '../campaign'
import { expeditionAttack, resolveExpeditionAttack } from './checkpoint'

function checkpoint(players = 1) {
  const campaign = newCampaign(
    'edge-of-the-earth',
    ['joe', 'daniela', 'trish', 'dexter'].slice(0, players) as (
      'joe' | 'daniela' | 'trish' | 'dexter'
    )[],
    'standard',
  )
  campaign.scenarioIndex = 3
  const initial = startScenario({ ...campaign, scenarioIndex: 0 }, 45)
  const game = dispatch(
    { ...initial, pending: null, queue: [] },
    { type: 'InitializeExpedition' },
    { type: 'RecordExpeditionCamp', location: '08503', shelter: 2 },
    { type: 'RecordNote', note: 'edgeOfTheEarthRevealedLocations', value: '08502,08503,08504' },
  )
  campaign.log = game.campaignLog!
  return campaign
}

function started(players = 1) {
  const campaign = resolveExpeditionAttack(checkpoint(players), 'fight')
  let game = throughSetup(startScenario(campaign, 75))
  while (game.pending?.question.prompt === 'prompt.edgeOfTheEarth.partner')
    game = throughSetup(choose(game, 'choice.edgeOfTheEarth.noPartner'))
  return {
    campaign,
    game: { ...game, pending: null, queue: [] },
    investigator: game.investigators[0]!.id,
  }
}
const nightmares = (game: GameState) =>
  Object.values(game.enemies).filter(({ code }) => code === '08547')
const note = 'edgeOfTheEarthFledToMountains'

describe('The Attack and Ice and Death, part III', () => {
  it('persists flight to the interlude and marks the optional scenario skipped once', () => {
    const campaign = checkpoint()
    expect(expeditionAttack(campaign)?.choices).toEqual(['fight', 'flee'])
    const fled = resolveExpeditionAttack(campaign, 'flee')
    expect(currentScenario(fled)).toBe('edge-of-the-earth-restful-night')
    expect(fled.log.notes).toContain(note)
    expect(fled.results.at(-1)).toMatchObject({ scenario: 'ice-and-death-part-3', skipped: true })
    expect(() => resolveExpeditionAttack(fled, 'flee')).toThrow()
  })

  it.each([
    [1, [8]],
    [2, [4, 4]],
    [3, [3, 3, 2]],
    [4, [2, 2, 2, 2]],
  ] as const)(
    'spawns %i nightmares and distributes all eight Eidolons evenly',
    (players, sizes) => {
      const { campaign, game, investigator } = started(players)
      expect(canPlayNext(campaign)).toBe(true)
      expect(getInvestigator(game, investigator)).toMatchObject({ location: '08503', resources: 2 })
      expect(game.locations['08503']).toMatchObject({ clues: 0, revealed: true })
      expect(game.locations['08504']?.revealed).toBe(true)
      expect(nightmares(game).map(({ location }) => location)).toEqual(
        ['08507', '08506', '08508', '08510'].slice(0, players),
      )
      expect(nightmares(game).map(({ id }) => game.scenarioDecks?.[id]?.length)).toEqual(sizes)
    },
  )

  it('removes two doom and spawns an Eidolon instead of advancing the first agenda', () => {
    const { game } = started()
    const portal = nightmares(game)[0]!
    const advanced = dispatch({ ...game, doom: 2 }, { type: 'CheckAgenda' })
    expect(advanced.doom).toBe(0)
    expect(advanced.agendaIndex).toBe(0)
    expect(advanced.scenarioDecks?.[portal.id]).toHaveLength(7)
    expect(
      Object.values(advanced.enemies).filter(
        ({ id, location }) => id !== portal.id && location === portal.location,
      ),
    ).toHaveLength(1)
  })

  it('removes cards beneath a defeated nightmare and awards the victory bonus', () => {
    const { campaign, game, investigator } = started()
    const portal = nightmares(game)[0]!
    const finished = throughSetup(
      dispatch(game, { type: 'DefeatEnemy', enemy: portal.id, by: investigator }),
    )
    expect(finished.scenarioDecks?.[portal.id]).toBeUndefined()
    expect(finished.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(finishScenario(campaign, finished).results.at(-1)?.xp[investigator]).toBe(5)
  })

  it('requires four clues at camp to resign and records flight without a bonus if none was defeated', () => {
    const { game, investigator } = started()
    expect(availableAbilities(game, investigator).some(({ key }) => key === '08546:resign')).toBe(
      false,
    )
    const funded = {
      ...game,
      investigators: game.investigators.map((player) => ({ ...player, clues: 4 })),
    }
    const resign = availableAbilities(funded, investigator).find(
      ({ key }) => key === '08546:resign',
    )!
    const finished = throughSetup(dispatch(funded, ...resign.costs!, ...resign.then))
    expect(finished.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(finished.campaignLog?.notes).toContain(note)
    expect(finished.campaignLog?.investigators[investigator]?.xp).toBe(0)
  })

  it('suffers physical trauma from the final agenda and records the escape', () => {
    const { game, investigator } = started()
    const finished = throughSetup(dispatch({ ...game, agendaIndex: 1 }, { type: 'AdvanceAgenda' }))
    expect(finished.outcome).toEqual({ type: 'noResolution' })
    expect(finished.campaignLog?.investigators[investigator]?.physicalTrauma).toBe(1)
    expect(finished.campaignLog?.notes).toContain('edgeOfTheEarthBarelyEscaped')
  })
})

it('awards the two-point insight bonus for fleeing after defeating one nightmare', () => {
  const { game, investigator } = started(2)
  const portal = nightmares(game)[0]!
  const defeated = dispatch(game, { type: 'DefeatEnemy', enemy: portal.id, by: investigator })
  expect(defeated.victoryDisplay).toContain('08547')
  const finished = throughSetup(
    dispatch(
      defeated,
      ...defeated.investigators.map(({ id }) => ({ type: 'Resign' as const, investigator: id })),
    ),
  )
  expect(finished.outcome).toEqual({ type: 'resolution', resolution: 2 })
  expect(finished.campaignLog?.investigators[investigator]?.xp).toBe(2)
})

it('Phantasmagoria moves and attacks with an empty nightmare without exhausting it', () => {
  const { game, investigator } = started()
  const portal = nightmares(game)[0]!
  const draw = game.encounterDeck.find((card) => card.code === '08548')!
  const released = dispatch(
    { ...game, scenarioDecks: { ...game.scenarioDecks, [portal.id]: [] } },
    { type: 'ResolveEncounterCard', investigator, card: draw },
  )
  expect(released.enemies[portal.id]).toMatchObject({ location: '08503', exhausted: false })
  expect(getInvestigator(released, investigator)).toMatchObject({ damage: 2, horror: 2 })
})

// Carta 08548: la Pesadilla más cercana a un investigador cualquiera, no solo a quien la roba.
it('Phantasmagoria picks the nightmare nearest to any investigator', () => {
  const { game } = started(2)
  const [first, second] = nightmares(game)
  const [drawer, other] = game.investigators
  // Quien roba queda más cerca de la primera; el otro investigador, junto a la segunda.
  const toFirst = distancesFrom(game, first!.location)
  const toSecond = distancesFrom(game, second!.location)
  const far = Object.keys(game.locations).find(
    (id) => (toFirst.get(id) ?? Infinity) > 0 && (toFirst.get(id) ?? 0) < (toSecond.get(id) ?? 0),
  )!
  expect(far).toBeDefined()
  const placed = {
    ...game,
    investigators: game.investigators.map((player) =>
      player.id === drawer!.id
        ? { ...player, location: far }
        : player.id === other!.id
          ? { ...player, location: second!.location }
          : player,
    ),
  }
  const draw = game.encounterDeck.find((card) => card.code === '08548')!
  const asked = dispatch(placed, {
    type: 'ResolveEncounterCard',
    investigator: drawer!.id,
    card: draw,
  })
  // Se libera una carta de la segunda (a distancia 0 de un investigador), no de la primera.
  const pile = (state: GameState, id: string) => state.scenarioDecks?.[id]?.length ?? 0
  expect(pile(game, second!.id)).toBeGreaterThan(0)
  expect(pile(asked, first!.id)).toBe(pile(game, first!.id))
  expect(pile(asked, second!.id)).toBe(pile(game, second!.id) - 1)
})
