import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import evidence from '../../../../docs-proyecto/evidencias/carcosa-narracion.json'
import { allNarrations, storyNarration } from './narration'

describe('narraciones de los textos de historia', () => {
  it('Carcosa has six Spanish recordings with the verified Carmelo voice and matching transcripts', () => {
    expect(evidence.voiceId).toBe('5egO01tkUjEzu7xSSE8M')
    expect(evidence.voiceName).toMatch(/^Carmelo\b/)
    expect(evidence.files).toHaveLength(6)
    const transcripts = JSON.parse(
      readFileSync(
        fileURLToPath(new URL('../../public/local-assets/story/es.json', import.meta.url)),
        'utf8',
      ),
    ) as Record<string, string>
    const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
    for (const recording of evidence.files) {
      const path = storyNarration(recording.key, 'es')!
      expect(path).toBe(`/local-assets/story/audio/es/${recording.file}`)
      expect(storyNarration(recording.key, 'en')).toBeNull()
      const bytes = readFileSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url)))
      expect(bytes.subarray(0, 3).toString()).toBe('ID3')
      expect(bytes.length).toBe(recording.bytes)
      expect(sha256(bytes)).toBe(recording.sha256)
      const text = transcripts[recording.key]!.replace(/[_*]/g, '').trim()
      expect(text.length).toBe(recording.characters)
      expect(
        sha256(JSON.stringify({ text, voiceId: evidence.voiceId, ...evidence.settings })),
      ).toBe(recording.inputHash)
    }
  })
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
    expect(storyNarration('story.queenOfAsh.setup', 'es')).toBeNull()
  })
  it('cada narración es un fichero presente que se sirve desde nuestra web', () => {
    expect(allNarrations().length).toBeGreaterThan(0)
    for (const path of allNarrations())
      expect(existsSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url))), path).toBe(
        true,
      )
  })
})
