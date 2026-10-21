import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Reanudable: conserva los MP3 ya generados y nunca imprime la clave de API.
process.loadEnvFile()
const voiceId = 'OjrdP8Z2fWjVyt0scrL7'
const root = 'apps/web/public/local-assets/story'
const texts = JSON.parse(readFileSync(join(root, 'es.json'), 'utf8'))
const entries = Object.entries(texts)
  .filter(([key]) =>
    /^story\.excelsior\.(intro\d|truth\d|culprit\d+|culpritDoom\d+|culpritObjective\d+|noResolution(?:Resigned)?|resolution\d)$/.test(
      key,
    ),
  )
  .map(([key, body]) => {
    const text = body
      .split(/\n\s*\n/)
      .filter((p) => !/^[»•]/.test(p.trim()))
      .map((p) =>
        [...p.matchAll(/_([^]*?)_/g)]
          .map((match) => match[1])
          .join(' ')
          .trim(),
      )
      .filter(Boolean)
      .join('\n\n')
    const suffix = key
      .slice('story.excelsior.'.length)
      .replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
    return { key, text, file: `excelsior-${suffix}.mp3` }
  })

if (process.argv.includes('--list')) {
  console.log(JSON.stringify(entries, null, 2))
} else {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('Falta ELEVENLABS_API_KEY')
  // Las variantes con el mismo relato comparten una única generación.
  const generated = new Map()
  for (const { key, text, file } of entries) {
    const path = join(root, 'audio/es', file)
    if (existsSync(path)) {
      generated.set(text, readFileSync(path))
      console.log(`Conservado ${file}`)
      continue
    }
    let audio = generated.get(text)
    if (!audio) {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.31,
              similarity_boost: 0.86,
              style: 0,
              speed: 1,
              use_speaker_boost: true,
            },
          }),
          signal: AbortSignal.timeout(120000),
        },
      )
      if (!response.ok) throw new Error(`${key}: ${response.status} ${await response.text()}`)
      if (!response.headers.get('content-type')?.includes('audio'))
        throw new Error(`${key}: respuesta sin audio`)
      audio = Buffer.from(await response.arrayBuffer())
      if (audio.length < 1000) throw new Error(`${key}: audio incompleto`)
      generated.set(text, audio)
    }
    writeFileSync(path, audio)
    console.log(`Generado ${file} (${audio.length} bytes)`)
  }
}
