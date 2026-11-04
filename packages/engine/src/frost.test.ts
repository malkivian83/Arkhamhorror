import { describe, expect, it } from 'vitest'
import { registerScenario } from './content'
import { getInvestigator } from './state'
import { choose, during, newTestGame, withBag } from './testing'
import type { ChaosToken, GameState, Message } from './types'

// Los confines de la Tierra, Helada: −1 y revela otra ficha; la segunda Helada de la
// misma prueba detiene las revelaciones y la prueba fracasa automáticamente.
const inv = (s: GameState) => getInvestigator(s, 'a')
// Una ficha nombrada no sale de la bolsa; `drawn` la trata como ya sacada de ella.
const revealing = (token: ChaosToken): Message => ({ type: 'RevealChaosToken', token })
const drawing = (token: ChaosToken): Message => ({ type: 'RevealChaosToken', token, drawn: true })

// Escenario de prueba: la calavera resuelve, en orden, las fichas indicadas.
let skullReveals: Message[] = []
registerScenario({
  id: 'test-frost',
  tokenEffect: (_s, token, investigator) =>
    token === 'skull'
      ? { modifier: 0, immediate: skullReveals }
      : { modifier: 0, after: [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 }] },
})
const scenario = { id: 'test-frost' }
const investigate = (bag: ChaosToken[], shroud = 2) =>
  choose(
    during(newTestGame({ scenario }), (s) => ({
      ...withBag(...bag)(s),
      locations: { ...s.locations, A: { ...s.locations.A!, shroud } },
    })),
    'action.investigate',
  )

describe('Helada', () => {
  it('modifica en −1 y revela otra ficha, que no puede ser la misma', () => {
    // intelecto 3: Helada −1 y la bolsa queda vacía → 2 contra velo 2. Si la Helada
    // volviera antes a la bolsa saldría otra vez y la prueba fracasaría.
    const game = investigate(['frost'])
    expect(inv(game).clues).toBe(1)
    expect(game.chaosBag).toEqual(['frost'])
  })

  it('los modificadores se acumulan con la ficha adicional', () => {
    // Helada −1 y −1 → 1 contra 2: fracasa.
    skullReveals = [revealing('frost'), revealing(-1)]
    expect(inv(investigate(['skull'])).clues).toBe(0)
  })

  it('la segunda Helada en la misma prueba es fracaso automático', () => {
    // Velo 0: 3 − 2 = 1 superaría la prueba sin el fracaso automático.
    const game = investigate(['frost', 'frost'], 0)
    expect(inv(game).clues).toBe(0)
    expect(game.chaosBag).toEqual(['frost', 'frost'])
  })

  it('la segunda Helada detiene las revelaciones pendientes', () => {
    skullReveals = [drawing('frost'), drawing('frost'), revealing('elderThing')]
    expect(inv(investigate(['skull'])).damage).toBe(0)
    // Sin segunda Helada, la revelación pendiente se resuelve.
    skullReveals = [drawing('frost'), revealing('elderThing')]
    expect(inv(investigate(['skull'])).damage).toBe(1)
  })

  it('solo cuentan las Heladas reveladas de la bolsa, no las selladas o nombradas', () => {
    // Velo 0: dos Heladas que no salen de la bolsa suman −2 sin fracaso automático.
    skullReveals = [revealing('frost'), revealing('frost')]
    expect(inv(investigate(['skull'], 0)).clues).toBe(1)
    // Una Helada nombrada no cuenta como la primera: la de la bolsa no fracasa.
    skullReveals = [revealing('frost'), drawing('frost')]
    expect(inv(investigate(['skull'], 0)).clues).toBe(1)
  })

  it('una Helada sellada (Premonición) no cuenta para la segunda', () => {
    const game = choose(
      during(newTestGame(), (s) => ({
        ...withBag('frost')(s),
        locations: { ...s.locations, A: { ...s.locations.A!, shroud: 0 } },
        sealed: [{ investigator: 'a', code: 'x', token: 'frost' }],
      })),
      'action.investigate',
    )
    // La sellada −1 revela la de la bolsa −1: 3 − 2 = 1 contra 0, sin fracaso automático.
    expect(inv(game).clues).toBe(1)
  })

  it('una Helada ignorada no modifica ni revela otra ficha', () => {
    // Si se resolviera, −1 y la otra ficha −1 → 1 contra 2: fracasaría.
    skullReveals = [{ type: 'IgnoreSkillTestTokens', tokens: ['frost'] }, revealing('frost')]
    const game = investigate(['skull', -1])
    expect(inv(game).clues).toBe(1)
  })

  it('cada prueba empieza su propio recuento de Heladas', () => {
    let game = investigate(['frost'])
    expect(inv(game).clues).toBe(1)
    game = choose(game, 'action.investigate')
    expect(inv(game).clues).toBe(2)
  })

  it('no hay más de ocho Heladas entre la bolsa y las fichas selladas', () => {
    const frost = (n: number) => Array.from({ length: n }, (): ChaosToken => 'frost')
    const game = during(
      newTestGame(),
      (s) => ({
        ...withBag(...frost(2), 0)(s),
        sealed: [{ investigator: 'a', code: 'x', token: 'frost' }],
      }),
      { type: 'AddChaosTokens', tokens: [...frost(6), -1] },
    )
    expect(game.chaosBag.filter((t) => t === 'frost')).toHaveLength(7)
    expect(game.chaosBag).toContain(-1)
  })
})
