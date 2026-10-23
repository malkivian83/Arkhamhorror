import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { expect, it, vi } from 'vitest'
import AnalyticsConsent from './AnalyticsConsent.vue'

vi.mock('../analytics', () => ({
  readAnalyticsConsent: () => null,
  createAnalytics: () => ({ choose: vi.fn(), stop: vi.fn() }),
}))

it.each([
  ['es', 'Estadísticas de uso', 'Aceptar', 'Rechazar'],
  ['en', 'Usage statistics', 'Accept', 'Decline'],
])('renders the consent choices in %s', async (locale, title, accept, reject) => {
  const app = createSSRApp(AnalyticsConsent)
    .use(createI18n({ legacy: false, locale, messages: { en: {}, es: {} } }))
    .use(createRouter({ history: createMemoryHistory(), routes: [] }))
  const html = await renderToString(app)
  expect(html).toContain(title)
  expect(html).toContain(accept)
  expect(html).toContain(reject)
  expect(html).toContain('aria-labelledby="analytics-title"')
})
