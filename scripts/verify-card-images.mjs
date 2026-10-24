import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const manifest = JSON.parse(await readFile('apps/web/src/game/cardImageManifest.json', 'utf8'))
const inventory = JSON.parse(
  await readFile('docs-proyecto/evidencias/imagenes-locales.json', 'utf8'),
)
const seen = new Set()
for (const file of inventory.files) {
  if (!/^\/local-assets\/cards\/(en|es)\/\d{5}[a-d]?b?\.(avif|jpg)$/.test(file.path))
    throw new Error(`Invalid local image path: ${file.path}`)
  const bytes = await readFile(`apps/web/public${file.path}`)
  if (
    bytes.length !== file.bytes ||
    createHash('sha256').update(bytes).digest('hex') !== file.sha256
  )
    throw new Error(`Damaged card image: ${file.path}`)
  const avif = bytes.subarray(4, 8).toString() === 'ftyp'
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8
  if (!(avif || jpeg)) throw new Error(`Invalid image format: ${file.path}`)
  if (manifest[file.language][file.art] !== file.path)
    throw new Error(`Manifest mismatch: ${file.path}`)
  seen.add(file.path)
}
const paths = Object.values(manifest).flatMap((cards) => Object.values(cards))
if (paths.some((p) => !seen.has(p)) || paths.length !== seen.size)
  throw new Error('Incomplete card image inventory')
console.log(
  JSON.stringify({
    verified: paths.length,
    bytes: inventory.files.reduce((n, f) => n + f.bytes, 0),
  }),
)
const thumbnails = JSON.parse(
  await readFile('docs-proyecto/evidencias/miniaturas-cartas.json', 'utf8'),
)
const thumbnailPaths = new Set()
for (const file of thumbnails.files) {
  const expected = file.source.replace(/\/(\d{5}[a-d]?b?)\.(avif|jpg)$/, '/thumbs/$1.webp')
  if (!seen.has(file.source) || file.path !== expected || thumbnailPaths.has(file.path))
    throw new Error(`Invalid thumbnail: ${file.path}`)
  const original = await readFile(`apps/web/public${file.source}`)
  const bytes = await readFile(`apps/web/public${file.path}`)
  if (
    createHash('sha256').update(original).digest('hex') !== file.sourceSha256 ||
    createHash('sha256').update(bytes).digest('hex') !== file.sha256 ||
    bytes.subarray(0, 4).toString() !== 'RIFF' ||
    bytes.subarray(8, 12).toString() !== 'WEBP'
  )
    throw new Error(`Damaged or outdated thumbnail: ${file.path}`)
  thumbnailPaths.add(file.path)
}
if (thumbnailPaths.size !== seen.size) throw new Error('Incomplete thumbnail inventory')
console.log(JSON.stringify({ thumbnails: thumbnailPaths.size }))
