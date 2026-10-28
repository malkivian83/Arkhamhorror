import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { messages } from '@lcg/i18n'
import { expect, it } from 'vitest'
import ScenarioDeckViewer from './ScenarioDeckViewer.vue'

// RR Act Deck / Agenda Deck: unrevealed faces are not available for inspection.
it.each(['en', 'es'] as const)('hides upcoming cards and current backs in %s', async (locale) => {
  const app = createSSRApp(ScenarioDeckViewer, {
    kind: 'agenda',
    activeIndex: 1,
    hideUnrevealed: true,
    cards: [
      { code: 'privacy-past', name: 'Past card' },
      { code: 'privacy-current', name: 'Current card' },
      { code: 'privacy-future', name: 'Secret future card' },
    ],
  }).use(createI18n({ legacy: false, locale, messages }))
  const context: { teleports?: Record<string, string> } = {}
  await renderToString(app, context)
  const html = context.teleports?.body ?? ''
  expect(html).toContain('Past card')
  expect(html).toContain('Current card')
  expect(html).not.toContain('Secret future card')
  expect(html).not.toContain('privacy-future')
  // Only the already advanced card has a flip button.
  expect(html.match(/aria-pressed="false"/g)).toHaveLength(1)
  expect(html).toContain(messages[locale].table.scenarioDeckRevealedHelp)
})
