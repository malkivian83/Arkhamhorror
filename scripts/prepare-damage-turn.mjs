import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
const tarot = ['05023', '05027', '05031', '05035', '05039', '54003', '54005']
const codes = [
  '02261',
  '05315',
  '09102',
  '01085',
  '05281',
  '54010',
  '60173',
  ...tarot,
  '08083',
  '60309',
  '60570',
  '60472',
  '03314',
  '10069',
  '10048',
  '03029',
  '09066',
  '07108',
  '07027',
  '03266',
  '10108',
]
const dir = 'packages/cards/src/damage-turn/'
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
const rawEn = await sourceSnapshot('en')
const cards = codes.map((code) => ({
  code,
  status: 'verified',
  module: `card-${code}`,
  test: ['02261', '05315', '09102', '01085', '05281', '54010', '60173'].includes(code)
    ? 'rules.test.ts'
    : 'windows.test.ts',
  ...(rawEn.find((c) => c.code === code).subname
    ? { subname: rawEn.find((c) => c.code === code).subname }
    : {}),
  ...(rawEn.find((c) => c.code === code).text.includes('Fast.') ? { fast: true } : {}),
  ...(rawEn.find((c) => c.code === code).text.match(/Uses \((\d+) (\w+)\)/)
    ? {
        uses: {
          count: Number(rawEn.find((c) => c.code === code).text.match(/Uses \((\d+) (\w+)\)/)[1]),
          type: rawEn.find((c) => c.code === code).text.match(/Uses \((\d+) (\w+)\)/)[2],
        },
      }
    : {}),
  ...(tarot.includes(code) ? { adapter: 'reviewed-tarot-v1' } : {}),
  ...(code === '08083' ? { adapter: 'reviewed-dual-faction-v1' } : {}),
}))
const approvals = {
  sourceBundle: '3c8ee4b5d8100766',
  presentation: 'rendered',
  rulesRevision: 1,
  cards,
  sources: {},
}
for (const lang of ['en', 'es']) {
  const all = await sourceSnapshot(lang)
  const source = codes.map((code) => all.find((c) => c.code === code))
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
          windowCancel: 'Cancelar {damage} de daño y {horror} de horror',
          windowBase: 'Establecer {skill} en {n}',
          windowAllBase: 'Establecer las cuatro habilidades en 5',
        }
      : {
          windowCancel: 'Cancel {damage} damage and {horror} horror',
          windowBase: 'Set {skill} to {n}',
          windowAllBase: 'Set all four skills to 5',
        }
  Object.assign(
    labels,
    lang === 'es'
      ? {
          windowKnight: 'Aumentar el valor de habilidad',
          windowBonus: 'Recibir +{n} al valor de habilidad',
          windowDiscardBonus: 'Descartar esta carta para recibir +{n} al valor de habilidad',
          windowPut: 'Poner {card} en juego',
          windowShroud: 'Reducir el velo de tu Lugar en {n} durante este turno',
          windowDraw: '{name} roba {n} cartas',
          windowResources: '{name} recibe {n} recursos',
          windowHeal: 'Curar daño y horror de {name}',
          windowStudent: 'Curar 1 daño y 1 horror',
          windowLonnie: 'Curar 1 daño de {card} y 1 horror de Lonnie Ritter',
          windowCancelAttack: 'Cancelar este ataque',
          windowIdol: 'Agotar y descartar cartas para cancelar daño u horror',
        }
      : {
          windowKnight: 'Increase skill value',
          windowBonus: 'Get +{n} skill value',
          windowDiscardBonus: 'Discard this card to get +{n} skill value',
          windowPut: 'Put {card} into play',
          windowShroud: 'Reduce your location’s shroud by {n} this turn',
          windowDraw: '{name} draws {n} cards',
          windowResources: '{name} gains {n} resources',
          windowHeal: 'Heal damage and horror from {name}',
          windowStudent: 'Heal 1 damage and 1 horror',
          windowLonnie: 'Heal 1 damage from {card} and 1 horror from Lonnie Ritter',
          windowCancelAttack: 'Cancel this attack',
          windowIdol: 'Exhaust and discard cards to cancel damage or horror',
        },
  )
  for (const [key, value] of Object.entries(labels))
    if (!raw.includes(`"${key}":`))
      raw = raw.replace('  "choice": {', `  "choice": {\n    "${key}": ${JSON.stringify(value)},`)
  if (!raw.includes('"tarot":'))
    raw = raw.replace('  "slot": {', '  "slot": {\n    "tarot": "Tarot",')
  const loss = raw.indexOf('"loseAdditionalAction": {')
  if (loss >= 0 && !raw.slice(loss, raw.indexOf('\n    }', loss)).includes('"engage":')) {
    const at = raw.indexOf('\n', loss) + 1
    raw =
      raw.slice(0, at) +
      '      "engage": ' +
      JSON.stringify(
        lang === 'es'
          ? 'Perder una acción adicional para enfrentarse'
          : 'Lose an additional engage action',
      ) +
      ',\n' +
      raw.slice(at)
  }
  await writeFile(path, raw)
}
await writeFile(dir + 'approvals.json', JSON.stringify(approvals, null, 2) + '\n')
await writeFile(
  'packages/cards/src/data/damage-turn.json',
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
    `// RR: Triggered Abilities, Damage/Horror, Lasting Effects, Skill Tests.\nimport {registerDamageTurn} from './register'\nregisterDamageTurn('${code}')\n`,
  )
await writeFile(
  dir + 'index.ts',
  `import {registerPlayerCards,type PlayerCardDef} from '@lcg/engine'\nimport data from '../data/damage-turn.json'\n${codes.map((c) => `import './card-${c}'`).join('\n')}\nregisterPlayerCards(data as PlayerCardDef[])\nexport const DAMAGE_TURN_RENDERED_CODES=data.map(c=>c.code)\n`,
)
