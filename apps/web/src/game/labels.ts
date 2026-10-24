import type { LabelParams } from '@lcg/engine'
import { useI18n } from 'vue-i18n'
import { cardName } from './cards'
import { localName } from './localized'

/** Traduce una clave del motor, traduciendo también los parámetros que son claves (habilidad, fase). */
export function useLabels() {
  const { t, te } = useI18n()
  return (key: string, params: LabelParams = {}) => {
    // Los nombres de cartas que guarda el motor están en inglés: se traducen si hay datos.
    // Las partidas guardadas pueden traer aún el código de la carta en vez de su nombre.
    const translated: LabelParams = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [
        k,
        typeof v === 'string' ? localName(k === 'card' ? cardName(v) : v) : v,
      ]),
    )
    if (typeof params.skill === 'string') translated.skill = t(`skill.${params.skill}`)
    if (typeof params.phase === 'string') translated.phase = t(`phase.${params.phase}`)
    if (typeof params.scenario === 'string')
      translated.scenario = t(`campaign.scenario.${params.scenario}`)
    if (params.kind === 'damage' || params.kind === 'horror') {
      translated.kind = t(`damageKind.${params.kind}`)
    }
    // Origen del daño: una carta o una ficha del caos; el texto "…From" lo nombra.
    if (typeof params.source === 'string') {
      const token = params.source.startsWith('token:') ? params.source.slice(6) : null
      translated.source = token ? t(`chaosTokenName.${token}`) : localName(cardName(params.source))
      if (te(`${key}From`)) key = `${key}From`
    }
    // Con un número {n}, los textos con "singular | plural" eligen su forma.
    return typeof params.n === 'number' ? t(key, translated, params.n) : t(key, translated)
  }
}
