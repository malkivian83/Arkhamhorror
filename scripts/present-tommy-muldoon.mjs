// Reproduce official EN/ES fallback text for the Tommy Muldoon pack and its new labels.
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

for (const language of ['en', 'es']) {
  const path = `packages/i18n/src/${language}.json`
  const cards = JSON.parse(
    readFileSync(`packages/cards/src/tommy-muldoon/source-${language}.json`, 'utf8'),
  )
  let text = readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
  if (!text.slice(text.indexOf('  "offlineCard": {')).includes('    "subnames": {')) {
    const subnames = cards
      .filter((card) => card.subname)
      .map((card) => `      ${JSON.stringify(card.code)}: ${JSON.stringify(card.subname)}`)
      .join(',\n')
    text = text.replace(
      '  "offlineCard": {\n',
      `  "offlineCard": {\n    "subnames": {\n${subnames}\n    },\n`,
    )
  }
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
    ability: {
      tommyResource: 'Tommy Muldoon: spend 1 resource to play a Firearm with 2 additional ammo',
      tommyDiscard: 'Tommy Muldoon: discard {card} to play a Firearm with 2 additional ammo',
      beckyIgnore: 'Fight {enemy} with {card}, exhausting it to ignore aloof and retaliate',
    },
    choice: {
      tommyAmmo: 'Place 1 ammo on {card}',
      looseCannonDiscard: 'Discard each Firearm asset you control',
      looseCannonLose: 'Lose 5 resources',
      thompsonFight: 'Spend 1 ammo: fight {enemy} again (+1 damage)',
    },
  },
  es: {
    ability: {
      tommyResource:
        'Tommy Muldoon: gastar 1 recurso para jugar un Arma de fuego con 2 municiones adicionales',
      tommyDiscard:
        'Tommy Muldoon: descartar {card} para jugar un Arma de fuego con 2 municiones adicionales',
      beckyIgnore: 'Combatir a {enemy} con {card} y agotarla para ignorar Indiferente y Represalia',
    },
    choice: {
      tommyAmmo: 'Colocar 1 munición en {card}',
      looseCannonDiscard: 'Descartar todos los Apoyos Arma de fuego que controlas',
      looseCannonLose: 'Perder 5 recursos',
      thompsonFight: 'Gastar 1 munición: volver a combatir a {enemy} (+1 de daño)',
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
