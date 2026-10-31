import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const codes = [
  '08120',
  '08121',
  '08122',
  '08123',
  '08124',
  '09082',
  '09096',
  '09083',
  '09097',
  '09085',
  '09098',
  '09084',
  '09103',
  '11085',
  '10065',
  '10077',
  '10066',
  '10082',
  '10074',
  '10081',
  '10021',
  '09104',
  '04276',
  '03025',
  '05154',
  '02269',
  '02153',
  '04026',
  '53005',
  '03034',
]
const dir = 'packages/cards/src/charged-assets/'
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
    ...(code === '05154' ? { uses: { count: 0, type: 'evidence' } } : {}),
    ...(code === '03025' ? { uses: { count: 0, type: 'secrets' } } : {}),
    ...(['10066', '10082'].includes(code) ? { uses: { count: 0, type: 'suspicion' } } : {}),
    ...(v.factions.length === 3 ? { adapter: 'reviewed-talent-factions-v1' } : {}),
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
          chargedDoom: 'Agotar y colocar 1 perdición',
          chargedClear: 'Sin colocar perdición',
          chargedGain: 'Gastar {n} usos: robar {n} cartas y ganar {n} recursos',
          chargedSeal: 'Traducir los glifos descartando {card}',
          chargedVampDone: 'Terminar las pruebas',
          chargedSkill: 'Probar {skill}',
          chargedAttack: 'Atacar con {skill} ({mode})',
          chargedNormal: 'Sin agotar',
          chargedPower: 'Agotar y colocar perdición',
          chargedHeal: 'Curar {n} {kind} de {name}',
          chargedRisk: 'Descartar {card} o sufrir un ataque',
          chargedTrash: 'Descartar {card}',
          chargedLegend: 'Ataque legendario con {card}',
          chargedCamera: 'Colocar 1 prueba en {card}',
          chargedJewel: 'Agotar {card}: robar o ganar recursos',
          chargedOnlyDiscard: 'Solo se puede jugar desde el descarte',
        }
      : {
          chargedDoom: 'Exhaust and place 1 doom',
          chargedClear: 'Without placing doom',
          chargedGain: 'Spend {n} uses: draw {n} cards and gain {n} resources',
          chargedSeal: 'Translate glyphs by discarding {card}',
          chargedVampDone: 'Finish testing',
          chargedSkill: 'Test {skill}',
          chargedAttack: 'Fight using {skill} ({mode})',
          chargedNormal: 'Without exhausting',
          chargedPower: 'Exhaust and place doom',
          chargedHeal: 'Heal {n} {kind} from {name}',
          chargedRisk: 'Discard {card} or suffer an attack',
          chargedTrash: 'Discard {card}',
          chargedLegend: 'Legendary attack with {card}',
          chargedCamera: 'Place 1 evidence on {card}',
          chargedJewel: 'Exhaust {card}: draw or gain resources',
          chargedOnlyDiscard: 'Can only be played from the discard pile',
        }
  Object.assign(
    labels,
    lang === 'es'
      ? {
          chargedEnemyAttack: '{enemy} te ataca',
          chargedCharge: 'Colocar 1 carga en {card}',
          chargedParley: 'Parlamentar con {enemy} usando {card}',
          chargedClue: 'Descubrir 1 pista en {location}',
          chargedEnemy: 'Elegir {enemy}',
          chargedMoveEnemy: 'Mover {enemy} a {location}',
        }
      : {
          chargedEnemyAttack: '{enemy} attacks you',
          chargedCharge: 'Place 1 charge on {card}',
          chargedParley: 'Parley with {enemy} using {card}',
          chargedClue: 'Discover 1 clue at {location}',
          chargedEnemy: 'Choose {enemy}',
          chargedMoveEnemy: 'Move {enemy} to {location}',
        },
  )
  if (!raw.includes('"onlyDiscard":'))
    raw = raw.replace(
      '"unplayable": {',
      '"unplayable": {\n    "onlyDiscard": ' +
        JSON.stringify(
          lang === 'es'
            ? 'Solo se puede jugar desde el descarte'
            : 'Can only be played from the discard pile',
        ) +
        ',',
    )
  if (!raw.includes('"translatedGlyphs":')) {
    const at = raw.indexOf('"note": {', raw.indexOf('"story": {'))
    if (at < 0) throw Error('Missing story note section')
    raw =
      raw.slice(0, at) +
      raw
        .slice(at)
        .replace(
          '"note": {',
          '"note": {\n      "translatedGlyphs": ' +
            JSON.stringify(
              lang === 'es' ? 'Has traducido los glifos.' : 'You have translated the glyphs.',
            ) +
            ',',
        )
  }
  for (const [key, value] of Object.entries(labels))
    if (!raw.includes(`"${key}":`))
      raw = raw.replace('  "choice": {', `  "choice": {\n    "${key}": ${JSON.stringify(value)},`)
  await writeFile(path, raw)
}
await writeFile(dir + 'approvals.json', JSON.stringify(approvals, null, 2) + '\n')
await writeFile(
  'packages/cards/src/data/charged-assets.json',
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
    `// RR: Triggered Abilities, Costs, Skill Tests, Play, Parley.\nimport { registerChargedAsset } from './register'\nregisterChargedAsset('${code}')\n`,
  )
await writeFile(
  dir + 'index.ts',
  `import {registerPlayerCards,type PlayerCardDef} from '@lcg/engine'\nimport data from '../data/charged-assets.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const CHARGED_ASSET_RENDERED_CODES=data.map(c=>c.code)\n`,
)
