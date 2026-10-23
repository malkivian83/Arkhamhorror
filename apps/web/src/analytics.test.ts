import { afterEach, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createAnalytics, MEASUREMENT_ID } from './analytics'

afterEach(() => vi.unstubAllGlobals())

async function setup(saved: string | null = null, enabled = true) {
  const storage = new Map<string, string>()
  if (saved !== null) storage.set('analytics-consent-v1', saved)
  const appendChild = vi.fn()
  const target = { location: { origin: 'https://example.org' } }
  vi.stubGlobal('window', target)
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  })
  vi.stubGlobal('document', { createElement: () => ({}), head: { appendChild } })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'setup', component: {} },
      { path: '/online/:id/play', name: 'online-game', component: {} },
    ],
  })
  await router.push('/')
  const analytics = createAnalytics(router, enabled)
  const commands = () =>
    ((target as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).map((v) => Array.from(v))
  return { analytics, router, appendChild, commands, storage, target }
}

it('does not load Google before acceptance, on rejection or in development', async () => {
  const first = await setup()
  expect(first.appendChild).not.toHaveBeenCalled()
  first.analytics.choose('rejected')
  await first.router.push('/online/private/play?token=secret')
  expect(first.commands()).toEqual([])
  expect(first.appendChild).not.toHaveBeenCalled()
  first.analytics.stop()
  const rejected = await setup('rejected')
  expect(rejected.appendChild).not.toHaveBeenCalled()
  rejected.analytics.stop()
  const development = await setup('accepted', false)
  development.analytics.choose('accepted')
  expect(development.appendChild).not.toHaveBeenCalled()
  expect(development.commands()).toEqual([])
})

it('loads once and records successful navigation without IDs or tokens', async () => {
  const { analytics, router, appendChild, commands } = await setup('accepted')
  expect(appendChild).toHaveBeenCalledExactlyOnceWith({
    async: true,
    src: `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`,
  })
  expect(commands()[0]).toEqual([
    'consent',
    'default',
    expect.objectContaining({ analytics_storage: 'denied', ad_storage: 'denied' }),
  ])
  await router.push('/online/private-room/play?token=secret#private')
  await router.push('/online/private-room/play?token=secret#private')
  const events = commands().filter(([command]) => command === 'event')
  expect(events).toHaveLength(2)
  expect(events[1]).toEqual([
    'event',
    'page_view',
    {
      page_location: 'https://example.org/online/:id/play',
      page_title: 'online-game',
      page_referrer: '',
    },
  ])
  expect(JSON.stringify(commands())).not.toMatch(/private-room|secret/)
  analytics.choose('accepted')
  expect(appendChild).toHaveBeenCalledTimes(1)
})

it('remembers withdrawal, blocks collection and permits later acceptance', async () => {
  const { analytics, router, target, commands, storage, appendChild } = await setup('accepted')
  analytics.choose('rejected')
  expect(storage.get('analytics-consent-v1')).toBe('rejected')
  expect(target).toHaveProperty(`ga-disable-${MEASUREMENT_ID}`, true)
  const count = commands().length
  await router.push('/online/private/play')
  expect(commands()).toHaveLength(count)
  analytics.choose('accepted')
  expect(target).toHaveProperty(`ga-disable-${MEASUREMENT_ID}`, false)
  expect(appendChild).toHaveBeenCalledTimes(1)
  expect(commands().at(-1)?.[0]).toBe('event')
})

it('supports browsers where local storage is unavailable', async () => {
  const { analytics, appendChild } = await setup()
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  })
  analytics.choose('accepted')
  expect(appendChild).toHaveBeenCalledTimes(1)
  analytics.choose('rejected')
})
