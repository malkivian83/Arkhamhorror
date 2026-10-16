import { createGame, type GameState, type ScenarioOutcome } from '@lcg/engine'
import { choose, during, testInvestigator } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { spreadingFlames } from './spreading-flames'

function newGame(interactive: boolean): GameState {
  return createGame({
    seed: 11,
    interactive,
    scenario: spreadingFlames('standard'),
    investigators: [testInvestigator('a')],
  })
}

const story = (s: GameState) => s.pending?.question.story?.title

/** Partida en la mesa, ya leída la introducción, en el menú de acciones. */
function started(): GameState {
  return choose(newGame(true), 'choice.continue')
}

const finish = (s: GameState, outcome: ScenarioOutcome) =>
  during(s, (x) => x, { type: 'EndScenario', outcome })

describe('Spreading Flames: textos de historia', () => {
  it('la mesa empieza con la introducción', () => {
    const s = newGame(true)
    expect(story(s)).toBe('story.spreadingFlames.introTitle')
    expect(started().pending?.question.prompt).toBe('prompt.chooseAction')
  })

  it('sin la mesa no hay textos de historia', () => {
    expect(story(newGame(false))).toBeUndefined()
  })

  it('sin resolución: texto, efectos y fin', () => {
    let s = finish(started(), { type: 'noResolution' })
    expect(story(s)).toBe('story.spreadingFlames.noResolutionTitle')
    expect(s.pending?.question.story?.effects?.map((e) => e.key)).toContain(
      'story.effect.mentalTrauma',
    )
    expect(s.outcome).toBeNull()
    s = choose(s, 'choice.continue')
    expect(s.outcome).toEqual({ type: 'noResolution' })
  })

  it('resolución 1: portador de Armitage y elegir quedarse (resolución 2)', () => {
    let s = finish(started(), { type: 'resolution', resolution: 1 })
    expect(story(s)).toBe('story.spreadingFlames.resolution1Title')
    s = choose(s, 'choice.continue')
    expect(story(s)).toBe('story.spreadingFlames.armitageBearerTitle')
    s = choose(s, 'choice.investigator')
    expect(s.log.at(-1)?.key).toBe('log.armitageBearer')
    s = choose(s, 'story.spreadingFlames.stay')
    expect(story(s)).toBe('story.spreadingFlames.resolution2Title')
    s = choose(s, 'choice.continue')
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
  })

  it('resolución 1: marcharse lleva a la resolución 3', () => {
    let s = finish(started(), { type: 'resolution', resolution: 1 })
    s = choose(choose(s, 'choice.continue'), 'choice.investigator')
    s = choose(choose(s, 'story.spreadingFlames.go'), 'choice.continue')
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 3 })
  })
})
