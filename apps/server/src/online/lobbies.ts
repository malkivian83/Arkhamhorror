import { randomInt, randomUUID } from 'node:crypto'
import {
  newCampaign,
  startScenario,
  finishScenario,
  disappearance,
  resolveDisappearance,
  purchase,
  customize,
  activeMembers,
  campaignCanContinue,
  canPlayNext,
  chooseTransferHeir,
  replaceInvestigator,
  type Campaign,
} from '@lcg/cards'
import {
  applyInput,
  ENGINE_VERSION,
  scenarioBehavior,
  type GameState,
  type PlayerInput,
} from '@lcg/engine'
import type {
  OnlineCommand,
  OnlineDeck,
  OnlineGame,
  OnlineGameUnchanged,
  OnlineLobby,
  OnlineProgressCommand,
} from '@lcg/shared'
import { gameView } from './game'
import { createOnlineSteps } from './autoSteps'
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
  encounterSetVariant?: OnlineLobby['encounterSetVariant']
  decks?: Record<string, OnlineDeck>
  ready?: string[]
  campaign?: Campaign
  game?: GameState
  commands?: Record<string, { user: string; signature: string }>
  intermission?: boolean
  campaignReady?: string[]
  autoSteps?: { revision: number; reviews: Record<string, import('@lcg/shared').AutoStepsReview> }[]
  advanceReviews?: {
    revision: number
    frames: Record<string, import('@lcg/saves/advanceReview').AdvanceFrame[]>
  }[]
  cardEntries?: { revision: number; cards: Record<string, import('@lcg/shared').CardEntry[]> }[]
  /** Seed and decisions of the current scenario, to rebuild it when the rules change (S3). */
  history?: { seed: number; inputs: PlayerInput[] }
  rulesUpdate?: { revision: number; dropped: number | null }
}

/** Command ids kept for idempotent retries; older ones are dropped (doc 100, S4). */
const KEPT_COMMANDS = 100
/** Lobbies a player may own at once. */
const OWNED_LOBBIES = 10
/** Lobbies with no change for this long are removed when someone creates a new one. */
const ABANDONED_DAYS = 90

function remember(lobby: Lobby, id: string, entry: { user: string; signature: string }) {
  lobby.commands = Object.fromEntries(
    [...Object.entries(lobby.commands ?? {}), [id, entry] as const].slice(-KEPT_COMMANDS),
  )
}

/** Whether a stored scenario was built by the engine and scenario rules now deployed. */
function currentRules(game: GameState) {
  const rules = scenarioBehavior(game.scenarioId)?.rulesVersion
  return (
    game.engineVersion === ENGINE_VERSION &&
    (rules === undefined || game.scenarioRulesVersion === rules)
  )
}

/**
 * A scenario saved under older rules is set up again with the same seed and its decisions
 * are replayed while they still fit the questions; the rest are dropped and reported to the
 * players. Without a record (lobbies from before S3) the scenario starts over.
 */
function upgradeRules(lobby: Lobby) {
  if (!lobby.game || !lobby.campaign || lobby.intermission || currentRules(lobby.game)) return
  const recorded = lobby.history
  const seed = recorded?.seed ?? randomInt(1, 0x7fffffff)
  const inputs = recorded?.inputs ?? []
  let game = startScenario(lobby.campaign, seed, true)
  let kept = 0
  for (const input of inputs) {
    const pending = game.pending
    if (game.outcome || pending?.investigator !== input.investigator) break
    if (!pending.question.choices[input.choice]) break
    try {
      game = applyInput(game, input)
    } catch {
      break
    }
    kept++
  }
  lobby.game = game
  lobby.history = { seed, inputs: inputs.slice(0, kept) }
  delete lobby.autoSteps
  delete lobby.advanceReviews
  delete lobby.cardEntries
  lobby.revision++
  lobby.rulesUpdate = {
    revision: lobby.revision,
    dropped: recorded ? inputs.length - kept : null,
  }
}
export const lobbyView = (lobby: Lobby): OnlineLobby => ({
  id: lobby.id,
  owner: lobby.owner,
  members: lobby.members,
  revision: lobby.revision,
  status: lobby.game ? 'active' : 'lobby',
  campaignId: lobby.campaignId ?? 'brethren-of-ash',
  difficulty: lobby.difficulty ?? 'standard',
  ...(lobby.encounterSetVariant ? { encounterSetVariant: lobby.encounterSetVariant } : {}),
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
    await this.db.exec(
      `DELETE FROM online_lobbies WHERE updated_at < NOW() - INTERVAL ${ABANDONED_DAYS} DAY`,
    )
    const [owned] = await this.db.rows<{ count: number }>(
      'SELECT COUNT(*) AS count FROM online_lobbies WHERE owner_id = ?',
      [user],
    )
    requireValue(Number(owned?.count ?? 0) < OWNED_LOBBIES, 'too_many_lobbies', 409)
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
  /** `since`: the revision the client already shows; if still current, no view is built. */
  async game(id: string, user: string): Promise<OnlineGame>
  async game(id: string, user: string, since?: number): Promise<OnlineGame | OnlineGameUnchanged>
  async game(id: string, user: string, since?: number): Promise<OnlineGame | OnlineGameUnchanged> {
    const lobby = await this.read(this.db, id)
    requireValue(lobby.members.includes(user), 'not_member', 403)
    requireValue(lobby.game, 'not_started', 409)
    // A deploy changed the rules: the first read rebuilds the scenario under a lock.
    if (!lobby.intermission && !currentRules(lobby.game))
      return this.change(id, (locked) => gameView(locked, user))
    if (since === lobby.revision) return { unchanged: true as const, revision: lobby.revision }
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
      const steps = createOnlineSteps(
        lobby.game,
        Object.fromEntries(
          lobby.members.map((member) => [member, lobby.decks?.[member]?.investigator]),
        ),
      )
      const input = { investigator: pending.investigator, choice: command.choice }
      lobby.game = applyInput(lobby.game, input, steps.observe)
      if (lobby.history) lobby.history.inputs.push(input)
      const reviews = steps.finish()
      const cards = steps.finishCards()
      const advance = steps.finishAdvance()
      if (Object.keys(advance).length)
        lobby.advanceReviews = [
          ...(lobby.advanceReviews ?? []),
          { revision: lobby.revision + 1, frames: advance },
        ].slice(-32)
      if (Object.keys(cards).length)
        lobby.cardEntries = [
          ...(lobby.cardEntries ?? []),
          { revision: lobby.revision + 1, cards },
        ].slice(-32)
      if (Object.keys(reviews).length)
        lobby.autoSteps = [
          ...(lobby.autoSteps ?? []),
          { revision: lobby.revision + 1, reviews },
        ].slice(-32)
      remember(lobby, command.commandId, { user, signature })
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
          ? [command.card, command.upgrade, command.replaces ?? null, command.remove ?? null]
          : command.action === 'customize'
            ? [command.card, command.sheet, command.copies ?? null, command.removals ?? null]
            : command.action === 'heir'
              ? [command.card, command.heir]
              : command.action === 'replace'
                ? command.deck
                : command.action === 'ready'
                  ? command.ready
                  : command.action === 'disappearance'
                    ? command.decision
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
      } else if (command.action === 'disappearance') {
        requireValue(lobby.intermission, 'not_intermission', 409)
        requireValue(lobby.owner === user, 'not_owner', 403)
        requireValue(
          disappearance(lobby.campaign)?.choices.includes(command.decision),
          'campaign_cannot_continue',
          409,
        )
        lobby.campaign = resolveDisappearance(lobby.campaign, command.decision)
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
        // Buying and readiness stay open while a deck is short or illegal, so it can be fixed.
        requireValue(campaignCanContinue(lobby.campaign), 'campaign_cannot_continue', 409)
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
          requireValue(canPlayNext(lobby.campaign), 'invalid_deck', 409)
          const seed = randomInt(1, 0x7fffffff)
          lobby.game = startScenario(lobby.campaign, seed, true)
          lobby.history = { seed, inputs: [] }
          delete lobby.rulesUpdate
          delete lobby.autoSteps
          delete lobby.advanceReviews
          delete lobby.cardEntries
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
                      ...(command.replaces ? { replaces: command.replaces } : {}),
                      ...(command.remove ? { remove: command.remove } : {}),
                    })
            } catch {
              requireValue(false, 'invalid_purchase')
            }
            lobby.campaignReady = (lobby.campaignReady ?? []).filter((member) => member !== user)
          }
        }
      }
      remember(lobby, command.commandId, { user, signature })
      lobby.revision++
      return gameView(lobby, user)
    })
  }
  private async change<T>(id: string, run: (lobby: Lobby) => T) {
    return this.db.transaction(async (tx) => {
      const lobby = await this.read(tx, id, true)
      upgradeRules(lobby)
      const result = run(lobby)
      // The owner column follows the payload, so a transfer also moves the account link.
      await tx.exec('UPDATE online_lobbies SET payload = ?, owner_id = ? WHERE id = ?', [
        JSON.stringify(lobby),
        lobby.owner,
        id,
      ])
      return result
    })
  }
  /** Before the game starts, a player leaves or the owner removes one (doc 100, S4). */
  async leave(id: string, user: string, revision: number, target = user) {
    return this.change(id, (lobby) => {
      this.editable(lobby, user, revision)
      requireValue(target === user || lobby.owner === user, 'not_owner', 403)
      requireValue(target !== lobby.owner, 'owner_cannot_leave', 409)
      requireValue(lobby.members.includes(target), 'not_member', 404)
      lobby.members = lobby.members.filter((member) => member !== target)
      if (lobby.decks) delete lobby.decks[target]
      lobby.ready = []
      lobby.revision++
      return lobbyView(lobby)
    })
  }
  /** The owner hands the lobby to another member, also during a game. */
  async transfer(id: string, user: string, revision: number, target: string) {
    return this.change(id, (lobby) => {
      requireValue(lobby.owner === user, 'not_owner', 403)
      requireValue(lobby.revision === revision, 'stale_revision', 409)
      requireValue(target !== user && lobby.members.includes(target), 'not_member', 404)
      lobby.owner = target
      lobby.revision++
      return lobbyView(lobby)
    })
  }
  /** The owner closes the lobby for everyone, also during a game. */
  async close(id: string, user: string) {
    return this.db.transaction(async (tx) => {
      const lobby = await this.read(tx, id, true)
      requireValue(lobby.owner === user, 'not_owner', 403)
      await tx.exec('DELETE FROM online_lobbies WHERE id = ?', [id])
      return { closed: true }
    })
  }
  /**
   * Before an account is deleted, its lobbies pass to another member instead of being
   * removed by the cascade; a lobby with nobody else is closed. In lobbies that have not
   * started, the account also gives up its seat.
   */
  async handOver(user: string) {
    const rows = await this.db.rows<{ id: string }>(
      `SELECT id FROM online_lobbies
       WHERE owner_id = ? OR JSON_CONTAINS(JSON_EXTRACT(payload, '$.members'), JSON_QUOTE(?))`,
      [user, user],
    )
    for (const { id } of rows)
      await this.db.transaction(async (tx) => {
        const lobby = await this.read(tx, id, true)
        const others = lobby.members.filter((member) => member !== user)
        if (lobby.owner === user && !others.length)
          return tx.exec('DELETE FROM online_lobbies WHERE id = ?', [id])
        if (lobby.owner === user) lobby.owner = others[0]!
        if (!lobby.game) {
          lobby.members = others
          if (lobby.decks) delete lobby.decks[user]
          lobby.ready = []
        }
        lobby.revision++
        return tx.exec('UPDATE online_lobbies SET payload = ?, owner_id = ? WHERE id = ?', [
          JSON.stringify(lobby),
          lobby.owner,
          id,
        ])
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
    encounterSetVariant?: OnlineLobby['encounterSetVariant'],
  ) {
    return this.change(id, (lobby) => {
      this.editable(lobby, user, revision)
      requireValue(lobby.owner === user, 'not_owner', 403)
      // The same authoritative campaign validation is used for setup and start.
      try {
        newCampaign(campaignId, ['joe'], difficulty, 1, [], [], undefined, encounterSetVariant)
      } catch {
        requireValue(false, 'invalid_campaign')
      }
      lobby.campaignId = campaignId
      lobby.difficulty = difficulty
      if (encounterSetVariant === 'chapter-two') lobby.encounterSetVariant = encounterSetVariant
      else delete lobby.encounterSetVariant
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
        [],
        [],
        undefined,
        lobby.encounterSetVariant,
      )
      lobby.game = startScenario(campaign, seed, true)
      lobby.history = { seed, inputs: [] }
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
              enum: [
                'finish',
                'purchase',
                'customize',
                'ready',
                'next',
                'heir',
                'replace',
                'disappearance',
              ],
            },
            card: { type: 'string', minLength: 1, maxLength: 30 },
            upgrade: { type: 'boolean' },
            replaces: { type: 'string', minLength: 1, maxLength: 30 },
            sheet: {
              type: 'object',
              maxProperties: 30,
              additionalProperties: { type: 'integer', minimum: 0, maximum: 10 },
            },
            copies: { type: 'integer', minimum: 0, maximum: 2 },
            removals: { type: 'array', maxItems: 2, items: { type: 'string', maxLength: 30 } },
            remove: { type: 'string', minLength: 1, maxLength: 30 },
            ready: { type: 'boolean' },
            decision: { type: 'string', enum: ['search', 'leave'] },
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
              if: { properties: { action: { const: 'disappearance' } } },
              then: { required: ['decision'] },
            },
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
  app.get<{ Params: { id: string }; Querystring: { since?: number } }>(
    '/api/online/lobbies/:id/game',
    {
      schema: {
        params,
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: { since: { type: 'integer', minimum: 0 } },
        },
      },
    },
    async (req) => service.game(req.params.id, (await auth.requireUser(req)).id, req.query.since),
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
    Body: {
      revision: number
      campaignId: string
      difficulty: OnlineLobby['difficulty']
      encounterSetVariant?: OnlineLobby['encounterSetVariant']
    }
  }>(
    '/api/online/lobbies/:id/configure',
    {
      schema: {
        params,
        body: bodySchema({
          revision,
          campaignId: { type: 'string', maxLength: 100 },
          difficulty: { type: 'string', enum: ['easy', 'standard', 'hard', 'expert'] },
          encounterSetVariant: {
            type: 'string',
            enum: ['original', 'chapter-two'],
            default: 'original',
          },
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
        req.body.encounterSetVariant,
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
  const member = { type: 'string', minLength: 1, maxLength: 36 }
  app.post<{ Params: { id: string }; Body: { revision: number } }>(
    '/api/online/lobbies/:id/leave',
    { schema: { params, body: bodySchema({ revision }) } },
    async (req) =>
      service.leave(req.params.id, (await auth.requireUser(req)).id, req.body.revision),
  )
  app.post<{ Params: { id: string }; Body: { revision: number; user: string } }>(
    '/api/online/lobbies/:id/kick',
    { schema: { params, body: bodySchema({ revision, user: member }) } },
    async (req) =>
      service.leave(
        req.params.id,
        (await auth.requireUser(req)).id,
        req.body.revision,
        req.body.user,
      ),
  )
  app.post<{ Params: { id: string }; Body: { revision: number; user: string } }>(
    '/api/online/lobbies/:id/transfer',
    { schema: { params, body: bodySchema({ revision, user: member }) } },
    async (req) =>
      service.transfer(
        req.params.id,
        (await auth.requireUser(req)).id,
        req.body.revision,
        req.body.user,
      ),
  )
  app.delete<{ Params: { id: string } }>(
    '/api/online/lobbies/:id',
    { schema: { params } },
    async (req) => service.close(req.params.id, (await auth.requireUser(req)).id),
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
