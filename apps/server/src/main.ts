import { buildApp } from './app'

const port = Number(process.env.SERVER_PORT ?? 3001)
const app = await buildApp()
await app.listen({ port, host: '0.0.0.0' })
