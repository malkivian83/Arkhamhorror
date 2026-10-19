import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const manifest = JSON.parse(await readFile('apps/web/src/game/cardImageManifest.json', 'utf8'))
const inventory = JSON.parse(
  await readFile('docs-proyecto/evidencias/imagenes-locales.json', 'utf8'),
)
const seen = new Set()
for (const file of inventory.files) {
  if (!/^\/local-assets\/cards\/(en|es)\/\d{5}b?\.(avif|jpg)$/.test(file.path))
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
