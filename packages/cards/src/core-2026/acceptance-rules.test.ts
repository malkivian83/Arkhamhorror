import {
  applyInput,
  availableActions,
  createGame,
  engagedEnemies,
  playerCardBehavior,
  registerEnemy,
  registerLocation,
  locationBehavior,
  type EnemyCard,
  type GameState,
} from '@lcg/engine'
import { choose, during, testInvestigator, testScenario, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { code } from './player-cards'
import '../index'

const massive: EnemyCard = {
  kind: 'enemy',
  code: 'acceptance-massive',
  name: 'Massive test enemy',
  fight: 2,
  health: 10,
  evade: 2,
  damage: 1,
  horror: 0,
  keywords: ['massive'],
}
function table() {
  let g = throughSetup(
    createGame({
      seed: 1,
      scenario: testScenario({ chaosBag: [0] }),
      investigators: ['a', 'b'].map((id) =>
        testInvestigator(id, { deck: Array(20).fill(code(89)) }),
      ),
    }),
  )
  if (g.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    g = applyInput(g, { investigator: g.pending.investigator, choice: 0 })
  return during(g, (s) => s, { type: 'SpawnEnemy', card: massive, location: 'A', engageWith: 'a' })
}
function settle(g: GameState) {
  for (let n = 0; g.pending && g.pending.question.prompt !== 'prompt.chooseAction' && n < 60; n++)
    g = applyInput(g, { investigator: g.pending.investigator, choice: 0 })
  return g
}
describe('reglas pendientes de aceptación de campaña', () => {
  it('Masivo preparado cuenta como enfrentado con todos, una sola vez, y nunca entra en amenaza', () => {
    const base = table()
    const g = {
      ...base,
      investigators: base.investigators.map((i) => ({ ...i, actionsRemaining: 3 })),
    }
    expect(Object.values(g.enemies)[0]!.engagedWith).toBeNull()
    for (const id of ['a', 'b']) {
      expect(engagedEnemies(g, id)).toHaveLength(1)
      expect(availableActions(g, id).filter((a) => a.kind === 'evade')).toHaveLength(1)
      expect(availableActions(g, id).filter((a) => a.kind === 'engage')).toHaveLength(0)
    }
  })
  it('Machete obtiene su daño adicional contra el único enemigo Masivo preparado', () => {
    const g = table()
    const asset = {
      id: 'machete',
      code: code(20),
      owner: 'a',
      exhausted: false,
      damage: 0,
      horror: 0,
      uses: 0,
    }
    const option = playerCardBehavior(code(20))!.abilities!(g, asset, 'a')[0]!
    expect(option.then.find((m) => m.type === 'BeginSkillTest')).toMatchObject({
      kind: { extraDamage: 1 },
    })
  })
  it('Through the Cracks permite evitar a un Masivo; al agotarse deja de estar enfrentado', () => {
    let g = during(table(), (s) => ({
      ...s,
      investigators: s.investigators.map((i) =>
        i.id === 'a' ? { ...i, resources: 5, hand: [code(37)] } : i,
      ),
    }))
    expect(
      g.pending!.question.choices.some(
        (c) => c.label === 'action.play' && c.params?.card === 'Through the Cracks',
      ),
    ).toBe(true)
    g = settle(choose(g, 'action.play', { card: 'Through the Cracks' }))
    expect(engagedEnemies(g, 'a')).toHaveLength(0)
    expect(engagedEnemies(g, 'b')).toHaveLength(0)
  })
  it('un Masivo no sigue al moverse ni se desplaza por un efecto de enfrentarse', () => {
    let g = table()
    const enemy = Object.keys(g.enemies)[0]!
    g = during(
      g,
      (s) => s,
      { type: 'MoveTo', investigator: 'a', location: 'B' },
      { type: 'EngageEnemy', enemy, investigator: 'a' },
    )
    expect(g.enemies[enemy]).toMatchObject({ location: 'A', engagedWith: null })
    expect(engagedEnemies(g, 'a')).toHaveLength(0)
    expect(engagedEnemies(g, 'b')).toHaveLength(1)
  })
  it('cada investigador recibe un solo ataque del Masivo en la fase de enemigos', () => {
    const g = during(table(), (s) => s, { type: 'EnemiesAttack' })
    expect(g.investigators.map((i) => i.damage)).toEqual([1, 1])
    expect(Object.values(g.enemies)[0]!.exhausted).toBe(true)
  })
  it('un ataque de oportunidad del Masivo no se duplica y un Masivo agotado no ataca', () => {
    let g = settle(choose(table(), 'action.resource'))
    expect(g.investigators[0]!.damage).toBe(1)
    const enemy = Object.keys(g.enemies)[0]!
    g = during(g, (s) => s, { type: 'EvadeEnemy', enemy })
    g = settle(choose(g, 'action.resource'))
    expect(g.investigators[0]!.damage).toBe(1)
  })
  it('Bodyguard sale del juego antes de reaccionar y no puede volver a recibir daño', () => {
    let g = during(
      table(),
      (s) => s,
      { type: 'PutAssetIntoPlay', investigator: 'a', code: code(16) },
      { type: 'ResolveWeakness', investigator: 'a', code: code(3) },
    )
    const asset = Object.values(g.assets)[0]!
    g = during(g, (s) => s, { type: 'DamageAsset', asset: asset.id, damage: 0, horror: 1 })
    expect(g.pending?.question.prompt).toBe('prompt.reaction')
    expect(g.assets[asset.id]).toBeUndefined()
    g = settle(choose(g, 'ability.damageEnemyHere', { card: 'Bodyguard' }))
    expect(g.investigators[0]!.discard.filter((c) => c === code(16))).toHaveLength(1)
    expect(g.investigators[0]!.damage).toBe(1)
    expect(Object.values(g.enemies)[0]!.damageTaken).toBe(1)
  })
  it('dos derrotas encoladas del mismo enemigo solo conceden victoria una vez', () => {
    let g = table()
    const enemy = Object.keys(g.enemies)[0]!
    g = during(
      g,
      (s) => ({ ...s, enemies: { ...s.enemies, [enemy]: { ...s.enemies[enemy]!, victory: 1 } } }),
      { type: 'DefeatEnemy', enemy },
      { type: 'DefeatEnemy', enemy },
    )
    expect(g.victoryDisplay.filter((c) => c === massive.code)).toHaveLength(1)
  })
  it('Machete no obtiene daño adicional si el Masivo está agotado o hay otro enemigo enfrentado', () => {
    let g = table()
    const asset = {
      id: 'machete',
      code: code(20),
      owner: 'a',
      exhausted: false,
      damage: 0,
      horror: 0,
      uses: 0,
    }
    const bonus = (s: GameState) =>
      playerCardBehavior(code(20))!.abilities!(s, asset, 'a')[0]!.then.find(
        (m) => m.type === 'BeginSkillTest',
      )
    g = during(g, (s) => s, { type: 'EvadeEnemy', enemy: Object.keys(g.enemies)[0]! })
    expect(bonus(g)).toMatchObject({ kind: { extraDamage: 0 } })
    g = during(
      g,
      (s) => s,
      { type: 'ReadyEnemy', enemy: Object.keys(g.enemies)[0]! },
      {
        type: 'SpawnEnemy',
        card: { ...massive, code: 'ordinary', keywords: [] },
        location: 'A',
        engageWith: 'a',
      },
    )
    expect(bonus(g)).toMatchObject({ kind: { extraDamage: 0 } })
  })
  it('Fingerprint Kit gasta y se agota antes del ataque de oportunidad y de sus reacciones', () => {
    registerEnemy({
      code: 'acceptance-cost',
      forced: (s, t) =>
        t.type === 'afterEnemyAttack'
          ? [
              {
                type: 'GainResources',
                investigator: 'a',
                amount: Object.values(s.assets).find((a) => a.code === code(31))!.uses,
              },
            ]
          : [],
    })
    let g = during(
      table(),
      (s) => ({ ...s, enemies: {} }),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: code(31) },
      {
        type: 'SpawnEnemy',
        card: { ...massive, code: 'acceptance-cost', keywords: [] },
        location: 'A',
        engageWith: 'a',
      },
    )
    const kit = Object.values(g.assets)[0]!
    g = during(g, (s) => ({ ...s, assets: { ...s.assets, [kit.id]: { ...kit, uses: 1 } } }))
    const resources = g.investigators[0]!.resources
    g = choose(g, 'ability.investigateWith', { card: 'Fingerprint Kit' })
    expect(g.assets[kit.id]).toMatchObject({ uses: 0, exhausted: true })
    expect(g.investigators[0]!.resources).toBe(resources)
    expect(g.investigators[0]!.damage).toBe(1)
    expect(g.investigators[0]!.clues).toBe(2)
  })
  it('un movimiento por efecto paga las pistas de entrada una sola vez; entrar después de revelar es gratis', () => {
    let g = during(
      table(),
      (s) => ({
        ...s,
        enemies: {},
        locations: { ...s.locations, B: { ...s.locations.B!, enterCost: 1 } },
        investigators: s.investigators.map((i) => ({ ...i, clues: i.id === 'a' ? 2 : 0 })),
      }),
      { type: 'MoveTo', investigator: 'a', location: 'B' },
    )
    expect(g.investigators[0]).toMatchObject({ location: 'B', clues: 0 })
    expect(g.locations.B!.revealed).toBe(true)
    g = during(
      g,
      (s) => s,
      { type: 'MoveTo', investigator: 'a', location: 'A' },
      { type: 'MoveTo', investigator: 'a', location: 'B' },
    )
    expect(g.investigators[0]).toMatchObject({ location: 'B', clues: 0 })
  })
  it('una elección de movimiento gratuito no ofrece entrar sin pistas suficientes', () => {
    const g = during(
      table(),
      (s) => ({
        ...s,
        enemies: {},
        locations: { ...s.locations, B: { ...s.locations.B!, enterCost: 1 } },
      }),
      { type: 'ChooseMove', investigator: 'a' },
    )
    expect(g.pending!.question.prompt).toBe('prompt.chooseAction')
    expect(g.pending!.question.choices.some((c) => c.label === 'action.move')).toBe(false)
  })
  it('el movimiento normal paga la entrada antes de ataques de oportunidad, sin cobrarla de nuevo', () => {
    registerEnemy({
      code: 'entry-observer',
      forced: (s, t) =>
        t.type === 'afterEnemyAttack'
          ? [
              {
                type: 'GainResources',
                investigator: 'a',
                amount: s.investigators.reduce((n, i) => n + i.clues, 0),
              },
            ]
          : [],
    })
    let g = during(
      table(),
      (s) => ({
        ...s,
        enemies: {},
        locations: { ...s.locations, B: { ...s.locations.B!, enterCost: 1 } },
        investigators: s.investigators.map((i) => ({ ...i, clues: i.id === 'a' ? 2 : 0 })),
      }),
      {
        type: 'SpawnEnemy',
        card: { ...massive, code: 'entry-observer', keywords: [] },
        location: 'A',
        engageWith: 'a',
      },
    )
    const resources = g.investigators[0]!.resources
    g = choose(g, 'action.move', { location: 'Room B' })
    expect(g.investigators[0]).toMatchObject({
      location: 'B',
      clues: 0,
      damage: 1,
      resources,
      actionsRemaining: 2,
    })
  })
  it('un Masivo derrotado tras atacar no vuelve a atacar ni falla al agotarse al final de la fase', () => {
    registerEnemy({
      code: 'expires-massive',
      forced: (_s, t, self) =>
        t.type === 'afterEnemyAttack' ? [{ type: 'DefeatEnemy', enemy: self.id }] : [],
    })
    const g = during(
      table(),
      (s) => ({ ...s, enemies: {} }),
      {
        type: 'SpawnEnemy',
        card: { ...massive, code: 'expires-massive', victory: 1 },
        location: 'A',
        engageWith: null,
      },
      { type: 'EnemiesAttack' },
    )
    expect(Object.values(g.enemies)).toHaveLength(0)
    expect(g.investigators.map((i) => i.damage)).toEqual([1, 0])
    expect(g.victoryDisplay).toEqual(['expires-massive'])
  })
  it('la universidad paga el coste rebajado de una carta del descarte antes del ataque', () => {
    registerLocation({ code: 'A', abilities: locationBehavior('12156')!.abilities! })
    registerEnemy({
      code: 'replay-observer',
      forced: (s, t) =>
        t.type === 'afterEnemyAttack'
          ? [{ type: 'GainResources', investigator: 'a', amount: s.investigators[0]!.resources }]
          : [],
    })
    let g = during(
      table(),
      (s) => ({
        ...s,
        enemies: {},
        investigators: s.investigators.map((i) =>
          i.id === 'a' ? { ...i, resources: 1, hand: [], discard: [code(59)] } : i,
        ),
      }),
      {
        type: 'SpawnEnemy',
        card: { ...massive, code: 'replay-observer', keywords: [] },
        location: 'A',
        engageWith: 'a',
      },
    )
    g = choose(g, 'ability.playFromDiscard', { card: 'Cosmic Flame' })
    expect(g.investigators[0]).toMatchObject({ resources: 0, damage: 1, actionsRemaining: 2 })
    expect(Object.values(g.assets).some((a) => a.code === code(59))).toBe(true)
    expect(g.investigators[0]!.hand).not.toContain(code(59))
  })
})
