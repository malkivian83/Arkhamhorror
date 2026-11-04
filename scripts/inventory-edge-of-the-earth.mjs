// Inventario de preparación; no importa ni registra cartas jugables.
// Uso: node scripts/inventory-edge-of-the-earth.mjs [ruta-referencia] [--check]
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const reference =
  process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'D:/referencia/ArkhamHorror-main'
const check = process.argv.includes('--check')
const target = 'docs-proyecto/106-confines-inventario.json'
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sources = {}
const catalogs = {}
for (const lang of ['en', 'es']) {
  const path = `frontend/public/cards_${lang}.json`
  const bytes = readFileSync(join(reference, path))
  sources[lang] = { path, sha256: sha256(bytes) }
  const cards = JSON.parse(bytes).filter((card) => card.pack_code === 'eoec')
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
  for (const field of ['type_code', 'encounter_code', 'quantity']) {
    if (en[field] !== es[field]) throw new Error(`Diferencia EN/ES ${code}: ${field}`)
  }
  return {
    code,
    encounterSet: en.encounter_code,
    type: en.type_code,
    quantity: en.quantity,
    name: { en: en.name, es: es.name },
  }
})
const manifest = {
  pack: 'eoec',
  status: 'inventory-only',
  sources,
  counts: {
    codes: cards.length,
    sourceCopies: cards.reduce((total, card) => total + card.quantity, 0),
    encounterSets: new Set(cards.map((card) => card.encounterSet)).size,
  },
  cards,
}
const output = JSON.stringify(manifest, null, 2) + '\n'
if (check) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Inventario desactualizado')
} else {
  writeFileSync(target, output)
}
console.log(`${check ? 'Verificado' : 'Preparado'}: ${cards.length} códigos EN/ES; sin activación`)
