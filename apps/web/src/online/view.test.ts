import { createSSRApp, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { messages } from '@lcg/i18n'
import { beforeEach, expect, it, vi } from 'vitest'
import { account } from '../account/api'
import type { OnlineLobby } from '@lcg/shared'

const state = vi.hoisted(() => ({ view: null as OnlineLobby | null }))
vi.mock('../stores/decks', () => ({ useDecksStore: () => ({ decks: [] }) }))
vi.mock('./lobby', () => ({
  lobbyClient: () => ({
    lobby: ref(state.view),
    busy: ref(false),
    error: ref(''),
    reset: () => {},
    run: async () => null,
  }),
}))
import OnlineView from '../views/OnlineView.vue'

beforeEach(() => {
  state.view = null
  account.value = { user: null, enabled: true, csrf: null, google: false }
})
async function render(locale: 'en' | 'es' = 'es') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/online/:id?', component: OnlineView },
      { path: '/online/:id/play', component: { template: '<div />' } },
    ],
  })
  await router.push('/online/table')
  await router.isReady()
  return renderToString(
    createSSRApp(OnlineView)
      .use(router)
      .use(createI18n({ legacy: false, locale, messages })),
  )
}
function host() {
  account.value = {
    ...account.value,
    user: {
      id: 'host',
      email: 'host@example.test',
      name: 'Host',
      locale: 'es',
      verified: true,
      role: 'user',
    },
  }
  state.view = {
    id: 'table',
    owner: 'host',
    members: ['host', 'friend'],
    revision: 2,
    status: 'lobby',
    campaignId: 'brethren-of-ash',
    difficulty: 'standard',
    seats: [
      { user: 'host', investigator: '12004', ready: true },
      { user: 'friend', investigator: '12001', ready: false },
    ],
  }
}
it('renders the sign-in path without exposing private preparation controls', async () => {
  const html = await render()
  expect(html).toContain(messages.es.online.login)
  expect(html).not.toContain(messages.es.online.start)
})
it('renders deck selection, readiness and a disabled start until every member is ready', async () => {
  host()
  const html = await render()
  expect(html).toContain(messages.es.online.deck)
  expect(html).toContain(messages.es.online.waiting)
  expect(html).toMatch(/<button[^>]*disabled[^>]*>Iniciar partida<\/button>/)
})
it('renders a shared start in English without a local game launch or private state', async () => {
  host()
  state.view!.status = 'active'
  state.view!.game = {
    scenarioId: 'spreading-flames',
    phase: 'setup',
    round: 0,
    investigatorCount: 2,
  }
  const html = await render('en')
  expect(html).toContain(messages.en.online.started)
  expect(html).toContain(messages.en.online.play.openTable)
  expect(html).not.toContain(messages.en.online.select)
})

it('allows the ready host to start alone and keeps an unready solo table disabled', async () => {
  host()
  state.view!.members = ['host']
  state.view!.seats = [state.view!.seats[0]!]
  expect(await render()).toMatch(/<button(?![^>]*disabled)[^>]*>Iniciar partida<\/button>/)
  state.view!.seats[0]!.ready = false
  expect(await render()).toMatch(/<button[^>]*disabled[^>]*>Iniciar partida<\/button>/)
})

it.each([
  ['es', 1, 'para 1 investigador.'],
  ['es', 2, 'para 2 investigadores.'],
  ['en', 1, 'for 1 investigator.'],
  ['en', 2, 'for 2 investigators.'],
] as const)('renders the investigator count in %s for %i players', async (locale, count, text) => {
  host()
  state.view!.status = 'active'
  state.view!.game = {
    scenarioId: 'spreading-flames',
    phase: 'setup',
    round: 0,
    investigatorCount: count,
  }
  expect(await render(locale)).toContain(text)
})
