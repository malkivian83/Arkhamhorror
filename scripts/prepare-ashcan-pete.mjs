import { readFile, writeFile } from 'node:fs/promises'
import { approvedPeteDefinitions } from './cards-import/pete.mjs'
const inventory = JSON.parse(
  await readFile('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json', 'utf8'),
)
await writeFile(
  'packages/cards/src/data/ashcan-pete.json',
  JSON.stringify(approvedPeteDefinitions(inventory), null, 2) + '\n',
)
console.log('Original Pete and his two signatures generated from the immutable inventory')
