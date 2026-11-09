// RR: Deckbuilding, Signature Cards. Reproducible Miguel de la Cruz pack definitions.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'vitest'
import { buildStarterDefinitions } from './investigator-starters.mjs'
import { assertEquivalent } from './equivalence.mjs'
const path = (name) => new URL('../../packages/cards/src/' + name, import.meta.url)
const read = (name) => JSON.parse(readFileSync(path(name), 'utf8'))
const inventory = read('catalog/imports/3c8ee4b5d8100766/catalog.json').cards
const approvals = read('miguel-de-la-cruz/approvals.json')

test("Rabbit's Foot is an exact reviewed reprint of its registered behavior source", () => {
  const approval = approvals.cards.find((c) => c.code === '60560')
  const source = read('miguel-de-la-cruz/rabbits-foot-source.json')
  const target = read('miguel-de-la-cruz/source-en.json').find((c) => c.code === '60560')
  assert.equal(approval.behaviorSource, source.code)
  assert.equal(assertEquivalent(source, target), approval.equivalenceSha256)
})

test('official snapshots retain both languages, exact codes and fingerprints', () => {
  assert.equal(approvals.sourceBundle, '3c8ee4b5d8100766')
  for (const language of ['en', 'es']) {
    const body = readFileSync(path(`miguel-de-la-cruz/source-${language}.json`))
    const source = JSON.parse(body)
    const metadata = approvals.sources.find((s) => s.language === language)
    assert.equal(
      metadata.url,
      `https://${language === 'es' ? 'es.' : ''}arkhamdb.com/api/public/cards/mig.json`,
    )
    assert.equal(metadata.sha256, createHash('sha256').update(body).digest('hex'))
    assert.deepEqual(
      source.map((c) => c.code),
      Array.from({ length: 32 }, (_, n) => String(60551 + n)),
    )
    assert.ok(source.every((c) => c.pack_code === 'mig' && c.name && c.text))
  }
})

test('reviewed definitions reproduce exactly from the frozen inventory', () => {
  const source = read('miguel-de-la-cruz/source-en.json')
  assert.deepEqual(
    buildStarterDefinitions(inventory, source, approvals),
    read('data/miguel-de-la-cruz.json'),
  )
  assert.equal(new Set(approvals.cards.map((a) => a.code)).size, approvals.cards.length)
})

test('each code of the pack has exactly one data entry across all batches', () => {
  const directory = path('data/')
  const definitions = readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) => {
      const data = JSON.parse(readFileSync(new URL(name, directory), 'utf8'))
      return Array.isArray(data) ? data : []
    })
  for (const card of read('miguel-de-la-cruz/source-en.json'))
    assert.equal(definitions.filter((d) => d.code === card.code).length, 1, card.code)
})
