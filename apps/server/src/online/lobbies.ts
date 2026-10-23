import { randomInt, randomUUID } from 'node:crypto'
import { newCampaign, startScenario, type Campaign } from '@lcg/cards'
import type { GameState } from '@lcg/engine'
import type { OnlineDeck, OnlineLobby } from '@lcg/shared'
import type { FastifyInstance } from 'fastify'
import type { authentication } from '../accounts/auth'
import type { Database } from '../accounts/database'
import { digest, requireValue, token } from '../accounts/security'

export interface Lobby {
  id: string
  owner: string
  members: string[]
  revision: number
  invite?: { hash: string; expires: number }
  campaignId?: string
  difficulty?: OnlineLobby['difficulty']
  decks?: Record<string, OnlineDeck>
  ready?: string[]
  campaign?: Campaign
  game?: GameState
}
export const lobbyView = (lobby: Lobby): OnlineLobby => ({
  id: lobby.id,
  owner: lobby.owner,
  members: lobby.members,
  revision: lobby.revision,
  status: lobby.game ? 'active' : 'lobby',
  campaignId: lobby.campaignId ?? 'brethren-of-ash',
  difficulty: lobby.difficulty ?? 'standard',
  seats: lobby.members.map((user) => ({
    user,
    investigator: lobby.decks?.[user]?.investigator ?? null,
    ready: lobby.ready?.includes(user) ?? false,
  })),
  ...(lobby.game
    ? {
        game: {
          scenarioId: lobby.game.scenarioId,
          phase: lobby.game.phase,
          round: lobby.game.round,
          investigatorCount: lobby.game.startingInvestigatorCount,
        },
      }
    : {}),
})

/** All membership and invite changes are serialized on the same durable row. */
export class LobbyService {
  constructor(private db: Database) {}
  async create(user: string) {
    const lobby: Lobby = { id: randomUUID(), owner: user, members: [user], revision: 0 }
    await this.db.exec('INSERT INTO online_lobbies (id, owner_id, payload) VALUES (?, ?, ?)', [
      lobby.id,
      user,
      JSON.stringify(lobby),
    ])
    return lobbyView(lobby)
  }
  private async read(db: Database, id: string, lock = false): Promise<Lobby> {
    const [row] = await db.rows<{ payload: string | Lobby }>(
      `SELECT payload FROM online_lobbies WHERE id = ?${lock ? ' FOR UPDATE' : ''}`,
      [id],
    )
    requireValue(row, 'not_found', 404)
    return typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
  }
  async get(id: string, user: string) {
    const lobby = await this.read(this.db, id)
    requireValue(lobby.members.includes(user), 'not_member', 403)
    return lobbyView(lobby)
  }
  private async change<T>(id: string, run: (lobby: Lobby) => T) {
    return this.db.transaction(async (tx) => {
      const lobby = await this.read(tx, id, true)
      const result = run(lobby)
      await tx.exec('UPDATE online_lobbies SET payload = ? WHERE id = ?', [
        JSON.stringify(lobby),
        id,
      ])
      return result
    })
  }
  async invite(id: string, user: string) {
    return this.change(id, (lobby) => {
      requireValue(lobby.owner === user, 'not_owner', 403)
      requireValue(!lobby.game, 'already_started', 409)
      const raw = token()
      lobby.invite = { hash: digest(raw), expires: Date.now() + 86400000 }
      lobby.revision++
      return { token: raw, expiresAt: lobby.invite.expires }
    })
  }
  async revoke(id: string, user: string) {
    return this.change(id, (lobby) => {
      requireValue(lobby.owner === user, 'not_owner', 403)
      delete lobby.invite
      lobby.revision++
      return lobbyView(lobby)
    })
  }
  async join(id: string, user: string, raw: string) {
    return this.change(id, (lobby) => {
      // An existing member can retry a successful join without consuming a seat.
      if (lobby.members.includes(user)) return lobbyView(lobby)
      requireValue(!lobby.game, 'already_started', 409)
      requireValue(
        lobby.invite && lobby.invite.expires > Date.now() && lobby.invite.hash === digest(raw),
        'invalid_invite',
        403,
      )
      requireValue(lobby.members.length < 4, 'lobby_full', 409)
      lobby.members.push(user)
      lobby.ready = []
      lobby.revision++
      return lobbyView(lobby)
    })
  }

  private editable(lobby: Lobby, user: string, revision: number) {
    requireValue(lobby.members.includes(user), 'not_member', 403)
    requireValue(!lobby.game, 'already_started', 409)
    requireValue(lobby.revision === revision, 'stale_revision', 409)
  }
  async configure(
    id: string,
    user: string,
    revision: number,
    campaignId: string,
    difficulty: OnlineLobby['difficulty'],
  ) {
    return this.change(id, (lobby) => {
      this.editable(lobby, user, revision)
      requireValue(lobby.owner === user, 'not_owner', 403)
      // The same authoritative campaign validation is used for setup and start.
      try {
        newCampaign(campaignId, ['joe'], difficulty)
      } catch {
        requireValue(false, 'invalid_campaign')
      }
      lobby.campaignId = campaignId
      lobby.difficulty = difficulty
      lobby.ready = []
      lobby.revision++
      return lobbyView(lobby)
    })
  }
  async select(id: string, user: string, revision: number, deck: OnlineDeck) {
    return this.change(id, (lobby) => {
      this.editable(lobby, user, revision)
      requireValue(
        !Object.entries(lobby.decks ?? {}).some(
          ([owner, other]) => owner !== user && other.investigator === deck.investigator,
        ),
        'investigator_taken',
        409,
      )
      try {
        newCampaign(lobby.campaignId ?? 'brethren-of-ash', [deck], lobby.difficulty ?? 'standard')
      } catch {
        requireValue(false, 'invalid_deck')
      }
      lobby.decks = { ...lobby.decks, [user]: structuredClone(deck) }
      lobby.ready = []
      lobby.revision++
      return lobbyView(lobby)
    })
  }
  async ready(id: string, user: string, revision: number, ready: boolean) {
    return this.change(id, (lobby) => {
      this.editable(lobby, user, revision)
      requireValue(lobby.decks?.[user], 'deck_required')
      lobby.ready = (lobby.ready ?? []).filter((member) => member !== user)
      if (ready) lobby.ready.push(user)
      lobby.revision++
      return lobbyView(lobby)
    })
  }
  async start(id: string, user: string, revision: number) {
    return this.change(id, (lobby) => {
      requireValue(lobby.owner === user, 'not_owner', 403)
      // Retry after a lost acknowledgement must not reroll or create a second game.
      if (lobby.game) return lobbyView(lobby)
      this.editable(lobby, user, revision)
      requireValue(
        lobby.members.length >= 2 &&
          lobby.members.every((member) => lobby.decks?.[member] && lobby.ready?.includes(member)),
        'not_ready',
        409,
      )
      const seed = randomInt(1, 0x7fffffff)
      const campaign = newCampaign(
        lobby.campaignId ?? 'brethren-of-ash',
        lobby.members.map((member) => lobby.decks![member]!),
        lobby.difficulty ?? 'standard',
        seed,
      )
      lobby.game = startScenario(campaign, seed, true)
      lobby.campaign = campaign
      delete lobby.invite
      lobby.revision++
      return lobbyView(lobby)
    })
  }
}

export function onlineLobbies(
  app: FastifyInstance,
  db: Database,
  auth: Pick<ReturnType<typeof authentication>, 'requireUser'>,
) {
  const service = new LobbyService(db)
  const params = {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  }
  const revision = { type: 'integer', minimum: 0 }
  const bodySchema = (properties: Record<string, unknown>) => ({
    type: 'object',
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  })
  app.post<{
    Params: { id: string }
    Body: { revision: number; campaignId: string; difficulty: OnlineLobby['difficulty'] }
  }>(
    '/api/online/lobbies/:id/configure',
    {
      schema: {
        params,
        body: bodySchema({
          revision,
          campaignId: { type: 'string', maxLength: 100 },
          difficulty: { type: 'string', enum: ['easy', 'standard', 'hard', 'expert'] },
        }),
      },
    },
    async (req) =>
      service.configure(
        req.params.id,
        (await auth.requireUser(req)).id,
        req.body.revision,
        req.body.campaignId,
        req.body.difficulty,
      ),
  )
  app.post<{ Params: { id: string }; Body: { revision: number; deck: OnlineDeck } }>(
    '/api/online/lobbies/:id/deck',
    {
      schema: {
        params,
        body: bodySchema({
          revision,
          deck: {
            type: 'object',
            additionalProperties: false,
            required: ['investigator', 'cards'],
            properties: {
              investigator: { type: 'string', minLength: 1, maxLength: 30 },
              cards: { type: 'array', maxItems: 100, items: { type: 'string', maxLength: 30 } },
              startingTrauma: bodySchema({
                physical: { type: 'integer', minimum: 0, maximum: 2 },
                mental: { type: 'integer', minimum: 0, maximum: 2 },
              }),
            },
          },
        }),
      },
    },
    async (req) =>
      service.select(
        req.params.id,
        (await auth.requireUser(req)).id,
        req.body.revision,
        req.body.deck,
      ),
  )
  app.post<{ Params: { id: string }; Body: { revision: number; ready: boolean } }>(
    '/api/online/lobbies/:id/ready',
    { schema: { params, body: bodySchema({ revision, ready: { type: 'boolean' } }) } },
    async (req) =>
      service.ready(
        req.params.id,
        (await auth.requireUser(req)).id,
        req.body.revision,
        req.body.ready,
      ),
  )
  app.post<{ Params: { id: string }; Body: { revision: number } }>(
    '/api/online/lobbies/:id/start',
    { schema: { params, body: bodySchema({ revision }) } },
    async (req) =>
      service.start(req.params.id, (await auth.requireUser(req)).id, req.body.revision),
  )
  app.post('/api/online/lobbies', {}, async (req) =>
    service.create((await auth.requireUser(req)).id),
  )
  app.get<{ Params: { id: string } }>(
    '/api/online/lobbies/:id',
    { schema: { params } },
    async (req) => service.get(req.params.id, (await auth.requireUser(req)).id),
  )
  app.post<{ Params: { id: string } }>(
    '/api/online/lobbies/:id/invite',
    { schema: { params } },
    async (req) => service.invite(req.params.id, (await auth.requireUser(req)).id),
  )
  app.delete<{ Params: { id: string } }>(
    '/api/online/lobbies/:id/invite',
    { schema: { params } },
    async (req) => service.revoke(req.params.id, (await auth.requireUser(req)).id),
  )
  app.post<{ Params: { id: string }; Body: { token: string } }>(
    '/api/online/lobbies/:id/join',
    {
      schema: {
        params,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['token'],
          properties: {
            token: { type: 'string', minLength: 43, maxLength: 43, pattern: '^[A-Za-z0-9_-]+$' },
          },
        },
      },
    },
    async (req) => service.join(req.params.id, (await auth.requireUser(req)).id, req.body.token),
  )
}
