import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes = [
  '05115',
  '08094',
  '08096',
  '05118',
  '07021',
  '07029',
  '07159',
  '03112',
  '08075',
  '04274',
  '08086',
  '10041',
  '03023',
  '03033',
  '09095',
  '06202',
  '03196',
  '06284',
  '10030',
  '10057',
  '10094',
  '10073',
  '10083',
  '05020',
  '11056',
  '05159',
  '08032',
  '11074',
  '11072',
  '11037',
  '11033',
]
const dir = 'packages/cards/src/tools-parley/'
await mkdir(dir, { recursive: true })
const inventory = JSON.parse(
  await readFile('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json', 'utf8'),
)
async function snapshot(lang) {
  try {
    const saved = JSON.parse(await readFile(dir + `source-${lang}.json`, 'utf8'))
    if (codes.every((code) => saved.some((c) => c.code === code))) return saved
  } catch {
    /* Initial preparation uses the downloaded official snapshot. */
  }
  return JSON.parse(await readFile(`.card-import-tmp/standard-review/${lang}.json`, 'utf8'))
}
const en = await snapshot('en')
const cards = codes.map((code) => {
  const c = en.find((c) => c.code === code),
    v = inventory.cards.find((c) => c.code === code),
    uses = c.text.match(/Uses \((\d+) (\w+)\)/)
  return {
    code,
    status: 'verified',
    module: `card-${code}`,
    test: 'rules.test.ts',
    ...(c.subname ? { subname: c.subname } : {}),
    ...(c.text.includes('Fast.') ? { fast: true } : {}),
    ...(uses ? { uses: { count: Number(uses[1]), type: uses[2] } } : {}),
    ...(['08086', '11033'].includes(code) ? { uses: { count: 0, type: 'evidence' } } : {}),
    ...(v.factions.length === 2 ? { adapter: 'reviewed-dual-faction-v1' } : {}),
  }
})
const approvals = {
  sourceBundle: '3c8ee4b5d8100766',
  presentation: 'rendered',
  rulesRevision: 1,
  cards,
  sources: {},
}
for (const lang of ['en', 'es']) {
  const all = await snapshot(lang),
    source = codes.map((code) => all.find((c) => c.code === code))
  const body = await format(JSON.stringify(source), { parser: 'json' })
  approvals.sources[lang] = createHash('sha256').update(body).digest('hex')
  await writeFile(dir + `source-${lang}.json`, body)
  const path = `packages/i18n/src/${lang}.json`
  let raw = await readFile(path, 'utf8')
  for (const c of source)
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
          toolAttack: '{card}: {skill} {bonus}, daño {damage}, acciones {actions}',
          toolDoom: 'Colocar {n} de perdición',
          toolEven: 'Costes pares',
          toolOdd: 'Costes impares',
          toolDiscardSpell: 'Descartar {card}',
          toolPlay: 'Jugar {card} (descuento de {n})',
          toolParley: 'Parlamentar con {enemy}',
          toolThin: 'Aumentar la dificultad en 2',
          toolEvidence: 'Colocar 1 prueba en {card}',
          toolDamage: 'Infligir {n} de daño a {enemy}',
          toolDrain: 'Mover {n} de daño a {enemy}',
        }
      : {
          toolAttack: '{card}: {skill} {bonus}, damage {damage}, actions {actions}',
          toolDoom: 'Place {n} doom',
          toolEven: 'Even costs',
          toolOdd: 'Odd costs',
          toolDiscardSpell: 'Discard {card}',
          toolPlay: 'Play {card} ({n} discount)',
          toolParley: 'Parley with {enemy}',
          toolThin: 'Increase difficulty by 2',
          toolEvidence: 'Place 1 evidence on {card}',
          toolDamage: 'Deal {n} damage to {enemy}',
          toolDrain: 'Move {n} damage to {enemy}',
        }
  Object.assign(
    labels,
    lang === 'es'
      ? {
          toolTome: 'Atacar con {skill} y colocar {doom} de perdición',
          toolEntry: 'Activar {card} al entrar',
          toolAttackDamage: 'Usar {card}',
          toolKirby: 'Revelar cartas con Jeremiah Kirby',
          toolRevealBody: 'Cartas reveladas del mazo:',
          toolRevealed: '{card}',
          toolResourceOn: 'Colocar 1 recurso en {card}',
          toolRenfield: 'Agotar para colocar perdición opcional y ganar recursos',
          toolCharge: 'Colocar 1 carga en {card}',
          toolCipherFast: 'Investigar con +1 velo (rápida; coste adicional de {n} acciones)',
        }
      : {
          toolTome: 'Fight using {skill} and place {doom} doom',
          toolEntry: 'Activate {card} on entering play',
          toolAttackDamage: 'Use {card}',
          toolKirby: 'Reveal cards with Jeremiah Kirby',
          toolRevealBody: 'Cards revealed from the deck:',
          toolRevealed: '{card}',
          toolResourceOn: 'Place 1 resource on {card}',
          toolRenfield: 'Exhaust to optionally place doom and gain resources',
          toolCharge: 'Place 1 charge on {card}',
          toolCipherFast: 'Investigate at +1 shroud (fast; {n} additional actions)',
        },
  )
  for (const [key, value] of Object.entries(labels))
    if (!raw.includes(`"${key}":`))
      raw = raw.replace('  "choice": {', `  "choice": {\n    "${key}": ${JSON.stringify(value)},`)
  await writeFile(path, raw)
}
await writeFile(dir + 'approvals.json', JSON.stringify(approvals, null, 2) + '\n')
await writeFile(
  'packages/cards/src/data/tools-parley.json',
  JSON.stringify(
    cards.map((a) =>
      approvedDefinition(
        inventory.cards.find((c) => c.code === a.code),
        a,
      ),
    ),
    null,
    2,
  ) + '\n',
)
for (const code of codes)
  await writeFile(
    dir + `card-${code}.ts`,
    `// RR: Triggered Abilities, Costs, Skill Tests, Play, Parley.\nimport { registerToolsParley } from './register'\nregisterToolsParley('${code}')\n`,
  )
await writeFile(
  dir + 'index.ts',
  `import {registerPlayerCards,type PlayerCardDef} from '@lcg/engine'\nimport data from '../data/tools-parley.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const TOOLS_PARLEY_RENDERED_CODES=data.map(c=>c.code)\n`,
)
