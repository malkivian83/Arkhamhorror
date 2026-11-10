import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
// Lot 135: reactions to revealed chaos tokens (cancel, treat as, replace effects, Covenants).
const codes = [
  // Event and skills.
  '10131',
  '02271',
  '07036',
  // Spells that react to [curse] tokens.
  '07117',
  '07226',
  '07118',
  '07227',
  '07119',
  '07228',
  // Second [bless]/[curse] token rituals.
  '07190',
  '07195',
  // Covenants (Permanent).
  '07110',
  '07113',
  '07116',
  '07120',
  '07122',
  // Other reactions to revealed tokens.
  '07224',
  '06285',
  '10126',
  '10056',
  '08091',
]
const covenant = 'reviewed-covenant-permanent-v1'
const adapters = {
  '02271': 'reviewed-token-exile-v1',
  '07110': covenant,
  '07113': covenant,
  '07116': covenant,
  '07120': covenant,
  '07122': covenant,
  '07224': 'reviewed-exceptional-v1',
  '08091': 'reviewed-dual-faction-v1',
}
const dir = 'packages/cards/src/token-triggers/'
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
  if (!file.endsWith('.json') || file === 'token-triggers.json') continue
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
    // Public ArkhamDB card lists (arkhamdb.com / es.arkhamdb.com), downloaded to tmp/.
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
const useType = { charges: 'charge', ammo: 'ammo', supplies: 'supply', secrets: 'secret' }
for (const code of codes) {
  const c = english.find((c) => c.code === code)
  const uses = c.text.match(/Uses \((\d+) (\w+)\)/)
  const entry = {
    code,
    status: 'verified',
    module: `card-${code}`,
    test: 'rules.test.ts',
    ...(uses ? { uses: { count: Number(uses[1]), type: useType[uses[2]] } } : {}),
    ...(c.text.startsWith('Fast.') ? { fast: true } : {}),
    ...(c.subname ? { subname: c.subname } : {}),
    ...(adapters[code] ? { adapter: adapters[code] } : {}),
  }
  if (uses && !entry.uses.type) throw Error('Unknown uses ' + uses[2])
  approvals.cards.push(entry)
  await fs.writeFile(
    dir + `card-${code}.ts`,
    `// RR: Chaos Bag (Bless/Curse tokens), Triggered Abilities, Skill Tests (ST.3-ST.8).
import {registerTokenTrigger} from './register'
registerTokenTrigger('${code}')
`,
  )
}
await fs.writeFile(
  dir + 'approvals.json',
  await format(JSON.stringify(approvals), { parser: 'json' }),
)
await fs.writeFile(
  'packages/cards/src/data/token-triggers.json',
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
  `import {registerPlayerCards,type PlayerCardDef}from '@lcg/engine'\nimport data from '../data/token-triggers.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const TOKEN_TRIGGERS_RENDERED_CODES=data.map(c=>c.code)\n`,
)
