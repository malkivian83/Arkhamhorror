import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from '../apps/web/node_modules/vite/dist/node/index.js'

const path = process.argv[2]
if (!path) {
  console.error('Uso: node scripts/replay-diagnostic.mjs <arkham-diagnostic.json>')
  process.exitCode = 1
} else {
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
  })
  try {
    const { reproduceDiagnostic } = await server.ssrLoadModule('/apps/web/src/game/session.ts')
    const result = reproduceDiagnostic(await readFile(path, 'utf8'))
    console.log(
      JSON.stringify(
        {
          scenario: result.data.state?.scenarioId,
          engine: result.data.state?.engineVersion,
          content: result.data.content,
          decisions: result.data.history?.inputs.length ?? 0,
          recordedError: result.recordedError,
          reproducedError: result.reproducedError,
          outcome: result.after?.outcome,
          pending: result.after?.pending?.question.prompt,
        },
        null,
        2,
      ),
    )
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 1
  } finally {
    await server.close()
  }
}
