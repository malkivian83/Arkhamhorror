// RR: Deckbuilding, Signature Cards, Uses, Researched. Reproducible Carolyn Fern definitions.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'vitest'
import { buildStarterDefinitions } from './investigator-starters.mjs'
const path = (name) => new URL('../../packages/cards/src/' + name, import.meta.url)
const read = (name) => JSON.parse(readFileSync(path(name), 'utf8'))
const inventory = read('catalog/imports/3c8ee4b5d8100766/catalog.json').cards

test('carolyn-fern: official snapshots retain both languages, exact codes and fingerprints', () => {
  const approvals = read('carolyn-fern/approvals.json')
  assert.equal(approvals.sourceBundle, '3c8ee4b5d8100766')
  for (const language of ['en', 'es']) {
    const body = readFileSync(path(`carolyn-fern/source-${language}.json`))
    const source = JSON.parse(body)
    const metadata = approvals.sources.find((s) => s.language === language)
    assert.equal(
      metadata.url,
      `https://${language === 'es' ? 'es.' : ''}arkhamdb.com/api/public/cards/car.json`,
    )
    assert.equal(metadata.sha256, createHash('sha256').update(body).digest('hex'))
    assert.deepEqual(
      source.map((c) => c.code),
      Array.from({ length: 32 }, (_, n) => String(60251 + n)),
    )
    assert.ok(source.every((c) => c.pack_code === 'car' && c.name && c.text))
  }
})

test('carolyn-fern: reviewed definitions reproduce exactly and reject unreviewed approvals', () => {
  const approvals = read('carolyn-fern/approvals.json')
  const source = read('carolyn-fern/source-en.json')
  assert.deepEqual(
    buildStarterDefinitions(inventory, source, approvals),
    read('data/carolyn-fern.json'),
  )
  assert.throws(
    () =>
      buildStarterDefinitions(inventory, source, {
        cards: [{ ...approvals.cards[0], status: 'pending' }],
      }),
    /Unreviewed starter card/,
  )
  assert.equal(new Set(approvals.cards.map((a) => a.code)).size, approvals.cards.length)
})
