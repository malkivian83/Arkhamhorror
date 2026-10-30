import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes = [
  '03107',
  '03109',
  '03111',
  '03113',
  '03115',
  '08027',
  '08040',
  '08056',
  '08069',
  '08081',
  '01063',
  '03271',
  '02272',
  '01058',
  '03035',
  '02265',
  '02266',
  '03032',
  '52007',
]
const dir = 'packages/cards/src/support-skills/'
await mkdir(dir, { recursive: true })
const inventory = JSON.parse(
  await readFile('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json', 'utf8'),
)
async function sourceSnapshot(lang) {
  try {
    const saved = JSON.parse(await readFile(dir + `source-${lang}.json`, 'utf8'))
    if (codes.every((code) => saved.some((c) => c.code === code))) return saved
  } catch {
    // Initial preparation reads the downloaded snapshot; subsequent runs use bundled sources.
  }
  return JSON.parse(await readFile(`.card-import-tmp/standard-review/${lang}.json`, 'utf8'))
}
const all = await sourceSnapshot('en')
const source = codes.map((code) => all.find((c) => c.code === code))
const cards = source.map((c) => {
  const uses = c.text.match(/Uses \((\d+) (\w+)\)/)
  return {
    code: c.code,
    status: 'verified',
    module: `card-${c.code}`,
    test: 'rules.test.ts',
    ...(c.text.includes('Fast.') ? { fast: true } : {}),
    ...(uses ? { uses: { count: Number(uses[1]), type: uses[2] } } : {}),
  }
})
const approvals = {
  sourceBundle: '3c8ee4b5d8100766',
  rulesRevision: 1,
  presentation: 'rendered',
  cards,
  sources: {},
}
for (const lang of ['en', 'es']) {
  const source = (await sourceSnapshot(lang)).filter((c) => codes.includes(c.code))
  const body = JSON.stringify(source, null, 2) + '\n'
  approvals.sources[lang] = createHash('sha256').update(body).digest('hex')
  await writeFile(dir + `source-${lang}.json`, body)
  const path = `packages/i18n/src/${lang}.json`
  let raw = await readFile(path, 'utf8')
  for (const c of source)
    for (const [section, value] of [
      ['names', c.name],
      ['summary', c.text],
      ['traits', c.traits],
    ]) {
      const start = raw.indexOf(`"${section}": {`, raw.indexOf('"offlineCard": {'))
      const at = raw.indexOf('\n', start) + 1
      if (raw.slice(start, raw.indexOf('\n    }', start)).includes(`"${c.code}":`)) continue
      raw = raw.slice(0, at) + `      "${c.code}": ${JSON.stringify(value)},\n` + raw.slice(at)
    }
  if (!raw.includes('"supportDoom":'))
    raw = raw.replace(
      '  "ability": {',
      '  "ability": {\n    "supportDoom": ' +
        JSON.stringify(
          lang === 'es' ? 'Colocar 1 perdición en este apoyo' : 'Place 1 doom on this asset',
        ) +
        ',',
    )
  await writeFile(path, raw)
}
await writeFile(dir + 'approvals.json', JSON.stringify(approvals, null, 2) + '\n')
await writeFile(
  'packages/cards/src/data/support-skills.json',
  JSON.stringify(
    cards.map((a) => {
      if (a.code === '02266') {
        const c = source.find((c) => c.code === a.code)
        if (!c.exceptional || c.cost !== 0 || c.xp !== 3) throw new Error('Unexpected Ace source')
        return {
          code: c.code,
          name: c.name,
          type: 'event',
          class: 'rogue',
          traits: ['Trick'],
          cost: 0,
          xp: 3,
          icons: {},
          slots: [],
          fast: true,
          exceptional: true,
          deckLimit: 1,
        }
      }
      const def = approvedDefinition(
        inventory.cards.find((c) => c.code === a.code),
        a,
      )
      if (a.code === '02266') Object.assign(def, { exceptional: true, deckLimit: 1 })
      return def
    }),
    null,
    2,
  ) + '\n',
)
for (const code of codes)
  await writeFile(
    dir + `card-${code}.ts`,
    `// RR: Triggered Abilities, Skill Tests, Search, Damage and Horror.\nimport {registerSupport} from './register'\nregisterSupport('${code}')\n`,
  )
await writeFile(
  dir + 'index.ts',
  `import {registerPlayerCards,type PlayerCardDef} from '@lcg/engine'\nimport data from '../data/support-skills.json'\n` +
    codes.map((c) => `import './card-${c}'`).join('\n') +
    `\nregisterPlayerCards(data as PlayerCardDef[])\nexport const SUPPORT_SKILL_RENDERED_CODES=data.map(c=>c.code)\n`,
)
