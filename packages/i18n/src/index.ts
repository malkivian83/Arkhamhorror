import * as en from './en'
import * as es from './es'
import type { CardNarrative, CatalogCard } from './types'
export type { CardNarrative, CatalogCard } from './types'

/**
 * Both languages at once, for tests, tools and the server. The web loads only the
 * active one through `@lcg/i18n/en` or `@lcg/i18n/es` (doc 100, O1).
 */
type Both<T> = Record<'en' | 'es', T>

/** Narración oficial de planes y actos de los catálogos implementados. */
export const cardNarratives: Both<Record<string, CardNarrative>> = {
  en: en.cardNarratives,
  es: es.cardNarratives,
}

/** Textos de interfaz. Solo inglés y español. */
export const messages = { en: en.messages, es: es.messages } as const

export type MessageSchema = typeof en.messages

/** Lo que la web necesita de un idioma: `@lcg/i18n/en` o `@lcg/i18n/es`. */
export type LocaleBundle = typeof en

export const carnevaleCards: Both<Record<string, CatalogCard>> = {
  en: en.carnevaleCards,
  es: es.carnevaleCards,
}

/**
 * Textos oficiales de las cartas de Asesinato en el hotel Excelsior (catálogo sin
 * conexión). Fuera de `messages`: llevan marcas de ArkhamDB que vue-i18n no debe leer.
 */
export const excelsiorCards: Both<Record<string, CatalogCard>> = {
  en: en.excelsiorCards,
  es: es.excelsiorCards,
}

/** Textos oficiales de las cartas de encuentro de El camino a Carcosa ya implementadas. */
export const carcosaCards: Both<Record<string, CatalogCard>> = {
  en: en.carcosaCards,
  es: es.carcosaCards,
}

/** Textos oficiales e iconos de juego de las cartas de Fortuna e insensatez. */
export const fortuneCards: Both<Record<string, CatalogCard>> = {
  en: en.fortuneCards,
  es: es.fortuneCards,
}

/** Cartas clásicas de La noche de la fanática. */
export const zealotCards: Both<Record<string, CatalogCard>> = {
  en: en.zealotCards,
  es: es.zealotCards,
}

/** Shared encounter cards implemented for The Dunwich Legacy. */
export const dunwichCards: Both<Record<string, CatalogCard>> = {
  en: en.dunwichCards,
  es: es.dunwichCards,
}
