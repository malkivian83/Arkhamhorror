import { readFileSync, writeFileSync } from 'node:fs'
import { approvedDefinition } from './cards-import/approved.mjs'
const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
const write = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
const root = 'packages/cards/src/'
const cards = read(root + 'catalog/imports/3c8ee4b5d8100766/catalog.json').cards
const approvals = read(root + 'stella-sideboard/approvals.json')
write(
  root + 'data/stella-sideboard.json',
  approvals.cards.map((a) => ({
    ...approvedDefinition(
      cards.find((c) => c.code === a.code),
      a,
    ),
    ...(a.code === '09119'
      ? {
          customizable: {
            railshooter: 2,
            telescanner: 2,
            translocator: 2,
            realitycollapser: 2,
            matterweaver: 2,
            aethericLink: 4,
            empoweredConfiguration: 4,
          },
        }
      : {}),
  })),
)
