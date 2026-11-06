import {
  applyInput,
  availableAbilities,
  dispatch,
  getInvestigator,
  scenarioBehavior,
  type GameState,
} from '@lcg/engine'
import { choose, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { C } from './helpers'
import { N } from './night-data'
import { CURIOSITY } from './friends-in-low-places'
import { D, P } from './dawn-data'
import { dawnGame } from './dawn-testing'
import { emit, settle } from './testing'

const enemy = (s: GameState, code: string) => Object.values(s.enemies).find((e) => e.code === code)!
const reanimatedCodes: string[] = [D.aristotle, D.banquo, D.brutus, D.halsey, D.homer, D.ophelia]
const at = (s: GameState, location: string, id = 'a'): GameState => ({
  ...s,
  investigators: s.investigators.map((i) =>
    i.id === id ? { ...i, location, actionsRemaining: 3 } : i,
  ),
})
const advanceFirstAct = (s: GameState) => {
  const v = enemy(s, D.virgil)
  return emit(s, { type: 'DamageEnemy', enemy: v.id, amount: 1, by: 'a' })
}
const withResources = (s: GameState, ids: string[]): GameState => ({
  ...s,
  locations: Object.fromEntries(
    Object.entries(s.locations).map(([id, l]) => [
      id,
      ids.includes(id) ? { ...l, resources: 1 } : l,
    ]),
  ),
})
const ability = (state: GameState, label: string, by = 'a') => {
  const where = getInvestigator(state, by).location!
  const s = state.locations[where]?.revealed
    ? state
    : emit(state, { type: 'RevealLocation', location: where })
  const found = availableAbilities(s, by).find((a) => a.label === label)
  expect(found, label).toBeDefined()
  return emit(s, { type: 'UseAbility', investigator: by, ...found! })
}

// Guía ES p. 7–8 / EN pp. 7–9; cartas ES 054–106 y EN 55–107.
describe('Muerte al amanecer', () => {
  it('sin el respeto de Greyson empieza en la Entrada de servicio con Virgil y el Mazo reanimado', () => {
    const s = dawnGame()
    expect(getInvestigator(s, 'a').location).toBe(P.servants)
    expect(enemy(s, D.virgil).location).toBe(P.servants)
    expect(Object.values(s.enemies).some((e) => e.code === D.ichabod)).toBe(false)
    expect(s.acts[0]!.code).toBe(D.acts.attack)
    expect(s.locations[P.lab]).toBeUndefined()
    const deck = s.scenarioDecks!.dawnReanimated!,
      aside = s.scenarioDecks!.dawnAside!
    expect(deck).toHaveLength(4)
    expect(aside).toHaveLength(2)
    expect([...deck, ...aside].sort()).toEqual([...reanimatedCodes].sort())
    const codes = s.encounterDeck.map((c) => c.code)
    expect(codes.filter((c) => c === C.troubleshooter)).toHaveLength(2)
    expect(codes.filter((c) => c === C.suppression)).toHaveLength(3)
    expect(codes).not.toContain(C.supplicant)
    expect(scenarioBehavior(s.scenarioId)?.cannotLeave?.(s, 'a')).toBe(true)
  })
  it('con el respeto de Greyson usa Ichabod, el Apoyo de la Agencia y retira Solucionadores y Fuego', () => {
    const s = dawnGame({ notes: ['plaguebearerRespect', 'plaguebearerHibbsHelping'] })
    expect(getInvestigator(s, 'a').location).toBe(P.grandHall)
    expect(enemy(s, D.ichabod).location).toBe(P.grandHall)
    expect(s.acts[0]!.code).toBe(D.acts.doorman)
    const owned = Object.values(s.assets)
      .filter((a) => a.owner === 'a')
      .map((a) => a.code)
    expect(owned).toEqual(expect.arrayContaining(['05274', N.hibbs]))
    const codes = s.encounterDeck.map((c) => c.code)
    expect(codes).not.toContain(C.troubleshooter)
    expect(codes).not.toContain(C.suppression)
  })
  it('Hibb del mazo de un jugador entra en juego bajo su control', () => {
    const s = dawnGame({
      notes: ['plaguebearerHibbsHelping'],
      storyAssets: { a: [N.hibbs] },
    })
    const i = getInvestigator(s, 'a')
    expect(
      Object.values(s.assets).filter((a) => a.code === N.hibbs && a.owner === 'a'),
    ).toHaveLength(1)
    expect([...i.deck, ...i.hand].filter((c) => c === N.hibbs)).toHaveLength(0)
  })
  it('quien leyó el texto oculto del Interludio I empieza con 1 horror y una carta más', () => {
    const plain = dawnGame({ players: 2 })
    const s = dawnGame({ players: 2, values: { [CURIOSITY]: JSON.stringify(['b']) } })
    expect(getInvestigator(s, 'b').horror).toBe(1)
    expect(getInvestigator(s, 'a').horror).toBe(0)
    expect(getInvestigator(s, 'b').hand.length).toBe(getInvestigator(plain, 'b').hand.length + 1)
  })
  it('derrotar a Virgil avanza el acto: gira con su daño, entra el Laboratorio y rigen los Reanimados', () => {
    const s = advanceFirstAct(dawnGame())
    expect(s.acts[s.actIndex]!.code).toBe(D.acts.contraptions)
    const v = enemy(s, `${D.virgil}b`)
    expect(v.damageTaken).toBe(1)
    expect(v.horror).toBe(1)
    expect(s.locations[P.lab]).toBeDefined()
    expect(s.scenarioMeta?.dawnRules).toBe(1)
    expect(scenarioBehavior(s.scenarioId)?.cannotLeave?.(s, 'a')).toBe(false)
  })
  it('un Reanimado no puede ser derrotado: el exceso de daño lo agota, lo desenfrenta y no se prepara', () => {
    let s = advanceFirstAct(dawnGame())
    const v = enemy(s, `${D.virgil}b`)
    s = emit(s, { type: 'EngageEnemy', enemy: v.id, investigator: 'a' })
    s = emit(s, { type: 'DamageEnemy', enemy: v.id, amount: 1, by: 'a' })
    const hit = enemy(s, `${D.virgil}b`)
    expect(hit.damageTaken).toBe(2)
    expect(hit.exhausted).toBe(true)
    expect(hit.engagedWith).toBeNull()
    s = emit(s, { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } }, { type: 'ReadyAll' })
    expect(enemy(s, `${D.virgil}b`).exhausted).toBe(true)
    // Al final de la ronda el plan cura 1 daño.
    s = emit(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(enemy(s, `${D.virgil}b`).damageTaken).toBe(1)
  })
  it('el plan 1 pone en juego la carta superior y, con 3 jugadores, una apartada al azar', () => {
    let s = dawnGame({ players: 3 })
    const top = s.scenarioDecks!.dawnReanimated![0]!
    s = emit(s, { type: 'AdvanceAgenda' })
    const codes = Object.values(s.enemies).map((e) => e.code)
    expect(codes).toContain(top)
    expect(s.scenarioDecks!.dawnReanimated).toHaveLength(3)
    expect(s.scenarioDecks!.dawnAside).toHaveLength(1)
    expect(codes.filter((c) => reanimatedCodes.includes(c))).toHaveLength(2)
  })
  it('el plan 3 se da la vuelta mientras quede Mazo reanimado y después llega Vuelve a por más', () => {
    let s = dawnGame()
    s = emit(s, { type: 'AdvanceAgenda' }, { type: 'AdvanceAgenda' })
    expect(s.agendas[s.agendaIndex]!.code).toBe(D.agendas[2])
    const doom = (st: GameState) =>
      emit(st, { type: 'PlaceDoom', amount: 3 } as never, { type: 'CheckAgenda' } as never)
    for (let n = 0; n < 2; n++) {
      s = doom(s)
      expect(s.agendas[s.agendaIndex]!.code).toBe(D.agendas[2])
    }
    expect(s.scenarioDecks!.dawnReanimated).toHaveLength(0)
    s = doom(s)
    expect(s.agendas[s.agendaIndex]!.code).toBe(D.backForMore)
    expect(s.acts[s.actIndex]!.code).toBe(D.backForMore)
    expect(enemy(s, D.first).location).toBe(P.grandHall)
    expect(s.outcome).toBeNull()
  })
  it('el Laboratorio exige tres Lugares con recursos y Negociar da el control de West', () => {
    let s = advanceFirstAct(dawnGame())
    const enter = scenarioBehavior(s.scenarioId)!.canEnter!
    expect(enter(s, 'a', P.basement, P.lab)).toBe(false)
    s = withResources(s, [P.servants, P.apothecary, P.tub])
    expect(enter(s, 'a', P.basement, P.lab)).toBe(true)
    s = emit(at(s, P.lab), { type: 'MoveTo', investigator: 'a', location: P.lab } as never)
    s = emit(s, { type: 'CheckActObjective' })
    expect(s.acts[s.actIndex]!.code).toBe(D.acts.paging)
    expect(Object.values(s.placedAssets ?? {}).some((p) => p.code === D.west)).toBe(true)
    s = emit(at(s, P.lab), { type: 'RevealLocation', location: P.lab })
    for (let n = 0; n < 3; n++) s = ability(at(s, P.lab), 'ability.plaguebearer.dawn.parley')
    expect(Object.values(s.assets).some((a) => a.code === D.west && a.owner === 'a')).toBe(true)
    s = emit(s, { type: 'CheckActObjective' })
    expect(s.acts[s.actIndex]!.code).toBe(D.backForMore)
    expect(enemy(s, D.first).location).toBe(P.grandHall)
  })
  it('la calavera resta el mayor daño de un Reanimado (máximo 5) y en Difícil suma 2', () => {
    let s = advanceFirstAct(dawnGame())
    const behavior = scenarioBehavior(s.scenarioId)!
    s = emit(s, { type: 'DamageEnemy', enemy: enemy(s, `${D.virgil}b`).id, amount: 2, by: 'a' })
    expect(behavior.tokenEffect!(s, 'skull', 'a').modifier).toBe(-3)
    expect(behavior.tokenEffect!({ ...s, difficulty: 'hard' }, 'skull', 'a').modifier).toBe(-5)
    s = emit(s, { type: 'DamageEnemy', enemy: enemy(s, `${D.virgil}b`).id, amount: 9, by: 'a' })
    expect(behavior.tokenEffect!(s, 'skull', 'a').modifier).toBe(-5)
  })
  it('Aristóteles desvía el daño a otro Reanimado preparado de su Lugar', () => {
    let s = advanceFirstAct(dawnGame())
    s = emit(
      s,
      { type: 'SpawnSetAsideEnemy', code: D.aristotle, location: P.study },
      { type: 'SpawnSetAsideEnemy', code: D.homer, location: P.study },
    )
    s = emit(s, { type: 'DamageEnemy', enemy: enemy(s, D.aristotle).id, amount: 1, by: 'a' })
    expect(enemy(s, D.aristotle).damageTaken).toBe(0)
    expect(enemy(s, D.homer).damageTaken).toBe(1)
  })
  it('el Primero de muchos derrotado lleva a la R4', () => {
    let s = advanceFirstAct(dawnGame())
    s = emit(s, { type: 'SpawnSetAsideEnemy', code: D.first, location: P.grandHall })
    s = emit(s, { type: 'DamageEnemy', enemy: enemy(s, D.first).id, amount: 5, by: 'a' })
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 4 })
    expect(s.campaignLog?.notes).toContain('plaguebearerFirstDead')
  })
  it('desistir con Herbert West bajo control lleva a la R2; sin él, a la R3', () => {
    let s = advanceFirstAct(dawnGame())
    s = emit(s, { type: 'PutAssetIntoPlay', investigator: 'a', code: D.west })
    s = ability(at(s, P.grandHall), 'ability.plaguebearer.dawn.resign')
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(s.campaignLog?.notes).toContain('plaguebearerWestLeading')
    let t = advanceFirstAct(dawnGame())
    t = ability(at(t, P.grandHall), 'ability.plaguebearer.dawn.resign')
    expect(t.outcome).toEqual({ type: 'resolution', resolution: 3 })
    expect(t.campaignLog?.notes).toContain('plaguebearerWestTaken')
  })
  it('R1 permite pagar cualquier precio: R5 cura los traumas físicos y añade las debilidades', () => {
    let s = dawnGame()
    s = {
      ...s,
      campaignLog: {
        ...s.campaignLog!,
        investigators: {
          a: { ...s.campaignLog!.investigators.a!, physicalTrauma: 2, killed: true },
        },
      },
    }
    s = dispatch(
      {
        ...s,
        investigators: s.investigators.map((i) => ({ ...i, eliminated: true })),
        pending: null,
        queue: [],
      },
      { type: 'EndScenario', outcome: { type: 'noResolution' } },
    )
    expect(s.pending?.question.story?.body).toBe('story.plaguebearer.dawn.resolution1')
    s = choose(s, 'choice.plaguebearer.dawn.payPrice')
    s = settle(s)
    while (s.pending?.question.prompt === 'prompt.plaguebearer.dawn.hidden')
      s = settle(choose(s, 'choice.skip'))
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 5 })
    const record = s.campaignLog!.investigators.a!
    expect(record.physicalTrauma).toBe(0)
    expect(record.killed).toBe(false)
    expect(record.storyAssets).toEqual(expect.arrayContaining([D.deathsHold, D.folly]))
    expect(s.campaignLog?.notes).toEqual(
      expect.arrayContaining(['plaguebearerBloodInVeins', 'plaguebearerSkipDeadOrAlive']),
    )
  })
  it('R1 con «de algo hay que morir» pierde la campaña', () => {
    let s = dawnGame()
    s = dispatch(
      {
        ...s,
        investigators: s.investigators.map((i) => ({ ...i, eliminated: true })),
        pending: null,
        queue: [],
      },
      { type: 'EndScenario', outcome: { type: 'noResolution' } },
    )
    s = settle(choose(s, 'choice.plaguebearer.dawn.dieSometime'))
    expect(s.campaignLog?.notes).toContain('campaignLost')
    expect(s.campaignLog?.investigators.a?.killed).toBe(true)
  })
  it('No puedes escapar: al fallar se elige horror por punto o atraer al Reanimado más lejano', () => {
    let s = advanceFirstAct(dawnGame())
    s = withBag(-10)(s)
    s = emit(s, {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: { kind: 'treachery', code: D.cantGetAway, name: 'Can’t Get Away!', keywords: [] },
    })
    expect(s.pending?.question.prompt).toBe('prompt.plaguebearer.dawn.cantGetAway')
    const before = getInvestigator(s, 'a').horror
    s = settle(applyInput(s, { investigator: 'a', choice: 0 }))
    expect(getInvestigator(s, 'a').horror).toBeGreaterThan(before)
  })
})
