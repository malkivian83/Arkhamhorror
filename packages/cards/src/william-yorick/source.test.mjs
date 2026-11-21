import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'vitest'

const read = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'))

test('exact FFG deck retains thirty ordinary cards, two signatures and random weakness', () => {
  const deck = read('./decklist-4816.json')
  assert.equal(deck.id, 4816)
  assert.equal(deck.investigator_code, '03005')
  assert.equal(deck.slots['03016'], 1)
  assert.equal(deck.slots['03017'], 1)
  assert.equal(deck.slots['01000'], 1)
  assert.equal(
    Object.values(deck.slots).reduce((a, b) => a + b, 0),
    33,
  )
  assert.equal(deck.description_md, undefined)
})

for (const locale of ['en', 'es']) {
  test(`${locale}: original investigator and primary signatures preserve printed rules`, () => {
    const cards = read(`./source-${locale}.json`)
    assert.deepEqual(
      cards.map((card) => card.code),
      ['03005', '03016', '03017'],
    )
    assert.equal(new Set(cards.map((card) => card.code)).size, 3)
    const [investigator, event, enemy] = cards
    assert.equal(investigator.deck_requirements.size, 30)
    assert.deepEqual(Object.keys(investigator.deck_requirements.card), ['03016', '03017'])
    assert.equal(event.cost, 0)
    assert.equal(event.victory, 1)
    assert.deepEqual(
      [enemy.enemy_fight, enemy.health, enemy.enemy_evade, enemy.enemy_damage, enemy.enemy_horror],
      [3, 3, 2, 1, 1],
    )
    for (const card of cards) {
      assert.ok(card.name)
      assert.ok(card.text)
      assert.ok(!card.text.includes('\uFFFD'))
    }
  })
}
