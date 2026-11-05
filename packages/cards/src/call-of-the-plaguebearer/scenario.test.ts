import {
  availableAbilities,
  bestByPrey,
  canEnter,
  getInvestigator,
  scenarioBehavior,
} from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { playRandomlyToEnd } from '../scenario-testing'
import { C, specific } from './helpers'
import { L } from './locations'
import { devoted, greyson, thrall, treacheries } from './data'
import { emit, game } from './testing'

const me = (s: ReturnType<typeof game>) => getInvestigator(s, 'a')
const patch = (s: ReturnType<typeof game>, values: Partial<ReturnType<typeof me>>) => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === 'a' ? { ...i, ...values } : i)),
})
const open = (s: ReturnType<typeof game>) =>
  emit(s, specific('plaguebearer.initBarricade', { location: L.omega, amount: 0 }), {
    type: 'MoveTo',
    investigator: 'a',
    location: L.omega,
  })

// Guía ES pp. 3–4; cartas Trasnochadores 1–18 y conjuntos compartidos.
describe('Trasnochadores: preparación y reglas', () => {
  it.each([1, 2, 3, 4])('prepara %i investigadores con una sola barricada inicial', (players) => {
    const s = game(players)
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
    expect(Object.keys(s.locations).sort()).toEqual([L.morgue, L.omega].sort())
    expect(s.locations[L.omega]?.resources).toBe(1)
    expect(Object.keys(s.setAsideLocations)).toHaveLength(6)
    expect(s.setAside.filter((c) => c.code === C.troubleshooter)).toHaveLength(2)
    expect(s.setAside.filter((c) => c.code === C.supplicant)).toHaveLength(2)
    expect(
      s.encounterDeck.some((c) =>
        [C.troubleshooter, C.supplicant].includes(c.code as typeof C.supplicant),
      ),
    ).toBe(false)
    expect(s.investigators.every((i) => i.location === L.morgue)).toBe(true)
  })
  it('bloquea entrar hasta quitar barricadas pagando pistas de los investigadores del Lugar', () => {
    let s = patch(game(), { clues: 2 })
    expect(canEnter(s, 'a', L.omega)).toBe(false)
    const a = availableAbilities(s, 'a').find((a) => a.key === `plaguebearer:remove:1:${L.omega}`)!
    s = emit(s, { type: 'UseAbility', investigator: 'a', ...a })
    while (s.pending?.question.prompt === 'prompt.spendGroupClues')
      s = choose(s, 'choice.investigator')
    expect(s.locations[L.omega]?.resources).toBe(0)
    expect(me(s).clues).toBe(1)
    expect(canEnter(s, 'a', L.omega)).toBe(true)
  })
  it.each([1, 4])('el primer acto coloca lugares y barricadas por investigador (%i)', (players) => {
    const s = open(game(players))
    expect(s.actIndex).toBe(1)
    expect(s.locations[L.tunnel]?.resources).toBe(3 * players)
    expect(s.locations[L.alpha]?.resources).toBe(players)
    expect(s.encounterDeck.filter((c) => c.code === C.supplicant)).toHaveLength(2)
    expect(s.setAside.some((c) => c.code === C.supplicant)).toBe(false)
  })
  it.each([L.lobby, L.hallway])('la entrada al Túnel desde %s aplica su rama', (from) => {
    let s = open(game())
    if (from === L.hallway) s = emit(s, { type: 'PutLocationIntoPlay', location: L.hallway })
    s = patch(s, { location: from })
    s = emit(s, specific('plaguebearer.initBarricade', { location: L.tunnel, amount: 0 }), {
      type: 'MoveTo',
      investigator: 'a',
      location: L.tunnel,
    })
    expect(s.actIndex).toBe(2)
    expect(Object.values(s.enemies).find((e) => e.code === C.greyson)?.exhausted).toBe(
      from === L.hallway,
    )
    expect(Object.values(s.enemies).find((e) => e.code === C.greyson)?.engagedWith).toBe(
      from === L.hallway ? null : 'a',
    )
    expect(Object.values(s.enemies).find((e) => e.code === C.first)?.location).toBe(L.morgue)
    expect(s.locations[L.stairs]).toBeDefined()
    expect(s.campaignLog?.notes.includes('plaguebearerAlarm')).toBe(from === L.lobby)
  })
  it('Greyson preparada impide moverse a investigadores y enemigos; agotada lo permite', () => {
    let s = open(game())
    s = emit(
      s,
      { type: 'SpawnEnemy', card: greyson, location: L.omega, engageWith: null },
      { type: 'SpawnEnemy', card: thrall, location: L.omega, engageWith: null },
    )
    const grey = Object.values(s.enemies).find((e) => e.code === C.greyson)!,
      slave = Object.values(s.enemies).find((e) => e.code === C.thrall)!
    s = emit(
      s,
      { type: 'MoveTo', investigator: 'a', location: L.morgue },
      { type: 'MoveEnemy', enemy: slave.id, location: L.morgue },
    )
    expect(me(s).location).toBe(L.omega)
    expect(s.enemies[slave.id]?.location).toBe(L.omega)
    s = emit(
      s,
      { type: 'ExhaustEnemy', enemy: grey.id },
      { type: 'MoveTo', investigator: 'a', location: L.morgue },
      { type: 'MoveEnemy', enemy: slave.id, location: L.morgue },
    )
    expect(me(s).location).toBe(L.morgue)
    expect(s.enemies[slave.id]?.location).toBe(L.morgue)
  })
  it('Presa cuenta Terror en la zona de amenaza, conservando los empates', () => {
    let s = game(2)
    s = emit(s, {
      type: 'ResolveEncounterCard',
      investigator: 'b',
      card: treacheries.find((c) => c.code === C.skin)!,
    })
    expect(
      bestByPrey(s.investigators, { type: 'mostTreacheries', trait: 'Terror' }, s).map((i) => i.id),
    ).toEqual(['b'])
    expect(
      bestByPrey(s.investigators, { type: 'mostTreacheries', trait: 'Madness' }, s),
    ).toHaveLength(2)
  })
  it('Greyson también bloquea intercambios y movimientos puntuales de enemigos', () => {
    let s = emit(
      game(),
      specific('plaguebearer.initBarricade', { location: L.omega, amount: 0 }),
      { type: 'SpawnEnemy', card: greyson, location: L.omega, engageWith: null },
      { type: 'SpawnEnemy', card: thrall, location: L.omega, engageWith: null },
    )
    const slave = Object.values(s.enemies).find((e) => e.code === C.thrall)!
    s = emit(
      s,
      { type: 'MoveTo', investigator: 'a', location: L.omega, swapEnemy: slave.id },
      { type: 'HuntOnce', enemy: slave.id, toward: L.morgue },
    )
    expect(me(s).location).toBe(L.morgue)
    expect(s.enemies[slave.id]?.location).toBe(L.omega)
  })
  it('Esclavo devoto busca uno mental después del movimiento, incluso si ya estaba en Omega', () => {
    let s = game(1, 'standard', true)
    s = emit(s, { type: 'SpawnEnemy', card: devoted, location: L.omega, engageWith: null })
    const count = s.encounterDeck.filter((c) => c.code === C.thrall).length
    s = emit(s, { type: 'Forced', trigger: { type: 'huntersMoveEnds' } })
    expect(Object.values(s.enemies).filter((e) => e.code === C.thrall)).toHaveLength(1)
    expect(s.encounterDeck.filter((c) => c.code === C.thrall)).toHaveLength(count - 1)
    s = emit(s, { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } })
    expect(Object.values(s.enemies).find((e) => e.code === C.thrall)?.doom).toBe(1)
  })
  it('la barricada del sectario se retira solo tras éxito y permite no retirarla', () => {
    let s = game()
    const effect = scenarioBehavior('late-risers')!.tokenEffect!(s, 'cultist', 'a')
    expect(effect.modifier).toBe(-3)
    expect(effect.onFail).toBeUndefined()
    s = emit(s, ...effect.onSuccess!)
    expect(s.pending?.question.choices.map((c) => c.label)).toContain('choice.skip')
    s = choose(s, 'choice.location')
    expect(s.locations[L.omega]?.resources).toBe(0)
  })
  it('el plan final causa trauma a los no derrotados y alcanza R1', () => {
    let s = game()
    s = emit({ ...s, agendaIndex: 2 }, { type: 'AdvanceAgenda' })
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(s.campaignLog?.investigators.a?.physicalTrauma).toBe(1)
    expect(s.campaignLog?.notes).toContain('plaguebearerContained')
  })
  it.each([2, 3])('resolución %i guarda notas y experiencia de victoria', (n) => {
    let s = game()
    s = {
      ...s,
      victoryDisplay: [C.greyson],
      victoryPoints: 2,
      campaignLog: { ...s.campaignLog!, notes: ['plaguebearerFire'] },
    }
    s = emit(s, { type: 'EndScenario', outcome: { type: 'resolution', resolution: n } })
    expect(s.outcome).toEqual({ type: 'resolution', resolution: n })
    expect(s.campaignLog?.notes).toContain('plaguebearerCollection')
    expect(s.campaignLog?.notes).toContain(
      n === 2 ? 'plaguebearerFirstClaimed' : 'plaguebearerRespect',
    )
    expect(s.experience?.[0]?.amount).toBe(2)
  })
})

describe('Trasnochadores: partidas completas por consola', () => {
  it.each(['easy', 'standard', 'hard', 'expert'] as const)(
    'termina con 1–4 investigadores en %s',
    (difficulty) => {
      for (const players of [1, 2, 3, 4])
        playRandomlyToEnd(game(players, difficulty), players + 101)
    },
  )
})
