import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from './app'

describe('servidor', async () => {
  const app = await buildApp()
  afterAll(() => app.close())

  it('responde a /api/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok' })
  })
})
