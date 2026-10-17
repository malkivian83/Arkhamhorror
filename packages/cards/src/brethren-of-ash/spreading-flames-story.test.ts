import {
  applyInput,
  createGame,
  dispatch,
  getInvestigator,
  type GameState,
  type InvestigatorSetup,
  type Message,
} from '@lcg/engine'
import { choose, during, keep, labels, testInvestigator, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { CODES, DR_ARMITAGE, hellhound, servantOfFlame, spreadingFlames } from './spreading-flames'

const inv = (s: GameState, id = 'a') => getInvestigator(s, id)
const enemies = (s: GameState) => Object.values(s.enemies)
const fires = (s: GameState) => Object.values(s.treacheries).filter((t) => t.code === CODES.fire)

function newGame(players = ['a'], investigator: Partial<InvestigatorSetup> = {}): GameState {
  return createGame({
    seed: 11,
    scenario: spreadingFlames('standard'),
    investigators: players.map((id) => testInvestigator(id, investigator)),
  })
}

const set = (patch: (s: GameState) => Partial<GameState>) => (s: GameState) => ({
  ...s,
  ...patch(s),
})
const at = (location: string, extra: object = {}) =>
  set((s) => ({ investigators: s.investigators.map((i) => ({ ...i, location, ...extra })) }))
const spawn = (location: string, card = servantOfFlame): Message => ({
  type: 'SpawnEnemy',
  card,
  location,
  engageWith: null,
})
const bystander = {
  kind: 'enemy' as const,
  code: CODES.bystander,
  name: 'Bystander',
  fight: 1,
  health: 1,
  evade: 1,
  damage: 1,
  horror: 0,
  keywords: ['doomed' as const],
}

/** Responde con la primera opción a cualquier pregunta hasta volver al menú de acciones. */
function toActionMenu(game: GameState): GameState {
  let g = game
  for (let n = 0; n < 20 && g.pending && g.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    g = applyInput(g, { investigator: g.pending.investigator, choice: 0 })
  }
  return g
}

/** Avanza el acto 1 con las pistas de la habitación (2 investigaciones y fin de ronda). */
function advanceAct1(game: GameState): GameState {
  let g = during(game, withBag(0))
  g = choose(g, 'action.investigate')
  g = choose(g, 'action.investigate')
  g = choose(g, 'action.endTurn')
  expect(g.pending?.question.prompt).toBe('prompt.advanceAct')
  return toActionMenu(choose(g, 'action.advanceAct'))
}

describe('Spreading Flames: plan', () => {
  it('parlamento: intelecto (2) para descartar un Bystander (sin perdición) y sin ataques de oportunidad', () => {
    let game = during(newGame(), withBag(0), spawn(CODES.yourFriendsRoom, bystander))
    expect(labels(game)).toContain('ability.parleyBystander')
    game = choose(game, 'ability.parleyBystander')
    expect(enemies(game)).toHaveLength(0)
    expect(game.doom).toBe(0)
    expect(inv(game).damage).toBe(0)
  })

  it('Past Curfew al avanzar: cada investigador prueba voluntad (3); quien falla, 1 horror', () => {
    const firstTurn = choose(newGame(['a', 'b']), 'choice.investigator', { name: 'A' })
    const game = during(firstTurn, withBag(-1), { type: 'AdvanceAgenda' })
    expect(game.agendaIndex).toBe(1)
    expect(inv(game, 'a').horror).toBe(1)
    expect(inv(game, 'b').horror).toBe(1)
  })

  it('Lit Up al avanzar: 4 Fire! apartados al descarte y prueba de agilidad (3)', () => {
    const game = during(newGame(), (s) => ({ ...withBag(0)(s), agendaIndex: 1 }), {
      type: 'AdvanceAgenda',
    })
    expect(game.encounterDiscard.filter((c) => c.code === CODES.fire)).toHaveLength(4)
    expect(game.setAside.filter((c) => c.code === CODES.fire)).toHaveLength(1)
    expect(inv(game).damage).toBe(0)
  })

  it('Wild Flames: tras colocar perdición se roba un Fire! del descarte; al avanzar, todos derrotados', () => {
    let game = during(
      newGame(),
      (s) => ({ ...s, agendaIndex: 2 }),
      {
        type: 'MoveSetAsideToEncounterDiscard',
        code: CODES.fire,
        count: 1,
      },
      { type: 'PlaceDoom', amount: 1 },
    )
    expect(fires(game)).toHaveLength(1)
    game = during(game, keep, { type: 'AdvanceAgenda' })
    expect(inv(game).eliminated).toBe(true)
    expect(game.outcome).toEqual({ type: 'noResolution' })
  })
})

describe('Spreading Flames: actos', () => {
  it('acto 1 → entran Dormitories y Miskatonic Quad, aparece Servant of Flame y empieza el fuego', () => {
    const game = advanceAct1(newGame())
    expect(game.actIndex).toBe(1)
    expect(Object.keys(game.locations).sort()).toEqual(
      [CODES.yourFriendsRoom, CODES.dormitories, CODES.miskatonicQuad].sort(),
    )
    const servant = enemies(game).find((e) => e.code === CODES.servantOfFlame)
    expect(servant).toBeDefined()
    // Un Fire! en la habitación; los otros 4, en el descarte.
    expect(fires(game).map((f) => f.placement)).toEqual([
      { type: 'location', location: CODES.yourFriendsRoom },
    ])
    expect(game.setAside.filter((c) => c.code === CODES.fire)).toHaveLength(0)
  })

  it('acto 2 avanza solo al reunirse todos en Miskatonic Quad', () => {
    let game = advanceAct1(newGame())
    game = during(game, at(CODES.dormitories))
    game = choose(game, 'action.move', { location: 'Miskatonic Quad' })
    expect(game.actIndex).toBe(2)
    expect(game.locations[CODES.yourFriendsRoom]).toBeUndefined()
    expect(Object.keys(game.locations)).toEqual(
      expect.arrayContaining([CODES.orneLibrary, CODES.scienceHall, CODES.warrenObservatory]),
    )
    expect(game.setAside.map((c) => c.code)).toContain(CODES.servantOfFlame)
  })

  it('acto 3 solo cuenta pistas de quien está en Orne Library; al avanzar vuelve Servant of Flame', () => {
    let game = advanceAct1(newGame())
    game = during(game, at(CODES.dormitories))
    game = choose(game, 'action.move', { location: 'Miskatonic Quad' })
    game = during(game, at(CODES.miskatonicQuad, { clues: 3 }))
    game = toActionMenu(choose(game, 'action.endTurn'))
    expect(game.actIndex).toBe(2) // no está en la biblioteca: no se ofrece
    game = during(game, at(CODES.orneLibrary, { clues: 3 }))
    game = choose(game, 'action.endTurn')
    game = choose(game, 'action.advanceAct')
    // Hay un Fire! en el descarte: el jefe elige buscar solo ahí o también en el mazo.
    game = choose(game, 'choice.fireFromDiscard')
    expect(game.actIndex).toBe(3)
    expect(enemies(game).find((e) => e.code === CODES.servantOfFlame)?.location).toBe(
      CODES.miskatonicQuad,
    )
    expect(game.locations[CODES.miskatonicQuad]?.clues).toBe(3)
    // El Dr. Henry Armitage entra en juego bajo su control, sin ocupar ranura de aliado.
    expect(Object.values(game.assets).find((a) => a.code === DR_ARMITAGE)).toMatchObject({
      owner: 'a',
      noSlot: true,
    })
  })

  it('acto 4: gastar pistas para dañar y, al derrotar a Servant of Flame, resolución 1', () => {
    let game = during(
      newGame(),
      (s) => ({ ...at(CODES.yourFriendsRoom, { clues: 5 })(s), actIndex: 3 }),
      spawn(CODES.yourFriendsRoom),
    )
    for (let n = 0; n < 5; n++) game = choose(game, 'ability.blazeDamage')
    expect(game.outcome).toEqual({ type: 'resolution', resolution: 1 })
  })

  it('acto 4: retirarse no provoca ataques de oportunidad y deja las pistas', () => {
    let game = during(
      newGame(),
      (s) => ({ ...at(CODES.yourFriendsRoom, { clues: 2 })(s), actIndex: 3 }),
      spawn(CODES.yourFriendsRoom),
    )
    game = choose(game, 'ability.resign')
    expect(inv(game)).toMatchObject({ resigned: true, eliminated: true, damage: 0 })
    expect(game.outcome).toEqual({ type: 'noResolution' })
  })
})

describe('Spreading Flames: localizaciones y traiciones activables', () => {
  const withAll = (s: GameState): GameState => ({
    ...s,
    locations: Object.fromEntries(
      [CODES.yourFriendsRoom, CODES.dormitories, CODES.miskatonicQuad, CODES.orneLibrary].map(
        (id) => [
          id,
          {
            ...(s.locations[id] ?? (s.setAsideLocations[id] as never)),
            revealed: true,
            clues: 1,
          } as never,
        ],
      ),
    ),
  })

  it('Dormitories: curar 1 y 1, una vez por partida', () => {
    let game = during(newGame(), (s) => ({
      ...at(CODES.dormitories, { damage: 2, horror: 2 })(withAll(s)),
    }))
    game = choose(game, 'ability.heal')
    expect(inv(game)).toMatchObject({ damage: 1, horror: 1 })
    expect(labels(game)).not.toContain('ability.heal')
  })

  it('Orne Library: 2 acciones para robar 3 cartas', () => {
    let game = during(newGame(), (s) => at(CODES.orneLibrary)(withAll(s)))
    game = choose(game, 'ability.orneDraw')
    expect(inv(game).hand).toHaveLength(8)
    expect(inv(game).actionsRemaining).toBe(1)
  })

  it('Miskatonic Quad: movimiento rápido, límite de grupo una vez por ronda', () => {
    let game = during(newGame(), (s) => at(CODES.miskatonicQuad)(withAll(s)))
    game = choose(game, 'ability.quadMove', { location: 'Orne Library' })
    expect(inv(game)).toMatchObject({ location: CODES.orneLibrary, actionsRemaining: 3 })
    game = choose(game, 'action.move', { location: 'Miskatonic Quad' })
    expect(labels(game)).not.toContain('ability.quadMove')
  })

  it('Your Friend’s Room: atraer un enemigo de una localización conectada', () => {
    let game = during(newGame(), withAll, spawn(CODES.dormitories, bystander))
    game = choose(game, 'ability.engageFromConnecting', { enemy: 'Bystander' })
    expect(enemies(game)[0]).toMatchObject({ location: CODES.yourFriendsRoom, engagedWith: 'a' })
    expect(inv(game).damage).toBe(0)
  })

  it('Fire!: acción de agilidad (3) para apagarlo', () => {
    let game = during(newGame(), withBag(0), {
      type: 'PlaceSetAsideTreachery',
      code: CODES.fire,
      placement: { type: 'location', location: CODES.yourFriendsRoom },
    })
    game = choose(game, 'ability.discardFire')
    expect(fires(game)).toHaveLength(0)
  })
})

describe('Spreading Flames: Dr. Henry Armitage y Hellhound', () => {
  const withArmitage: Message = {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code: DR_ARMITAGE,
    noSlot: true,
  }

  it('Armitage: la primera acción del turno no provoca ataques de oportunidad', () => {
    let game = during(newGame(), keep, withArmitage, {
      type: 'SpawnEnemy',
      card: servantOfFlame,
      location: CODES.yourFriendsRoom,
      engageWith: 'a',
    })
    game = choose(game, 'action.resource')
    expect(game.pending?.question.prompt).toBe('prompt.chooseAction')
    // La segunda sí: hay que repartir el daño del ataque.
    game = choose(game, 'action.resource')
    expect(game.pending?.question.prompt).toBe('prompt.assignDamage')
  })

  it('Hellhound: tras atacarte en la fase de enemigos, descartas un apoyo', () => {
    let game = during(newGame(), keep, withArmitage, {
      type: 'SpawnEnemy',
      card: hellhound,
      location: CODES.yourFriendsRoom,
      engageWith: 'a',
    })
    game = dispatch({ ...game, pending: null }, { type: 'EnemyPhase' })
    // Reparte el daño del ataque y, después, descarta un apoyo.
    const assigning = ['prompt.assignDamage', 'prompt.assignHorror']
    for (let n = 0; n < 5 && assigning.includes(game.pending?.question.prompt ?? ''); n++) {
      game = applyInput(game, { investigator: 'a', choice: 0 })
    }
    // Su único apoyo (Armitage, que sobrevive al ataque) se descarta.
    expect(Object.values(game.assets)).toHaveLength(0)
    expect(inv(game).discard).toContain(DR_ARMITAGE)
  })
})
