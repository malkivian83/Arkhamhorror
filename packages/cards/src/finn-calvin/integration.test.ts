// RR: Deckbuilding, Signature cards, Campaign Play. Official FFG starter decklists v7.
import { expect, it } from 'vitest'
import { allPlayerCardDefs, investigatorBehavior, playerCardDef } from '@lcg/engine'
import '../index'
import { isImplemented, newCampaign, startScenario } from '../campaign'
import {
  starterDeckList,
  validateDeck,
  investigatorCards,
  cardPool,
  deckFromArkhamDb,
} from '../decks'
import { STARTER_DECKS } from '../core-2026/player-cards'
import finn from './decklist-38677.json'
import calvin from './decklist-38679.json'
it.each([
  { key: 'finn', list: finn },
  { key: 'calvin', list: calvin },
])('$key preserves the exact official starter and can start a campaign', ({ key, list }) => {
  expect(STARTER_DECKS[key]!.investigatorCode).toBe(list.investigator_code)
  const d = starterDeckList(key, key, list.investigator_name)
  expect(deckFromArkhamDb(list, key).unknown).toEqual([])
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
  for (const c of new Set(signature))
    expect(d.cards.filter((code) => code === c)).toHaveLength(
      signature.filter((code) => code === c).length,
    )
})

it('Finn permits Illicit 0–5, Rogue 0–3 and at most five other Seeker/Survivor level-zero cards', () => {
  const pool = cardPool('04003')
  expect(pool.some((c) => c.traits.includes('Illicit') && (c.xp ?? 0) > 3)).toBe(true)
  expect(
    pool
      .filter((c) => c.class === 'rogue' && !c.traits.includes('Illicit'))
      .every((c) => (c.xp ?? 0) <= 3),
  ).toBe(true)
  const off = pool.filter(
    (c) =>
      ['seeker', 'survivor'].includes(c.class) &&
      !(c.classes ?? [c.class]).some((f) => ['rogue', 'neutral'].includes(f)) &&
      !c.traits.includes('Illicit'),
  )
  expect(off.length).toBeGreaterThanOrEqual(6)
  expect(off.every((c) => (c.xp ?? 0) === 0)).toBe(true)
  const problems = (n: number) =>
    validateDeck({
      id: 'finn',
      name: 'Finn',
      investigator: '04003',
      cards: off.slice(0, n).map((c) => c.code),
    }).problems
  expect(problems(5).some((p) => p.key === 'deck.problem.offClassLimit')).toBe(false)
  expect(problems(6).some((p) => p.key === 'deck.problem.offClassLimit')).toBe(true)
})

it('Calvin permits Survivor/Neutral 0–5 and Spirit 0–3, without offering signatures in purchases', () => {
  const pool = cardPool('04005')
  expect(pool.some((c) => c.class === 'guardian' && c.traits.includes('Spirit'))).toBe(true)
  expect(
    pool.every(
      (c) =>
        (c.classes ?? [c.class]).some((f) => ['survivor', 'neutral'].includes(f)) ||
        (c.traits.includes('Spirit') && (c.xp ?? 0) <= 3),
    ),
  ).toBe(true)
  for (const code of ['04010', '04011', '04012', '04015', '04016'])
    expect(pool.some((c) => c.code === code)).toBe(false)
})
it('registers all seven codes once with reviewed behavior', () => {
  for (const c of ['04003', '04010', '04011', '04012', '04005', '04015', '04016']) {
    expect(allPlayerCardDefs().filter((d) => d.code === c)).toHaveLength(1)
    expect(isImplemented(c)).toBe(true)
  }
})
