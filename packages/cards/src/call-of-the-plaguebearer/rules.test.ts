import {
  availableAbilities,
  createGame,
  dispatch,
  getInvestigator,
  type GameState,
} from '@lcg/engine'
import { choose, testInvestigator, throughSetup, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { C, specific } from './helpers'
import { first, panicked, supplicant, treacheries, troubleshooter } from './data'
import { L } from './locations'
import { lateRisers } from './scenario'
import { emit, game, settle } from './testing'

const me = (s: GameState) => getInvestigator(s, 'a')
const patch = (s: GameState, values: Partial<ReturnType<typeof me>>) => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === 'a' ? { ...i, ...values } : i)),
})
const use = (s: GameState, label: string) => {
  const a = availableAbilities(s, 'a').find((a) => a.label === label)
  expect(a, label).toBeDefined()
  return emit(s, { type: 'UseAbility', investigator: 'a', ...a! })
}
const draw = (s: GameState, code: string) =>
  emit(s, {
    type: 'ResolveEncounterCard',
    investigator: 'a',
    card: treacheries.find((c) => c.code === code)!,
  })
const open = (s: GameState) =>
  emit(s, specific('plaguebearer.initBarricade', { location: L.omega, amount: 0 }), {
    type: 'MoveTo',
    investigator: 'a',
    location: L.omega,
  })

// Guía ES p. 3–4 y texto de las cartas; RR «Triggered Abilities», «Skill Tests».
describe('Trasnochadores: efectos de cartas y finales favorables', () => {
  it('el texto oculto del prólogo solo da 2 recursos a quien decide leerlo', () => {
    let s = throughSetup(
      createGame({
        seed: 1,
        interactive: true,
        scenario: lateRisers(),
        investigators: [testInvestigator('a'), testInvestigator('b')],
      }),
    )
    s = choose(s, 'choice.plaguebearer.read')
    s = choose(s, 'choice.continue')
    s = choose(s, 'choice.skip')
    expect(me(s).resources).toBe(7)
    expect(getInvestigator(s, 'b').resources).toBe(5)
  })
  it('Manos dormidas causa horror al final del turno y permite pagar daño por una acción', () => {
    let s = draw(game(), C.hands)
    s = emit(s, { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } })
    expect(me(s).horror).toBe(1)
    const actions = me(s).actionsRemaining
    s = use(s, 'ability.plaguebearer.hands')
    expect(me(s).damage).toBe(2)
    expect(me(s).actionsRemaining).toBe(actions + 1)
    expect(Object.values(s.treacheries).some((t) => t.code === C.hands)).toBe(false)
  })
  it('Bajo la piel descarta una carta al acertar; puede descartarse pagando dos acciones', () => {
    let s = draw(game(), C.skin)
    const hand = me(s).hand.length,
      actions = me(s).actionsRemaining
    s = emit(s, {
      type: 'Forced',
      trigger: {
        type: 'afterSkillTest',
        investigator: 'a',
        kind: 'fight',
        succeeded: true,
        margin: 0,
      },
    })
    expect(me(s).hand).toHaveLength(hand - 1)
    s = use(s, 'ability.plaguebearer.skin')
    expect(me(s).actionsRemaining).toBe(actions - 2)
    expect(Object.values(s.treacheries)).toHaveLength(0)
  })
  it('Otra persona cobra recursos al moverse y en Miasma se elimina pagando horror', () => {
    let s = draw(game(), C.another)
    s = emit(s, specific('plaguebearer.initBarricade', { location: L.omega, amount: 0 }), {
      type: 'MoveTo',
      investigator: 'a',
      location: L.omega,
    })
    expect(me(s).resources).toBe(4)
    s = emit(s, { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } })
    s = settle(choose(s, 'choice.plaguebearer.horror'))
    expect(me(s).horror).toBe(1)
    expect(Object.values(s.treacheries)).toHaveLength(0)
  })
  it.each([C.suppression, C.urge])('fallar %s por dos causa su daño/horror adicional', (code) => {
    let s = open(game())
    s = patch(s, {
      location: L.lobby,
      skills: { willpower: 0, intellect: 3, combat: 3, agility: 0 },
    })
    s = draw(withBag(-4)(s), code)
    expect(code === C.suppression ? me(s).damage : me(s).horror).toBe(2)
    expect(me(s).location).toBe(L.omega)
  })
  it('Destruyendo pruebas explota antes de abandonar el Lugar y daña a todos', () => {
    let s = draw(game(), C.evidence)
    s = emit(
      s,
      { type: 'SpawnEnemy', card: troubleshooter, location: L.morgue, engageWith: null },
      specific('plaguebearer.initBarricade', { location: L.omega, amount: 0 }),
      { type: 'MoveTo', investigator: 'a', location: L.omega },
    )
    expect(me(s).damage).toBe(3)
    expect(Object.values(s.treacheries)).toHaveLength(0)
    expect(Object.values(s.enemies)).toHaveLength(0)
    expect(me(s).location).toBe(L.omega)
  })
  it('el explosivo permite ignorar el fallo automático terminando el turno', () => {
    let s = draw(game(), C.evidence)
    s = withBag('autoFail')(s)
    // Ventana impresa «después de revelar»: antes de aplicar el efecto de la ficha.
    const a = availableAbilities(s, 'a').find((a) => a.label === 'ability.plaguebearer.evidence')!
    s = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'UseAbility', investigator: 'a', ...a },
    )
    s = choose(s, 'choice.revealToken')
    s = choose(s, 'ability.plaguebearer.evidenceAuto')
    s = settle(s)
    expect(Object.values(s.treacheries)).toHaveLength(0)
    expect(s.lastSkillTest?.succeeded).toBe(true)
  })
  it('el Laboratorio Omega deja elegir daño o Terror y no duplica la carta física', () => {
    let s = open(game())
    s = emit(s, { type: 'Forced', trigger: { type: 'turnBegins', investigator: 'a' } })
    s = settle(choose(s, 'choice.plaguebearer.damage'))
    expect(me(s).damage).toBe(1)
    s = emit(
      { ...s, encounterDeck: [treacheries.find((t) => t.code === C.skin)!], encounterDiscard: [] },
      { type: 'Forced', trigger: { type: 'turnBegins', investigator: 'a' } },
    )
    s = settle(choose(s, 'choice.plaguebearer.terror'))
    expect(Object.values(s.treacheries).filter((t) => t.code === C.skin)).toHaveLength(1)
    expect(s.encounterDiscard.some((t) => t.code === C.skin)).toBe(false)
  })
  it('el plan descarta Terror en Omega y causa un horror por cada una', () => {
    let s = draw(draw(open(game()), C.skin), C.hands)
    s = emit(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(me(s).horror).toBe(2)
    expect(Object.values(s.treacheries)).toHaveLength(0)
  })
  it('Laboratorio Alfa investiga con combate, descubre pistas y registra el fuego', () => {
    let s = open(game())
    s = emit(s, specific('plaguebearer.initBarricade', { location: L.alpha, amount: 0 }), {
      type: 'MoveTo',
      investigator: 'a',
      location: L.alpha,
    })
    s = withBag(0)(patch(s, { skills: { willpower: 3, intellect: 0, combat: 8, agility: 3 } }))
    s = use(s, 'ability.plaguebearer.fire')
    expect(s.campaignLog?.notes).toContain('plaguebearerFire')
    expect(me(s).clues).toBe(1)
    expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.plaguebearer.fire')).toBe(
      false,
    )
  })
  it('Suplicante aumenta el ataque solo contra investigadores con Terror', () => {
    const s = draw(game(), C.skin)
    const before = me(s).damage
    const next = emit(s, {
      type: 'SpawnEnemy',
      card: supplicant,
      location: L.morgue,
      engageWith: 'a',
    })
    const enemy = Object.values(next.enemies)[0]!
    const after = emit(next, {
      type: 'EnemyAttack',
      enemy: enemy.id,
      investigator: 'a',
      exhaustAfter: false,
    })
    expect(me(after).damage - before).toBe(2)
    expect(me(after).horror).toBe(2)
  })
  it.each([C.greyson, C.first])(
    'derrotar %s en el acto 3 llega al final correcto y da experiencia',
    (code) => {
      let s = open(game())
      s = patch(s, { location: L.lobby })
      s = emit(s, specific('plaguebearer.initBarricade', { location: L.tunnel, amount: 0 }), {
        type: 'MoveTo',
        investigator: 'a',
        location: L.tunnel,
      })
      const enemy = Object.values(s.enemies).find((e) => e.code === code)!
      s = emit(s, { type: 'DefeatEnemy', enemy: enemy.id, by: 'a' })
      expect(s.outcome).toEqual({ type: 'resolution', resolution: code === C.greyson ? 2 : 3 })
      expect(s.experience?.[0]?.amount).toBe(2)
    },
  )
  it('se puede desistir desde Escalera estrecha sin pistas para llegar a R2', () => {
    let s = open(game())
    s = patch(s, { location: L.lobby })
    s = emit(s, specific('plaguebearer.initBarricade', { location: L.tunnel, amount: 0 }), {
      type: 'MoveTo',
      investigator: 'a',
      location: L.tunnel,
    })
    const grey = Object.values(s.enemies).find((e) => e.code === C.greyson)!
    s = emit(
      s,
      { type: 'ExhaustEnemy', enemy: grey.id },
      { type: 'MoveTo', investigator: 'a', location: L.stairs },
    )
    s = { ...s, locations: { ...s.locations, [L.stairs]: { ...s.locations[L.stairs]!, clues: 0 } } }
    s = use(patch(s, { actionsRemaining: 3, clues: 2 }), 'ability.plaguebearer.resign')
    expect(me(s).resigned).toBe(true)
    expect(me(s).clues).toBe(0)
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
  })
  it('el maletín da recursos, transmite el reactivo y puede pasar a otro investigador', () => {
    let s = emit(game(2), { type: 'PutAssetIntoPlay', investigator: 'a', code: C.briefcase })
    s = use(withBag('skull')(s), 'ability.plaguebearer.briefcaseResources')
    expect(me(s).resources).toBe(8)
    s = settle(s)
    expect(s.campaignLog?.notes).toContain('plaguebearerReagent')
    s = settle(choose(s, 'choice.investigator', { name: 'B' }))
    expect(Object.values(s.assets).find((a) => a.code === C.briefcase)?.owner).toBe('b')
  })
  it('Laboratorio Delta abre el pasillo con la prueba de velo +4 y el pago de pistas local', () => {
    let s = open(game())
    s = emit(s, specific('plaguebearer.initBarricade', { location: L.delta, amount: 0 }))
    s = emit(patch(s, { location: L.delta }), { type: 'RevealLocation', location: L.delta })
    s = withBag(0)(
      patch(s, { clues: 5, skills: { willpower: 3, intellect: 10, combat: 3, agility: 3 } }),
    )
    s = dispatch(
      { ...s, pending: null, queue: [] },
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'intellect',
        difficulty: 2,
        kind: { type: 'investigate', location: L.delta },
      },
    )
    s = choose(s, 'ability.plaguebearer.delta')
    expect(s.skillTest?.difficulty).toBe(6)
    s = settle(choose(s, 'choice.revealToken'))
    s = settle(choose(s, 'choice.plaguebearer.hallway'))
    expect(s.locations[L.hallway]).toBeDefined()
    expect(me(s).clues).toBe(3)
  })
  it('el Pasillo retira hasta tres barricadas del Túnel pagando una pista', () => {
    let s = emit(open(game()), { type: 'PutLocationIntoPlay', location: L.hallway })
    s = emit(patch(s, { location: L.hallway, clues: 1 }), {
      type: 'RevealLocation',
      location: L.hallway,
    })
    s = use(s, 'ability.plaguebearer.hallway')
    expect(s.locations[L.tunnel]?.resources).toBe(0)
    expect(me(s).clues).toBe(0)
  })
  it('negociar con Greyson la evita sin provocar un ataque de oportunidad', () => {
    let s = emit(open(game()), {
      type: 'SpawnEnemy',
      card: { ...first, code: C.greyson, health: 3, evade: 3, keywords: ['alert', 'retaliate'] },
      location: L.omega,
      engageWith: 'a',
    })
    s = use(
      withBag(0)(patch(s, { skills: { willpower: 3, intellect: 8, combat: 3, agility: 3 } })),
      'ability.plaguebearer.greyson',
    )
    expect(Object.values(s.enemies)[0]?.exhausted).toBe(true)
    expect(me(s).damage).toBe(0)
  })
  it('el Primero causa horror al recibir daño desde Miasma, también daño letal', () => {
    let s = emit(open(game()), {
      type: 'SpawnEnemy',
      card: first,
      location: L.omega,
      engageWith: null,
    })
    const enemy = Object.values(s.enemies)[0]!
    s = emit(s, { type: 'DamageEnemy', enemy: enemy.id, amount: 5, by: 'a' })
    expect(me(s).horror).toBe(1)
    expect(s.victoryDisplay).toContain(C.first)
  })
  it.each([false, true])(
    'Agente en pánico: efecto adicional solo en oportunidad (%s)',
    (opportunity) => {
      let s = emit(game(), {
        type: 'SpawnEnemy',
        card: panicked,
        location: L.morgue,
        engageWith: 'a',
      })
      const enemy = Object.values(s.enemies)[0]!
      s = emit(s, {
        type: 'EnemyAttack',
        enemy: enemy.id,
        investigator: 'a',
        exhaustAfter: false,
        opportunity,
      })
      expect(me(s).damage).toBe(opportunity ? 2 : 1)
      expect(s.enemies[enemy.id]?.exhausted).toBe(opportunity)
    },
  )
  it('Solucionador empuja tras atacar en fase de enemigos y deja de estar enfrentado', () => {
    let s = patch(open(game()), { location: L.lobby })
    s = { ...s, phase: 'enemy' }
    s = emit(s, { type: 'SpawnEnemy', card: troubleshooter, location: L.lobby, engageWith: 'a' })
    const enemy = Object.values(s.enemies)[0]!
    s = emit(s, {
      type: 'Forced',
      trigger: { type: 'afterEnemyAttack', enemy: enemy.id, investigator: 'a' },
    })
    expect(me(s).location).toBe(L.omega)
    expect(s.enemies[enemy.id]?.engagedWith).toBeNull()
  })
  it('el primer plan revela Omega, retira sus barricadas y baraja los Solucionadores', () => {
    let s = withBag(0)(
      patch(game(), { skills: { willpower: 8, intellect: 3, combat: 3, agility: 3 } }),
    )
    s = emit(s, { type: 'AdvanceAgenda' })
    expect(s.agendaIndex).toBe(1)
    expect(s.locations[L.omega]?.resources).toBe(0)
    expect(s.locations[L.omega]?.revealed).toBe(true)
    expect(s.encounterDeck.filter((c) => c.code === C.troubleshooter)).toHaveLength(2)
    expect(s.setAside.some((c) => c.code === C.troubleshooter)).toBe(false)
  })
  it('el maletín que conservas al terminar se añade al mazo de campaña', () => {
    let s = emit(game(), { type: 'PutAssetIntoPlay', investigator: 'a', code: C.briefcase })
    s = emit(s, { type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } })
    expect(s.campaignLog?.investigators.a?.storyAssets).toContain(C.briefcase)
  })
  it('el maletín se exilia al abandonar el juego', () => {
    let s = emit(game(), { type: 'PutAssetIntoPlay', investigator: 'a', code: C.briefcase })
    const asset = Object.values(s.assets).find((a) => a.code === C.briefcase)!
    s = emit(s, { type: 'DiscardAsset', asset: asset.id })
    expect(s.exiled).toContainEqual({ investigator: 'a', code: C.briefcase })
    expect(Object.values(s.assets)).toHaveLength(0)
  })
})
