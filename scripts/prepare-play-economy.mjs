import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes = ['04108', '04236', '53010', '09072', '60332', '60412', '60422', '60470', '08128']
const dir = 'packages/cards/src/play-economy/'
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
  if (!file.endsWith('.json') || file === 'play-economy.json') continue
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
    ...(c.subname ? { subname: c.subname } : {}),
  }
  approvals.cards.push(entry)
  await fs.writeFile(
    dir + `card-${code}.ts`,
    `// RR: Triggered Abilities, Costs, Uses, Skill Tests.\nimport {registerPlayEconomy} from './register'\nregisterPlayEconomy('${code}')\n`,
  )
}
await fs.writeFile(
  dir + 'approvals.json',
  await format(JSON.stringify(approvals), { parser: 'json' }),
)
await fs.writeFile(
  'packages/cards/src/data/play-economy.json',
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
  `import {registerPlayerCards,type PlayerCardDef}from '@lcg/engine'\nimport data from '../data/play-economy.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const PLAY_ECONOMY_RENDERED_CODES=data.map(c=>c.code)\n`,
)
