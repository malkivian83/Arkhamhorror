// RR: Researched, Costs (take horror, spend uses), Encounter Deck (reveal, discard, order),
// Peril, Elite.
import { playerCardBehavior, type EncounterCard, type GameState } from '@lcg/engine'
import { choose, ghoul, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions } from '../campaign'
import { abilityKeys, C, game, me, put, use } from './testing'

const card = (name: string, extra: Partial<EncounterCard> = {}): EncounterCard =>
  ({ ...ghoul, code: name, name, ...extra }) as EncounterCard
const peril: EncounterCard = {
  kind: 'treachery',
  code: 'peril',
  name: 'Peril',
  keywords: ['peril'],
}
const deck = [
  peril,
  card('Boss', { traits: ['Elite'] }),
  card('A'),
  card('B'),
  card('C'),
  card('D'),
  card('E'),
]
const withDeck = (s: GameState) => put({ ...s, encounterDeck: deck }, '60279')
const names = (s: GameState) => s.encounterDeck.map((c) => c.name)

describe('Scroll of the Pharaohs: Words of Bast', () => {
  it('takes 1 horror and spends 1 secret to reveal 3, discard 1 eligible and order the rest', () => {
    let s = use(withDeck(game()), '60279:bast:1')
    expect(me(s).horror).toBe(1)
    expect(s.assets['60279']!.uses).toBe(3)
    // Peril and Elite cards cannot be chosen: A is the only eligible card.
    expect(s.pending!.question.choices.map((c) => c.params?.card)).toEqual(['Peril', 'Boss'])
    s = choose(s, 'choice.divinationNext', { card: 'Boss' })
    expect(s.encounterDiscard.map((c) => c.name)).toEqual(['A'])
    expect(names(s)).toEqual(['Boss', 'Peril', 'B', 'C', 'D', 'E'])
  })

  it('with 2 secrets reveals 6 cards and returns the rest in the chosen order', () => {
    let s = use(withDeck(game()), '60279:bast:2')
    expect(s.assets['60279']!.uses).toBe(2)
    expect(s.pending!.question.choices.map((c) => c.params?.card)).toEqual(['A', 'B', 'C', 'D'])
    s = choose(s, 'choice.pharaohsDiscard', { card: 'C' })
    for (const name of ['D', 'Boss', 'A', 'Peril', 'B'])
      s = labels(s).length ? choose(s, 'choice.divinationNext', { card: name }) : s
    expect(s.encounterDiscard.map((c) => c.name)).toEqual(['C'])
    expect(names(s)).toEqual(['D', 'Boss', 'A', 'Peril', 'B', 'E'])
  })

  it('needs enough secrets and an encounter deck', () => {
    const s = put({ ...game(), encounterDeck: deck }, '60279', { uses: 1 })
    expect(abilityKeys(s)).toContain('60279:bast:1')
    expect(abilityKeys(s)).not.toContain('60279:bast:2')
    const empty = put({ ...game(), encounterDeck: [] }, '60279')
    expect(abilityKeys(empty)).not.toContain('60279:bast:1')
  })

  it('is Researched: upgrades an Untranslated copy only after unearthing the secrets', () => {
    expect(playerCardBehavior('60279')!.requiredResearch).toBe(
      'you have unearthed the secrets of the Pharaohs',
    )
    let c = newCampaign('night-of-the-zealot', ['carolyn'], 'standard')
    c.log.investigators[C]!.xp = 10
    const bast = () => purchaseOptions(c, C).filter((o) => o.code === '60279')
    expect(bast()).toEqual([])
    c.log.notes.push('you have unearthed the secrets of the Pharaohs')
    expect(bast().every((o) => o.replaces === '60259' && o.cost === 4)).toBe(true)
    expect(bast()).toHaveLength(1)
    c = purchase(c, C, '60279', { upgrade: true })
    expect(c.investigators[0]!.deck).toContain('60279')
    expect(c.investigators[0]!.deck.filter((code) => code === '60259')).toHaveLength(1)
  })
})
