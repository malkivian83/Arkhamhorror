import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes =
  '08090 08092 08101 08103 08109 08111 05119 05194 05195 04230 04231 05117 05190 05191 04023 04149 10032 03309 08114 08115 03197 60429 53003 53004 60423 01084 08026 03158 05275 09078'.split(
    ' ',
  )
const dir = 'packages/cards/src/test-recovery/'
await fs.mkdir(dir, { recursive: true })
const inv = JSON.parse(
  await fs.readFile('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json', 'utf8'),
).cards
for (const file of await fs.readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === 'test-recovery.json') continue
  const data = JSON.parse(await fs.readFile('packages/cards/src/data/' + file, 'utf8'))
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
    source = JSON.parse(await fs.readFile(dir + `source-${lang}.json`, 'utf8'))
    if (!codes.every((code) => source.some((c) => c.code === code))) throw Error('New selection')
  } catch {
    source = JSON.parse(await fs.readFile(`.card-import-tmp/standard-review/${lang}.json`, 'utf8'))
  }
  const selected = codes.map((code) => {
    const c = source.find((c) => c.code === code)
    if (!c) throw Error('Missing ' + lang + code)
    return c
  })
  if (lang === 'en') english = selected
  const body = await format(JSON.stringify(selected), { parser: 'json' })
  approvals.sources[lang] = createHash('sha256').update(body).digest('hex')
  await fs.writeFile(dir + `source-${lang}.json`, body)
  const p = `packages/i18n/src/${lang}.json`
  let raw = await fs.readFile(p, 'utf8')
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
          recoveryUse: 'Usar {card}',
          recoverySpend: 'Gastar {n} cargas de {card}',
          recoveryIcon: 'Añadir un icono de {skill} a {card}',
          recoveryTarget: 'Elegir {name}',
          recoveryGive: 'Mover {n} pistas a {name}',
          recoveryLocation: 'Mover {n} pistas a {location}',
          recoveryReturn: 'Devolver {card}',
          recoveryAmmo: 'Combate con {card}',
          recoveryClean: 'Elegir {option} para {enemy}',
          recoveryDamage: 'Infligir {n} de daño a {enemy}',
          recoveryCleanResources: 'Ganar 2 recursos por {enemy}',
          recoveryCleanDamage: 'Infligir 2 de daño a {enemy}',
          recoveryCleanClue: 'Descubrir 1 pista por {enemy}',
          recoveryCleanDraw: 'Robar 1 carta por {enemy}',
        }
      : {
          recoveryUse: 'Use {card}',
          recoverySpend: 'Spend {n} charges from {card}',
          recoveryIcon: 'Add a {skill} icon to {card}',
          recoveryTarget: 'Choose {name}',
          recoveryGive: 'Move {n} clues to {name}',
          recoveryLocation: 'Move {n} clues to {location}',
          recoveryReturn: 'Return {card}',
          recoveryAmmo: 'Fight with {card}',
          recoveryClean: 'Choose {option} for {enemy}',
          recoveryDamage: 'Deal {n} damage to {enemy}',
          recoveryCleanResources: 'Gain 2 resources for {enemy}',
          recoveryCleanDamage: 'Deal 2 damage to {enemy}',
          recoveryCleanClue: 'Discover 1 clue for {enemy}',
          recoveryCleanDraw: 'Draw 1 card for {enemy}',
        }
  for (const [k, v] of Object.entries(labels))
    if (!raw.includes(`"${k}":`))
      raw = raw.replace('  "choice": {', `  "choice": {\n    "${k}": ${JSON.stringify(v)},`)
  if (!process.argv.includes('--metadata-only')) await fs.writeFile(p, raw)
}
for (const code of codes) {
  const c = english.find((c) => c.code === code),
    uses = c.text.match(/Uses \((\d+) (\w+)\)/)
  const a = {
    code,
    status: 'verified',
    module: `card-${code}`,
    test: 'rules.test.ts',
    ...(c.subname ? { subname: c.subname } : {}),
    ...(c.text.startsWith('Fast.') ? { fast: true } : {}),
    ...(uses ? { uses: { count: Number(uses[1]), type: uses[2] } } : {}),
    ...(['04230', '04231', '53004'].includes(code) ? { uses: { count: 0, type: 'secrets' } } : {}),
    ...(['05117', '05119', '08090', '08092', '08101', '08103', '08109', '08111'].includes(code)
      ? { adapter: 'reviewed-dual-faction-v1' }
      : {}),
    ...(['08114', '08115'].includes(code)
      ? { adapter: 'reviewed-memento-v1', subname: c.subname }
      : {}),
  }
  approvals.cards.push(a)
  await fs.writeFile(
    dir + `card-${code}.ts`,
    `// RR: Skill Tests, Uses, Costs, Healing, Reactions.\nimport {registerTestRecovery} from './register'\nregisterTestRecovery('${code}')\n`,
  )
}
await fs.writeFile(
  dir + 'approvals.json',
  await format(JSON.stringify(approvals), { parser: 'json' }),
)
await fs.writeFile(
  'packages/cards/src/data/test-recovery.json',
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
  `import {registerPlayerCards,type PlayerCardDef} from '@lcg/engine'\nimport data from '../data/test-recovery.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const TEST_RECOVERY_RENDERED_CODES=data.map(c=>c.code)\n`,
)
console.log(`Prepared ${codes.length} distinct cards`)
