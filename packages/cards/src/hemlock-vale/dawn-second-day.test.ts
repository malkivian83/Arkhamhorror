import { createGame, dispatch, emptyCampaignLog, newValley, type GameState } from '@lcg/engine'
import { choose, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { DAWN, DAWN_SECOND_DAY, dawnSecondDay } from './dawn-second-day'
import { VALE } from './vale-locations'
import { RESIDENTS } from './welcome'

const players = ['a', 'b']
const start = (notes: string[] = [], residentNotes: Record<string, string[]> = {}) => {
  const valley = newValley()
  for (const [resident, list] of Object.entries(residentNotes))
    valley.residents[resident as keyof typeof valley.residents].notes = list
  const log = {
    ...emptyCampaignLog(players),
    notes,
    valley: { ...valley, day: 1 as const, time: 'night' as const },
  }
  return throughSetup(
    createGame({
      seed: 9,
      scenario: dawnSecondDay({ difficulty: 'standard', seed: 9, investigators: players, log }),
      investigators: players.map((id) => testInvestigator(id)),
      campaignLog: log,
    }),
  )
}
const quiet = (state: GameState): GameState => ({ ...state, pending: null, queue: [] })
const run = (state: GameState): GameState => {
  let next = state
  for (let n = 0; next.pending && n < 40; n++)
    next = choose(next, next.pending.question.choices[0]!.label)
  return next
}
const codex = (state: GameState, n: number, investigator = 'a') =>
  run(dispatch(state, { type: 'ScenarioSpecific', key: 'codex', data: { n, investigator } }))

// Guía, pp. 39–42.
describe('Alba del segundo día', () => {
  it('es el Día 2 en el Valle: empieza en la Pensión con Judith en el cruce de caminos', () => {
    const game = quiet(start())
    expect(game.scenarioId).toBe(DAWN_SECOND_DAY)
    expect(game.campaignLog?.valley?.day).toBe(2)
    expect(game.campaignLog?.valley?.time).toBe('day')
    expect(game.investigators.every((i) => i.location === VALE.boardingHouse)).toBe(true)
    expect(
      Object.values(game.placedAssets ?? {}).map((a) =>
        a.placement.type === 'location' ? [a.code, a.placement.location] : [],
      ),
    ).toEqual([[RESIDENTS.judithPark.code, VALE.theCrossroads]])
    expect(game.doom).toBe(2)
  })

  it('quien terminó la comida recibe La maldición Cicuta; los demás, 1 trauma físico', () => {
    const game = run(start(['hemlockValeFinishedTheirMeal:a']))
    const log = game.campaignLog!
    expect(log.investigators.a!.storyAssets).toContain(DAWN.hemlockCurse)
    expect(log.investigators.b!.physicalTrauma).toBe(1)
    expect(log.investigators.a!.physicalTrauma).toBe(0)
    // La fatiga sustituye 2 fichas numéricas.
    expect(log.valley?.fatigue?.length).toBeGreaterThan(0)
  })

  it('códice 1: si la madre Rachel intervino, la Muñeca de hojas de maíz', () => {
    const game = codex(quiet(start([], { motherRachel: ['motherRachelIntervened'] })), 1)
    expect(game.campaignLog!.investigators.a!.storyAssets).toContain(DAWN.cornHuskDoll)
    expect(game.campaignLog?.valley?.residents.motherRachel.level).toBe(1)
  })

  it('códice 5: River sube 2, William baja y se obtienen 4 recursos', () => {
    const base = quiet(start())
    const before = base.investigators[0]!.resources
    const game = codex(base, 5)
    expect(game.campaignLog?.valley?.residents.riverHawthorne.level).toBe(2)
    expect(game.investigators[0]!.resources).toBe(before + 4)
    expect(game.campaignLog?.valley?.residents.riverHawthorne.notes).toContain(
      'theSchemeIsInMotion',
    )
  })

  it('códice 10 da un recado y el 14 lo completa (sube la relación de Leah)', () => {
    const errand = codex(quiet(start()), 10)
    const done = codex(errand, 14)
    expect(done.campaignLog?.valley?.residents.leahAtwood.level).toBe(1)
  })

  it('códices 11 y 15 colocan a la madre Rachel y a Theo', () => {
    const game = codex(codex(quiet(start()), 11), 15)
    const placed = Object.values(game.placedAssets ?? {}).map((a) => a.code)
    expect(placed).toEqual(
      expect.arrayContaining([RESIDENTS.motherRachel.code, RESIDENTS.theoPeters.code]),
    )
  })

  it('el reverso del plan resuelve R1 con Bertie rescatado y elige el estudio del Día 2', () => {
    const game = run(
      dispatch(quiet(start(['hemlockValeBertieWasRescued'])), { type: 'AdvanceAgenda' }),
    )
    expect(game.outcome).toMatchObject({ type: 'resolution', resolution: 1 })
    expect(game.campaignLog?.valley?.route?.length).toBe(1)
  })
})
