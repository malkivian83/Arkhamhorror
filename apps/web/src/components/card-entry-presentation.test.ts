import { computed, createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { messages } from '@lcg/i18n'
import { afterEach, expect, it, vi } from 'vitest'
import { pendingCardTargets } from '../game/cardEntries'
import { tableControllerKey, type TableController } from '../game/tableController'
import TableTarget from './TableTarget.vue'

afterEach(() => vi.unstubAllGlobals())
it('keeps a destination hidden until its queued card is accepted', async () => {
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
  const pending = ref(['enemy:new-copy'])
  const render = () =>
    renderToString(
      createSSRApp({
        render: () =>
          h(TableTarget, { target: 'enemy:new-copy' }, () =>
            h('div', { class: 'game-card' }, 'Revealed card'),
          ),
      })
        .use(createI18n({ legacy: false, locale: 'es', messages }))
        .provide(tableControllerKey, { choicesByTarget: new Map() } as TableController)
        .provide(
          pendingCardTargets,
          computed(() => new Set(pending.value)),
        ),
    )
  expect(await render()).toContain('visibility:hidden')
  pending.value = []
  expect(await render()).not.toContain('visibility:hidden')
})
