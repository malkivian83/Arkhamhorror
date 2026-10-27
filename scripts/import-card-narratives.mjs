// Solo planes y actos presentes en los catálogos implementados.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const reference = process.argv[2] ?? 'D:/referencia/ArkhamHorror-main'
const ceniza = JSON.parse(
  readFileSync('docs-proyecto/evidencias/ceniza-cartas-transcripciones.es.json', 'utf8'),
)
for (const locale of ['en', 'es']) {
  const source = JSON.parse(
    readFileSync(join(reference, `frontend/public/cards_${locale}.json`), 'utf8'),
  )
  const narratives = {}
  for (const group of ['zealot', 'carcosa', 'fortune', 'gala']) {
    const catalog = JSON.parse(
      readFileSync(`packages/i18n/src/${group}-cards.${locale}.json`, 'utf8'),
    )
    for (const card of source.filter(
      (c) => c.code in catalog && ['agenda', 'act'].includes(c.type_code),
    )) {
      narratives[card.code] = Object.fromEntries(
        Object.entries({
          group,
          typeCode: card.type_code,
          flavor: card.flavor,
          backFlavor: card.back_flavor,
        }).filter(([, value]) => typeof value === 'string' && value.trim()),
      )
    }
  }
  for (const [code, spanish] of Object.entries(ceniza)) {
    const card = source.find((c) => c.code === code)
    if (!card || !['agenda', 'act'].includes(card.type_code))
      throw new Error(`Carta de Ceniza inválida: ${code}`)
    narratives[code] = {
      group: 'ceniza',
      typeCode: card.type_code,
      ...(locale === 'es'
        ? spanish
        : Object.fromEntries(
            Object.entries({ flavor: card.flavor, backFlavor: card.back_flavor }).filter(
              ([, value]) => value,
            ),
          )),
    }
  }
  writeFileSync(
    `packages/i18n/src/card-narratives.${locale}.json`,
    JSON.stringify(narratives, null, 2) + '\n',
  )
}
const sources = Object.entries(ceniza).flatMap(([code, faces]) =>
  Object.keys(faces).map((field) => {
    const path = `apps/web/public/local-assets/cards/es/${code}${field === 'backFlavor' ? 'b' : ''}.avif`
    return {
      code,
      field,
      path,
      sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
    }
  }),
)
writeFileSync(
  'docs-proyecto/evidencias/ceniza-cartas-fuentes.json',
  JSON.stringify(
    {
      method:
        'Transcripción visual de los párrafos narrativos de las imágenes españolas locales. Se omiten reglas, títulos y condiciones. 12170b contiene narraciones condicionales y queda excluida del audio único.',
      sources,
    },
    null,
    2,
  ) + '\n',
)
