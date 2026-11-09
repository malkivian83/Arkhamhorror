// RR: Deckbuilding, Signature Cards. Reproducible definitions of Marie Lambeau's starter pack.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'vitest'
import { buildStarterDefinitions } from './investigator-starters.mjs'
import { assertEquivalent } from './equivalence.mjs'
const path = (name) => new URL('../../packages/cards/src/' + name, import.meta.url)
const read = (name) => JSON.parse(readFileSync(path(name), 'utf8'))
const inventory = read('catalog/imports/3c8ee4b5d8100766/catalog.json').cards
const lot = 'marie-lambeau-2025'

test('official snapshots retain both languages, the 33 codes and their fingerprints', () => {
  const approvals = read(lot + '/approvals.json')
  assert.equal(approvals.sourceBundle, '3c8ee4b5d8100766')
  for (const language of ['en', 'es']) {
    const body = readFileSync(path(`${lot}/source-${language}.json`))
    const source = JSON.parse(body)
    const metadata = approvals.sources.find((s) => s.language === language)
    assert.equal(
      metadata.url,
      `https://${language === 'es' ? 'es.' : ''}arkhamdb.com/api/public/cards/mar.json`,
    )
    assert.equal(metadata.sha256, createHash('sha256').update(body).digest('hex'))
    assert.deepEqual(
      source.map((c) => c.code),
      Array.from({ length: 33 }, (_, n) => String(60451 + n)),
    )
    assert.ok(source.every((c) => c.pack_code === 'mar' && c.name && c.text))
  }
})

test('Arcane Initiate and Torrent of Power are exact reprints of their behavior sources', () => {
  const approvals = read(lot + '/approvals.json')
  const sources = read(lot + '/reprint-sources.json')
  const target = read(lot + '/source-en.json')
  for (const approval of approvals.cards.filter((c) => c.behaviorSource)) {
    const source = sources.find((c) => c.code === approval.behaviorSource)
    const card = target.find((c) => c.code === approval.code)
    assert.equal(card.duplicate_of_code, source.code)
    assert.equal(assertEquivalent(source, card), approval.equivalenceSha256)
  }
})

test('reviewed definitions reproduce exactly and reject unreviewed approvals', () => {
  const approvals = read(lot + '/approvals.json')
  const source = read(lot + '/source-en.json')
  assert.deepEqual(
    buildStarterDefinitions(inventory, source, approvals),
    read('data/' + lot + '.json'),
  )
  assert.throws(
    () =>
      buildStarterDefinitions(inventory, source, {
        cards: [{ ...approvals.cards[0], status: 'pending' }],
      }),
    /Unreviewed starter card/,
  )
})

test('each code of the lot has exactly one data entry across all batches', () => {
  const directory = path('data/')
  const definitions = readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) => {
      const data = JSON.parse(readFileSync(new URL(name, directory), 'utf8'))
      return Array.isArray(data) ? data : []
    })
  for (const { code } of read(lot + '/approvals.json').cards)
    assert.equal(definitions.filter((d) => d.code === code).length, 1, code)
})
