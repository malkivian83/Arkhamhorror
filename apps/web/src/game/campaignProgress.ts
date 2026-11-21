import { campaignDefinition, type Campaign } from '@lcg/cards'
import { i18n } from '../i18n'
import { fallbackCards } from './fallbackCards'
import { localizedCards } from './localized'

export function campaignNoteValue(note: string, value: string): string {
  if (note !== 'edgeOfTheEarthSurvivors') return value
  const catalog = fallbackCards(i18n.global.locale)
  return value
    .split(',')
    .map(
      (code) =>
        localizedCards.value.get(code)?.name ?? catalog.find((c) => c.code === code)?.name ?? code,
    )
    .join(', ')
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/**
 * «Escenario II: Smoke and Mirrors» para el escenario en curso de una campaña.
 * Vacío en una campaña de un solo escenario (el título ya lo dice todo) o si la
 * campaña o el escenario no existen en esta versión.
 */
export function scenarioLabel(campaign: Campaign, scenarioId: string | null): string {
  const { t, te } = i18n.global
  try {
    if (
      !scenarioId ||
      !te(`campaign.scenario.${scenarioId}`) ||
      campaignDefinition(campaign.id).scenarios.length < 2
    )
      return ''
  } catch {
    return ''
  }
  return t('library.scenario', {
    n: ROMAN[campaign.scenarioIndex] ?? campaign.scenarioIndex + 1,
    name: t(`campaign.scenario.${scenarioId}`),
  })
}

/**
 * Versión de las portadas que se publicaron después de que el navegador guardara su 404
 * (el servidor cachea un día también los errores de /local-assets).
 */
const COVER_VERSIONS: Record<string, number> = {
  'call-of-the-plaguebearer': 2,
  'the-feast-of-hemlock-vale': 2,
}

/** Portada local de una campaña. */
export const campaignCover = (id: string) =>
  `/local-assets/setup/${id}.jpg${COVER_VERSIONS[id] ? `?v=${COVER_VERSIONS[id]}` : ''}`
