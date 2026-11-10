import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
import { assertEquivalent } from './cards-import/equivalence.mjs'
// Lot 133: exact reprints of playable cards (same English and Spanish text as the original).
// Each entry: [reprint, reviewed source printing, source module (relative to packages/cards/src)].
const reprints = [
  ['01523', '01023', 'reactive-events/card-01023'],
  ['01524', '01024', 'jenny-barnes/card-01024'],
  ['01527', '01027', 'reused-mechanics/card-01027'],
  ['01531', '01031', 'rex-murphy/card-01031'],
  ['01533', '01033', 'reactive-support/card-01033'],
  ['01536', '01036', 'skill-replacement/card-01036'],
  ['01541', '01041', 'resource-reactions/card-01041'],
  ['01542', '01042', 'phase-bonuses/card-01042'],
  ['01546', '01046', 'reactive-support/card-01046'],
  ['01548', '01048', 'survivor-deck/card-01048'],
  ['01550', '01050', 'jenny-barnes/card-01050'],
  ['01556', '01056', 'resource-reactions/card-01056'],
  ['01558', '01058', 'support-skills/card-01058'],
  ['01561', '01061', 'deck-divination/card-01061'],
  ['01563', '01063', 'support-skills/card-01063'],
  ['01564', '01064', 'sequenced-events/card-01064'],
  ['01573', '01073', 'stella-clark/card-01073'],
  ['01575', '01075', 'reactive-support/card-01075'],
  ['01580', '01080', 'reactive-events/card-01080'],
  ['01581', '01081', 'movement-skills/card-01081'],
  ['01583', '01083', 'reused-mechanics/card-01083'],
  ['01584', '01084', 'test-recovery/card-01084'],
  ['01585', '01085', 'damage-turn/card-01085'],
  ['01684', '02261', 'damage-turn/card-02261'],
  ['01686', '06279', 'upgraded-variants/card-06279'],
  ['01688', '03234', 'upgraded-variants/card-03234'],
  ['01689', '51007', 'upgraded-variants/card-51007'],
  ['01690', '03236', 'deck-divination/card-03236'],
  ['01692', '05324', 'resource-reactions/card-05324'],
  ['08057', '60379', 'andre-patel/card-60379'],
  ['08058', '60384', 'andre-patel/card-60384'],
  ['60313', '03030', 'reused-mechanics/card-03030'],
  ['60413', '03034', 'charged-assets/card-03034'],
  ['60414', '02153', 'charged-assets/card-02153'],
  ['60418', '02190', 'token-skills/card-02190'],
]
const codes = reprints.map(([c]) => c)
const adapters = {
  '08057': 'reviewed-exceptional-v1',
  '08058': 'reviewed-exceptional-v1',
}
const dir = 'packages/cards/src/reprints-wave-3/'
const read = async (p) => JSON.parse((await fs.readFile(p, 'utf8')).replace(/^\uFEFF/, ''))
await fs.mkdir(dir, { recursive: true })
const inv = (await read('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json')).cards
const approvals = {
  sourceBundle: '3c8ee4b5d8100766',
  presentation: 'rendered',
  rulesRevision: 1,
  sourceFiles: {
    en: 'source-en.json',
    es: 'source-es.json',
    'originals-en': 'originals-en.json',
    'originals-es': 'originals-es.json',
  },
  equivalence: { method: 'canonical-mechanical-fields-v1', spanish: 'name-text-traits' },
  sources: {},
  cards: [],
}
for (const file of await fs.readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === 'reprints-wave-3.json') continue
  const data = await read('packages/cards/src/data/' + file)
  if (Array.isArray(data) && data.some((c) => codes.includes(c.code)))
    throw Error('Duplicate code in ' + file)
}
const definitions = new Map()
for (const file of await fs.readdir('packages/cards/src/data'))
  if (file.endsWith('.json') && file !== 'reprints-wave-3.json') {
    const data = await read('packages/cards/src/data/' + file)
    if (Array.isArray(data)) for (const d of data) if (d?.code) definitions.set(d.code, d)
  }
const selected = {}
for (const lang of ['en', 'es'])
  for (const [kind, list] of [
    ['source', codes],
    ['originals', reprints.map(([, s]) => s)],
  ]) {
    const file = dir + `${kind}-${lang}.json`
    let raw
    try {
      raw = await read(file)
    } catch {
      // Public ArkhamDB card lists (arkhamdb.com / es.arkhamdb.com), downloaded to tmp/.
      raw = await read(`tmp/lot129/${lang}-all.json`)
    }
    const cards = list.map((code) => {
      const c = raw.find((c) => c.code === code)
      if (!c) throw Error(code)
      return c
    })
    selected[kind + lang] = cards
    const body = await format(JSON.stringify(cards), { parser: 'json' })
    approvals.sources[kind === 'source' ? lang : `${kind}-${lang}`] = createHash('sha256')
      .update(body)
      .digest('hex')
    await fs.writeFile(file, body)
  }
for (const lang of ['en', 'es']) {
  const path = `packages/i18n/src/${lang}.json`
  let text = await fs.readFile(path, 'utf8')
  for (const c of selected['source' + lang])
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
for (const [i, [code, source, module]] of reprints.entries()) {
  const c = selected.sourceen[i],
    o = selected.originalsen[i]
  const hash = assertEquivalent(o, c)
  const ces = selected.sourcees[i],
    oes = selected.originalses[i]
  for (const field of ['name', 'text', 'traits'])
    if (
      (ces[field] ?? '').replace(/\s+/g, ' ').trim() !==
      (oes[field] ?? '').replace(/\s+/g, ' ').trim()
    )
      throw Error(`Spanish ${field} differs: ${code}`)
  // Uses and Fast follow the reviewed source definition (same printed text).
  const { uses, fast } = definitions.get(source) ?? {}
  const entry = {
    code,
    status: 'verified',
    module: `card-${code}`,
    test: 'reprints.test.ts',
    behaviorSource: source,
    equivalenceSha256: hash,
    ...(uses ? { uses } : {}),
    ...(fast ? { fast: true } : {}),
    ...(c.subname ? { subname: c.subname } : {}),
    ...(adapters[code] ? { adapter: adapters[code] } : {}),
  }
  approvals.cards.push(entry)
  await fs.writeFile(
    dir + `card-${code}.ts`,
    `// RR: same text as ${source} (English and Spanish); reviewed behavior bound to this printing.
import '../${module}'
import {registerReprint} from './register'
registerReprint('${code}', '${source}')
`,
  )
}
await fs.writeFile(
  dir + 'approvals.json',
  await format(JSON.stringify(approvals), { parser: 'json' }),
)
await fs.writeFile(
  'packages/cards/src/data/reprints-wave-3.json',
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
  `import {registerPlayerCards,type PlayerCardDef}from '@lcg/engine'\nimport data from '../data/reprints-wave-3.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const THIRD_REPRINT_RENDERED_CODES=data.map(c=>c.code)\n`,
)
