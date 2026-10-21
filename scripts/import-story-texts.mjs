#!/usr/bin/env node
/**
 * Genera los textos oficiales de historia (prólogo, introducciones, preparación,
 * códex y resoluciones) a partir de la copia local del proyecto de referencia, en
 * apps/web/public/local-assets/story/en.json.
 *
 * Son textos de las guías de campaña de Fantasy Flight Games. El repositorio es
 * privado y de uso personal, así que van incluidos; el script sirve para
 * regenerarlos. Sin ellos, la mesa muestra los resúmenes de los ficheros de idioma.
 *
 * Formato de salida (lo entiende apps/web/src/game/story.ts): párrafos separados
 * por una línea en blanco; "» " al principio marca una instrucción de juego y
 * "• " un punto de una lista; *negrita* y _cursiva_.
 *
 * Uso: node scripts/import-story-texts.mjs [ruta-del-proyecto-de-referencia]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const reference = process.argv[2] ?? 'E:/referencia/ArkhamHorror'
const locales = join(reference, 'frontend/src/locales/en')
const target = fileURLToPath(new URL('../apps/web/public/local-assets/story/', import.meta.url))

if (!existsSync(locales)) {
  console.error(`No se encuentra ${locales}`)
  process.exit(1)
}

/**
 * Los ficheros de la referencia son objetos de JavaScript casi JSON (algunos con
 * comillas simples o claves sin comillas): se evalúan como literal.
 */
const load = (file) => {
  const text = readFileSync(join(locales, file), 'utf8')
  return Function(`"use strict"; return (${text})`)()
}
const common = load('base.json')
const brethren = {
  base: load('brethrenOfAsh/base.json'),
  spreadingFlames: load('brethrenOfAsh/scenarios/spreadingFlames.json'),
  smokeAndMirrors: load('brethrenOfAsh/scenarios/smokeAndMirrors.json'),
  queenOfAsh: load('brethrenOfAsh/scenarios/queenOfAsh.json'),
}

const get = (root, path) => path.split('.').reduce((o, k) => o?.[k], root)

/** Sustituye los enlaces "@:brethrenOfAsh.escenario.ruta" por su texto. */
function links(text) {
  return text.replace(/@:brethrenOfAsh\.([\w.]+)/g, (_, path) => {
    const [scenario, ...rest] = path.split('.')
    return links(get(brethren[scenario], rest.join('.')) ?? '')
  })
}

/** Iconos de la referencia → marca [icono] que la mesa dibuja con el símbolo oficial. */
const TOKENS = {
  skull: 'skull',
  cultist: 'cultist',
  tablet: 'tablet',
  elderThing: 'elder_thing',
  elderSign: 'elder_sign',
  autoFail: 'auto_fail',
  bless: 'bless',
  curse: 'curse',
  frost: 'frost',
  action: 'action',
  reaction: 'reaction',
  fast: 'fast',
  free: 'free',
  willpower: 'willpower',
  intellect: 'intellect',
  combat: 'combat',
  agility: 'agility',
  wild: 'wild',
  perPlayer: 'per_investigator',
  // Iconos de clase: el nombre de la facción ya va en el texto.
  guardian: '',
  seeker: '',
  rogue: '',
  mystic: '',
  survivor: '',
  codex: '',
}

/** HTML de la referencia → párrafos con las marcas de story.ts. */
function toText(html) {
  const decoded = links(html)
    .replace(/\{'\{'\}(\w+)\{'\}'\}/g, '{$1}')
    .replace(/\{(\w+)\}/g, (_, name) =>
      name in TOKENS ? (TOKENS[name] ? `[${TOKENS[name]}]` : '') : `{${name}}`,
    )
    // Iconos como <span class="skull-icon"></span>.
    .replace(/<span class=['"]([a-z-]+)-icon['"]><\/span>/g, (_, name) => {
      const key = name.replace(/-(\w)/g, (_m, c) => c.toUpperCase())
      return TOKENS[key] ? `[${TOKENS[key]}]` : ''
    })
  const blocks = decoded
    // Conjuntos de encuentros: solo sus nombres.
    .replace(/<section[^>]*encounter-sets[^>]*>([\s\S]*?)<\/section>/g, (_, inner) => {
      const names = [...inner.matchAll(/<span>(.*?)<\/span>/g)].map((m) => m[1])
      return ` ${names.join(', ')}.`
    })
    .replace(/<\/?(b|strong)>/g, '*')
    .replace(/<\/?(i|em)>/g, '_')
    .replace(/<h\d[^>]*>[\s\S]*?<\/h\d>/g, '')
    .replace(/<hr\s*\/?>/g, '\n\n')
    .replace(/<br\s*\/?>/g, '\n\n')
    .replace(/<li[^>]*>/g, '\n\n• ')
    .replace(/<p class=['"][^'"]*basic[^'"]*['"]>/g, '\n\n» ')
    .replace(/<p[^>]*>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    // Paréntesis que quedan vacíos al quitar los iconos de clase.
    .replace(/ \(\)/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    // La experiencia ganada la muestra la mesa con sus efectos.
    .filter((p) => p && p !== '»' && p !== '•' && !p.includes('{xp}'))
  return blocks.join('\n\n')
}

/** Une varias rutas de un escenario; los pasos de preparación van como lista. */
const join2 = (scenario, paths, list = false) =>
  paths
    .map((path) => get(brethren[scenario], path))
    .filter((v) => typeof v === 'string')
    .map((v) => (list ? `• ${toText(v)}` : toText(v)))
    .join('\n\n')

/** Pasos de preparación; los comunes (barajar el resto, empezar) si el escenario no los trae. */
const setupSteps = (scenario) => {
  const own = brethren[scenario].setup ?? {}
  const shared = ['shuffleRemainder', 'readyToBegin'].filter(
    (k) => !(k in own) && typeof common[k] === 'string',
  )
  return [...Object.values(own), ...shared.map((k) => common[k])]
    .map((step) => `• ${toText(step)}`)
    .join('\n\n')
}

/** Textos de La gala del ecuador del invierno (locales/en/standalone/theMidwinterGala.json). */
function galaTexts() {
  const file = join(locales, 'standalone/theMidwinterGala.json')
  if (!existsSync(file)) return {}
  const gala = load('standalone/theMidwinterGala.json')
  const g = (path) => get(gala, path)
  const text = (...paths) =>
    paths
      .map(g)
      .filter((v) => typeof v === 'string')
      .map(toText)
      .join('\n\n')
  const FACTION_KEYS = {
    foundation: 'theFoundation',
    miskatonic: 'miskatonicUniversity',
    syndicate: 'theSyndicate',
    lodge: 'theSilverTwilightLodge',
    kingsport: 'localsOfKingsport',
  }
  const out = {
    'story.midwinterGala.intro1': text('intro.flavor'),
    'story.midwinterGala.intro2': text('intro.body'),
    'story.midwinterGala.contact': text('intro.guestChoice'),
    'story.midwinterGala.setup': Object.values(gala.setup ?? {})
      .map((step) => `• ${toText(step)}`)
      .join('\n\n'),
    'story.midwinterGala.noResolution': text('resolutions.noResolution.body'),
  }
  for (const [ours, theirs] of Object.entries(FACTION_KEYS)) {
    out[`story.midwinterGala.faction.${ours}`] = text(`intro.${theirs}`)
    out[`story.midwinterGala.interlude.${ours}`] = text(
      'theFabledJewel.body',
      `theFabledJewel.${theirs}`,
    )
  }
  for (let n = 1; n <= 7; n++) {
    out[`story.midwinterGala.resolution${n}`] = text(`resolutions.resolution${n}.body`)
  }
  return out
}

/**
 * Textos de Asesinato en el hotel Excelsior (locales/en/standalone/murderAtTheExcelsiorHotel.json)
 * y los reversos de sus planes y actos (public/cards_en.json de la referencia).
 */
function excelsiorTexts() {
  const file = join(locales, 'standalone/murderAtTheExcelsiorHotel.json')
  const cardsFile = join(reference, 'frontend/public/cards_en.json')
  if (!existsSync(file) || !existsSync(cardsFile)) return {}
  const hotel = load('standalone/murderAtTheExcelsiorHotel.json')
  const g = (path) => get(hotel, path)
  const text = (...paths) =>
    paths
      .map(g)
      .filter((v) => typeof v === 'string')
      .map(toText)
      .join('\n\n')
  const list = (...paths) =>
    paths
      .map(g)
      .filter((v) => typeof v === 'string')
      .map((v) => `• ${toText(v)}`)
      .join('\n\n')
  const cards = JSON.parse(readFileSync(cardsFile, 'utf8'))
  // Los reversos de las cartas separan los párrafos con saltos de línea.
  const back = (code) =>
    (cards.find((c) => c.code === code)?.back_text ?? '')
      .replace(/\n/g, '<p>')
      // Rasgos ([[Lead]]) en cursiva.
      .replace(/\[\[([^\]]+)\]\]/g, '<i>$1</i>')
  const VERSIONS = [
    'alienDeviceAndTimeWornLocket',
    'alienDeviceAndSinisterSolution',
    'alienDeviceAndManagersKey',
    'alienDeviceAndTomeOfRituals',
    'timeWornLocketAndSinisterSolution',
    'timeWornLocketAndManagersKey',
    'timeWornLocketAndTomeOfRituals',
    'sinisterSolutionAndManagersKey',
    'sinisterSolutionAndTomeOfRituals',
    'managersKeyAndTomeOfRituals',
  ]
  const out = {
    'story.excelsior.intro1': text('intro.intro1'),
    'story.excelsior.intro2': text('intro.intro2'),
    'story.excelsior.intro3': text('intro.intro3'),
    'story.excelsior.intro4': text('intro.intro4'),
    'story.excelsior.setup': Object.entries(hotel.setup ?? {})
      .flatMap(([key, step]) =>
        key === 'begin' && typeof common.shuffleRemainder === 'string'
          ? [common.shuffleRemainder, step]
          : [step],
      )
      .map((step) => `• ${toText(step)}`)
      .join('\n\n'),
    'story.excelsior.murderBack': toText(back('84002')),
    'story.excelsior.specialInvestigationBack': toText(back('84003')),
    'story.excelsior.whatHappenedBack': toText(back('84004')),
    'story.excelsior.truth1': text('interlude.theTruth1'),
    'story.excelsior.truth2': [
      text('interlude.theTruth2'),
      list('interlude.nothingToHide', 'interlude.evidence', 'interlude.innocent'),
    ].join('\n\n'),
    'story.excelsior.truth3': [
      text('interlude.theTruth3'),
      list('interlude.coveredUp', 'interlude.innocent'),
    ].join('\n\n'),
    'story.excelsior.truth4': text('interlude.theTruth4'),
    'story.excelsior.truth5': text('interlude.theTruth5'),
    'story.excelsior.truth6': text('interlude.theTruth6'),
    'story.excelsior.truth7': text('interlude.theTruth7'),
    'story.excelsior.noResolution': text('resolutions.noResolution.body'),
    'story.excelsior.noResolutionResigned': text('resolutions.noResolutionResigned.body'),
  }
  for (let n = 1; n <= 3; n++) {
    out[`story.excelsior.resolution${n}`] = text(`resolutions.resolution${n}.body`)
  }
  VERSIONS.forEach((key, n) => {
    const [doom, objective] = back(String(84043 + n)).split(/<hr\s*\/?>/)
    out[`story.excelsior.culprit${n + 1}`] = text(`interlude.${key}`)
    out[`story.excelsior.culpritDoom${n + 1}`] = toText(doom ?? '')
    out[`story.excelsior.culpritObjective${n + 1}`] = toText(objective ?? '')
  })
  return out
}

/** Título de la guía → clave de las palabras clave en los ficheros de idioma. */
const KEYWORDS = { 'The Codex': 'codex' }

const SUSPECTS = [
  'davidRenfield',
  'corneliaAkely',
  'naomiOBannion',
  'sgtEarlMonroe',
  'abigailForeman',
  'margaretLiu',
]
/** Final de un códex: lo que sigue a la raya del texto de éxito. */
const codexEnd = (name) => {
  const success = get(brethren.smokeAndMirrors, `codex.${name}.success`) ?? ''
  const after = success
    .split(/<hr\s*\/?>/)
    .slice(1)
    .join('<hr>')
  return toText(after || success)
}

const texts = {
  'story.brethrenOfAsh.prologue': toText(brethren.base.prologue),

  'story.spreadingFlames.intro': join2('spreadingFlames', ['intro.body']),
  'story.spreadingFlames.setup': setupSteps('spreadingFlames'),
  ...Object.fromEntries(
    ['noResolution', 'resolution1', 'resolution2', 'resolution3'].map((r) => [
      `story.spreadingFlames.${r}`,
      join2('spreadingFlames', [`resolutions.${r}.body`]),
    ]),
  ),

  'story.smokeAndMirrors.intro': join2('smokeAndMirrors', ['intro.body']),
  'story.smokeAndMirrors.setup': setupSteps('smokeAndMirrors'),
  ...Object.fromEntries(
    SUSPECTS.flatMap((name, i) => [
      [
        `story.smokeAndMirrors.codex${i + 1}Attempt`,
        join2('smokeAndMirrors', [`codex.${name}.body`]),
      ],
      [`story.smokeAndMirrors.codex${i + 1}`, codexEnd(name)],
    ]),
  ),
  'story.smokeAndMirrors.codexServant': join2('smokeAndMirrors', ['codex.servantOfFlame.body']),
  'story.smokeAndMirrors.noResolution': join2('smokeAndMirrors', ['resolutions.noResolution.body']),
  'story.smokeAndMirrors.resolution1': join2('smokeAndMirrors', ['resolutions.resolution1.body']),
  'story.smokeAndMirrors.resolution2': join2('smokeAndMirrors', ['resolutions.resolution2.body']),

  'story.queenOfAsh.intro1': join2('queenOfAsh', [
    'intro.intro1',
    'intro.addTokens',
    'intro.easy',
    'intro.standard',
    'intro.hard',
    'intro.expert',
  ]),
  'story.queenOfAsh.intro2': join2('queenOfAsh', ['intro.intro2']),
  'story.queenOfAsh.intro3': join2('queenOfAsh', ['intro.intro3']),
  'story.queenOfAsh.setup': setupSteps('queenOfAsh'),
  ...Object.fromEntries(
    SUSPECTS.map((name) => [
      `story.queenOfAsh.codex.${name[0].toUpperCase()}${name.slice(1)}`,
      join2('queenOfAsh', ['codex.servantOfFlame.intro', `codex.servantOfFlame.${name}.body`]),
    ]),
  ),
  ...Object.fromEntries(
    ['noResolution', 'resolution1', 'resolution2', 'resolution3'].map((r) => [
      `story.queenOfAsh.${r}`,
      join2('queenOfAsh', [`resolutions.${r}.body`]),
    ]),
  ),
  // La gala del ecuador del invierno (escenario independiente).
  ...galaTexts(),
  // Asesinato en el hotel Excelsior (escenario independiente).
  ...excelsiorTexts(),
  // Palabras clave y conceptos de la guía (por su título en inglés).
  ...Object.fromEntries(
    Object.values(brethren)
      .flatMap((file) => file.keywordsAndConcepts?.entries ?? [])
      .map((entry) => [
        `keywords.${KEYWORDS[entry.title] ?? entry.title.toLowerCase()}.body`,
        toText(entry.body),
      ]),
  ),
}

const found = Object.fromEntries(Object.entries(texts).filter(([, text]) => text))
const missing = Object.keys(texts).filter((key) => !found[key])
mkdirSync(target, { recursive: true })
writeFileSync(join(target, 'en.json'), JSON.stringify(found, null, 2) + '\n')
console.log(`${Object.keys(found).length} textos en ${join(target, 'en.json')}`)
if (missing.length) console.log(`Sin texto en la referencia: ${missing.join(', ')}`)
