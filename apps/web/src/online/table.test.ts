import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import { newCampaign, startScenario } from '@lcg/cards'
import type { OnlineGame } from '@lcg/shared'
import { afterEach, expect, it, vi } from 'vitest'
import { api, ApiError } from '../account/api'
import { accountStorage } from '../account/storage'
import { useGameStore } from '../stores/game'
import { tableControllerKey, useTableGame } from '../game/tableController'
import { gameClient } from './game'
import { onlineTable } from './table'

afterEach(() => vi.unstubAllGlobals())
function fixture(): OnlineGame {
  const table = startScenario(newCampaign('brethren-of-ash', ['joe'], 'standard'), 2)
  table.pending = {
    investigator: table.investigators[0]!.id,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.chooseAction',
      choices: [
        { label: 'action.move', target: { type: 'location', id: 'here' }, then: [] },
        { label: 'action.resource', then: [] },
      ],
    },
  }
  return {
    revision: 8,
    scenarioId: table.scenarioId,
    difficulty: table.difficulty,
    round: 1,
    phase: table.phase,
    doom: 0,
    finished: false,
    cards: [],
    investigators: [],
    test: null,
    table,
    ownInvestigator: table.investigators[0]!.id,
    pending: {
      id: '8',
      investigator: table.pending.investigator,
      choices: [{ label: 'action.move' }, { label: 'action.resource' }],
    },
  }
}
it('maps normal board targets to revisioned server commands and blocks ambiguous double clicks', async () => {
  const view = fixture()
  const request = vi
    .fn()
    .mockResolvedValueOnce(view)
    .mockRejectedValueOnce(new ApiError('network', 0))
    .mockResolvedValueOnce({ ...view, revision: 9 })
  const client = gameClient('room', request as typeof api)
  const table = onlineTable(client)
  await client.refresh()
  expect(table.choicesByTarget.get('location:here')?.[0]?.index).toBe(0)
  expect(table.untargetedChoices[0]?.index).toBe(1)
  table.answer(0)
  table.answer(0)
  await vi.waitFor(() => expect(client.error.value).toBe('network'))
  expect(request).toHaveBeenCalledTimes(2)
  expect(request.mock.calls[1]).toMatchObject([
    '/online/lobbies/room/game/decisions',
    'POST',
    { revision: 8, questionId: '8', choice: 0 },
  ])
  expect(table.choicesByTarget.size).toBe(0)
  expect(table.state!.round).toBe(view.table!.round)
  const command = request.mock.calls[1]![2]
  await client.resend()
  expect(request.mock.calls[2]![2]).toEqual(command)
  expect(table.choicesByTarget.size).toBe(1)
  client.reset()
  expect(table.state).toBeNull()
})
it('does not replace an unchanged snapshot during polling, so open action menus stay open', async () => {
  const view = fixture()
  const client = gameClient(
    'room',
    vi.fn().mockImplementation(async () => structuredClone(view)) as typeof api,
  )
  await client.refresh()
  const first = client.state.value
  await client.refresh()
  expect(client.state.value).toBe(first)
})
it('preserves local state, campaign, persistence and local controller when using the online table', async () => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
  vi.stubGlobal('document', { visibilityState: 'visible' })
  accountStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  const local = useGameStore()
  local.start('brethren-of-ash', ['joe'], 'standard')
  const saved = local.exportSession(),
    localState = local.state,
    stored = [...values]
  const client = gameClient('room', vi.fn().mockResolvedValue(fixture()) as typeof api)
  await client.refresh()
  const online = onlineTable(client)
  let selected: unknown
  const probe = {
    setup() {
      selected = useTableGame()
      return () => h('div')
    },
  }
  await renderToString(createSSRApp(probe).use(pinia).provide(tableControllerKey, online))
  expect(selected).toBe(online)
  online.answerLabel('action.resource')
  await vi.waitFor(() => expect(client.busy.value).toBe(false))
  online.undo('turn')
  online.quit()
  online.closeScenario()
  client.reset()
  expect(local.state).toBe(localState)
  expect(local.exportSession()).toBe(saved)
  expect([...values]).toEqual(stored)
  await renderToString(createSSRApp(probe).use(pinia))
  expect(selected).toBe(local)
})
