import {
  createGame,
  emptyCampaignLog,
  newValley,
  type GameState,
  type ValleyResident,
} from '@lcg/engine'
import { choose, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { LONGEST_NIGHT, PEARL_DIARY, SECOND_EVENING, secondEvening } from './second-evening'

const start = (
  players: string[],
  notes: string[] = [],
  residents: Partial<Record<ValleyResident, { level?: number; notes?: string[] }>> = {},
) => {
  const valley = newValley()
  for (const [r, v] of Object.entries(residents))
    Object.assign(valley.residents[r as ValleyResident], v)
  const log = {
    ...emptyCampaignLog(players),
    notes,
    valley: { ...valley, day: 2 as const, time: 'day' as const },
  }
  return throughSetup(
    createGame({
      seed: 4,
      scenario: secondEvening({ difficulty: 'standard', seed: 4, investigators: players, log }),
      investigators: players.map((id) => testInvestigator(id)),
      campaignLog: log,
    }),
  )
}
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
const options = (state: GameState) => state.pending!.question.choices.map((c) => c.label)

// Guía, pp. 43–45.
describe('La segunda tarde', () => {
  it('si Simeon no sobrevivió, Leah lo busca y su nombre se tacha', () => {
    const game = start(['a', 'b'])
    expect(game.scenarioId).toBe(SECOND_EVENING)
    expect(game.campaignLog?.valley?.residents.simeonAtwood.crossedOut).toBe(true)
    expect(game.campaignLog?.valley?.residents.leahAtwood.notes).toContain(
      'leahIsSearchingForSimeon',
    )
    // El códice de un habitante tachado no se puede elegir.
    expect(options(game)).not.toContain('choice.hemlockVale.dance.3')
  })

  it('con Simeon superviviente puede bailar; con relación 3 o más, comparte un baile', () => {
    const game = start(['a', 'b'], [], {
      simeonAtwood: { notes: ['simeonSurvived'], level: 3 },
    })
    expect(options(game)).toContain('choice.hemlockVale.dance.3')
    const danced = play(game, ['choice.hemlockVale.dance.3'])
    expect(danced.campaignLog?.valley?.residents.simeonAtwood.notes).toContain(
      'simeonAtwoodSharedADance',
    )
  })

  it('el diario de madame Perla se ofrece y Bertie tiene una revelación si no fue rescatado', () => {
    const game = play(start(['a', 'b'], ['hemlockValeMadamePearlsDiaryRecovered']))
    const decks = Object.values(game.campaignLog!.investigators).flatMap((i) => i.storyAssets)
    expect(decks).toContain(PEARL_DIARY)
    expect(game.campaignLog?.notes).toContain('hemlockValeBertieHadAnEpiphany')
  })

  it('la resolución pasa a la Noche 2 y elige La noche más larga', () => {
    const game = play(start(['a', 'b'], ['hemlockValeBertieWasRescued']))
    expect(game.campaignLog?.valley?.day).toBe(2)
    expect(game.campaignLog?.valley?.time).toBe('night')
    expect(game.campaignLog?.valley?.route).toContain(LONGEST_NIGHT)
    expect(game.campaignLog?.notes).not.toContain('hemlockValeBertieHadAnEpiphany')
  })

  it('otro escenario de noche añade tablilla, calavera y Primigenio a la bolsa', () => {
    const before = start(['a'])
    const bag = before.campaignLog!.chaosTokens.length
    const game = play(before, [
      'choice.hemlockVale.dance.9',
      'choice.hemlockVale.dance.theta',
      'choice.hemlockVale.route.hemlock-vale-silent-heath',
    ])
    expect(game.campaignLog?.valley?.route).toContain('hemlock-vale-silent-heath')
    expect(game.campaignLog!.chaosTokens.length).toBe(bag + 3)
    expect(game.campaignLog?.notes).toContain('hemlockValeMarquezSupplies')
  })
})
