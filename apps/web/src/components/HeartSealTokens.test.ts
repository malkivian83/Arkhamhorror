import { messages } from '@lcg/i18n'
import { heartSeals, newCampaign, startScenario } from '@lcg/cards'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { expect, it } from 'vitest'
import HeartSealTokens from './HeartSealTokens.vue'

it.each(['en', 'es'] as const)('shows seal control and active state in %s', async (locale) => {
  const state = startScenario(newCampaign('edge-of-the-earth', ['joe'], 'standard'), 1)
  state.scenarioMeta = {
    'heart:seal:a': 'l:08649',
    'heart:active:a': 1,
    'heart:seal:b': 'l:08649',
    'heart:active:b': 0,
    'heart:seal:c': 'removed',
    'heart:seal:d': 'i:other',
  }
  const html = await renderToString(
    createSSRApp(HeartSealTokens, { state, holder: 'l:08649' }).use(
      createI18n({ legacy: false, locale, messages }),
    ),
  )
  expect(heartSeals(state)).toHaveLength(3)
  expect(html).toContain('A ✦')
  expect(html).toContain('>B<')
  expect(html).not.toContain('choice.edgeOfTheEarth')
  expect(html.match(/class="(?=[^"]*\bheart-seal\b)(?=[^"]*\bactive\b)[^"]*"/g)).toHaveLength(1)
})
