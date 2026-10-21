import { describe, expect, it } from 'vitest'
import { newCampaign } from './campaign'
import { code, STARTER_DECKS } from './core-2026/player-cards'
import {
  arkhamDbDeckId,
  cardPool,
  deckFromArkhamDb,
  emptyDeck,
  investigatorCards,
  starterDeckList,
  validateDeck,
  withRandomBasicWeakness,
  type DeckList,
} from './decks'
import { COLLECTOR } from './brethren-of-ash/queen-of-ash'
import { printingsOf, reprintSource } from './reprints'
import './index'

const DANIELA = code(1)
const keys = (deck: DeckList, campaignStart = true) =>
  validateDeck(deck, campaignStart).problems.map((p) => p.key)
const daniela = () => starterDeckList('daniela', 'd', 'Daniela')
const without = (cards: string[], card: string) => {
  const i = cards.indexOf(card)
  return [...cards.slice(0, i), ...cards.slice(i + 1)]
}

describe('mazos: validación', () => {
  it('los cinco mazos iniciales son válidos y ya llevan debilidad básica', () => {
    for (const key of Object.keys(STARTER_DECKS)) {
      const check = validateDeck(starterDeckList(key, key, key))
      expect(check.problems).toEqual([])
      expect(check.needsBasicWeakness).toBe(false)
      expect(check.size).toBe(30)
    }
  })

  it('tamaño: 30 cartas sin contar exclusivas ni debilidades', () => {
    const deck = daniela()
    expect(keys({ ...deck, cards: without(deck.cards, code(20)) })).toEqual(['deck.problem.size'])
  })

  it('cartas fuera de sus opciones, de otro investigador o de nivel > 0 al empezar', () => {
    const base = without(daniela().cards, code(20))
    // Deduction (buscador) no está entre las opciones de Daniela.
    expect(keys({ ...daniela(), cards: [...base, code(39)] })).toEqual(['deck.problem.notAllowed'])
    // Detective's Intuition es exclusiva de Joe.
    expect(keys({ ...daniela(), cards: [...base, code(5)] })).toEqual([
      'deck.problem.otherSignature',
      'deck.problem.size',
    ])
    // Counterattack (nivel 1): no al empezar la campaña, sí después.
    const leveled = { ...daniela(), cards: [...base, code(26)] }
    expect(keys(leveled)).toEqual(['deck.problem.levelAtStart'])
    expect(keys(leveled, false)).toEqual([])
  })

  it('como mucho 2 copias por título y las exclusivas son obligatorias', () => {
    const base = without(daniela().cards, code(19))
    expect(keys({ ...daniela(), cards: [...base, code(20), code(20)] })).toContain(
      'deck.problem.tooManyCopies',
    )
    expect(keys({ ...daniela(), cards: without(daniela().cards, code(2)) })).toEqual([
      'deck.problem.missingSignature',
    ])
  })

  it('el mazo vacío lleva las exclusivas y el catálogo respeta las opciones', () => {
    expect(emptyDeck(DANIELA, 'x', 'x').cards).toEqual([code(2), code(3)])
    const pool = cardPool(DANIELA)
    expect(pool.every((c) => ['guardian', 'neutral', 'survivor'].includes(c.class))).toBe(true)
    expect(pool.some((c) => c.class === 'survivor' && (c.xp ?? 0) > 2)).toBe(false)
  })

  it('el catálogo muestra una sola impresión de cada carta', () => {
    const deductions = cardPool(code(4)).filter((c) => c.name === 'Deduction' && !c.xp)
    expect(deductions.map((c) => c.code)).toEqual([code(39)])
    for (const investigator of investigatorCards()) {
      const titles = cardPool(investigator.code).map((c) => `${c.name}|${c.xp ?? 0}|${c.class}`)
      expect(titles.filter((t, i) => titles.indexOf(t) !== i)).toEqual([])
    }
  })

  it('las reimpresiones llevan a la carta original', () => {
    expect(reprintSource('01539')).toBe('01039')
    expect(reprintSource(code(39))).toBe('01039')
    expect(printingsOf('60219')).toEqual(expect.arrayContaining(['01039', code(39), '01539']))
  })
})

describe('mazos: debilidad básica al azar', () => {
  it('se añade una si falta, siempre la misma con la misma semilla', () => {
    const cards = without(daniela().cards, code(104))
    const a = withRandomBasicWeakness(cards, 7)
    expect(a).toHaveLength(cards.length + 1)
    expect(withRandomBasicWeakness(cards, 7)).toEqual(a)
    expect(withRandomBasicWeakness(daniela().cards, 7)).toEqual(daniela().cards)
  })

  it('una campaña con mazo propio recibe la debilidad al empezar', () => {
    const cards = without(daniela().cards, code(104))
    const campaign = newCampaign('brethren-of-ash', [{ investigator: DANIELA, cards }], 'easy', 3)
    expect(campaign.investigators[0]!.deck).toHaveLength(cards.length + 1)
  })
})

describe('mazos: ArkhamDB', () => {
  it('reconoce enlaces de mazos publicados y privados', () => {
    expect(arkhamDbDeckId('https://arkhamdb.com/decklist/view/12345/joe-1.0')).toEqual({
      kind: 'decklist',
      id: '12345',
    })
    expect(arkhamDbDeckId('https://arkhamdb.com/deck/view/678')).toEqual({
      kind: 'deck',
      id: '678',
    })
    expect(arkhamDbDeckId(' 999 ')).toEqual({ kind: 'decklist', id: '999' })
    expect(arkhamDbDeckId('no es un mazo')).toBeNull()
  })

  it('conserva todas las cartas e informa de los códigos todavía desconocidos', () => {
    const { deck, unknown } = deckFromArkhamDb(
      { name: 'Mazo', investigator_code: DANIELA, slots: { [code(20)]: 2, '01016': 1 } },
      'id',
    )
    expect(deck.cards).toEqual([code(20), code(20), '01016'])
    expect(unknown).toEqual(['01016'])
    const other = deckFromArkhamDb({ name: 'Roland', investigator_code: '01001', slots: {} }, 'id')
    expect(other.deck.investigator).toBe('01001')
    expect(other.unknown).toEqual(['01001'])
  })
})

describe('mazos: recompensa Collector', () => {
  const relicOrCharm = () =>
    cardPool(DANIELA, { deck: [COLLECTOR] }).find(
      (c) => !cardPool(DANIELA).some((own) => own.code === c.code),
    )

  it('solo se puede incluir si se ha ganado', () => {
    const deck = { ...daniela(), cards: [...daniela().cards, COLLECTOR] }
    expect(keys(deck)).toContain('deck.problem.rewardNotEarned')
    expect(validateDeck(deck, true, [COLLECTOR]).problems.map((p) => p.key)).not.toContain(
      'deck.problem.rewardNotEarned',
    )
    expect(cardPool(DANIELA, { rewards: [COLLECTOR] }).some((c) => c.code === COLLECTOR)).toBe(true)
  })

  it('+5 al tamaño del mazo y 1 apoyo Relic o Charm de otra clase', () => {
    const extra = relicOrCharm()
    expect(extra?.traits.some((t) => t === 'Relic' || t === 'Charm')).toBe(true)
    const base = { ...daniela(), cards: [...daniela().cards, COLLECTOR] }
    expect(validateDeck(base, true, [COLLECTOR]).problems).toEqual([
      { key: 'deck.problem.size', params: { n: 30, size: 35 } },
    ])
    const two = { ...base, cards: [...base.cards, extra!.code, extra!.code] }
    expect(validateDeck(two, false, [COLLECTOR]).problems.map((p) => p.key)).toContain(
      'deck.problem.notAllowed',
    )
  })
})
