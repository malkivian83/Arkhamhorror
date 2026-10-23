import { beforeEach, afterEach, expect, it, vi } from 'vitest'
let values: Map<string, string>
beforeEach(() => {
  vi.resetModules()
  values = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
})
afterEach(() => vi.unstubAllGlobals())

it('distinguishes account connection failures from unsaved library changes and preserves mail errors', async () => {
  const request = vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError'))
  vi.stubGlobal('fetch', request)
  const { api } = await import('./api')
  await expect(api('/auth/register', 'POST', {})).rejects.toMatchObject({
    code: 'auth_network',
    status: 0,
  })
  await expect(api('/auth/login', 'POST', {})).rejects.toMatchObject({
    code: 'auth_network',
    status: 0,
  })
  await expect(api('/library')).rejects.toMatchObject({ code: 'network', status: 0 })
  request.mockResolvedValue(
    new Response(JSON.stringify({ code: 'mail_unavailable' }), { status: 503 }),
  )
  await expect(api('/auth/register', 'POST', {})).rejects.toMatchObject({
    code: 'mail_unavailable',
    status: 503,
  })
})
const a = {
  id: 'a',
  email: 'a@example.com',
  name: 'A',
  locale: 'es',
  verified: true,
  role: 'user' as const,
}
it('carga la cuenta solo del servidor y no recuerda el perfil en el navegador', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ user: a, csrf: 'private-csrf', enabled: true, google: true }),
        ),
      ),
  )
  const first = await import('./api')
  await first.loadAccount()
  expect(first.account.value.user?.id).toBe('a')
  expect(values.size).toBe(0)
  values.set('lcg:last-account', JSON.stringify({ user: a, google: true }))
  vi.resetModules()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
  const offline = await import('./api')
  await offline.loadAccount()
  expect(offline.account.value.user).toBeNull()
  expect(offline.account.value.enabled).toBe(false)
})
it('no reanuda una cola con otra identidad cuando vuelve la conexión', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ user: { ...a, id: 'b' }, csrf: 'b-csrf', enabled: true, google: true }),
        ),
      ),
  )
  const api = await import('./api')
  api.account.value = { user: a, csrf: null, enabled: true, google: true }
  await expect(api.recoverAccountSession()).rejects.toMatchObject({ code: 'account_changed' })
  expect(api.account.value.user?.id).toBe('a')
})
it('una sesión expirada no adopta el perfil antiguo del navegador', async () => {
  values.set('lcg:last-account', JSON.stringify({ user: a, google: true }))
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ user: null, csrf: null, enabled: true, google: true })),
      ),
  )
  const api = await import('./api')
  await api.loadAccount()
  expect(api.account.value.user).toBeNull()
  expect(api.account.value.csrf).toBeNull()
})
