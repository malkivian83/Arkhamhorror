// Importación de datos oficiales EN/ES desde la copia externa de referencia.
// Uso: node scripts/import-zealot-cards.mjs [D:/referencia/ArkhamHorror-main]
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const reference = process.argv[2] ?? 'D:/referencia/ArkhamHorror-main'
const codes = new Set([
  ...Array.from({ length: 16 }, (_, n) => String(1104 + n).padStart(5, '0')),
  ...Array.from({ length: 10 }, (_, n) => String(1159 + n).padStart(5, '0')),
])
const fields = {
  name: 'name',
  subname: 'subname',
  traits: 'traits',
  text: 'text',
  back_name: 'backName',
  back_text: 'backText',
}
for (const locale of ['en', 'es']) {
  const source = JSON.parse(
    readFileSync(join(reference, `frontend/public/cards_${locale}.json`), 'utf8'),
  )
  const cards = Object.fromEntries(
    source
      .filter((c) => codes.has(c.code))
      .map((c) => [
        c.code,
        Object.fromEntries(
          Object.entries(fields)
            .filter(([key]) => c[key])
            .map(([key, output]) => [output, c[key]]),
        ),
      ]),
  )
  if (Object.keys(cards).length !== codes.size) throw new Error(`Incomplete ${locale} catalogue`)
  writeFileSync(
    `packages/i18n/src/zealot-cards.${locale}.json`,
    JSON.stringify(cards, null, 2) + '\n',
  )
}
