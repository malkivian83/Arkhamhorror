import {
  applyInput,
  getInvestigator,
  type EncounterCard,
  type GameState,
  type InvestigatorSetup,
  type Message,
} from '@lcg/engine'
import {
  createTestGame,
  choose,
  during,
  keep,
  testInvestigator,
  withBag,
} from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import type { Difficulty } from './campaign'
import { CODES, encounterDeck, fire, servantOfFlame, spreadingFlames } from './spreading-flames'

const ROOM = CODES.yourFriendsRoom
const inv = (s: GameState, id = 'a') => getInvestigator(s, id)
const card = (code: string): EncounterCard => {
  const found = encounterDeck.find((c) => c.code === code)
  if (!found) throw new Error(code)
  return found
}
const reveal = (c: EncounterCard, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card: c,
})

function newGame(
  options: {
    players?: string[]
    difficulty?: Difficulty
    investigator?: Partial<InvestigatorSetup>
  } = {},
): GameState {
  const difficulty = options.difficulty ?? 'standard'
  return createTestGame({
    seed: 7,
    difficulty,
    scenario: spreadingFlames(difficulty),
    investigators: (options.players ?? ['a']).map((id) =>
      testInvestigator(id, options.investigator),
    ),
  })
}

describe('Spreading Flames: preparación', () => {
  it('solo Your Friend’s Room en juego, con 2 pistas por investigador', () => {
    const game = newGame({ players: ['a', 'b'] })
    expect(Object.keys(game.locations)).toEqual([ROOM])
    expect(game.locations[ROOM]).toMatchObject({ revealed: true, clues: 4 })
  })

  it('mazo de 24 encuentros; 5 Fire! y Servant of Flame apartados; bolsa de 16', () => {
    const game = newGame()
    expect(game.encounterDeck).toHaveLength(24)
    expect(game.setAside.map((c) => c.code).sort()).toEqual(
      [...Array(5).fill(CODES.fire), CODES.servantOfFlame].sort(),
    )
    expect(game.chaosBag).toHaveLength(16)
    expect(game.agendas.map((a) => a.doomThreshold)).toEqual([3, 5, 10])
  })
})

describe('Spreading Flames: tarjeta de referencia', () => {
  it('calavera: −(número del acto); +1 más en difícil', () => {
    // intelecto 3 contra velo 2. Normal: 3 − 1 = 2 → éxito. Difícil: 3 − 2 = 1 → fallo.
    const standard = choose(during(newGame(), withBag('skull')), 'action.investigate')
    expect(inv(standard).clues).toBe(1)
    const hard = choose(
      during(newGame({ difficulty: 'hard' }), withBag('skull')),
      'action.investigate',
    )
    expect(inv(hard).clues).toBe(0)
  })

  it('tablilla: revela otra ficha y, si fallas, 1 daño', () => {
    // Dos tablillas: −1 + −1 = −2 → 1 contra 2: fallo, 1 daño por cada tablilla.
    const game = choose(during(newGame(), withBag('tablet', 'tablet')), 'action.investigate')
    expect(inv(game)).toMatchObject({ clues: 0, damage: 2 })
  })

  it('primigenio: si fallas por 2 o más, robas un Fire! del descarte', () => {
    let game = during(newGame(), (s) => ({ ...s, encounterDiscard: [{ ...fire }] }))
    game = choose(during(game, withBag('elderThing')), 'action.investigate')
    // 3 − 3 = 0 contra 2: falla por 2 → Fire! se une a la localización más cercana sin fuego.
    const fires = Object.values(game.treacheries).filter((t) => t.code === CODES.fire)
    expect(fires).toHaveLength(1)
    expect(fires[0]?.placement).toEqual({ type: 'location', location: ROOM })
    expect(game.encounterDiscard).toHaveLength(0)
  })
})

describe('Spreading Flames: traiciones', () => {
  it('Fire!: al terminar la fase de investigación, 1 daño a cada no Élite en su localización', () => {
    let game = during(newGame(), keep, reveal(fire), {
      type: 'SpawnEnemy',
      card: servantOfFlame,
      location: ROOM,
      engageWith: null,
    })
    game = choose(game, 'action.endTurn')
    // 1 por el fuego + 2 del ataque del Servant of Flame (Élite: el fuego no le daña).
    expect(inv(game).damage).toBe(3)
    expect(Object.values(game.enemies)[0]?.damageTaken).toBe(0)
  })

  it('Noxious Smoke: eliges la habilidad y recibes 1 daño por punto de fallo', () => {
    let game = during(newGame(), withBag(-2), reveal(card(CODES.noxiousSmoke)))
    expect(game.pending?.question.prompt).toBe('prompt.chooseSkill')
    game = choose(game, 'choice.test.agility')
    // agilidad 3 − 2 = 1 contra 3 → falla por 2.
    expect(inv(game).damage).toBe(2)
  })

  it('Mutated!: +2 de dificultad con un enemigo en tu localización', () => {
    // voluntad 3 contra 2: éxito sin enemigo; contra 4 con enemigo: falla.
    const calm = during(newGame(), withBag(0), reveal(card(CODES.mutated)))
    expect(inv(calm).damage).toBe(0)
    let busy = during(
      newGame(),
      withBag(0),
      {
        type: 'SpawnEnemy',
        card: card(CODES.bystander) as never,
        location: ROOM,
        engageWith: null,
      },
      reveal(card(CODES.mutated)),
    )
    busy = choose(busy, 'choice.takeTwoDamage')
    expect(inv(busy).damage).toBe(2)
  })

  it('Cosmic Evils: perdición, o daño y horror directos con oleada', () => {
    const doom = choose(
      during(newGame(), keep, reveal(card(CODES.cosmicEvils))),
      'choice.placeDoom',
    )
    expect(doom.doom).toBe(1)
    const hurt = choose(
      during(
        newGame(),
        (s) => ({ ...s, encounterDeck: [card(CODES.bystander)] }),
        reveal(card(CODES.cosmicEvils)),
      ),
      'choice.damageHorrorSurge',
    )
    expect(inv(hurt)).toMatchObject({ damage: 1, horror: 1 })
    expect(Object.values(hurt.enemies)).toHaveLength(1) // oleada: robó el Bystander
  })

  it('Forbidden Secrets: sin pistas gana oleada', () => {
    const game = during(
      newGame(),
      (s) => ({ ...s, encounterDeck: [card(CODES.bystander)] }),
      reveal(card(CODES.forbiddenSecrets)),
    )
    expect(Object.values(game.enemies)).toHaveLength(1)
  })

  it('Unspeakable Truths: máximo 1 por investigador y 1 horror al descubrir pistas', () => {
    let game = during(
      newGame(),
      withBag(0),
      reveal(card(CODES.unspeakableTruths)),
      reveal(card(CODES.unspeakableTruths)),
    )
    expect(Object.values(game.treacheries)).toHaveLength(1)
    expect(game.encounterDiscard.map((c) => c.code)).toEqual([CODES.unspeakableTruths])
    game = choose(game, 'action.investigate')
    expect(inv(game).horror).toBe(1)
  })

  it('Wild Compulsion: sin cartas ni recursos no hay opciones que aplicar', () => {
    const game = during(
      newGame(),
      (s) => ({
        ...s,
        chaosBag: [-5],
        investigators: s.investigators.map((i) => ({ ...i, hand: [], resources: 0 })),
      }),
      reveal(card(CODES.wildCompulsion)),
    )
    expect(game.pending?.question.prompt).toBe('prompt.chooseAction')
  })
})

describe('Spreading Flames: enemigos', () => {
  it('Bystander es condenado: al derrotarlo, 1 perdición', () => {
    let game = during(newGame(), withBag(0), {
      type: 'SpawnEnemy',
      card: card(CODES.bystander) as never,
      location: ROOM,
      engageWith: null,
    })
    game = choose(game, 'action.fight', { enemy: 'Bystander' })
    expect(game.doom).toBe(1)
  })

  it('Mutated Experiment: al morir, 1 horror a cada investigador de su localización', () => {
    let game = during(newGame(), withBag(5), {
      type: 'SpawnEnemy',
      card: { ...(card(CODES.mutatedExperiment) as never as object), health: 1 } as never,
      location: ROOM,
      engageWith: null,
    })
    game = choose(game, 'action.fight', { enemy: 'Mutated Experiment' })
    expect(inv(game).horror).toBe(1)
  })

  it('Servant of Flame se enfrenta al investigador de menor agilidad', () => {
    let game = newGame({ players: ['a', 'b'] })
    game = choose(game, 'choice.investigator', { name: 'A' })
    game = during(
      game,
      (s) => ({
        ...s,
        investigators: s.investigators.map((i) =>
          i.id === 'b' ? { ...i, skills: { ...i.skills, agility: 1 } } : i,
        ),
      }),
      { type: 'SpawnEnemy', card: servantOfFlame, location: ROOM, engageWith: null },
    )
    expect(Object.values(game.enemies)[0]).toMatchObject({ engagedWith: 'b', maxHealth: 10 })
  })
})

describe('Spreading Flames: robustez', () => {
  it('varias rondas eligiendo siempre la primera opción no rompen el motor', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      let game = createTestGame({
        seed,
        scenario: spreadingFlames('expert'),
        difficulty: 'expert',
        investigators: [testInvestigator('a'), testInvestigator('b')],
      })
      for (let n = 0; n < 300 && !game.outcome && game.pending; n++) {
        game = applyInput(game, { investigator: game.pending.investigator, choice: 0 })
      }
      expect(game.outcome !== null || game.pending !== null).toBe(true)
    }
  })
})
