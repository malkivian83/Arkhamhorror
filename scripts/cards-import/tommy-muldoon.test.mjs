// RR: Deckbuilding, Signature Cards, Uses. Reproducible Tommy Muldoon pack definitions.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'vitest'
import { buildStarterDefinitions } from './investigator-starters.mjs'
import { assertEquivalent } from './equivalence.mjs'
const path = (name) => new URL('../../packages/cards/src/' + name, import.meta.url)
const read = (name) => JSON.parse(readFileSync(path(name), 'utf8'))
const inventory = read('catalog/imports/3c8ee4b5d8100766/catalog.json').cards
const approvals = read('tommy-muldoon/approvals.json')

test('Vicious Blow (2) 60176 is an exact reviewed reprint of 02299', () => {
  const approval = approvals.cards.find((c) => c.code === '60176')
  const source = read('tommy-muldoon/vicious-blow-source.json')
  const target = read('tommy-muldoon/source-en.json').find((c) => c.code === '60176')
  assert.equal(approval.behaviorSource, source.code)
  assert.equal(target.duplicate_of_code, source.code)
  assert.equal(assertEquivalent(source, target), approval.equivalenceSha256)
})

test('official snapshots retain both languages, exact codes and fingerprints', () => {
  assert.equal(approvals.sourceBundle, '3c8ee4b5d8100766')
  assert.deepEqual(approvals.sets, ['https://arkhamdb.com/set/tom'])
  for (const [file, url] of [
    ['source-en.json', 'https://arkhamdb.com/api/public/cards/tom.json'],
    ['source-es.json', 'https://es.arkhamdb.com/api/public/cards/tom.json'],
    ['vicious-blow-source.json', 'https://arkhamdb.com/api/public/card/02299'],
  ]) {
    const body = readFileSync(path('tommy-muldoon/' + file))
    const metadata = approvals.sources.find((s) => s.url === url)
    assert.equal(metadata.sha256, createHash('sha256').update(body).digest('hex'), file)
  }
  for (const language of ['en', 'es']) {
    const source = read(`tommy-muldoon/source-${language}.json`)
    assert.deepEqual(
      source.map((c) => c.code),
      Array.from({ length: 32 }, (_, n) => String(60151 + n)),
    )
    assert.ok(source.every((c) => c.pack_code === 'tom' && c.name && c.text))
  }
})

test('reviewed definitions reproduce exactly and reject unreviewed approvals', () => {
  const definitions = read('data/tommy-muldoon.json')
  const source = read('tommy-muldoon/source-en.json')
  assert.deepEqual(buildStarterDefinitions(inventory, source, approvals), definitions)
  assert.deepEqual(definitions.find((d) => d.code === '60152').uses, { count: 2, type: 'ammo' })
  assert.throws(
    () =>
      buildStarterDefinitions(inventory, source, {
        cards: [{ ...approvals.cards[0], status: 'pending' }],
      }),
    /Unreviewed starter card/,
  )
  assert.throws(
    () =>
      buildStarterDefinitions(
        inventory,
        source.filter((c) => c.code !== approvals.cards[0].code),
        approvals,
      ),
    /Unsupported starter card/,
  )
  assert.equal(new Set(approvals.cards.map((a) => a.code)).size, approvals.cards.length)
})

test('each code keeps exactly one data entry across all historical and new batches', () => {
  const directory = path('data/')
  const definitions = readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) => {
      const data = JSON.parse(readFileSync(new URL(name, directory), 'utf8'))
      return Array.isArray(data) ? data : []
    })
  for (const { code } of approvals.cards)
    assert.equal(definitions.filter((d) => d.code === code).length, 1, code)
})
