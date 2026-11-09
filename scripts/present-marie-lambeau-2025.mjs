// Reproduce official EN/ES fallback text for the new codes of Marie Lambeau's starter deck (mar).
// Only the codes approved in the lot are written; the rest of the pack is presented elsewhere.
import { readFileSync, writeFileSync } from 'node:fs'

const base = 'packages/cards/src/marie-lambeau-2025'
const approved = new Set(
  JSON.parse(readFileSync(base + '/approvals.json', 'utf8')).cards.map((c) => c.code),
)

function updateSection(text, section, updates) {
  const start = text.indexOf('  "offlineCard": {')
  if (start < 0) throw new Error('Missing offlineCard dictionary')
  const prefix = text.slice(0, start)
  const cards = text.slice(start)
  const pattern = new RegExp(`(    "${section}": \\{\\n)([\\s\\S]*?)(\\n    \\})`)
  if (!pattern.test(cards)) throw new Error('Missing section: ' + section)
  return (
    prefix +
    cards.replace(pattern, (_match, open, body, close) => {
      const entries = body.split('\n').map((line) => {
        const pair = line.match(/^ {6}"([^"]+)": (.*?)(?:,)?$/)
        if (!pair) throw new Error('Unsupported translation entry: ' + line)
        return [pair[1], JSON.parse(pair[2])]
      })
      const remaining = new Map(updates)
      for (const entry of entries) {
        if (remaining.has(entry[0])) entry[1] = remaining.get(entry[0])
        remaining.delete(entry[0])
      }
      entries.push(...remaining)
      return (
        open +
        entries
          .map(([key, value]) => `      ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
          .join(',\n') +
        close
      )
    })
  )
}

for (const language of ['en', 'es']) {
  const path = `packages/i18n/src/${language}.json`
  const cards = JSON.parse(readFileSync(`${base}/source-${language}.json`, 'utf8')).filter((c) =>
    approved.has(c.code),
  )
  let text = readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
  for (const [section, field] of [
    ['names', 'name'],
    ['subnames', 'subname'],
    ['summary', 'text'],
    ['traits', 'traits'],
    ['backSummary', 'back_text'],
  ])
    text = updateSection(
      text,
      section,
      cards.filter((c) => c[field]).map((c) => [c.code, c[field]]),
    )
  writeFileSync(path, text)
}
