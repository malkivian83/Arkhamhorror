import { readFile, writeFile } from 'node:fs/promises'
import { approvedJennyDefinitions } from './cards-import/jenny.mjs'
const approvals = JSON.parse(
  await readFile('packages/cards/src/jenny-barnes/approvals.json', 'utf8'),
)
const inventory = JSON.parse(
  await readFile(
    `packages/cards/src/catalog/imports/${approvals.sourceBundle}/catalog.json`,
    'utf8',
  ),
)
await writeFile(
  'packages/cards/src/data/jenny-barnes.json',
  JSON.stringify(approvedJennyDefinitions(inventory, approvals), null, 2) + '\n',
)
console.log('Jenny Barnes, her signatures and decklist 1179 cards generated from the inventory')
