import { applyInput, type Difficulty, type GameState, type ScenarioOutcome } from '@lcg/engine'
import { choose, during, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { canPlayNext, finishScenario, newCampaign, startScenario } from '../campaign'
import { STARTER_DECKS } from '../core-2026/player-cards'
import { COLLECTOR } from './queen-of-ash'
import { CODES as SM } from './smoke-and-mirrors'
import { DR_ARMITAGE } from './spreading-flames'

const difficulties: Difficulty[] = ['easy', 'standard', 'hard', 'expert']
const keys = Object.keys(STARTER_DECKS)
const core = keys.filter((k) => !STARTER_DECKS[k]!.investigatorCode)
// Las 30 combinaciones de la caja básica y cada otro investigador solo y con tres de ella:
// combinar todos los mazos crecería de forma combinatoria con cada investigador nuevo.
const teams = [
  ...Array.from({ length: 2 ** core.length - 1 }, (_, n) =>
    core.filter((_, i) => ((n + 1) & (1 << i)) !== 0),
  ).filter((team) => team.length <= 4),
  ...keys.filter((k) => !core.includes(k)).flatMap((k) => [[k], [k, ...core.slice(0, 3)]]),
]

function firstTurn(state: GameState): GameState {
  const started = throughSetup(state)
  return started.pending?.question.prompt === 'prompt.chooseNextInvestigator'
    ? choose(started, 'choice.investigator')
    : started
}

/** Comprueba los efectos de una resolución; no sustituye jugar hasta alcanzarla. */
function finish(state: GameState, outcome: ScenarioOutcome): GameState {
  let next = during(state, (s) => s, { type: 'EndScenario', outcome })
  for (let n = 0; !next.outcome && n < 12; n++) next = choose(next, 'choice.continue')
  expect(next.outcome).not.toBeNull()
  return next
}

describe('auditoría de cierre: preparación y reanudación del motor', () => {
  for (const difficulty of difficulties) {
    it(`${difficulty}: las 30 combinaciones de 1–4 investigadores preparan los tres escenarios`, () => {
      for (const team of teams) {
        const campaign = newCampaign('brethren-of-ash', team, difficulty, 17)
        for (const scenarioIndex of [0, 1, 2]) {
          const game = firstTurn(startScenario({ ...campaign, scenarioIndex }, 23))
          expect(game.phase).toBe('investigation')
          expect(game.investigators).toHaveLength(team.length)
          expect(game.investigators.every((i) => i.hand.length === 5)).toBe(true)
          expect(game.agendas.every((card) => card.code)).toBe(true)
          expect(game.acts.every((card) => card.code)).toBe(true)
          expect(game.pending?.question.choices.length).toBeGreaterThan(0)
          const input = { investigator: game.pending!.investigator, choice: 0 }
          // RR: preparación y decisiones. La misma pregunta guardada conserva su resultado.
          expect(applyInput(JSON.parse(JSON.stringify(game)) as GameState, input)).toEqual(
            applyInput(game, input),
          )
        }
      }
    })
  }
})

describe('auditoría de cierre: resoluciones y continuidad', () => {
  it('Smoke and Mirrors: retener al Servant añade la resolución 2 y su experiencia', () => {
    const campaign = {
      ...newCampaign('brethren-of-ash', ['daniela'], 'standard'),
      scenarioIndex: 1,
    }
    const game = firstTurn(startScenario(campaign, 7))
    const ended = finish(
      { ...game, underAct: [SM.servantOfFlame] },
      {
        type: 'resolution',
        resolution: 1,
      },
    )
    const next = finishScenario(campaign, ended)
    expect(ended.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(next.log.notes).toContain('servantEscaped')
    expect(next.log.investigators['12001']?.xp).toBe(2)
    expect(startScenario(next, 9).scenarioId).toBe('queen-of-ash')
  })

  it('Smoke and Mirrors: sin resolución conserva un heraldo y resuelve ambas ramas del sorteo', () => {
    const found = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) {
      const campaign = {
        ...newCampaign('brethren-of-ash', ['joe'], 'standard'),
        scenarioIndex: 1,
      }
      const ended = finish(firstTurn(startScenario(campaign, seed)), { type: 'noResolution' })
      const next = finishScenario(campaign, ended)
      expect(next.log.values.harbinger).not.toBe('?')
      const branches = next.log.notes.filter((note) =>
        ['discoveredWhereabouts', 'failedSearch'].includes(note),
      )
      expect(branches).toHaveLength(1)
      found.add(branches[0]!)
      expect(startScenario(next, 31).scenarioId).toBe('queen-of-ash')
    }
    expect([...found].sort()).toEqual(['discoveredWhereabouts', 'failedSearch'])
  })

  it('Queen of Ash: resolución 2 aplica victoria, Collector y trauma al cerrar la campaña', () => {
    // Guía de campaña: resolución 2, victoria +5 XP, recompensa y trauma físico/mental.
    const campaign = {
      ...newCampaign('brethren-of-ash', ['isabelle'], 'standard'),
      scenarioIndex: 2,
    }
    const next = finishScenario(
      campaign,
      finish(firstTurn(startScenario(campaign, 4)), { type: 'resolution', resolution: 2 }),
    )
    expect(next.log.notes).toEqual(expect.arrayContaining(['stoppedRebirth', 'campaignWon']))
    expect(next.log.rewards).toEqual([COLLECTOR])
    expect(next.log.investigators['12013']).toMatchObject({
      xp: 5,
      physicalTrauma: 2,
      mentalTrauma: 2,
    })
    expect(canPlayNext(next)).toBe(false)
  })

  it('Queen of Ash: resolución 3 distingue a quien se retiró de quien quedó atrapado', () => {
    // Guía de campaña: resolución 3, solo los retirados sobreviven y reciben XP/trauma.
    const campaign = {
      ...newCampaign('brethren-of-ash', ['joe', 'dexter'], 'standard'),
      scenarioIndex: 2,
    }
    const game = firstTurn(startScenario(campaign, 4))
    const ended = finish(
      {
        ...game,
        investigators: game.investigators.map((i) =>
          i.id === '12004' ? { ...i, resigned: true, eliminated: true } : i,
        ),
      },
      { type: 'resolution', resolution: 3 },
    )
    const next = finishScenario(campaign, ended)
    expect(next.log.notes).toEqual(expect.arrayContaining(['floodedRitual', 'campaignWon']))
    expect(next.log.investigators['12004']).toMatchObject({ xp: 3, mentalTrauma: 3 })
    expect(next.log.investigators['12004']?.killed).not.toBe(true)
    expect(next.log.investigators['12010']).toMatchObject({ xp: 0, killed: true })
    expect(next.log.rewards ?? []).not.toContain(COLLECTOR)
  })

  it('enlaza los tres cierres con Armitage, experiencia, trauma y bolsa persistentes', () => {
    // Guía de campaña: continuidad entre escenarios. Se inyectan los finales, no las victorias.
    let campaign = newCampaign('brethren-of-ash', ['daniela'], 'standard')
    let game = during(firstTurn(startScenario(campaign, 4)), (s) => s, {
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: 1 },
    })
    game = choose(choose(game, 'choice.continue'), 'choice.investigator')
    game = choose(choose(game, 'story.spreadingFlames.stay'), 'choice.continue')
    campaign = finishScenario(campaign, game)
    game = firstTurn(startScenario(campaign, 5))
    expect(Object.values(game.assets).some((a) => a.code === DR_ARMITAGE && a.noSlot)).toBe(true)
    expect(game.investigators[0]?.damage).toBe(1)
    campaign = finishScenario(campaign, finish(game, { type: 'resolution', resolution: 1 }))
    game = firstTurn(startScenario(campaign, 6))
    expect(game.scenarioId).toBe('queen-of-ash')
    expect(game.chaosBag.filter((token) => token === 'cultist')).toHaveLength(2)
    campaign = finishScenario(campaign, finish(game, { type: 'resolution', resolution: 1 }))
    expect(campaign.results.map((result) => result.scenario)).toEqual([
      'spreading-flames',
      'smoke-and-mirrors',
      'queen-of-ash',
    ])
    expect(campaign.log.investigators['12001']).toMatchObject({
      xp: 9,
      physicalTrauma: 3,
      mentalTrauma: 2,
    })
    expect(campaign.log.notes).toContain('campaignWon')
    expect(canPlayNext(campaign)).toBe(false)
  })
})
