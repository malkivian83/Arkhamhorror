import { readFile, writeFile } from 'node:fs/promises'
import { approvedDefinition } from './cards-import/approved.mjs'
const dir = 'packages/cards/src/rex-murphy/'
const inventory = JSON.parse(
  await readFile('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json', 'utf8'),
)
const source = JSON.parse(await readFile(dir + 'source-en.json', 'utf8'))
const defs = source.map((c) => {
  if (c.code === '01031')
    return approvedDefinition(
      inventory.cards.find((x) => x.code === c.code),
      { code: c.code, status: 'verified' },
    )
  const d = {
    code: c.code,
    name: c.name,
    type: c.type_code,
    class: c.faction_code,
    traits: c.traits
      .split('.')
      .map((t) => t.trim())
      .filter(Boolean),
    deckLimit: c.deck_limit,
  }
  if (c.type_code === 'investigator')
    Object.assign(d, {
      health: c.health,
      sanity: c.sanity,
      unique: true,
      skills: Object.fromEntries(
        ['willpower', 'intellect', 'combat', 'agility'].map((k) => [k, c['skill_' + k]]),
      ),
      deckSize: 30,
      deckOptions: [{ classes: ['seeker', 'neutral'], maxLevel: 5 }],
      offClassLevelZeroLimit: 5,
      excludedDeckTraits: ['Fortune'],
      signatures: ['02008', '02009'],
    })
  else if (c.type_code === 'event')
    Object.assign(d, {
      cost: c.cost,
      icons: Object.fromEntries(
        ['willpower', 'intellect', 'combat', 'agility', 'wild']
          .filter((k) => c['skill_' + k])
          .map((k) => [k, c['skill_' + k]]),
      ),
    })
  else d.weakness = 'weakness'
  return d
})
await writeFile('packages/cards/src/data/rex-murphy.json', JSON.stringify(defs, null, 2) + '\n')
for (const lang of ['en', 'es']) {
  const path = `packages/i18n/src/${lang}.json`
  let raw = await readFile(path, 'utf8')
  const set = (section, key, value) => {
    const offset = ['names', 'summary', 'traits', 'subnames', 'backSummary'].includes(section)
      ? raw.indexOf('"offlineCard": {')
      : 0
    const start = raw.indexOf(`"${section}": {`, offset)
    if (start < 0) throw new Error('Missing presentation section: ' + section)
    const end = raw.indexOf('\n    }', start)
    const line = new RegExp(`("${key}": )"(?:[^"\\\\]|\\\\.)*"`)
    const fragment = raw.slice(start, end)
    if (line.test(fragment))
      raw =
        raw.slice(0, start) +
        fragment.replace(line, (_m, prefix) => prefix + JSON.stringify(value)) +
        raw.slice(end)
    else {
      const at = raw.indexOf('\n', start) + 1
      raw = raw.slice(0, at) + `      "${key}": ${JSON.stringify(value)},\n` + raw.slice(at)
    }
  }
  for (const c of JSON.parse(await readFile(dir + `source-${lang}.json`, 'utf8'))) {
    set('names', c.code, c.name)
    set('summary', c.code, c.text)
    set('traits', c.code, c.traits)
    if (c.subname) set('subnames', c.code, c.subname)
    if (c.back_text) set('backSummary', c.code, c.back_text)
  }
  for (const [key, value] of Object.entries({
    rexClue: lang === 'es' ? 'Rex Murphy: descubre 1 pista' : 'Rex Murphy: discover 1 clue',
    oldBookLore: lang === 'es' ? 'Libro de conocimientos antiguos' : 'Old Book of Lore',
  }))
    set('ability', key, value)
  for (const [key, value] of Object.entries({
    rexFail:
      lang === 'es'
        ? 'Falla automáticamente y roba 3 cartas'
        : 'Automatically fail and draw 3 cards',
  }))
    set('choice', key, value)
  await writeFile(path, raw)
}
