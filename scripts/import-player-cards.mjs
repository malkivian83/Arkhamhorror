#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import {
  buildCatalog,
  contentHash,
  coverageCsv,
  IMPORTER_VERSION,
  stableJson,
} from './cards-import/catalog.mjs'
import { inspectRuntime } from './cards-import/runtime.mjs'
import { publishBundle } from './cards-import/bundle.mjs'
import { fetchSnapshot, readSnapshot, sha256, SOURCES } from './cards-import/snapshots.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { values } = parseArgs({
  options: {
    'input-dir': { type: 'string' },
    'cache-dir': { type: 'string', default: join(tmpdir(), 'arkham-player-cards-cache') },
    output: { type: 'string', default: join(root, 'packages/cards/src/catalog/imports') },
    reference: { type: 'string' },
    write: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
})
if (values.help) {
  console.log(
    'Usage: node scripts/import-player-cards.mjs [--input-dir external-snapshots] [--cache-dir external-cache] [--reference reference-root] [--output staging-root] [--write]\nDefault: analysis only. --write saves an immutable inventory bundle; it never activates cards.',
  )
} else {
  await run()
}

async function run() {
  process.chdir(root)
  const sourceDirectory = resolve(values['input-dir'] ?? values['cache-dir'])
  if (
    sourceDirectory === root ||
    sourceDirectory.startsWith(root + '\\') ||
    sourceDirectory.startsWith(root + '/')
  )
    throw new Error('Raw snapshots must stay outside the repository')
  const snapshots = {}
  for (const name of Object.keys(SOURCES)) {
    snapshots[name] = values['input-dir']
      ? await readSnapshot(sourceDirectory, name)
      : await fetchSnapshot(name, sourceDirectory)
    console.log(
      `${name}: ${snapshots[name].data.length} records (${snapshots[name].meta.sha256.slice(0, 12)})`,
    )
  }
  const baselineBody = await readFile(join(root, 'packages/cards/src/data/core-2026.json'), 'utf8')
  let reference = [],
    referenceSource = null
  if (values.reference) {
    const body = await readFile(
      join(resolve(values.reference), 'backend/arkham-api/data/cards.json'),
      'utf8',
    )
    reference = JSON.parse(body)
    if (!Array.isArray(reference)) throw new Error('Expected reference cards.json array')
    referenceSource = {
      sha256: sha256(body),
      records: reference.length,
      scope: 'partial-reference-json-only',
    }
  }
  const runtime = await inspectRuntime()
  const result = buildCatalog({
    en: snapshots.en.data,
    es: snapshots.es.data,
    packs: snapshots.packs.data,
    baseline: JSON.parse(baselineBody),
    runtime,
    reference,
  })
  const identity = {
    importerVersion: IMPORTER_VERSION,
    sources: Object.fromEntries(
      Object.entries(snapshots).map(([name, snapshot]) => [name, snapshot.meta.sha256]),
    ),
    baselineSha256: sha256(baselineBody),
    runtimeSha256: contentHash(runtime),
    reference: referenceSource,
  }
  const id = contentHash(identity).slice(0, 16)
  const files = {
    'catalog.json': stableJson(result.catalog),
    'report.json': stableJson(result.report),
    'coverage.csv': coverageCsv(result.catalog.cards),
  }
  const manifest = {
    ...identity,
    id,
    scope: 'inventory-only-not-registered',
    sources: Object.fromEntries(
      Object.entries(snapshots).map(([name, snapshot]) => [name, snapshot.meta]),
    ),
    files: Object.fromEntries(Object.entries(files).map(([name, body]) => [name, sha256(body)])),
  }
  console.log(
    stableJson({
      mode: values.write ? 'write-inventory' : 'analysis-only',
      id,
      ...result.report.totals,
      corePilot: result.report.corePilot,
    }),
  )
  if (!values.write) return
  const published = await publishBundle(resolve(values.output), id, files, manifest)
  console.log(
    `${published.unchanged ? 'Unchanged' : 'Imported inventory'}: ${published.destination}`,
  )
}
