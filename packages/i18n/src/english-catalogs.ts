import carnevale from './carnevale-cards.en.json'
import fortune from './fortune-cards.en.json'
import type { CatalogCard } from './types'

/**
 * English card names used as `real_name` whatever the language (image lookups and
 * printed names). Small catalogs, loaded with the web instead of the whole English bundle.
 */
export const englishCarnevaleCards: Record<string, CatalogCard> = carnevale
export const englishFortuneCards: Record<string, CatalogCard> = fortune
