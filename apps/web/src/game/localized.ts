import { shallowRef } from 'vue'
import { fallbackCards } from './fallbackCards'

/**
 * Catálogo local EN/ES, completado con datos de ArkhamDB cuando están disponibles.
 * Las respuestas remotas se conservan en memoria y en la caché del navegador;
 * los datos y resúmenes de respaldo forman parte de la aplicación.
 */
export interface LocalizedCard {
  code: string
  name: string
  real_name: string
  subname?: string
  type_code: string
  type_name?: string
  faction_code?: string
  traits?: string
  text?: string
  flavor?: string
  back_name?: string
  back_text?: string
  back_flavor?: string
  slot?: string
  cost?: number | null
  xp?: number
  skill_willpower?: number
  skill_intellect?: number
  skill_combat?: number
  skill_agility?: number
  skill_wild?: number
  health?: number
  sanity?: number
  health_per_investigator?: boolean
  shroud?: number
  clues?: number
  clues_fixed?: boolean
  doom?: number
  stage?: number
  enemy_fight?: number
  enemy_evade?: number
  enemy_damage?: number
  enemy_horror?: number
  victory?: number
  /** Editorial FAQ associated with this card; never inferred from its rules text. */
  faq?: { question: string; answer: string; source?: string }[]
}

/**
 * Paquetes de cada idioma: caja básica 2026, La gala del ecuador del invierno,
 * Asesinato en el hotel Excelsior (con sus encuentros) y los investigadores de Dunwich y
 * Carcosa habilitados.
 */
const SOURCES: Record<string, string[]> = {
  en: [
    'https://arkhamdb.com/api/public/cards/dwl.json',
    'https://arkhamdb.com/api/public/cards/ptc.json',
  ],
  es: [
    'https://es.arkhamdb.com/api/public/cards/core_2026.json',
    'https://es.arkhamdb.com/api/public/cards/tmg.json?encounter=1',
    'https://es.arkhamdb.com/api/public/cards/hotel.json?encounter=1',
    'https://es.arkhamdb.com/api/public/cards/dwl.json',
    'https://es.arkhamdb.com/api/public/cards/ptc.json',
  ],
}
// v6: also Lola Hayes and her signatures (El camino a Carcosa) in EN/ES.
const CACHE_PREFIX = 'lcg:cards:v6:'
/** Dunwich investigators enabled so far; the rest of that pack stays hidden. */
const DUNWICH_CODES = ['02005', '02014', '02015', '02003', '02010', '02011']
/** El camino a Carcosa: solo Lola Hayes y sus exclusivas (los escenarios usan el catálogo local). */
const CARCOSA_CODES = ['03006', '03018', '03019']
const CACHE_HOURS = 24

/** Bundled alternatives plus any available translated card data. */
export const localizedCards = shallowRef(new Map<string, LocalizedCard>())
/** Nombre inglés → nombre traducido, para traducir los nombres que guarda el motor. */
export const localizedNames = shallowRef(new Map<string, string>())

const loaded = new Map<string, LocalizedCard[]>()

function readCache(locale: string): LocalizedCard[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + locale)
    if (!raw) return null
    const { at, cards } = JSON.parse(raw) as { at: number; cards: LocalizedCard[] }
    return Number.isFinite(at) && Array.isArray(cards) && Date.now() - at < CACHE_HOURS * 3600_000
      ? cards
      : null
  } catch {
    return null
  }
}

function writeCache(locale: string, cards: LocalizedCard[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + locale, JSON.stringify({ at: Date.now(), cards }))
  } catch {
    // Sin almacenamiento: se volverá a descargar la próxima vez.
  }
}

function apply(cards: LocalizedCard[], locale: string) {
  const merged = new Map(fallbackCards(locale).map((c) => [c.code, c]))
  cards
    .filter(
      (c) =>
        c &&
        typeof c.code === 'string' &&
        typeof c.name === 'string' &&
        typeof c.type_code === 'string',
    )
    .forEach((c) => {
      // Partial API responses must not erase local mechanics or the other face.
      const available = Object.fromEntries(
        Object.entries(c).filter(
          ([, value]) => value !== undefined && value !== null && value !== '',
        ),
      )
      merged.set(c.code, { ...merged.get(c.code), ...available } as LocalizedCard)
    })
  localizedCards.value = merged
  localizedNames.value = new Map(
    [...merged.values()]
      .filter((c) => c.real_name && c.name)
      // A rival/unleashed face may share its English name with the front.
      // Keep the neutral front name for engine logs; explicit back views use back_name.
      .sort((a, b) => Number(b.code.endsWith('b')) - Number(a.code.endsWith('b')))
      .map((c) => [normalizeName(c.real_name), c.name]),
  )
}

/** Activa el idioma sobre el catálogo local; los datos remotos disponibles lo completan. */
let activeLocale = 'en'
export async function useCardLocale(locale: string): Promise<void> {
  activeLocale = locale
  apply([], locale)
  const sources = SOURCES[locale]
  if (!sources) {
    return
  }
  const cached = loaded.get(locale) ?? readCache(locale)
  if (cached) {
    loaded.set(locale, cached)
    apply(cached, locale)
    return
  }
  // Cada paquete por separado: si uno falla, los demás siguen sirviendo.
  const packs = await Promise.allSettled(
    sources.map(async (source) => {
      const response = await fetch(source, { signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw new Error(String(response.status))
      const pack = (await response.json()) as LocalizedCard[]
      if (!Array.isArray(pack)) throw new Error('Invalid card data')
      return source.endsWith('/dwl.json')
        ? pack.filter((c) => DUNWICH_CODES.includes(c.code))
        : source.endsWith('/ptc.json')
          ? pack.filter((c) => CARCOSA_CODES.includes(c.code))
          : pack
    }),
  )
  const cards = packs.flatMap((p) => (p.status === 'fulfilled' ? p.value : []))
  // Solo se guarda en caché una respuesta completa; si falta algún paquete se reintenta.
  if (packs.every((p) => p.status === 'fulfilled')) {
    loaded.set(locale, cards)
    writeCache(locale, cards)
  }
  if (activeLocale === locale) apply(cards, locale)
}

export function localName(name: string): string {
  return localizedNames.value.get(normalizeName(name)) ?? name
}

const normalizeName = (name: string) => name.normalize('NFKC').replace(/[‘’]/g, "'")
