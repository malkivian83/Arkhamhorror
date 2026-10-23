import { createSSRApp, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { messages } from '@lcg/i18n'
import type { OnlineGame } from '@lcg/shared'
import { expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ state: null as OnlineGame | null }))
vi.mock('./game', () => ({
  gameClient: () => ({
    state: ref(mock.state),
    busy: ref(false),
    error: ref(''),
    retry: ref(null),
    refresh: vi.fn(),
    choose: vi.fn(),
    progress: vi.fn(),
    resend: vi.fn(),
    reset: vi.fn(),
  }),
}))
import OnlineGameView from '../components/OnlineGame.vue'

async function render() {
  return renderToString(
    createSSRApp(OnlineGameView, { room: 'table' }).use(
      createI18n({ legacy: false, locale: 'es', messages }),
    ),
  )
}
it('renders the owning player choices and replaces them with waiting when another player decides', async () => {
  mock.state = {
    revision: 1,
    scenarioId: 'spreading-flames',
    difficulty: 'standard',
    round: 1,
    phase: 'investigation',
    doom: 0,
    finished: false,
    test: null,
    cards: [],
    investigators: [],
    pending: {
      id: '1',
      investigator: 'friend',
      prompt: 'prompt.chooseAction',
      choices: [{ label: 'online.ready' }],
    },
  }
  expect(await render()).toContain(messages.es.online.ready)
  mock.state.pending = { id: '2', investigator: 'friend', choices: [] }
  const waiting = await render()
  expect(waiting).toContain('Esperando la decisión')
  expect(waiting).not.toContain(messages.es.online.ready)
  mock.state.pending = null
  mock.state.finished = true
  expect(await render()).toContain(messages.es.online.play.finished)
})
