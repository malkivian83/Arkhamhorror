import manifest from './cardNarrationManifest.json'
import { excelsiorCards } from '@lcg/i18n'

const recordings: Record<string, { front?: string; back?: string }> = manifest

/** Una grabación corresponde a una cara concreta; nunca cambia de idioma ni de cara. */
export function cardNarration(code: string, back: boolean, locale: string): string | null {
  if (locale !== 'es') return null
  if (!['agenda', 'act'].includes(excelsiorCards.es[code]?.typeCode ?? '')) return null
  const file = recordings[code]?.[back ? 'back' : 'front']
  return file ? `/local-assets/cards/audio/es/${file}` : null
}
