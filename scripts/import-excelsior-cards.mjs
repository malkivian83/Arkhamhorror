#!/usr/bin/env node
/**
 * Catálogo local de las cartas de Asesinato en el hotel Excelsior (84001-84052):
 * nombre, rasgos y texto de cada cara en inglés y español, sacados de
 * public/cards_{en,es}.json del proyecto de referencia. La mesa lo usa sin conexión
 * (los datos de ArkhamDB, cuando llegan, lo completan).
 *
 * Uso: node scripts/import-excelsior-cards.mjs [ruta-del-proyecto-de-referencia]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const reference = process.argv[2] ?? 'E:/referencia/ArkhamHorror'
const target = (lang) =>
  fileURLToPath(new URL(`../packages/i18n/src/excelsior-cards.${lang}.json`, import.meta.url))

/** Erratas de la traducción de la fuente. */
const ERRATA = [
  ['deldirector', 'del director'],
  ['enjuego', 'en juego'],
  ['desgatado', 'desgastado'],
  ['volviera a se una', 'volviera a ser una'],
  ['robal la', 'roba la'],
  ['uan pista', 'una pista'],
  ['éxtio', 'éxito'],
  ['Solucuón', 'Solución'],
  ['antaques', 'ataques'],
  ['Balcon de la suite', 'Balcón de la suite'],
  ['Revelación</b> _', 'Revelación</b> -'],
  ['Maldito?', 'Maldito'],
]
const fix = (text) =>
  typeof text === 'string'
    ? ERRATA.reduce((t, [wrong, right]) => t.replaceAll(wrong, right), text)
    : text

for (const lang of ['en', 'es']) {
  const cards = JSON.parse(
    readFileSync(join(reference, `frontend/public/cards_${lang}.json`), 'utf8'),
  )
  const out = {}
  for (const card of cards.filter((c) => /^840\d\d$/.test(c.code))) {
    out[card.code] = Object.fromEntries(
      Object.entries({
        name: fix(card.name),
        subname: fix(card.subname),
        traits: fix(card.traits),
        text: fix(card.text),
        backName: fix(card.back_name),
        backText: fix(card.back_text),
      }).filter(([, v]) => typeof v === 'string' && v !== ''),
    )
  }
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(target(lang), JSON.stringify(sorted, null, 2) + '\n')
  console.log(`${Object.keys(sorted).length} cartas en ${target(lang)}`)
}
