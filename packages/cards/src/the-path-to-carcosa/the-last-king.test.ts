import {
  dispatch,
  getInvestigator,
  scenarioBehavior,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, keep, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { CARCOSA_CHAOS_BAGS } from './campaign'
import { SETS } from './encounter-sets'
import {
  bystander,
  enemyCode,
  game,
  parley,
  placeAt,
  prep,
  resolveTest,
  update,
  use,
  whereIs,
  withBag,
} from './last-king-testing'
import { bystandersInPlay, CODES, INTERVIEWED, SICKENING, VIPS } from './the-last-king'

// Guía ES p. 7, "Preparación"; distribución sugerida de los Lugares.
describe('The Last King: setup', () => {
  for (const players of [1, 2, 3, 4])
    for (const difficulty of ['easy', 'standard', 'hard', 'expert'] as const)
      it(`${players} investigator(s), ${difficulty}`, () => {
        const state = game(players, difficulty)
        expect(Object.keys(state.locations).sort()).toEqual(
          [
            CODES.foyer,
            CODES.ballroom,
            CODES.livingRoom,
            CODES.gallery,
            CODES.courtyard,
            CODES.diningRoom,
          ].sort(),
        )
        expect(state.investigators.every((i) => i.location === CODES.foyer)).toBe(true)
        expect(state.locations[CODES.foyer]!.revealed).toBe(true)
        // Cada Transeúnte en un Lugar distinto salvo el Recibidor, con 1 pista + 1 por jugador.
        const placed = bystandersInPlay(state)
        expect(placed).toHaveLength(5)
        const rooms = placed.map((p) =>
          p.placement.type === 'location' ? p.placement.location : '',
        )
        expect(new Set(rooms).size).toBe(5)
        expect(rooms).not.toContain(CODES.foyer)
        expect(placed.every((p) => p.clues === 1 + players)).toBe(true)
        expect(state.setAside.map((c) => c.code).sort()).toEqual(
          [CODES.dianneDevine, ...VIPS.map((v) => v.enemy.code)].sort(),
        )
        expect(state.encounterDeck).toHaveLength(22)
        expect(state.chaosBag).toEqual(CARCOSA_CHAOS_BAGS[difficulty])
        expect(state.agendas.map((a) => [a.code, a.doomThreshold])).toEqual([
          [CODES.fashionablyLate, 3],
          [CODES.theTerrifyingTruth, 3],
        ])
        expect(state.acts.map((a) => a.code)).toEqual([CODES.discoveringTheTruth])
        expect(String(state.scenarioMeta?.[SICKENING]).split(',')).toHaveLength(5)
      })

  it('places the bystanders differently with different seeds', () => {
    const layouts = new Set(
      [1, 2, 3, 4, 5, 6].map((seed) =>
        VIPS.map((v) => whereIs(game(1, 'standard', seed), v.key)).join(),
      ),
    )
    expect(layouts.size).toBeGreaterThan(1)
  })

  it('connects locations by their printed symbols', () => {
    const state = prep(
      game(),
      [],
      ...Object.keys(game().locations).map((location): Message => ({
        type: 'RevealLocation',
        location,
      })),
    )
    const of = (id: string) => [...state.locations[id]!.connections].sort()
    expect(of(CODES.foyer)).toEqual([CODES.ballroom, CODES.courtyard, CODES.livingRoom].sort())
    expect(of(CODES.courtyard)).toEqual(
      [CODES.foyer, CODES.ballroom, CODES.livingRoom, CODES.gallery, CODES.diningRoom].sort(),
    )
    expect(of(CODES.diningRoom)).toEqual([CODES.ballroom, CODES.courtyard].sort())
    expect(of(CODES.gallery)).toEqual([CODES.livingRoom, CODES.courtyard].sort())
  })
})

describe('The Last King: parley with the bystanders', () => {
  it('Constance: intellect (3) takes 1 clue; the last one interviews her once', () => {
    let state = game()
    state = prep(state, [placeAt(whereIs(state, 'Constance')), withBag(0, 0, 0, 0)])
    const found = parley(state, 'Constance')!
    expect(found).toMatchObject({ actions: 1, provokes: false, parley: true })
    state = use(state, found)
    expect(state.skillTest).toMatchObject({ skill: 'intellect', difficulty: 3 })
    state = resolveTest(state)
    expect(getInvestigator(state, 'a').clues).toBe(1)
    expect(bystander(state, 'Constance').clues).toBe(1)
    expect(state.scenarioMeta?.[`${INTERVIEWED}Constance`]).toBeUndefined()
    state = resolveTest(use(state, parley(state, 'Constance')))
    // Reverso "El juramento de Engram": se lee y vuelve a su cara de Apoyo.
    expect(state.pending?.question.prompt).toBe('prompt.story')
    state = choose(state, state.pending!.question.choices[0]!.label)
    expect(getInvestigator(state, 'a').clues).toBe(2)
    expect(bystander(state, 'Constance').clues).toBe(0)
    expect(state.scenarioMeta?.[`${INTERVIEWED}Constance`]).toBe(1)
  })

  it('Jordan needs 10 resources, Haruko 6 cards in hand; Ashleigh takes 2 actions and no test', () => {
    let state = game()
    state = prep(state, [placeAt(whereIs(state, 'Jordan')), update('a', { resources: 9 })])
    expect(parley(state, 'Jordan')).toBeUndefined()
    state = prep(state, [update('a', { resources: 10 })])
    expect(parley(state, 'Jordan')).toBeDefined()
    state = prep(state, [placeAt(whereIs(state, 'Haruko')), update('a', { hand: ['x', 'y'] })])
    expect(parley(state, 'Haruko')).toBeUndefined()
    state = prep(state, [update('a', { hand: ['1', '2', '3', '4', '5', '6'] })])
    expect(parley(state, 'Haruko')).toBeDefined()
    state = prep(state, [placeAt(whereIs(state, 'Ashleigh'))])
    const ashleigh = parley(state, 'Ashleigh')!
    expect(ashleigh.actions).toBe(2)
    state = use(state, ashleigh)
    expect(state.skillTest).toBeNull()
    expect(getInvestigator(state, 'a').clues).toBe(1)
  })

  it('Tough Crowd: each parley costs 1 more action until the end of the round', () => {
    let state = game()
    state = prep(state, [placeAt(whereIs(state, 'Sebastien'))])
    expect(parley(state, 'Sebastien')!.actions).toBe(1)
    state = during(
      state,
      (s) => ({
        ...s,
        encounterDeck: [
          { ...s.encounterDeck.find((c) => c.code === CODES.toughCrowd)! },
          ...s.encounterDeck,
        ],
      }),
      { type: 'DrawEncounterCard', investigator: 'a' },
    )
    expect(Object.values(state.treacheries).map((t) => [t.code, t.placement.type])).toEqual([
      [CODES.toughCrowd, 'agenda'],
    ])
    expect(parley(state, 'Sebastien')!.actions).toBe(2)
    state = during(state, keep, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(Object.keys(state.treacheries)).toHaveLength(0)
    expect(parley(state, 'Sebastien')!.actions).toBe(1)
  })

  it.each([
    [CODES.ballroom, 'ability.lastKing.ballroom'],
    [CODES.livingRoom, 'ability.lastKing.livingRoom'],
  ])('%s: after a parley there, a group-limited reaction', (room, label) => {
    let state = game(2)
    const vip = VIPS.find((v) => whereIs(state, v.key) === room)!
    state = prep(state, [
      placeAt(room, room),
      withBag(-8),
      update('a', { resources: 10, hand: ['1', '2', '3', '4', '5', '6'] }),
    ])
    const before = getInvestigator(state, 'a')
    state = use(state, parley(state, vip.key))
    if (state.skillTest) state = resolveTest(state)
    expect(labels(state)).toContain(label)
    state = choose(state, label)
    const after = getInvestigator(state, 'a')
    if (room === CODES.ballroom) expect(after.resources).toBe(before.resources + 2)
    else expect(after.hand.length).toBe(before.hand.length + 1)
    // Límite de grupo: el otro investigador no lo repite esta ronda.
    state = prep(state, [
      update('b', { resources: 10, hand: ['1', '2', '3', '4', '5', '6'], actionsRemaining: 3 }),
    ])
    state = use(state, parley(state, vip.key, 'b'), 'b')
    if (state.skillTest) state = resolveTest(state)
    expect(labels(state)).not.toContain(label)
  })
})

describe('The Last King: agendas, Dianne Devine and Sickening Reality', () => {
  it('Fashionably Late spawns Dianne at the bystander with fewest clues and reshuffles the discard', () => {
    let state = game(2)
    const target = bystander(state, 'Haruko')
    state = during(
      state,
      (s) => ({
        ...s,
        placedAssets: { ...s.placedAssets, [target.id]: { ...target, clues: 1 } },
        encounterDiscard: [{ ...s.encounterDeck[0]! }],
      }),
      { type: 'AdvanceAgenda' },
    )
    const dianne = enemyCode(state, CODES.dianneDevine)!
    expect(dianne.location).toBe(whereIs(state, 'Haruko'))
    expect(state.encounterDiscard).toHaveLength(0)
    expect(state.encounterDeck).toHaveLength(23)
    expect(state.agendaIndex).toBe(1)
  })

  it('Dianne blocks discovering and taking clues at her location and follows the fewest clues', () => {
    let state = game()
    const where = whereIs(state, 'Sebastien')
    state = prep(state, [placeAt(where), withBag(0)], {
      type: 'SpawnSetAsideEnemy',
      code: CODES.dianneDevine,
      location: where,
    })
    state = use(state, parley(state, 'Sebastien'))
    state = resolveTest(state)
    expect(getInvestigator(state, 'a').clues).toBe(0)
    expect(bystander(state, 'Sebastien').clues).toBe(2)
    state = during(state, keep, { type: 'DiscoverClues', investigator: 'a', amount: 1 })
    expect(getInvestigator(state, 'a').clues).toBe(0)
    // Al comienzo de la fase de Enemigos va al Transeúnte con menos pistas.
    const haruko = bystander(state, 'Haruko')
    state = during(
      state,
      (s) => ({ ...s, placedAssets: { ...s.placedAssets, [haruko.id]: { ...haruko, clues: 0 } } }),
      { type: 'Forced', trigger: { type: 'enemyPhaseBegins' } },
    )
    expect(enemyCode(state, CODES.dianneDevine)!.location).toBe(whereIs(state, 'Haruko'))
  })

  it('The Terrifying Truth resolves a random Sickening Reality instead of advancing', () => {
    let state = game(2)
    state = during(state, (s) => ({ ...s, agendaIndex: 1 }))
    const before = bystandersInPlay(state)
    state = prep(
      state,
      [placeAt(CODES.foyer, CODES.foyer)],
      { type: 'PlaceDoom', amount: 3 },
      { type: 'CheckAgenda' },
    )
    while (state.pending?.question.prompt === 'prompt.story')
      state = choose(state, state.pending.question.choices[0]!.label)
    expect(state.agendaIndex).toBe(1)
    expect(state.doom).toBe(0)
    const turned = VIPS.filter((v) => enemyCode(state, v.enemy.code))
    expect(turned).toHaveLength(1)
    const vip = turned[0]!
    const where = before.find((p) => p.code === vip.bystander)!
    const location = where.placement.type === 'location' ? where.placement.location : ''
    expect(enemyCode(state, vip.enemy.code)!.location).toBe(location)
    expect(bystandersInPlay(state)).toHaveLength(4)
    expect(state.locations[location]!.clues).toBe(3)
    expect(String(state.scenarioMeta?.[SICKENING]).split(',')).toHaveLength(4)
  })

  it('Sickening Reality: investigators at the bystander take 1 horror', () => {
    let state = game(2)
    const where = whereIs(state, 'Jordan')
    state = prep(state, [placeAt(where, CODES.foyer)], {
      type: 'ScenarioSpecific',
      key: 'lastKingTurn',
      data: { vip: 'Jordan' },
    })
    expect(getInvestigator(state, 'a').horror).toBe(1)
    expect(getInvestigator(state, 'b').horror).toBe(0)
    expect(enemyCode(state, '03066b')).toMatchObject({ location: where })
  })

  it('with no Sickening Reality left, The Terrifying Truth advances to R3', () => {
    let state = game()
    state = during(
      state,
      (s) => ({ ...s, agendaIndex: 1, scenarioMeta: { ...s.scenarioMeta, [SICKENING]: '' } }),
      { type: 'PlaceDoom', amount: 3 },
      { type: 'CheckAgenda' },
    )
    while (!state.outcome && state.pending)
      state = choose(state, state.pending.question.choices[0]!.label)
    expect(state.outcome).toEqual({ type: 'resolution', resolution: 3 })
  })
})

describe('The Last King: Lunatic VIPs', () => {
  const spawn = (code: string, where: string = CODES.foyer): Message => ({
    type: 'SpawnSetAsideEnemy',
    code,
    location: where,
  })

  it('Constance gets +3 fight while exhausted', () => {
    let state = prep(game(), [], spawn('03065b', CODES.courtyard))
    const id = enemyCode(state, '03065b')!.id
    const fight = (s: GameState) =>
      scenarioBehavior(s.scenarioId)!.enemyStat!(s, s.enemies[id]!, 'fight')
    expect(fight(state)).toBe(0)
    state = during(state, (s) => ({
      ...s,
      enemies: { ...s.enemies, [id]: { ...s.enemies[id]!, exhausted: true } },
    }))
    expect(fight(state)).toBe(3)
  })

  it('Jordan heals 1 damage at the beginning of the enemy phase', () => {
    let state = prep(game(), [], spawn('03066b', CODES.courtyard))
    const id = enemyCode(state, '03066b')!.id
    state = during(state, keep, { type: 'DamageEnemy', enemy: id, amount: 3 })
    state = during(state, keep, { type: 'Forced', trigger: { type: 'enemyPhaseBegins' } })
    expect(state.enemies[id]!.damageTaken).toBe(2)
  })

  it('Haruko: damage by an effect other than an attack draws an encounter card', () => {
    let state = prep(game(), [], spawn('03067b', CODES.courtyard))
    const id = enemyCode(state, '03067b')!.id
    const deck = state.encounterDeck.length
    state = during(state, keep, {
      type: 'DamageEnemy',
      enemy: id,
      amount: 1,
      by: 'a',
      source: { attack: true },
    })
    expect(state.encounterDeck.length).toBe(deck)
    state = during(
      state,
      (s) => ({
        ...s,
        encounterDeck: [
          { ...s.encounterDeck.find((c) => c.code === SETS.ancientEvils)! },
          ...s.encounterDeck,
        ],
      }),
      { type: 'DamageEnemy', enemy: id, amount: 1, by: 'a' },
    )
    expect(state.encounterDeck.length).toBe(deck)
    expect(state.doom).toBe(1)
  })

  it('Sebastien attacks cannot be canceled', () => {
    let state = prep(game(), [], spawn('03068b', CODES.courtyard))
    const id = enemyCode(state, '03068b')!.id
    state = during(state, keep, { type: 'CancelEnemyAttack', enemy: id })
    expect(state.canceledAttack ?? null).toBeNull()
  })

  it('Ashleigh: investigators at her location do not draw during upkeep', () => {
    let state = prep(
      game(2),
      [placeAt(CODES.courtyard, CODES.foyer)],
      spawn('03069b', CODES.courtyard),
    )
    const a = getInvestigator(state, 'a').hand.length
    const b = getInvestigator(state, 'b').hand.length
    state = dispatch({ ...state, pending: null }, { type: 'UpkeepPhase' })
    expect(getInvestigator(state, 'a').hand.length).toBe(a)
    expect(getInvestigator(state, 'b').hand.length).toBe(b + 1)
  })
})
