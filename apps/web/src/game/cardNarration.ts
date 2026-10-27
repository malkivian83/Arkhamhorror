import manifest from './cardNarrationManifest.json'
import { cardNarratives, excelsiorCards } from '@lcg/i18n'

const recordings: Record<string, { front?: string; back?: string }> = manifest

/** Una grabación corresponde a una cara concreta; nunca cambia de idioma ni de cara. */
export function cardNarration(code: string, back: boolean, locale: string): string | null {
  if (locale !== 'es') return null
  const card = excelsiorCards.es[code] ?? cardNarratives.es[code]
  if (!['agenda', 'act'].includes(card?.typeCode ?? '')) return null
  const file = recordings[code]?.[back ? 'back' : 'front']
  return file ? `/local-assets/cards/audio/es/${file}` : null
}
