// RR: Deck Customization, Signature Cards, Setup, Campaign Play, Base Value, Elder Sign.
import { dispatch, playerCardDef } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { investigatorCards, starterDeckList, validateDeck, cardPool } from '../decks'
import { newCampaign, startScenario, purchase, purchaseOptions } from '../campaign'
import { investigatorSetup } from '../core-2026/player-cards'
import { patch } from '../dunwich-pilot/testing'
import { clear, duke, makeGame, PETE } from './testing'

const starter = () => starterDeckList('pete', 'pete', 'Pete')
const offClass = ['12020', '12020', '12023', '12023', '01030', '01030']
describe('Pete integration', () => {
  it('rejects a duplicated Duke or signature weakness instead of hiding the extra copy at setup', () => {
    for (const code of ['02014', '02015']) {
      const deck = starter()
      deck.cards.push(code)
      expect(validateDeck(deck).problems.map((p) => p.key)).toEqual(['deck.problem.tooManyCopies'])
    }
  })
  it('is selectable with a legal 30-card starter and two required cards plus a basic weakness', () => {
    const deck = starter()
    expect(investigatorCards().map((c) => c.code)).toContain(PETE)
    expect(deck.cards).toHaveLength(33)
    expect(validateDeck(deck).problems).toEqual([])
    expect(validateDeck(deck).size).toBe(30)
    expect(validateDeck(deck).needsBasicWeakness).toBe(false)
    const campaign = newCampaign('brethren-of-ash', ['pete'], 'easy')
    const s = startScenario(campaign, 9, false)
    expect(duke(s).owner).toBe(PETE)
    expect(s.investigators[0]!.health).toBe(6)
  })
  it('permits exactly five level-zero cards of other classes, counting copies', () => {
    for (const n of [5, 6]) {
      const deck = starter()
      deck.cards.splice(3, n, ...offClass.slice(0, n))
      expect(validateDeck(deck).problems.map((p) => p.key)).toEqual(
        n === 5 ? [] : ['deck.problem.offClassLimit'],
      )
    }
  })
  it('rejects other-class upgrades and another investigator signature', () => {
    for (const code of ['02299', '12002']) {
      const deck = starter()
      deck.cards.splice(3, 1, code)
      expect(validateDeck(deck, false).problems.map((p) => p.key)).toContain(
        code === '12002' ? 'deck.problem.otherSignature' : 'deck.problem.notAllowed',
      )
    }
    expect(cardPool(PETE).some((c) => c.code === '02299')).toBe(false)
    expect(cardPool(PETE).some((c) => c.code === '12020')).toBe(true)
  })
  it('does not let Duke into another investigator deck or shop', () => {
    const deck = starterDeckList('daniela', 'd', 'D')
    deck.cards.splice(1, 1, '02014')
    expect(validateDeck(deck).problems.map((p) => p.key)).toContain('deck.problem.otherSignature')
    const c = newCampaign('brethren-of-ash', ['daniela'], 'easy')
    c.log.investigators[c.investigators[0]!.id]!.xp = 10
    expect(purchaseOptions(c, c.investigators[0]!.id).some((o) => o.code === '02014')).toBe(false)
  })
  it('permits a legal off-class purchase but blocks a sixth without spending experience', () => {
    const deck = starter()
    deck.cards.splice(3, 5, ...offClass.slice(0, 5))
    const c = newCampaign('brethren-of-ash', [{ investigator: PETE, cards: deck.cards }], 'easy')
    c.log.investigators[PETE]!.xp = 5
    // A fresh level-zero off-class title, with one free title slot.
    const candidate = purchaseOptions(c, PETE).find(
      (o) => playerCardDef(o.code)?.class === 'mystic' && o.level === 0 && !o.replaces,
    )!
    expect(candidate).toBeDefined()
    expect(() => purchase(c, PETE, candidate.code, { remove: '12094' })).toThrow('Máximo 5')
    expect(c.log.investigators[PETE]!.xp).toBe(5)
    const bought = purchase(c, PETE, candidate.code, { remove: offClass[0]! })
    expect(validateDeck({ ...deck, cards: bought.investigators[0]!.deck }, false).problems).toEqual(
      [],
    )
  })
  it('reveals elder sign and readies Duke immediately, before resolving the test', () => {
    let s = dispatch(clear(patch({ hand: ['12090'] }, PETE)(makeGame())), {
      type: 'ExhaustAsset',
      asset: duke(makeGame()).id,
    })
    s = { ...s, chaosBag: ['elderSign'] }
    s = dispatch(s, {
      type: 'BeginSkillTest',
      investigator: PETE,
      skill: 'willpower',
      difficulty: 99,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    })
    // Pete offers his free ability before revealing; decline it without paying.
    s = choose(s, 'choice.revealToken')
    expect(duke(s).exhausted).toBe(false)
    expect(s.investigators[0]!.hand).toHaveLength(1)
  })
  it('uses Duke base for Rise to the Occasion restrictions, not printed Pete combat', () => {
    const s = dispatch(clear(patch({ hand: ['02192'] }, PETE)(makeGame())), {
      type: 'BeginSkillTest',
      investigator: PETE,
      skill: 'combat',
      baseSkill: 4,
      difficulty: 4,
      kind: { type: 'effect', source: 'duke', onSuccess: [], onFail: [], onFailEach: [] },
    })
    expect(s.pending?.question.choices.some((c) => c.label === 'choice.commit') ?? false).toBe(
      false,
    )
  })
  it('preserves the original investigator setup when loading an existing starter', () => {
    expect(investigatorSetup('12001', []).skills.combat).toBe(5)
    expect(investigatorSetup(PETE, []).skills.willpower).toBe(4)
  })
  it('offers Pete during another investigator turn without consuming that investigator actions', () => {
    let s = makeGame(true)
    // Select the first turn if the multiplayer setup asks.
    if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
      s = choose(s, 'choice.investigator', { name: s.investigators[0]!.name })
    s = dispatch(
      clear(patch({ hand: ['12089'] }, PETE)(s)),
      { type: 'ExhaustAsset', asset: duke(s).id },
      { type: 'PlayerWindow', investigator: 'b' },
    )
    expect(s.pending!.question.choices.some((c) => c.label === 'ability.peteReady')).toBe(true)
  })
})
