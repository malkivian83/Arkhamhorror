// --generate consume ElevenLabs; sin él solo enumera los relatos locales.
// Reanuda por huellas y nunca sobrescribe una grabación distinta.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const voiceId = 'z3kTTwYbQrmL7ckdGcJi'
const root = 'apps/web/public/local-assets/story/audio/es'
const evidencePath = 'docs-proyecto/evidencias/plaguebearer-narracion.json'
const sourcePath = 'packages/i18n/src/plaguebearer.es.json'
const source = JSON.parse(readFileSync(sourcePath, 'utf8')).story
const settings = {
  model_id: 'eleven_multilingual_v2',
  voice_settings: {
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.15,
    speed: 0.95,
    use_speaker_boost: true,
  },
}
const format = 'mp3_44100_128'
const hash = (value) => createHash('sha256').update(value).digest('hex')
const entries = [
  'prologue',
  'intro',
  'hidden',
  'reagent',
  'resolution1',
  'resolution2',
  'resolution3',
].map((suffix) => {
  if (!source[suffix]) throw new Error(`Falta ${suffix}`)
  const text = source[suffix]
    .split(/\n\s*\n/)
    .filter((p) => !/^[»•]/.test(p.trim()))
    .map((p) => p.replace(/[_*]/g, '').trim())
    .join('\n\n')
  if (!text || /<[^>]+>|\{\w+\}/.test(text)) throw new Error(`Texto inválido: ${suffix}`)
  return {
    key: `story.plaguebearer.${suffix}`,
    file: `plaguebearer-${suffix.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}-martin-osborne.mp3`,
    text,
  }
})

if (!process.argv.includes('--generate')) {
  console.log(
    JSON.stringify(
      { voiceId, characters: entries.reduce((n, e) => n + e.text.length, 0), entries },
      null,
      2,
    ),
  )
} else {
  if (existsSync('.env')) process.loadEnvFile()
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error('Falta ELEVENLABS_API_KEY')
  const headers = { 'xi-api-key': apiKey }
  const voiceResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
    headers,
    signal: AbortSignal.timeout(30000),
  })
  if (!voiceResponse.ok) throw new Error(`Consulta de voz: HTTP ${voiceResponse.status}`)
  const voice = await voiceResponse.json()
  if (voice.voice_id !== voiceId) throw new Error('La API devolvió otra voz')
  const evidence = existsSync(evidencePath)
    ? JSON.parse(readFileSync(evidencePath, 'utf8'))
    : { voiceId, voiceName: voice.name, language: 'es', sourcePath, format, settings, files: [] }
  if (evidence.voiceId !== voiceId || evidence.format !== format)
    throw new Error('Cambió la voz o el formato registrado')
  mkdirSync(root, { recursive: true })
  for (const entry of entries) {
    const path = join(root, entry.file)
    const inputHash = hash(JSON.stringify({ text: entry.text, voiceId, format, ...settings }))
    const previous = evidence.files.find((e) => e.key === entry.key)
    if (existsSync(path)) {
      if (previous?.inputHash !== inputHash || previous.sha256 !== hash(readFileSync(path)))
        throw new Error(`Grabación con otra huella: ${entry.file}`)
      console.log(`Conservado ${entry.file}`)
      continue
    }
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${format}`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: entry.text, ...settings }),
        signal: AbortSignal.timeout(120000),
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`${entry.key}: HTTP ${response.status} (${error.detail?.status ?? 'error'})`)
    }
    if (!response.headers.get('content-type')?.includes('audio'))
      throw new Error('Respuesta sin audio')
    const bytes = Buffer.from(await response.arrayBuffer())
    const mp3Header =
      bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
    if (bytes.length < 1000 || !mp3Header) throw new Error(`MP3 inválido: ${entry.key}`)
    writeFileSync(path, bytes)
    evidence.files = evidence.files.filter((e) => e.key !== entry.key)
    evidence.files.push({
      ...entry,
      characters: entry.text.length,
      inputHash,
      sha256: hash(bytes),
      bytes: bytes.length,
    })
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
    console.log(`Generado ${entry.file} (${bytes.length} bytes)`)
  }
}
