import {
  allPlayerCardDefs,
  createGame,
  dispatch,
  emptyCampaignLog,
  playerCardBehavior,
  type GameState,
} from '@lcg/engine'
import { choose, labels, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { campaignScenarios, newCampaign } from '../campaign'
import './definition'
import { VALE } from './vale-locations'
import { DAY_ONE_SCENARIOS, HEMLOCK_WELCOME, RESIDENTS, welcomeToHemlockVale } from './welcome'

const players = ['a', 'b']
const context = {
  difficulty: 'standard' as const,
  seed: 7,
  investigators: players,
  log: emptyCampaignLog(players),
}
const start = (choice: 'survey' | 'feast' = 'survey') => {
  const game = createGame({
    seed: context.seed,
    scenario: welcomeToHemlockVale(context),
    interactive: true,
    investigators: players.map((id) => testInvestigator(id)),
  })
  const lead = choose(game, 'choice.investigator', { name: 'A' })
  const ready = throughSetup(choose(lead, `choice.hemlockVale.${choice}`))
  // Primer turno: el investigador A.
  return ready.pending?.question.choices.some((c) => c.label === 'choice.investigator')
    ? choose(ready, 'choice.investigator', { name: 'A' })
    : ready
}
/** Lee los textos de historia pendientes. */
const read = (state: GameState) => {
  let s = state
  while (s.pending?.question.prompt === 'prompt.story' && s.pending.question.choices.length === 1)
    s = choose(s, s.pending.question.choices[0]!.label)
  return s
}
const ability = (state: GameState, label: string, params = {}) => read(choose(state, label, params))

// Guía de La fiesta del Valle de la Cicuta, pp. 4–6: introducción y preparación.
describe('Preludio: ¡Bienvenidos al Valle de la Cicuta!', () => {
  it.each([
    ['survey', 'tablet'],
    ['feast', 'elderThing'],
  ] as const)('la respuesta %s añade su ficha y prepara el Valle de Día', (choice, token) => {
    const game = start(choice)
    expect(game.campaignLog!.chaosTokens).toEqual([token])
    expect(game.chaosBag).not.toContain('autoFail')
    expect(game.campaignLog!.valley).toMatchObject({ day: 1, time: 'day' })
    expect(Object.keys(game.locations)).toHaveLength(8)
    expect(game.investigators.map((i) => i.location)).toEqual([
      VALE.theCrossroads,
      VALE.theCrossroads,
    ])
    expect(game.locations[VALE.theCrossroads]!.connections).toHaveLength(6)
    expect(game.locations[VALE.valeSchoolhouse]!.connections.sort()).toEqual(
      [VALE.boardingHouse, VALE.theCommons].sort(),
    )
    expect(game.doom).toBe(2)
    expect(game.noEncounterDeck).toBe(true)
  })

  it('no hay mazo de Encuentros: no se roba ni se busca en él', () => {
    const game = { ...start(), pending: null, queue: [] }
    const after = dispatch(
      game,
      { type: 'DrawEncounterCard', investigator: 'a' },
      { type: 'SearchEncounterForEnemy', investigator: 'a', top: 3 },
      { type: 'MythosEncounterStep' },
    )
    expect(after.treacheries).toEqual(game.treacheries)
    expect(after.enemies).toEqual(game.enemies)
    expect(after.encounterDiscard).toEqual([])
  })

  it('mientras está el acto, los investigadores no reciben daño ni horror', () => {
    const game = { ...start(), pending: null, queue: [] }
    const hurt = dispatch(game, { type: 'TakeDamage', investigator: 'a', damage: 3, horror: 3 })
    expect(hurt.investigators[0]).toMatchObject({ damage: 0, horror: 0 })
  })

  it('el plan cancela y descarta las debilidades robadas', () => {
    const weakness = allPlayerCardDefs().find(
      (card) => card.weakness && playerCardBehavior(card.code)?.revelation,
    )!
    const game = { ...start(), pending: null, queue: [] }
    const drawn = dispatch(
      {
        ...game,
        investigators: game.investigators.map((i) =>
          i.id === 'a' ? { ...i, deck: [weakness.code, ...i.deck] } : i,
        ),
      },
      { type: 'DrawCards', investigator: 'a', amount: 1 },
    )
    const a = drawn.investigators[0]!
    expect(a.hand).not.toContain(weakness.code)
    expect(a.discard).toContain(weakness.code)
  })
})

// Guía, pp. 2 y 7–9: el códice se lee una vez por preludio y pone en juego a los habitantes.
describe('Códice del preludio de bienvenida', () => {
  it('el cruce de caminos pone en juego a Theo y su Negociar lee el códice 8', () => {
    const game = start()
    expect(labels(game)).toContain('ability.hemlockVale.codex')
    let s = ability(game, 'ability.hemlockVale.codex', { n: 10 })
    s = choose(s, 'choice.gainResource')
    const theo = Object.values(s.placedAssets ?? {}).find(
      (a) => a.code === RESIDENTS.theoPeters.code,
    )
    expect(theo?.placement).toEqual({ type: 'location', location: VALE.theCrossroads })
    expect(s.investigators[0]!.resources).toBe(6)
    expect(s.scenarioMeta?.['codex:10']).toBe(1)
    // Theo: descarta X cartas (X = día 1) para Negociar.
    s = ability(s, 'ability.hemlockVale.parley', { card: RESIDENTS.theoPeters.code })
    s = choose(s, 'choice.discard', { card: s.investigators[0]!.hand[0]! })
    s = read(s)
    expect(s.campaignLog!.valley!.residents.theoPeters.level).toBe(1)
    expect(s.pending?.question.prompt).toBe('prompt.hemlockVale.moveAnywhere')
    s = choose(s, 'choice.location', { location: 'Hemlock Chapel' })
    expect(s.investigators.find((i) => i.location === VALE.hemlockChapel)).toBeDefined()
  })

  it('una entrada resuelta deja de ofrecerse', () => {
    let s = ability(start(), 'ability.hemlockVale.codex', { n: 10 })
    s = choose(s, 'choice.skip')
    const offered = (state: GameState) =>
      state.pending?.question.choices.filter(
        (c) => c.label === 'ability.hemlockVale.codex' && c.params?.n === 10,
      ) ?? []
    expect(offered(s)).toHaveLength(0)
  })
})

// Guía, pp. 6 y 9: Resolución 1 y elección del primer estudio.
describe('Final del preludio de bienvenida', () => {
  it('conserva mano, recursos, un apoyo y pistas, añade el fallo automático y elige el estudio', () => {
    const base = { ...start(), pending: null, queue: [] }
    const a = base.investigators[0]!
    const game: GameState = {
      ...base,
      investigators: base.investigators.map((i) =>
        i.id === 'a'
          ? { ...i, hand: [...a.hand, ...a.deck.slice(0, 2)], resources: 9, clues: 2 }
          : i,
      ),
    }
    let s = dispatch(game, { type: 'AdvanceAgenda' })
    s = read(s)
    expect(s.pending?.question.prompt).toBe('prompt.discardDownTo')
    s = choose(s, 'choice.discard', { card: s.investigators[0]!.hand[0]! })
    s = choose(s, 'choice.discard', { card: s.investigators[0]!.hand[0]! })
    s = read(s)
    s = read(s)
    expect(s.pending?.question.choices.map((c) => c.label)).toEqual(
      DAY_ONE_SCENARIOS.map((id) => `choice.hemlockVale.route.${id}`),
    )
    s = choose(s, 'choice.hemlockVale.route.hemlock-vale-silent-heath')
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
    const valley = s.campaignLog!.valley!
    expect(valley.route).toEqual(['hemlock-vale-silent-heath'])
    expect(valley.carry!.a).toMatchObject({ resources: 5, clues: 2 })
    expect(valley.carry!.a!.hand).toHaveLength(5)
    expect(s.campaignLog!.chaosTokens).toEqual(['tablet', 'autoFail'])
  })
})

// El orden de la campaña lo decide el preludio (guía, p. 9).
describe('Ruta de La fiesta del Valle de la Cicuta', () => {
  it('sigue con el escenario elegido, ya jugable', () => {
    const campaign = newCampaign('the-feast-of-hemlock-vale', ['joe'], 'standard')
    expect(campaignScenarios(campaign).map((s) => s.id)).toEqual([HEMLOCK_WELCOME])
    const routed = {
      ...campaign,
      log: {
        ...campaign.log,
        valley: { ...welcomeValley(), route: ['hemlock-vale-thing-in-the-depths'] },
      },
    }
    const steps = campaignScenarios(routed)
    expect(steps.map((s) => s.id)).toEqual([HEMLOCK_WELCOME, 'hemlock-vale-thing-in-the-depths'])
    expect(steps[1]!.build).toBeDefined()
  })
})

function welcomeValley() {
  return start().campaignLog!.valley!
}
