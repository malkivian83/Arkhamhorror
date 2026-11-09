// Reproduce the reviewed definitions of Marie Lambeau's Investigator Starter Deck (set mar).
// Only the codes approved in the lot are converted; the frozen inventory is never edited.
import { readFileSync, writeFileSync } from 'node:fs'
import { buildStarterDefinitions } from './cards-import/investigator-starters.mjs'
const read = (p) => JSON.parse(readFileSync(p, 'utf8'))
const inventory = read('packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json').cards
const base = 'packages/cards/src/marie-lambeau-2025'
writeFileSync(
  'packages/cards/src/data/marie-lambeau-2025.json',
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
