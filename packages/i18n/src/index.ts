import carcosaEn from './carcosa-cards.en.json'
import carcosaEs from './carcosa-cards.es.json'
import en from './en.json'
import es from './es.json'
import excelsiorEn from './excelsior-cards.en.json'
import excelsiorEs from './excelsior-cards.es.json'
import fortuneEn from './fortune-cards.en.json'
import fortuneEs from './fortune-cards.es.json'
import galaEn from './gala-cards.en.json'
import galaEs from './gala-cards.es.json'

/** Textos de interfaz. Solo inglés y español. */
export const messages = {
  en: { ...en, galaCards: galaEn },
  es: { ...es, galaCards: galaEs },
} as const

export type MessageSchema = typeof messages.en

/** Textos oficiales de una carta en un catálogo sin conexión. */
export interface CatalogCard {
  name: string
  subname?: string
  traits?: string
  text?: string
  backName?: string
  backText?: string
  /** Icono de juego (palo y valor) de las cartas de Fortuna e insensatez: "♣Q". */
  gameIcon?: string
  /** Texto narrativo de cada cara (Fortuna e insensatez). */
  flavor?: string
  backFlavor?: string
}

/**
 * Textos oficiales de las cartas de Asesinato en el hotel Excelsior (catálogo sin
 * conexión). Fuera de `messages`: llevan marcas de ArkhamDB que vue-i18n no debe leer.
 */
export const excelsiorCards: Record<'en' | 'es', Record<string, CatalogCard>> = {
  en: excelsiorEn,
  es: excelsiorEs,
}

/** Textos oficiales de las cartas de encuentro de El camino a Carcosa ya implementadas. */
export const carcosaCards: Record<'en' | 'es', Record<string, CatalogCard>> = {
  en: carcosaEn,
  es: carcosaEs,
}

/** Textos oficiales e iconos de juego de las cartas de Fortuna e insensatez. */
export const fortuneCards: Record<'en' | 'es', Record<string, CatalogCard>> = {
  en: fortuneEn,
  es: fortuneEs,
}
