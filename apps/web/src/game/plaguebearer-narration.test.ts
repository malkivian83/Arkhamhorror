import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, expect, it, vi } from 'vitest'
import source from '../../../../packages/i18n/src/plaguebearer.es.json'
import evidence from '../../../../docs-proyecto/evidencias/plaguebearer-narracion.json'
import { storyNarration } from './narration'
import { setAppLocale } from '../i18n'

afterEach(() => vi.unstubAllGlobals())

const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

it('el cuerpo real del modal reconoce los cuarenta y dos relatos oficiales y ofrece sus reproductores', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const locale = /^\/local-assets\/story\/(en|es)\.json$/.exec(url)?.[1]
      if (!locale) throw new Error(`Petición inesperada: ${url}`)
      const text = readFileSync(
        fileURLToPath(new URL(`../../public/local-assets/story/${locale}.json`, import.meta.url)),
        'utf8',
      )
      return new Response(text, { status: 200, headers: { 'content-type': 'application/json' } })
    }),
  )
  const { storyBody } = await import('./story')
  await setAppLocale('es', false)
  await vi.waitFor(() =>
    expect(storyBody('story.plaguebearer.prologue').narration).toBe(
      storyNarration('story.plaguebearer.prologue', 'es'),
    ),
  )
  for (const recording of evidence.files) {
    const body = storyBody(recording.key)
    expect(body.official, recording.key).toBe(true)
    expect(body.officialLocale).toBeNull()
    expect(body.narration).toBe(`/local-assets/story/audio/es/${recording.file}`)
    const narrative = body.paragraphs
      .filter((p) => p.kind === 'text')
      .map((p) => p.spans.map((s) => s.text).join(''))
      .join('\n\n')
    expect(narrative).toBe(recording.text)
  }
  expect(storyBody('story.plaguebearer.setup').narration).toBeNull()
  expect(fetch).toHaveBeenCalledWith('/local-assets/story/es.json', { cache: 'no-cache' })
})

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

it('conecta los cuarenta y dos relatos ES completos con la voz elegida, excluyendo reglas y créditos', () => {
  expect(evidence.voiceId).toBe('z3kTTwYbQrmL7ckdGcJi')
  expect(evidence.voiceName).toBe('Martin Osborne - Polished and Intense')
  expect(evidence.files.map((f) => f.key).sort()).toEqual(
    [
      'prologue',
      'intro',
      'hidden',
      'reagent',
      'resolution1',
      'resolution2',
      'resolution3',
      'night.intro',
      'night.resolution1',
      'night.resolution2',
      ...['section1', 'section2', 'section3', 'section4', 'hidden', 'hiddenGift'].map(
        (k) => `friends.${k}`,
      ),
      ...[
        'intro1',
        'intro2',
        'intro3',
        'intro4',
        'resolution1',
        'resolution2',
        'resolution3',
        'resolution4',
        'resolution5',
        'resolution5Hidden',
      ].map((k) => `dawn.${k}`),
      ...[
        'section1',
        'section2',
        'section3',
        'section4',
        'section5',
        'section6',
        'section7',
        'section8',
        'perks',
        'good',
      ].map((k) => `alive.${k}`),
      ...['intro', 'introHidden', 'defeated', 'defeatedHidden', 'resolution1', 'resolution2'].map(
        (k) => `chorus.${k}`,
      ),
    ]
      .map((s) => `story.plaguebearer.${s}`)
      .sort(),
  )
  for (const recording of evidence.files) {
    const suffix = recording.key.replace('story.plaguebearer.', '')
    const body = suffix
      .split('.')
      .reduce<unknown>(
        (value, key) => (value as Record<string, unknown>)[key],
        source.story,
      ) as string
    const text = body
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
