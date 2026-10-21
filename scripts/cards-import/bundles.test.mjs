import { describe, expect, it } from 'vitest'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { contentHash } from './catalog.mjs'
import { sha256 } from './snapshots.mjs'

const root = fileURLToPath(new URL('../../packages/cards/src/catalog/imports/', import.meta.url))

describe('saved inventory bundles', () => {
  it('verifies provenance, checksums and full accounting of all imported rows', async () => {
    const bundles = (await readdir(root)).filter((name) => /^[a-f0-9]{16}$/.test(name))
    expect(bundles.length).toBeGreaterThan(0)
    for (const id of bundles) {
      const directory = join(root, id)
      const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'))
      expect(manifest.scope).toBe('inventory-only-not-registered')
      expect(
        contentHash({
          importerVersion: manifest.importerVersion,
          sources: Object.fromEntries(
            Object.entries(manifest.sources).map(([key, source]) => [key, source.sha256]),
          ),
          baselineSha256: manifest.baselineSha256,
          runtimeSha256: manifest.runtimeSha256,
          reference: manifest.reference,
        }).slice(0, 16),
      ).toBe(id)
      for (const [file, hash] of Object.entries(manifest.files))
        expect(sha256(await readFile(join(directory, file)))).toBe(hash)
      const { cards } = JSON.parse(await readFile(join(directory, 'catalog.json'), 'utf8'))
      const report = JSON.parse(await readFile(join(directory, 'report.json'), 'utf8'))
      expect(cards.length).toBe(report.totals.sourceEnglish)
      expect(new Set(cards.map((card) => card.code)).size).toBe(cards.length)
      expect(report.totals.imported + report.totals.excluded).toBe(report.totals.sourceEnglish)
      expect(report.byPack.reduce((sum, pack) => sum + pack.total, 0)).toBe(cards.length)
      expect(cards.every((card) => card.activation === 'not-reviewed')).toBe(true)
      for (const card of cards) {
        expect(card).not.toHaveProperty('text')
        expect(card).not.toHaveProperty('real_text')
        expect(card).not.toHaveProperty('flavor')
      }
    }
  })
})

describe('reprints list', () => {
  it('matches every duplicateOf relation of the imported catalogs', async () => {
    const duplicates = JSON.parse(await readFile(join(root, '../../data/duplicates.json'), 'utf8'))
    for (const id of (await readdir(root)).filter((name) => /^[a-f0-9]{16}$/.test(name))) {
      const catalog = JSON.parse(await readFile(join(root, id, 'catalog.json'), 'utf8'))
      for (const card of catalog.cards) {
        const original = card.relations?.duplicateOf
        if (original) expect(duplicates[card.code]).toBe(original)
      }
    }
  })
})
