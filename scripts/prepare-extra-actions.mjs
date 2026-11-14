import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'

// Lot 148: restricted additional actions and activations.
const codes = ['05040', '06239', '08062', '08098', '08100', '54008', '10027', '10037']
const dir = 'packages/cards/src/extra-actions/'
const read = async (p) => JSON.parse(await fs.readFile(p, 'utf8'))
const write = async (p, data) =>
  fs.writeFile(p, await format(JSON.stringify(data), { parser: 'json' }))
await fs.mkdir(dir, { recursive: true })
for (const file of await fs.readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === 'extra-actions.json') continue
  const data = await read('packages/cards/src/data/' + file)
  if (Array.isArray(data) && data.some((c) => codes.includes(c.code)))
    throw Error('Duplicate code in ' + file)
}
const catalog = (await read('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json'))
  .cards
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
    if (codes.some((code) => !raw.some((c) => c.code === code)))
      raw = await read(`.card-import-tmp/standard-review/${lang}.json`)
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
  const path = `packages/i18n/src/${lang}.json`
  let text = await fs.readFile(path, 'utf8')
  for (const c of selected)
    for (const [section, value] of [
      ['names', c.name],
      [
        'summary',
        lang === 'es' && c.code === '08100'
          ? c.text.replace(
              'Elige y realiza dos de las siguientes acciones',
              'Elige y realiza dos acciones distintas de entre las siguientes',
            )
          : c.text,
      ],
      ['traits', c.traits],
      ...(c.subname ? [['subnames', c.subname]] : []),
    ]) {
      const start = text.indexOf(`"${section}": {`, text.indexOf('"offlineCard": {'))
      if (text.slice(start, text.indexOf('\n    }', start)).includes(`"${c.code}":`)) continue
      const at = text.indexOf('\n', start) + 1
      text = text.slice(0, at) + `      "${c.code}": ${JSON.stringify(value)},\n` + text.slice(at)
    }
  await fs.writeFile(path, text)
}
for (const code of codes) {
  const c = english.find((c) => c.code === code)
  const uses = c.text.match(/Uses \((\d+) (\w+)\)/)
  approvals.cards.push({
    code,
    status: 'verified',
    module: `card-${code}`,
    test: 'rules.test.ts',
    ...(['08098', '08100'].includes(code) ? { adapter: 'reviewed-dual-faction-v1' } : {}),
    ...(code === '05040' ? { adapter: 'reviewed-tarot-v1' } : {}),
    ...(code === '08062' ? { uses: { count: 0, type: 'charge' } } : {}),
    ...(c.subname ? { subname: c.subname } : {}),
    ...(uses
      ? {
          uses: {
            count: Number(uses[1]),
            type: { charges: 'charge', secrets: 'secret', offerings: 'offering' }[uses[2]],
          },
        }
      : {}),
    ...(/(^|\n|\. )Fast\./.test(c.text) ? { fast: true } : {}),
  })
  await fs.writeFile(
    dir + `card-${code}.ts`,
    `// RR: Actions, Activate, Costs, Triggered Abilities.\nimport { registerExtraAction } from './register'\nregisterExtraAction('${code}')\n`,
  )
}
await write(dir + 'approvals.json', approvals)
await write(
  'packages/cards/src/data/extra-actions.json',
  approvals.cards.map((a) =>
    approvedDefinition(
      catalog.find((c) => c.code === a.code),
      a,
    ),
  ),
)
await fs.writeFile(
  dir + 'index.ts',
  `import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'\nimport data from '../data/extra-actions.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const EXTRA_ACTIONS_RENDERED_CODES = data.map(c => c.code)\n`,
)
