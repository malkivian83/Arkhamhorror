import { buildApp } from './app'

const port = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 3001)
const app = await buildApp(process.env.WEB_ROOT ? { webRoot: process.env.WEB_ROOT } : {})
await app.listen({ port, host: process.env.SERVER_HOST ?? '127.0.0.1' })
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => {
    void app.close()
  })
