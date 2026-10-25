#!/usr/bin/env node
/**
 * Catálogo local de las cartas de encuentro de El camino a Carcosa ya implementadas
 * (escenario I y sus conjuntos de encuentros, más Ratas y Miedo impactante de la caja
 * básica original): nombre, subtítulo, rasgos y texto de cada cara en inglés y
 * español, sacados de public/cards_{en,es}.json del proyecto de referencia. La mesa
 * lo usa sin conexión.
 *
 * Uso: node scripts/import-carcosa-cards.mjs [ruta-del-proyecto-de-referencia]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const reference = process.argv[2] ?? 'D:/referencia/ArkhamHorror-main'
const target = (lang) =>
  fileURLToPath(new URL(`../packages/i18n/src/carcosa-cards.${lang}.json`, import.meta.url))

const range = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, n) => String(from + n).padStart(5, '0'))
const CODES = new Set([
  // Se cierra el telón (03059 es una debilidad de jugador con su propio texto).
  ...range(3043, 3058).filter((code) => code !== '03047'),
  '03047a',
  '03047b',
  '03047c',
  '03060',
  // Delirios, Portentos malignos, Apariciones y Secta del Signo Amarillo.
  '03084a',
  '03084b',
  '03084c',
  '03084d',
  '03085',
  ...range(3090, 3094),
  ...range(3098, 3100),
  // Caja básica original: Ratas y Miedo impactante.
  '01159',
  '01163',
  '01164',
  '01165',
  // El Último Rey (03059 es una debilidad de jugador; las Realidades repulsivas tienen el
  // Enemigo Lunático en su reverso, 0306Xb, y los Transeúntes su Historia, 0307Xb).
  ...range(3061, 3075),
  ...['03065b', '03066b', '03067b', '03068b', '03069b'],
  '03076a',
  '03076b',
  ...range(3077, 3080).flatMap((code) => [code, `${code}b`]),
  ...range(3081, 3083),
  // El regalo de Hastur, Podredumbre e impurezas, El Extranjero y Antiguos males.
  ...range(3095, 3097),
  ...range(3101, 3105),
  '01166',
  // Ecos del pasado (con Sr. Peabody, Broche de ónice negro y El Manto Andrajoso) y los
  // conjuntos de la caja básica original que pide: Las máscaras de medianoche (solo sus
  // traiciones), Secta oscura y Puertas cerradas.
  ...range(3120, 3146),
  '01135',
  '01136',
  ...range(1169, 1171),
  '01174',
  // El juramento inconfesable (Daniel Chesterfield: apoyo 03182a y Enemigo 03182b),
  // Habitantes de Carcosa y Agentes de Hastur de la caja básica original.
  ...range(3159, 3181),
  '03182a',
  '03182b',
  ...range(3183, 3188),
  '03088',
  '03089',
  '01175',
  '01176',
  // El Fantasma de la Verdad (El organista: 03221 en la fuente, 03221a aquí) y Byakhee.
  ...range(3200, 3227),
  '03221b',
  '03086',
  '03087',
  // La Máscara Pálida (la Ciudad de los muertos 03241b es el reverso de la segunda
  // agenda) y los conjuntos de la caja básica original Necrófagos y Frío glacial.
  ...range(3240, 3262),
  '03241b',
  ...range(1160, 1162),
  '01167',
  '01168',
  // Surgen estrellas negras: dos versiones de los planes 2a y 2c (La inundación de abajo y
  // El vórtice de arriba).
  ...range(3274, 3303).filter((code) => code !== '03276' && code !== '03279'),
  '03276a',
  '03276b',
  '03279a',
  '03279b',
  // Penumbrosa Carcosa: cada Lugar lleva una Historia en el reverso (03325b, 03326a–d…), las
  // tres versiones del acto 2 y La máscara pálida (03321b).
  ...range(3316, 3320),
  ...['03321a', '03321b', '03322a', '03323a', '03324', '03325', '03325b'],
  ...['03326a', '03326b', '03326c', '03326d'],
  ...['a', 'b', 'c', 'd', 'e', 'f'].flatMap((side) => [`03327${side}`, `03328${side}`]),
  ...['03329a', '03329b', '03329c', '03329d', '03330', '03330b', '03331', '03331b'],
  ...range(3332, 3342),
])
/** Códigos de la fuente que el proyecto usa con otra letra de cara. */
const RENAMED = { '03221': '03221a', '03325': '03325a' }

/** Erratas de la traducción de la fuente, contrastadas con las cartas impresas. */
const ERRATA = [
  ['Si tienes éxito, inflígete 1 punto de daño', 'Si tienes éxito, inflígele 1 punto de daño'],
  ['Lugar de parición normal', 'Lugar de aparición normal'],
  ['<b>Revelación</b> Si tienes', '<b>Revelación</b> - Si tienes'],
  ['obtiene:"', 'obtiene: "'],
  ['Realidad repulsica', 'Realidad repulsiva'],
  ['en lugar de eso has avanzar', 'en lugar de eso haz avanzar'],
  // Museo histórico (03130, 03132): la carta impresa dice "modificado".
  ['no puede ser aumentado', 'no puede ser modificado'],
  ['cannot be increased', 'cannot be modified'],
  // Terror de la marea (03300): palabra clave sin traducir en la fuente.
  ['Capilla de san Auberto.\nHunter.', 'Capilla de san Auberto.\nCazador.'],
  ['no puede se derrotado', 'no puede ser derrotado'],
]
const fix = (text) =>
  typeof text === 'string'
    ? ERRATA.reduce((t, [wrong, right]) => t.replaceAll(wrong, right), text)
    : text

/**
 * La fuente inglesa usa los nombres de la reedición (Possessed, Seer of the Sign, Puppet of
 * Hastur); las cartas impresas, la guía y la fuente española usan los originales.
 */
const ORIGINAL_EN = {
  '03095': { name: 'Maniac' },
  '03096': { name: 'Young Psychopath' },
  '03184': { name: 'Mad Patient' },
}
const original = (lang, code, text) =>
  lang === 'en' && typeof text === 'string' ? text.replaceAll('Possessed', 'Lunatic') : text

for (const lang of ['en', 'es']) {
  const cards = JSON.parse(
    readFileSync(join(reference, `frontend/public/cards_${lang}.json`), 'utf8'),
  )
  const out = {}
  for (const card of cards.filter((c) => CODES.has(c.code))) {
    const entries = Object.entries({
      name: fix(card.name),
      subname: fix(card.subname),
      traits: fix(card.traits),
      text: fix(card.text),
      backName: fix(card.back_name),
      backText: fix(card.back_text),
      ...(lang === 'en' ? ORIGINAL_EN[card.code] : {}),
    }).map(([key, value]) => [key, original(lang, card.code, value)])
    out[RENAMED[card.code] ?? card.code] = Object.fromEntries(
      entries.filter(([, v]) => typeof v === 'string' && v !== ''),
    )
  }
  const missing = [...CODES].filter((code) => !out[RENAMED[code] ?? code])
  if (missing.length) throw new Error(`Faltan cartas en ${lang}: ${missing.join(', ')}`)
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(target(lang), JSON.stringify(sorted, null, 2) + '\n')
  console.log(`${Object.keys(sorted).length} cartas en ${target(lang)}`)
}
