import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { assertEquivalent } from './cards-import/equivalence.mjs'
const cacheFile = process.argv[2],
  batch = process.argv[3] ?? 'reprints-wave-1'
if (!cacheFile || !/^reprints-wave-[1-9][0-9]*$/.test(batch))
  throw new Error(
    'Usage: node scripts/verify-reprint-equivalence.mjs <en-snapshot.json> [reprints-wave-N]',
  )
const approvals = JSON.parse(
  await readFile(
    new URL('../packages/cards/src/' + batch + '/approvals.json', import.meta.url),
    'utf8',
  ),
)
const manifest = JSON.parse(
  await readFile(
    new URL(
      '../packages/cards/src/catalog/imports/' + approvals.sourceBundle + '/manifest.json',
      import.meta.url,
    ),
    'utf8',
  ),
)
const body = await readFile(cacheFile, 'utf8'),
  hash = createHash('sha256').update(body).digest('hex')
if (hash !== manifest.sources.en.sha256 || hash !== approvals.equivalence.sourceSnapshotSha256)
  throw new Error('Snapshot checksum mismatch')
const cards = new Map(JSON.parse(body).map((card) => [card.code, card]))
for (const approval of approvals.cards) {
  const source = cards.get(approval.behaviorSource),
    target = cards.get(approval.code)
  if (!source || !target) throw new Error('Missing source or reprint: ' + approval.code)
  if (assertEquivalent(source, target) !== approval.equivalenceSha256)
    throw new Error('Equivalence checksum mismatch: ' + approval.code)
}
console.log(approvals.cards.length + ' reprints verified against their original snapshot')
