import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { messages } from '@lcg/i18n'
import '@lcg/cards'
import { expect, it } from 'vitest'
import CustomizationSheet from '../components/CustomizationSheet.vue'

it.each(['en', 'es'] as const)(
  'renders the full upgrade sheet in %s without a browser',
  async (locale) => {
    const html = await renderToString(
      createSSRApp(CustomizationSheet, {
        code: '09119',
        copies: 1,
        sheet: { telescanner: 2, empoweredConfiguration: 4 },
        xp: 3,
      }).use(createI18n({ legacy: false, locale, messages })),
    )
    for (const key of [
      'railshooter',
      'telescanner',
      'translocator',
      'realitycollapser',
      'matterweaver',
      'aethericLink',
      'empoweredConfiguration',
    ] as const)
      expect(html).toContain(messages[locale].customization[key])
    expect(html).toContain(locale === 'es' ? '6 PX marcados · nivel 3' : '6 XP marked · level 3')
    expect(html).toMatch(/value="0" disabled/)
  },
)
