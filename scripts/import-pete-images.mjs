import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const manifestPath = 'apps/web/src/game/cardImageManifest.json'
const inventoryPath = 'docs-proyecto/evidencias/imagenes-locales.json'
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'))
for (const language of ['en', 'es']) {
  await mkdir(`apps/web/public/local-assets/cards/${language}`, { recursive: true })
  for (const art of ['02005', '02005b', '02014', '02015']) {
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
const portraitSource = 'https://assets.arkhamhorror.app/img/arkham/portraits/02005.jpg'
const portrait = await fetch(portraitSource, { signal: AbortSignal.timeout(20000) })
if (!portrait.ok) throw new Error('Missing Pete portrait: ' + portrait.status)
const bytes = Buffer.from(await portrait.arrayBuffer())
if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Invalid Pete portrait')
await writeFile('apps/web/public/local-assets/setup/02005.jpg', bytes)
await writeFile(
  'docs-proyecto/evidencias/pete-recursos-oficiales.json',
  JSON.stringify(
    {
      reference: 'frontend/src/arkham/cardImages.ts and helpers.ts in the reference application',
      cards: inventory.files.filter((f) => ['02005', '02005b', '02014', '02015'].includes(f.art)),
      portrait: {
        source: portraitSource,
        path: '/local-assets/setup/02005.jpg',
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    },
    null,
    2,
  ) + '\n',
)
