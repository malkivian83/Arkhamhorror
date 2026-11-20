import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'

// Lot 156: leylines and shared investigator support.
const codes = ['08033', '08041', '08042', '08043', '08044', '11065', '09067', '11091']
const dir = 'packages/cards/src/leyline-support/'
const read = async (p) => JSON.parse(await fs.readFile(p, 'utf8'))
const write = async (p, data) =>
  fs.writeFile(p, await format(JSON.stringify(data), { parser: 'json' }))
await fs.mkdir(dir, { recursive: true })
for (const file of await fs.readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === 'leyline-support.json') continue
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
      raw = await read(`tmp/lot129/${lang}-all.json`)
  } catch {
    raw = await read(`tmp/lot129/${lang}-all.json`)
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
      ['summary', c.text],
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
    ...(code.startsWith('080') ? { adapter: 'reviewed-conduits-v1' } : {}),
    ...(code === '11091' ? { adapter: 'reviewed-myriad-v1' } : {}),
    ...(['08033', '11065'].includes(code)
      ? { uses: { count: 0, type: code === '11065' ? 'offering' : 'leyline' } }
      : {}),
    module: `card-${code}`,
    test: 'rules.test.ts',
    ...(c.subname ? { subname: c.subname } : {}),
    ...(code === '09063' ? { uses: { count: 0, type: 'resource' } } : {}),
    ...(uses
      ? {
          uses: {
            count: Number(uses[1]),
            type: {
              charges: 'charge',
              secrets: 'secret',
              offerings: 'offering',
              durability: 'durability',
              leylines: 'leyline',
            }[uses[2]],
          },
        }
      : {}),
    ...(/(^|\n|\. )Fast\./.test(c.text) ? { fast: true } : {}),
  })
  await fs.writeFile(
    dir + `card-${code}.ts`,
    `// RR: Uses, Moving, Research, Triggered Abilities, Attach To.\nimport { registerSupport } from './register'\nregisterSupport('${code}')\n`,
  )
}
await write(dir + 'approvals.json', approvals)
await write(
  'packages/cards/src/data/leyline-support.json',
  approvals.cards.map((a) =>
    approvedDefinition(
      catalog.find((c) => c.code === a.code),
      a,
    ),
  ),
)
await fs.writeFile(
  dir + 'index.ts',
  `import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'\nimport data from '../data/leyline-support.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const LEYLINE_SUPPORT_RENDERED_CODES = data.map(c => c.code)\n`,
)
