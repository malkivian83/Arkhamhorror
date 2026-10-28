// Narración ES con Baldo, voz elegida por el usuario.
// --list es local; --generate consume ElevenLabs. --key-stdin evita persistir la clave.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const voiceId = 'RnKqZYEeVQciORlpiCz0'
const voiceName = 'Baldo - Husky, Mature and Alluring'
const root = 'apps/web/public/local-assets/story'
const output = join(root, 'audio/es')
const evidencePath = 'docs-proyecto/evidencias/zealot-baldo-narracion.json'
const texts = JSON.parse(readFileSync(join(root, 'es.json'), 'utf8'))
const keys = {
  'story.midnightMasks.intro1': 'midnight-masks-intro1-baldo.mp3',
  'story.midnightMasks.intro2': 'midnight-masks-intro2-baldo.mp3',
  'story.midnightMasks.intro3': 'midnight-masks-intro3-baldo.mp3',
  'story.midnightMasks.resolution1': 'midnight-masks-resolution1-baldo.mp3',
  'story.midnightMasks.resolution2': 'midnight-masks-resolution2-baldo.mp3',
  'story.devourerBelow.intro': 'devourer-below-intro-baldo.mp3',
  'story.devourerBelow.noResolution': 'devourer-below-noResolution-baldo.mp3',
  'story.devourerBelow.resolution1': 'devourer-below-resolution1-baldo.mp3',
  'story.devourerBelow.resolution2': 'devourer-below-resolution2-baldo.mp3',
  'story.devourerBelow.resolution3': 'devourer-below-resolution3-baldo.mp3',
  'story.zealot.prologue': 'zealot-prologue-baldo.mp3',
  'story.theGathering.intro': 'the-gathering-intro-baldo.mp3',
  'story.theGathering.noResolution': 'the-gathering-no-resolution-baldo.mp3',
  'story.theGathering.resolution1': 'the-gathering-resolution1-baldo.mp3',
  'story.theGathering.resolution2': 'the-gathering-resolution2-baldo.mp3',
  'story.theGathering.resolution3': 'the-gathering-resolution3-baldo.mp3',
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
  // Confirmar la identidad de la voz antes de consumir créditos de generación.
  let voiceResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
    headers: { 'xi-api-key': apiKey },
    signal: AbortSignal.timeout(30000),
  })
  if (!voiceResponse.ok) {
    const missing = await voiceResponse
      .clone()
      .json()
      .catch(() => ({}))
    if (missing.detail?.status === 'voice_not_found') {
      const added = await fetch(
        'https://api.elevenlabs.io/v1/voices/add/7002773bd1c07cf8361315f412cee881a7a87dc7b5323a8af5723b58be406be7/' +
          voiceId,
        {
          method: 'POST',
          headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_name: voiceName }),
        },
      )
      if (!added.ok) throw new Error('Add shared Baldo voice: HTTP ' + added.status)
      voiceResponse = await fetch('https://api.elevenlabs.io/v1/voices/' + voiceId, {
        headers: { 'xi-api-key': apiKey },
      })
    }
  }
  if (!voiceResponse.ok) {
    const body = await voiceResponse.json().catch(() => ({}))
    throw new Error(
      `Voice verification: HTTP ${voiceResponse.status}; reason ${body.detail?.status ?? body.detail?.code ?? 'unavailable'}`,
    )
  }
  const verified = await voiceResponse.json()
  if (verified.voice_id !== voiceId || verified.name !== voiceName)
    throw new Error('Voice verification mismatch')
  mkdirSync(output, { recursive: true })
  const evidence = existsSync(evidencePath)
    ? JSON.parse(readFileSync(evidencePath, 'utf8'))
    : { voiceId, voiceName, language: 'es', settings, files: [] }
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
      characters: text.length,
      inputHash,
      sha256: hash(bytes),
      bytes: bytes.length,
    })
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
    console.log(`Generado ${file} (${bytes.length} bytes)`)
  }
}
