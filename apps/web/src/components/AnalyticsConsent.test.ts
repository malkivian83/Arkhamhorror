import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { expect, it, vi } from 'vitest'
import { messages } from '@lcg/i18n'
import AnalyticsConsent from './AnalyticsConsent.vue'
import SiteFooter from './SiteFooter.vue'

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

it.each([
  ['es', 'Privacidad · Analytics'],
  ['en', 'Privacy · Analytics'],
])('the privacy settings are a footer link in %s, not a floating button', async (locale, link) => {
  const i18n = () => createI18n({ legacy: false, locale, messages })
  const footer = await renderToString(createSSRApp(SiteFooter).use(i18n()))
  expect(footer).toContain(link)
  const consent = await renderToString(
    createSSRApp(AnalyticsConsent)
      .use(i18n())
      .use(createRouter({ history: createMemoryHistory(), routes: [] })),
  )
  expect(consent).not.toContain('analytics-settings')
})
