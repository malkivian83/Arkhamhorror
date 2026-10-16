import { ref, watch, type Ref } from 'vue'
import { i18n } from '../i18n'

/**
 * Textos de historia. Por defecto la mesa muestra un resumen propio (en los
 * ficheros de idioma). Si existe public/local-assets/story/{idioma}.json (fuera
 * del repositorio, como las fichas), se usan esos textos: un objeto con la
 * clave i18n del cuerpo (por ejemplo "story.spreadingFlames.intro") y el texto,
 * con los párrafos separados por una línea en blanco.
 */
const official = ref<Record<string, string>>({})

async function loadOfficial(locale: string) {
  try {
    const response = await fetch(`/local-assets/story/${locale}.json`)
    const type = response.headers.get('content-type') ?? ''
    official.value = response.ok && type.includes('json') ? await response.json() : {}
  } catch {
    official.value = {}
  }
}

// En modo composición el idioma global es una referencia (los tipos dicen texto).
const locale = i18n.global.locale as unknown as Ref<string>

watch(locale, (locale) => void loadOfficial(locale), { immediate: true })

/** Párrafos del cuerpo de un texto de historia y si es el texto oficial. */
export function storyBody(key: string): { paragraphs: string[]; official: boolean } {
  const text = official.value[key]
  const body = text ?? i18n.global.t(key)
  return {
    paragraphs: body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
    official: text !== undefined,
  }
}
