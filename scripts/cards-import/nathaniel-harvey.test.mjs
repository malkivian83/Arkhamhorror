// RR: Deckbuilding, Signature Cards, Uses, Permanent. Reproducible pack definitions.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'vitest'
import { buildStarterDefinitions } from './investigator-starters.mjs'
import { assertEquivalent } from './equivalence.mjs'
const path = (name) => new URL('../../packages/cards/src/' + name, import.meta.url)
const read = (name) => JSON.parse(readFileSync(path(name), 'utf8'))
const inventory = read('catalog/imports/3c8ee4b5d8100766/catalog.json').cards

test('Dodge is an exact reviewed reprint of its registered behavior source', () => {
  const approval = read('nathaniel-cho/approvals.json').cards.find((c) => c.code === '60113')
  const source = read('nathaniel-cho/dodge-source.json')
  const target = read('nathaniel-cho/source-en.json').find((c) => c.code === '60113')
  assert.equal(approval.behaviorSource, source.code)
  assert.equal(assertEquivalent(source, target), approval.equivalenceSha256)
})

for (const [name, pack, first, total] of [
  ['nathaniel-cho', 'nat', 60101, 32],
  ['harvey-walters', 'har', 60201, 33],
]) {
  test(name + ': official snapshots retain both languages, exact codes and fingerprints', () => {
    const approvals = read(name + '/approvals.json')
    assert.equal(approvals.sourceBundle, '3c8ee4b5d8100766')
    for (const language of ['en', 'es']) {
      const body = readFileSync(path(`${name}/source-${language}.json`))
      const source = JSON.parse(body)
      const metadata = approvals.sources.find((s) => s.language === language)
      assert.equal(
        metadata.url,
        `https://${language === 'es' ? 'es.' : ''}arkhamdb.com/api/public/cards/${pack}.json`,
      )
      assert.equal(metadata.sha256, createHash('sha256').update(body).digest('hex'))
      assert.equal(source.length, total)
      assert.deepEqual(
        source.map((c) => c.code),
        Array.from({ length: total }, (_, n) => String(first + n)),
      )
      assert.ok(source.every((c) => c.pack_code === pack && c.name && c.text))
    }
  })

  test(name + ': reviewed definitions reproduce exactly and reject unreviewed approvals', () => {
    const approvals = read(name + '/approvals.json')
    const definitions = read('data/' + name + '.json')
    const source = read(name + '/source-en.json')
    // Structural reproduction does not confer a rules approval. Runtime coverage is
    // checked separately by each pack's rules and the starter integration tests.
    const reviewed = {
      ...approvals,
      cards: approvals.cards.map((a) => ({ ...a, status: 'verified' })),
    }
    assert.deepEqual(buildStarterDefinitions(inventory, source, reviewed), definitions)
    assert.throws(
      () =>
        buildStarterDefinitions(inventory, source, {
          cards: [{ ...reviewed.cards[0], status: 'pending' }],
        }),
      /Unreviewed starter card/,
    )
    assert.throws(
      () =>
        buildStarterDefinitions(
          inventory,
          source.filter((c) => c.code !== reviewed.cards[0].code),
          reviewed,
        ),
      /Unsupported starter card/,
    )
    assert.equal(new Set(approvals.cards.map((a) => a.code)).size, approvals.cards.length)
  })
}

test('packs retain exactly one data entry per code across all historical and new batches', () => {
  const directory = path('data/')
  const definitions = readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) => {
      const data = JSON.parse(readFileSync(new URL(name, directory), 'utf8'))
      return Array.isArray(data) ? data : []
    })
  for (const card of [
    ...read('nathaniel-cho/source-en.json'),
    ...read('harvey-walters/source-en.json'),
  ])
    assert.equal(definitions.filter((d) => d.code === card.code).length, 1, card.code)
})
