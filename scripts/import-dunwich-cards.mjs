// Importación de datos oficiales EN/ES desde la copia externa de referencia.
// Uso: node scripts/import-dunwich-cards.mjs [D:/referencia/ArkhamHorror-main]
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const reference = process.argv[2] ?? 'D:/referencia/ArkhamHorror-main'
const codes = new Set([
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
])
const fields = {
  name: 'name',
  type_code: 'typeCode',
  subname: 'subname',
  traits: 'traits',
  text: 'text',
  back_name: 'backName',
  back_text: 'backText',
  flavor: 'flavor',
  back_flavor: 'backFlavor',
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
            .filter(([key]) => key === 'text' || c[key])
            .map(([key, output]) => [output, c[key] ?? '']),
        ),
      ]),
  )
  if (Object.keys(cards).length !== codes.size) throw new Error(`Incomplete ${locale} catalogue`)
  writeFileSync(
    `packages/i18n/src/dunwich-cards.${locale}.json`,
    JSON.stringify(cards, null, 2) + '\n',
  )
}
