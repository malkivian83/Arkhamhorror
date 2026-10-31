// Doc 100, C1–C6: buying and upgrading between scenarios keeps the deck legal and pays
// what the rules ask (RR pp. 21–22 and 29, FAQ 1.8 and 1.18, customizable cards).
import { allPlayerCardDefs, playerCardDef } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import {
  campaignCanContinue,
  canPlayNext,
  customize,
  deckIssues,
  DeckProblemError,
  deckSize,
  deckSizeOf,
  isImplemented,
  isStandard,
  newCampaign,
  purchase,
  purchaseOptions,
  removableCards,
  startScenario,
  validateDeck,
  type Campaign,
} from './index'

/** After the first scenario, with experience to spend. */
function between(key: string, xp: number, deck?: (deck: string[]) => string[]): Campaign {
  const c = newCampaign('night-of-the-zealot', [key], 'standard', 3)
  const [m] = c.investigators
  return {
    ...c,
    scenarioIndex: 1,
    investigators: [{ ...m!, deck: deck ? deck(m!.deck) : m!.deck }],
    log: {
      ...c.log,
      investigators: { [m!.id]: { ...c.log.investigators[m!.id]!, xp } },
    },
  }
}
const def = (code: string) => playerCardDef(code)!
const classesOf = (code: string) => def(code).classes ?? [def(code).class]

describe('tienda entre escenarios', () => {
  it('C1: no ofrece ni deja comprar cartas con un rasgo excluido (Rex Murphy y Fortune)', () => {
    const c = between('rex', 10)
    const id = c.investigators[0]!.id
    expect(purchaseOptions(c, id).filter((o) => def(o.code).traits.includes('Fortune'))).toEqual([])
    const out = removableCards(c, id).find((code) => def(code).class === 'seeker')!
    expect(() => purchase(c, id, '10051', { remove: out })).toThrow()
  })

  it('C1: una compra que rompe el mínimo por clase de Lola se rechaza antes de gastar XP', () => {
    let c = between('lola', 10)
    const id = c.investigators[0]!.id
    const before = c.log.investigators[id]!.xp
    let error: unknown
    // Replace single-class cards of one class with neutral ones until the minimum breaks.
    for (let n = 0; n < 20 && !error; n++) {
      const deck = c.investigators[0]!.deck
      const counts = new Map<string, number>()
      for (const code of deck.filter(isStandard))
        for (const cls of classesOf(code)) counts.set(cls, (counts.get(cls) ?? 0) + 1)
      const [weakest] = [...counts].filter(([k]) => k !== 'neutral').sort((a, b) => a[1] - b[1])[0]!
      const out = removableCards(c, id).find(
        (code) => classesOf(code).length === 1 && classesOf(code)[0] === weakest,
      )
      const option = purchaseOptions(c, id).find(
        (o) =>
          !o.replaces && o.level === 0 && def(o.code).class === 'neutral' && !deck.includes(o.code),
      )
      if (!out || !option) break
      try {
        c = purchase(c, id, option.code, { remove: out })
      } catch (e) {
        error = e
      }
    }
    expect(error).toBeInstanceOf(DeckProblemError)
    expect((error as DeckProblemError).problem.key).toBe('deck.problem.classMinimum')
    // Every accepted purchase left a deck that can still start the next scenario.
    expect(deckIssues(c)).toEqual([])
    expect(c.log.investigators[id]!.xp).toBeLessThanOrEqual(before)
  })

  it('C2: mejora desde cada versión inferior y, sin indicarla, por la diferencia más baja', () => {
    const shrivelling = (xp: number) =>
      allPlayerCardDefs().find(
        (card) => card.name === 'Shrivelling' && (card.xp ?? 0) === xp && isImplemented(card.code),
      )?.code
    const [l0, l3, l5] = [shrivelling(0), shrivelling(3), shrivelling(5)]
    if (!l0 || !l3 || !l5) throw new Error('Shrivelling 0/3/5 not registered')
    const c = between('mateo', 20, (deck) => {
      const rest = deck.filter((code) => def(code)?.name !== 'Shrivelling')
      const removed = deck.length - rest.length
      return [l0, ...rest.slice(0, rest.length - (2 - removed)), l3]
    })
    const id = c.investigators[0]!.id
    expect(
      validateDeck({ id, name: id, investigator: id, cards: c.investigators[0]!.deck }, false)
        .problems,
    ).toEqual([])
    const options = purchaseOptions(c, id).filter((o) => o.code === l5 && o.replaces)
    expect(options.map((o) => [o.replaces, o.cost]).sort()).toEqual(
      [
        [l0, 5],
        [l3, 2],
      ].sort(),
    )
    const cheap = purchase(c, id, l5, { upgrade: true })
    expect(cheap.log.investigators[id]!.xp).toBe(18)
    expect(cheap.investigators[0]!.deck).toContain(l0)
    const chosen = purchase(c, id, l5, { upgrade: true, replaces: l0 })
    expect(chosen.log.investigators[id]!.xp).toBe(15)
    expect(chosen.investigators[0]!.deck).toContain(l3)
  })

  it('C3: el hueco que deja una mejora a Permanente se rellena pagando, no gratis', () => {
    let c = between('harvey', 4, (deck) => {
      if (deck.includes('60211')) return deck
      const copy = [...deck]
      copy[copy.findIndex((code) => isStandard(code) && def(code).class === 'seeker')] = '60211'
      return copy
    })
    const id = c.investigators[0]!.id
    c = purchase(c, id, '02187', { upgrade: true })
    const deck = c.investigators[0]!.deck
    expect(deckSize(deck)).toBe(deckSizeOf(id, deck) - 1)
    expect(c.investigators[0]!.owedFills).toBe(1)
    const fills = purchaseOptions(c, id).filter((o) => !o.replaces && o.level === 0)
    expect(fills.length).toBeGreaterThan(0)
    expect(fills.every((o) => o.cost >= 1)).toBe(true)
    const xp = c.log.investigators[id]!.xp
    c = purchase(c, id, fills[0]!.code)
    expect(c.log.investigators[id]!.xp).toBe(xp - fills[0]!.cost)
    expect(c.investigators[0]!.owedFills).toBeUndefined()
    expect(deckIssues(c)).toEqual([])
  })

  it('C4: un mazo que no puede empezar se avisa y bloquea el siguiente escenario', () => {
    const c = between('rex', 0, (deck) => {
      const copy = [...deck]
      copy.splice(copy.findIndex(isStandard), 1)
      return copy
    })
    expect(deckIssues(c)).toEqual([
      expect.objectContaining({
        investigator: c.investigators[0]!.id,
        problem: expect.objectContaining({ key: 'deck.problem.size' }),
      }),
    ])
    expect(canPlayNext(c)).toBe(false)
    // The campaign itself goes on: the shop stays open to fix the deck (online too).
    expect(campaignCanContinue(c)).toBe(true)
    expect(() => startScenario(c, 1)).toThrow('deck.problem.size')
  })

  it('C5: un mazo nuevo no trae apoyos de historia ni debilidades de campaña', () => {
    const c = newCampaign('night-of-the-zealot', ['rex'], 'standard', 3)
    const { id, deck } = c.investigators[0]!
    const story = validateDeck({ id, name: id, investigator: id, cards: [...deck, '02140'] })
    expect(story.problems).toContainEqual(
      expect.objectContaining({ key: 'deck.problem.notAllowed' }),
    )
    // During a campaign, the story asset given by the scenario is fine.
    const inCampaign = validateDeck(
      { id, name: id, investigator: id, cards: [...deck, '02140'] },
      false,
    )
    expect(inCampaign.problems).toEqual([])
  })

  it('C6: con la hoja de mejoras solo una copia nueva es gratis', () => {
    const c = between('rex', 5)
    const id = c.investigators[0]!.id
    const option = Object.keys(def('09119').customizable!)[0]!
    const out = removableCards(c, id)
      .filter((code) => def(code).class === 'seeker')
      .slice(0, 2)
    const one = customize(c, id, '09119', { [option]: 1 }, { copies: 1, remove: out.slice(0, 1) })
    expect(c.log.investigators[id]!.xp - one.log.investigators[id]!.xp).toBe(1)
    const two = customize(c, id, '09119', { [option]: 1 }, { copies: 2, remove: out })
    // 1 box + the second copy at level ceil(1/2) = 1.
    expect(c.log.investigators[id]!.xp - two.log.investigators[id]!.xp).toBe(2)
    expect(two.investigators[0]!.deck.filter((code) => code === '09119')).toHaveLength(2)
  })
})
