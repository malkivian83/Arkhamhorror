import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createPinia } from 'pinia'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { messages } from '@lcg/i18n'
import { expect, it, vi } from 'vitest'
import SetupView from './SetupView.vue'

// Seleccionar Carcosa como primera campaña permite comprobar su estado inicial real.
vi.mock('@lcg/cards', async (original) => {
  const cards = await original<typeof import('@lcg/cards')>()
  return {
    ...cards,
    allCampaigns: () =>
      [...cards.allCampaigns()].sort((a, b) =>
        a.id === 'the-path-to-carcosa' ? -1 : b.id === 'the-path-to-carcosa' ? 1 : 0,
      ),
  }
})

it.each(['en', 'es'] as const)(
  'presents the Carcosa campaign in %s, startable now that Curtain Call is playable',
  async (locale) => {
    const app = createSSRApp(SetupView)
      .use(createPinia())
      .use(createI18n({ legacy: false, locale, messages }))
      .use(createRouter({ history: createMemoryHistory(), routes: [] }))
    const html = await renderToString(app)
    const text = messages[locale]
    expect(html).toContain(text.campaign.names['the-path-to-carcosa'])
    expect(html).toContain(text.setup.descriptions['the-path-to-carcosa'])
    for (const id of [
      'curtain-call',
      'the-last-king',
      'echoes-of-the-past',
      'the-unspeakable-oath',
      'a-phantom-of-truth',
      'the-pallid-mask',
      'black-stars-rise',
      'dim-carcosa',
    ] as const)
      expect(html).toContain(text.campaign.scenario[id])
    // Otras campañas del selector pueden estar pendientes; Carcosa sí puede empezar.
    const start = html.match(/<button\b[^>]*class="[^"]*\bdock-start\b[^"]*"[^>]*>/)?.[0]
    expect(start).toBeDefined()
    expect(start).not.toContain('disabled')
    expect(html).toContain(text.setup.beginCampaign)
    expect(html).not.toContain('campaign.scenario.')
    expect(html).toContain('/local-assets/setup/the-path-to-carcosa.jpg')
    expect(
      existsSync(
        resolve(import.meta.dirname, '../../public/local-assets/setup/the-path-to-carcosa.jpg'),
      ),
    ).toBe(true)
  },
)
