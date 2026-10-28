// RR: Customizable, Deckbuilding, Experience. Partial boxes count toward level.
import { allPlayerCardDefs, customizedCard, playerCardDef, validCustomizations } from '@lcg/engine'
import { expect, it } from 'vitest'
import {
  newCampaign,
  customize,
  purchase,
  purchaseOptions,
  startScenario,
  finishScenario,
  isImplemented,
} from '../campaign'
import { deckFromArkhamDb, starterDeckList, validateDeck } from '../decks'
import { STELLA } from '../stella-clark/codes'
import guide from '../stella-clark/decklist-39832.json'
import { STELLA_SIDEBOARD_CODES } from './index'

const CODE = '09119'
const campaign = () => {
  const c = newCampaign('night-of-the-zealot', ['stella'], 'standard')
  c.log.investigators[STELLA]!.xp = 20
  return c
}

it('all sideboard codes are implemented once and available to purchase', () => {
  for (const code of Object.keys(guide.sideSlots)) expect(isImplemented(code), code).toBe(true)
  for (const code of STELLA_SIDEBOARD_CODES) {
    expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
    expect(
      purchaseOptions(campaign(), STELLA).some((o) => o.code === code),
      code,
    ).toBe(true)
  }
})

it('buys two copies with a single shared sheet, preserves upgrades into the scenario', () => {
  let c = customize(
    campaign(),
    STELLA,
    CODE,
    { telescanner: 2, empoweredConfiguration: 4 },
    { copies: 2, remove: ['60505', '60505'] },
  )
  expect(c.log.investigators[STELLA]!.xp).toBe(14)
  expect(c.investigators[0]!.deck.filter((c) => c === CODE)).toHaveLength(2)
  c = customize(c, STELLA, CODE, { telescanner: 2, empoweredConfiguration: 4, aethericLink: 1 })
  expect(c.log.investigators[STELLA]!.xp).toBe(13)
  expect(customizedCard(playerCardDef(CODE)!, c.investigators[0]!.customizations).xp).toBe(4)
  const s = startScenario(c, 2, false)
  expect(s.investigators[0]!.customizations).toEqual(c.investigators[0]!.customizations)
  expect(JSON.parse(JSON.stringify(c)).investigators[0].customizations).toEqual(
    c.investigators[0]!.customizations,
  )
})

it('cannot undo purchases, overspend, exceed ten boxes, add illegal options or excess copies', () => {
  const c = customize(campaign(), STELLA, CODE, { telescanner: 2 }, { remove: ['60505'] })
  expect(() => customize(c, STELLA, CODE, { railshooter: 2 })).toThrow()
  expect(() =>
    customize(c, STELLA, CODE, {
      telescanner: 2,
      railshooter: 2,
      empoweredConfiguration: 4,
      aethericLink: 4,
    }),
  ).toThrow()
  expect(() => customize(c, STELLA, CODE, { telescanner: 2, invented: 1 })).toThrow()
  expect(() => customize(c, STELLA, CODE, { telescanner: 3 })).toThrow()
  expect(() =>
    customize(
      c,
      STELLA,
      CODE,
      { telescanner: 2, railshooter: 2 },
      { copies: 2, remove: ['60506', '60506'] },
    ),
  ).toThrow()
  c.log.investigators[STELLA]!.xp = 0
  expect(() => customize(c, STELLA, CODE, { telescanner: 2, railshooter: 1 })).toThrow()
})

it('regular additional copies pay their customized level; the final exile clears the sheet', () => {
  let c = customize(
    campaign(),
    STELLA,
    CODE,
    { telescanner: 2, empoweredConfiguration: 4 },
    { remove: ['60505'] },
  )
  expect(purchaseOptions(c, STELLA).find((o) => o.code === CODE)?.cost).toBe(3)
  c = purchase(c, STELLA, CODE, { remove: '60505' })
  const s = startScenario(c, 2, false)
  const ended = {
    ...s,
    outcome: { type: 'resolution' as const, resolution: 1 },
    exiled: [{ investigator: STELLA, code: CODE }],
  }
  expect(finishScenario(c, ended).investigators[0]!.customizations?.[CODE]).toBeDefined()
  ended.exiled.push({ investigator: STELLA, code: CODE })
  expect(finishScenario(c, ended).investigators[0]!.customizations?.[CODE]).toBeUndefined()
})

it('initial experience pays a shared sheet once; deckbuilding enforces the upgraded level', () => {
  const d = starterDeckList('stella', 's', 's')
  d.cards.splice(d.cards.indexOf('60505'), 2, CODE, CODE)
  d.cards.push('08125')
  const deck = { ...d, customizations: { [CODE]: { telescanner: 2 } } }
  expect(validateDeck(deck).problems).toEqual([])
  expect(
    validateDeck({
      ...deck,
      customizations: { [CODE]: { telescanner: 2, aethericLink: 4 } },
    }).problems.map((p) => p.key),
  ).toContain('deck.problem.levelAtStart')
  expect(validCustomizations(deck.cards, { [CODE]: { railshooter: -1 } })).toBe(false)
})

it('imports ArkhamDB upgrade metadata and rejects malformed boxes', () => {
  const base = { name: 'Shotcaster', investigator_code: STELLA, slots: { [CODE]: 2 } }
  const imported = deckFromArkhamDb(
    { ...base, meta: JSON.stringify({ cus_09119: '1|2,6|4' }) },
    'test',
  )
  expect(imported.deck.customizations).toEqual({
    [CODE]: { telescanner: 2, empoweredConfiguration: 4 },
  })
  expect(() =>
    deckFromArkhamDb({ ...base, meta: JSON.stringify({ cus_09119: '1|99' }) }, 'test'),
  ).toThrow()
})
