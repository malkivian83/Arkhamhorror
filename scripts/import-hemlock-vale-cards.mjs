// Catálogo EN/ES de las cartas de encuentro de La fiesta del Valle de la Cicuta (fhvc).
// Toma nombre, tipo y texto de la referencia; los códigos salen del inventario 165.
// Uso: node scripts/import-hemlock-vale-cards.mjs [ruta-referencia] [--check]
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const reference =
  process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'D:/referencia/ArkhamHorror-main'
const check = process.argv.includes('--check')
const inventory = JSON.parse(readFileSync('docs-proyecto/165-cicuta-inventario.json', 'utf8'))
const codes = inventory.cards.map((card) => card.code)

for (const lang of ['en', 'es']) {
  const source = JSON.parse(
    readFileSync(join(reference, `frontend/public/cards_${lang}.json`), 'utf8'),
  ).filter((card) => card.pack_code === inventory.pack)
  const byCode = new Map(source.map((card) => [card.code, card]))
  const catalog = {}
  for (const code of codes) {
    const card = byCode.get(code)
    if (!card?.name) throw new Error(`Falta ${lang}: ${code}`)
    catalog[code] = {
      name: card.name,
      typeCode: card.type_code,
      ...(card.subname ? { subname: card.subname } : {}),
      ...(card.traits ? { traits: card.traits } : {}),
      ...(card.text ? { text: card.text } : {}),
      ...(card.back_text ? { backText: card.back_text } : {}),
      ...(card.back_name && card.back_name !== card.name ? { backName: card.back_name } : {}),
    }
  }
  const target = `packages/i18n/src/hemlock-vale-cards.${lang}.json`
  const output = JSON.stringify(catalog, null, 2) + '\n'
  if (check) {
    if (readFileSync(target, 'utf8') !== output)
      throw new Error(`Catálogo desactualizado: ${target}`)
  } else writeFileSync(target, output)
  console.log(`${check ? 'Verificado' : 'Escrito'} ${target}: ${codes.length} cartas`)
}
