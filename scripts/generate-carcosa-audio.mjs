// Narración ES con Carmelo. --list es local; --generate consume ElevenLabs.
// Reanudable por huella de texto, voz y ajustes, sin publicar credenciales.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const voiceId = '5egO01tkUjEzu7xSSE8M'
const root = 'apps/web/public/local-assets/story'
const output = join(root, 'audio/es')
const evidencePath = 'docs-proyecto/evidencias/carcosa-narracion.json'
const texts = JSON.parse(readFileSync(join(root, 'es.json'), 'utf8'))
const keys = {
  'story.carcosa.prologue': 'carcosa-prologue.mp3',
  'story.carcosa.lolaPrologue': 'carcosa-lola-prologue.mp3',
  'story.curtainCall.intro': 'curtain-call-intro.mp3',
  'story.curtainCall.noResolution': 'curtain-call-no-resolution.mp3',
  'story.curtainCall.resolution1': 'curtain-call-resolution1.mp3',
  'story.curtainCall.resolution2': 'curtain-call-resolution2.mp3',
  'story.theLastKing.intro': 'the-last-king-intro.mp3',
  'story.theLastKing.resolution1': 'the-last-king-resolution1.mp3',
  'story.theLastKing.resolution2': 'the-last-king-resolution2.mp3',
  'story.theLastKing.resolution3': 'the-last-king-resolution3.mp3',
  'story.theLastKing.lunacysReward1': 'lunacys-reward-1.mp3',
  'story.theLastKing.lunacysReward2': 'lunacys-reward-2.mp3',
  'story.theLastKing.lunacysReward3': 'lunacys-reward-3.mp3',
  'story.theLastKing.interviewConstance': 'the-last-king-interview-constance.mp3',
  'story.theLastKing.interviewJordan': 'the-last-king-interview-jordan.mp3',
  'story.theLastKing.interviewHaruko': 'the-last-king-interview-haruko.mp3',
  'story.theLastKing.interviewSebastien': 'the-last-king-interview-sebastien.mp3',
  'story.theLastKing.interviewAshleigh': 'the-last-king-interview-ashleigh.mp3',
  'story.theLastKing.sickeningConstance': 'the-last-king-sickening-constance.mp3',
  'story.theLastKing.sickeningJordan': 'the-last-king-sickening-jordan.mp3',
  'story.theLastKing.sickeningHaruko': 'the-last-king-sickening-haruko.mp3',
  'story.theLastKing.sickeningSebastien': 'the-last-king-sickening-sebastien.mp3',
  'story.theLastKing.sickeningAshleigh': 'the-last-king-sickening-ashleigh.mp3',
  'story.echoes.intro': 'echoes-of-the-past-intro.mp3',
  'story.echoes.sebastien': 'echoes-of-the-past-sebastien.mp3',
  'story.echoes.noResolution': 'echoes-of-the-past-no-resolution.mp3',
  'story.echoes.resolution1': 'echoes-of-the-past-resolution1.mp3',
  'story.echoes.resolution2': 'echoes-of-the-past-resolution2.mp3',
  'story.echoes.resolution3': 'echoes-of-the-past-resolution3.mp3',
  'story.echoes.resolution4': 'echoes-of-the-past-resolution4.mp3',
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
  const text = texts[key].replace(/[_*]/g, '').trim()
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
  if (!/^Carmelo\b/i.test(voice.name)) throw new Error('La voz configurada no es Carmelo')
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
