import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { allNarrations, storyNarration } from './narration'

describe('narraciones de los textos de historia', () => {
  it('el prólogo de Los Hermanos de la Ceniza y la introducción de Spreading Flames tienen voz en español', () => {
    expect(storyNarration('story.brethrenOfAsh.prologue', 'es')).toBe(
      '/local-assets/story/audio/es/brethren-of-ash-prologue.mp3',
    )
    expect(storyNarration('story.spreadingFlames.intro', 'es')).toBe(
      '/local-assets/story/audio/es/spreading-flames-intro.mp3',
    )
  })
  it('no ofrece la grabación española en otro idioma ni en textos sin grabar', () => {
    expect(storyNarration('story.brethrenOfAsh.prologue', 'en')).toBeNull()
    expect(storyNarration('story.queenOfAsh.resolution1', 'es')).toBeNull()
  })
  it('cada narración es un fichero presente que se sirve desde nuestra web', () => {
    expect(allNarrations().length).toBeGreaterThan(0)
    for (const path of allNarrations())
      expect(existsSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url))), path).toBe(
        true,
      )
  })
})
