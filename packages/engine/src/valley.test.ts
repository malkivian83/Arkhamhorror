import { describe, expect, it } from 'vitest'
import { createGame, dispatch } from './engine'
import { seedRng } from './rng'
import { choose, newTestGame, testInvestigator, testScenario, throughSetup } from './testing'
import type { ChaosToken, GameState, Message } from './types'
import {
  activeTimeText,
  advanceValleyTime,
  applyValleyFatigue,
  changeRelationship,
  crossOutResident,
  drawValleyFatigue,
  newValley,
  recordResidentNote,
  relationshipLevel,
  residentAvailable,
  residentHasNote,
  residentMarks,
} from './valley'

const fresh = (): GameState => ({ ...newTestGame({ players: ['a'] }), queue: [], pending: null })
const run = (...messages: Message[]) => dispatch(fresh(), { type: 'InitializeValley' }, ...messages)
const numbers = (bag: ChaosToken[]) => bag.filter((t): t is number => typeof t === 'number')

// Guía de La fiesta del Valle de la Cicuta, p. 3, «Habitantes y niveles de relación».
describe('Valle de la Cicuta: habitantes', () => {
  it('sube y baja de una en una, se fija en 0 y no pasa de las casillas impresas', () => {
    let valley = changeRelationship(newValley(), 'leahAtwood')
    valley = changeRelationship(valley, 'leahAtwood', 2)
    expect(valley.residents.leahAtwood.level).toBe(3)
    expect(changeRelationship(valley, 'leahAtwood', -1).residents.leahAtwood.level).toBe(2)
    expect(changeRelationship(valley, 'leahAtwood', -5).residents.leahAtwood.level).toBe(0)
    expect(changeRelationship(valley, 'leahAtwood', 1, true).residents.leahAtwood.level).toBe(0)
    expect(changeRelationship(valley, 'leahAtwood', 9).residents.leahAtwood.level).toBe(6)
    expect(changeRelationship(valley, 'judithPark', 9).residents.judithPark.level).toBe(7)
    expect(changeRelationship(valley, 'leahAtwood', 0)).toBe(valley)
  })

  it('el tachado impide entrar en juego y anula notas, marcas y nivel', () => {
    let valley = changeRelationship(newValley(), 'simeonAtwood', 3)
    valley = recordResidentNote(valley, 'simeonAtwood', 'thePlanIsUnderway', 1)
    valley = recordResidentNote(valley, 'simeonAtwood', 'thePlanIsUnderway', 2)
    const log = { notes: [], crossedOut: [], values: {}, chaosTokens: [], investigators: {} }
    const before = { ...log, valley }
    expect(residentHasNote(before, 'simeonAtwood', 'thePlanIsUnderway')).toBe(true)
    expect(valley.residents.simeonAtwood.notes).toEqual(['thePlanIsUnderway'])
    expect(residentMarks(before, 'simeonAtwood', 'thePlanIsUnderway')).toBe(3)
    expect(relationshipLevel(before, 'simeonAtwood')).toBe(3)
    const after = { ...log, valley: crossOutResident(valley, 'simeonAtwood') }
    expect(residentAvailable(after, 'simeonAtwood')).toBe(false)
    expect(residentHasNote(after, 'simeonAtwood', 'thePlanIsUnderway')).toBe(false)
    expect(residentMarks(after, 'simeonAtwood', 'thePlanIsUnderway')).toBe(0)
    expect(relationshipLevel(after, 'simeonAtwood')).toBe(0)
    expect(residentAvailable(after, 'leahAtwood')).toBe(true)
  })

  it('aplica los mensajes de registro solo cuando la campaña tiene estado del Valle', () => {
    expect(dispatch(fresh(), { type: 'ChangeRelationship', resident: 'theoPeters' })).toEqual(
      fresh(),
    )
    const game = run(
      { type: 'ChangeRelationship', resident: 'theoPeters', amount: 2 },
      { type: 'RecordResidentNote', resident: 'theoPeters', note: 'theoSharedADance' },
      { type: 'CrossOutResident', resident: 'motherRachel' },
      { type: 'SurveyArea', area: 'westernWoods' },
      { type: 'SurveyArea', area: 'westernWoods' },
      { type: 'ChooseCodexEntry', entry: 'firstEvening:3' },
    )
    const valley = game.campaignLog!.valley!
    expect(valley.residents.theoPeters).toEqual({ level: 2, notes: ['theoSharedADance'] })
    expect(valley.residents.motherRachel.crossedOut).toBe(true)
    expect(valley.areasSurveyed).toEqual(['westernWoods'])
    expect(valley.codexChosen).toEqual(['firstEvening:3'])
    expect(dispatch(game, { type: 'InitializeValley' }).campaignLog!.valley).toBe(valley)
  })
})

// Guía, p. 3, «Día y noche», y registro, p. 70, «Día/Hora».
describe('Valle de la Cicuta: Indicador de tiempo', () => {
  it('avanza de Día 1 a Noche 3 y se detiene allí', () => {
    const steps = [newValley()]
    for (let i = 0; i < 6; i++) steps.push(advanceValleyTime(steps.at(-1)!))
    expect(steps.map((v) => `${v.time}${v.day}`)).toEqual([
      'day1',
      'night1',
      'day2',
      'night2',
      'day3',
      'night3',
      'night3',
    ])
    const set = run({ type: 'SetValleyTime', day: 2, time: 'night' }, { type: 'AdvanceValleyTime' })
    expect(set.campaignLog!.valley).toMatchObject({ day: 3, time: 'day' })
  })

  it('deja solo los efectos (Día)/(Noche) de la hora actual, en inglés y en español', () => {
    const en =
      '<b>(Day [day])</b> You get +1 [combat]. <b>(Night [night])</b> You get +1 [agility].\nForced – After…'
    expect(activeTimeText(en, 'day')).toBe(
      '<b>(Day [day])</b> You get +1 [combat].\nForced – After…',
    )
    expect(activeTimeText(en, 'night')).toBe(
      '<b>(Night [night])</b> You get +1 [agility].\nForced – After…',
    )
    const es = 'Cazador. (<b>Noche</b> [night]) Represalia.\nEl Engendro recibe +X de salud.'
    expect(activeTimeText(es, 'day')).toBe('Cazador.\nEl Engendro recibe +X de salud.')
    expect(activeTimeText(es, 'night')).toBe(es)
    expect(activeTimeText('(<b>Día</b>[day]) Recibes +1[intellect].', 'day')).toBe(
      '(<b>Día</b>[day]) Recibes +1[intellect].',
    )
  })
})

// Guía, pp. 39 y 51: «La fatiga de la larga noche os pasa factura».
describe('Valle de la Cicuta: fatiga', () => {
  const bag: ChaosToken[] = [0, -1, -2, -8, 'skull', 'skull', 'elderSign', 'tablet', 'autoFail']

  it('sustituye dos fichas numéricas por la de una unidad menos, igual con la misma semilla', () => {
    const first = drawValleyFatigue(bag, seedRng(7))
    expect(drawValleyFatigue(bag, seedRng(7))).toEqual(first)
    expect(first.fatigue).toHaveLength(2)
    for (const { from, to } of first.fatigue) expect(to).toBe(from - 1)
    expect(numbers(first.bag).reduce((a, b) => a + b)).toBe(
      numbers(bag).reduce((a, b) => a + b) - 2,
    )
    expect(first.bag.filter((t) => typeof t !== 'number')).toEqual(
      bag.filter((t) => typeof t !== 'number'),
    )
    expect(applyValleyFatigue(bag, first.fatigue).sort()).toEqual([...first.bag].sort())
  })

  it('repite cuando sale un −8 hasta haber sustituido dos fichas', () => {
    for (let seed = 0; seed < 40; seed++) {
      const { fatigue } = drawValleyFatigue([-8, -8, -8, -2, 'skull'], seedRng(seed))
      expect(fatigue).toEqual([
        { from: -2, to: -3 },
        { from: -3, to: -4 },
      ])
    }
    expect(drawValleyFatigue([-8, 'skull'], seedRng(1)).fatigue).toEqual([])
  })

  it('cambia la bolsa de la partida, conserva bendiciones y lo anota para el resto de la campaña', () => {
    const game = { ...fresh(), chaosBag: [...bag, 'bless'] as ChaosToken[] }
    const next = dispatch(game, { type: 'InitializeValley' }, { type: 'ValleyFatigue' })
    const fatigue = next.campaignLog!.valley!.fatigue
    expect(fatigue).toHaveLength(2)
    expect(next.chaosBag).toContain('bless')
    expect([...next.chaosBag].sort()).toEqual([...applyValleyFatigue(bag, fatigue), 'bless'].sort())
    expect(next.log.filter((entry) => entry.key === 'log.valleyFatigue')).toHaveLength(2)
    expect(dispatch(game, { type: 'ValleyFatigue' })).toEqual(game)
  })
})

// Guía, p. 6: el preludio y el escenario siguiente son la misma partida.
describe('Valle de la Cicuta: arrastre del preludio al escenario', () => {
  it('empieza con la mano, los recursos, las pistas y el apoyo conservados, sin mulligan', () => {
    const deck = Array.from({ length: 20 }, (_, n) => `a-card-${n}`)
    const game = createGame({
      seed: 3,
      interactive: true,
      scenario: testScenario(),
      investigators: [
        testInvestigator('a', {
          deck,
          carried: { hand: ['a-card-1', 'a-card-2'], resources: 3, clues: 2 },
        }),
      ],
    })
    const ready = throughSetup(game)
    const a = ready.investigators[0]!
    expect(a.hand).toEqual(['a-card-1', 'a-card-2'])
    expect(a.resources).toBe(3)
    expect(a.clues).toBe(2)
    expect(a.deck).toHaveLength(18)
    expect(a.deck).not.toContain('a-card-1')
    expect(ready.log.some((entry) => entry.key.includes('mulligan'))).toBe(false)
  })

  it('descarta a elección hasta el tamaño indicado', () => {
    const game = {
      ...fresh(),
      investigators: fresh().investigators.map((i) => ({ ...i, hand: ['x', 'y', 'z'] })),
    }
    let s = dispatch(game, { type: 'DiscardDownTo', investigator: 'a', size: 1 })
    expect(s.pending?.question.prompt).toBe('prompt.discardDownTo')
    s = choose(s, 'choice.discard', { card: 'x' })
    s = choose(s, 'choice.discard', { card: 'z' })
    expect(s.investigators[0]!.hand).toEqual(['y'])
    expect(s.pending).toBeNull()
  })
})
