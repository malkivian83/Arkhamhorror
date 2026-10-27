// Imágenes oficiales de El encuentro. Conserva las entradas e inventarios existentes.
// Uso: node scripts/import-zealot-images.mjs
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const arts = Array.from({ length: 16 }, (_, n) => String(1104 + n).padStart(5, '0')).flatMap(
  (code) => (Number(code) <= 1115 ? [code, `${code}b`] : [code]),
)
const manifestPath = 'apps/web/src/game/cardImageManifest.json'
const before = JSON.parse(await readFile(manifestPath, 'utf8'))
const tasks = ['en', 'es'].flatMap((language) =>
  arts.filter((art) => !before[language][art]).map((art) => ({ language, art })),
)
const files = []
const failed = []
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (tasks.length) {
      const { language, art } = tasks.shift()
      const source = `https://assets.arkhamhorror.app/img/arkham/${language === 'es' ? 'es/' : ''}cards/${art}.avif`
      try {
        const response = await fetch(source, { signal: AbortSignal.timeout(25000) })
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
          throw new Error(`${response.status}`)
        const bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.length < 1000 || bytes.subarray(4, 8).toString() !== 'ftyp')
          throw new Error('invalid AVIF')
        const path = `/local-assets/cards/${language}/${art}.avif`
        await mkdir(`apps/web/public/local-assets/cards/${language}`, { recursive: true })
        await writeFile('apps/web/public' + path, bytes)
        files.push({
          art,
          language,
          path,
          source,
          bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        })
      } catch (error) {
        failed.push({ art, language, source, error: String(error) })
      }
    }
  }),
)
// Releer al escribir para conservar importaciones ajenas realizadas durante la descarga.
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
for (const file of files) manifest[file.language][file.art] ??= file.path
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
const evidencePath = 'docs-proyecto/evidencias/imagenes-encuentro.json'
let previous = { files: [] }
try {
  previous = JSON.parse(await readFile(evidencePath, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const retained = new Map(previous.files.map((file) => [`${file.language}:${file.art}`, file]))
for (const file of files) retained.set(`${file.language}:${file.art}`, file)
// Incorporar también al inventario general que verifica CI, sin reescribir huellas previas.
const inventoryPath = 'docs-proyecto/evidencias/imagenes-locales.json'
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'))
const inventoried = new Set(inventory.files.map((file) => file.path))
for (const file of retained.values()) {
  if (inventoried.has(file.path)) continue
  const bytes = await readFile('apps/web/public' + file.path)
  if (
    bytes.length !== file.bytes ||
    createHash('sha256').update(bytes).digest('hex') !== file.sha256
  )
    throw new Error('Damaged campaign image: ' + file.path)
  inventory.files.push(file)
  inventoried.add(file.path)
}
await writeFile(inventoryPath, JSON.stringify(inventory, null, 2) + '\n')
const coverSource = 'https://assets.arkhamhorror.app/img/arkham/boxes/01.jpg'
const coverPath = '/local-assets/setup/night-of-the-zealot.jpg'
const coverResponse = await fetch(coverSource, { signal: AbortSignal.timeout(25000) })
if (!coverResponse.ok) throw new Error(`Missing campaign cover: ${coverResponse.status}`)
const coverBytes = Buffer.from(await coverResponse.arrayBuffer())
if (coverBytes[0] !== 0xff || coverBytes[1] !== 0xd8) throw new Error('Invalid campaign JPEG')
await writeFile('apps/web/public' + coverPath, coverBytes)
const cover = {
  path: coverPath,
  source: coverSource,
  bytes: coverBytes.length,
  sha256: createHash('sha256').update(coverBytes).digest('hex'),
}
await writeFile(
  evidencePath,
  JSON.stringify({ files: [...retained.values()], cover, failed }, null, 2) + '\n',
)
console.log(JSON.stringify({ downloaded: files.length, failed }))
if (failed.length) process.exitCode = 1
