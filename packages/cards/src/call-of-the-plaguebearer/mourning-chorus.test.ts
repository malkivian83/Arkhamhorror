import {
  applyInput,
  availableAbilities,
  createGame,
  emptyCampaignLog,
  scenarioBehavior,
  type CampaignLog,
  type GameState,
} from '@lcg/engine'
import { choose, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { K, RING } from './chorus-data'
import { arkhamStatus, mourningChorus } from './mourning-chorus'
import { TOWN } from './night-data'
import { emit, settle } from './testing'

const logWith = (values: Record<string, 'Defended' | 'Infected'>): CampaignLog => {
  const log = emptyCampaignLog(['a'])
  return {
    ...log,
    values: Object.fromEntries(
      Object.entries(values).map(([id, v]) => [`plaguebearerTown${id}`, v]),
    ),
  }
}
// Advertiser y Banco infectados; el resto, defendido.
const base: Record<string, 'Defended' | 'Infected'> = {
  '78023': 'Infected',
  '78024': 'Infected',
  '78025': 'Defended',
  '78026': 'Defended',
  '78027': 'Defended',
  '78028': 'Defended',
  '78029': 'Defended',
  '78030': 'Defended',
}
function chorusGame(values = base, players = 1, seed = 3): GameState {
  const log = logWith(values)
  const ids = ['a', 'b', 'c', 'd'].slice(0, players)
  let s = throughSetup(
    createGame({
      seed,
      difficulty: 'standard',
      interactive: true,
      campaignLog: { ...log, investigators: emptyCampaignLog(ids).investigators },
      scenario: mourningChorus({ log, seed, investigators: players }),
      investigators: ids.map((id) => testInvestigator(id)),
    }),
  )
  for (let n = 0; n < 40 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return s
}
const procession = (s: GameState) => s.scenarioDecks!.chorusProcession!.map((id) => s.enemies[id]!)
const ring = (location: string) =>
  RING.findIndex((id) => {
    const row = TOWN.find((r) => r.id === id)!
    return row.stable === location || row.ruin === location
  })

// Guía ES pp. 10–11 / EN pp. 12–13; cartas ES 107–141 y Arkham caído 329–352.
describe('Cantos fúnebres', () => {
  it('marca los Lugares sin estado con el valor que aparece menos', () => {
    const status = arkhamStatus(
      logWith({ '78023': 'Infected', '78024': 'Defended', '78025': 'Defended' }),
      5,
    )
    expect(Object.keys(status)).toHaveLength(8)
    const infected = Object.values(status).filter((v) => v === 'Infected').length
    expect(Math.abs(infected - (8 - infected))).toBeLessThanOrEqual(1)
  })
  it('prepara Seguros y Ruinas, retira las cartas de los Defendidos y forma la Procesión', () => {
    const s = chorusGame()
    expect(s.locations['78275']).toBeDefined()
    expect(s.locations['78276']).toBeDefined()
    expect(s.locations['78090']).toBeDefined()
    expect(s.locations['78025']).toBeUndefined()
    const codes = s.encounterDeck.map((c) => c.code)
    expect(codes.filter((c) => c === '78259')).toHaveLength(2)
    expect(codes.filter((c) => c === '78261')).toHaveLength(2)
    expect(codes).not.toContain('78265')
    const [p, m] = procession(s)
    expect(p!.code).toBe(K.priest)
    expect(['78275', '78276']).toContain(p!.location)
    expect(m!.code).toBe(K.minister)
    expect(m!.doom).toBe(1)
    expect(ring(m!.location)).toBe((ring(p!.location) + 1) % 8)
    expect(s.scenarioDecks!.chorusDeck).toHaveLength(9)
    expect(['78260', '78262']).toContain(
      s.scenarioDecks!.chorusDeck!.find((c) => c === '78260' || c === '78262'),
    )
  })
  it('con 6 Lugares Infectados el jefe marca uno como Defendido', () => {
    const values = Object.fromEntries(
      Object.keys(base).map((id, n) => [id, n < 6 ? 'Infected' : 'Defended']),
    ) as typeof base
    const s = chorusGame(values)
    const ruins = TOWN.filter((r) => s.locations[r.ruin]).length
    expect(ruins).toBe(5)
    expect(Object.values(s.campaignLog!.values).filter((v) => v === 'Defended')).toHaveLength(3)
  })
  it('la perdición de un enemigo aumenta su salud', () => {
    const s = chorusGame()
    const m = procession(s)[1]!
    expect(scenarioBehavior(s.scenarioId)!.enemyHealthModifier!(s, m)).toBe(1)
  })
  it('dos recursos en el plan mueven la Procesión: el Sacerdote retrocede y deja una pista', () => {
    let s = chorusGame()
    const [p, m] = procession(s)
    const from = ring(p!.location)
    s = emit(s, {
      type: 'ScenarioSpecific',
      key: 'chorus.agendaResources',
      data: { amount: 2 },
    })
    const [p2, m2] = procession(s)
    expect(ring(p2!.location)).toBe((from + 7) % 8)
    expect(s.locations[p2!.location]!.clues).toBeGreaterThan(0)
    expect(ring(m2!.location)).toBe((ring(p2!.location) + 1) % 8)
    expect(m2!.engagedWith).toBeNull()
    expect(m).toBeDefined()
    // Si no entró en un Lugar Miasma, la Procesión crece.
    if (!['78275', '78276'].includes(p2!.location)) expect(procession(s)).toHaveLength(3)
  })
  it('en la fase de mitos se colocan recursos por investigador en vez de perdición', () => {
    let s = chorusGame(base, 2)
    const doom = s.doom
    s = emit(s, { type: 'Forced', trigger: { type: 'mythosPhaseBegins' } })
    expect(s.doom).toBe(doom)
    expect(Number(s.scenarioMeta?.chorusAgendaResources ?? 0)).toBe(0)
    expect(procession(s).length).toBeGreaterThanOrEqual(2)
  })
  it('el Sacerdote solo recibe el daño de las Barricadas (acto 1b)', () => {
    let s = chorusGame()
    const p = procession(s)[0]!
    s = emit(s, { type: 'DamageEnemy', enemy: p.id, amount: 3, by: 'a' })
    expect(s.enemies[p.id]!.damageTaken).toBe(0)
    s = emit(s, { type: 'AdvanceAct', paid: true })
    expect(s.scenarioMeta?.chorusBarricades).toBe(1)
    const target = Object.keys(s.locations).find((id) => id !== p.location)!
    s = {
      ...s,
      locations: { ...s.locations, [target]: { ...s.locations[target]!, resources: 2 } },
    }
    s = emit(s, { type: 'MoveEnemy', enemy: p.id, location: target })
    expect(s.enemies[p.id]!.damageTaken).toBe(2)
    expect(s.locations[target]!.resources).toBe(0)
  })
  it('derrotar al Sacerdote en el acto 2 lleva a la R2 y anota el Lugar de la Liberación', () => {
    let s = chorusGame()
    s = emit(s, { type: 'AdvanceAct', paid: true })
    const p = procession(s)[0]!
    const row = TOWN.find((r) => r.stable === p.location || r.ruin === p.location)!
    s = emit(s, { type: 'DefeatEnemy', enemy: p.id })
    for (let n = 0; n < 10 && s.pending; n++)
      s = settle(choose(s, s.pending.question.choices.at(-1)!.label))
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(s.campaignLog?.notes).toContain(`plaguebearerTown${row.id}Site`)
  })
  it('el plan 2 lleva a la R1: el Lugar del Sacerdote se convierte en Cráter', () => {
    let s = chorusGame()
    const p = procession(s)[0]!
    const row = TOWN.find((r) => r.stable === p.location || r.ruin === p.location)!
    s = emit(s, { type: 'AdvanceAgenda' }, { type: 'AdvanceAgenda' })
    for (let n = 0; n < 10 && s.pending; n++)
      s = settle(choose(s, s.pending.question.choices.at(-1)!.label))
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(s.campaignLog?.notes).toContain(`plaguebearerTown${row.id}Crater`)
  })
  it('la calavera resta la mayor perdición de un enemigo (máximo 4)', () => {
    const s = chorusGame()
    expect(scenarioBehavior(s.scenarioId)!.tokenEffect!(s, 'skull', 'a').modifier).toBe(-1)
  })
  it('tras la R5 del III, el sectario cuenta como fallo automático', () => {
    const s = chorusGame()
    const blood = {
      ...s,
      campaignLog: {
        ...s.campaignLog!,
        notes: [...s.campaignLog!.notes, 'plaguebearerBloodInVeins'],
      },
    }
    const behavior = scenarioBehavior(s.scenarioId)!
    expect(behavior.tokenEffect!(s, 'cultist', 'a').autoFail).toBeFalsy()
    expect(behavior.tokenEffect!(blood, 'cultist', 'a').autoFail).toBe(true)
  })
  it('en el acto 2a usar un Lugar Seguro coloca una Barricada y lo Protege con 3 por investigador', () => {
    let s = chorusGame()
    s = emit(s, { type: 'AdvanceAct', paid: true })
    const ma = '78092'
    s = {
      ...s,
      investigators: s.investigators.map((i) => ({ ...i, location: ma, actionsRemaining: 3 })),
      locations: { ...s.locations, [ma]: { ...s.locations[ma]!, revealed: true, resources: 2 } },
    }
    const ability = availableAbilities(s, 'a').find(
      (a) => a.label === 'ability.plaguebearer.night.boarding',
    )
    expect(ability).toBeDefined()
    s = emit(s, { type: 'UseAbility', investigator: 'a', ...ability! })
    for (let n = 0; n < 5 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
      s = settle(applyInput(s, { investigator: s.pending.investigator, choice: 0 }))
    expect(s.locations[ma]!.resources).toBe(3)
    expect(s.scenarioDecks?.chorusRallied).toEqual(['78027'])
  })
})
