// Reproduce the reviewed Carolyn Fern pack definitions that were not playable yet.
import { readFileSync, writeFileSync } from 'node:fs'
import { buildStarterDefinitions } from './cards-import/investigator-starters.mjs'
const read = (p) => JSON.parse(readFileSync(p, 'utf8'))
const inventory = read('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json').cards
const base = 'packages/cards/src/carolyn-fern'
writeFileSync(
  'packages/cards/src/data/carolyn-fern.json',
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
