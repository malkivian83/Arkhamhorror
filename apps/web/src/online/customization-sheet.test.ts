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

const sheet = (props: Record<string, unknown>) =>
  renderToString(
    createSSRApp(CustomizationSheet, { code: '09119', xp: 2, removable: ['01030'], ...props }).use(
      createI18n({ legacy: false, locale: 'es', messages }),
    ),
  )

it('customizes an owned copy without buying another or removing a card', async () => {
  const html = await sheet({ copies: 1, sheet: {}, full: true })
  expect(html).toContain('Tienes 1 en el mazo')
  // No new copy by default, so a full deck does not ask for a removal.
  expect(html).toContain('Pagar mejoras (0 exp.)')
  expect(html).not.toContain(messages.es.campaign.remove)
  expect(html).toContain(messages.es.customization.markBox)
  expect(html).toContain('aria-disabled="true"')
})

it('requires the card that leaves when a new copy enters a full deck', async () => {
  const full = await sheet({ copies: 0, full: true })
  expect(full).toContain(messages.es.customization.notOwned)
  expect(full).toContain(messages.es.customization.chooseRemoval)
  expect(full).not.toContain(messages.es.customization.noRemoval)
  const room = await sheet({ copies: 0, full: false })
  expect(room).toContain(messages.es.customization.noRemoval)
})
