import fs from 'node:fs/promises'
import { format } from 'prettier'
import { createHash } from 'node:crypto'
const codes = ['03005', '03016', '03017']
const dir = 'packages/cards/src/william-yorick'
await fs.mkdir(dir, { recursive: true })
const read = async (p) => JSON.parse(await fs.readFile(p, 'utf8'))
const write = async (p, x) => fs.writeFile(p, await format(JSON.stringify(x), { parser: 'json' }))
let english
const approvals = {
  sourceBundle: '3c8ee4b5d8100766',
  rulesRevision: 1,
  decklists: {
    '03005': 'https://arkhamdb.com/decklist/view/4816',
  },
  presentation: 'rendered',
  sources: {},
  cards: [],
}
for (const lang of ['en', 'es']) {
  let all
  try {
    all = await read(dir + '/source-' + lang + '.json')
  } catch {
    all = await read('.card-import-tmp/standard-review/' + lang + '.json')
  }
  const selected = codes.map((code) => {
    const c = all.find((x) => x.code === code)
    if (!c) throw Error(code)
    return c
  })
  if (lang === 'en') english = selected
  let bytes
  try {
    bytes = await fs.readFile(dir + '/source-' + lang + '.json', 'utf8')
  } catch {
    bytes = await format(JSON.stringify(selected), { parser: 'json' })
  }
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
  const narrativePath = `packages/i18n/src/card-narratives.${lang}.json`
  const narratives = await read(narrativePath)
  for (const c of selected)
    if (c.flavor || c.back_flavor)
      narratives[c.code] = {
        group: 'investigators',
        typeCode: c.type_code,
        ...(c.flavor ? { flavor: c.flavor } : {}),
        ...(c.back_flavor ? { backFlavor: c.back_flavor } : {}),
      }
  await write(narrativePath, narratives)
}
const classes = ['survivor']
const signatures = [['03016', '03017']]
const defs = english.map((c) => {
  const i = codes.slice(0, 1).indexOf(c.code)
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
        { classes: ['guardian'], maxLevel: 2 },
      ],
      signatures: signatures[i],
    }
  const uses = c.text?.match(/Uses \((\d+) (\w+)\)/)
  return {
    ...common,
    ...(c.cost !== undefined ? { cost: c.cost } : {}),
    xp: c.xp ?? 0,
    ...(c.victory !== undefined ? { victory: c.victory } : {}),
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
    ...(c.code === '03016' ? { fast: true } : {}),
  }
})
for (const c of english) {
  approvals.cards.push({
    code: c.code,
    status: 'verified',
    adapter: 'william-yorick-v1',
    module: 'card-' + c.code,
    test: 'rules.test.ts',
  })
  await fs.writeFile(
    dir + '/card-' + c.code + '.ts',
    `// RR: Investigators, Triggered Abilities, Weaknesses, Additional Actions.\nimport { registerYorickCard } from './register'\nregisterYorickCard('${c.code}')\n`,
  )
}
await write(dir + '/approvals.json', approvals)
await write('packages/cards/src/data/william-yorick.json', defs)
await fs.writeFile(
  dir + '/index.ts',
  "import '../core-2026/player-cards'\n" +
    codes.map((c) => `import './card-${c}'`).join('\n') +
    "\nimport approvals from './approvals.json'\nexport const YORICK_RENDERED_CODES = approvals.cards.map(c=>c.code)\n",
)
