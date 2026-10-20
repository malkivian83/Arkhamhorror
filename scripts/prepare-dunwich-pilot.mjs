import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import { approvedDefinition } from './cards-import/approved.mjs'
import { sha256 } from './cards-import/snapshots.mjs'

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url))
const approvals = JSON.parse(
  await readFile(path('../packages/cards/src/dunwich-pilot/approvals.json'), 'utf8'),
)
if (!/^[a-f0-9]{16}$/.test(approvals.sourceBundle)) throw new Error('Invalid source bundle')
const source = path(`../packages/cards/src/catalog/imports/${approvals.sourceBundle}/`)
const manifest = JSON.parse(await readFile(`${source}/manifest.json`, 'utf8'))
const body = await readFile(`${source}/catalog.json`, 'utf8')
if (sha256(body) !== manifest.files['catalog.json']) throw new Error('Catalog checksum mismatch')
const cards = new Map(JSON.parse(body).cards.map((card) => [card.code, card]))
if (new Set(approvals.cards.map((card) => card.code)).size !== approvals.cards.length)
  throw new Error('Duplicate approval')
const output = approvals.cards.map((approval) => {
  const card = cards.get(approval.code)
  if (!card) throw new Error(`Missing card: ${approval.code}`)
  return approvedDefinition(card, approval)
})
const outputPath = path('../packages/cards/src/data/dunwich-pilot.json')
await writeFile(
  outputPath,
  await format(JSON.stringify(output), {
    ...(await resolveConfig(outputPath)),
    filepath: outputPath,
  }),
)
console.log(`${output.length} reviewed card definitions generated`)
