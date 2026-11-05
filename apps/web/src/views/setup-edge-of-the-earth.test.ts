import { createPinia } from 'pinia'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { messages } from '@lcg/i18n'
import { expect, it, vi } from 'vitest'
import SetupView from './SetupView.vue'

vi.mock('@lcg/cards', async (original) => {
  const cards = await original<typeof import('@lcg/cards')>()
  return {
    ...cards,
    allCampaigns: () =>
      [...cards.allCampaigns()].sort(
        (a, b) => Number(b.id === 'edge-of-the-earth') - Number(a.id === 'edge-of-the-earth'),
      ),
  }
})

it.each(['en', 'es'] as const)(
  'offers Ice and Death from the campaign selector in %s',
  async (locale) => {
    const app = createSSRApp(SetupView)
      .use(createPinia())
      .use(createI18n({ legacy: false, locale, messages }))
      .use(createRouter({ history: createMemoryHistory(), routes: [] }))
    const html = await renderToString(app)
    expect(html).toContain(messages[locale].campaign.names['edge-of-the-earth'])
    expect(html).toContain(messages[locale].campaign.scenario['ice-and-death-part-1'])
    const start = html.match(/<button\b[^>]*class="[^"]*\bdock-start\b[^"]*"[^>]*>/)?.[0]
    expect(start).toBeDefined()
    expect(start).not.toContain('disabled')
  },
)
