import { accountStorage } from '../account/storage'
import { newCampaign, startScenario } from '@lcg/cards'
import { during, throughSetup } from '@lcg/engine/testing'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decodeSession, session, SESSION_KEY } from '../game/session'
import { markOf } from '../game/undo'
import { useGameStore } from './game'

let values: Map<string, string>
beforeEach(() => {
  accountStorage.clear()
  values = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
  vi.stubGlobal('document', { visibilityState: 'hidden' })
  setActivePinia(createPinia())
})
afterEach(() => vi.unstubAllGlobals())
function start() {
  let state = throughSetup(
    startScenario(newCampaign('the-midwinter-gala', ['joe'], 'standard'), 13),
  )
  state = during(
    state,
    (s) => ({
      ...s,
      agendaIndex: 1,
      investigators: s.investigators.map((i) => ({ ...i, clues: 5 })),
    }),
    {
      type: 'PutAssetIntoPlay',
      investigator: '12004',
      code: '71017',
    },
  )
  const game = useGameStore()
  expect(
    game.importSession(
      JSON.stringify(session(state, { base: state, inputs: [], marks: [markOf(state)] }, null)),
    ),
  ).toBe(true)
  const choice = game.state!.pending!.question.choices.findIndex(
    (c) => c.label === 'action.advanceAct',
  )
  expect(choice).toBeGreaterThanOrEqual(0)
  game.answer(choice)
  expect(game.error).toBeNull()
  return game
}
describe('aceptación obligatoria del recorrido de avance', () => {
  it('bloquea decisiones y conserva exactamente el motor e historial al aceptar cada pantalla', () => {
    const game = start()
    expect(game.advanceReview.length).toBeGreaterThan(2)
    expect(game.state!.actIndex).toBe(0)
    const frozen = JSON.stringify(game.state)
    const history = JSON.stringify(JSON.parse(game.exportSession()).history)
    game.answer(0)
    expect(JSON.stringify(game.state)).toBe(frozen)
    while (game.advanceReview.length) {
      const remaining = game.advanceReview.length
      game.acceptAdvance()
      expect(game.advanceReview).toHaveLength(remaining - 1)
      expect(JSON.stringify(game.state)).toBe(frozen)
      const saved = decodeSession(accountStorage.getItem(SESSION_KEY)!)
      expect(JSON.stringify(saved.history)).toBe(history)
      expect(saved.advanceReview).toHaveLength(remaining - 1)
    }
    game.answer(0)
    expect(game.error).toBeNull()
    expect(game.state!.actIndex).toBe(1)
    expect(game.advanceReview.some((f) => f.stage === 'next' && f.cards[0]?.code === '71006')).toBe(
      true,
    )
  })
  it('recargar o importar conserva la pantalla pendiente y no repite las ya aceptadas', () => {
    let game = start()
    game.acceptAdvance()
    const remaining = structuredClone(game.advanceReview)
    const state = JSON.stringify(game.state)
    const raw = game.exportSession()
    setActivePinia(createPinia())
    game = useGameStore()
    expect(game.advanceReview).toEqual(remaining)
    expect(JSON.stringify(game.state)).toBe(state)
    expect(game.importSession(raw)).toBe(true)
    expect(game.advanceReview).toEqual(remaining)
  })
  it('deshacer elimina los avisos de la rama descartada y permite volver a avanzar', () => {
    const game = start()
    game.undo('step')
    expect(game.advanceReview).toEqual([])
    expect(game.state!.actIndex).toBe(0)
    const choice = game.state!.pending!.question.choices.findIndex(
      (c) => c.label === 'action.advanceAct',
    )
    expect(choice).toBeGreaterThanOrEqual(0)
    game.answer(choice)
    expect(game.advanceReview.some((f) => f.stage === 'reverse')).toBe(true)
  })
  it('reanuda un guardado anterior sin avisos dentro de un reverso', () => {
    const game = start()
    const data = JSON.parse(game.exportSession())
    delete data.advanceReview
    expect(game.importSession(JSON.stringify(data))).toBe(true)
    expect(game.advanceReview.map((f) => f.stage)).toEqual(['reverse', 'decision'])
  })
})
