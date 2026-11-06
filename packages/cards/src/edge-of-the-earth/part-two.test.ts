import {
  applyInput,
  availableAbilities,
  dispatch,
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
import { resolveDisappearance } from './checkpoint'
import { ICE_PART_TWO } from './ice-and-death-cards'
import { leftBehind, possessed, searchStories } from './part-two-cards'
import { madnessDifficulty } from './part-two-encounters'

function campaign() {
  const first = newCampaign('edge-of-the-earth', ['joe'], 'standard')
  const state = startScenario(first, 30)
  const ended = dispatch(
    { ...state, pending: null, queue: [] },
    { type: 'InitializeExpedition' },
    { type: 'SetExpeditionPartnerStatus', partner: '08716', status: 'eliminated' },
    { type: 'RecordExpeditionCamp', location: '08504', shelter: 1 },
    { type: 'RecordNote', note: 'edgeOfTheEarthRevealedLocations', value: '08502,08503,08504' },
    { type: 'EndScenario', told: true, outcome: { type: 'resolution', resolution: 1 } },
  )
  return resolveDisappearance(finishScenario(first, ended), 'search')
}

function prepared() {
  const saved = campaign()
  let state = throughSetup(startScenario(saved, 18))
  while (state.pending?.question.prompt === 'prompt.edgeOfTheEarth.partner') {
    state = throughSetup(choose(state, 'choice.card'))
  }
  return { saved, state, investigator: saved.investigators[0]!.id }
}

const clear = (state: GameState): GameState => ({ ...state, pending: null, queue: [] })

describe('Ice and Death, part II', () => {
  it('resumes the search with the saved camp, map, bag and hidden cards', () => {
    const { saved, state, investigator } = prepared()
    expect(canPlayNext(saved)).toBe(true)
    expect(state.scenarioId).toBe(ICE_PART_TWO)
    expect(getInvestigator(state, investigator)).toMatchObject({ location: '08504', resources: 1 })
    expect(
      Object.values(state.locations)
        .filter((site) => site.revealed)
        .map(({ id }) => id)
        .sort(),
    ).toEqual(['08502', '08503', '08504'])
    expect(Object.keys(state.locations)).toHaveLength(13)
    expect(state.chaosBag.filter((token) => token === 'frost')).toHaveLength(2)
    expect(state.tekeliliDeck).toHaveLength(16)
    const beneath = Object.values(state.locations).flatMap(({ beneath }) => beneath ?? [])
    expect(beneath).toHaveLength(9)
    expect(beneath.filter(({ kind }) => kind === 'enemy')).toHaveLength(7)
    expect(state.encounterDeck.filter(({ code }) => code === '08702')).toHaveLength(2)
  })

  it('spends clues at the searched location and resolves the story beneath it', () => {
    const { state, investigator } = prepared()
    const location = Object.values(state.locations).find(
      ({ beneath }) => beneath?.[0]?.kind === 'treachery',
    )!
    const card = location.beneath![0]!
    const placed = dispatch(clear(state), {
      type: 'MoveTo',
      investigator,
      location: location.id,
      unpreventable: true,
    })
    const game = {
      ...placed,
      investigators: placed.investigators.map((player) => ({ ...player, clues: 1 })),
    }
    const ability = availableAbilities(game, investigator).find(
      ({ key }) => key === '08526:search',
    )!
    expect(ability.actions).toBe(0)
    const result = throughSetup(dispatch(game, ...ability.costs!, ...ability.then))
    expect(result.locations[location.id]?.beneath).toEqual([])
    expect(result.victoryDisplay).toContain(card.code)
    expect(getInvestigator(result, investigator).clues).toBe(0)
  })

  it('saves rescued companions and records the others as eliminated on return to camp', () => {
    const { saved, state, investigator } = prepared()
    const location = Object.values(state.locations).find(
      ({ beneath }) => beneath?.[0]?.kind === 'enemy',
    )!
    const card = location.beneath![0]!
    const spawned = dispatch(clear(state), {
      type: 'DrawBeneath',
      investigator,
      location: location.id,
    })
    const enemy = Object.values(spawned.enemies).find((enemy) => enemy.code === card.code)!
    const rescued = dispatch(spawned, {
      type: 'ScenarioSpecific',
      key: 'rescueProgress',
      data: { enemy: enemy.id, amount: 20 },
    })
    const finished = throughSetup(dispatch(rescued, { type: 'Resign', investigator }))
    expect(finished.outcome).toEqual({ type: 'resolution', resolution: 1 })
    const next = finishScenario(saved, finished)
    expect(currentScenario(next)).toBe('ice-and-death-checkpoint-2')
    expect(next.results.at(-1)?.xp[investigator]).toBe(1)
    expect(
      Object.values(next.log.expedition!.partners).filter(
        (p) => p.status === 'safe' || p.status === 'resolute',
      ),
    ).toHaveLength(2)
    expect(
      Object.values(next.log.expedition!.partners).filter((p) => p.status === 'missing'),
    ).toHaveLength(0)
  })

  it('the final agenda defeats the remaining expedition and applies mental trauma', () => {
    const { state, investigator } = prepared()
    const finished = throughSetup(
      dispatch({ ...clear(state), agendaIndex: 2 }, { type: 'AdvanceAgenda' }),
    )
    expect(finished.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(finished.campaignLog?.investigators[investigator]?.mentalTrauma).toBe(1)
  })

  // Reverso de Locura y muerte: «(→R1)», sin pasar por «Sin resolución».
  it.each([
    ['the final agenda', true],
    ['a defeat by damage', false],
  ] as const)('reads No resolution only after %s is not the cause', (_case, madness) => {
    const { state, investigator } = prepared()
    let game = dispatch(
      { ...clear(state), interactive: true, agendaIndex: madness ? 2 : 0 },
      madness ? { type: 'AdvanceAgenda' } : { type: 'DefeatInvestigator', investigator },
    )
    const stories: string[] = []
    while (game.pending?.question.prompt === 'prompt.story') {
      stories.push(JSON.stringify(game.pending.question.story))
      game = applyInput(game, { investigator: game.pending.investigator, choice: 0 })
    }
    expect(stories.some((entry) => entry.includes('partTwoNoResolution'))).toBe(!madness)
    expect(stories.some((entry) => entry.includes('partTwoResolution'))).toBe(true)
  })
})

it.each([
  ['08537', 'agility', 2],
  ['08538', 'willpower', 2],
  ['08539', 'willpower', 1],
  ['08540', 'combat', 2],
  ['08541', 'intellect', 2],
  ['08542', 'combat', 1],
] as const)('rescues %s through its printed parley test', (code, skill, required) => {
  const { state, investigator } = prepared()
  const card = possessed.find((enemy) => enemy.code === code)!
  const spawned = dispatch(
    { ...clear(state), interactive: false, chaosBag: [0] },
    {
      type: 'SpawnEnemy',
      card,
      location: '08504',
      engageWith: investigator,
    },
  )
  const game = {
    ...spawned,
    investigators: spawned.investigators.map((player) => ({
      ...player,
      skills: { ...player.skills, [skill]: 8 },
    })),
  }
  const ability = availableAbilities(game, investigator).find(({ key }) => key.endsWith(':rescue'))!
  expect(ability).toMatchObject({ parley: true, params: { required } })
  let resolved = dispatch(game, ...ability.then)
  if (resolved.pending?.question.prompt === 'prompt.chooseSkill') {
    resolved = choose(resolved, `choice.test.${skill}`)
  }
  if (resolved.pending?.question.prompt === 'prompt.commitCards')
    resolved = choose(resolved, 'choice.revealToken')
  expect(resolved.victoryDisplay).toContain(code)
})

it('finds a possessed enemy for Abandoned to Madness and raises its difficulty', () => {
  const { state, investigator } = prepared()
  const treachery = leftBehind.find(({ code }) => code === '08702')!
  const draw = dispatch(clear(state), {
    type: 'ResolveEncounterCard',
    investigator,
    card: treachery,
  })
  const chooseCard = choose(draw, 'choice.card', { card: 'Frenzied Explorer' })
  const enemy = Object.values(chooseCard.enemies).find(({ code }) => code === '08701')!
  expect(enemy.doom).toBe(1)
  expect(madnessDifficulty(chooseCard, enemy.id)).toBe(1)
  const defeated = dispatch(chooseCard, { type: 'DefeatEnemy', enemy: enemy.id, by: investigator })
  expect(defeated.locations[enemy.location]?.doom).toBe(1)
  expect(Object.values(defeated.treacheries).some(({ code }) => code === '08702')).toBe(false)
})

it.each(['08527', '08530'])('returns a frost token to the reserve through %s', (code) => {
  const { state, investigator } = prepared()
  const card = searchStories.find((card) => card.code === code)!
  const resolved = throughSetup(
    dispatch(clear(state), { type: 'ResolveEncounterCard', investigator, card }),
  )
  expect(resolved.chaosBag.filter((token) => token === 'frost')).toHaveLength(1)
  expect(
    resolved.victoryDisplay,
    JSON.stringify({
      pending: resolved.pending?.question.prompt,
      test: resolved.skillTest,
      log: resolved.log.slice(-8),
      enemies: Object.values(resolved.enemies).map((enemy) => enemy.leads),
    }),
  ).toContain(code)
})

it.each([
  ['08535', 2, 3],
  ['08536', 2, 3],
  ['08543', 3, 5],
] as const)('resolves the printed parley payment for %s', (code, payment, threshold) => {
  const { state, investigator } = prepared()
  const card = possessed.find((enemy) => enemy.code === code)!
  const spawned = dispatch(
    {
      ...clear(state),
      interactive: false,
      tekeliliDeck: ['08726', '08726'],
      investigators: state.investigators.map((player) => ({
        ...player,
        hand: ['01020', '01020'],
        resources: 5,
      })),
    },
    { type: 'SpawnEnemy', card, location: '08504', engageWith: investigator },
  )
  const enemy = Object.values(spawned.enemies)[0]!
  const game = {
    ...spawned,
    enemies: { ...spawned.enemies, [enemy.id]: { ...enemy, leads: threshold - payment } },
  }
  const ability = availableAbilities(game, investigator).find(({ key }) => key.endsWith(':rescue'))!
  const result = choose(dispatch(game, ...ability.then), 'choice.edgeOfTheEarth.rescueAmount', {
    amount: payment,
  })
  expect(result.victoryDisplay).toContain(code)
  if (code === '08535') expect(getInvestigator(result, investigator).hand).toHaveLength(0)
  if (code === '08543') expect(getInvestigator(result, investigator).resources).toBe(2)
})

it('lets the investigator choose which Tekeli-li weakness to return when searching the whole deck', () => {
  const { state, investigator } = prepared()
  const story = searchStories.find(({ code }) => code === '08528')!
  const deck = ['08724', '01020', '08726']
  const game = {
    ...clear(state),
    investigators: state.investigators.map((player) => ({ ...player, deck })),
  }
  const pending = throughSetup(
    dispatch(game, { type: 'ResolveEncounterCard', investigator, card: story }),
  )
  expect(pending.pending?.question.prompt).toBe('prompt.edgeOfTheEarth.cleanseTekelili')
  const result = choose(pending, 'choice.card', { card: '08726' })
  expect(getInvestigator(result, investigator).deck).toContain('08724')
  expect(getInvestigator(result, investigator).deck).not.toContain('08726')
  expect(result.tekeliliDeck?.at(-1)).toBe('08726')
  expect(result.victoryDisplay).toContain(story.code)
})
