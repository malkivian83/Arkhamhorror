#!/usr/bin/env node
/**
 * Textos oficiales en español de La gala del ecuador del invierno, sacados del
 * reglamento del escenario (docs-proyecto/reglas/AHC80_Rulebook_ES.pdf) con
 * pdftotext. Se añaden a apps/web/public/local-assets/story/es.json.
 *
 * Uso: node scripts/import-gala-es.mjs [ruta-del-texto-extraido]
 *   (por defecto lo extrae con pdftotext, que debe estar en el PATH o en /ucrt64/bin).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pdf = fileURLToPath(new URL('../docs-proyecto/reglas/AHC80_Rulebook_ES.pdf', import.meta.url))
const target = fileURLToPath(
  new URL('../apps/web/public/local-assets/story/es.json', import.meta.url),
)

function extract() {
  if (process.argv[2]) return readFileSync(process.argv[2], 'utf8')
  const tools = ['pdftotext', 'C:/msys64/ucrt64/bin/pdftotext.exe', '/ucrt64/bin/pdftotext']
  for (const tool of tools) {
    try {
      return execFileSync(tool, ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8' })
    } catch {
      // Siguiente.
    }
  }
  throw new Error('No se encuentra pdftotext')
}

const raw = extract()
  // Retornos de carro y saltos de página de pdftotext.
  .split(String.fromCharCode(13))
  .join('')
  .split(String.fromCharCode(12))
  .join('\n')
  .split('\n')
  // Fuera números de página y cabeceras.
  .filter((l) => !/^\s*\d+\s*$/.test(l) && !/^FAQ|^Illus\.|^© 20/.test(l))
  .join('\n')

/** Texto entre dos marcas (la primera incluida si `keepStart`). */
function between(start, end, keepStart = true) {
  const a = raw.indexOf(start)
  if (a < 0) throw new Error(`No encuentro: ${start}`)
  const b = end ? raw.indexOf(end, a + start.length) : raw.length
  if (b < 0) throw new Error(`No encuentro: ${end}`)
  return raw.slice(keepStart ? a : a + start.length, b)
}

/** Párrafos limpios con las marcas de story.ts ("• " para los puntos de instrucciones). */
function clean(text) {
  return text
    .replace(/\r/g, '')
    .replace(/\s*[Æ=]\s+/g, '\n\n• ')
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .replace(/\s+/g, ' ')
        // Palabras partidas a final de línea ("experien- cia").
        .replace(/(\p{Ll})- (\p{Ll})/gu, '$1$2')
        .trim(),
    )
    .filter((p) => p && p !== '•')
    .join('\n\n')
}

const texts = {
  'story.midwinterGala.intro1': clean(between('Introducción 1:', 'Los invitados lo siguen')),
  'story.midwinterGala.intro2': clean(between('Los invitados lo siguen', '¿Quién es tu contacto')),
  'story.midwinterGala.contact': clean(
    between('¿Quién es tu contacto misterioso?', 'La Fundación:'),
  ),
  'story.midwinterGala.faction.foundation': clean(
    between('La Fundación:', 'Universidad Miskatonic:', false),
  ),
  'story.midwinterGala.faction.miskatonic': clean(
    between('Universidad Miskatonic:', 'El Sindicato:', false),
  ),
  'story.midwinterGala.faction.syndicate': clean(
    between('El Sindicato:', 'La Logia del Crepúsculo de Plata:', false),
  ),
  'story.midwinterGala.faction.lodge': clean(
    between('La Logia del Crepúsculo de Plata:', 'Lugareños de Kingsport:', false),
  ),
  'story.midwinterGala.faction.kingsport': clean(
    between('Lugareños de Kingsport:', '\nPreparación\n', false),
  ),
  'story.midwinterGala.setup': clean(between('\nPreparación\n', 'Colocación de Lugares', false)),
  'story.midwinterGala.noResolution': clean(
    between('Si no se ha llegado a ninguna resolución', 'Resolución 1:'),
  ),
  'story.midwinterGala.resolution1': clean(between('Resolución 1:', 'Resolución 2:')),
  'story.midwinterGala.resolution2': clean(between('Resolución 2:', 'Resolución 3:')),
  'story.midwinterGala.resolution3': clean(between('Resolución 3:', 'Resolución 4:')),
  'story.midwinterGala.resolution4': clean(between('Resolución 4:', 'Resolución 5:')),
  'story.midwinterGala.resolution5': clean(between('Resolución 5:', 'Resolución 6:')),
  'story.midwinterGala.resolution6': clean(between('Resolución 6:', 'Resolución 7:')),
  'story.midwinterGala.resolution7': clean(between('Resolución 7:', 'Variante opcional')),
}

// Interludio: la parte común y la de cada facción.
const interlude = between('Tu contacto tiene más instrucciones', 'NO LEAS ESTO')
const common = clean(interlude.slice(0, interlude.indexOf('= La Fundación')))
const parts = {
  foundation: ['La Fundación', 'Universidad Miskatonic'],
  miskatonic: ['Universidad Miskatonic', 'El Sindicato'],
  syndicate: ['El Sindicato', 'La Logia del Crepúsculo'],
  lodge: ['La Logia del Crepúsculo', 'Lugareños de Kingsport'],
  kingsport: ['Lugareños de Kingsport', null],
}
for (const [faction, [start, end]] of Object.entries(parts)) {
  const a = interlude.indexOf(`= ${start}`)
  const b = end ? interlude.indexOf(`= ${end}`) : interlude.length
  texts[`story.midwinterGala.interlude.${faction}`] = `${common}\n\n${clean(interlude.slice(a, b))}`
}

const current = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : {}
writeFileSync(target, JSON.stringify({ ...current, ...texts }, null, 2) + '\n')
console.log(`${Object.keys(texts).length} textos de La gala en ${target}`)
