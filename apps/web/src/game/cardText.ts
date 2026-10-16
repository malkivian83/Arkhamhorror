/**
 * Convierte el texto de carta de ArkhamDB (con marcas como [action], <b>,
 * [[Rasgo]]) en HTML seguro: se escapa todo y solo se reintroducen las marcas
 * conocidas.
 */
const ICONS: Record<string, string> = {
  action: '<span class="ci act" title="acción">➤</span>',
  fast: '<span class="ci fast" title="rápida">ϟ</span>',
  free: '<span class="ci fast" title="rápida">ϟ</span>',
  reaction: '<span class="ci react" title="reacción">⟲</span>',
  willpower: '<span class="ci sk wil">V</span>',
  intellect: '<span class="ci sk int">I</span>',
  combat: '<span class="ci sk com">C</span>',
  agility: '<span class="ci sk agi">A</span>',
  wild: '<span class="ci sk wild">?</span>',
  skull: '<span class="ci tok">☠</span>',
  cultist: '<span class="ci tok">⚉</span>',
  tablet: '<span class="ci tok">▤</span>',
  elder_thing: '<span class="ci tok">✷</span>',
  elder_sign: '<span class="ci tok">✪</span>',
  auto_fail: '<span class="ci tok">⊗</span>',
  per_investigator: '<span class="ci per" title="por investigador">/inv</span>',
  bless: '<span class="ci tok">✚</span>',
  curse: '<span class="ci tok">✖</span>',
  guardian: '<span class="ci cls">Guardián</span>',
  seeker: '<span class="ci cls">Buscador</span>',
  rogue: '<span class="ci cls">Rebelde</span>',
  mystic: '<span class="ci cls">Místico</span>',
  survivor: '<span class="ci cls">Superviviente</span>',
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function cardTextHtml(text: string | undefined): string {
  if (!text) return ''
  return escape(text)
    .replace(/&lt;(\/?)(b|i|em|strong)&gt;/g, '<$1$2>')
    .replace(/\[\[([^\]]+)\]\]/g, '<i>$1</i>')
    .replace(/\[([a-z_]+)\]/g, (match, name: string) => ICONS[name] ?? match)
    .replace(/\n/g, '<br>')
}
