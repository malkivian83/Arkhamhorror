import { campaignDefinition, type Campaign } from '@lcg/cards'
import { i18n } from '../i18n'

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

/** Portada local de una campaña. */
export const campaignCover = (id: string) => `/local-assets/setup/${id}.jpg`
