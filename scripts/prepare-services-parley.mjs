import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes = ['05111', '05234', '05277', '04105', '05113', '10114', '04153']
const batch = 'services-parley',
  dir = `packages/cards/src/${batch}/`
await fs.mkdir(dir, { recursive: true })
const inv = JSON.parse(
  await fs.readFile('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json'),
).cards
for (const file of await fs.readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === batch + '.json') continue
  const data = JSON.parse(await fs.readFile('packages/cards/src/data/' + file))
  if (Array.isArray(data) && data.some((c) => codes.includes(c.code)))
    throw Error('Already declared: ' + file)
}
const approvals = {
  sourceBundle: '3c8ee4b5d8100766',
  presentation: 'rendered',
  rulesRevision: 1,
  sourceFiles: { en: 'source-en.json', es: 'source-es.json' },
  sources: {},
  cards: [],
}
for (const lang of ['en', 'es']) {
  const raw = JSON.parse(await fs.readFile(`.card-import-tmp/standard-review/${lang}.json`))
  const selected = codes.map((code) => {
    const c = raw.find((c) => c.code === code)
    if (!c) throw Error(code)
    return c
  })
  const body = await format(JSON.stringify(selected), { parser: 'json' })
  await fs.writeFile(dir + `source-${lang}.json`, body)
  approvals.sources[lang] = createHash('sha256').update(body).digest('hex')
  const path = `packages/i18n/src/${lang}.json`
  let text = await fs.readFile(path, 'utf8')
  for (const c of selected)
    for (const [section, value] of [
      ['names', c.name],
      ['summary', c.text],
      ['traits', c.traits],
    ]) {
      const start = text.indexOf(`"${section}": {`, text.indexOf('"offlineCard": {'))
      if (text.slice(start, text.indexOf('\n    }', start)).includes(`"${c.code}":`)) continue
      const at = text.indexOf('\n', start) + 1
      text = text.slice(0, at) + `      "${c.code}": ${JSON.stringify(value)},\n` + text.slice(at)
    }
  const labels =
    lang === 'es'
      ? {
          serviceMode: 'Aumentar el coste en {n}: opción {mode}',
          serviceEnemy: 'Elegir {enemy}',
          serviceMore: 'Elegir otro enemigo',
          serviceDone: 'Terminar',
        }
      : {
          serviceMode: 'Increase cost by {n}: option {mode}',
          serviceEnemy: 'Choose {enemy}',
          serviceMore: 'Choose another enemy',
          serviceDone: 'Done',
        }
  delete labels.serviceMode
  const modes =
    lang === 'es'
      ? [
          'Efecto normal (+{n} recursos)',
          'Aumentar cantidad (+{n} recursos)',
          'Alcance de hasta 2 conexiones (+{n} recursos)',
          'Aumentar cantidad y alcance (+{n} recursos)',
        ]
      : [
          'Normal effect (+{n} resources)',
          'Increase amount (+{n} resources)',
          'Range up to 2 connections (+{n} resources)',
          'Increase amount and range (+{n} resources)',
        ]
  modes.forEach((text, n) => {
    labels['serviceMode' + n] = text
  })
  for (const [key, value] of Object.entries(labels))
    if (!text.includes(`"${key}":`))
      text = text.replace('  "choice": {', `  "choice": {\n    "${key}": ${JSON.stringify(value)},`)
  await fs.writeFile(path, text)
}
for (const code of codes) {
  approvals.cards.push({ code, status: 'verified', module: `card-${code}`, test: 'rules.test.ts' })
  await fs.writeFile(
    dir + `card-${code}.ts`,
    `// RR: Play, Costs, Evade, Parley, Skill Tests.\nimport { registerService } from './register'\nregisterService('${code}')\n`,
  )
}
await fs.writeFile(
  dir + 'approvals.json',
  await format(JSON.stringify(approvals), { parser: 'json' }),
)
await fs.writeFile(
  `packages/cards/src/data/${batch}.json`,
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
  `import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'\nimport data from '../data/${batch}.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const SERVICE_RENDERED_CODES = data.map(c => c.code)\n`,
)
