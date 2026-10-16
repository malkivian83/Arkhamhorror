import { describe, expect, it } from 'vitest'
import { registerEnemy, registerScenario, registerTreachery } from './content'
import { getInvestigator } from './state'
import { choose, during, ghoul, keep, newTestGame, spawnAt, withBag } from './testing'
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
