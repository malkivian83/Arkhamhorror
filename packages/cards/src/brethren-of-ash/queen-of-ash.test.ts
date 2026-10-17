import {
  applyInput,
  availableActions,
  createGame,
  emptyCampaignLog,
  getInvestigator,
  type GameState,
} from '@lcg/engine'
import { choose, during, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { finishScenario, newCampaign, startScenario } from '../campaign'
import { code, starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { COLLECTOR, CODES, elokossFaintEmbers, queenOfAsh, servantSacrifice } from './queen-of-ash'
import { CODES as SF } from './spreading-flames'

const DANIELA = code(1)
const inv = (s: GameState) => getInvestigator(s, DANIELA)
const enemies = (s: GameState) => Object.values(s.enemies)
const TUNNELS = [
  CODES.infestedPipes,
  CODES.overgrownTunnels,
  CODES.floodedCrypt,
  CODES.smugglersCache,
  CODES.toxicWastePit,
]

function newGame(log = emptyCampaignLog([DANIELA])): GameState {
  return createGame({
    seed: 7,
    scenario: queenOfAsh({ seed: 2, log, investigators: [DANIELA] }),
    investigators: [starterInvestigator('daniela')],
    campaignLog: log,
  })
}

/** Daniela en un sitio concreto, con pistas. */
const at =
  (location: string, clues = 0) =>
  (s: GameState) => ({
    ...s,
    investigators: s.investigators.map((i) => ({ ...i, location, clues })),
  })

describe('Queen of Ash: preparación y conexiones', () => {
  it('cisterna, 5 túneles y la alcantarilla; se empieza en la alcantarilla', () => {
    const game = newGame()
    expect(Object.keys(game.locations).sort()).toEqual(
      [CODES.undergroundCistern, CODES.sewerCulvert, ...TUNNELS].sort(),
    )
    expect(inv(game).location).toBe(CODES.sewerCulvert)
    expect(game.locations[CODES.sewerCulvert]?.connections.sort()).toEqual([...TUNNELS].sort())
    // Sin revelar, todos los túneles conectan con la alcantarilla y con la cisterna.
    for (const t of TUNNELS) {
      expect(game.locations[t]?.connections.sort()).toEqual(
        [CODES.sewerCulvert, CODES.undergroundCistern].sort(),
      )
    }
    // Sin "descubrieron el paradero", 1 perdición; fichas añadidas según la dificultad.
    expect(game.doom).toBe(1)
    expect(game.campaignLog?.chaosTokens).toEqual(['elderThing', 'tablet'])
  })

  it('al revelar Overgrown Tunnels deja de conectar con la cisterna', () => {
    const game = during(newGame(), (s) => s, {
      type: 'MoveTo',
      investigator: DANIELA,
      location: CODES.overgrownTunnels,
    })
    expect(game.locations[CODES.overgrownTunnels]?.revealed).toBe(true)
    expect(game.locations[CODES.overgrownTunnels]?.connections).toEqual([CODES.sewerCulvert])
    expect(game.locations[CODES.undergroundCistern]?.connections).not.toContain(
      CODES.overgrownTunnels,
    )
  })

  it('entrar en la cisterna cuesta 3 pistas por investigador y avanza el acto', () => {
    const poor = during(newGame(), at(CODES.infestedPipes, 2))
    expect(
      availableActions(poor, DANIELA).some(
        (a) => a.kind === 'move' && a.to === CODES.undergroundCistern,
      ),
    ).toBe(false)
    let game = during(newGame(), at(CODES.infestedPipes, 3))
    game = choose(game, 'action.move', { location: 'Underground Cistern' })
    expect(inv(game)).toMatchObject({ location: CODES.undergroundCistern, clues: 0 })
    expect(game.actIndex).toBe(1)
    expect(enemies(game).some((e) => e.code === CODES.elokoss)).toBe(true)
    expect(game.locations[CODES.sluiceControl]).toBeDefined()
  })
})

describe('Queen of Ash: Elokoss y el plan', () => {
  it('un enemigo en una localización con Fire! no recibe daño', () => {
    let game = during(newGame(), (s) => s, {
      type: 'SpawnEnemy',
      card: elokossFaintEmbers(1),
      location: CODES.sewerCulvert,
      engageWith: null,
    })
    game = during(game, (s) => s, {
      type: 'PlaceSetAsideTreachery',
      code: SF.fire,
      placement: { type: 'location', location: CODES.sewerCulvert },
    })
    const id = enemies(game)[0]!.id
    game = during(game, (s) => s, { type: 'DamageEnemy', enemy: id, amount: 3 })
    expect(game.enemies[id]?.damageTaken).toBe(0)
  })

  it('cinco pistas sobre Elokoss llevan a la resolución 2', () => {
    let game = during(newGame(), at(CODES.undergroundCistern, 5), {
      type: 'SpawnEnemy',
      card: elokossFaintEmbers(1),
      location: CODES.undergroundCistern,
      engageWith: null,
    })
    for (let n = 0; n < 5 && !game.outcome; n++) {
      game = choose(game, 'ability.weakenElokoss')
    }
    expect(game.outcome).toEqual({ type: 'resolution', resolution: 2 })
  })

  it('con el plan final, la perdición se convierte en daño directo', () => {
    let game = during(newGame(), (s) => s, { type: 'SetDoomBecomesDamage' })
    const before = inv(game).damage
    game = during(game, (s) => s, { type: 'PlaceDoom', amount: 1 })
    expect(inv(game).damage).toBe(before + 1)
    expect(game.doom).toBe(1) // la perdición inicial sigue igual
  })

  it('Servant of Flame derrotado: el códex depende del heraldo (Naomi: +5 recursos)', () => {
    const log = {
      ...emptyCampaignLog([DANIELA]),
      notes: ['harbinger'],
      values: { harbinger: "Naomi O'Bannion" },
    }
    let game = during(newGame(log), at(CODES.sewerCulvert), {
      type: 'SpawnEnemy',
      card: { ...servantSacrifice, health: 1, healthPerInvestigator: false },
      location: CODES.sewerCulvert,
      engageWith: DANIELA,
    })
    const resources = inv(game).resources
    game = during(game, (s) => s, { type: 'DamageEnemy', enemy: enemies(game)[0]!.id, amount: 1 })
    game = choose(game, 'choice.continue')
    expect(inv(game).resources).toBe(resources + 5)
  })
})

describe('Queen of Ash: resolución y campaña', () => {
  it('resolución 1: victoria, experiencia +5, trauma 2/2 y campaña ganada', () => {
    const campaign = {
      ...newCampaign('brethren-of-ash', ['daniela'], 'standard'),
      scenarioIndex: 2,
    }
    // Introducciones (1 y 3), mulligan y preparación.
    let game = throughSetup(startScenario(campaign, 4))
    game = during(game, (s) => s, {
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: 1 },
    })
    game = choose(game, 'choice.continue')
    expect(game.outcome).toEqual({ type: 'resolution', resolution: 1 })
    const next = finishScenario(campaign, game)
    expect(next.log.notes).toEqual(expect.arrayContaining(['defeatedElokoss', 'campaignWon']))
    // Recompensa para mazos nuevos.
    expect(next.log.rewards).toEqual([COLLECTOR])
    expect(next.log.investigators[DANIELA]).toMatchObject({
      xp: 5,
      physicalTrauma: 2,
      mentalTrauma: 2,
    })
    expect(next.scenarioIndex).toBe(3)
  })

  it('sin resolución: Elokoss renace y todos mueren', () => {
    const campaign = {
      ...newCampaign('brethren-of-ash', ['daniela'], 'standard'),
      scenarioIndex: 2,
    }
    let game = throughSetup(startScenario(campaign, 4))
    game = during(game, (s) => s, { type: 'EndScenario', outcome: { type: 'noResolution' } })
    game = choose(game, 'choice.continue')
    const log = finishScenario(campaign, game).log
    expect(log.notes).toEqual(expect.arrayContaining(['elokossReborn', 'campaignLost']))
    expect(log.investigators[DANIELA]?.killed).toBe(true)
  })
})

describe('Queen of Ash: robustez', () => {
  it('varias rondas eligiendo siempre la primera opción no rompen el motor', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const log = { ...emptyCampaignLog(['12001', '12004']), notes: ['stirredUpTrouble'] }
      let game = createGame({
        seed,
        difficulty: 'expert',
        scenario: queenOfAsh({
          difficulty: 'expert',
          seed,
          log,
          investigators: ['12001', '12004'],
        }),
        investigators: [starterInvestigator('daniela'), starterInvestigator('joe')],
        campaignLog: log,
      })
      for (let n = 0; n < 400 && !game.outcome && game.pending; n++) {
        game = applyInput(game, { investigator: game.pending.investigator, choice: 0 })
      }
      expect(game.outcome !== null || game.pending !== null).toBe(true)
    }
  })
})
