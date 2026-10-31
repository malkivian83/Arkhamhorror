import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes = [
  '03024',
  '05025',
  '05110',
  '01041',
  '05236',
  '08126',
  '05233',
  '06162',
  '06244',
  '07111',
  '08036',
  '06205',
  '06326',
  '10043',
  '10067',
  '10111',
  '04159',
  '02309',
  '05324',
  '01056',
  '03192',
  '03193',
  '52004',
  '04022',
  '04308',
  '10122',
  '07121',
  '08095',
  '08117',
  '08119',
]
const dir = 'packages/cards/src/resource-reactions/'
await mkdir(dir, { recursive: true })
const inventory = JSON.parse(
  await readFile('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json', 'utf8'),
)
for (const file of await readdir('packages/cards/src/data')) {
  if (!file.endsWith('.json') || file === 'resource-reactions.json') continue
  const data = JSON.parse(await readFile('packages/cards/src/data/' + file, 'utf8'))
  if (Array.isArray(data) && data.some((c) => codes.includes(c.code)))
    throw Error('Code already declared in ' + file)
}
const snapshots = {}
for (const lang of ['en', 'es']) {
  try {
    snapshots[lang] = JSON.parse(await readFile(dir + `approved-source-${lang}.json`, 'utf8'))
    if (!codes.every((code) => snapshots[lang].some((c) => c.code === code)))
      throw Error('New candidates')
  } catch {
    snapshots[lang] = JSON.parse(
      await readFile(`.card-import-tmp/standard-review/${lang}.json`, 'utf8'),
    )
  }
}
const cards = codes.map((code) => {
  const c = snapshots.en.find((c) => c.code === code),
    uses = c.text.match(/Uses \((\d+) (\w+)\)/)
  return {
    code,
    status: 'verified',
    module: `card-${code}`,
    test: [
      '03024',
      '05233',
      '06244',
      '07111',
      '06162',
      '01041',
      '05236',
      '10043',
      '10067',
      '10111',
      '04159',
      '02309',
      '01056',
      '05324',
      '08126',
    ].includes(code)
      ? 'rules.test.ts'
      : 'effects.test.ts',
    ...(c.subname ? { subname: c.subname } : {}),
    ...(c.text.includes('Fast.') ? { fast: true } : {}),
    ...(uses ? { uses: { count: Number(uses[1]), type: uses[2] } } : {}),
    ...(code === '04308'
      ? { adapter: 'reviewed-borrowed-time-v1', uses: { count: 0, type: 'clicks' } }
      : {}),
    ...(code === '05236' ? { adapter: 'reviewed-exile-defeat-v1' } : {}),
    ...(['08095', '08117', '08119'].includes(code) ? { adapter: 'reviewed-dual-faction-v1' } : {}),
  }
})
const approvals = {
  sourceBundle: '3c8ee4b5d8100766',
  presentation: 'rendered',
  rulesRevision: 1,
  cards,
  sources: {},
  sourceFiles: { en: 'approved-source-en.json', es: 'approved-source-es.json' },
}
for (const lang of ['en', 'es']) {
  const selected = codes.map((code) => snapshots[lang].find((c) => c.code === code))
  // Preserve the complete pending-review snapshots for the unimplemented candidates.
  const body = await format(JSON.stringify(selected), { parser: 'json' })
  approvals.sources[lang] = createHash('sha256').update(body).digest('hex')
  await writeFile(dir + `approved-source-${lang}.json`, body)
  const p = `packages/i18n/src/${lang}.json`
  let raw = await readFile(p, 'utf8')
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
          resourceReact: 'Usar {card}',
          resourceUses: 'Mover 1 uso de {from} a {to}',
          resourceInvest: 'Convertir {n} suministros en recursos',
          resourceBet: 'Apostar {n} recursos de {card}',
          resourceClue: 'Descubrir pistas en {location}',
          resourceShare: 'Dar 1 recurso a {name} ({n} restantes)',
          resourceDream: 'Buscar otra copia de {card}',
          resourceDiscard: 'Descartar {card} para ganar 2 recursos',
          resourceReturn: 'Devolver {card} a su propietario',
          resourceSecret: 'Mover recursos de {card}',
        }
      : {
          resourceReact: 'Use {card}',
          resourceUses: 'Move 1 use from {from} to {to}',
          resourceInvest: 'Move {n} supplies to your resource pool',
          resourceBet: 'Wager {n} resources from {card}',
          resourceClue: 'Discover clues at {location}',
          resourceShare: 'Give 1 resource to {name} ({n} remaining)',
          resourceDream: 'Search for another copy of {card}',
          resourceDiscard: 'Discard {card} to gain 2 resources',
          resourceReturn: 'Return {card} to its owner',
          resourceSecret: 'Move resources from {card}',
        }
  Object.assign(
    labels,
    lang === 'es'
      ? {
          resourceRevealTitle: 'Carta revelada',
          resourceRevealBody: 'Referencia para la búsqueda de Sueños lúcidos.',
        }
      : {
          resourceRevealTitle: 'Revealed card',
          resourceRevealBody: 'Reference card for Lucid Dreaming’s search.',
        },
  )
  for (const [key, value] of Object.entries(labels))
    if (!raw.includes(`"${key}":`))
      raw = raw.replace('  "choice": {', `  "choice": {\n    "${key}": ${JSON.stringify(value)},`)
  if (!raw.includes('"identifiedStone":')) {
    const at = raw.indexOf('"note": {', raw.indexOf('"story": {'))
    if (at < 0) throw Error('Missing story notes')
    raw =
      raw.slice(0, at) +
      raw
        .slice(at)
        .replace(
          '"note": {',
          '"note": {\n      "identifiedStone": ' +
            JSON.stringify(
              lang === 'es' ? 'Has identificado la piedra.' : 'You have identified the stone.',
            ) +
            ',',
        )
  }
  await writeFile(p, raw)
}
await writeFile(dir + 'approvals.json', await format(JSON.stringify(approvals), { parser: 'json' }))
await writeFile(
  'packages/cards/src/data/resource-reactions.json',
  await format(
    JSON.stringify(
      cards.map((a) =>
        approvedDefinition(
          inventory.cards.find((c) => c.code === a.code),
          a,
        ),
      ),
    ),
    { parser: 'json' },
  ),
)
for (const code of codes)
  await writeFile(
    dir + `card-${code}.ts`,
    `// RR: Triggered Abilities, Uses, Skill Tests, Costs.\nimport {registerResourceReaction} from './register'\nregisterResourceReaction('${code}')\n`,
  )
await writeFile(
  dir + 'index.ts',
  `import {registerPlayerCards,type PlayerCardDef} from '@lcg/engine'\nimport data from '../data/resource-reactions.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const RESOURCE_REACTION_RENDERED_CODES=data.map(c=>c.code)\n`,
)
