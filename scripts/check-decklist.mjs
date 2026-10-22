#!/usr/bin/env node
// Coverage report for an ArkhamDB deck or decklist: which codes are already
// playable, which are reprints of playable cards and which still need an
// implementation. Read-only: it never writes data or activates cards.
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { inspectRuntime } from './cards-import/runtime.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INVENTORY = 'packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json'
const RANDOM_WEAKNESS = '01000'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    file: { type: 'string' },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
})

if (values.help || (!values.file && !positionals[0])) {
  console.log(
    'Usage: node scripts/check-decklist.mjs <arkhamdb deck/decklist URL or id> [--json]\n' +
      '       node scripts/check-decklist.mjs --file saved-decklist.json [--json]',
  )
} else {
  await run()
}

/** Same URL rules as arkhamDbDeckId in packages/cards/src/decks.ts. */
function parseDeckInput(input) {
  const text = input.trim()
  const url = text.match(/arkhamdb\.com\/(decklist|deck)\/(?:view\/)?(\d+)/)
  if (url) return { kind: url[1], id: url[2] }
  return /^\d+$/.test(text) ? { kind: 'decklist', id: text } : null
}

async function fetchDeck(input) {
  const parsed = parseDeckInput(input)
  if (!parsed) throw new Error('Not an ArkhamDB deck link or id: ' + input)
  const kinds = parsed.kind === 'deck' ? ['deck', 'decklist'] : ['decklist', 'deck']
  for (const kind of kinds) {
    const response = await fetch(`https://arkhamdb.com/api/public/${kind}/${parsed.id}`, {
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) continue
    const data = await response.json().catch(() => null)
    if (data?.investigator_code) return { ...data, source: `${kind}/${parsed.id}` }
  }
  throw new Error('ArkhamDB returned no deck for ' + input)
}

async function run() {
  process.chdir(root)
  const deck = values.file
    ? JSON.parse(await readFile(resolve(values.file), 'utf8'))
    : await fetchDeck(positionals[0])
  const inventory = JSON.parse(await readFile(join(root, INVENTORY), 'utf8'))
  const duplicates = JSON.parse(
    await readFile(join(root, 'packages/cards/src/data/duplicates.json'), 'utf8'),
  )
  const runtime = new Map((await inspectRuntime()).map((c) => [c.code, c]))
  const record = (code) => inventory.cards.find((c) => c.code === code)
  const playable = (code) => !!runtime.get(code)?.behaviorRegistered

  const describe = (code, copies, role) => {
    const r = record(code)
    const entry = { code, copies, role, name: r?.name ?? runtime.get(code)?.name ?? '?' }
    if (code === RANDOM_WEAKNESS) return { ...entry, status: 'placeholder' }
    if (playable(code)) return { ...entry, status: 'playable' }
    // Decks keep their exact codes, so an equivalent edition only lowers the cost
    // of registering this code; it does not make the deck playable by itself.
    const equivalent = [duplicates[code], ...(r?.relations.duplicatedBy ?? [])].find(
      (c) => c && playable(c),
    )
    if (equivalent) return { ...entry, status: 'reprint-pending', of: equivalent }
    if (!r) return { ...entry, status: 'missing-from-inventory' }
    return {
      ...entry,
      status: runtime.has(code) ? 'defined-without-behavior' : 'pending',
      classification: r.classification,
      type: r.type,
      pack: r.pack,
      modelIssues: r.modelIssues,
      ...(r.relations.duplicatedBy.length ? { reprints: r.relations.duplicatedBy } : {}),
    }
  }

  const investigator = record(deck.investigator_code)
  const signatures = investigator?.deckbuilding?.signatureGroups ?? []
  const required = new Set(signatures.map((g) => g.primary))
  const rows = [
    describe(deck.investigator_code, 1, 'investigator'),
    ...Object.entries(deck.slots ?? {}).map(([code, n]) =>
      describe(code, n, required.has(code) ? 'signature' : 'deck'),
    ),
    ...Object.entries(deck.sideSlots ?? {}).map(([code, n]) => describe(code, n, 'side')),
  ]
  const missing = rows.filter((r) => !['playable', 'placeholder'].includes(r.status))
  const summary = {
    deck: deck.name,
    source: deck.source ?? values.file,
    investigator: `${deck.investigator_code} ${deck.investigator_name ?? investigator?.name ?? ''}`,
    tabooId: deck.taboo_id ?? null,
    signatures: signatures.map((g) => ({ primary: g.primary, alternatives: g.alternatives })),
    distinctCodes: rows.length,
    playable: rows.filter((r) => r.status === 'playable').length,
    reprintsOfPlayable: rows.filter((r) => r.status === 'reprint-pending').length,
    toImplement: missing.map((r) => r.code),
  }
  if (values.json) {
    console.log(JSON.stringify({ summary, rows }, null, 2))
    return
  }
  console.log(`${summary.deck} (${summary.source})`)
  console.log(`Investigator ${summary.investigator}; taboo ${summary.tabooId ?? 'none'}`)
  for (const r of rows) {
    const extra =
      r.status === 'reprint-pending'
        ? ` (same card as playable ${r.of})`
        : r.modelIssues
          ? ` [${r.classification}/${r.type}/${r.pack}${r.modelIssues.length ? ': ' + r.modelIssues.join(', ') : ''}]`
          : ''
    console.log(
      `${r.status.padEnd(26)} ${r.code} x${r.copies} ${r.role.padEnd(12)} ${r.name}${extra}`,
    )
  }
  console.log(
    `\n${summary.playable} playable; ${summary.toImplement.length} to register or implement ` +
      `(${summary.reprintsOfPlayable} reprints of playable cards): ` +
      (summary.toImplement.join(' ') || 'none'),
  )
}
