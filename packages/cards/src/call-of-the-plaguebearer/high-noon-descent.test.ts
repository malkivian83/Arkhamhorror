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
import { HIGH_NOON_DESCENT, highNoonDescent } from './high-noon-descent'
import { D } from './dawn-data'
import { DELTA_SUBLABS, REMEMBER, S, V } from './noon-data'
import { emit, settle } from './testing'

function noonSetup(notes: string[] = [], players = 1, seed = 5): GameState {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players)
  const log: CampaignLog = { ...emptyCampaignLog(ids), notes }
  return createGame({
    seed,
    difficulty: 'standard',
    interactive: true,
    campaignLog: log,
    scenario: highNoonDescent({ log, seed }),
    investigators: ids.map((id) => testInvestigator(id)),
  })
}
function noonGame(notes: string[] = [], players = 1, seed = 5): GameState {
  let s = throughSetup(noonSetup(notes, players, seed))
  for (let n = 0; n < 40 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  return s
}
const reveal = (s: GameState, ...ids: string[]): GameState => ({
  ...s,
  locations: Object.fromEntries(
    Object.entries(s.locations).map(([id, l]) => [
      id,
      ids.includes(id) ? { ...l, revealed: true } : l,
    ]),
  ),
})
const move = (s: GameState, id: string, location: string): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === id ? { ...i, location } : i)),
})
const canEnter = (s: GameState, by: string, from: string, to: string) =>
  scenarioBehavior(HIGH_NOON_DESCENT)!.canEnter!(s, by, from, to)
const row = (s: GameState, y: number) =>
  DELTA_SUBLABS.filter((id) => s.locations[id]?.position?.[1] === y).sort(
    (a, b) => s.locations[a]!.position![0] - s.locations[b]!.position![0],
  )

// Guía ES pp. 13–14 / EN pp. 15–17; cartas ES 142–188.
describe('Descenso al mediodía', () => {
  it('prepara el ala Delta, la versión del Laboratorio Alfa y a Herbert West', () => {
    const s = noonGame()
    expect(Object.keys(s.locations).sort()).toEqual(
      [V.saferoom, V.delta, V.omega, V.alphaBurned, ...DELTA_SUBLABS, V.office].sort(),
    )
    expect(s.investigators[0]!.location).toBe(V.saferoom)
    expect(row(s, 2)).toHaveLength(3)
    expect(row(s, 3)).toHaveLength(2)
    // Laboratorio Delta conecta con los tres Delta superiores; cada Subnivel, con la Guarida.
    expect(s.locations[V.delta]!.connections).toEqual(expect.arrayContaining(row(s, 2)))
    for (const id of [...DELTA_SUBLABS, V.office])
      expect(s.locations[id]!.connections).toContain(V.saferoom)
    // Acto 1: conexión de un solo sentido hacia abajo.
    const [left, middle] = row(s, 2)
    const [lower] = row(s, 3)
    expect(s.locations[left!]!.connections).toContain(lower)
    expect(s.locations[middle!]!.connections).toEqual(expect.arrayContaining(row(s, 3)))
    expect(s.locations[lower!]!.connections).not.toContain(left)
    expect(s.locations[lower!]!.connections).toContain(V.office)
    // Herbert West entra en juego (Alianzas frágiles: sin ocupar espacio).
    expect(Object.values(s.assets).some((a) => a.code === D.west && a.owner === 'a')).toBe(true)
    expect(s.setAside.map((c) => c.code)).toEqual(
      expect.arrayContaining([V.crispin, V.first, V.security, S.fireVampire, S.livingFlame]),
    )
  })
  it('con la colección salvada usa el Laboratorio Alfa del conocimiento y aparta Yog-Sothoth', () => {
    const s = noonGame(['plaguebearerCollection'])
    expect(s.locations[V.alphaKnowledge]).toBeDefined()
    expect(s.locations[V.alphaBurned]).toBeUndefined()
    expect(s.setAside.some((c) => c.code === S.fireVampire)).toBe(false)
  })
  it('con el respeto de Greyson anota que cortó lazos y la pone en juego', () => {
    const s = noonGame(['plaguebearerRespect', 'plaguebearerMotel', 'plaguebearerFirstDead'])
    expect(s.campaignLog!.notes).toContain('plaguebearerGreysonCutTies')
    expect(Object.values(s.assets).some((a) => a.code === V.greyson)).toBe(true)
    expect(s.campaignLog!.investigators.a!.storyAssets).toContain(V.greyson)
  })
  it('cada Sub-laboratorio solo deja bajar cuando se ha hecho lo que pide', () => {
    let s = noonGame()
    const top = row(s, 2)
    const autopsyAbove = top.find((id) => id === V.autopsy)
    const from = autopsyAbove ?? top[0]!
    s = reveal(s, from)
    const lower = Object.keys(s.locations).find(
      (id) =>
        s.locations[id]!.position?.[1] === 3 &&
        Math.abs(s.locations[id]!.position![0] - s.locations[from]!.position![0]) < 1,
    )!
    const needs = (<Record<string, string>>{
      [V.autopsy]: REMEMBER.breakers,
      [V.cold]: REMEMBER.hand,
      [V.hall]: REMEMBER.acid,
      [V.serum]: REMEMBER.card,
    })[from]
    if (needs) {
      expect(canEnter(s, 'a', from, lower)).toBe(false)
      s = { ...s, scenarioMeta: { ...s.scenarioMeta, [needs]: 1 } }
    }
    expect(canEnter(s, 'a', from, lower)).toBe(true)
    // La Celda de aislamiento solo admite a un investigador.
    const two = move(noonGame([], 2), 'b', V.holding)
    expect(canEnter(two, 'a', V.saferoom, V.holding)).toBe(false)
  })
  it('el Despacho de West baja el velo si se entra desde arriba y con West presente', () => {
    let s = noonGame()
    const office = () => s.locations[V.office]!
    const shroud = () => 5 + scenarioBehavior(HIGH_NOON_DESCENT)!.shroudModifier!(s, office())
    s = reveal(s, V.office)
    expect(shroud()).toBe(5)
    const [l, r] = row(s, 3)
    s = reveal(s, l!, r!)
    s = {
      ...s,
      scenarioMeta: {
        ...s.scenarioMeta,
        [REMEMBER.breakers]: 1,
        [REMEMBER.hand]: 1,
        [REMEMBER.card]: 1,
        [REMEMBER.acid]: 1,
      },
    }
    expect(shroud()).toBe(2)
    s = move(s, 'a', V.office)
    expect(shroud()).toBe(0)
  })
  it('la Guarida expulsa a los enemigos que entran', () => {
    const s = noonGame()
    let next = emit(s, { type: 'SpawnSetAsideEnemy', code: V.security, location: V.saferoom })
    expect(next.pending?.question.prompt).toBe('prompt.chooseLocation')
    next = settle(applyInput(next, { investigator: 'a', choice: 0 }))
    const e = Object.values(next.enemies).find((x) => x.code === V.security)
    expect(e).toBeDefined()
    expect(e!.location).not.toBe(V.saferoom)
    expect(e!.engagedWith).toBeNull()
  })
  it('la calavera resta la distancia a la Guarida', () => {
    let s = noonGame()
    const tokens = scenarioBehavior(HIGH_NOON_DESCENT)!.tokenEffect!
    expect(tokens(s, 'skull', 'a').modifier).toBe(-0)
    s = move(s, 'a', V.delta)
    expect(tokens(s, 'skull', 'a').modifier).toBe(-1)
    s = move(s, 'a', row(s, 3)[0]!)
    expect(tokens(s, 'skull', 'a').modifier).toBe(-1)
  })
  it('el acto 1 avanza al final de la ronda y prepara el ala Omega con los Blasones', () => {
    let s = noonGame()
    s = move(reveal(s, V.office), 'a', V.office)
    s = { ...s, locations: { ...s.locations, [V.office]: { ...s.locations[V.office]!, clues: 0 } } }
    s = emit(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
    s = settle(s)
    expect(s.acts[s.actIndex]!.code).toBe(V.acts[1])
    expect(s.investigators[0]!.location).toBe(V.saferoom)
    for (const id of DELTA_SUBLABS) expect(s.locations[id]).toBeUndefined()
    expect(s.locations[V.office]).toBeUndefined()
    expect(s.locations[V.delta]).toBeDefined()
    expect(s.locations[V.omega]!.connections).toEqual(
      expect.arrayContaining([V.leftArtery, V.rightArtery]),
    )
    const crests = Object.values(s.placedAssets ?? {})
    expect(crests.find((p) => p.code === V.leftCrest)?.placement).toEqual({
      type: 'location',
      location: V.leftVentricle,
    })
    expect(crests.find((p) => p.code === V.rightCrest)?.placement).toEqual({
      type: 'location',
      location: V.rightVentricle,
    })
    // Acto 2: no se puede subir del Ventrículo a la Aurícula.
    expect(canEnter(s, 'a', V.leftVentricle, V.leftArtery)).toBe(false)
  })
  it('un Blasón avanza hacia el Ventrículo opuesto y, juntos, abren el ala Alfa', () => {
    let s = noonGame()
    s = move(reveal(s, V.office), 'a', V.office)
    s = { ...s, locations: { ...s.locations, [V.office]: { ...s.locations[V.office]!, clues: 0 } } }
    s = settle(emit(s, { type: 'Forced', trigger: { type: 'roundEnds' } }))
    const left = () => Object.values(s.placedAssets ?? {}).find((p) => p.code === V.leftCrest)!
    const right = () => Object.values(s.placedAssets ?? {}).find((p) => p.code === V.rightCrest)!
    s = emit(s, {
      type: 'ScenarioSpecific',
      key: 'noon.crestStep',
      data: { code: V.leftCrest, toward: V.rightVentricle },
    })
    expect(left().placement).toEqual({ type: 'location', location: V.leftArtery })
    s = emit(s, {
      type: 'MovePlacedAsset',
      placed: left().id,
      placement: { type: 'location', location: V.omega },
    })
    s = emit(s, {
      type: 'MovePlacedAsset',
      placed: right().id,
      placement: { type: 'location', location: V.omega },
    })
    if (s.acts[s.actIndex]!.code === V.acts[1]) s = settle(emit(s, { type: 'AdvanceAct' }))
    expect(s.acts[s.actIndex]!.code).toBe(V.acts[2])
    expect(s.investigators[0]!.location).toBe(V.alphaBurned)
    expect(s.locations[V.leftArtery]).toBeUndefined()
    expect(s.locations[V.robison]).toBeDefined()
    expect(Object.values(s.enemies).some((e) => e.code === S.fireVampire)).toBe(true)
    // Robison: sin Razón y Fe no se puede entrar.
    expect(canEnter(s, 'a', V.alphaBurned, V.robison)).toBe(false)
    s = { ...s, scenarioMeta: { ...s.scenarioMeta, noonReason: 1, noonFaith: 1 } }
    expect(canEnter(s, 'a', V.alphaBurned, V.robison)).toBe(true)
  })
  it('el plan 2 hace aparecer al Agente Crispin herido y Herbert West desaparece', () => {
    let s = noonGame(['plaguebearerRespect', 'plaguebearerMotel'])
    s = settle(emit(s, { type: 'AdvanceAgenda' } as never))
    s = settle(emit(s, { type: 'AdvanceAgenda' } as never))
    const crispin = Object.values(s.enemies).find((e) => e.code === V.crispin)
    expect(crispin?.location).toBe(V.alphaBurned)
    // Falta «te aseguraste de que el Primero murió»: 1 daño por investigador.
    expect(crispin?.damageTaken).toBe(1)
    expect(Object.values(s.assets).some((a) => a.code === D.west)).toBe(false)
  })
  it('las resoluciones anotan el reino y pasan al Interludio IV', () => {
    const s = noonGame()
    const messages = scenarioBehavior(HIGH_NOON_DESCENT)!.resolution!(
      { ...s, victoryDisplay: [V.first] },
      { type: 'resolution', resolution: 2 },
    )
    const notes = messages
      .filter((m) => m.type === 'RecordNote')
      .map((m) => (m as { note: string }).note)
    expect(notes).toEqual(['plaguebearerHiddenPaths', 'plaguebearerBuried'])
    expect(messages.some((m) => m.type === 'ScenarioSpecific' && m.key === 'history.ask')).toBe(
      true,
    )
  })
  it('ofrece el movimiento del acto gastando 1 pista', () => {
    let s = noonGame()
    s = { ...s, investigators: s.investigators.map((i) => ({ ...i, clues: 1 })) }
    expect(availableAbilities(s, 'a').some((a) => a.key === 'noon:actMove')).toBe(true)
    void choose
  })
})

const card = (code: string) => noonSetup().setAside.find((c) => c.code === code)
const encounter = (code: string) =>
  [...noonSetup().encounterDeck, ...noonSetup().setAside].find((c) => c.code === code)!
const draw = (s: GameState, code: string) =>
  emit(s, { type: 'ResolveEncounterCard', investigator: 'a', card: { ...encounter(code) } })
const answer = (s: GameState, label: string) => settle(choose(s, label))

describe('Descenso al mediodía · encuentros', () => {
  it('Estrategia se coloca junto al plan, cobra una acción extra y la segunda gana Oleada', () => {
    let s = draw(noonGame(), V.caution)
    const placed = Object.values(s.treacheries).find((t) => t.code === V.caution)
    expect(placed?.placement).toEqual({ type: 'agenda' })
    const target = Object.keys(s.locations).find((id) => s.locations[id]!.position?.[1] === 2)!
    s = move(s, 'a', V.delta)
    const before = s.investigators[0]!.actionsRemaining
    s = emit(s, { type: 'MoveTo', investigator: 'a', location: target })
    expect(s.investigators[0]!.location).toBe(target)
    expect(s.investigators[0]!.actionsRemaining).toBe(before - 1)
    const deck = s.encounterDeck.length
    s = draw(s, V.completionist)
    expect(Object.values(s.treacheries).filter((t) => t.code === V.completionist)).toHaveLength(0)
    expect(s.encounterDeck.length).toBeLessThan(deck)
    expect(card(V.crispin)?.code).toBe(V.crispin)
  })
  it('Corre por tu vida coloca perdición al final de la ronda si no estás en la Guarida', () => {
    let s = move(draw(noonGame(), V.cover), 'a', V.delta)
    expect(Object.values(s.treacheries).some((t) => t.code === V.cover)).toBe(true)
    s = emit(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(s.doom).toBe(1)
    expect(Object.values(s.treacheries).some((t) => t.code === V.cover)).toBe(false)
  })
  it('el Prototipo fallido se daña al agotarse', () => {
    let s = emit(noonGame(), {
      type: 'SpawnEnemy',
      card: { ...encounter(V.prototype) },
      location: V.delta,
      engageWith: null,
    } as never)
    const e = Object.values(s.enemies).find((x) => x.code === V.prototype)!
    s = emit(s, { type: 'ExhaustEnemy', enemy: e.id })
    expect(s.enemies[e.id]!.damageTaken).toBe(1)
  })
  it('a partir del plan 2, el primer enemigo Agencia robado gana Oleada y entra con 1 daño', () => {
    let s = settle(emit(noonGame(), { type: 'AdvanceAgenda' } as never))
    const deck = s.encounterDeck.length
    s = {
      ...s,
      encounterDeck: [{ ...encounter(C_PANICKED) }, ...s.encounterDeck],
    }
    s = emit(s, { type: 'DrawEncounterCard', investigator: 'a' } as never)
    // La Guarida lo expulsa a un Lugar conectado antes de que entre.
    expect(s.pending?.question.prompt).toBe('prompt.chooseLocation')
    s = settle(applyInput(s, { investigator: 'a', choice: 0 }))
    expect(Object.values(s.enemies).find((e) => e.code === C_PANICKED)?.location).not.toBe(
      V.saferoom,
    )
    const agent = Object.values(s.enemies).find((e) => e.code === C_PANICKED)
    expect(agent?.damageTaken).toBe(1)
    expect(s.encounterDeck.length).toBeLessThan(deck)
    expect(s.scenarioMeta?.noonAgencyRound).toBe(s.round)
  })
  it('el Taller de catalizadores coloca Razón y la Cámara de estabilización, Fe', () => {
    let s = noonGame()
    s = { ...s, scenarioMeta: { ...s.scenarioMeta, noonReason: 0 } }
    s = emit(s, { type: 'ScenarioSpecific', key: 'noon.mark', data: { key: 'noonReason' } })
    s = emit(s, { type: 'ScenarioSpecific', key: 'noon.mark', data: { key: 'noonFaith' } })
    expect(s.scenarioMeta?.noonReason).toBe(1)
    expect(s.scenarioMeta?.noonFaith).toBe(1)
    expect(s.locations[V.alphaBurned]!.resources).toBe(2)
  })
  it('La Llama viviente descarta el Apoyo de mayor coste o lo cubre de perdición', () => {
    let s = noonGame()
    const west = Object.values(s.assets).find((a) => a.code === D.west)!
    s = draw(s, S.livingFlame)
    expect(s.pending?.question.prompt).toBe('prompt.plaguebearer.noon.livingFlame')
    s = answer(s, 'choice.plaguebearer.noon.doomOnAsset')
    expect(s.assets[west.id]?.doom).toBe(1)
  })
  it('la Tafefobia causa 1 horror al entrar en un Subnivel por primera vez cada ronda', () => {
    let s = noonGame()
    s = {
      ...s,
      investigators: s.investigators.map((i) => ({ ...i, skills: { ...i.skills, willpower: 0 } })),
    }
    s = draw(s, V.taphephobia)
    const t = Object.values(s.treacheries).find((x) => x.code === V.taphephobia)
    if (!t) return
    const horror = s.investigators[0]!.horror
    s = move(s, 'a', V.delta)
    const target = Object.keys(s.locations).find((id) => s.locations[id]!.position?.[1] === 2)!
    s = emit(s, { type: 'MoveTo', investigator: 'a', location: target })
    expect(s.investigators[0]!.horror).toBe(horror + 1)
  })
})
const C_PANICKED = '78252'
