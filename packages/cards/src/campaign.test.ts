import { createGame, type GameState } from '@lcg/engine'
import { choose, during, testInvestigator } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { DR_ARMITAGE, spreadingFlames } from './brethren-of-ash/spreading-flames'
import {
  canPlayNext,
  finishScenario,
  newCampaign,
  purchase,
  purchaseOptions,
  removableCards,
  startScenario,
  type Campaign,
} from './campaign'
import { code } from './core-2026/player-cards'

const DANIELA = code(1)

/** Juega Spreading Flames hasta la pregunta de la primera historia de resolución. */
function endScenario(campaign: Campaign, outcome: Parameters<typeof finish>[1]): GameState {
  return finish(choose(startScenario(campaign, 11), 'choice.continue'), outcome)
}
const finish = (
  s: GameState,
  outcome: { type: 'resolution'; resolution: number } | { type: 'noResolution' },
) => during(s, (x) => x, { type: 'EndScenario', outcome })

describe('campaña: registro', () => {
  it('sin resolución: universidad quemada, 1 trauma mental y 2 de experiencia', () => {
    const campaign = newCampaign(['daniela'], 'standard')
    const game = choose(endScenario(campaign, { type: 'noResolution' }), 'choice.continue')
    const next = finishScenario(campaign, game)
    expect(next.log.notes).toEqual(['universityBurned'])
    expect(next.log.investigators[DANIELA]).toMatchObject({ xp: 2, mentalTrauma: 1 })
    expect(next.results[0]?.xp[DANIELA]).toBe(2)
    expect(next.scenarioIndex).toBe(1)
    // Smoke and Mirrors aún no está disponible.
    expect(canPlayNext(next)).toBe(false)
  })

  it('resolución 1 → 2: Armitage, experiencia y trauma físico', () => {
    const campaign = newCampaign(['daniela'], 'standard')
    let game = endScenario(campaign, { type: 'resolution', resolution: 1 })
    game = choose(game, 'choice.continue')
    game = choose(game, 'choice.investigator')
    game = choose(choose(game, 'story.spreadingFlames.stay'), 'choice.continue')
    const log = finishScenario(campaign, game).log
    expect(log.notes).toEqual(['defeatedPursuer', 'savedUniversity'])
    expect(log.investigators[DANIELA]).toMatchObject({
      xp: 4,
      physicalTrauma: 1,
      mentalTrauma: 0,
      storyAssets: [DR_ARMITAGE],
    })
  })

  it('el trauma se lleva al siguiente escenario como daño y horror', () => {
    const campaign = newCampaign(['daniela'], 'standard')
    const hurt: Campaign = {
      ...campaign,
      log: {
        ...campaign.log,
        investigators: {
          [DANIELA]: { xp: 0, physicalTrauma: 1, mentalTrauma: 2, storyAssets: [] },
        },
      },
    }
    const daniela = startScenario(hurt, 3).investigators[0]
    expect(daniela).toMatchObject({ damage: 1, horror: 2 })
  })

  it('las fichas añadidas a la bolsa siguen en los escenarios siguientes', () => {
    const campaign = newCampaign(['daniela'], 'easy')
    const bag = startScenario(campaign, 3).chaosBag.length
    const more: Campaign = { ...campaign, log: { ...campaign.log, chaosTokens: ['cultist'] } }
    expect(startScenario(more, 3).chaosBag).toHaveLength(bag + 1)
  })

  it('derrotado por daño: 1 trauma físico; trauma igual a la salud: muerto', () => {
    let game = createGame({
      seed: 1,
      scenario: spreadingFlames('standard'),
      investigators: [testInvestigator('a', { health: 1 })],
    })
    game = during(game, (s) => s, { type: 'AssignDamage', investigator: 'a', damage: 1, horror: 0 })
    expect(game.campaignLog?.investigators.a).toMatchObject({ physicalTrauma: 1, killed: true })
  })
})

describe('campaña: mejorar el mazo', () => {
  const withXp = (xp: number): Campaign => {
    const campaign = newCampaign(['daniela'], 'standard')
    const record = campaign.log.investigators[DANIELA]!
    return {
      ...campaign,
      log: { ...campaign.log, investigators: { [DANIELA]: { ...record, xp } } },
    }
  }

  it('solo ofrece cartas de sus clases y niveles, y que pueda pagar', () => {
    const options = purchaseOptions(withXp(2), DANIELA)
    const names = options.map((o) => o.name)
    // Guardián hasta nivel 5 (Counterattack, nivel 1) y superviviente hasta nivel 2 (Slippery).
    expect(names).toContain('Counterattack')
    expect(names).toContain('Slippery')
    // Nada de buscador (Joe) ni cartas que no pueda pagar (Sledgehammer, nivel 3).
    expect(names).not.toContain('Deduction')
    expect(names).not.toContain('Sledgehammer')
    // Ni exclusivas de otros investigadores.
    expect(options.some((o) => o.code === code(14))).toBe(false)
  })

  it('comprar una carta de nivel 0 cuesta 1 de experiencia y obliga a quitar otra', () => {
    const campaign = withXp(2)
    expect(() => purchase(campaign, DANIELA, code(80))).toThrow()
    const out = removableCards(campaign, DANIELA)[0]!
    const next = purchase(campaign, DANIELA, code(80), { remove: out })
    const deck = next.investigators[0]!.deck
    expect(deck).toContain(code(80))
    expect(deck).toHaveLength(campaign.investigators[0]!.deck.length)
    expect(next.log.investigators[DANIELA]?.xp).toBe(1)
  })

  it('todas las cartas de nivel 1–5 ya funcionan en el motor', () => {
    const rich = withXp(30)
    const pending = purchaseOptions(rich, DANIELA).filter((o) => !o.implemented)
    expect(pending.map((o) => o.name)).toEqual([])
  })

  it('mejorar una carta cuesta la diferencia de nivel y sustituye la anterior', () => {
    // Daniela lleva Bodyguard de nivel 0 (16); el de nivel 2 (27) cuesta 2.
    const campaign = withXp(2)
    const upgrade = purchaseOptions(campaign, DANIELA).find(
      (o) => o.code === code(27) && o.replaces,
    )
    expect(upgrade).toMatchObject({ cost: 2, replaces: code(16) })
    const next = purchase(campaign, DANIELA, code(27), { upgrade: true })
    expect(next.investigators[0]!.deck).toContain(code(27))
    expect(next.investigators[0]!.deck).not.toContain(code(16))
    expect(next.log.investigators[DANIELA]?.xp).toBe(0)
  })
})
