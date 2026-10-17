import { playerCardDef } from '@lcg/engine'
import { ref } from 'vue'

/**
 * Imágenes de las cartas: se cargan de ArkhamDB al vuelo (no se guardan en el
 * repositorio). Solo para códigos oficiales de 5 dígitos; el resto usa plantilla.
 */
const IMAGE_BASE = 'https://arkhamdb.com/bundles/cards/'

/**
 * Cartas cuyas imágenes en ArkhamDB tienen las caras al revés: `{código}.jpg` es
 * la cara sin revelar y `{código}b.jpg` la revelada (localizaciones de Spreading
 * Flames, salvo la inicial). Comprobado a mano con las imágenes.
 */
const SWAPPED_SIDES = new Set([
  // Spreading Flames
  '12116',
  '12117',
  '12118',
  '12119',
  '12120',
  // Queen of Ash: cisterna, compuerta y túneles
  '12174',
  '12175',
  '12183',
  '12184',
  '12185',
  '12186',
  '12187',
])

/**
 * Caras traseras de cartas de dos caras que ArkhamDB no tiene (La gala: Líderes como
 * enemigo, El Exangüe desatado, cartas de Historia rival, La Lámpara): se usan las del
 * servidor de imágenes del proyecto de referencia.
 */
const REFERENCE_IMAGES = 'https://assets.arkhamhorror.app/img/arkham/cards/'

export function cardImage(code: string, back = false): string | null {
  if (/^\d{5}b$/.test(code)) return `${REFERENCE_IMAGES}${code}.avif`
  if (!/^\d{5}$/.test(code)) return null
  const suffix = back !== SWAPPED_SIDES.has(code) ? 'b' : ''
  return `${IMAGE_BASE}${code}${suffix}.jpg`
}

export function cardName(code: string): string {
  return playerCardDef(code)?.name ?? code
}

export const CLASS_COLORS: Record<string, string> = {
  guardian: '#2f7fc1',
  seeker: '#e08a2e',
  rogue: '#2e8b45',
  mystic: '#6b4fc9',
  survivor: '#c9353e',
  neutral: '#8a8a8a',
}

export function classColor(code: string): string {
  return CLASS_COLORS[playerCardDef(code)?.class ?? 'neutral'] ?? '#8a8a8a'
}

/**
 * Escaneos propios (opcionales) en public/cards/<idioma>/<código>.jpg, carpeta
 * ignorada por git. Se activan con VITE_LOCAL_SCANS=true en apps/web/.env.local.
 */
export const scanLocale = ref('en')

export function localScan(code: string, back = false): string | null {
  if (import.meta.env.VITE_LOCAL_SCANS !== 'true' || scanLocale.value === 'en') return null
  return /^\d{5}$/.test(code) ? `/cards/${scanLocale.value}/${code}${back ? 'b' : ''}.jpg` : null
}
