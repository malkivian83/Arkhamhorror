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
import { currentScenario, newCampaign, startScenario } from '../campaign'
import { RESIDENTS } from './welcome'
import { CAVES, ROCK, scrap, WRITTEN_IN_ROCK, writtenInRock } from './written-in-rock'
import {
  cartFacing,
  cartLocation,
  exitResolution,
  facedLocation,
  movable,
  RAIL,
  railsOf,
} from './written-in-rock-act2'

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
    let next = dispatch(atStation, { type: 'Forced', trigger: { type: 'roundEnds' } })
    while (next.pending) next = choose(next, next.pending.question.choices[0]!.label)
    expect(next.actIndex).toBe(1)
    expect(Object.keys(next.locations).some((id) => CAVES.some((c) => c.id === id))).toBe(false)
    expect(next.investigators.map((i) => i.clues)).toEqual([2, 2])
    expect(next.agendas[next.agendaIndex]!.code).toBe(ROCK.dangerousRide)
    expect(next.scenarioMeta?.switch).toBe(4)
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

const actTwo = (time: 'day' | 'night' = 'day') => {
  const game = quiet(start(time))
  const atStation: GameState = {
    ...game,
    investigators: game.investigators.map((i) => ({ ...i, location: ROCK.controlStation })),
  }
  let s = dispatch(atStation, { type: 'Forced', trigger: { type: 'roundEnds' } })
  // Lee el interludio y elige que la Vagoneta mire al norte.
  while (s.pending) {
    const labels = s.pending.question.choices.map((c) => c.label)
    s = choose(
      s,
      labels.includes('choice.hemlockVale.faceN') ? 'choice.hemlockVale.faceN' : labels[0]!,
    )
  }
  return s
}

// Guía, pp. 10–11: interludio «El derrumbe» y acto 2.
describe('Escrito en la roca: interludio y acto 2', () => {
  it('coloca la red ferroviaria de 5×5 con la Vagoneta en el Puesto de control', () => {
    const s = actTwo()
    expect(s.actIndex).toBe(1)
    expect(s.locations[ROCK.controlStation]!.position).toEqual([1, 5])
    expect(s.locations[RAIL.railExit]!.position).toEqual([5, 1])
    expect(Object.keys(s.locations)).toHaveLength(16)
    expect(cartLocation(s)).toBe(ROCK.controlStation)
    expect(cartFacing(s)).toBe('N')
    // El Día 1 de día, Simeon espera en la Vía hundida A (fila 4 de la guía, columna 2).
    const simeon = Object.values(s.placedAssets ?? {}).find(
      (a) => a.code === RESIDENTS.simeonAtwood.code,
    )
    expect(simeon?.placement).toEqual({ type: 'location', location: RAIL.sunkenRailA })
    expect(s.encounterDeck.some((c) => c.code === RAIL.wildRide)).toBe(true)
  })

  it('de noche, la Bestia subterránea aparece agotada en el Puesto de control', () => {
    const beast = Object.values(actTwo('night').enemies).find(
      (e) => e.code === RAIL.subterraneanBeast,
    )
    expect(beast).toMatchObject({ location: ROCK.controlStation, exhausted: true })
  })

  it('solo conecta los Lugares con raíles alineados y la Vagoneta descarrila si no lo están', () => {
    const s = actTwo()
    for (const location of Object.values(s.locations))
      for (const other of location.connections) {
        const a = s.locations[location.id]!.position!
        const b = s.locations[other]!.position!
        expect(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])).toBe(1)
      }
    // Sin Lugar al norte del Puesto de control movido aquí: forzamos un hueco.
    const target = facedLocation(s)!
    const aligned = railsOf(target.id).includes('S')
    const moved = dispatch(s, { type: 'ScenarioSpecific', key: 'cartStep', data: { times: 1 } })
    if (aligned) {
      expect(cartLocation(moved)).toBe(target.id)
      expect(moved.investigators.every((i) => i.location === target.id || i.eliminated)).toBe(true)
    } else {
      expect(moved.investigators.every((i) => i.eliminated)).toBe(true)
    }
  })

  it('no se puede deslizar el Lugar de la Vagoneta ni la Salida férrea', () => {
    const s = actTwo()
    expect(movable(s, ROCK.controlStation)).toBe(false)
    expect(movable(s, RAIL.railExit)).toBe(false)
  })

  it('al entrar en la Salida férrea avanza el acto y resuelve según los Atwood', () => {
    const s = actTwo()
    expect(exitResolution(s)).toBe(3)
    const end = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'ScenarioSpecific', key: 'cartEntered', data: { location: RAIL.railExit } },
    )
    const done = end.pending ? choose(end, end.pending.question.choices[0]!.label) : end
    expect(done.outcome).toEqual({ type: 'resolution', resolution: 3 })
    const valley = done.campaignLog!.valley!
    expect(valley.residents.simeonAtwood.crossedOut).toBe(true)
    expect(valley.areasSurveyed).toContain('northPointMine')
    expect(valley.route).toContain('hemlock-vale-first-evening')
  })
})

// Guía, p. 6: tras el preludio se juega el escenario elegido con lo conservado.
describe('Escrito en la roca en la campaña', () => {
  it('empieza tras el preludio con la mano, los recursos y las pistas arrastrados', () => {
    const campaign = newCampaign('the-feast-of-hemlock-vale', ['joe'], 'standard')
    const deck = campaign.investigators[0]!.deck
    const routed = {
      ...campaign,
      scenarioIndex: 1,
      log: {
        ...campaign.log,
        valley: {
          ...newValley(),
          route: [WRITTEN_IN_ROCK],
          carry: {
            [campaign.investigators[0]!.id]: { hand: deck.slice(0, 3), resources: 4, clues: 1 },
          },
        },
      },
    }
    expect(currentScenario(routed)).toBe(WRITTEN_IN_ROCK)
    const game = startScenario(routed, 9, false)
    const joe = game.investigators[0]!
    expect(joe.hand).toEqual(deck.slice(0, 3))
    expect(joe.resources).toBe(4)
    expect(joe.clues).toBe(1)
    expect(game.campaignLog!.valley!.carry).toBeUndefined()
  })
})
