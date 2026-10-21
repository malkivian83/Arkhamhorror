import { dispatch, type GameState } from '@lcg/engine'
import { choose, during, labels, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { finishScenario, newCampaign, startScenario } from '../campaign'
import { CODES, EXCELSIOR } from './cards'
import { actions, ids, newGame, settle } from './testing'

const [DANIELA] = ids as [string]

/** Partida en la mesa (con textos) con el menú de acciones abierto. */
const table = (players = 2) => actions(throughSetup(newGame(players, 5, true)))

/** Lee los textos (continuar) y contesta lo rutinario hasta la siguiente decisión real. */
function read(game: GameState): GameState {
  let g = settle(game)
  while (g.pending && labels(g).length === 1 && labels(g)[0] === 'choice.continue')
    g = settle(choose(g, 'choice.continue'))
  return g
}

describe('Resoluciones', () => {
  it('R1: ¿Qué has hecho? para el jefe, la Daga si quiere y Monroe si la policía te cree', () => {
    let game = table()
    game = during(game, (s) => ({ ...s, scenarioMeta: { policeOnYourSide: 1 } }))
    game = read(
      dispatch(
        { ...game, pending: null },
        { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } },
      ),
    )
    game = read(choose(game, 'choice.excelsior.addDagger'))
    game = read(choose(game, 'choice.investigator', { name: 'Daniela Reyes' }))
    expect(game.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(game.campaignLog?.notes).toContain('excelsiorIsQuietForNow')
    expect(game.campaignLog?.investigators[DANIELA]?.storyAssets).toEqual([
      CODES.whatHaveYouDone,
      CODES.bloodstainedDagger,
      CODES.sergeantMonroe,
    ])
  })

  it('R3: la primera vez se puede volver a jugar; si no, Debilidad Locura al azar', () => {
    let game = table()
    game = read(
      dispatch(
        { ...game, pending: null },
        { type: 'EndScenario', outcome: { type: 'resolution', resolution: 3 } },
      ),
    )
    expect(labels(game)).toEqual(['story.excelsior.playAgain', 'story.excelsior.leaveThingsAlone'])
    const replay = read(choose(game, 'story.excelsior.playAgain'))
    expect(replay.scenarioMeta?.replay).toBe(1)
    expect(replay.outcome).toEqual({ type: 'resolution', resolution: 3 })
    game = read(choose(game, 'story.excelsior.leaveThingsAlone'))
    game = read(choose(game, 'choice.skip'))
    expect(game.campaignLog?.notes).toContain('murdersContinueUnsolved')
    const added = game.campaignLog?.investigators[DANIELA]?.storyAssets ?? []
    expect(added[0]).toBe(CODES.whatHaveYouDone)
    // Amnesia o Paranoia (Locura) de la caja básica.
    expect(['12097', '12101']).toContain(added[1])
  })

  it('volver a jugar deja la campaña en el mismo escenario sin experiencia', () => {
    const campaign = newCampaign(EXCELSIOR, ['daniela', 'joe'], 'standard', 3)
    let game = actions(throughSetup(startScenario(campaign, 9)))
    game = read(
      dispatch(
        { ...game, pending: null },
        { type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } },
      ),
    )
    game = read(choose(game, 'story.excelsior.playAgain'))
    const next = finishScenario(campaign, game)
    expect(next.scenarioIndex).toBe(0)
    expect(next.results).toEqual([])
    expect(next.log.values[`replayed:${EXCELSIOR}`]).toBe('1')
    // La segunda vez ya no se ofrece volver a jugar.
    let again = actions(throughSetup(startScenario(next, 10)))
    again = read(
      dispatch(
        { ...again, pending: null },
        { type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } },
      ),
    )
    expect(labels(again)).not.toContain('story.excelsior.playAgain')
  })

  it('sin resolución tras retirarse: los investigadores huyeron (→R3)', () => {
    let game = table(1)
    game = read(choose(game, 'action.move', { location: 'Second Floor Hall' }))
    game = read(choose(game, 'action.move', { location: 'Foyer' }))
    game = read(choose(game, 'ability.resign'))
    expect(game.campaignLog?.notes).toContain('investigatorsFledTheSceneOfTheCrime')
    expect(labels(game)).toContain('story.excelsior.playAgain')
  })
})

describe('Peligro y Monroe', () => {
  it('Señal encefálica: nadie más compromete cartas', () => {
    let game = actions(newGame(2))
    game = during(game, (s) => ({
      ...s,
      investigators: s.investigators.map((i) => ({ ...i, location: CODES.foyer })),
    }))
    game = dispatch(
      { ...game, pending: null },
      {
        type: 'ResolveEncounterCard',
        investigator: DANIELA,
        card: {
          kind: 'treachery',
          code: CODES.encephalonSignal,
          name: 'Encephalon Signal',
          traits: ['Hazard'],
          keywords: ['peril'],
        },
      },
    )
    expect(game.pending?.question.prompt).toBe('prompt.commitCards')
    expect(labels(game)).not.toContain('choice.commitFrom')
  })

  it('Monroe sin dueño derrotado abandona el juego', () => {
    let game = actions(newGame(2))
    game = during(game, (s) => s, {
      type: 'PlaceAsset',
      code: CODES.sergeantMonroe,
      name: 'Sergeant Monroe',
      placement: { type: 'location', location: CODES.foyer },
      damage: 2,
    })
    const monroe = Object.values(game.placedAssets ?? {})[0]!
    game = during(game, (s) => s, {
      type: 'DamagePlacedAsset',
      placed: monroe.id,
      damage: 1,
      horror: 0,
    })
    expect(Object.values(game.placedAssets ?? {})).toHaveLength(0)
  })
})
