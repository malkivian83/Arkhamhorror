// Reproduce official EN/ES fallback text for the Miguel de la Cruz pack codes enabled by the
// miguel-de-la-cruz lot, plus its new interface labels. Idempotent; keeps existing entry order.
import { readFileSync, writeFileSync } from 'node:fs'

const approvals = JSON.parse(
  readFileSync('packages/cards/src/miguel-de-la-cruz/approvals.json', 'utf8'),
)
const enabled = new Set(approvals.cards.map((card) => card.code))

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
    readFileSync(`packages/cards/src/miguel-de-la-cruz/source-${language}.json`, 'utf8'),
  ).filter((card) => enabled.has(card.code))
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
    ability: {
      miguelsKnapsack: "Miguel's Knapsack: play {card} at a connecting location or draw 1 card",
      decoyTrap: '{card}: evade {enemy}',
      glassing: '{card}: investigate {location}',
      lieInWait: '{card}: fight {enemy}',
      lieInWaitDamage: 'Discard {card}: this attack deals +1 damage',
      ropeTrap: '{card}: deal 1 damage to {enemy}',
      makeshiftBomb: 'Discard {card}: deal 3 damage to each enemy and investigator at {location}',
      hiddenShelter: '{card}: each investigator at {location} may choose a benefit',
    },
    choice: {
      knapsackPlayAt: 'Play {card} as if you were at {location}',
      knapsackDraw: 'Draw 1 card',
      decoyTrapMove: 'Discard {card} to move to {location}',
      glassingClue: 'Discard {card} to discover 1 additional clue at {location}',
      shelterDraw: 'Draw 1 card',
      shelterResource: 'Gain 1 resource',
      shelterDamage: 'Heal 1 damage',
      shelterHorror: 'Heal 1 horror',
    },
    prompt: {
      hiddenShelter: 'Hidden Shelter: {name} may choose one option',
    },
    log: {
      attachFailed: '{card} cannot be attached there and stays in the discard pile',
      enemyImmunePlayerCards: '{enemy} is immune to player card effects',
    },
  },
  es: {
    ability: {
      miguelsKnapsack: 'Morral de Miguel: jugar {card} en un Lugar conectado o robar 1 carta',
      decoyTrap: '{card}: evitar a {enemy}',
      glassing: '{card}: investigar {location}',
      lieInWait: '{card}: combatir contra {enemy}',
      lieInWaitDamage: 'Descartar {card}: este ataque inflige +1 de daño',
      ropeTrap: '{card}: infligir 1 punto de daño a {enemy}',
      makeshiftBomb:
        'Descartar {card}: infligir 3 puntos de daño a cada Enemigo e investigador en {location}',
      hiddenShelter: '{card}: cada investigador en {location} puede elegir un beneficio',
    },
    choice: {
      knapsackPlayAt: 'Jugar {card} como si estuvieras en {location}',
      knapsackDraw: 'Robar 1 carta',
      decoyTrapMove: 'Descartar {card} para moverte a {location}',
      glassingClue: 'Descartar {card} para descubrir 1 pista adicional en {location}',
      shelterDraw: 'Robar 1 carta',
      shelterResource: 'Obtener 1 recurso',
      shelterDamage: 'Curarse 1 punto de daño',
      shelterHorror: 'Curarse 1 punto de horror',
    },
    prompt: {
      hiddenShelter: 'Refugio oculto: {name} puede elegir una opción',
    },
    log: {
      attachFailed: 'No se puede vincular {card} allí y permanece en la pila de descartes',
      enemyImmunePlayerCards: '{enemy} es inmune a los efectos de cartas de Jugador',
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
