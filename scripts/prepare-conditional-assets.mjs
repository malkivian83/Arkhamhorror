import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes = '06026 11096 06323 11090 10127 03313 06159 04158'.split(' '),
  dir = 'packages/cards/src/conditional-assets/'
await fs.mkdir(dir, { recursive: true })
const read = async (p) => JSON.parse((await fs.readFile(p, 'utf8')).replace(/^\uFEFF/, ''))
const inv = (await read('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json')).cards
for (const file of await fs.readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === 'conditional-assets.json') continue
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
    lang === 'es'
      ? {
          conditionalPlay: 'Jugar otra copia de {card}',
          conditionalHealDamage: 'Curar 1 daño de {name}',
          conditionalHealHorror: 'Curar 1 horror de {name}',
          conditionalResolve: 'Descartar una copia de {card} para curar este apoyo',
          conditionalClue: 'Descubrir 1 pista adicional con {card}',
          conditionalReveal: '{name} revela dos copias de {card}',
          conditionalRecall: 'Nombrar una ficha con {card}',
          conditionalToken: 'Nombrar {token}',
        }
      : {
          conditionalPlay: 'Play another copy of {card}',
          conditionalHealDamage: 'Heal 1 damage from {name}',
          conditionalHealHorror: 'Heal 1 horror from {name}',
          conditionalResolve: 'Discard a copy of {card} to heal this asset',
          conditionalClue: 'Discover 1 additional clue with {card}',
          conditionalReveal: '{name} reveals two copies of {card}',
          conditionalRecall: 'Name a token with {card}',
          conditionalToken: 'Name {token}',
        }
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
    ...(['06026', '11096', '06323', '11090'].includes(code)
      ? { adapter: 'reviewed-myriad-v1' }
      : code === '10127'
        ? { adapter: 'reviewed-dark-horse-v1' }
        : {}),
  })
  await fs.writeFile(
    dir + `card-${code}.ts`,
    `// RR: Myriad, Healing, Reactions, Constant Abilities.\nimport { registerConditional } from './register'\nregisterConditional('${code}')\n`,
  )
}
await fs.writeFile(
  dir + 'approvals.json',
  await format(JSON.stringify(approvals), { parser: 'json' }),
)
await fs.writeFile(
  'packages/cards/src/data/conditional-assets.json',
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
  `import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'\nimport data from '../data/conditional-assets.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const CONDITIONAL_ASSET_RENDERED_CODES=data.map(c=>c.code)\n`,
)
