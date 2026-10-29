// Reproduce official EN/ES fallback text for the Nathaniel Cho and Harvey Walters packs.
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
  const cards = ['nathaniel-cho', 'harvey-walters'].flatMap((pack) =>
    JSON.parse(readFileSync(`packages/cards/src/${pack}/source-${language}.json`, 'utf8')),
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
      nathanielDamage: 'Deal 1 additional damage',
      randallCho: 'Randall Cho: heal or search for a Weapon',
      boxingGloves: 'Boxing Gloves: search for a Spirit event',
      fleshWardDamage: 'Flesh Ward: cancel 1 damage',
      fleshWardHorror: 'Flesh Ward: cancel 1 horror',
      greteWagner: 'Grete Wagner: discover 1 clue',
      relentlessStore: 'Relentless: place {n} excess damage on this card',
      relentlessCash: 'Relentless: gain {n} resources',
      safeguard: 'Safeguard: follow the investigator',
      physicalTrainingUse: 'Physical Training: spend 1 resource from this card for +1 {skill}',
      harveyDraw: 'Harvey Walters: draw 1 additional card',
      vaultKnowledge: 'Choose an investigator here to draw 1 card',
      discItzamna: 'Discard Disc of Itzamna to evade or deal damage',
      forbiddenTome: 'Draw 1 card with Forbidden Tome',
      whittonSearch: 'Search for a Tome or Relic asset',
      libraryDocent: 'Return a Tome to play a different Tome',
      farsight: 'Play {card} with Farsight',
      forbiddenTomeDamage: '{card}: move 1 damage from {from} to {enemy}',
      forbiddenTomeClue: '{card}: you may move, then discover 1 clue',
      necronomiconSkill: 'Spend 1 secret: +2 skill value',
      necronomiconDraw: 'Spend 2 secrets: draw 2 cards',
      necronomiconClue: 'Spend 3 secrets: discover 1 clue at {location}',
      necronomiconDamage: 'Spend 4 secrets: deal 3 damage to {enemy}',
    },
    choice: {
      randallHeal: 'Heal 3 damage',
      randallSearch: 'Search your deck and discard pile for a Weapon',
      nathanielFightAgain: 'Fight again',
      nathanielAsset: '{card}',
      harveyDamageEnemy: 'Deal {n} damage to {enemy}',
      harveyTranslate: 'Discard Forbidden Tome and record that it is translated',
      harveyFinish: 'Finish selecting and replace the selected cards',
      harveyShuffle: 'Shuffle {card} into your deck',
      harveyDiscardInvocation: 'Discard {card} as an additional cost',
    },
  },
  es: {
    ability: {
      nathanielDamage: 'Infligir 1 punto de daño adicional',
      randallCho: 'Randall Cho: curarte o buscar un Arma',
      boxingGloves: 'Guantes de boxeo: buscar un Evento Espíritu',
      fleshWardDamage: 'Protección corporal: cancelar 1 punto de daño',
      fleshWardHorror: 'Protección corporal: cancelar 1 punto de horror',
      greteWagner: 'Grete Wagner: descubrir 1 pista',
      relentlessStore: 'Implacable: colocar {n} puntos de daño sobrante sobre esta carta',
      relentlessCash: 'Implacable: obtener {n} recursos',
      safeguard: 'Salvaguardia: seguir al investigador',
      physicalTrainingUse:
        'Entrenamiento físico: gastar 1 recurso de esta carta para recibir +1 {skill}',
      harveyDraw: 'Harvey Walters: robar 1 carta adicional',
      vaultKnowledge: 'Elige un investigador de tu Lugar para que robe 1 carta',
      discItzamna: 'Descartar el Disco de Itzamna para evitar o infligir daño',
      forbiddenTome: 'Robar 1 carta con el Tomo prohibido',
      whittonSearch: 'Buscar un Apoyo Tomo o Reliquia',
      libraryDocent: 'Devolver un Tomo para jugar otro Tomo distinto',
      farsight: 'Jugar {card} con Visión de futuro',
      forbiddenTomeDamage: '{card}: mover 1 punto de daño de {from} a {enemy}',
      forbiddenTomeClue: '{card}: puedes moverte; después, descubre 1 pista',
      necronomiconSkill: 'Gastar 1 secreto: +2 al valor de habilidad',
      necronomiconDraw: 'Gastar 2 secretos: robar 2 cartas',
      necronomiconClue: 'Gastar 3 secretos: descubrir 1 pista en {location}',
      necronomiconDamage: 'Gastar 4 secretos: infligir 3 puntos de daño a {enemy}',
    },
    choice: {
      randallHeal: 'Curarte 3 puntos de daño',
      randallSearch: 'Buscar un Arma en tu mazo y tu pila de descartes',
      nathanielFightAgain: 'Volver a combatir',
      nathanielAsset: '{card}',
      harveyDamageEnemy: 'Infligir {n} puntos de daño a {enemy}',
      harveyTranslate: 'Descartar el Tomo prohibido y anotar que está traducido',
      harveyFinish: 'Terminar la selección y sustituir las cartas seleccionadas',
      harveyShuffle: 'Barajar {card} en tu mazo',
      harveyDiscardInvocation: 'Descartar {card} como coste adicional',
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
