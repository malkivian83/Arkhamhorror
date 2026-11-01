import { messages } from '@lcg/i18n'
import type { GameState } from '@lcg/engine'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { expect, it } from 'vitest'
import { tableControllerKey, type TableController } from '../game/tableController'
import QuickActions from './QuickActions.vue'

const choice = (label: string) => ({ label, then: [] })
const state = (investigator: string) =>
  ({
    pending: {
      investigator,
      question: { kind: 'chooseOne', prompt: 'prompt.chooseAction', choices: [] },
    },
  }) as unknown as GameState

async function render(controller: Partial<TableController>, deciding = 'a') {
  const app = createSSRApp(QuickActions, { state: state(deciding) })
    .use(createI18n({ legacy: false, locale: 'es', messages }))
    .provide(tableControllerKey, controller as TableController)
  return renderToString(app)
}

const untargetedChoices = [
  { index: 3, choice: choice('action.draw') },
  { index: 4, choice: choice('action.endTurn') },
]

it('keeps the choices without a table target one tap away on narrow screens (D5)', async () => {
  const html = await render({ untargetedChoices, answer: () => {} })
  expect(html).toContain('class="quick-actions"')
  expect(html.match(/data-choice-index="(\d)"/g)).toEqual([
    'data-choice-index="3"',
    'data-choice-index="4"',
  ])
  expect(html).toContain(messages.es.action.draw)
})

it('online, shows nothing while another player decides', async () => {
  const online = { online: true, ownInvestigator: 'b', untargetedChoices, answer: () => {} }
  expect(await render(online, 'a')).not.toContain('quick-actions')
  expect(await render(online, 'b')).toContain('quick-actions')
})
