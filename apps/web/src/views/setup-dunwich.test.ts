import { createPinia } from 'pinia'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { messages } from '@lcg/i18n'
import { expect, it, vi } from 'vitest'
import SetupView from './SetupView.vue'

// Renderizado de consola: muestra Dunwich sin abrir un navegador.
vi.mock('@lcg/cards', async (original) => {
  const cards = await original<typeof import('@lcg/cards')>()
  return {
    ...cards,
    allCampaigns: () =>
      [...cards.allCampaigns()].sort((a, b) =>
        a.id === 'the-dunwich-legacy' ? -1 : b.id === 'the-dunwich-legacy' ? 1 : 0,
      ),
  }
})

it.each(['en', 'es'] as const)(
  'presents the Dunwich prologue and opening choice in %s',
  async (locale) => {
    const app = createSSRApp(SetupView)
      .use(createPinia())
      .use(createI18n({ legacy: false, locale, messages }))
      .use(createRouter({ history: createMemoryHistory(), routes: [] }))
    const html = await renderToString(app)
    const text = messages[locale]
    expect(html).toContain(text.campaign.names['the-dunwich-legacy'])
    expect(html).toContain(text.story.dunwich.prologue)
    expect(html).toContain(text.setup.openingScenario)
    expect(html).toContain('name="opening-scenario"')
    const rice = html.match(/<input\b[^>]*value="extracurricular-activity"[^>]*>/)?.[0]
    expect(rice).toContain('checked')
    expect(html).toContain('value="the-house-always-wins"')
    const start = html.match(/<button\b[^>]*class="[^"]*\bdock-start\b[^"]*"[^>]*>/)?.[0]
    expect(start).toBeDefined()
    expect(start).not.toContain('disabled')
    expect(html).toContain(text.setup.beginCampaign)
    expect(html).not.toContain('story.dunwich.')
  },
)
