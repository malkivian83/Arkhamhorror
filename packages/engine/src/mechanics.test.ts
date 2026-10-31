import { describe, expect, it } from 'vitest'
import { registerEnemy, registerScenario, registerTreachery } from './content'
import { getInvestigator } from './state'
import { createGame } from './engine'
import {
  choose,
  during,
  ghoul,
  keep,
  newTestGame,
  spawnAt,
  testInvestigator,
  testScenario,
  throughSetup,
  withBag,
} from './testing'
import type { EncounterCard, GameState, Message, TreacheryCard } from './types'

const inv = (s: GameState, id = 'a') => getInvestigator(s, id)
const treachery = (code: string, keywords: TreacheryCard['keywords'] = []): TreacheryCard => ({
  kind: 'treachery',
  code,
  name: code,
  keywords,
})
const reveal = (card: EncounterCard, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card,
})

// Traiciones de prueba (contenido inventado).
registerTreachery({
  code: 't-smoke',
  // Prueba de voluntad (3): 1 daño por cada punto de fallo.
  revelation: (_s, investigator) => [
    {
      type: 'BeginSkillTest',
      investigator,
      skill: 'willpower',
      difficulty: 3,
      kind: {
        type: 'effect',
        source: 't-smoke',
        onSuccess: [],
        onFail: [],
        onFailEach: [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 }],
      },
    },
  ],
})
registerTreachery({ code: 't-surge', revelation: () => [{ type: 'GainSurge' }] })
registerTreachery({
  code: 't-haunt',
  revelation: (_s, investigator, self) => [
    { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'threatArea', investigator } },
  ],
  forced: (_s, trigger, self) =>
    trigger.type === 'afterDiscoverClues' &&
    self.placement.type === 'threatArea' &&
    self.placement.investigator === trigger.investigator
      ? [{ type: 'TakeDamage', investigator: trigger.investigator, damage: 0, horror: 1 }]
      : [],
})
registerTreachery({
  code: 't-choice',
  revelation: (_s, investigator) => [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEffect',
        choices: [
          {
            label: 'choice.placeClue',
            then: [{ type: 'PlaceCluesOnLocation', investigator, amount: 1 }],
            requires: { type: 'hasClues', investigator },
          },
          {
            label: 'choice.takeHorror',
            then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 1 }],
          },
        ],
      },
    },
  ],
})
registerEnemy({
  code: 'e-burst',
  forced: (s, trigger, self) =>
    trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id
      ? Object.values(s.investigators)
          .filter((i) => i.location === self.location)
          .map((i): Message => ({ type: 'TakeDamage', investigator: i.id, damage: 0, horror: 1 }))
      : [],
})
registerScenario({
  id: 'test-tokens',
  tokenEffect: (s, token, investigator) => {
    switch (token) {
      case 'skull':
        return { modifier: -(s.actIndex + 1) }
      case 'tablet':
        return {
          modifier: -1,
          revealAnother: true,
          onFail: [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 }],
        }
      default:
        return {
          modifier: -3,
          onFailBy: {
            atLeast: 2,
            then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 1 }],
          },
        }
    }
  },
})

describe('traiciones (RR "Treachery")', () => {
  it('se revela, resuelve su efecto y va al descarte de encuentros', () => {
    // voluntad 3, ficha -2 → 1 contra 3: falla por 2 → 2 daño.
    const game = during(newTestGame(), withBag(-2), reveal(treachery('t-smoke')))
    expect(inv(game).damage).toBe(2)
    expect(game.encounterDiscard.map((c) => c.code)).toEqual(['t-smoke'])
    expect(game.treacheries).toEqual({})
  })

  it('oleada por palabra clave: se roba otra carta', () => {
    const game = during(
      newTestGame({ scenario: { encounterDeck: [{ ...ghoul }] } }),
      keep,
      reveal(treachery('t-none', ['surge'])),
    )
    expect(Object.values(game.enemies)).toHaveLength(1)
    expect(game.encounterDeck).toHaveLength(0)
  })

  it('oleada ganada por el efecto', () => {
    const game = during(
      newTestGame({ scenario: { encounterDeck: [{ ...ghoul }] } }),
      keep,
      reveal(treachery('t-surge')),
    )
    expect(Object.values(game.enemies)).toHaveLength(1)
    expect(game.surgePending).toBe(false)
  })

  it('se queda en la zona de amenaza y su forzado se activa al descubrir pistas', () => {
    let game = during(newTestGame(), withBag(0), reveal(treachery('t-haunt')))
    expect(Object.values(game.treacheries)[0]?.placement).toEqual({
      type: 'threatArea',
      investigator: 'a',
    })
    game = choose(game, 'action.investigate')
    expect(inv(game)).toMatchObject({ clues: 1, horror: 1 })
  })

  it('al eliminar al investigador, su zona de amenaza se descarta y deja de tener efecto', () => {
    let game = choose(newTestGame({ players: ['a', 'b'] }), 'choice.investigator', { name: 'A' })
    game = during(game, withBag(0), reveal(treachery('t-haunt'), 'b'))
    expect(Object.values(game.treacheries)).toHaveLength(1)
    game = during(game, keep, { type: 'EliminateInvestigator', investigator: 'b' })
    expect(Object.values(game.treacheries)).toHaveLength(0)
    expect(game.encounterDiscard.map((c) => c.code)).toContain('t-haunt')
  })

  it('las opciones con requisitos no cumplidos no se ofrecen (y una sola se resuelve sola)', () => {
    const game = during(newTestGame(), keep, reveal(treachery('t-choice')))
    expect(inv(game).horror).toBe(1)
    const withClues = during(
      newTestGame(),
      (s) => ({ ...s, investigators: s.investigators.map((i) => ({ ...i, clues: 1 })) }),
      reveal(treachery('t-choice')),
    )
    expect(withClues.pending?.question.choices.map((c) => c.label)).toEqual([
      'choice.placeClue',
      'choice.takeHorror',
    ])
    const placed = choose(withClues, 'choice.placeClue')
    expect(inv(placed).clues).toBe(0)
    expect(placed.locations.A?.clues).toBe(3)
  })

  it('robar una copia del descarte de encuentros', () => {
    let game = during(newTestGame(), withBag(0), reveal(treachery('t-smoke')))
    game = during(game, withBag(-5), {
      type: 'DrawFromEncounterDiscard',
      investigator: 'a',
      code: 't-smoke',
    })
    // voluntad 3, ficha -5 → 0 contra 3: falla por 3.
    expect(inv(game).damage).toBe(3)
  })
})

describe('efectos de las fichas del caos', () => {
  const scenario = { id: 'test-tokens' }

  it('el modificador puede depender del estado (número del acto)', () => {
    // intelecto 3, calavera -1 (acto 1) → 2 contra velo 2: éxito.
    const game = choose(during(newTestGame({ scenario }), withBag('skull')), 'action.investigate')
    expect(inv(game).clues).toBe(1)
  })

  it('"revela otra ficha" suma ambas y aplica sus efectos al fallar', () => {
    // Dos tablillas: la primera revela la segunda. -1 + -1 = -2 → 1 contra 2:
    // falla, y cada tablilla aplica su "si fallas, 1 daño".
    const game = choose(
      during(newTestGame({ scenario }), withBag('tablet', 'tablet')),
      'action.investigate',
    )
    expect(inv(game)).toMatchObject({ clues: 0, damage: 2 })
    expect(game.chaosBag).toEqual(['tablet', 'tablet'])
  })

  it('efecto "si fallas por N o más"', () => {
    // primigenio -3 → 0 contra 2: falla por 2 → 1 horror.
    const game = choose(
      during(newTestGame({ scenario }), withBag('elderThing')),
      'action.investigate',
    )
    expect(inv(game).horror).toBe(1)
  })

  it('las fichas vuelven a la bolsa al terminar la prueba', () => {
    const game = choose(during(newTestGame(), withBag(0, -1, 'skull')), 'action.investigate')
    expect(game.chaosBag).toHaveLength(3)
  })
})

describe('enemigos: condenado, presa y forzados', () => {
  it('condenado: al ser derrotado coloca 1 perdición', () => {
    let game = during(
      newTestGame(),
      withBag(0),
      spawnAt('A', { ...ghoul, health: 1, keywords: ['doomed'] }),
    )
    game = choose(game, 'action.fight', { enemy: 'Ghoul' })
    expect(game.doom).toBe(1)
  })

  it('forzado al ser derrotado', () => {
    let game = during(
      newTestGame(),
      withBag(0),
      spawnAt('A', { ...ghoul, code: 'e-burst', health: 1 }),
    )
    game = choose(game, 'action.fight', { enemy: 'Ghoul' })
    expect(inv(game).horror).toBe(1)
  })

  it('presa: se enfrenta al de menor agilidad', () => {
    let game = newTestGame({ players: ['a', 'b'] })
    game = choose(game, 'choice.investigator', { name: 'A' })
    game = during(
      game,
      (s) => ({
        ...s,
        investigators: s.investigators.map((i) =>
          i.id === 'b' ? { ...i, skills: { ...i.skills, agility: 1 } } : i,
        ),
      }),
      spawnAt('A', { ...ghoul, prey: { type: 'lowestSkill', skill: 'agility' } }),
    )
    expect(Object.values(game.enemies)[0]?.engagedWith).toBe('b')
  })
})

describe('inicio de la partida', () => {
  const table = () =>
    createGame({
      seed: 1,
      interactive: true,
      scenario: testScenario(),
      investigators: [testInvestigator('a'), testInvestigator('b'), testInvestigator('c')],
    })

  it('el grupo elige jefe y pasa a ser el primero en orden de jugadores', () => {
    let s = table()
    expect(s.pending?.question.prompt).toBe('prompt.chooseLead')
    s = choose(s, 'choice.investigator', { name: 'B' })
    expect(s.investigators.map((i) => i.id)).toEqual(['b', 'c', 'a'])
    // Después, cada uno decide su mulligan, empezando por el jefe.
    expect(s.pending?.question.prompt).toBe('prompt.mulligan')
    expect(s.pending?.investigator).toBe('b')
  })

  it('sin la mesa no hay preguntas de preparación', () => {
    const s = newTestGame({ players: ['a', 'b'] })
    expect(s.pending?.question.prompt).not.toBe('prompt.chooseLead')
    expect(throughSetup(table()).pending?.question.prompt).toBe('prompt.chooseNextInvestigator')
  })
})

describe('decisiones del jefe (FAQ 1.5)', () => {
  const table = (scenario = testScenario()) => {
    const s = throughSetup(
      createGame({
        seed: 1,
        interactive: true,
        scenario,
        investigators: [testInvestigator('a'), testInvestigator('b'), testInvestigator('c')],
      }),
    )
    return choose(s, 'choice.investigator', { name: 'A' })
  }
  const prompt = (s: GameState) => s.pending?.question.prompt

  it('con varios investigadores en la localización, el jefe elige con quién se enfrenta', () => {
    let s = during(table(), keep, spawnAt('A'))
    expect(prompt(s)).toBe('prompt.chooseEngaged')
    s = choose(s, 'choice.investigator', { name: 'C' })
    expect(Object.values(s.enemies)[0]?.engagedWith).toBe('c')
  })

  it('cada investigador elige en qué orden le atacan sus enemigos', () => {
    let s = during(
      table(),
      keep,
      spawnAt('A', { ...ghoul, name: 'Uno' }, 'a'),
      spawnAt('A', { ...ghoul, name: 'Dos' }, 'a'),
      { type: 'EnemiesAttack' },
    )
    expect(prompt(s)).toBe('prompt.chooseAttackOrder')
    s = choose(s, 'choice.attackFirst', { enemy: 'Dos' })
    expect(Object.values(s.enemies).find((e) => e.name === 'Dos')?.exhausted).toBe(true)
  })

  it('el jefe elige quién paga las pistas del acto', () => {
    const withClues = (s: GameState): GameState => ({
      ...s,
      investigators: s.investigators.map((i) => ({ ...i, clues: 3 })),
    })
    let s = during(table(), withClues, { type: 'AdvanceAct' })
    expect(prompt(s)).toBe('prompt.whoPaysClue')
    // 6 pistas (2 por investigador): 3 de A y 3 de B.
    for (let n = 0; n < 3; n++) s = choose(s, 'choice.investigatorPaysClue', { name: 'A' })
    for (let n = 0; n < 3; n++) s = choose(s, 'choice.investigatorPaysClue', { name: 'B' })
    expect(s.investigators.map((i) => i.clues)).toEqual([0, 0, 3])
    expect(s.log.some((entry) => entry.key === 'log.actAdvanced')).toBe(true)
  })

  it('un cazador con dos caminos igual de cortos: el jefe elige por dónde va', () => {
    const room = (id: string, connections: string[]) => ({
      id,
      name: `Room ${id}`,
      shroud: 1,
      clueValue: 0,
      cluesPerInvestigator: false,
      connections,
    })
    const scenario = testScenario({
      locations: [
        room('A', ['B', 'C']),
        room('B', ['A', 'D']),
        room('C', ['A', 'D']),
        room('D', ['B', 'C']),
      ],
    })
    let s = during(table(scenario), keep, spawnAt('D', { ...ghoul, keywords: ['hunter'] }), {
      type: 'HuntersMove',
    })
    expect(prompt(s)).toBe('prompt.chooseHunterPath')
    s = choose(s, 'choice.moveEnemyTo', { enemy: ghoul.name, location: 'Room C' })
    expect(Object.values(s.enemies)[0]?.location).toBe('C')
  })
})

describe('origen del daño', () => {
  const sources = (s: GameState) =>
    s.log.filter((e) => e.key === 'log.damage').map((e) => e.params?.source)

  it('la prueba de una traición, su efecto obligado y una ficha del caos', () => {
    // Prueba de voluntad de la traición: el daño viene de la carta que la exige.
    const smoke = during(newTestGame(), withBag(-2), reveal(treachery('t-smoke')))
    expect(sources(smoke)).toEqual(['t-smoke', 't-smoke'])
    // Forzado de una traición en la zona de amenaza.
    let haunt = during(newTestGame(), withBag(0), reveal(treachery('t-haunt')))
    haunt = choose(haunt, 'action.investigate')
    expect(sources(haunt)).toEqual(['t-haunt'])
    // "Si fallas, 1 daño" de la tablilla.
    const token = choose(
      during(newTestGame({ scenario: { id: 'test-tokens' } }), withBag('tablet', 'tablet')),
      'action.investigate',
    )
    expect(sources(token)).toEqual(['token:tablet', 'token:tablet'])
  })

  it('el ataque de un enemigo', () => {
    const attacked = during(newTestGame(), keep, spawnAt('A', ghoul, 'a'), {
      type: 'EnemiesAttack',
    })
    expect(sources(attacked)).toEqual(['Ghoul'])
  })
})
