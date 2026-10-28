import { randomInt, randomUUID } from 'node:crypto'
import {
  newCampaign,
  startScenario,
  finishScenario,
  purchase,
  customize,
  activeMembers,
  canPlayNext,
  chooseTransferHeir,
  replaceInvestigator,
  type Campaign,
} from '@lcg/cards'
import { applyInput, type GameState } from '@lcg/engine'
import type { OnlineCommand, OnlineDeck, OnlineLobby, OnlineProgressCommand } from '@lcg/shared'
import { gameView } from './game'
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
  commands?: Record<string, { user: string; signature: string }>
  intermission?: boolean
  campaignReady?: string[]
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
  async game(id: string, user: string) {
    const lobby = await this.read(this.db, id)
    requireValue(lobby.members.includes(user), 'not_member', 403)
    requireValue(lobby.game, 'not_started', 409)
    return gameView(lobby, user)
  }
  async decide(id: string, user: string, command: OnlineCommand) {
    return this.change(id, (lobby) => {
      requireValue(lobby.members.includes(user), 'not_member', 403)
      requireValue(lobby.game, 'not_started', 409)
      const signature = JSON.stringify([command.revision, command.questionId, command.choice])
      const prior = lobby.commands?.[command.commandId]
      if (prior) {
        requireValue(prior.user === user && prior.signature === signature, 'command_conflict', 409)
        return gameView(lobby, user)
      }
      requireValue(lobby.revision === command.revision, 'stale_revision', 409)
      const pending = lobby.game.pending
      requireValue(
        pending && !lobby.game.outcome && command.questionId === String(lobby.revision),
        'stale_question',
        409,
      )
      requireValue(
        pending.investigator === lobby.decks?.[user]?.investigator,
        'not_your_decision',
        403,
      )
      requireValue(
        Number.isInteger(command.choice) &&
          command.choice >= 0 &&
          command.choice < pending.question.choices.length,
        'invalid_choice',
      )
      lobby.game = applyInput(lobby.game, {
        investigator: pending.investigator,
        choice: command.choice,
      })
      lobby.commands = { ...lobby.commands, [command.commandId]: { user, signature } }
      lobby.revision++
      return gameView(lobby, user)
    })
  }
  async progress(id: string, user: string, command: OnlineProgressCommand) {
    return this.change(id, (lobby) => {
      requireValue(lobby.members.includes(user), 'not_member', 403)
      requireValue(lobby.game && lobby.campaign, 'not_started', 409)
      const signature = JSON.stringify([
        'progress',
        command.revision,
        command.action,
        command.action === 'purchase'
          ? [command.card, command.upgrade, command.remove ?? null]
          : command.action === 'customize'
            ? [command.card, command.sheet, command.copies ?? null, command.removals ?? null]
            : command.action === 'heir'
              ? [command.card, command.heir]
              : command.action === 'replace'
                ? command.deck
                : command.action === 'ready'
                  ? command.ready
                  : null,
      ])
      const prior = lobby.commands?.[command.commandId]
      if (prior) {
        requireValue(prior.user === user && prior.signature === signature, 'command_conflict', 409)
        return gameView(lobby, user)
      }
      requireValue(command.revision === lobby.revision, 'stale_revision', 409)
      requireValue(lobby.game.outcome, 'scenario_not_finished', 409)
      if (command.action === 'finish') {
        requireValue(lobby.owner === user, 'not_owner', 403)
        requireValue(!lobby.intermission, 'already_finished', 409)
        lobby.campaign = finishScenario(lobby.campaign, lobby.game)
        lobby.intermission = true
        lobby.campaignReady = []
      } else if (command.action === 'heir') {
        requireValue(lobby.intermission, 'not_intermission', 409)
        requireValue(lobby.owner === user, 'not_owner', 403)
        try {
          lobby.campaign = chooseTransferHeir(lobby.campaign, command.card, command.heir)
        } catch {
          requireValue(false, 'invalid_heir')
        }
      } else if (command.action === 'replace') {
        requireValue(lobby.intermission, 'not_intermission', 409)
        const leaving = lobby.decks?.[user]?.investigator
        requireValue(leaving, 'inactive_investigator', 403)
        try {
          lobby.campaign = replaceInvestigator(
            lobby.campaign,
            leaving,
            command.deck,
            randomInt(1, 0x7fffffff),
          )
        } catch {
          requireValue(false, 'invalid_replacement')
        }
        lobby.decks = { ...lobby.decks, [user]: structuredClone(command.deck) }
        lobby.campaignReady = (lobby.campaignReady ?? []).filter((member) => member !== user)
      } else {
        requireValue(lobby.intermission, 'not_intermission', 409)
        requireValue(canPlayNext(lobby.campaign), 'campaign_cannot_continue', 409)
        const investigator = lobby.decks?.[user]?.investigator
        const active = activeMembers(lobby.campaign)
        if (command.action === 'next') {
          requireValue(lobby.owner === user, 'not_owner', 403)
          requireValue(
            active.every((i) =>
              lobby.members.some(
                (member) =>
                  lobby.decks?.[member]?.investigator === i.id &&
                  lobby.campaignReady?.includes(member),
              ),
            ),
            'not_ready',
            409,
          )
          lobby.game = startScenario(lobby.campaign, randomInt(1, 0x7fffffff), true)
          lobby.intermission = false
          lobby.campaignReady = []
        } else {
          requireValue(
            investigator && active.some((i) => i.id === investigator),
            'inactive_investigator',
            403,
          )
          if (command.action === 'ready') {
            lobby.campaignReady = (lobby.campaignReady ?? []).filter((member) => member !== user)
            if (command.ready) lobby.campaignReady.push(user)
          } else {
            try {
              lobby.campaign =
                command.action === 'customize'
                  ? customize(lobby.campaign, investigator, command.card, command.sheet, {
                      ...(command.copies !== undefined ? { copies: command.copies } : {}),
                      ...(command.removals ? { remove: command.removals } : {}),
                    })
                  : purchase(lobby.campaign, investigator, command.card, {
                      upgrade: command.upgrade,
                      ...(command.remove ? { remove: command.remove } : {}),
                    })
            } catch {
              requireValue(false, 'invalid_purchase')
            }
            lobby.campaignReady = (lobby.campaignReady ?? []).filter((member) => member !== user)
          }
        }
      }
      lobby.commands = { ...lobby.commands, [command.commandId]: { user, signature } }
      lobby.revision++
      return gameView(lobby, user)
    })
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
        lobby.members.length >= 1 &&
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
  const deckSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['investigator', 'cards'],
    properties: {
      investigator: { type: 'string', minLength: 1, maxLength: 30 },
      cards: { type: 'array', maxItems: 100, items: { type: 'string', maxLength: 30 } },
      customizations: {
        type: 'object',
        maxProperties: 50,
        additionalProperties: {
          type: 'object',
          maxProperties: 30,
          additionalProperties: { type: 'integer', minimum: 0, maximum: 10 },
        },
      },
      startingTrauma: bodySchema({
        physical: { type: 'integer', minimum: 0, maximum: 2 },
        mental: { type: 'integer', minimum: 0, maximum: 2 },
      }),
    },
  }
  app.post<{ Params: { id: string }; Body: OnlineProgressCommand }>(
    '/api/online/lobbies/:id/game/progress',
    {
      schema: {
        params,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['commandId', 'revision', 'action'],
          properties: {
            commandId: { type: 'string', format: 'uuid' },
            revision,
            action: {
              type: 'string',
              enum: ['finish', 'purchase', 'customize', 'ready', 'next', 'heir', 'replace'],
            },
            card: { type: 'string', minLength: 1, maxLength: 30 },
            upgrade: { type: 'boolean' },
            sheet: {
              type: 'object',
              maxProperties: 30,
              additionalProperties: { type: 'integer', minimum: 0, maximum: 10 },
            },
            copies: { type: 'integer', minimum: 0, maximum: 2 },
            removals: { type: 'array', maxItems: 2, items: { type: 'string', maxLength: 30 } },
            remove: { type: 'string', minLength: 1, maxLength: 30 },
            ready: { type: 'boolean' },
            heir: { type: 'string', minLength: 1, maxLength: 30 },
            deck: deckSchema,
          },
          allOf: [
            {
              if: { properties: { action: { const: 'customize' } } },
              then: { required: ['card', 'sheet'] },
            },
            {
              if: { properties: { action: { const: 'purchase' } } },
              then: { required: ['card', 'upgrade'] },
            },
            { if: { properties: { action: { const: 'ready' } } }, then: { required: ['ready'] } },
            {
              if: { properties: { action: { const: 'heir' } } },
              then: { required: ['card', 'heir'] },
            },
            { if: { properties: { action: { const: 'replace' } } }, then: { required: ['deck'] } },
          ],
        },
      },
    },
    async (req) => service.progress(req.params.id, (await auth.requireUser(req)).id, req.body),
  )
  app.get<{ Params: { id: string } }>(
    '/api/online/lobbies/:id/game',
    { schema: { params } },
    async (req) => service.game(req.params.id, (await auth.requireUser(req)).id),
  )
  app.post<{ Params: { id: string }; Body: OnlineCommand }>(
    '/api/online/lobbies/:id/game/decisions',
    {
      schema: {
        params,
        body: bodySchema({
          revision,
          commandId: { type: 'string', format: 'uuid' },
          questionId: { type: 'string', minLength: 1, maxLength: 30 },
          choice: { type: 'integer', minimum: 0 },
        }),
      },
    },
    async (req) => service.decide(req.params.id, (await auth.requireUser(req)).id, req.body),
  )
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
          deck: deckSchema,
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
