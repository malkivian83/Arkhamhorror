// Narración ES de Dunwich con Nico, voz elegida por el usuario.
// --list es local; --generate consume ElevenLabs. --key-stdin evita persistir la clave.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const voiceId = 'iXa2i9eYvgmNMRQRCwqO'
const voiceName = 'Nico - Calm, Rhythmic and Alluring'
const root = 'apps/web/public/local-assets/story'
const output = join(root, 'audio/es')
const evidencePath = 'docs-proyecto/evidencias/dunwich-nico-narracion.json'
const texts = JSON.parse(readFileSync(join(root, 'es.json'), 'utf8'))
const keys = {
  'story.dunwich.prologue': 'dunwich-prologue-nico.mp3',
}
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
const hash = (value) => createHash('sha256').update(value).digest('hex')
const entries = Object.entries(keys).map(([key, file]) => {
  const text = texts[key]?.replace(/[_*]/g, '').trim()
  if (!text || /<[^>]+>|\{\w+\}/.test(text)) throw new Error(`Invalid narrative ${key}`)
  return { key, file, text }
})
if (!process.argv.includes('--generate')) {
  console.log(
    JSON.stringify(
      {
        voiceId,
        voiceName,
        characters: entries.reduce((sum, e) => sum + e.text.length, 0),
        entries,
      },
      null,
      2,
    ),
  )
} else {
  let apiKey
  if (process.argv.includes('--key-stdin')) {
    console.log('Esperando credencial por entrada estándar; no se guardará en archivos.')
    process.stdin.setRawMode?.(true)
    process.stdin.resume()
    apiKey = await new Promise((resolve) => {
      let supplied = ''
      const receive = (chunk) => {
        supplied += String(chunk)
        if (/[\r\n]/.test(supplied)) {
          process.stdin.off('data', receive)
          resolve(supplied.trim())
        }
      }
      process.stdin.on('data', receive)
    })
    process.stdin.setRawMode?.(false)
    process.stdin.pause()
  } else {
    if (existsSync('.env')) process.loadEnvFile()
    apiKey = process.env.ELEVENLABS_API_KEY
  }
  if (!apiKey) throw new Error('Falta ELEVENLABS_API_KEY')
  // La clave puede generar sin voices_read: comprobar la identidad en el catálogo público.
  const voiceSource = 'https://json2video.com/ai-voices/elevenlabs/voices/iXa2i9eYvgmNMRQRCwqO/'
  const voiceResponse = await fetch(voiceSource, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(30000),
  })
  if (!voiceResponse.ok) throw new Error(`Voice verification: HTTP ${voiceResponse.status}`)
  const listing = await voiceResponse.text()
  if (!listing.includes(voiceId) || !listing.includes('Nico') || !listing.includes('Calm'))
    throw new Error('Voice verification mismatch')
  mkdirSync(output, { recursive: true })
  const evidence = existsSync(evidencePath)
    ? JSON.parse(readFileSync(evidencePath, 'utf8'))
    : { voiceId, voiceName, voiceSource, language: 'es', settings, files: [] }
  for (const { key, file, text } of entries) {
    const inputHash = hash(JSON.stringify({ text, voiceId, ...settings }))
    const path = join(output, file)
    const previous = evidence.files.find((entry) => entry.key === key)
    if (existsSync(path)) {
      if (previous?.inputHash === inputHash && previous.sha256 === hash(readFileSync(path))) {
        console.log(`Conservado ${file}`)
        continue
      }
      throw new Error(`Existing audio has a different hash: ${file}`)
    }
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, ...settings }),
        signal: AbortSignal.timeout(120000),
      },
    )
    if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`)
    if (!response.headers.get('content-type')?.includes('audio'))
      throw new Error(`${key}: response is not audio`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length < 1000) throw new Error(`${key}: incomplete audio`)
    writeFileSync(path, bytes)
    evidence.files = evidence.files.filter((entry) => entry.key !== key)
    evidence.files.push({
      key,
      file,
      text,
      characters: text.length,
      inputHash,
      sha256: hash(bytes),
      bytes: bytes.length,
    })
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
    console.log(`Generado ${file} (${bytes.length} bytes)`)
  }
}
