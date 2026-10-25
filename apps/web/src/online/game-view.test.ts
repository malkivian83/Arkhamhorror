import { createSSRApp, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { messages } from '@lcg/i18n'
import { newCampaign, startScenario } from '@lcg/cards'
import type { OnlineGame } from '@lcg/shared'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

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
import PlayerArea from '../components/PlayerArea.vue'
import { onlineTable } from './table'
import { gameClient } from './game'
import { tableControllerKey } from '../game/tableController'

beforeEach(() => {
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    innerWidth: 1400,
    innerHeight: 900,
  })
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
afterEach(() => vi.unstubAllGlobals())
function fixture() {
  const table = startScenario(newCampaign('brethren-of-ash', ['joe', 'daniela'], 'standard'), 1)
  const mine = table.investigators[0]!.id
  table.investigators[0]!.hand = ['01030']
  table.investigators[1]!.hand = []
  table.pending = {
    investigator: mine,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.chooseAction',
      choices: [{ label: 'action.resource', then: [] }],
    },
  }
  mock.state = {
    revision: 1,
    table,
    ownInvestigator: mine,
    scenarioId: table.scenarioId,
    difficulty: table.difficulty,
    round: 1,
    phase: 'investigation',
    doom: 0,
    finished: false,
    test: null,
    cards: [],
    investigators: table.investigators.map((i) => ({
      id: i.id,
      name: i.name,
      damage: 0,
      horror: 0,
      resources: 5,
      clues: 0,
      actionsRemaining: 3,
      location: i.location,
      eliminated: false,
      handCount: 5,
      deckCount: 25,
    })),
    pending: { id: '1', investigator: mine, choices: [{ label: 'action.resource' }] },
  }
  return table
}
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: OnlineGameView }],
  })
  await router.push('/')
  return renderToString(
    createSSRApp(OnlineGameView, { room: 'table' })
      .use(router)
      .use(createI18n({ legacy: false, locale: 'es', messages })),
  )
}
it('renders the actual local table components and only the owning player decision controls', async () => {
  const table = fixture()
  const html = await render()
  for (const marker of ['class="table"', 'scenario-row', 'board', 'player-desk', 'side'])
    expect(html).toContain(marker)
  expect(html).toContain(messages.es.action.resource)
  expect(html).not.toContain('class="undo"')
  table.pending!.question.choices = []
  table.pending!.question.prompt = 'game.waitingFor'
  table.pending!.question.promptParams = { name: 'Daniela' }
  const waiting = await render()
  expect(waiting).toContain('Daniela')
  expect(waiting).not.toContain('class="overlay"')
})
it('shows card backs and a count, with no hand inspection control, for another player', async () => {
  const state = fixture()
  const app = createSSRApp(PlayerArea, {
    state,
    investigator: state.investigators[1],
    deciding: false,
    privateHand: true,
    handCount: 5,
  })
    .provide(tableControllerKey, onlineTable(gameClient('room')))
    .use(createI18n({ legacy: false, locale: 'es', messages }))
  const html = await renderToString(app)
  expect(html.match(/class="private-card"/g)).toHaveLength(5)
  expect(html).not.toContain('class="view-hand"')
})
it('shows shared intermission instead of local campaign navigation and removes it for the next scenario', async () => {
  const table = fixture()
  table.pending = null
  table.outcome = { type: 'resolution', resolution: 1 }
  mock.state!.finished = true
  mock.state!.canFinish = true
  let html = await render()
  expect(html).toContain(messages.es.online.campaignPlay.finish)
  expect(html).not.toContain('class="story end"')
  mock.state!.campaign = {
    canManage: true,
    nextScenario: 'smoke-and-mirrors',
    canContinue: true,
    ready: false,
    allReady: false,
    transfers: [],
    lost: false,
    awaitingReplacement: false,
    replacement: null,
    members: [],
    own: { deck: [], removable: [], options: [] },
  }
  html = await render()
  expect(html).toContain(messages.es.online.campaignPlay.title)
  fixture()
  expect(await render()).not.toContain('class="intermission"')
})
