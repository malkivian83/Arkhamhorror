import en from './en.json'
import es from './es.json'
import galaEn from './gala-cards.en.json'
import galaEs from './gala-cards.es.json'

/** Textos de interfaz. Solo inglés y español. */
export const messages = {
  en: { ...en, galaCards: galaEn },
  es: { ...es, galaCards: galaEs },
} as const

export type MessageSchema = typeof messages.en
