import { DIM_CARCOSA_STORIES, printingsOf } from '@lcg/cards'
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

/**
 * Cartas cuyo código lleva una letra de copia (sus reversos añaden otra `b`): El Extranjero,
 * Delirios y las dos versiones de los planes 2a y 2c de Surgen estrellas negras.
 */
const LETTERED = new Set([
  // Fortuna e insensatez: cada copia lleva otro icono de juego; Abarran desatado (88034b).
  '88035a',
  '88035b',
  '88035c',
  '88036a',
  '88036b',
  '88037a',
  '88037b',
  '88037c',
  '88038a',
  '88038b',
  '88038c',
  '88038d',
  '88039a',
  '88039b',
  '88039c',
  '88040a',
  '88040b',
  '88040c',
  '88041a',
  '88041b',
  '88041c',
  '88042a',
  '88042b',
  '88042c',
  '88046a',
  '88046b',
  '88047a',
  '88047b',
  '88049a',
  '88049b',
  '88050a',
  '88050b',
  '88051a',
  '88051b',
  '88051c',
  '88052a',
  '88052b',
  '88052c',
  '88053a',
  '88053b',
  '88034b',
  '03047a',
  '03047b',
  '03047c',
  '03084a',
  '03084b',
  '03084c',
  '03084d',
  '03276a',
  '03276b',
  '03279a',
  '03279b',
  // Penumbrosa Carcosa: versiones del acto 2, y Lugares e Historias de sus reversos.
  '03322a',
  '03323a',
  '03325a',
  ...['03326', '03327', '03328', '03329'].flatMap((code) =>
    ['a', 'b', 'c', 'd', 'e', 'f'].map((side) => `${code}${side}`),
  ),
])

/** Lugares de Penumbrosa Carcosa: su reverso es una carta de Historia con otro código. */
const STORY_BACKS: Record<string, string> = DIM_CARCOSA_STORIES

/** Caras `a`/`b` de una misma carta (Constance 03076a/b, Daniel 03182a/b, El organista 03221a/b). */
const A_SIDES = new Set(['03076a', '03182a', '03221a', '03321a', '88034a'])

/** Spanish image, then English image, both from our local asset inventory. */
export function cardImages(code: string, back = false, locale = scanLocale.value): string[] {
  if (back && STORY_BACKS[code]) return cardImages(STORY_BACKS[code], false, locale)
  if (A_SIDES.has(code)) {
    const art = back ? code.replace(/a$/, 'b') : code
    return [locale === 'es' ? LOCAL_IMAGES.es[art] : undefined, LOCAL_IMAGES.en[art]].filter(
      (path): path is string => Boolean(path),
    )
  }
  // Copias distintas con letra (El Extranjero 03047a–c): `03047b` es una carta, no un reverso.
  const lettered = LETTERED.has(code.replace(/(?<=[a-f])b$/, ''))
  const match = lettered ? /^(\d{5}[a-f])(b)?$/.exec(code) : /^(\d{5})(b)?$/.exec(code)
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
  return /^\/local-assets\/cards\/(en|es)\/\d{5}[a-f]?b?\.(avif|jpg)$/.test(original)
    ? original.replace(/\/(\d{5}[a-f]?b?)\.(avif|jpg)$/, '/thumbs/$1.webp')
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
