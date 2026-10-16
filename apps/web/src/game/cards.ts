import { playerCardDef } from '@lcg/engine'
import { ref } from 'vue'

/**
 * Imágenes de las cartas: se cargan de ArkhamDB al vuelo (no se guardan en el
 * repositorio). Solo para códigos oficiales de 5 dígitos; el resto usa plantilla.
 */
const IMAGE_BASE = 'https://arkhamdb.com/bundles/cards/'

export function cardImage(code: string, back = false): string | null {
  return /^\d{5}$/.test(code) ? `${IMAGE_BASE}${code}${back ? 'b' : ''}.jpg` : null
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
