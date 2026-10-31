// Prepare a review queue and official snapshots; this never registers playable cards.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { format } from 'prettier'
const codes = [
  '03024',
  '05025',
  '05110',
  '05117',
  '05190',
  '05191',
  '05119',
  '05194',
  '05195',
  '05233',
  '06162',
  '06244',
  '07111',
  '07304',
  '08036',
  '08047',
  '10129',
  '06205',
  '06326',
  '06203',
  '10043',
  '10067',
  '10084',
  '10111',
  '06239',
  '04159',
  '02309',
  '05324',
  '01056',
  '04158',
]
const dir = 'packages/cards/src/resource-reactions/'
await mkdir(dir, { recursive: true })
const { cards } = JSON.parse(
  await readFile('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json', 'utf8'),
)
const review = {
  status: 'pending-review',
  sourceBundle: '3c8ee4b5d8100766',
  sources: {},
  cards: [],
}
for (const code of codes) {
  const card = cards.find((c) => c.code === code)
  if (card?.classification !== 'standard-candidate') throw new Error('Not standard: ' + code)
  review.cards.push({ code, name: card.name, status: 'pending', modelIssues: card.modelIssues })
}
for (const lang of ['en', 'es']) {
  let all
  try {
    all = JSON.parse(await readFile(dir + `source-${lang}.json`, 'utf8'))
  } catch {
    all = JSON.parse(await readFile(`.card-import-tmp/standard-review/${lang}.json`, 'utf8'))
  }
  const selected = codes.map((code) => {
    const c = all.find((c) => c.code === code)
    if (!c) throw new Error('Missing official source: ' + lang + '/' + code)
    return c
  })
  const body = await format(JSON.stringify(selected), { parser: 'json' })
  review.sources[lang] = createHash('sha256').update(body).digest('hex')
  await writeFile(dir + `source-${lang}.json`, body)
}
await writeFile(dir + 'review.json', await format(JSON.stringify(review), { parser: 'json' }))
