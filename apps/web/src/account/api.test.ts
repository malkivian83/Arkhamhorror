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
const a = { id: 'a', email: 'a@example.com', name: 'A', locale: 'es', verified: true }
it('conserva solo el perfil público para recuperar la copia local sin red', async () => {
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
  expect(values.get('lcg:last-account')).not.toContain('private-csrf')
  vi.resetModules()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
  const offline = await import('./api')
  await offline.loadAccount()
  expect(offline.account.value.user?.id).toBe('a')
  expect(offline.accountOffline.value).toBe(true)
  expect(offline.account.value.csrf).toBeNull()
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
  api.accountOffline.value = true
  await expect(api.recoverAccountSession()).rejects.toMatchObject({ code: 'account_changed' })
  expect(api.account.value.user?.id).toBe('a')
})
it('una sesión expirada elimina el perfil recordado sin adoptar una identidad local', async () => {
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
  expect(values.has('lcg:last-account')).toBe(false)
})
