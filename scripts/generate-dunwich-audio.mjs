// Narración ES de Dunwich con Nico, voz elegida por el usuario.
// --list es local; --generate consume ElevenLabs. --key-stdin evita persistir la clave.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const voiceId = 'FXn3GKRRt9FCEyTbrkaL'
const voiceName = 'Nico - History & Documentary'
const root = 'apps/web/public/local-assets/story'
const output = join(root, 'audio/es')
const evidencePath = 'docs-proyecto/evidencias/dunwich-nico-narracion.json'
const texts = JSON.parse(readFileSync(join(root, 'es.json'), 'utf8'))
const keys = {
  'story.unseen.intro': 'unseen-intro-nico-history.mp3',
  'story.unseen.part1': 'unseen-part1-nico-history.mp3',
  'story.unseen.part2': 'unseen-part2-nico-history.mp3',
  'story.unseen.resolution1': 'unseen-resolution1-nico-history.mp3',
  'story.unseen.resolution2': 'unseen-resolution2-nico-history.mp3',
  'story.unseen.formulaWithArmitage': 'unseen-formulawitharmitage-nico-history.mp3',
  'story.unseen.formulaWithoutArmitage': 'unseen-formulawithoutarmitage-nico-history.mp3',
  'story.unseen.storm': 'unseen-storm-nico-history.mp3',

  'story.altar.intro': 'altar-intro-nico-history.mp3',
  'story.altar.noResolution': 'altar-noresolution-nico-history.mp3',
  'story.altar.resolution1': 'altar-resolution1-nico-history.mp3',
  'story.altar.resolution2': 'altar-resolution2-nico-history.mp3',
  'story.altar.resolution3': 'altar-resolution3-nico-history.mp3',
  'story.altar.survivors': 'altar-survivors-nico-history.mp3',
  'story.altar.survivor02040': 'altar-survivor02040-nico-history.mp3',
  'story.altar.survivor02061': 'altar-survivor02061-nico-history.mp3',
  'story.altar.survivor02080': 'altar-survivor02080-nico-history.mp3',
  'story.altar.survivor02217': 'altar-survivor02217-nico-history.mp3',
  'story.altar.survivor02218': 'altar-survivor02218-nico-history.mp3',

  'story.essex.intro': 'essex-intro-nico-history.mp3',
  'story.essex.defeated': 'essex-defeated-nico-history.mp3',
  'story.essex.resolution1': 'essex-resolution1-nico-history.mp3',
  'story.essex.resolution2': 'essex-resolution2-nico-history.mp3',

  'story.museum.intro': 'museum-intro-nico-history.mp3',
  'story.museum.intro1': 'museum-intro1-nico-history.mp3',
  'story.museum.intro2': 'museum-intro2-nico-history.mp3',
  'story.museum.noResolution': 'museum-noresolution-nico-history.mp3',
  'story.museum.resolution1': 'museum-resolution1-nico-history.mp3',
  'story.museum.resolution2': 'museum-resolution2-nico-history.mp3',

  'story.house.intro': 'house-intro-nico-history.mp3',
  'story.house.resolution1': 'house-resolution1-nico-history.mp3',
  'story.house.resolution2': 'house-resolution2-nico-history.mp3',
  'story.house.resolution3': 'house-resolution3-nico-history.mp3',
  'story.house.resolution4': 'house-resolution4-nico-history.mp3',
  'story.house.armitage1': 'dunwich-armitage1-nico-history.mp3',
  'story.house.armitage2': 'dunwich-armitage2-nico-history.mp3',

  'story.dunwich.prologue': 'dunwich-prologue-nico-history.mp3',
  'story.extracurricular.intro': 'extracurricular-intro-nico-history.mp3',
  'story.extracurricular.noResolution': 'extracurricular-noresolution-nico-history.mp3',
  'story.extracurricular.resolution1': 'extracurricular-resolution1-nico-history.mp3',
  'story.extracurricular.resolution2': 'extracurricular-resolution2-nico-history.mp3',
  'story.extracurricular.resolution3': 'extracurricular-resolution3-nico-history.mp3',
  'story.extracurricular.resolution4': 'extracurricular-resolution4-nico-history.mp3',
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
  // Identificador confirmado por el usuario desde la ficha de la voz.
  const voiceSource = 'https://elevenlabs.io/app/voice-library?voiceId=FXn3GKRRt9FCEyTbrkaL'
  mkdirSync(output, { recursive: true })
  const savedEvidence = existsSync(evidencePath)
    ? JSON.parse(readFileSync(evidencePath, 'utf8'))
    : { voiceId, voiceName, voiceSource, language: 'es', settings, files: [] }
  const evidence =
    savedEvidence.voiceId === voiceId
      ? savedEvidence
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
