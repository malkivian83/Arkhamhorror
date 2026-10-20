import { createServer } from '../../apps/web/node_modules/vite/dist/node/index.js'

/** Read the current registry, without starting a game or changing account storage. */
export async function inspectRuntime() {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
  })
  try {
    const { isImplemented } = await server.ssrLoadModule('/packages/cards/src/index.ts')
    const { allPlayerCardDefs } = await server.ssrLoadModule('/packages/engine/src/index.ts')
    return allPlayerCardDefs()
      .map((card) => ({ ...card, behaviorRegistered: isImplemented(card.code) }))
      .sort((a, b) => a.code.localeCompare(b.code))
  } finally {
    await server.close()
  }
}
