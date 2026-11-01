import type { MessageSchema } from '@lcg/i18n'
import type { Locale } from '@lcg/shared'
import type { Ref } from 'vue'
import { createI18n } from 'vue-i18n'
import { loadLocaleData } from './game/localeData'

const saved = (() => {
  try {
    return localStorage.getItem('locale')
  } catch {
    return null
  }
})()

const initial: Locale =
  saved === 'en' || saved === 'es' ? saved : navigator.language.startsWith('es') ? 'es' : 'en'

// Messages arrive per language (doc 100, O1): only the active one is downloaded.
export const i18n = createI18n<[MessageSchema], Locale>({
  legacy: false,
  locale: initial,
  fallbackLocale: 'en',
  messages: {} as Record<Locale, MessageSchema>,
})

/** Downloads a language's texts if needed, then switches to it. */
export async function setAppLocale(value: Locale, remember = true): Promise<void> {
  const data = await loadLocaleData(value)
  i18n.global.setLocaleMessage(value, data.messages as MessageSchema)
  // Composition mode: the global locale is a ref (as in game/story.ts).
  ;(i18n.global.locale as unknown as Ref<Locale>).value = value
  if (!remember) return
  try {
    localStorage.setItem('locale', value)
  } catch {
    // Sin almacenamiento: el idioma solo dura esta sesión.
  }
}

/** The starting language, awaited by `main.ts` before mounting the app. */
export const localeReady = setAppLocale(initial, false)
