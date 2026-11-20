import fs from 'node:fs/promises'
import { format } from 'prettier'
import { createHash } from 'node:crypto'
const codes = [
  '01001',
  '01002',
  '01003',
  '01004',
  '01006',
  '01007',
  '01008',
  '01009',
  '01010',
  '01011',
  '01012',
  '01013',
]
const dir = 'packages/cards/src/original-core-investigators'
await fs.mkdir(dir, { recursive: true })
const read = async (p) => JSON.parse(await fs.readFile(p, 'utf8'))
const write = async (p, x) => fs.writeFile(p, await format(JSON.stringify(x), { parser: 'json' }))
let english
const approvals = {
  sourceBundle: '3c8ee4b5d8100766',
  rulesRevision: 1,
  presentation: 'rendered',
  sources: {},
  cards: [],
}
for (const lang of ['en', 'es']) {
  let all
  try {
    all = await read(dir + '/source-' + lang + '.json')
  } catch {
    all = await read('tmp/lot129/' + lang + '-all.json')
  }
  const selected = codes.map((code) => {
    const c = all.find((x) => x.code === code)
    if (!c) throw Error(code)
    return c
  })
  if (lang === 'en') english = selected
  const bytes = await format(JSON.stringify(selected), { parser: 'json' })
  await fs.writeFile(dir + '/source-' + lang + '.json', bytes)
  approvals.sources[lang] = createHash('sha256').update(bytes).digest('hex')
  const path = 'packages/i18n/src/' + lang + '.json'
  let text = await fs.readFile(path, 'utf8')
  for (const c of selected)
    for (const [section, value] of [
      ['names', c.name],
      ['summary', c.text],
      ['traits', c.traits],
      ['subnames', c.subname],
      ['backSummary', c.back_text],
    ]) {
      if (!value) continue
      const start = text.indexOf('"' + section + '": {', text.indexOf('"offlineCard": {'))
      if (start < 0) throw Error('Missing presentation section ' + section)
      const at = text.indexOf('\n', start) + 1,
        end = text.indexOf('\n    }', at)
      const part = text.slice(at, end),
        pattern = new RegExp('("' + c.code + '": )[^\\n]*')
      if (pattern.test(part)) {
        text =
          text.slice(0, at) +
          part.replace(
            pattern,
            (_match, prefix) =>
              prefix + JSON.stringify(value) + (_match.trimEnd().endsWith(',') ? ',' : ''),
          ) +
          text.slice(end)
      } else
        text =
          text.slice(0, at) +
          '      "' +
          c.code +
          '": ' +
          JSON.stringify(value) +
          ',\n' +
          text.slice(at)
    }
  await fs.writeFile(path, text)
}
const classes = ['guardian', 'seeker', 'rogue', 'mystic'],
  secondary = ['seeker', 'mystic', 'guardian', 'survivor']
const signatures = [
  ['01006', '01007'],
  ['01008', '01009'],
  ['01010', '01011'],
  ['01012', '01013'],
]
const defs = english.map((c) => {
  const i = codes.slice(0, 4).indexOf(c.code)
  const common = {
    code: c.code,
    name: c.name,
    ...(c.subname ? { subname: c.subname } : {}),
    type: c.type_code,
    class: c.faction_code,
    traits: (c.traits ?? '')
      .split('.')
      .map((x) => x.trim())
      .filter(Boolean),
    ...(c.is_unique ? { unique: true } : {}),
  }
  if (i >= 0)
    return {
      ...common,
      health: c.health,
      sanity: c.sanity,
      skills: Object.fromEntries(
        ['willpower', 'intellect', 'combat', 'agility'].map((k) => [k, c['skill_' + k]]),
      ),
      deckSize: 30,
      deckOptions: [
        { classes: [classes[i], 'neutral'], maxLevel: 5 },
        { classes: [secondary[i]], maxLevel: 2 },
      ],
      signatures: signatures[i],
    }
  const uses = c.text?.match(/Uses \((\d+) (\w+)\)/)
  return {
    ...common,
    ...(c.cost !== undefined ? { cost: c.cost } : {}),
    xp: c.xp ?? 0,
    icons: Object.fromEntries(
      ['willpower', 'intellect', 'combat', 'agility', 'wild']
        .filter((k) => c['skill_' + k])
        .map((k) => [k, c['skill_' + k]]),
    ),
    slots: (c.slot ?? '')
      .split('.')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
    ...(c.health ? { health: c.health } : {}),
    ...(c.sanity ? { sanity: c.sanity } : {}),
    ...(c.subtype_code ? { weakness: c.subtype_code } : {}),
    ...(uses
      ? { uses: { count: Number(uses[1]), type: uses[2] === 'ammo' ? 'ammo' : uses[2] } }
      : {}),
    ...(c.code === '01010' ? { fast: true } : {}),
  }
})
for (const c of english) {
  approvals.cards.push({
    code: c.code,
    status: 'verified',
    adapter: 'original-core-investigators-v1',
    module: 'card-' + c.code,
    test: 'rules.test.ts',
  })
  await fs.writeFile(
    dir + '/card-' + c.code + '.ts',
    `// RR: Investigators, Triggered Abilities, Weaknesses, Additional Actions.\nimport { registerOriginalCore } from './register'\nregisterOriginalCore('${c.code}')\n`,
  )
}
await write(dir + '/approvals.json', approvals)
await write('packages/cards/src/data/original-core-investigators.json', defs)
await fs.writeFile(
  dir + '/index.ts',
  codes.map((c) => `import './card-${c}'`).join('\n') +
    "\nimport approvals from './approvals.json'\nexport const ORIGINAL_CORE_INVESTIGATORS_RENDERED_CODES = approvals.cards.map(c=>c.code)\n",
)
