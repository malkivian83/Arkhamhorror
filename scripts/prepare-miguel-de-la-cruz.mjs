// Reproduce packages/cards/src/data/miguel-de-la-cruz.json from the frozen inventory and the
// reviewed ArkhamDB snapshot of the Miguel de la Cruz pack (only the approved codes).
import { readFileSync, writeFileSync } from 'node:fs'
import { buildStarterDefinitions } from './cards-import/investigator-starters.mjs'
const read = (p) => JSON.parse(readFileSync(p, 'utf8'))
const inventory = read('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json').cards
const base = 'packages/cards/src/miguel-de-la-cruz'
writeFileSync(
  'packages/cards/src/data/miguel-de-la-cruz.json',
  JSON.stringify(
    buildStarterDefinitions(
      inventory,
      read(base + '/source-en.json'),
      read(base + '/approvals.json'),
    ),
    null,
    2,
  ) + '\n',
)
