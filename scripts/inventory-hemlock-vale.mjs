// Inventario de preparación de La fiesta del Valle de la Cicuta; no importa ni registra cartas jugables.
// Uso: node scripts/inventory-hemlock-vale.mjs [ruta-referencia] [--check] [--arts]
//   --arts imprime los códigos de imagen (anversos y reversos) para import-card-images.mjs.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const reference =
  process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'D:/referencia/ArkhamHorror-main'
const check = process.argv.includes('--check')
const target = 'docs-proyecto/165-cicuta-inventario.json'
const pack = 'fhvc'
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const art = (path) =>
  path
    ?.split('/')
    .pop()
    .replace(/\.\w+$/, '')
const sources = {}
const catalogs = {}
for (const lang of ['en', 'es']) {
  const path = `frontend/public/cards_${lang}.json`
  const bytes = readFileSync(join(reference, path))
  sources[lang] = { path, sha256: sha256(bytes) }
  const cards = JSON.parse(bytes).filter((card) => card.pack_code === pack)
  const catalog = new Map()
  for (const card of cards) {
    if (catalog.has(card.code)) throw new Error(`Código duplicado ${lang}: ${card.code}`)
    if (!card.name || !card.encounter_code || !Number.isInteger(card.quantity) || card.quantity < 1)
      throw new Error(`Datos incompletos ${lang}: ${card.code}`)
    catalog.set(card.code, card)
  }
  if (!catalog.size) throw new Error(`Catálogo vacío: ${lang}`)
  catalogs[lang] = catalog
}
const codes = [...catalogs.en.keys()].sort()
if (codes.length !== catalogs.es.size || codes.some((code) => !catalogs.es.has(code)))
  throw new Error('Los códigos EN/ES no coinciden')
const cards = codes.map((code) => {
  const en = catalogs.en.get(code)
  const es = catalogs.es.get(code)
  for (const field of ['type_code', 'encounter_code', 'quantity', 'double_sided', 'hidden']) {
    if (en[field] !== es[field]) throw new Error(`Diferencia EN/ES ${code}: ${field}`)
  }
  // Las entradas ocultas son reversos con código propio; su imagen es la del propio código.
  const faces = en.hidden ? [code] : [art(en.imagesrc), art(en.backimagesrc)].filter(Boolean)
  return {
    code,
    encounterSet: en.encounter_code,
    type: en.type_code,
    quantity: en.quantity,
    ...(en.hidden ? { hidden: true } : {}),
    faces,
    name: { en: en.name, es: es.name },
  }
})
const arts = [...new Set(cards.flatMap((card) => card.faces))].sort()
const manifest = {
  pack,
  status: 'inventory-only',
  sources,
  counts: {
    codes: cards.length,
    visibleCodes: cards.filter((card) => !card.hidden).length,
    sourceCopies: cards
      .filter((card) => !card.hidden)
      .reduce((total, card) => total + card.quantity, 0),
    encounterSets: new Set(cards.map((card) => card.encounterSet)).size,
    imageFaces: arts.length,
  },
  cards,
}
if (process.argv.includes('--arts')) {
  console.log(arts.join(' '))
  process.exit(0)
}
const output = JSON.stringify(manifest, null, 2) + '\n'
if (check) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Inventario desactualizado')
} else {
  writeFileSync(target, output)
}
console.log(
  `${check ? 'Verificado' : 'Preparado'}: ${cards.length} códigos EN/ES, ${arts.length} caras; sin activación`,
)
