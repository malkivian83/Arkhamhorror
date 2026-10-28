// Imágenes oficiales de los primeros encuentros de Dunwich. Conserva las entradas e inventarios existentes.
// Uso: node scripts/import-dunwich-images.mjs
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const arts = [
  '01172',
  '01173',
  '02088',
  '02089',
  '02195',
  '02196',
  '02197',
  '02198',
  '02199',
  '02200',
  '02201',
  '02202',
  '02203',
  '02204',
  '02205',
  '02206',
  '02207',
  '02208',
  '02209',
  '02210',
  '02211',
  '02212',
  '02213',
  '02214',
  '02215',
  '02216',
  '02217',
  '02218',
  '02219',
  '02220',
  '02221',
  '02222',
  '02223',
  '02224',

  '02159',
  '02160',
  '02161',
  '02162',
  '02163',
  '02164',
  '02165',
  '02166',
  '02167',
  '02168',
  '02169',
  '02170',
  '02171',
  '02172',
  '02173',
  '02174',
  '02175',
  '02176',
  '02177',
  '02178',
  '02179',
  '02180',
  '02181',
  '02182',
  '02183',

  '02118',
  '02119',
  '02120',
  '02121',
  '02122',
  '02123',
  '02124',
  '02125',
  '02126',
  '02127',
  '02128',
  '02129',
  '02130',
  '02131',
  '02132',
  '02133',
  '02134',
  '02135',
  '02136',
  '02137',
  '02138',
  '02139',
  '02140',
  '02141',
  '02142',
  '02143',
  '02144',
  '02145',
  '02146',

  '02040',
  '02062',
  '02063',
  '02064',
  '02065',
  '02066',
  '02067',
  '02068',
  '02069',
  '02070',
  '02071',
  '02072',
  '02073',
  '02074',
  '02075',
  '02076',
  '02077',
  '02078',
  '02079',
  '02080',
  '02081',
  '02082',
  '02092',
  '02093',
  '02094',
  '02095',
  '02096',
  '02097',
  '02098',
  '02099',

  '01177',
  '01178',
  '02041',
  '02042',
  '02043',
  '02044',
  '02045',
  '02046',
  '02047',
  '02048',
  '02049',
  '02050',
  '02051',
  '02052',
  '02053',
  '02054',
  '02055',
  '02056',
  '02057',
  '02058',
  '02059',
  '02060',
  '02061',
  '02083',
  '02084',
  '02085',
  '02086',
  '02087',
  '02090',
  '02091',
  '02100',
  '02101',
  '02102',
].flatMap((code) =>
  (Number(code) >= 2041 && Number(code) <= 2057) ||
  (Number(code) >= 2062 && Number(code) <= 2077) ||
  (Number(code) >= 2118 && Number(code) <= 2137) ||
  (Number(code) >= 2159 && Number(code) <= 2177) ||
  (Number(code) >= 2195 && Number(code) <= 2213)
    ? [code, `${code}b`]
    : [code],
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
const evidencePath = 'docs-proyecto/evidencias/imagenes-dunwich.json'
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
const coverPath = '/local-assets/setup/the-dunwich-legacy.jpg'
const coverSource = 'https://assets.arkhamhorror.app/img/arkham/boxes/02.jpg'
let coverBytes
try {
  coverBytes = await readFile('apps/web/public' + coverPath)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  const response = await fetch(coverSource, { signal: AbortSignal.timeout(25000) })
  if (!response.ok) throw new Error('Missing Dunwich cover: ' + response.status, { cause: error })
  coverBytes = Buffer.from(await response.arrayBuffer())
  await writeFile('apps/web/public' + coverPath, coverBytes)
}
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
