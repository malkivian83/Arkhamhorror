import type { LabelParams } from '@lcg/engine'
import { useI18n } from 'vue-i18n'

/** Traduce una clave del motor, traduciendo también los parámetros que son claves (habilidad, fase). */
export function useLabels() {
  const { t } = useI18n()
  return (key: string, params: LabelParams = {}) => {
    const translated: LabelParams = { ...params }
    if (typeof params.skill === 'string') translated.skill = t(`skill.${params.skill}`)
    if (typeof params.phase === 'string') translated.phase = t(`phase.${params.phase}`)
    return t(key, translated)
  }
}
