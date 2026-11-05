import { messages } from '@lcg/i18n'
import { newCampaign, startScenario } from '@lcg/cards'
import { dispatch } from '@lcg/engine'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { expect, it } from 'vitest'
import { tableControllerKey, type TableController } from '../game/tableController'
import ChoiceModal from './ChoiceModal.vue'

it('keeps companion previews separate from the numbered answers on a saved setup prompt', async () => {
  const started = startScenario(newCampaign('edge-of-the-earth', ['joe'], 'standard'), 44)
  const state = dispatch(
    { ...started, pending: null, queue: [] },
    { type: 'InitializeExpedition' },
    { type: 'ChooseExpeditionPartner', investigator: started.investigators[0]!.id },
  )
  const app = createSSRApp(ChoiceModal, { state })
    .use(createI18n({ legacy: false, locale: 'es', messages }))
    .provide(tableControllerKey, {
      choicesByTarget: new Map(),
      answer: () => {},
    } as unknown as TableController)
  const html = await renderToString(app)
  expect(html).toContain('Ver el anverso de Danforth')
  expect(html.match(/aria-expanded="false"/g)).toHaveLength(9)
  expect(html.match(/data-choice-index=/g)).toHaveLength(10)
  expect(html).not.toContain('Ver el anverso de No llevar compañero')
})
