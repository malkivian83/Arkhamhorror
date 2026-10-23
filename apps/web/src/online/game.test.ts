import { expect, it, vi } from 'vitest'
import type { OnlineGame } from '@lcg/shared'
import { api, ApiError } from '../account/api'
import { gameClient } from './game'

const view: OnlineGame = {
  revision: 3,
  scenarioId: 'spreading-flames',
  difficulty: 'standard',
  phase: 'setup',
  round: 0,
  doom: 0,
  finished: false,
  test: null,
  investigators: [],
  cards: [],
  pending: {
    id: '3',
    investigator: 'joe',
    prompt: 'prompt.chooseAction',
    choices: [{ label: 'action.resource' }],
  },
}
it('retries a lost acknowledgement with the same command and blocks duplicate clicks', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(view)
    .mockRejectedValueOnce(new ApiError('network', 0))
    .mockResolvedValueOnce({ ...view, revision: 4 })
  const client = gameClient('table', request as typeof api)
  await client.refresh()
  await client.choose(0)
  const original = { ...request.mock.calls[1]![2] }
  expect(client.retry.value).toEqual(original)
  await client.choose(0)
  expect(request).toHaveBeenCalledTimes(2)
  await client.resend()
  expect(request.mock.calls[2]![2]).toEqual(original)
  expect(client.retry.value).toBeNull()
  expect(client.state.value?.revision).toBe(4)
})
it('rejects stale snapshots and refreshes after conflicts without replaying the choice', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(view)
    .mockRejectedValueOnce(new ApiError('stale_revision', 409))
    .mockResolvedValueOnce({ ...view, revision: 5 })
    .mockResolvedValueOnce(view)
  const client = gameClient('table', request as typeof api)
  await client.refresh()
  await client.choose(0)
  expect(client.error.value).toBe('stale_revision')
  expect(client.retry.value).toBeNull()
  await client.refresh()
  await client.refresh()
  expect(client.state.value?.revision).toBe(5)
  expect(request.mock.calls.filter((c) => c[1] === 'POST')).toHaveLength(1)
})
it('ignores responses after leaving the room/account and prevents overlapping requests', async () => {
  let finish!: (v: OnlineGame) => void
  const request = vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const client = gameClient('table', request as typeof api)
  const pending = client.refresh()
  await client.refresh()
  expect(request).toHaveBeenCalledTimes(1)
  client.reset()
  finish(view)
  await pending
  expect(client.state.value).toBeNull()
  expect(client.busy.value).toBe(false)
})
it('does not send decisions while waiting for another investigator', async () => {
  const request = vi.fn().mockResolvedValue({ ...view, pending: { ...view.pending, choices: [] } })
  const client = gameClient('table', request as typeof api)
  await client.refresh()
  await client.choose(0)
  expect(request).toHaveBeenCalledTimes(1)
})
it('uses campaign endpoint and preserves a purchase identifier after lost acknowledgement', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(view)
    .mockRejectedValueOnce(new ApiError('network', 0))
    .mockResolvedValueOnce({ ...view, revision: 4 })
  const client = gameClient('table', request as typeof api)
  await client.refresh()
  await client.progress({ action: 'purchase', card: '01030', upgrade: false, remove: '01039' })
  const command = { ...request.mock.calls[1]![2] }
  expect(request.mock.calls[1]![0]).toBe('/online/lobbies/table/game/progress')
  expect(command).toMatchObject({ action: 'purchase', revision: 3, card: '01030', remove: '01039' })
  await client.progress({ action: 'next' })
  expect(request).toHaveBeenCalledTimes(2)
  await client.resend()
  expect(request.mock.calls[2]![2]).toEqual(command)
  expect(client.state.value?.revision).toBe(4)
})
