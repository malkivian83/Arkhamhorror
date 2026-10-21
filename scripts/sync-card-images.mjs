// Build-time import only. The running web app serves these files from its own origin.
import { createServer } from '../apps/web/node_modules/vite/dist/node/index.js'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
})
const root = 'apps/web/public/local-assets/cards'
const manifestPath = 'apps/web/src/game/cardImageManifest.json'
try {
  const { fallbackCards } = await server.ssrLoadModule('/apps/web/src/game/fallbackCards.ts')
  const codes = new Set(fallbackCards('en').map((c) => c.code.replace(/b$/, '')))
  for (let n = 1; n <= 62; n++) codes.add(`71${String(n).padStart(3, '0')}`)
  // Asesinato en el hotel Excelsior.
  for (let n = 1; n <= 52; n++) codes.add(`84${String(n).padStart(3, '0')}`)
  codes.add('10128')
  const spanish = JSON.parse(
    await readFile('docs-proyecto/evidencias/imagenes-espanolas.json', 'utf8'),
  )
  const availableSpanish = new Set(
    spanish.results
      .filter((r) => r.status === 200 && r.type?.startsWith('image/'))
      .map((r) => r.code),
  )
  availableSpanish.add('10128')
  await Promise.all(
    ['es', 'en'].map((language) => mkdir(`${root}/${language}`, { recursive: true })),
  )
  let old = { en: {}, es: {} }
  try {
    old = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    /* First import. */
  }
  const tasks = [...codes]
    .filter((c) => /^\d{5}$/.test(c))
    .flatMap((code) => [code, `${code}b`])
    .flatMap((art) =>
      ['en', ...(availableSpanish.has(art) ? ['es'] : [])].map((language) => ({ art, language })),
    )
  const manifest = { en: {}, es: {} },
    files = [],
    missing = []
  let done = 0
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (tasks.length) {
        const { art, language } = tasks.shift()
        let bytes, source, ext
        const cached = old[language]?.[art]
        if (cached) {
          try {
            bytes = await readFile(`apps/web/public${cached}`)
            ext = cached.split('.').pop()
            source = 'existing local asset'
          } catch {
            /* Restore a missing local file from its original source. */
          }
        }
        if (!bytes)
          for (const suffix of ['avif', 'jpg']) {
            try {
              bytes = await readFile(`${root}/${language}/${art}.${suffix}`)
              ext = suffix
              source = 'existing local asset'
              break
            } catch {
              /* Not imported yet. */
            }
          }
        if (!bytes) {
          const sources =
            language === 'es'
              ? [`https://assets.arkhamhorror.app/img/arkham/es/cards/${art}.avif`]
              : [
                  `https://assets.arkhamhorror.app/img/arkham/cards/${art}.avif`,
                  `https://arkhamdb.com/bundles/cards/${art}.jpg`,
                ]
          for (const url of sources) {
            let response
            try {
              response = await fetch(url, { signal: AbortSignal.timeout(5000) })
            } catch {
              continue
            }
            if (!response.ok) continue
            if (!response.headers.get('content-type')?.startsWith('image/')) continue
            bytes = Buffer.from(await response.arrayBuffer())
            source = url
            ext = response.headers.get('content-type')?.includes('avif') ? 'avif' : 'jpg'
            if (bytes.length < 1000) throw new Error(`Invalid image file: ${url}`)
            break
          }
        }
        if (bytes) {
          const path = `/local-assets/cards/${language}/${art}.${ext}`
          await writeFile(`apps/web/public${path}`, bytes)
          manifest[language][art] = path
          files.push({
            art,
            language,
            path,
            source,
            bytes: bytes.length,
            sha256: createHash('sha256').update(bytes).digest('hex'),
          })
        } else missing.push({ art, language })
        if (++done % 50 === 0) console.log(`Imported/checked ${done} card images`)
      }
    }),
  )
  for (const language of ['en', 'es'])
    manifest[language] = Object.fromEntries(
      Object.entries(manifest[language]).sort(([a], [b]) => a.localeCompare(b)),
    )
  for (const art of codes)
    if (!manifest.en[art] && !manifest.es[art])
      throw new Error(`Missing main card image: ${art}. Restore this file before publishing.`)
  files.sort((a, b) => `${a.language}:${a.art}`.localeCompare(`${b.language}:${b.art}`))
  missing.sort((a, b) => a.art.localeCompare(b.art))
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  await writeFile(
    'docs-proyecto/evidencias/imagenes-locales.json',
    JSON.stringify(
      {
        importedAt: new Date().toISOString(),
        scope:
          'Registered local content plus 10128 requested by the user; files served by our web origin',
        files,
        missing,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(
    JSON.stringify({
      en: Object.keys(manifest.en).length,
      es: Object.keys(manifest.es).length,
      bytes: files.reduce((n, f) => n + f.bytes, 0),
      missing: missing.length,
    }),
  )
} finally {
  await server.close()
}
