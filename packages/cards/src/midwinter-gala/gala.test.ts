import { applyInput, createGame, getInvestigator, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { playRandomlyToEnd } from '../scenario-testing'
import { CODES, FACTION_CARDS, GROUND_FLOOR, isGuest } from './cards'
import { midwinterGala, score } from './gala'

const KEYS = ['daniela', 'joe'] as const

function newGame(seed = 3): GameState {
  return createGame({
    seed,
    scenario: midwinterGala({ seed, players: KEYS.length }),
    investigators: KEYS.map((k) => starterInvestigator(k)),
  })
}

/** Elige la facción aliada en la pregunta del contacto misterioso. */
const ally = (game: GameState, faction: string) =>
  choose(game, `story.midwinterGala.contactChoice.${faction}`)

describe('La gala: preparación', () => {
  it('pregunta por el contacto y prepara la facción aliada', () => {
    let game = newGame()
    expect(game.pending?.question.prompt).toBe('prompt.story')
    game = ally(game, 'syndicate')
    expect(game.scenarioMeta?.ally).toBe('syndicate')
    const rival = game.scenarioMeta?.rival
    expect(rival).toBeDefined()
    expect(rival).not.toBe('syndicate')
    // El Líder aliado bajo el control del jefe.
    expect(Object.values(game.assets).some((a) => a.code === FACTION_CARDS.syndicate.leader)).toBe(
      true,
    )
    // 2 Invitados en cada sala de la planta baja (3 aliados y 3 del mazo de Invitados).
    const placed = Object.values(game.placedAssets ?? {}).filter((p) => isGuest(p.code))
    expect(placed).toHaveLength(6)
    for (const room of GROUND_FLOOR) {
      expect(
        placed.filter((p) => p.placement.type === 'location' && p.placement.location === room),
      ).toHaveLength(2)
    }
    expect(game.scenarioDecks?.guests).toHaveLength(6)
    // El Exangüe agotado en la Sala de la Lámpara con La Lámpara Mortecina vinculada.
    const man = Object.values(game.enemies).find((e) => e.code === CODES.bloodlessMan)
    expect(man).toMatchObject({ location: CODES.lanternChamber, exhausted: true })
    const lantern = Object.values(game.placedAssets ?? {}).find((p) => p.code === CODES.paleLantern)
    expect(lantern?.placement).toEqual({ type: 'enemy', enemy: man?.id })
    expect(game.encounterDeck).toHaveLength(23)
  })

  it('negociar con un Invitado (3) te da su control, sin ocupar ranura', () => {
    let game = ally(newGame(), 'foundation')
    if (game.pending?.question.prompt === 'prompt.chooseNextInvestigator') {
      game = choose(game, 'choice.investigator', { name: 'Daniela Reyes' })
    }
    const daniela = starterInvestigator('daniela').id
    const room = GROUND_FLOOR.find((l) => game.locations[l]?.position?.[0] === 1)!
    game = during(game, (s) => ({
      ...s,
      chaosBag: [1],
      investigators: s.investigators.map((i) => (i.id === daniela ? { ...i, location: room } : i)),
    }))
    const parley = game.pending?.question.choices.find(
      (c) => c.label === 'ability.gala.parleyGuest',
    )
    expect(parley).toBeDefined()
    const guest = parley!.params!.card as string
    game = choose(game, 'ability.gala.parleyGuest', {
      card: guest,
      skill: parley!.params!.skill as string,
    })
    for (let n = 0; n < 6 && game.pending?.question.prompt !== 'prompt.chooseAction'; n++) {
      game = applyInput(game, { investigator: game.pending!.investigator, choice: 0 })
    }
    const taken = Object.values(game.assets).find((a) => a.owner === daniela && isGuest(a.code))
    expect(taken).toMatchObject({ noSlot: true })
    expect(getInvestigator(game, daniela).location).toBe(room)
  })
})

describe('La gala: partidas al azar', () => {
  it('10 partidas con decisiones al azar llegan a una resolución', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const game = playRandomlyToEnd(newGame(seed), seed)
      expect(score(game).total).toBeGreaterThanOrEqual(0)
    }
  })
})
