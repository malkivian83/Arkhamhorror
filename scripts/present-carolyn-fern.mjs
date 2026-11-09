// Reproduce official EN/ES fallback text and labels for the new Carolyn Fern pack codes.
// Keep historical entry order so adding a pack does not reorder the existing catalogue.
import { readFileSync, writeFileSync } from 'node:fs'

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

const CODES = ['60251', '60252', '60253', '60254', '60257', '60272', '60279']
for (const language of ['en', 'es']) {
  const path = `packages/i18n/src/${language}.json`
  const cards = JSON.parse(
    readFileSync(`packages/cards/src/carolyn-fern/source-${language}.json`, 'utf8'),
  ).filter((card) => CODES.includes(card.code))
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

const labels = {
  en: {
    prompt: { spendUsesFrom: 'Choose the card the use is spent from' },
    ability: {
      carolynClue: 'Carolyn Fern: discover 1 clue at your location',
      experimentalPsychologyTest: 'Experimental Psychology: test Intellect (2) to heal 1 horror',
      experimentalPsychologyBonus:
        'Experimental Psychology: {name} gets +2 skill value for their next skill test this round',
      unbrokenWeb: 'Unbroken Web: place {n} horror on it instead of discovering the clues',
      privatePractice: 'Private Practice: gain 1 resource',
      wordsOfBast:
        'Words of Bast: take 1 horror and spend {n} secret(s) to reveal {count} encounter cards',
    },
    choice: {
      pharaohsDiscard: 'Discard {card}',
      spendUsesFrom: 'Spend from {card}',
    },
  },
  es: {
    prompt: { spendUsesFrom: 'Elige de qué carta se gasta el uso' },
    ability: {
      carolynClue: 'Carolyn Fern: descubrir 1 pista en tu Lugar',
      experimentalPsychologyTest:
        'Psicología experimental: prueba de Intelecto (2) para curar 1 punto de horror',
      experimentalPsychologyBonus:
        'Psicología experimental: {name} recibe +2 a su valor de habilidad para su siguiente prueba de habilidad en esta ronda',
      unbrokenWeb:
        'Telaraña intacta: en vez de descubrir las pistas, colocar {n} de horror sobre ella',
      privatePractice: 'Consulta privada: obtener 1 recurso',
      wordsOfBast:
        'Palabras de Bast: recibir 1 de horror y gastar {n} secreto(s) para revelar {count} cartas de Encuentros',
    },
    choice: {
      pharaohsDiscard: 'Descartar {card}',
      spendUsesFrom: 'Gastar de {card}',
    },
  },
}
for (const language of ['en', 'es']) {
  const path = `packages/i18n/src/${language}.json`
  let text = readFileSync(path, 'utf8')
  for (const [section, entries] of Object.entries(labels[language])) {
    const open = `  "${section}": {\n`
    const start = text.indexOf(open)
    const end = text.indexOf('\n  },', start)
    if (start < 0 || end < 0) throw new Error('Missing labels: ' + section)
    let body = text.slice(start + open.length, end)
    const additions = []
    for (const [key, value] of Object.entries(entries)) {
      const entry = `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`
      const existing = new RegExp(`^    "${key}": .*?(,)?$`, 'm')
      if (existing.test(body))
        body = body.replace(existing, (_match, comma) => entry + (comma ?? ''))
      else additions.push(entry)
    }
    text =
      text.slice(0, start) +
      open +
      (additions.length ? additions.join(',\n') + ',\n' : '') +
      body +
      text.slice(end)
  }
  writeFileSync(path, text)
}
