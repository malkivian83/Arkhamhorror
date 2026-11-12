import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const dir = 'packages/cards/src/narrow-escape/'
const codes = ['03267']
const read = async (p) => JSON.parse(await fs.readFile(p, 'utf8'))
await fs.mkdir(dir, { recursive: true })
const inventory = (await read('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json'))
  .cards
for (const file of await fs.readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === 'narrow-escape.json') continue
  const data = await read('packages/cards/src/data/' + file)
  if (Array.isArray(data) && data.some((c) => codes.includes(c.code)))
    throw Error('Duplicate ' + file)
}
const manifest = {
  sourceBundle: '3c8ee4b5d8100766',
  presentation: 'rendered',
  rulesRevision: 1,
  sourceFiles: { en: 'source-en.json', es: 'source-es.json' },
  sources: {},
  cards: codes.map((code) => ({
    code,
    status: 'verified',
    module: 'card-' + code,
    test: 'rules.test.ts',
    fast: true,
  })),
}
for (const lang of ['en', 'es']) {
  let source
  try {
    source = await read(dir + 'source-' + lang + '.json')
  } catch {
    source = await read('.card-import-tmp/standard-review/' + lang + '.json')
  }
  const selected = codes.map((code) => {
    const card = source.find((c) => c.code === code)
    if (!card) throw Error(code)
    return card
  })
  const body = await format(JSON.stringify(selected), { parser: 'json' })
  manifest.sources[lang] = createHash('sha256').update(body).digest('hex')
  await fs.writeFile(dir + 'source-' + lang + '.json', body)
  const path = 'packages/i18n/src/' + lang + '.json'
  let text = await fs.readFile(path, 'utf8')
  for (const card of selected)
    for (const [section, value] of [
      ['names', card.name],
      ['summary', card.text],
      ['traits', card.traits],
    ]) {
      const start = text.indexOf(`"${section}": {`, text.indexOf('"offlineCard": {'))
      if (text.slice(start, text.indexOf('\n    }', start)).includes(`"${card.code}":`)) continue
      const at = text.indexOf('\n', start) + 1
      text =
        text.slice(0, at) + `      "${card.code}": ${JSON.stringify(value)},\n` + text.slice(at)
    }
  await fs.writeFile(path, text)
}
await fs.writeFile(
  dir + 'approvals.json',
  await format(JSON.stringify(manifest), { parser: 'json' }),
)
await fs.writeFile(
  'packages/cards/src/data/narrow-escape.json',
  await format(
    JSON.stringify(
      manifest.cards.map((a) =>
        approvedDefinition(
          inventory.find((c) => c.code === a.code),
          a,
        ),
      ),
    ),
    { parser: 'json' },
  ),
)
