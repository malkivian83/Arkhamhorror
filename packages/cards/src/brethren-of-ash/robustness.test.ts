import { applyInput, createGame, emptyCampaignLog, type ScenarioDefinition } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { queenOfAsh } from './queen-of-ash'
import { smokeAndMirrors } from './smoke-and-mirrors'
import { spreadingFlames } from './spreading-flames'

const TEAM = ['12001', '12004', '12007'] as const
const KEYS = ['daniela', 'joe', 'trish'] as const

/** Juega eligiendo opciones al azar (con semilla) hasta el final o 600 decisiones. */
function playRandomly(scenario: ScenarioDefinition, seed: number) {
  const log = { ...emptyCampaignLog([...TEAM]), notes: ['stirredUpTrouble', 'savedUniversity'] }
  let game = createGame({
    seed,
    difficulty: 'hard',
    scenario,
    investigators: KEYS.map((k) => starterInvestigator(k)),
    campaignLog: log,
  })
  let r = seed
  const random = (n: number) => {
    r = (r * 1103515245 + 12345) % 2 ** 31
    return r % n
  }
  for (let n = 0; n < 600 && !game.outcome && game.pending; n++) {
    const choice = random(game.pending.question.choices.length)
    game = applyInput(game, { investigator: game.pending.investigator, choice })
  }
  return game
}

describe('Brethren of Ash: partidas al azar', () => {
  const log = { ...emptyCampaignLog([...TEAM]), notes: ['stirredUpTrouble', 'savedUniversity'] }
  const scenarios: [string, (seed: number) => ScenarioDefinition][] = [
    ['Spreading Flames', () => spreadingFlames('hard')],
    ['Smoke and Mirrors', (seed) => smokeAndMirrors({ difficulty: 'hard', log, seed, players: 3 })],
    [
      'Queen of Ash',
      (seed) => queenOfAsh({ difficulty: 'hard', log, seed, investigators: [...TEAM] }),
    ],
  ]
  for (const [name, build] of scenarios) {
    it(`${name}: 15 partidas con decisiones al azar no rompen el motor`, () => {
      for (let seed = 1; seed <= 15; seed++) {
        const game = playRandomly(build(seed), seed)
        expect(game.outcome !== null || game.pending !== null).toBe(true)
      }
    })
  }
})

describe('Brethren of Ash: datos de los escenarios', () => {
  const log = emptyCampaignLog([...TEAM])
  const all: [string, ScenarioDefinition][] = [
    ['Spreading Flames', spreadingFlames('standard')],
    ['Smoke and Mirrors', smokeAndMirrors({ log, seed: 1, players: 3 })],
    ['Queen of Ash', queenOfAsh({ log, seed: 1, investigators: [...TEAM] })],
  ]
  for (const [name, scenario] of all) {
    it(`${name}: cada localización tiene su posición en la mesa`, () => {
      const missing = [...scenario.locations, ...(scenario.setAsideLocations ?? [])]
        .filter((l) => !l.position)
        .map((l) => l.name)
      expect(missing).toEqual([])
    })
  }
})
