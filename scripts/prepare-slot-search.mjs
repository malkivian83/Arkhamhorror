import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes = '05283 60260 60181'.split(' '),
  dir = 'packages/cards/src/slot-search/'
await fs.mkdir(dir, { recursive: true })
const read = async (p) => JSON.parse((await fs.readFile(p, 'utf8')).replace(/^\uFEFF/, ''))
const inv = (await read('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json')).cards
for (const file of await fs.readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === 'slot-search.json') continue
  const data = await read('packages/cards/src/data/' + file)
  if (Array.isArray(data) && data.some((c) => codes.includes(c.code)))
    throw Error('Already declared ' + file)
}
const approvals = {
  sourceBundle: '3c8ee4b5d8100766',
  presentation: 'rendered',
  rulesRevision: 1,
  sourceFiles: { en: 'source-en.json', es: 'source-es.json' },
  sources: {},
  cards: [],
}
let english
for (const lang of ['en', 'es']) {
  let raw
  try {
    raw = await read(dir + `source-${lang}.json`)
  } catch {
    raw = await read(`.card-import-tmp/standard-review/${lang}.json`)
  }
  const selected = codes.map((code) => {
    const c = raw.find((c) => c.code === code)
    if (!c) throw Error(code)
    return c
  })
  if (lang === 'en') english = selected
  const body = await format(JSON.stringify(selected), { parser: 'json' })
  approvals.sources[lang] = createHash('sha256').update(body).digest('hex')
  await fs.writeFile(dir + `source-${lang}.json`, body)
  const p = `packages/i18n/src/${lang}.json`
  let text = await fs.readFile(p, 'utf8')
  for (const c of selected)
    for (const [section, value] of [
      ['names', c.name],
      ['summary', c.text],
      ['traits', c.traits],
      ...(c.subname ? [['subnames', c.subname]] : []),
    ]) {
      const start = text.indexOf(`"${section}": {`, text.indexOf('"offlineCard": {'))
      if (text.slice(start, text.indexOf('\n    }', start)).includes(`"${c.code}":`)) continue
      const at = text.indexOf('\n', start) + 1
      text = text.slice(0, at) + `      "${c.code}": ${JSON.stringify(value)},\n` + text.slice(at)
    }
  const labels =
    lang === 'es' ? { slotSearch: 'Buscar con {card}' } : { slotSearch: 'Search with {card}' }
  for (const [key, value] of Object.entries(labels))
    if (!text.includes(`"${key}":`))
      text = text.replace('  "choice": {', `  "choice": {\n    "${key}": ${JSON.stringify(value)},`)
  await fs.writeFile(p, text)
}
for (const code of codes) {
  const c = english.find((c) => c.code === code)
  approvals.cards.push({
    code,
    status: 'verified',
    module: `card-${code}`,
    test: 'rules.test.ts',
    ...(c.subname ? { subname: c.subname } : {}),
  })
  await fs.writeFile(
    dir + `card-${code}.ts`,
    `// RR: Look, Decks, Abilities, Costs.\nimport { registerSlotSearch } from './register'\nregisterSlotSearch('${code}')\n`,
  )
}
await fs.writeFile(
  dir + 'approvals.json',
  await format(JSON.stringify(approvals), { parser: 'json' }),
)
await fs.writeFile(
  'packages/cards/src/data/slot-search.json',
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
await fs.writeFile(
  dir + 'index.ts',
  `import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'\nimport data from '../data/slot-search.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const SLOT_SEARCH_RENDERED_CODES=data.map(c=>c.code)\n`,
)
