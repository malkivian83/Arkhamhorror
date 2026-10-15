import { messages, type MessageSchema } from '@lcg/i18n'
import type { Locale } from '@lcg/shared'
import { createI18n } from 'vue-i18n'

const saved = (() => {
  try {
    return localStorage.getItem('locale')
  } catch {
    return null
  }
})()

const initial: Locale =
  saved === 'en' || saved === 'es' ? saved : navigator.language.startsWith('es') ? 'es' : 'en'

export const i18n = createI18n<[MessageSchema], Locale>({
  legacy: false,
  locale: initial,
  fallbackLocale: 'en',
  messages,
})
