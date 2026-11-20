// RR: Deckbuilding, Signature cards, Campaign Play. Official FFG starter decklists v7.
import { expect, it } from 'vitest'
import { allPlayerCardDefs, investigatorBehavior, playerCardDef } from '@lcg/engine'
import '../index'
import { isImplemented, newCampaign, startScenario } from '../campaign'
import { starterDeckList, validateDeck, investigatorCards } from '../decks'
import { STARTER_DECKS } from '../core-2026/player-cards'
import roland from './decklist-38701.json'
import daisy from './decklist-38702.json'
import skids from './decklist-38700.json'
import agnes from './decklist-38699.json'
it.each([
  { key: 'roland', list: roland },
  { key: 'daisy', list: daisy },
  { key: 'skids', list: skids },
  { key: 'agnes', list: agnes },
])('$key preserves the exact official starter and can start a campaign', ({ key, list }) => {
  expect(STARTER_DECKS[key]!.investigatorCode).toBe(list.investigator_code)
  const d = starterDeckList(key, key, list.investigator_name)
  expect(d.cards.toSorted()).toEqual(
    [
      ...Object.entries(list.slots)
        .filter(([c]) => c !== '01000')
        .flatMap(([c, n]) => Array.from({ length: n }, () => c)),
      '12104',
    ].toSorted(),
  )
  expect(validateDeck(d)).toMatchObject({ size: 30, problems: [] })
  for (const c of [d.investigator, ...d.cards]) expect(isImplemented(c), c).toBe(true)
  expect(investigatorCards().filter((c) => c.code === d.investigator)).toHaveLength(1)
  const campaign = newCampaign('night-of-the-zealot', [key], 'standard', 3),
    game = startScenario(campaign, 3, false)
  expect(game.investigators[0]!.id).toBe(d.investigator)
  expect(investigatorBehavior(d.investigator)).toBeDefined()
  const signature = playerCardDef(d.investigator)!.signatures!
  for (const c of signature) expect(d.cards.filter((code) => code === c)).toHaveLength(1)
})
it('keeps each investigator’s actual secondary class and excludes foreign signatures', () => {
  const secondaries = { roland: 'seeker', daisy: 'mystic', skids: 'guardian', agnes: 'survivor' }
  for (const [key, secondary] of Object.entries(secondaries)) {
    const d = starterDeckList(key, key, key),
      i = playerCardDef(d.investigator)!
    expect(i.deckOptions).toContainEqual({ classes: [secondary], maxLevel: 2 })
    const foreign = key === 'roland' ? '01008' : '01006'
    expect(
      validateDeck({ ...d, cards: [...d.cards.slice(0, -1), foreign] }).problems.map((p) => p.key),
    ).toContain('deck.problem.otherSignature')
  }
})
it('registers each investigator and exclusive exactly once with its reviewed behavior', () => {
  for (const code of [
    '01001',
    '01002',
    '01003',
    '01004',
    '01006',
    '01007',
    '01008',
    '01009',
    '01010',
    '01011',
    '01012',
    '01013',
  ]) {
    expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
    expect(isImplemented(code)).toBe(true)
  }
})
