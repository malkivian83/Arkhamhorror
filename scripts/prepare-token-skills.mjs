import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes = '02190 04198 03235 60419 09049 10031 11097 60471 11042 06199 06245 06034'.split(' ')
const myriad = ['11042', '06199', '06245', '06034']
const dir = 'packages/cards/src/token-skills/'
await fs.mkdir(dir, { recursive: true })
const inventory = JSON.parse(
  await fs.readFile('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json'),
).cards
for (const file of await fs.readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === 'token-skills.json') continue
  const data = JSON.parse(await fs.readFile('packages/cards/src/data/' + file))
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
for (const lang of ['en', 'es']) {
  const raw = JSON.parse(await fs.readFile(`.card-import-tmp/standard-review/${lang}.json`))
  const selected = codes.map((code) => {
    const c = raw.find((c) => c.code === code)
    if (!c) throw Error(code)
    return c
  })
  const source = await format(JSON.stringify(selected), { parser: 'json' })
  approvals.sources[lang] = createHash('sha256').update(source).digest('hex')
  await fs.writeFile(dir + `source-${lang}.json`, source)
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
          tokenSkillUse: 'Usar {card}',
          tokenSkillName: 'Elegir {token}',
          tokenSkillCharge: 'Gastar 1 carga de {card}',
          tokenSkillRecover: 'Recuperar {card}',
          tokenSkillShuffle: 'Barajar {n} copias de {card} en tu mazo',
          tokenSkillAdd: 'Añadir 1 {use} a {card}',
          tokenSkillEven: 'Par',
          tokenSkillOdd: 'Impar',
          tokenSkillSymbol: 'Símbolo',
        }
      : {
          tokenSkillUse: 'Use {card}',
          tokenSkillName: 'Choose {token}',
          tokenSkillCharge: 'Spend 1 charge from {card}',
          tokenSkillRecover: 'Recover {card}',
          tokenSkillShuffle: 'Shuffle {n} copies of {card} into your deck',
          tokenSkillAdd: 'Add 1 {use} to {card}',
          tokenSkillEven: 'Even',
          tokenSkillOdd: 'Odd',
          tokenSkillSymbol: 'Symbol',
        }
  Object.assign(
    labels,
    lang === 'es'
      ? {
          tokenSkillAddCharge: 'Añadir 1 carga a {card}',
          tokenSkillAddSecret: 'Añadir 1 secreto a {card}',
        }
      : {
          tokenSkillAddCharge: 'Add 1 charge to {card}',
          tokenSkillAddSecret: 'Add 1 secret to {card}',
        },
  )
  for (const [key, value] of Object.entries(labels))
    if (!text.includes(`"${key}":`))
      text = text.replace('  "choice": {', `  "choice": {\n    "${key}": ${JSON.stringify(value)},`)
  await fs.writeFile(path, text)
}
for (const code of codes) {
  approvals.cards.push({
    code,
    status: 'verified',
    module: `card-${code}`,
    test: 'rules.test.ts',
    ...(myriad.includes(code) ? { adapter: 'reviewed-myriad-v1' } : {}),
    ...(['60419', '11097', '60471'].includes(code) ? { commitLimit: 1 } : {}),
  })
  await fs.writeFile(
    dir + `card-${code}.ts`,
    `// RR: Skill Tests, Costs, Chaos Tokens, Myriad.\nimport { registerTokenSkill } from './register'\nregisterTokenSkill('${code}')\n`,
  )
}
await fs.writeFile(
  dir + 'approvals.json',
  await format(JSON.stringify(approvals), { parser: 'json' }),
)
await fs.writeFile(
  'packages/cards/src/data/token-skills.json',
  await format(
    JSON.stringify(
      approvals.cards.map((a) =>
        approvedDefinition(
          inventory.find((c) => c.code === a.code),
          a,
        ),
      ),
    ),
    { parser: 'json' },
  ),
)
await fs.writeFile(
  dir + 'index.ts',
  `import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'\nimport data from '../data/token-skills.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const TOKEN_SKILL_RENDERED_CODES=data.map(c=>c.code)\n`,
)
