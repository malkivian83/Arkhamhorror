// Narración ES de Fortuna e insensatez con Juanjo Relatos. --list es local; --generate consume ElevenLabs.
// Reanudable por huella de texto, voz y ajustes, sin publicar credenciales.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const voiceId = 'DdKbXdRlBmj7Ty7N0FVr'
const root = 'apps/web/public/local-assets/story'
const output = join(root, 'audio/es')
const evidencePath = 'docs-proyecto/evidencias/fortuna-narracion.json'
const texts = JSON.parse(readFileSync(join(root, 'es.json'), 'utf8'))
const keys = {
  'story.fof.intro1': 'fortune-and-folly-intro1.mp3',
  'story.fof.intro3': 'fortune-and-folly-intro3.mp3',
  'story.fof.intro4': 'fortune-and-folly-intro4.mp3',
  'story.fof.intro5': 'fortune-and-folly-intro5.mp3',
  'story.fof.resolution1': 'fortune-and-folly-part1-resolution1.mp3',
  'story.fof.resolution2': 'fortune-and-folly-part1-resolution2.mp3',
  'story.fof.plan1': 'fortune-and-folly-the-plan1.mp3',
  'story.fof.part2Intro': 'fortune-and-folly-part2-intro.mp3',
  'story.fof.part2Resolution1': 'fortune-and-folly-part2-resolution1.mp3',
  'story.fof.part2Resolution2': 'fortune-and-folly-part2-resolution2.mp3',
  'story.fof.part2Resolution3': 'fortune-and-folly-part2-resolution3.mp3',
  'story.fof.relicAcquired': 'fortune-and-folly-relic-acquired.mp3',
  'story.fof.relicFallen': 'fortune-and-folly-relic-fallen.mp3',
  'story.fof.disfavor': 'fortune-and-folly-disfavor.mp3',
  'story.fof.lightsOut': 'fortune-and-folly-lights-out.mp3',
  'story.fof.unlikelyInjuries': 'fortune-and-folly-unlikely-injuries.mp3',
  'story.fof.personalEntanglement': 'fortune-and-folly-personal-entanglement.mp3',
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
  if (!texts[key]) throw new Error(`Falta el relato ${key}`)
  const text = texts[key].replace(/[_*•]/g, '').replace(/\n\n /g, '\n\n').trim()
  if (!text || /<[^>]+>|\{\w+\}/.test(text)) throw new Error(`Relato inválido: ${key}`)
  return { key, file, text }
})

if (!process.argv.includes('--generate')) {
  console.log(JSON.stringify({ voiceId, entries }, null, 2))
} else {
  if (existsSync('.env')) process.loadEnvFile()
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('Falta ELEVENLABS_API_KEY')
  const headers = { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
  const voiceResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
    headers,
    signal: AbortSignal.timeout(30000),
  })
  const recorded = existsSync(evidencePath) ? JSON.parse(readFileSync(evidencePath, 'utf8')) : null
  // Una clave sin permiso de lectura de voces usa la verificación ya registrada de esta voz.
  const voice = voiceResponse.ok
    ? await voiceResponse.json()
    : voiceResponse.status === 401 && recorded?.voiceId === voiceId
      ? { name: recorded.voiceName }
      : null
  if (!voice) throw new Error(`Consulta de voz: HTTP ${voiceResponse.status}`)
  if (!/^Juanjo/i.test(voice.name)) throw new Error('La voz configurada no es Juanjo Relatos')
  mkdirSync(output, { recursive: true })
  const evidence = recorded ?? {
    voiceId,
    voiceName: voice.name,
    language: 'es',
    settings,
    files: [],
  }
  for (const { key, file, text } of entries) {
    const inputHash = hash(JSON.stringify({ text, voiceId, ...settings }))
    const path = join(output, file)
    const previous = evidence.files.find((entry) => entry.key === key)
    if (existsSync(path)) {
      if (previous?.inputHash === inputHash && previous.sha256 === hash(readFileSync(path))) {
        console.log(`Conservado ${file}`)
        continue
      }
      throw new Error(`Ya existe ${file} con otra huella; no se sobrescribe automáticamente`)
    }
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, ...settings }),
        signal: AbortSignal.timeout(120000),
      },
    )
    if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`)
    if (!response.headers.get('content-type')?.includes('audio'))
      throw new Error(`${key}: respuesta sin audio`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length < 1000) throw new Error(`${key}: audio incompleto`)
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
