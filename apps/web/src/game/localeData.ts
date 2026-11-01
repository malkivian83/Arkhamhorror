import type { LocaleBundle } from '@lcg/i18n'
import type { Locale } from '@lcg/shared'

/**
 * Textos y catálogos de cartas de cada idioma, descargados solo cuando hacen falta
 * (doc 100, O1). `main.ts` espera al idioma inicial antes de montar la app, y el cambio
 * de idioma espera al nuevo antes de aplicarlo, así que el acceso síncrono es seguro.
 */
const loaded: Partial<Record<Locale, LocaleBundle>> = {}

const importers: Record<Locale, () => Promise<LocaleBundle>> = {
  en: () => import('@lcg/i18n/en'),
  es: () => import('@lcg/i18n/es'),
}

export async function loadLocaleData(locale: Locale): Promise<LocaleBundle> {
  return (loaded[locale] ??= await importers[locale]())
}

/** Datos de un idioma ya descargado; si aún no lo está, los del que sí lo esté. */
export function localeData(locale: string): LocaleBundle {
  const wanted: Locale = locale === 'es' ? 'es' : 'en'
  const data = loaded[wanted] ?? loaded.en ?? loaded.es
  if (!data) throw new Error(`Locale data not loaded: ${wanted}`)
  return data
}

/** Pruebas y herramientas: datos ya importados de forma síncrona. */
export function provideLocaleData(locale: Locale, data: LocaleBundle) {
  loaded[locale] = data
}
