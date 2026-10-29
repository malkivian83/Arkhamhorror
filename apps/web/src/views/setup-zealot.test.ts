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

vi.mock('@lcg/cards', async (original) => {
  const cards = await original<typeof import('@lcg/cards')>()
  return {
    ...cards,
    allCampaigns: () =>
      [...cards.allCampaigns()].sort((a, b) =>
        a.id === 'night-of-the-zealot' ? -1 : b.id === 'night-of-the-zealot' ? 1 : 0,
      ),
  }
})

it.each(['en', 'es'] as const)(
  'shows the playable first scenario and the two pending scenarios in %s',
  async (locale) => {
    const app = createSSRApp(SetupView)
      .use(createPinia())
      .use(createI18n({ legacy: false, locale, messages }))
      .use(createRouter({ history: createMemoryHistory(), routes: [] }))
    const html = await renderToString(app)
    const text = messages[locale]
    expect(html).toContain(text.campaign.names['night-of-the-zealot'])
    expect(html).toContain(text.setup.descriptions['night-of-the-zealot'])
    for (const id of ['the-gathering', 'the-midnight-masks', 'the-devourer-below'] as const)
      expect(html).toContain(text.campaign.scenario[id])
    expect(html).toContain(text.setup.beginCampaign)
    expect(html).not.toContain('name="encounter-set-variant"')
    expect(html).not.toContain('campaign.scenario.')
    expect(html).toContain('/local-assets/setup/night-of-the-zealot.jpg')
    expect(
      existsSync(
        resolve(import.meta.dirname, '../../public/local-assets/setup/night-of-the-zealot.jpg'),
      ),
    ).toBe(true)
  },
)
