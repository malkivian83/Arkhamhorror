import { shallowRef } from 'vue'

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

/** Paquetes de cada idioma: caja básica 2026 y La gala del ecuador del invierno (con sus encuentros). */
const SOURCES: Record<string, string[]> = {
  es: [
    'https://es.arkhamdb.com/api/public/cards/core_2026.json',
    'https://es.arkhamdb.com/api/public/cards/tmg.json?encounter=1',
  ],
}
// v2: incluye La gala del ecuador del invierno.
const CACHE_PREFIX = 'lcg:cards:v2:'
const CACHE_HOURS = 24

/** Cartas del idioma activo por código. Vacío para inglés (se usan las imágenes). */
export const localizedCards = shallowRef(new Map<string, LocalizedCard>())
/** Nombre inglés → nombre traducido, para traducir los nombres que guarda el motor. */
export const localizedNames = shallowRef(new Map<string, string>())

const loaded = new Map<string, LocalizedCard[]>()

function readCache(locale: string): LocalizedCard[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + locale)
    if (!raw) return null
    const { at, cards } = JSON.parse(raw) as { at: number; cards: LocalizedCard[] }
    return Date.now() - at < CACHE_HOURS * 3600_000 ? cards : null
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

function apply(cards: LocalizedCard[]) {
  localizedCards.value = new Map(cards.map((c) => [c.code, c]))
  localizedNames.value = new Map(
    cards.filter((c) => c.real_name && c.name).map((c) => [c.real_name, c.name]),
  )
}

/** Activa el idioma: descarga sus datos si hace falta. Si falla, se sigue en inglés. */
export async function useCardLocale(locale: string): Promise<void> {
  const sources = SOURCES[locale]
  if (!sources) {
    apply([])
    return
  }
  const cached = loaded.get(locale) ?? readCache(locale)
  if (cached) {
    loaded.set(locale, cached)
    apply(cached)
    return
  }
  try {
    const packs = await Promise.all(
      sources.map(async (source) => {
        const response = await fetch(source)
        if (!response.ok) throw new Error(String(response.status))
        return (await response.json()) as LocalizedCard[]
      }),
    )
    const cards = packs.flat()
    loaded.set(locale, cards)
    writeCache(locale, cards)
    apply(cards)
  } catch {
    apply([])
  }
}

export function localName(name: string): string {
  return localizedNames.value.get(name) ?? name
}
