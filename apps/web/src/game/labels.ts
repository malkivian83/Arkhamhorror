import type { LabelParams } from '@lcg/engine'
import { useI18n } from 'vue-i18n'
import { localName } from './localized'

/** Traduce una clave del motor, traduciendo también los parámetros que son claves (habilidad, fase). */
export function useLabels() {
  const { t } = useI18n()
  return (key: string, params: LabelParams = {}) => {
    // Los nombres de cartas que guarda el motor están en inglés: se traducen si hay datos.
    const translated: LabelParams = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, typeof v === 'string' ? localName(v) : v]),
    )
    if (typeof params.skill === 'string') translated.skill = t(`skill.${params.skill}`)
    if (typeof params.phase === 'string') translated.phase = t(`phase.${params.phase}`)
    if (params.kind === 'damage' || params.kind === 'horror') {
      translated.kind = t(`damageKind.${params.kind}`)
    }
    // Con un número {n}, los textos con "singular | plural" eligen su forma.
    return typeof params.n === 'number' ? t(key, translated, params.n) : t(key, translated)
  }
}
