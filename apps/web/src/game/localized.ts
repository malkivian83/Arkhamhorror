import { shallowRef } from 'vue'
import { fallbackCards } from './fallbackCards'

/**
 * Datos de las cartas en otro idioma (nombre, tipo, rasgos, texto…), cargados
 * de ArkhamDB al vuelo. No se guardan en el repositorio: solo en memoria y, como
 * comodidad, en el almacenamiento del navegador.
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
}

const SOURCES: Record<string, string> = {
  es: 'https://es.arkhamdb.com/api/public/cards/core_2026.json',
}
const CACHE_PREFIX = 'lcg:cards:'
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
    .forEach((c) => merged.set(c.code, c))
  localizedCards.value = merged
  localizedNames.value = new Map(
    [...merged.values()]
      .filter((c) => c.real_name && c.name)
      .map((c) => [normalizeName(c.real_name), c.name]),
  )
}

/** Activa el idioma: descarga sus datos si hace falta. Si falla, se sigue en inglés. */
let activeLocale = 'en'
export async function useCardLocale(locale: string): Promise<void> {
  activeLocale = locale
  apply([], locale)
  const source = SOURCES[locale]
  if (!source) {
    return
  }
  const cached = loaded.get(locale) ?? readCache(locale)
  if (cached) {
    loaded.set(locale, cached)
    apply(cached, locale)
    return
  }
  try {
    const response = await fetch(source, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(String(response.status))
    const cards = (await response.json()) as LocalizedCard[]
    if (!Array.isArray(cards)) throw new Error('Invalid card data')
    loaded.set(locale, cards)
    writeCache(locale, cards)
    if (activeLocale === locale) apply(cards, locale)
  } catch {
    if (activeLocale === locale) apply([], locale)
  }
}

export function localName(name: string): string {
  return localizedNames.value.get(normalizeName(name)) ?? name
}

const normalizeName = (name: string) => name.normalize('NFKC').replace(/[‘’]/g, "'")
