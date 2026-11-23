import {
  createGame,
  emptyCampaignLog,
  newValley,
  type GameState,
  type ValleyArea,
} from '@lcg/engine'
import { choose, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { FIRST_EVENING, firstEvening, TWISTED_HOLLOW, WORRY_ROCK } from './first-evening'
import { SISTER } from './lost-sister'

const start = (players: string[], notes: string[] = [], surveyed: ValleyArea[] = []) => {
  const log = {
    ...emptyCampaignLog(players),
    notes,
    valley: { ...newValley(), day: 1 as const, time: 'day' as const, areasSurveyed: surveyed },
  }
  return throughSetup(
    createGame({
      seed: 3,
      scenario: firstEvening({ difficulty: 'standard', seed: 3, investigators: players, log }),
      investigators: players.map((id) => testInvestigator(id)),
      campaignLog: log as never,
    }),
  )
}
/** Elige la opción con esa etiqueta (o la primera) hasta que no queden preguntas. */
const play = (state: GameState, picks: string[] = []): GameState => {
  let next = state
  const wanted = [...picks]
  for (let n = 0; next.pending && n < 60; n++) {
    const choices = next.pending.question.choices
    const index = choices.findIndex((c) => c.label === wanted[0])
    if (index >= 0) wanted.shift()
    next = choose(next, choices[Math.max(0, index)]!.label)
  }
  return next
}
const seatChoices = (state: GameState) => state.pending!.question.choices.map((c) => c.label)

// Guía, pp. 31–33.
describe('La primera tarde', () => {
  it('es un preludio sin partida que pregunta por la comida y por el asiento', () => {
    const game = start(['a', 'b'])
    expect(game.scenarioId).toBe(FIRST_EVENING)
    expect(game.pending?.question.prompt).toBe('prompt.hemlockVale.meal')
  })

  it('anota quién termina la comida y cada investigador elige una entrada distinta', () => {
    let game = start(['a', 'b'])
    game = choose(game, 'choice.hemlockVale.keepEating')
    game = choose(game, 'choice.hemlockVale.dontEat')
    expect(game.campaignLog?.notes).toContain('hemlockValeFinishedTheirMeal:a')
    expect(game.campaignLog?.notes).not.toContain('hemlockValeFinishedTheirMeal:b')
    expect(seatChoices(game)).toHaveLength(6)
    game = choose(game, 'choice.hemlockVale.seat.theta')
    game = choose(game, 'choice.hemlockVale.whoAreTheHemlocks')
    // El segundo investigador ya no puede elegir Θ.
    expect(seatChoices(game)).not.toContain('choice.hemlockVale.seat.theta')
    expect(game.campaignLog?.valley?.residents.williamHemlock.notes).toContain(
      'williamSharedHisLegacy',
    )
  })

  it('en solitario se eligen dos entradas y Π no puede ser la primera', () => {
    let game = start(['a'])
    game = choose(game, 'choice.hemlockVale.dontEat')
    expect(seatChoices(game)).not.toContain('choice.hemlockVale.seat.pi')
    game = play(game, ['choice.hemlockVale.seat.gamma'])
    expect(game.campaignLog?.valley?.codexChosen?.length).toBe(2)
  })

  it('Π da la Roca de la preocupación; Ω con la familia Peters reunida ofrece a Helen', () => {
    const pi = play(start(['a', 'b']), [
      'choice.hemlockVale.dontEat',
      'choice.hemlockVale.dontEat',
      'choice.hemlockVale.seat.pi',
      'choice.hemlockVale.seat.omega',
    ])
    const stories = pi.campaignLog?.investigators
    expect(Object.values(stories ?? {}).some((i) => i.storyAssets.includes(WORRY_ROCK))).toBe(true)
    expect(pi.campaignLog?.notes).toEqual(
      expect.not.arrayContaining(['hemlockValeHelenJoinedTheSurvey']),
    )
    const reunited = play(start(['a', 'b'], ['hemlockValePetersFamilyReunited']), [
      'choice.hemlockVale.dontEat',
      'choice.hemlockVale.dontEat',
      'choice.hemlockVale.seat.omega',
    ])
    expect(reunited.campaignLog?.notes).toContain('hemlockValeHelenJoinedTheSurvey')
    expect(
      Object.values(reunited.campaignLog!.investigators).some((i) =>
        i.storyAssets.includes(SISTER.helenPeters),
      ),
    ).toBe(true)
  })

  it('la resolución pasa a la Noche 1 y elige La hondonada retorcida', () => {
    const game = play(start(['a', 'b']))
    expect(game.campaignLog?.valley?.time).toBe('night')
    expect(game.campaignLog?.valley?.route).toContain(TWISTED_HOLLOW)
  })

  it('jugar otro escenario de noche añade una tablilla y un Primigenio a la bolsa', () => {
    const before = start(['a', 'b'], [], ['northPointMine'])
    const bag = before.campaignLog!.chaosTokens.length
    const game = play(before, ['choice.hemlockVale.route.hemlock-vale-hemlock-house'])
    expect(game.campaignLog?.valley?.route).toContain('hemlock-vale-hemlock-house')
    expect(game.campaignLog!.chaosTokens.length).toBe(bag + 2)
  })
})
