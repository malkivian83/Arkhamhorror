/**
 * Narraciones grabadas de los textos de historia, en
 * public/local-assets/story/audio/{idioma}/, por clave i18n del cuerpo. Leen el
 * texto oficial, así que solo se ofrecen en el idioma de la grabación.
 */
const NARRATIONS: Record<string, Partial<Record<string, string>>> = {
  'story.brethrenOfAsh.prologue': { es: 'brethren-of-ash-prologue.mp3' },
  'story.spreadingFlames.intro': { es: 'spreading-flames-intro.mp3' },
  'story.spreadingFlames.noResolution': { es: 'spreading-flames-no-resolution.mp3' },
  'story.smokeAndMirrors.intro': { es: 'smoke-and-mirrors-intro.mp3' },
  'story.queenOfAsh.intro1': { es: 'queen-of-ash-intro-1.mp3' },
  'story.queenOfAsh.intro2': { es: 'queen-of-ash-intro-2.mp3' },
  'story.queenOfAsh.intro3': { es: 'queen-of-ash-intro-3.mp3' },
}

/** Ruta de la narración de un texto en un idioma, si está grabada. */
export function storyNarration(key: string, locale: string): string | null {
  const file = NARRATIONS[key]?.[locale]
  return file ? `/local-assets/story/audio/${locale}/${file}` : null
}

/** Todas las narraciones grabadas (para comprobar que los ficheros existen). */
export function allNarrations(): string[] {
  return Object.entries(NARRATIONS).flatMap(([key, locales]) =>
    Object.keys(locales).map((locale) => storyNarration(key, locale)!),
  )
}
