import { printingsOf } from '@lcg/cards'
import { playerCardDef } from '@lcg/engine'
import { ref } from 'vue'
import imageManifest from './cardImageManifest.json'

/**
 * Imágenes almacenadas con la web. Solo se solicitan rutas de nuestro origen;
 * el importador de assets se ejecuta antes de publicar, nunca durante la partida.
 */
const LOCAL_IMAGES = imageManifest as Record<'en' | 'es', Record<string, string>>

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

/** Cartas cuyo código lleva una letra de copia (sus reversos añaden otra `b`). */
const LETTERED = new Set(['03047a', '03047b', '03047c', '03084a', '03084b', '03084c', '03084d'])

/** Caras `a`/`b` de una misma carta (Constance Dumaine: Transeúnte 03076a, Historia 03076b). */
const A_SIDES = new Set(['03076a'])

/** Spanish image, then English image, both from our local asset inventory. */
export function cardImages(code: string, back = false, locale = scanLocale.value): string[] {
  if (A_SIDES.has(code)) {
    const art = back ? code.replace(/a$/, 'b') : code
    return [locale === 'es' ? LOCAL_IMAGES.es[art] : undefined, LOCAL_IMAGES.en[art]].filter(
      (path): path is string => Boolean(path),
    )
  }
  // Copias distintas con letra (El Extranjero 03047a–c): `03047b` es una carta, no un reverso.
  const lettered = LETTERED.has(code.replace(/(?<=[a-d])b$/, ''))
  const match = lettered ? /^(\d{5}[a-d])(b)?$/.exec(code) : /^(\d{5})(b)?$/.exec(code)
  if (!match) return []
  const base = match[1]!
  const side = match[2] ? !back : back
  /**
   * Las caras al revés solo afectan a las imágenes de ArkhamDB (.jpg). Las del
   * proyecto de referencia (.avif) siguen la norma: `{código}` es la cara revelada y
   * `{código}b` la otra.
   */
  const pick = (images: Record<string, string>): string | undefined => {
    const normal = images[`${base}${side ? 'b' : ''}`]
    if (!SWAPPED_SIDES.has(base) || !normal || !normal.endsWith('.jpg')) return normal
    return images[`${base}${side ? '' : 'b'}`]
  }
  const localized = locale === 'es' ? pick(LOCAL_IMAGES.es) : undefined
  const english = pick(LOCAL_IMAGES.en)
  const images = [localized, english].filter((path): path is string => Boolean(path))
  if (images.length) return images
  // Una reimpresión sin imagen propia usa la de otra impresión de la misma carta.
  for (const printing of printingsOf(base)) {
    if (printing === base) continue
    const shared = [LOCAL_IMAGES.es, LOCAL_IMAGES.en].some((m) => m[printing])
    if (shared) return cardImages(`${printing}${match[2] ?? ''}`, back, locale)
  }
  return []
}

export function cardImage(code: string, back = false): string | null {
  return cardImages(code, back)[0] ?? null
}

/** Locally generated 192px image for small cards; the zoom always uses the original. */
export function cardThumbnail(original: string): string | null {
  return /^\/local-assets\/cards\/(en|es)\/\d{5}[a-d]?b?\.(avif|jpg)$/.test(original)
    ? original.replace(/\/(\d{5}[a-d]?b?)\.(avif|jpg)$/, '/thumbs/$1.webp')
    : null
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
