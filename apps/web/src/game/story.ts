import { ref, watch, type Ref } from 'vue'
import { i18n } from '../i18n'
import { iconParts } from './cardText'

/**
 * Textos de historia. Por defecto la mesa muestra un resumen propio (en los
 * ficheros de idioma). Si existe public/local-assets/story/{idioma}.json (fuera
 * del repositorio, como las fichas; `node scripts/import-story-texts.mjs` lo
 * genera en inglés desde el proyecto de referencia), se usan esos textos: un
 * objeto con la clave i18n del cuerpo (por ejemplo "story.spreadingFlames.intro")
 * y el texto, con los párrafos separados por una línea en blanco. Sin texto
 * oficial en el idioma de la mesa se ofrece el inglés junto al resumen.
 *
 * Marcas: "» " al principio de un párrafo es una instrucción de juego, "• " un
 * punto de una lista, *negrita* y _cursiva_.
 */
const official = ref<Record<string, Record<string, string>>>({})

async function loadOfficial(locale: string) {
  if (official.value[locale]) return
  try {
    const response = await fetch(`/local-assets/story/${locale}.json`)
    const type = response.headers.get('content-type') ?? ''
    const texts = response.ok && type.includes('json') ? await response.json() : {}
    official.value = { ...official.value, [locale]: texts }
  } catch {
    official.value = { ...official.value, [locale]: {} }
  }
}

// En modo composición el idioma global es una referencia (los tipos dicen texto).
const locale = i18n.global.locale as unknown as Ref<string>

watch(
  locale,
  (locale) => {
    void loadOfficial(locale)
    if (locale !== 'en') void loadOfficial('en')
  },
  { immediate: true },
)

const PREFERENCE_KEY = 'lcg:storyText'

/** Preferencia del jugador: texto oficial (si lo hay) o resumen en su idioma. */
export const preferOfficial = ref(readPreference())

function readPreference(): boolean {
  try {
    return localStorage.getItem(PREFERENCE_KEY) !== 'summary'
  } catch {
    return true
  }
}

/** Alterna entre el texto oficial y el resumen propio. */
export function toggleOfficial() {
  preferOfficial.value = !preferOfficial.value
}

watch(preferOfficial, (value) => {
  try {
    localStorage.setItem(PREFERENCE_KEY, value ? 'official' : 'summary')
  } catch {
    // Sin almacenamiento: la preferencia dura lo que la pestaña.
  }
})

export interface StorySpan {
  text: string
  bold?: boolean
  italic?: boolean
  /** Icono oficial ([skull], [action]…) en lugar de texto. */
  icon?: string
}

export interface StoryParagraph {
  kind: 'text' | 'instruction' | 'item'
  spans: StorySpan[]
}

export interface StoryBody {
  paragraphs: StoryParagraph[]
  /** Se muestra el texto oficial. */
  official: boolean
  /** Hay texto oficial, pero en otro idioma: se puede alternar con el resumen. */
  officialLocale: string | null
}

/**
 * Separa *negrita*, _cursiva_ e [iconos] en trozos (sin HTML: el texto se pinta
 * tal cual y los iconos con el símbolo oficial).
 */
function spans(text: string): StorySpan[] {
  const out: StorySpan[] = []
  let bold = false
  let italic = false
  let current = ''
  const flush = () => {
    if (current)
      out.push({ text: current, ...(bold ? { bold } : {}), ...(italic ? { italic } : {}) })
    current = ''
  }
  for (let n = 0; n < text.length; n++) {
    const char = text[n]!
    const icon = char === '[' ? /^\[([a-z_]+)\]/.exec(text.slice(n)) : null
    if (icon && iconParts(icon[1]!)) {
      flush()
      out.push({ text: '', icon: icon[1]! })
      n += icon[0].length - 1
    } else if (char === '*') {
      flush()
      bold = !bold
    } else if (char === '_') {
      flush()
      italic = !italic
    } else {
      current += char
    }
  }
  flush()
  return out
}

function paragraph(raw: string): StoryParagraph {
  if (raw.startsWith('» ')) return { kind: 'instruction', spans: spans(raw.slice(2)) }
  if (raw.startsWith('• ')) return { kind: 'item', spans: spans(raw.slice(2)) }
  return { kind: 'text', spans: spans(raw) }
}

/** Párrafos del cuerpo de un texto de historia y de dónde salen. */
export function storyBody(key: string): StoryBody {
  const current = locale.value
  const own = official.value[current]?.[key]
  const english = current !== 'en' ? official.value.en?.[key] : undefined
  const text = own ?? (preferOfficial.value ? english : undefined)
  const body = text ?? i18n.global.t(key)
  return {
    paragraphs: body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map(paragraph),
    official: text !== undefined,
    officialLocale: own === undefined && english !== undefined ? 'en' : null,
  }
}
