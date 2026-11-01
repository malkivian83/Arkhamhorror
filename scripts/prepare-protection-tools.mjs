import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes =
  '03156 03157 02114 08080 05274 06155 09038 08107 09086 10112 11034 11035 10042 10058 09043 03189 09050 04110 11054 11063'.split(
    ' ',
  )
const dir = 'packages/cards/src/protection-tools/'
await mkdir(dir, { recursive: true })
const inv = JSON.parse(
  await readFile('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json', 'utf8'),
).cards
for (const file of await readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === 'protection-tools.json') continue
  const data = JSON.parse(await readFile('packages/cards/src/data/' + file, 'utf8'))
  if (Array.isArray(data) && data.some((c) => codes.includes(c.code)))
    throw Error('Duplicate code in ' + file)
}
const approvals = {
  sourceBundle: '3c8ee4b5d8100766',
  presentation: 'rendered',
  rulesRevision: 1,
  cards: [],
  sources: {},
  sourceFiles: { en: 'source-en.json', es: 'source-es.json' },
}
let english
for (const lang of ['en', 'es']) {
  let source
  try {
    source = JSON.parse(await readFile(dir + `source-${lang}.json`, 'utf8'))
  } catch {
    source = JSON.parse(await readFile(`.card-import-tmp/standard-review/${lang}.json`, 'utf8'))
  }
  const selected = codes.map((code) => {
    const c = source.find((c) => c.code === code)
    if (!c) throw Error('Missing ' + lang + code)
    return c
  })
  if (lang === 'en') english = selected
  const body = await format(JSON.stringify(selected), { parser: 'json' })
  approvals.sources[lang] = createHash('sha256').update(body).digest('hex')
  await writeFile(dir + `source-${lang}.json`, body)
  const p = `packages/i18n/src/${lang}.json`
  let raw = await readFile(p, 'utf8')
  for (const c of selected)
    for (const [section, value] of [
      ['names', c.name],
      ['summary', c.text],
      ['traits', c.traits],
      ...(c.subname ? [['subnames', c.subname]] : []),
    ]) {
      const start = raw.indexOf(`"${section}": {`, raw.indexOf('"offlineCard": {'))
      if (raw.slice(start, raw.indexOf('\n    }', start)).includes(`"${c.code}":`)) continue
      const at = raw.indexOf('\n', start) + 1
      raw = raw.slice(0, at) + `      "${c.code}": ${JSON.stringify(value)},\n` + raw.slice(at)
    }
  const labels =
    lang === 'es'
      ? {
          protectionUse: 'Usar {card}',
          protectionAmount: 'Elegir {n}',
          protectionHeal: 'Curar {damage} daño y {horror} horror de {card}',
          protectionEnemy: 'Elegir {enemy}',
          protectionSearch: 'Buscar en el mazo de {name}',
          protectionDiscard: 'Recuperar {card}',
          protectionSkill: 'Modificar el valor en {n}',
          protectionResource: 'Gastar {n} recursos para cancelar {damage} daño y {horror} horror',
        }
      : {
          protectionUse: 'Use {card}',
          protectionAmount: 'Choose {n}',
          protectionHeal: 'Heal {damage} damage and {horror} horror from {card}',
          protectionEnemy: 'Choose {enemy}',
          protectionSearch: 'Search {name}’s deck',
          protectionDiscard: 'Return {card}',
          protectionSkill: 'Modify the skill value by {n}',
          protectionResource: 'Spend {n} resources to cancel {damage} damage and {horror} horror',
        }
  for (const [k, v] of Object.entries(labels))
    if (!raw.includes(`"${k}":`))
      raw = raw.replace('  "choice": {', `  "choice": {\n    "${k}": ${JSON.stringify(v)},`)
  if (!raw.includes('"calculatedReckoning":')) {
    const at = raw.indexOf('"note": {', raw.indexOf('"story": {'))
    raw =
      raw.slice(0, at) +
      raw
        .slice(at)
        .replace(
          '"note": {',
          '"note": {\n      "calculatedReckoning": ' +
            JSON.stringify(
              lang === 'es'
                ? 'Has calculado el día del juicio.'
                : 'You have calculated the day of reckoning.',
            ) +
            ',',
        )
  }
  await writeFile(p, raw)
}
for (const code of codes) {
  const c = english.find((c) => c.code === code),
    uses = c.text.match(/Uses \((\d+) (\w+)\)/)
  const a = {
    code,
    status: 'verified',
    module: `card-${code}`,
    test: 'rules.test.ts',
    ...(c.text.startsWith('Fast.') ? { fast: true } : {}),
    ...(uses ? { uses: { count: Number(uses[1]), type: uses[2] } } : {}),
    ...(['09043', '10042', '10058'].includes(code) ? { uses: { count: 0, type: 'evidence' } } : {}),
    ...(code === '08107' ? { adapter: 'reviewed-dual-faction-v1' } : {}),
    ...(inv.find((c) => c.code === code).flags.exile
      ? { adapter: 'reviewed-protection-exile-v1' }
      : {}),
  }
  approvals.cards.push(a)
  await writeFile(
    dir + `card-${code}.ts`,
    `// RR: Triggered Abilities, Skill Tests, Costs, Healing.\nimport {registerProtectionTool} from './register'\nregisterProtectionTool('${code}')\n`,
  )
}
await writeFile(dir + 'approvals.json', await format(JSON.stringify(approvals), { parser: 'json' }))
await writeFile(
  'packages/cards/src/data/protection-tools.json',
  await format(
    JSON.stringify(
      approvals.cards.map((a) =>
        approvedDefinition(
          inv.find((c) => c.code === a.code),
          a,
        ),
      ),
    ),
    { parser: 'json' },
  ),
)
await writeFile(
  dir + 'index.ts',
  `import {registerPlayerCards,type PlayerCardDef} from '@lcg/engine'\nimport data from '../data/protection-tools.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const PROTECTION_TOOL_RENDERED_CODES=data.map(c=>c.code)\n`,
)
console.log(`Prepared ${codes.length} distinct reviewed cards`)
