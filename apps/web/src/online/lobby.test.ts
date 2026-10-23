import { expect, it, vi } from 'vitest'
import type { OnlineLobby } from '@lcg/shared'
import { api, ApiError } from '../account/api'
import { lobbyClient } from './lobby'

const view: OnlineLobby = {
  id: 'table',
  owner: 'host',
  members: ['host'],
  revision: 3,
  status: 'lobby',
  campaignId: 'brethren-of-ash',
  difficulty: 'standard',
  seats: [],
}

it('keeps the latest view and uses the existing authenticated API for mutations', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(view)
    .mockResolvedValueOnce({ ...view, revision: 2 })
  const client = lobbyClient(request as typeof api)
  await client.run('/table')
  await client.run('/table/ready', 'POST', { revision: 3, ready: true })
  expect(request).toHaveBeenLastCalledWith('/online/lobbies/table/ready', 'POST', {
    revision: 3,
    ready: true,
  })
  expect(client.lobby.value?.revision).toBe(3)
})
it('does not install a response from a departed account or overwrite a new request busy state', async () => {
  let finish!: (value: OnlineLobby) => void
  const request = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    .mockResolvedValueOnce({ ...view, id: 'other' })
  const client = lobbyClient(request as typeof api)
  const old = client.run('/table')
  expect(await client.run('/table')).toBeNull()
  client.reset()
  await client.run('/other')
  finish(view)
  await old
  expect(client.lobby.value?.id).toBe('other')
  expect(client.busy.value).toBe(false)
})
it('keeps the existing lobby on connection failure and reports conflict for a deliberate retry', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(view)
    .mockRejectedValueOnce(new ApiError('stale_revision', 409))
  const client = lobbyClient(request as typeof api)
  await client.run('/table')
  await client.run('/table/start', 'POST', { revision: 3 })
  expect(client.error.value).toBe('stale_revision')
  expect(client.lobby.value).toEqual(view)
  expect(client.busy.value).toBe(false)
})
