import {
  applyInput,
  availableActions,
  getInvestigator,
  type EnemyCard,
  type GameState,
} from '@lcg/engine'
import {
  createTestGame,
  keepOpeningHands,
  choose,
  during,
  labels,
  withBag,
} from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { finishScenario, newCampaign, startScenario, type Campaign } from '../campaign'
import { code, starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { CODES, eliteCount, servantOnTheRun, smokeAndMirrors, suspects } from './smoke-and-mirrors'
import { DR_ARMITAGE } from './spreading-flames'

const DANIELA = code(1)
const inv = (s: GameState) => getInvestigator(s, DANIELA)
const enemies = (s: GameState) => Object.values(s.enemies)
const suspect = (c: string) => suspects.find((s) => s.code === c)!

function newGame(options: Parameters<typeof smokeAndMirrors>[0] = {}): GameState {
  return createTestGame({
    seed: 7,
    scenario: smokeAndMirrors({ players: 1, seed: 3, ...options }),
    investigators: [starterInvestigator('daniela')],
  })
}

const here = (s: GameState) => inv(s).location!
const spawnHere = (s: GameState, card: EnemyCard, engage = false) =>
  ({ type: 'SpawnEnemy', card, location: here(s), engageWith: engage ? DANIELA : null }) as const

describe('Smoke and Mirrors: preparación', () => {
  it('9 localizaciones, 6 cartas boca abajo y el heraldo apartado', () => {
    const game = newGame()
    expect(Object.keys(game.locations)).toHaveLength(9)
    const beneath = Object.values(game.locations).flatMap((l) => l.beneath ?? [])
    expect(beneath).toHaveLength(6)
    expect(beneath.map((c) => c.code)).toContain(CODES.servantOfFlame)
    // El heraldo es el sospechoso que no está debajo de ninguna localización.
    const harbinger = game.setAside.find((c) => suspects.some((s) => s.code === c.code))
    expect(harbinger).toBeDefined()
    expect(beneath.map((c) => c.code)).not.toContain(harbinger!.code)
    // Se empieza en la Universidad (en llamas si no se salvó), con 1 perdición.
    expect(here(game)).toBe(CODES.universityInFlames)
    expect(game.doom).toBe(1)
    expect(game.chaosBag.filter((t) => t === 'cultist')).toHaveLength(2)
  })

  it('desde la campaña: Quiet Campus, +1 perdición y Armitage en juego sin ranura', () => {
    const campaign = newCampaign(['daniela'], 'standard')
    const record = campaign.log.investigators[DANIELA]!
    const after: Campaign = {
      ...campaign,
      scenarioIndex: 1,
      log: {
        ...campaign.log,
        notes: ['savedUniversity'],
        investigators: { [DANIELA]: { ...record, storyAssets: [DR_ARMITAGE] } },
      },
    }
    const game = keepOpeningHands(startScenario(after, 5, false))
    expect(here(game)).toBe(CODES.universityQuietCampus)
    expect(game.doom).toBe(2)
    const armitage = Object.values(game.assets).find((a) => a.code === DR_ARMITAGE)
    expect(armitage).toMatchObject({ owner: DANIELA, noSlot: true })
    expect(inv(game).deck).not.toContain(DR_ARMITAGE)
    // Las fichas de sectario quedan en el registro para el resto de la campaña.
    expect(game.campaignLog?.chaosTokens).toEqual(['cultist', 'cultist'])
  })
})

describe('Smoke and Mirrors: sospechosos y códex', () => {
  it('Abigail Foreman: parlamento con éxito, pista y queda interrogada (1 investigador)', () => {
    let game = during(newGame(), (s) => withBag(0)(s))
    game = during(game, (s) => s, spawnHere(game, suspect(CODES.abigailForeman)))
    game = choose(game, 'ability.parleyTest', { enemy: 'Abigail Foreman' })
    expect(enemies(game).some((e) => e.code === CODES.abigailForeman)).toBe(false)
    expect(game.underAct).toEqual([CODES.abigailForeman])
    expect(eliteCount(game)).toBe(1)
  })

  it('Servant of Flame derrotado: los investigadores pueden retenerlo debajo del acto', () => {
    let game = during(
      newGame(),
      (s) => s,
      spawnHere(newGame(), { ...servantOnTheRun, health: 1 }, true),
    )
    game = during(game, (s) => s, {
      type: 'DamageEnemy',
      enemy: enemies(game)[0]!.id,
      amount: 1,
      by: DANIELA,
    })
    expect(labels(game)).toContain('story.smokeAndMirrors.holdThem')
    game = choose(game, 'story.smokeAndMirrors.holdThem')
    expect(game.underAct).toEqual([CODES.servantOfFlame])
    expect(game.victoryDisplay).not.toContain(CODES.servantOfFlame)
    expect(inv(game).clues).toBe(1)
  })

  it('con 6 Élite debajo del acto, el acto avanza a la resolución 1', () => {
    const six = [...suspects.slice(0, 5).map((s) => s.code), CODES.servantOfFlame]
    const game = during(newGame(), (s) => ({ ...s, underAct: six }), { type: 'CheckActObjective' })
    expect(game.outcome).toEqual({ type: 'resolution', resolution: 1 })
  })
})

describe('Smoke and Mirrors: reglas nuevas', () => {
  it('esquivo: tras atacar, Bat Horror se aleja a una localización sin investigadores y se agota', () => {
    const bat: EnemyCard = {
      kind: 'enemy',
      code: CODES.batHorror,
      name: 'Bat Horror',
      fight: 3,
      health: 4,
      evade: 4,
      damage: 1,
      horror: 1,
      keywords: ['elusive', 'hunter'],
    }
    let game = during(newGame(), (s) => s, spawnHere(newGame(), bat, true))
    // Robar provoca su ataque de oportunidad; después huye.
    game = choose(game, 'action.draw')
    if (labels(game).includes('ability.danielaFight')) game = choose(game, 'choice.skip')
    // Varias localizaciones vacías conectadas: el jefe elige a cuál se mueve.
    if (labels(game).includes('choice.location')) game = choose(game, 'choice.location')
    const after = enemies(game)[0]!
    expect(after.location).not.toBe(here(game))
    expect(after).toMatchObject({ exhausted: true, engagedWith: null })
    expect(inv(game).damage).toBe(1)
  })

  it('investigar en Waterfront District cuesta 1 acción más', () => {
    const game = during(newGame(), (s) => ({
      ...s,
      investigators: s.investigators.map((i) => ({
        ...i,
        location: CODES.waterfrontDistrict,
        actionsRemaining: 1,
      })),
    }))
    expect(availableActions(game, DANIELA).some((a) => a.kind === 'investigate')).toBe(false)
  })
})

describe('Smoke and Mirrors: resolución', () => {
  it('resolución 1: paradero de la secta, heraldo y experiencia por los interrogados', () => {
    const campaign = { ...newCampaign(['daniela'], 'standard'), scenarioIndex: 1 }
    let game = keepOpeningHands(choose(startScenario(campaign, 4), 'choice.continue'))
    const three = suspects.slice(0, 3).map((s) => s.code)
    game = during(game, (s) => ({ ...s, underAct: three }), {
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: 1 },
    })
    game = choose(game, 'choice.continue')
    expect(game.outcome).toEqual({ type: 'resolution', resolution: 1 })
    const log = finishScenario(campaign, game).log
    expect(log.notes).toContain('discoveredWhereabouts')
    expect(log.values.harbinger).toBeTruthy()
    // 1 de experiencia por cada uno de los 3 sospechosos debajo del acto.
    expect(log.investigators[DANIELA]?.xp).toBe(3)
  })
})

describe('Smoke and Mirrors: robustez', () => {
  it('varias rondas eligiendo siempre la primera opción no rompen el motor', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      let game = createTestGame({
        seed,
        difficulty: 'expert',
        scenario: smokeAndMirrors({ difficulty: 'expert', players: 2, seed }),
        investigators: [starterInvestigator('daniela'), starterInvestigator('joe')],
      })
      for (let n = 0; n < 400 && !game.outcome && game.pending; n++) {
        game = applyInput(game, { investigator: game.pending.investigator, choice: 0 })
      }
      expect(game.outcome !== null || game.pending !== null).toBe(true)
    }
  })
})
