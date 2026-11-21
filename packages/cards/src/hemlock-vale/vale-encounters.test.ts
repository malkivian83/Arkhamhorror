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
import { HEMLOCK_HOUSE, hemlockHouse, HOUSE } from './hemlock-house'
import { miasmaticShadow, VALE_CODES } from './vale-encounters'

const players = ['a', 'b']
const log = (time: 'day' | 'night' = 'night') => ({
  ...emptyCampaignLog(players),
  valley: { ...newValley(), day: 1 as const, time },
})
const start = (time: 'day' | 'night' = 'night'): GameState => ({
  ...throughSetup(
    createGame({
      seed: 5,
      scenario: hemlockHouse({
        difficulty: 'standard',
        seed: 5,
        investigators: players,
        log: log(time),
      }),
      investigators: players.map((id) => testInvestigator(id)),
      campaignLog: log(time),
    }),
  ),
  pending: null,
  queue: [],
})
const run = (state: GameState): GameState => {
  let next = state
  while (next.pending) next = choose(next, next.pending.question.choices[0]!.label)
  return next
}
const spawnShadow = (state: GameState) => {
  const spawned = run(
    dispatch(state, {
      type: 'SpawnEnemy',
      card: miasmaticShadow,
      location: HOUSE.foyer,
      engageWith: null,
    }),
  )
  return [
    spawned,
    Object.values(spawned.enemies).find((e) => e.code === VALE_CODES.miasmaticShadow)!,
  ] as const
}

// Cartas 10724, 10729 y 10743.
describe('Encuentros del Valle', () => {
  it('la Sombra miasmática solo recibe daño de Hechizos, Reliquias, Ciencia o Encuentros', () => {
    const [game, shadow] = spawnShadow(start())
    const punched = run(
      dispatch(game, { type: 'DamageEnemy', enemy: shadow.id, amount: 2, by: 'a' }),
    )
    expect(punched.enemies[shadow.id]!.damageTaken).toBe(0)
    const burned = run(
      dispatch(game, {
        type: 'DamageEnemy',
        enemy: shadow.id,
        amount: 2,
        source: { encounter: true },
      }),
    )
    expect(burned.enemies[shadow.id]!.damageTaken).toBe(2)
  })

  it('de noche, la Sombra miasmática es Escurridiza', () => {
    const keyword = scenarioBehavior(HEMLOCK_HOUSE)!.enemyKeyword!
    const [night, shadow] = spawnShadow(start())
    const [day, dayShadow] = spawnShadow(start('day'))
    expect(keyword(night, shadow, 'elusive')).toBe(true)
    expect(keyword(day, dayShadow, 'elusive')).toBeNull()
  })

  it('¡Fuego! inflige 1 daño directo al final de la ronda a lo que hay en su Lugar', () => {
    const game = start()
    const burning = run(dispatch(game, { type: 'ScenarioSpecific', key: 'fire' }))
    const fire = Object.values(burning.treacheries).find((t) => t.code === VALE_CODES.fire)!
    expect(fire.placement.type).toBe('location')
    const location = fire.placement.type === 'location' ? fire.placement.location : ''
    // Fila más alta, columna más a la izquierda: el Dormitorio del piso 4.
    expect(burning.locations[location]!.position).toEqual([2, 1])
    const inside = {
      ...burning,
      investigators: burning.investigators.map((i) => ({ ...i, location })),
    }
    const ended = run(dispatch(inside, { type: 'Forced', trigger: { type: 'roundEnds' } }))
    expect(ended.investigators.every((i) => i.damage === 1)).toBe(true)
  })

  it('Desecación: jugar una carta cuesta 1 daño y al final de la ronda se descarta una copia', () => {
    const game = start()
    const withCard: GameState = {
      ...game,
      treacheries: {
        t1: {
          id: 't1',
          kind: 'treachery',
          code: VALE_CODES.desiccation,
          name: 'Desiccation',
          traits: ['Blight'],
          keywords: [],
          placement: { type: 'agenda' },
        },
      },
    }
    const played = run(
      dispatch(withCard, {
        type: 'Forced',
        trigger: { type: 'afterPlayCard', investigator: 'a', code: '01088' },
      }),
    )
    expect(played.investigators[0]!.damage).toBe(1)
    const ended = run(dispatch(withCard, { type: 'Forced', trigger: { type: 'roundEnds' } }))
    expect(ended.treacheries.t1).toBeUndefined()
  })
})
