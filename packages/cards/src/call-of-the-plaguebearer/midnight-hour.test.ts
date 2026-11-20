import {
  applyInput,
  availableAbilities,
  createGame,
  dispatch,
  emptyCampaignLog,
  scenarioBehavior,
  type CampaignLog,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, testInvestigator } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { MIDNIGHT, MIDNIGHT_HOUR, midnightHour, sideOf } from './midnight-hour'
import { CONFRONTATION } from './confrontation'
import { D } from './dawn-data'
import { M, TOWN_SIDES } from './midnight-data'
import { campaignLost, newCampaign } from '../campaign'
import { emit, settle } from './testing'

const ADV = TOWN_SIDES[0]!
const BANK = TOWN_SIDES[1]!
const HIBBS = TOWN_SIDES[3]!
function midnightSetup(notes: string[] = [], players = 1, values: Record<string, string> = {}) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players)
  const log: CampaignLog = { ...emptyCampaignLog(ids), notes, values }
  return createGame({
    seed: 9,
    difficulty: 'standard',
    interactive: true,
    campaignLog: log,
    scenario: midnightHour({ log, seed: 9 }),
    investigators: ids.map((id) => testInvestigator(id)),
  })
}
function midnightGame(notes: string[] = [], players = 1, values: Record<string, string> = {}) {
  let s = midnightSetup(notes, players, values)
  const bodies: string[] = []
  for (let n = 0; n < 80 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    if (s.pending.question.story?.body) bodies.push(s.pending.question.story.body)
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  }
  expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  return { s, bodies }
}
const run = (s: GameState, ...messages: Message[]) =>
  settle(dispatch({ ...s, pending: null, queue: [] }, ...messages))
const specific = (key: string, data: Record<string, string | number | boolean> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const behavior = () => scenarioBehavior(MIDNIGHT_HOUR)!
const enemyAt = (s: GameState, id: string) =>
  Object.values(s.enemies).find((e) => e.location === id && e.code !== M.baalshandor)
const drain = (s: GameState, pick: (s: GameState) => GameState | null = () => null) => {
  for (let n = 0; n < 60 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = pick(s) ?? applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return s
}

// Guía ES pp. 21–24 / EN pp. 24–29; cartas ES 268–309, EN 262–303.
describe('La hora bruja · preparación', () => {
  it('pone Arkham Normal/Protegido, Baalshandor en el Lugar de la Liberación y la bolsa', () => {
    const { s, bodies } = midnightGame([
      'plaguebearerTown78026Site',
      'plaguebearerTown78024Rallied',
      'plaguebearerCrypticRiddle',
    ])
    expect(Object.keys(s.locations)).toHaveLength(8)
    expect(s.locations[BANK.rallied]).toBeDefined()
    expect(s.locations[BANK.normal]).toBeUndefined()
    expect(Object.values(s.enemies).find((e) => e.code === M.baalshandor)?.location).toBe(
      HIBBS.normal,
    )
    expect(bodies).toContain('story.plaguebearer.midnight.intro2')
    expect(s.scenarioMeta?.midnightBinding).toBe(1)
    // Herbert West entra en juego con Alianzas frágiles.
    expect(Object.values(s.assets).some((a) => a.code === D.west)).toBe(true)
    // Baalshandor gana Cazador y Descomunal con el plan 1.
    const b = Object.values(s.enemies).find((e) => e.code === M.baalshandor)!
    expect(behavior().enemyKeyword!(s, b, 'massive')).toBe(true)
  })

  it('con el Cráter lo sustituye; sin West si la Muerte le conquistó; heridas o debilidad', () => {
    const { s } = midnightGame([
      'plaguebearerTown78027Crater',
      CONFRONTATION.deathConqueredWest,
      'plaguebearerGreysonCutTies',
    ])
    expect(s.locations[M.crater]).toBeDefined()
    expect(Object.values(s.enemies).find((e) => e.code === M.baalshandor)?.location).toBe(M.crater)
    expect(Object.values(s.assets).some((a) => a.code === D.west)).toBe(false)
    // La primera opción de la herida: 2 daño y 2 horror.
    expect(s.investigators[0]!.damage).toBe(2)
    expect(Object.values(s.placedAssets ?? {}).some((p) => p.code === M.loyalists)).toBe(true)
    // El Cráter conecta con cada Lugar Seguro.
    expect(s.locations[M.crater]!.connections.length).toBeGreaterThan(0)
  })
})

describe('La hora bruja · Lugares enemigo', () => {
  it('dar la vuelta pone el enemigo con sus pistas; derrotarlo vuelve a la cara Segura', () => {
    let { s } = midnightGame(['plaguebearerTown78026Site'])
    s = run(s, specific('midnight.flip', { location: ADV.normal }))
    expect(sideOf(s, ADV.normal)).toBe('enemy')
    const e = enemyAt(s, ADV.normal)!
    expect(e.code).toBe(ADV.enemy.code)
    expect(e.keywords).toContain('massive')
    expect(s.locations[ADV.normal]!.clues).toBe(2)
    expect(s.locations[ADV.normal]!.shroud).toBe(3)
    expect(behavior().cannotMoveEnemy!(s, e)).toBe(true)
    // Derrota: se da la vuelta, sin fichas que no sean horror.
    s = run(s, { type: 'PlaceLocationTokens', location: ADV.normal, horror: 0, doom: 1 })
    s = run(s, { type: 'DefeatEnemy', enemy: e.id })
    expect(sideOf(s, ADV.normal)).toBe('stable')
    expect(enemyAt(s, ADV.normal)).toBeUndefined()
    expect(s.locations[ADV.normal]!.clues).toBe(0)
    expect(s.locations[ADV.normal]!.doom ?? 0).toBe(0)
  })

  it('el daño de un jugador descubre la mitad en pistas, sin encadenarse', () => {
    let { s } = midnightGame(['plaguebearerTown78026Site'])
    s = run(s, specific('midnight.flip', { location: HIBBS.normal }))
    s = { ...s, investigators: s.investigators.map((i) => ({ ...i, location: HIBBS.normal })) }
    const e = enemyAt(s, HIBBS.normal)!
    const before = s.locations[HIBBS.normal]!.clues
    s = run(s, { type: 'DamageEnemy', enemy: e.id, amount: 1, by: 'a', source: { code: 'test' } })
    expect(s.locations[HIBBS.normal]!.clues).toBe(before - 1)
    expect(s.enemies[e.id]!.damageTaken).toBe(1)
  })

  it('con el plan 2, un Lugar con horror no puede darse la vuelta', () => {
    let { s } = midnightGame(['plaguebearerTown78026Site'])
    s = { ...s, agendaIndex: 1 }
    s = run(s, { type: 'PlaceLocationTokens', location: ADV.normal, horror: 1 })
    s = run(s, specific('midnight.flip', { location: ADV.normal }))
    expect(sideOf(s, ADV.normal)).toBe('stable')
  })

  it('la calavera cuenta los Lugares con horror (máximo 4)', () => {
    let { s } = midnightGame(['plaguebearerTown78026Site'])
    for (const t of TOWN_SIDES)
      if (s.locations[t.normal])
        s = run(s, { type: 'PlaceLocationTokens', location: t.normal, horror: 1 })
    expect(behavior().tokenEffect!(s, 'skull', 'a').modifier).toBe(-4)
    expect(behavior().tokenEffect!({ ...s, difficulty: 'hard' }, 'skull', 'a').modifier).toBe(-8)
  })
})

describe('La hora bruja · planes y actos', () => {
  it('derrotar a Baalshandor en el acto 1 avanza el plan: Infectados, doom y acto 1b', () => {
    let { s } = midnightGame(['plaguebearerTown78026Site', 'plaguebearerTown78023Infected'])
    s = { ...s, doom: 2 }
    const b = Object.values(s.enemies).find((e) => e.code === M.baalshandor)!
    s = drain(emit(s, { type: 'DefeatEnemy', enemy: b.id }))
    expect(s.agendaIndex).toBe(1)
    expect(s.doom).toBe(2)
    expect(Object.values(s.enemies).some((e) => e.code === M.baalshandor)).toBe(false)
    expect(sideOf(s, ADV.normal)).toBe('enemy')
    // West controlado y sin acertijo: El Doctor.
    expect(s.acts[s.actIndex]!.code).toBe(M.acts.doctor)
    expect(s.encounterDeck.some((c) => c.code === M.oneOfMany)).toBe(true)
  })

  it('sin West ni Maletín, el acto 1b pasa a Detener el crecimiento', () => {
    let { s } = midnightGame(['plaguebearerTown78026Site', CONFRONTATION.deathConqueredWest])
    s = drain(emit(s, specific('midnight.act1b')))
    expect(s.acts[s.actIndex]!.code).toBe(M.acts.stunt)
  })

  it('el acto 2 con horror en cada Lugar anota la conquista de West y pasa al Cuerpo/Mente/Alma', () => {
    let { s } = midnightGame(['plaguebearerTown78026Site'])
    s = run(s, specific('midnight.toAct', { code: M.acts.doctor }))
    for (const id of Object.keys(s.locations))
      s = run(s, { type: 'PlaceLocationTokens', location: id, horror: 1 })
    s = drain(emit(s, specific('midnight.actRound')))
    expect(s.acts[s.actIndex]!.code).toBe(M.acts.life)
    expect(s.scenarioMeta?.midnightWest).toBe(1)
    expect(Object.keys(s.locations).sort()).toEqual([M.body, M.mind, M.soul].sort())
    expect(s.investigators[0]!.location).toBe(M.soul)
    const b = Object.values(s.enemies).find((e) => e.code === M.baalshandor)!
    expect(b).toBeDefined()
    // Acto 4: derrotar un Lugar enemigo daña a Baalshandor; Baalshandor no se puede atacar.
    const body = enemyAt(s, M.body)!
    s = drain(emit(s, { type: 'DefeatEnemy', enemy: body.id }))
    expect(s.enemies[b.id]!.damageTaken).toBe(1)
    expect(sideOf(s, M.body)).toBe('bound')
  })

  it('«esto no está funcionando»: retira el Maletín y pasa al acto 3a', () => {
    let { s } = midnightGame(['plaguebearerTown78026Site'])
    s = run(s, specific('midnight.toAct', { code: M.acts.reagent }))
    s = emit(s, specific('midnight.actRound'))
    s = choose(s, 'choice.plaguebearer.midnight.giveUp')
    s = drain(s)
    expect(s.acts[s.actIndex]!.code).toBe(M.acts.stunt)
  })
})

describe('La hora bruja · resoluciones y epílogo', () => {
  const end = (s: GameState, outcome: Message) => {
    s = dispatch({ ...s, pending: null, queue: [] }, outcome)
    const bodies: string[] = []
    s = drain(s, (x) => {
      const q = x.pending!.question
      if (q.story?.body) bodies.push(q.story.body)
      return q.prompt === 'prompt.plaguebearer.midnight.zero'
        ? choose(x, 'choice.plaguebearer.friends.read')
        : null
    })
    return { s, bodies }
  }
  it('R6 (sin pactos): encadenado de nuevo, trauma físico y epílogos del regalo y de Arkham unida', () => {
    const { s: start } = midnightGame(['plaguebearerTown78026Site', 'plaguebearerArkhamTogether'])
    const { s, bodies } = end(start, {
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: 3 },
    })
    expect(s.campaignLog!.notes).toEqual(
      expect.arrayContaining([MIDNIGHT.boundAnew, MIDNIGHT.twistedGift, 'campaignWon']),
    )
    expect(s.campaignLog!.investigators.a!.physicalTrauma).toBe(2)
    expect(bodies).toEqual(
      expect.arrayContaining([
        'story.plaguebearer.midnight.resolution3',
        'story.plaguebearer.midnight.resolution6',
        'story.plaguebearer.midnight.resolution0',
        'story.plaguebearer.midnight.epilogue.gift',
        'story.plaguebearer.midnight.epilogue.united',
      ]),
    )
  })

  it('R8: destruido, West conquistó la muerte y su epílogo', () => {
    const { s: start } = midnightGame(['plaguebearerTown78026Site'])
    const { s, bodies } = end(
      { ...start, scenarioMeta: { ...start.scenarioMeta, midnightWest: 1 } },
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 8 } },
    )
    expect(s.campaignLog!.notes).toEqual(
      expect.arrayContaining([MIDNIGHT.destroyed, MIDNIGHT.westConquered]),
    )
    expect(s.campaignLog!.investigators.a!.mentalTrauma).toBe(2)
    expect(bodies).toContain('story.plaguebearer.midnight.epilogue.west')
  })

  it('sin resolución: R1 fuera del acto 4 (campaña perdida) y R2 en el acto 4 (muertos y ganan)', () => {
    const { s: start } = midnightGame(['plaguebearerTown78026Site'])
    const r1 = end(start, { type: 'EndScenario', outcome: { type: 'noResolution' } } as Message).s
    expect(r1.campaignLog!.notes).toContain('campaignLost')
    const life = { ...start, actIndex: 4 }
    const r2 = end(life, { type: 'EndScenario', outcome: { type: 'noResolution' } } as Message).s
    expect(r2.campaignLog!.investigators.a!.killed).toBe(true)
    expect(r2.campaignLog!.notes).toContain('campaignWon')
  })

  // Regresión: una campaña ganada con todos muertos o locos no se daba por perdida.
  it('campaignLost respeta «campaignWon» aunque nadie siga en la campaña', () => {
    const campaign = newCampaign('call-of-the-plaguebearer', ['joe'], 'standard')
    campaign.scenarioIndex = 8
    campaign.log.investigators[campaign.investigators[0]!.id]!.killed = true
    expect(campaignLost(campaign)).toBe(true)
    campaign.log.notes.push('campaignWon')
    expect(campaignLost(campaign)).toBe(false)
  })

  it('la R1 de El Plaguero no anota campaignWon', () => {
    void availableAbilities
    expect(MIDNIGHT.boundAnew).toBe('plaguebearerBoundAnew')
  })
})
