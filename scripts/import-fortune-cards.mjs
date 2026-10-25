#!/usr/bin/env node
/**
 * Catálogo local de las cartas de Fortuna e insensatez (88001–88053): nombre, subtítulo,
 * rasgos, texto de cada cara e icono de juego (palo y valor), en inglés y español, sacados
 * de frontend/public/cards_{en,es}.json del proyecto de referencia. La mesa lo usa sin
 * conexión.
 *
 * Uso: node scripts/import-fortune-cards.mjs [ruta-del-proyecto-de-referencia]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const reference = process.argv[2] ?? 'D:/referencia/ArkhamHorror-main'
const target = (lang) =>
  fileURLToPath(new URL(`../packages/i18n/src/fortune-cards.${lang}.json`, import.meta.url))

/** Icono de juego al final del texto: palo (♥♦♠♣) y valor (4–10, J, Q, K o A). */
const ICON = /\n?([♥♦♠♣])(10|[2-9JQKA])\s*$/

for (const lang of ['en', 'es']) {
  const cards = JSON.parse(
    readFileSync(join(reference, `frontend/public/cards_${lang}.json`), 'utf8'),
  )
  const out = {}
  for (const card of cards.filter((c) => c.pack_code === 'fof')) {
    const match = typeof card.text === 'string' ? card.text.match(ICON) : null
    const text = match ? card.text.slice(0, match.index).trimEnd() : card.text
    const entries = Object.entries({
      name: card.name,
      subname: card.subname,
      traits: card.traits,
      text,
      backName: card.back_name,
      backText: card.back_text,
      gameIcon: match ? `${match[1]}${match[2]}` : undefined,
    })
    out[card.code] = Object.fromEntries(
      entries.filter(([, v]) => typeof v === 'string' && v !== ''),
    )
  }
  // La fuente no traduce la tercera copia de Atracción por la avaricia: mismo texto que las otras.
  if (lang === 'es' && out['88040c']?.name === 'Avarice Calls')
    out['88040c'] = { ...out['88040a'], gameIcon: out['88040c'].gameIcon }
  if (Object.keys(out).length < 89) throw new Error(`Faltan cartas en ${lang}`)
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(target(lang), JSON.stringify(sorted, null, 2) + '\n')
  console.log(`${Object.keys(sorted).length} cartas en ${target(lang)}`)
}
