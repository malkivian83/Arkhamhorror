// Authoring-time availability audit. sync-card-images.mjs imports the actual files.
import { createServer } from '../apps/web/node_modules/vite/dist/node/index.js'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
const cataloguePath =
  process.env.REFERENCE_ES_DIGEST ?? 'D:/referencia/ArkhamHorror-main/frontend/src/digests/es.json'
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
})
try {
  const { fallbackCards } = await server.ssrLoadModule('/apps/web/src/game/fallbackCards.ts')
  const codes = new Set(fallbackCards('en').map((c) => c.code.replace(/b$/, '')))
  for (let n = 1; n <= 62; n++) codes.add(`71${String(n).padStart(3, '0')}`)
  const pending = [...codes].filter((c) => /^\d{5}$/.test(c)).flatMap((c) => [c, `${c}b`])
  const results = []
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (pending.length) {
        const code = pending.shift()
        const url = `https://assets.arkhamhorror.app/img/arkham/es/cards/${code}.avif`
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) })
        results.push({
          code,
          status: response.status,
          type: response.headers.get('content-type'),
          bytes: Number(response.headers.get('content-length') ?? 0),
        })
      }
    }),
  )
  results.sort((a, b) => a.code.localeCompare(b.code))
  const original = await readFile(cataloguePath, 'utf8')
  for (const result of results)
    if (result.status !== 200 && result.status !== 404)
      throw new Error(`Uncertain image availability: ${JSON.stringify(result)}`)
  const report = {
    checkedAt: new Date().toISOString(),
    referenceCatalogue: 'frontend/src/digests/es.json',
    referenceCatalogueSha256: createHash('sha256').update(original).digest('hex'),
    method: 'HEAD; only HTTP 200 image/* is available; no image files copied',
    results,
  }
  await writeFile(
    'docs-proyecto/evidencias/imagenes-espanolas.json',
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log(
    JSON.stringify({
      checked: results.length,
      available: results.filter((r) => r.status === 200).length,
      galaAvailable: results.filter((r) => r.status === 200 && r.code.startsWith('71')).length,
    }),
  )
} finally {
  await server.close()
}
