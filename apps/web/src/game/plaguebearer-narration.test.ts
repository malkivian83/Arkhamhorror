import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import source from '../../../../packages/i18n/src/plaguebearer.es.json'
import evidence from '../../../../docs-proyecto/evidencias/plaguebearer-narracion.json'
import { storyNarration } from './narration'

const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

/** Recorre todos los fotogramas MPEG-1 Layer III, independientemente del generador. */
function duration(bytes: Buffer): number {
  expect(bytes.subarray(0, 3).toString()).toBe('ID3')
  let offset =
    10 +
    ((bytes[6]! & 127) << 21) +
    ((bytes[7]! & 127) << 14) +
    ((bytes[8]! & 127) << 7) +
    (bytes[9]! & 127)
  let frames = 0
  const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
  while (offset < bytes.length) {
    expect(bytes[offset], `sync at ${offset}`).toBe(255)
    expect(bytes[offset + 1]! & 0xfe).toBe(0xfa)
    const bitrate = bitrates[bytes[offset + 2]! >> 4]
    const sampleRateIndex = (bytes[offset + 2]! >> 2) & 3
    expect(bitrate).toBe(128)
    expect(sampleRateIndex).toBe(0)
    const padding = (bytes[offset + 2]! >> 1) & 1
    offset += Math.floor((144000 * bitrate!) / 44100) + padding
    frames++
  }
  expect(offset).toBe(bytes.length)
  expect(frames).toBeGreaterThan(20)
  return (frames * 1152) / 44100
}

it('conecta los siete relatos ES completos con la voz elegida, excluyendo reglas y créditos', () => {
  expect(evidence.voiceId).toBe('z3kTTwYbQrmL7ckdGcJi')
  expect(evidence.voiceName).toBe('Martin Osborne - Polished and Intense')
  expect(evidence.files.map((f) => f.key).sort()).toEqual(
    ['prologue', 'intro', 'hidden', 'reagent', 'resolution1', 'resolution2', 'resolution3']
      .map((s) => `story.plaguebearer.${s}`)
      .sort(),
  )
  for (const recording of evidence.files) {
    const suffix = recording.key.split('.').at(-1)! as keyof typeof source.story
    const text = source.story[suffix]
      .split(/\n\s*\n/)
      .filter((p) => !p.trim().startsWith('»') && !p.trim().startsWith('•'))
      .map((p) => p.replace(/[_*]/g, '').trim())
      .join('\n\n')
    expect(recording.text).toBe(text)
    expect(recording.characters).toBe(text.length)
    expect(
      hash(
        JSON.stringify({
          text,
          voiceId: evidence.voiceId,
          format: evidence.format,
          ...evidence.settings,
        }),
      ),
    ).toBe(recording.inputHash)
    const path = storyNarration(recording.key, 'es')!
    expect(path).toBe(`/local-assets/story/audio/es/${recording.file}`)
    expect(storyNarration(recording.key, 'en')).toBeNull()
    const bytes = readFileSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url)))
    expect(bytes.length).toBe(recording.bytes)
    expect(hash(bytes)).toBe(recording.sha256)
    expect(duration(bytes)).toBeGreaterThan(2)
  }
  expect(storyNarration('story.plaguebearer.setup', 'es')).toBeNull()
  expect(evidence.files.find((f) => f.key === 'story.plaguebearer.intro')!.text).not.toContain(
    'Campaña de Walker Graves',
  )
})
