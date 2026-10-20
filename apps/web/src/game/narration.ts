/**
 * Narraciones grabadas de los textos de historia, en
 * public/local-assets/story/audio/{idioma}/, por clave i18n del cuerpo. Leen el
 * texto oficial, así que solo se ofrecen en el idioma de la grabación.
 */
const NARRATIONS: Record<string, Partial<Record<string, string>>> = {
  'story.brethrenOfAsh.prologue': { es: 'brethren-of-ash-prologue.mp3' },
  'story.spreadingFlames.intro': { es: 'spreading-flames-intro.mp3' },
  'story.spreadingFlames.noResolution': { es: 'spreading-flames-no-resolution.mp3' },
  'story.spreadingFlames.resolution1': { es: 'spreading-flames-resolution1.mp3' },
  'story.spreadingFlames.resolution2': { es: 'spreading-flames-resolution2.mp3' },
  'story.spreadingFlames.resolution3': { es: 'spreading-flames-resolution3.mp3' },
  'story.smokeAndMirrors.intro': { es: 'smoke-and-mirrors-intro.mp3' },
  'story.smokeAndMirrors.codex1Attempt': { es: 'smoke-and-mirrors-codex1-attempt.mp3' },
  'story.smokeAndMirrors.codex1': { es: 'smoke-and-mirrors-codex1.mp3' },
  'story.smokeAndMirrors.codex2Attempt': { es: 'smoke-and-mirrors-codex2-attempt.mp3' },
  'story.smokeAndMirrors.codex2': { es: 'smoke-and-mirrors-codex2.mp3' },
  'story.smokeAndMirrors.codex3Attempt': { es: 'smoke-and-mirrors-codex3-attempt.mp3' },
  'story.smokeAndMirrors.codex3': { es: 'smoke-and-mirrors-codex3.mp3' },
  'story.smokeAndMirrors.codex4Attempt': { es: 'smoke-and-mirrors-codex4-attempt.mp3' },
  'story.smokeAndMirrors.codex4': { es: 'smoke-and-mirrors-codex4.mp3' },
  'story.smokeAndMirrors.codex5Attempt': { es: 'smoke-and-mirrors-codex5-attempt.mp3' },
  'story.smokeAndMirrors.codex5': { es: 'smoke-and-mirrors-codex5.mp3' },
  'story.smokeAndMirrors.codex6Attempt': { es: 'smoke-and-mirrors-codex6-attempt.mp3' },
  'story.smokeAndMirrors.codex6': { es: 'smoke-and-mirrors-codex6.mp3' },
  'story.smokeAndMirrors.codexServant': { es: 'smoke-and-mirrors-codex-servant.mp3' },
  'story.smokeAndMirrors.noResolution': { es: 'smoke-and-mirrors-no-resolution.mp3' },
  'story.smokeAndMirrors.resolution1': { es: 'smoke-and-mirrors-resolution1.mp3' },
  'story.smokeAndMirrors.resolution2': { es: 'smoke-and-mirrors-resolution2.mp3' },
  'story.queenOfAsh.intro1': { es: 'queen-of-ash-intro-1.mp3' },
  'story.queenOfAsh.intro2': { es: 'queen-of-ash-intro-2.mp3' },
  'story.queenOfAsh.intro3': { es: 'queen-of-ash-intro-3.mp3' },
  'story.queenOfAsh.codex.DavidRenfield': { es: 'queen-of-ash-codex-david-renfield.mp3' },
  'story.queenOfAsh.codex.CorneliaAkely': { es: 'queen-of-ash-codex-cornelia-akely.mp3' },
  'story.queenOfAsh.codex.NaomiOBannion': { es: 'queen-of-ash-codex-naomi-obannion.mp3' },
  'story.queenOfAsh.codex.SgtEarlMonroe': { es: 'queen-of-ash-codex-sgt-earl-monroe.mp3' },
  'story.queenOfAsh.codex.AbigailForeman': { es: 'queen-of-ash-codex-abigail-foreman.mp3' },
  'story.queenOfAsh.codex.MargaretLiu': { es: 'queen-of-ash-codex-margaret-liu.mp3' },
  'story.queenOfAsh.noResolution': { es: 'queen-of-ash-no-resolution.mp3' },
  'story.queenOfAsh.resolution1': { es: 'queen-of-ash-resolution1.mp3' },
  'story.queenOfAsh.resolution2': { es: 'queen-of-ash-resolution2.mp3' },
  'story.queenOfAsh.resolution3': { es: 'queen-of-ash-resolution3.mp3' },
  'story.midwinterGala.intro1': { es: 'midwinter-gala-intro1.mp3' },
  'story.midwinterGala.intro2': { es: 'midwinter-gala-intro2.mp3' },
  'story.midwinterGala.contact': { es: 'midwinter-gala-contact.mp3' },
  'story.midwinterGala.faction.foundation': { es: 'midwinter-gala-faction-foundation.mp3' },
  'story.midwinterGala.faction.miskatonic': { es: 'midwinter-gala-faction-miskatonic.mp3' },
  'story.midwinterGala.faction.syndicate': { es: 'midwinter-gala-faction-syndicate.mp3' },
  'story.midwinterGala.faction.lodge': { es: 'midwinter-gala-faction-lodge.mp3' },
  'story.midwinterGala.faction.kingsport': { es: 'midwinter-gala-faction-kingsport.mp3' },
  'story.midwinterGala.noResolution': { es: 'midwinter-gala-no-resolution.mp3' },
  'story.midwinterGala.resolution1': { es: 'midwinter-gala-resolution1.mp3' },
  'story.midwinterGala.resolution2': { es: 'midwinter-gala-resolution2.mp3' },
  'story.midwinterGala.resolution3': { es: 'midwinter-gala-resolution3.mp3' },
  'story.midwinterGala.resolution4': { es: 'midwinter-gala-resolution4.mp3' },
  'story.midwinterGala.resolution5': { es: 'midwinter-gala-resolution5.mp3' },
  'story.midwinterGala.resolution6': { es: 'midwinter-gala-resolution6.mp3' },
  'story.midwinterGala.resolution7': { es: 'midwinter-gala-resolution7.mp3' },
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
