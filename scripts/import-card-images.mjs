#!/usr/bin/env node
// Downloads official EN/ES card scans (and optionally a setup portrait) for the
// given art codes, using the CDN paths of the reference application. Existing
// manifest entries and historical inventory hashes are never rewritten.
// Usage: node scripts/import-card-images.mjs 02003 02003b 02010 [--portrait 02003]
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { parseArgs } from 'node:util'

const { values, positionals: arts } = parseArgs({
  allowPositionals: true,
  options: { portrait: { type: 'string', multiple: true, default: [] } },
})
if (!arts.length && !values.portrait.length) {
  console.log('Usage: node scripts/import-card-images.mjs <art codes...> [--portrait code]')
  process.exit(1)
}
const manifestPath = 'apps/web/src/game/cardImageManifest.json'
const inventoryPath = 'docs-proyecto/evidencias/imagenes-locales.json'
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'))
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const download = async (source) => {
  const response = await fetch(source, { signal: AbortSignal.timeout(20000) })
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
    throw new Error(`Missing official image ${source}: ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}
const evidence = []
for (const language of ['en', 'es']) {
  await mkdir(`apps/web/public/local-assets/cards/${language}`, { recursive: true })
  for (const art of arts) {
    if (manifest[language][art]) {
      console.log(`${language}/${art}: already present, unchanged`)
      continue
    }
    const source = `https://assets.arkhamhorror.app/img/arkham/${language === 'es' ? 'es/' : ''}cards/${art}.avif`
    const bytes = await download(source)
    if (bytes.length < 1000 || bytes.subarray(4, 8).toString() !== 'ftyp')
      throw new Error('Invalid AVIF: ' + source)
    const path = `/local-assets/cards/${language}/${art}.avif`
    await writeFile('apps/web/public' + path, bytes)
    manifest[language][art] = path
    const entry = { art, language, path, source, bytes: bytes.length, sha256: sha256(bytes) }
    inventory.files.push(entry)
    evidence.push(entry)
    console.log(`${language}/${art}: ${bytes.length} bytes`)
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
await writeFile(inventoryPath, JSON.stringify(inventory, null, 2) + '\n')
for (const code of values.portrait) {
  const source = `https://assets.arkhamhorror.app/img/arkham/portraits/${code}.jpg`
  const bytes = await download(source)
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Invalid portrait JPEG: ' + source)
  const path = `/local-assets/setup/${code}.jpg`
  await writeFile('apps/web/public' + path, bytes)
  evidence.push({
    art: code,
    language: 'portrait',
    path,
    source,
    bytes: bytes.length,
    sha256: sha256(bytes),
  })
  console.log(`portrait ${code}: ${bytes.length} bytes`)
}
// Provenance of this run, to paste into the batch evidence file.
console.log(JSON.stringify(evidence, null, 2))
