import {
  createGame,
  dispatch,
  emptyCampaignLog,
  newValley,
  scenarioBehavior,
  type GameState,
} from '@lcg/engine'
import { testInvestigator, throughSetup, choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { RESIDENTS } from './welcome'
import { CAVES, ROCK, scrap, WRITTEN_IN_ROCK, writtenInRock } from './written-in-rock'

const players = ['a', 'b']
const log = (time: 'day' | 'night' = 'day', day: 1 | 2 | 3 = 1) => ({
  ...emptyCampaignLog(players),
  valley: { ...newValley(), day, time },
})
const start = (time: 'day' | 'night' = 'day', day: 1 | 2 | 3 = 1) => {
  const game = createGame({
    seed: 11,
    scenario: writtenInRock({
      difficulty: 'standard',
      seed: 11,
      investigators: players,
      log: log(time, day),
    }),
    investigators: players.map((id) => testInvestigator(id)),
    campaignLog: log(time, day),
  })
  const ready = throughSetup(game)
  return ready.pending?.question.choices.some((c) => c.label === 'choice.investigator')
    ? choose(ready, 'choice.investigator', { name: 'A' })
    : ready
}
const quiet = (state: GameState): GameState => ({ ...state, pending: null, queue: [] })

// Guía de La fiesta del Valle de la Cicuta, pp. 10–11: preparación del acto 1.
describe('Escrito en la roca: preparación', () => {
  it('coloca 4 Cuevas en fila y el Puesto de control en la columna 5, con chatarra', () => {
    const game = start()
    expect(game.scenarioId).toBe(WRITTEN_IN_ROCK)
    expect(game.grid).toBe(true)
    const caves = Object.values(game.locations).filter((l) => CAVES.some((c) => c.id === l.id))
    expect(caves.map((l) => l.position![0]).sort()).toEqual([1, 2, 3, 4])
    expect(game.locations[ROCK.controlStation]!.position).toEqual([5, 5])
    expect(Object.values(game.locations).every((l) => l.resources === 1)).toBe(true)
    const first = caves.find((l) => l.position![0] === 1)!
    expect(game.investigators.every((i) => i.location === first.id)).toBe(true)
    expect(first.connections).toHaveLength(1)
    expect(game.encounterDeck.some((c) => c.code === '10676')).toBe(true)
    expect(game.setAside.filter((c) => c.code === '10721')).toHaveLength(2)
  })

  it('el Día 1 de día pone a River Hawthorne en la columna 3; de noche, no', () => {
    const river = (state: GameState) =>
      Object.values(state.placedAssets ?? {}).find((a) => a.code === RESIDENTS.riverHawthorne.code)
    const day = start()
    const third = Object.values(day.locations).find((l) => l.position?.[0] === 3)!
    expect(river(day)?.placement).toEqual({ type: 'location', location: third.id })
    expect(river(start('night'))).toBeUndefined()
    expect(river(start('day', 2))).toBeUndefined()
    expect(start('day', 2).encounterDeck.some((c) => c.code === '10678')).toBe(true)
  })
})

// Guía, p. 10, y cartas 10501, 10503 y 10505.
describe('Escrito en la roca: acto 1', () => {
  it('el plan mueve chatarra de tu Lugar a la tarjeta de referencia', () => {
    const game = quiet(start())
    const here = game.investigators[0]!.location!
    const next = dispatch(game, {
      type: 'ScenarioSpecific',
      key: 'collectScrap',
      data: { location: here },
    })
    expect(next.locations[here]!.resources).toBe(0)
    expect(scrap(next)).toBe(1)
  })

  it('al final de la ronda, con todos en el Puesto de control, avanza el acto', () => {
    const game = quiet(start())
    const atStation: GameState = {
      ...game,
      investigators: game.investigators.map((i) => ({
        ...i,
        location: ROCK.controlStation,
        clues: 3,
      })),
      scenarioMeta: { ...game.scenarioMeta, scrap: 3 },
    }
    const next = dispatch(atStation, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(next.actIndex).toBe(1)
    expect(Object.keys(next.locations)).toEqual([ROCK.controlStation])
    expect(next.investigators.map((i) => i.clues)).toEqual([2, 2])
    expect(next.agendas[next.agendaIndex]!.code).toBe(ROCK.dangerousRide)
    expect(next.scenarioMeta?.switch).toBe(3)
  })

  it('salir del Túnel cubierto de vegetación cuesta una acción más mientras tenga pistas', () => {
    const game = quiet(start())
    const rule = scenarioBehavior(WRITTEN_IN_ROCK)!.leaveCost!
    const tunnel = { ...game.locations[ROCK.controlStation]!, id: ROCK.overgrownTunnel, clues: 1 }
    const withTunnel = { ...game, locations: { ...game.locations, [tunnel.id]: tunnel } }
    expect(rule(withTunnel, ROCK.overgrownTunnel)).toBe(1)
    expect(
      rule(
        {
          ...withTunnel,
          locations: { ...withTunnel.locations, [tunnel.id]: { ...tunnel, clues: 0 } },
        },
        ROCK.overgrownTunnel,
      ),
    ).toBe(0)
  })
})
