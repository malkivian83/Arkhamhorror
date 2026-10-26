import { ICON_GLYPHS } from './assets'

/**
 * Convierte el texto de carta de ArkhamDB (con marcas como [action], <b>,
 * [[Rasgo]]) en HTML seguro: se escapa todo y solo se reintroducen las marcas
 * conocidas. Los símbolos usan la fuente oficial si está disponible y, si no,
 * una letra de respaldo.
 */
const FALLBACK: Record<string, [cls: string, text: string]> = {
  action: ['act', '➤'],
  fast: ['fast', 'ϟ'],
  free: ['fast', 'ϟ'],
  reaction: ['react', '⟲'],
  willpower: ['sk wil', 'V'],
  intellect: ['sk int', 'I'],
  combat: ['sk com', 'C'],
  agility: ['sk agi', 'A'],
  wild: ['sk wild', '?'],
  skull: ['tok', '☠'],
  cultist: ['tok', '⚉'],
  tablet: ['tok', '▤'],
  elder_thing: ['tok', '✷'],
  elder_sign: ['tok', '✪'],
  auto_fail: ['tok', '⊗'],
  bless: ['tok', '✚'],
  curse: ['tok', '✖'],
  frost: ['tok', '❄'],
  per_investigator: ['per', '/inv'],
}

const PER_INVESTIGATOR_GLYPH = 'u'

/** Partes de un icono: clase, glifo de la fuente oficial (si lo hay) y letra de respaldo. */
export function iconParts(
  name: string,
): { cls: string; glyph: string | null; text: string } | null {
  const fallback = FALLBACK[name]
  if (!fallback) return null
  const glyph = name === 'per_investigator' ? PER_INVESTIGATOR_GLYPH : ICON_GLYPHS[name]
  const [cls, text] = fallback
  return { cls, glyph: glyph && name !== 'wild' ? glyph : null, text }
}

/** HTML de un icono: glifo oficial + letra de respaldo (el CSS muestra uno de los dos). */
export function iconHtml(name: string): string | null {
  const parts = iconParts(name)
  if (!parts) return null
  const official = parts.glyph ? `<i class="ahi">${parts.glyph}</i>` : ''
  return `<span class="ci ${parts.cls}">${official}<b class="fb">${parts.text}</b></span>`
}

const CLASSES: Record<string, string> = {
  guardian: 'Guardián',
  seeker: 'Buscador',
  rogue: 'Rebelde',
  mystic: 'Místico',
  survivor: 'Superviviente',
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function cardTextHtml(text: string | undefined): string {
  if (!text) return ''
  return escape(text)
    .replace(/&lt;(\/?)(b|i|em|strong)&gt;/g, '<$1$2>')
    .replace(/&lt;hr\s*\/?&gt;/g, '<hr>')
    .replace(/\[\[([^\]]+)\]\]/g, '<i>$1</i>')
    .replace(/\[([a-z_]+)\]/g, (match, name: string) => {
      if (CLASSES[name]) return `<span class="ci cls">${CLASSES[name]}</span>`
      return iconHtml(name) ?? match
    })
    .replace(/\n/g, '<br>')
}
