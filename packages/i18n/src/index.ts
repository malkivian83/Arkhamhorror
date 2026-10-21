import en from './en.json'
import es from './es.json'
import excelsiorEn from './excelsior-cards.en.json'
import excelsiorEs from './excelsior-cards.es.json'
import galaEn from './gala-cards.en.json'
import galaEs from './gala-cards.es.json'

/** Textos de interfaz. Solo inglés y español. */
export const messages = {
  en: { ...en, galaCards: galaEn },
  es: { ...es, galaCards: galaEs },
} as const

export type MessageSchema = typeof messages.en

/**
 * Textos oficiales de las cartas de Asesinato en el hotel Excelsior (catálogo sin
 * conexión). Fuera de `messages`: llevan marcas de ArkhamDB que vue-i18n no debe leer.
 */
export const excelsiorCards: Record<
  'en' | 'es',
  Record<
    string,
    {
      name: string
      subname?: string
      traits?: string
      text?: string
      backName?: string
      backText?: string
    }
  >
> = { en: excelsiorEn, es: excelsiorEs }
