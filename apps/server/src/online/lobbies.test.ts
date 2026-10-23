import { describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import type { Database } from '../accounts/database'
import { ApiError } from '../accounts/security'
import { LobbyService, onlineLobbies } from './lobbies'
import { starterDeck, starterInvestigator } from '@lcg/cards'

const deck = (key: 'joe' | 'daniela') => ({
  investigator: starterInvestigator(key).id,
  cards: starterDeck(key),
})

// Transactional adapter for service tests. Real MySQL locking is tested separately.
function memory() {
  const data = new Map<string, string>()
  let tail = Promise.resolve()
  const db = {
    rows: async (_sql: string, args: string[]) =>
      data.has(args[0]!) ? [{ payload: data.get(args[0]!) }] : [],
    exec: async (sql: string, args: string[]) => {
      if (sql.startsWith('INSERT')) data.set(args[0]!, args[2]!)
      else data.set(args[1]!, args[0]!)
    },
    transaction: async <T>(run: (tx: Database) => Promise<T>) => {
      const previous = tail
      let release!: () => void
      tail = new Promise<void>((resolve) => {
        release = resolve
      })
      await previous
      const backup = new Map(data)
      try {
        return await run(db as unknown as Database)
      } catch (error) {
        data.clear()
        for (const [key, value] of backup) data.set(key, value)
        throw error
      } finally {
        release()
      }
    },
  }
  return { db: db as unknown as Database, data }
}

describe('private online lobbies', () => {
  it('prepares and starts a shared game through the HTTP routes for two identities', async () => {
    const app = Fastify()
    app.setErrorHandler((error, _req, reply) =>
      reply.code(error instanceof ApiError ? error.statusCode : 400).send({}),
    )
    onlineLobbies(app, memory().db, {
      requireUser: async (req) => ({
        id: String(req.headers['test-user']),
        name: 'Test',
        email: 'test@example.test',
        verified: 1,
        locale: 'es',
      }),
    })
    const post = (path: string, user: string, body?: object) =>
      app.inject({
        method: 'POST',
        url: `/api/online/lobbies${path}`,
        headers: { 'test-user': user },
        ...(body ? { payload: body } : {}),
      })
    try {
      let lobby = (await post('', 'host')).json()
      const invitation = (await post(`/${lobby.id}/invite`, 'host')).json()
      lobby = (await post(`/${lobby.id}/join`, 'friend', { token: invitation.token })).json()
      expect(
        (await post(`/${lobby.id}/ready`, 'host', { revision: lobby.revision, ready: 'yes' }))
          .statusCode,
      ).toBe(400)
      for (const [user, key] of [
        ['host', 'joe'],
        ['friend', 'daniela'],
      ] as const) {
        const response = await post(`/${lobby.id}/deck`, user, {
          revision: lobby.revision,
          deck: deck(key),
        })
        expect(response.statusCode).toBe(200)
        lobby = response.json()
      }
      for (const user of ['host', 'friend']) {
        const response = await post(`/${lobby.id}/ready`, user, {
          revision: lobby.revision,
          ready: true,
        })
        expect(response.statusCode).toBe(200)
        lobby = response.json()
      }
      const response = await post(`/${lobby.id}/start`, 'host', { revision: lobby.revision })
      expect(response.statusCode).toBe(200)
      expect(response.json().status).toBe('active')
      const friend = await app.inject({
        url: `/api/online/lobbies/${lobby.id}`,
        headers: { 'test-user': 'friend' },
      })
      expect(friend.json()).toEqual(response.json())
    } finally {
      await app.close()
    }
  })
  it('validates decks, ownership and readiness before one durable shared start', async () => {
    const { db, data } = memory(),
      service = new LobbyService(db)
    let lobby = await service.create('host')
    const invitation = await service.invite(lobby.id, 'host')
    lobby = await service.join(lobby.id, 'friend', invitation.token)
    await expect(service.start(lobby.id, 'friend', lobby.revision)).rejects.toMatchObject({
      code: 'not_owner',
    })
    await expect(service.start(lobby.id, 'host', lobby.revision)).rejects.toMatchObject({
      code: 'not_ready',
    })
    await expect(
      service.select(lobby.id, 'outsider', lobby.revision, deck('joe')),
    ).rejects.toMatchObject({ code: 'not_member' })
    await expect(
      service.select(lobby.id, 'host', lobby.revision, { investigator: 'missing', cards: [] }),
    ).rejects.toMatchObject({ code: 'invalid_deck' })
    lobby = await service.select(lobby.id, 'host', lobby.revision, deck('joe'))
    await expect(
      service.select(lobby.id, 'friend', lobby.revision, deck('joe')),
    ).rejects.toMatchObject({ code: 'investigator_taken' })
    await expect(service.ready(lobby.id, 'host', lobby.revision - 1, true)).rejects.toMatchObject({
      code: 'stale_revision',
    })
    lobby = await service.select(lobby.id, 'friend', lobby.revision, deck('daniela'))
    lobby = await service.ready(lobby.id, 'host', lobby.revision, true)
    lobby = await service.ready(lobby.id, 'friend', lobby.revision, true)
    const [first, second] = await Promise.all([
      service.start(lobby.id, 'host', lobby.revision),
      service.start(lobby.id, 'host', lobby.revision),
    ])
    expect(first).toEqual(second)
    expect(first.status).toBe('active')
    expect(first.game?.investigatorCount).toBe(2)
    const persisted = JSON.parse(data.get(lobby.id)!)
    expect(persisted.game.pending).toBeTruthy()
    expect(persisted.game.investigators).toHaveLength(2)
    expect(persisted.invite).toBeUndefined()
    expect(first).not.toHaveProperty('decks')
    expect(first.game).not.toHaveProperty('rng')
    expect(first.game).not.toHaveProperty('investigators')
    expect(await new LobbyService(db).get(lobby.id, 'friend')).toEqual(first)
    await expect(service.join(lobby.id, 'late', invitation.token)).rejects.toMatchObject({
      code: 'already_started',
    })
    await expect(
      service.select(lobby.id, 'host', first.revision, deck('joe')),
    ).rejects.toMatchObject({ code: 'already_started' })
  })
  it('invalidates readiness when configuration, decks or members change', async () => {
    const service = new LobbyService(memory().db)
    let lobby = await service.create('host')
    lobby = await service.select(lobby.id, 'host', lobby.revision, deck('joe'))
    lobby = await service.ready(lobby.id, 'host', lobby.revision, true)
    lobby = await service.configure(lobby.id, 'host', lobby.revision, 'brethren-of-ash', 'hard')
    expect(lobby.seats.every((seat) => !seat.ready)).toBe(true)
    lobby = await service.ready(lobby.id, 'host', lobby.revision, true)
    lobby = await service.select(lobby.id, 'host', lobby.revision, deck('daniela'))
    expect(lobby.seats[0]!.ready).toBe(false)
    lobby = await service.ready(lobby.id, 'host', lobby.revision, true)
    const invitation = await service.invite(lobby.id, 'host')
    lobby = await service.join(lobby.id, 'friend', invitation.token)
    expect(lobby.seats.every((seat) => !seat.ready)).toBe(true)
    await expect(
      service.configure(lobby.id, 'friend', lobby.revision, 'brethren-of-ash', 'easy'),
    ).rejects.toMatchObject({ code: 'not_owner' })
    await expect(
      service.configure(lobby.id, 'host', lobby.revision, 'missing', 'easy'),
    ).rejects.toMatchObject({ code: 'invalid_campaign' })
    expect((await service.get(lobby.id, 'host')).difficulty).toBe('hard')
  })
  it('protects reads and invitations, hashes tokens and allows idempotent joins', async () => {
    const { db, data } = memory(),
      service = new LobbyService(db)
    const lobby = await service.create('owner')
    await expect(service.get(lobby.id, 'stranger')).rejects.toMatchObject({ code: 'not_member' })
    await expect(service.invite(lobby.id, 'stranger')).rejects.toMatchObject({ code: 'not_owner' })
    const invite = await service.invite(lobby.id, 'owner')
    expect(data.get(lobby.id)).not.toContain(invite.token)
    await expect(service.join(lobby.id, 'friend', 'wrong')).rejects.toMatchObject({
      code: 'invalid_invite',
    })
    const joined = await service.join(lobby.id, 'friend', invite.token)
    expect(joined.members).toEqual(['owner', 'friend'])
    expect(await service.join(lobby.id, 'friend', invite.token)).toEqual(joined)
    expect(await service.get(lobby.id, 'friend')).not.toHaveProperty('invite')
  })
  it('revokes, rotates and expires invitations', async () => {
    const service = new LobbyService(memory().db),
      lobby = await service.create('owner')
    const old = await service.invite(lobby.id, 'owner')
    const current = await service.invite(lobby.id, 'owner')
    await expect(service.join(lobby.id, 'a', old.token)).rejects.toMatchObject({
      code: 'invalid_invite',
    })
    const clock = vi.spyOn(Date, 'now').mockReturnValue(current.expiresAt)
    try {
      await expect(service.join(lobby.id, 'a', current.token)).rejects.toMatchObject({
        code: 'invalid_invite',
      })
    } finally {
      clock.mockRestore()
    }
    await service.revoke(lobby.id, 'owner')
    await expect(service.join(lobby.id, 'a', current.token)).rejects.toMatchObject({
      code: 'invalid_invite',
    })
  })
  it('serializes competing joins into the last seat', async () => {
    const service = new LobbyService(memory().db),
      lobby = await service.create('owner')
    const invite = await service.invite(lobby.id, 'owner')
    await service.join(lobby.id, 'a', invite.token)
    await service.join(lobby.id, 'b', invite.token)
    const results = await Promise.allSettled(
      ['c', 'd'].map((user) => service.join(lobby.id, user, invite.token)),
    )
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect((await service.get(lobby.id, 'owner')).members).toHaveLength(4)
  })
  it('applies authentication, mutation protection and request schemas over HTTP', async () => {
    const app = Fastify()
    app.setErrorHandler((error, _req, reply) =>
      reply.code(error instanceof ApiError ? error.statusCode : 400).send({}),
    )
    app.addHook('onRequest', async (req) => {
      if (req.method === 'POST' && req.url === '/api/online/lobbies')
        throw new ApiError('csrf', 403)
    })
    onlineLobbies(app, memory().db, {
      requireUser: async () => {
        throw new ApiError('unauthorized', 401)
      },
    })
    try {
      expect((await app.inject({ method: 'POST', url: '/api/online/lobbies' })).statusCode).toBe(
        403,
      )
      expect(
        (await app.inject('/api/online/lobbies/00000000-0000-4000-8000-000000000000')).statusCode,
      ).toBe(401)
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/online/lobbies/invalid/join',
            payload: { token: 'x' },
          })
        ).statusCode,
      ).toBe(400)
    } finally {
      await app.close()
    }
  })
})
