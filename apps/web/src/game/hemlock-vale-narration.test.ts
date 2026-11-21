import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import evidence from '../../../../docs-proyecto/evidencias/hemlock-vale-narracion.json'
import texts from '../../../../packages/i18n/src/hemlock-vale.es.json'
import { setAppLocale } from '../i18n'
import manifest from './hemlockValeNarrationManifest.json'
import { storyNarration } from './narration'
import { storyBody } from './story'

const hash = (input: Buffer | string) => createHash('sha256').update(input).digest('hex')
const story = texts.story as Record<string, Record<string, { body?: string }>>

it('cada relato del Valle tiene su grabación verificada o figura como pendiente', () => {
  expect(evidence.voiceId).toBe('Nh2zY9kknu6z4pZy6FhD')
  const recorded = Object.keys(manifest)
  const pending = (evidence.pending as { key: string }[]).map(({ key }) => key)
  expect(recorded.filter((key) => pending.includes(key))).toEqual([])
  for (const key of [...recorded, ...pending]) {
    const [, scenario, part] = key.split('.')
    expect(story[scenario!]?.[part!]?.body).toBeTruthy()
  }
  for (const [key, file] of Object.entries(manifest as Record<string, string>)) {
    const recording = evidence.files.find((f) => f.file === file)!
    expect(recording.keys).toContain(key)
    const path = storyNarration(key, 'es')
    expect(path).toBe(`/local-assets/story/audio/es/${file}`)
    const audio = readFileSync(new URL(`../../public${path}`, import.meta.url))
    expect(hash(audio)).toBe(recording.audioSha256)
    expect(storyNarration(key, 'en')).toBeNull()
  }
  // Las reglas no se graban.
  expect(storyNarration('story.hemlockHouse.setup.body', 'es')).toBeNull()
})

it('ofrece la grabación en el modal del relato en español', async () => {
  const [key] = Object.keys(manifest)
  if (!key) return
  await setAppLocale('es', false)
  expect(storyBody(key).narration).toBe(storyNarration(key, 'es'))
  await setAppLocale('en', false)
  expect(storyBody(key).narration).toBeNull()
})
