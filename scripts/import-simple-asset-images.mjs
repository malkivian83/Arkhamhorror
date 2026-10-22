import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const manifestPath = 'apps/web/src/game/cardImageManifest.json'
const inventoryPath = 'docs-proyecto/evidencias/imagenes-locales.json'
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'))
for (const language of ['en', 'es']) {
  await mkdir(`apps/web/public/local-assets/cards/${language}`, { recursive: true })
  for (const art of [
    '09057',
    '09075',
    '52001',
    '60529',
    '60575',
    '08025',
    '01054',
    '04196',
    '03151',
    '04275',
    '01040',
    '03230',
  ]) {
    if (manifest[language][art]) continue
    const source = `https://assets.arkhamhorror.app/img/arkham/${language === 'es' ? 'es/' : ''}cards/${art}.avif`
    const response = await fetch(source, { signal: AbortSignal.timeout(20000) })
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
      throw new Error(`Missing official card scan ${language}/${art}: ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length < 1000 || bytes.subarray(4, 8).toString() !== 'ftyp')
      throw new Error('Invalid AVIF: ' + source)
    const path = `/local-assets/cards/${language}/${art}.avif`
    await writeFile('apps/web/public' + path, bytes)
    manifest[language][art] = path
    inventory.files.push({
      art,
      language,
      path,
      source,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
    console.log(`${language}/${art}: ${bytes.length} bytes`)
  }
}
// Existing historical entries and their hashes remain unchanged.
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
await writeFile(inventoryPath, JSON.stringify(inventory, null, 2) + '\n')
