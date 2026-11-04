import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes = [
  '09039',
  '10103',
  '11041',
  '11105',
  '60274',
  '60266',
  '60160',
  '60161',
  '60177',
  '09055',
  '11111',
  '10053',
  '11101',
  '11107',
  '11040',
  '08019',
]
const dir = 'packages/cards/src/event-economy/'
const read = async (p) => JSON.parse(await fs.readFile(p, 'utf8'))
await fs.mkdir(dir, { recursive: true })
const inv = (await read('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json')).cards
const approvals = {
  sourceBundle: '3c8ee4b5d8100766',
  presentation: 'rendered',
  rulesRevision: 1,
  sourceFiles: { en: 'source-en.json', es: 'source-es.json' },
  sources: {},
  cards: [],
}
for (const file of await fs.readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === 'event-economy.json') continue
  const data = await read('packages/cards/src/data/' + file)
  if (Array.isArray(data) && data.some((c) => codes.includes(c.code)))
    throw Error('Duplicate code in ' + file)
}
let english
for (const lang of ['en', 'es']) {
  let raw
  try {
    raw = await read(dir + `source-${lang}.json`)
  } catch {
    raw = await read(`.card-import-tmp/standard-review/${lang}.json`)
  }
  const fallback = await read(`.card-import-tmp/standard-review/${lang}.json`)
  const selected = codes.map((code) => {
    const c = raw.find((c) => c.code === code) ?? fallback.find((c) => c.code === code)
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
  const entry = {
    code,
    status: 'verified',
    module: `card-${code}`,
    test: 'rules.test.ts',
    ...(c.permanent || c.exceptional ? { adapter: 'reviewed-economy-keywords-v1' } : {}),
    ...(uses
      ? {
          uses: {
            count: Number(uses[1]),
            type: uses[2] === 'ammo' ? 'ammo' : uses[2].replace(/s$/, ''),
          },
        }
      : {}),
    ...(c.text.startsWith('Fast.') ? { fast: true } : {}),
    ...(code === '11107' ? { commitLimit: 1 } : {}),
    ...(c.subname ? { subname: c.subname } : {}),
  }
  approvals.cards.push(entry)
  await fs.writeFile(
    dir + `card-${code}.ts`,
    `// RR: Triggered Abilities, Costs, Uses, Skill Tests.\nimport {registerEventEconomy} from './register'\nregisterEventEconomy('${code}')\n`,
  )
}
await fs.writeFile(
  dir + 'approvals.json',
  await format(JSON.stringify(approvals), { parser: 'json' }),
)
await fs.writeFile(
  'packages/cards/src/data/event-economy.json',
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
  `import {registerPlayerCards,type PlayerCardDef}from '@lcg/engine'\nimport data from '../data/event-economy.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const EVENT_ECONOMY_RENDERED_CODES=data.map(c=>c.code)\n`,
)
