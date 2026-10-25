import { describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import type { Database } from '../accounts/database'
import { ApiError } from '../accounts/security'
import { LobbyService, onlineLobbies, type Lobby } from './lobbies'
import { randomUUID } from 'node:crypto'
import { starterDeck, starterInvestigator } from '@lcg/cards'
import type { OnlineProgressAction } from '@lcg/shared'

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
  it('starts a solo table only after selecting a deck and confirming readiness', async () => {
    const service = new LobbyService(memory().db)
    let lobby = await service.create('host')
    await expect(service.start(lobby.id, 'host', lobby.revision)).rejects.toMatchObject({
      code: 'not_ready',
    })
    lobby = await service.select(lobby.id, 'host', lobby.revision, deck('joe'))
    await expect(service.start(lobby.id, 'host', lobby.revision)).rejects.toMatchObject({
      code: 'not_ready',
    })
    lobby = await service.ready(lobby.id, 'host', lobby.revision, true)
    const started = await service.start(lobby.id, 'host', lobby.revision)
    expect(started.status).toBe('active')
    expect(started.game?.investigatorCount).toBe(1)
    const view = await service.game(lobby.id, 'host')
    expect(view.investigators).toHaveLength(1)
    expect(view.pending?.choices.length).toBeGreaterThan(0)
  })
  async function active() {
    const { db, data } = memory(),
      service = new LobbyService(db)
    let lobby = await service.create('host')
    const invite = await service.invite(lobby.id, 'host')
    lobby = await service.join(lobby.id, 'friend', invite.token)
    lobby = await service.select(lobby.id, 'host', lobby.revision, deck('joe'))
    lobby = await service.select(lobby.id, 'friend', lobby.revision, deck('daniela'))
    lobby = await service.ready(lobby.id, 'host', lobby.revision, true)
    lobby = await service.ready(lobby.id, 'friend', lobby.revision, true)
    await service.start(lobby.id, 'host', lobby.revision)
    return { service, db, data, id: lobby.id }
  }
  const progressCommand = (revision: number, action: OnlineProgressAction) => ({
    ...action,
    revision,
    commandId: randomUUID(),
  })
  async function ended() {
    const fixture = await active()
    const lobby = JSON.parse(fixture.data.get(fixture.id)!) as Lobby
    // The transport starts with the engine's completed resolution, including awards/trauma.
    lobby.game!.outcome = { type: 'resolution', resolution: 1 }
    lobby.game!.pending = null
    lobby.game!.queue = []
    lobby.game!.campaignLog = structuredClone(lobby.campaign!.log)
    for (const record of Object.values(lobby.game!.campaignLog.investigators)) {
      record.xp += 5
      record.physicalTrauma = 1
    }
    fixture.data.set(fixture.id, JSON.stringify(lobby))
    return { ...fixture, revision: lobby.revision }
  }
  it('records outcomes once, buys only the authenticated player deck and starts the next shared scenario', async () => {
    const { service, db, data, id, revision } = await ended()
    const finish = progressCommand(revision, { action: 'finish' })
    await expect(service.progress(id, 'friend', finish)).rejects.toMatchObject({
      code: 'not_owner',
    })
    const [first, duplicate] = await Promise.all([
      service.progress(id, 'host', finish),
      service.progress(id, 'host', finish),
    ])
    expect(duplicate).toEqual(first)
    expect(first.campaign!.nextScenario).toBe('smoke-and-mirrors')
    expect(first.campaign!.members.every((m) => m.xp === 5 && m.physicalTrauma === 1)).toBe(true)
    expect(first.campaign!.own!.deck).toEqual(deck('joe').cards)
    expect((await service.game(id, 'friend')).campaign!.own!.deck).toEqual(deck('daniela').cards)
    expect((JSON.parse(data.get(id)!) as Lobby).campaign!.results).toHaveLength(1)
    let view = await service.progress(
      id,
      'host',
      progressCommand(first.revision, { action: 'ready', ready: true }),
    )
    const option =
      view.campaign!.own!.options.find((o) => o.replaces) ?? view.campaign!.own!.options[0]!
    const remove = option.needsRemoval ? view.campaign!.own!.removable[0] : option.replaces
    const buy = progressCommand(view.revision, {
      action: 'purchase',
      card: option.code,
      upgrade: !!option.replaces,
      ...(option.needsRemoval ? { remove: remove! } : {}),
    })
    view = await service.progress(id, 'host', buy)
    expect(view.campaign!.ready).toBe(false)
    expect(view.campaign!.members[0]!.xp).toBe(5 - option.cost)
    expect(view.campaign!.members[1]!.xp).toBe(5)
    const expected = [...deck('joe').cards]
    if (remove) expected.splice(expected.indexOf(remove), 1)
    expected.push(option.code)
    expect(view.campaign!.own!.deck).toEqual(expected)
    expect(await new LobbyService(db).progress(id, 'host', buy)).toEqual(view)
    await expect(
      service.progress(id, 'host', progressCommand(view.revision, { action: 'next' })),
    ).rejects.toMatchObject({ code: 'not_ready' })
    view = await service.progress(
      id,
      'host',
      progressCommand(view.revision, { action: 'ready', ready: true }),
    )
    view = await service.progress(
      id,
      'friend',
      progressCommand(view.revision, { action: 'ready', ready: true }),
    )
    expect(view.campaign!.allReady).toBe(true)
    await expect(
      service.progress(id, 'friend', progressCommand(view.revision, { action: 'next' })),
    ).rejects.toMatchObject({ code: 'not_owner' })
    const next = progressCommand(view.revision, { action: 'next' })
    const [a, b] = await Promise.all([
      service.progress(id, 'host', next),
      service.progress(id, 'host', next),
    ])
    expect(a).toEqual(b)
    expect(a.scenarioId).toBe('smoke-and-mirrors')
    expect(a.finished).toBe(false)
    expect(a.campaign).toBeUndefined()
    expect(a.investigators.every((i) => i.damage === 1)).toBe(true)
    expect(await new LobbyService(db).game(id, 'host')).toEqual(a)
    expect((JSON.parse(data.get(id)!) as Lobby).campaign!.investigators[0]!.deck).toEqual(expected)
    // An old acknowledged purchase cannot spend XP in the new scenario.
    expect(await service.progress(id, 'host', buy)).toEqual(a)
  })
  it('rejects early, invalid, stale and conflicting campaign commands without changing the game', async () => {
    const { service, id, data, revision } = await ended()
    await expect(
      service.progress(id, 'outsider', progressCommand(revision, { action: 'finish' })),
    ).rejects.toMatchObject({ code: 'not_member' })
    await expect(
      service.progress(id, 'host', progressCommand(revision, { action: 'ready', ready: true })),
    ).rejects.toMatchObject({ code: 'not_intermission' })
    const finish = progressCommand(revision, { action: 'finish' })
    const view = await service.progress(id, 'host', finish)
    await expect(service.progress(id, 'host', { ...finish, action: 'next' })).rejects.toMatchObject(
      { code: 'command_conflict' },
    )
    await expect(
      service.progress(id, 'host', progressCommand(view.revision, { action: 'finish' })),
    ).rejects.toMatchObject({ code: 'already_finished' })
    const before = data.get(id)
    for (const card of ['missing', '12004']) {
      await expect(
        service.progress(
          id,
          'host',
          progressCommand(view.revision, { action: 'purchase', card, upgrade: false }),
        ),
      ).rejects.toMatchObject({ code: 'invalid_purchase' })
    }
    expect(data.get(id)).toBe(before)
    const outcomes = await Promise.allSettled(
      ['host', 'friend'].map((user) =>
        service.progress(
          id,
          user,
          progressCommand(view.revision, { action: 'ready', ready: true }),
        ),
      ),
    )
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.find((o) => o.status === 'rejected')).toMatchObject({
      reason: { code: 'stale_revision' },
    })
    const running = await active()
    const runningView = await running.service.game(running.id, 'host')
    await expect(
      running.service.progress(
        running.id,
        'host',
        progressCommand(runningView.revision, { action: 'finish' }),
      ),
    ).rejects.toMatchObject({ code: 'scenario_not_finished' })
  })
  it('requires readiness only from survivors and prevents eliminated players from buying', async () => {
    const { service, id, data, revision } = await ended()
    const lobby = JSON.parse(data.get(id)!) as Lobby
    lobby.game!.campaignLog!.investigators[deck('daniela').investigator]!.killed = true
    data.set(id, JSON.stringify(lobby))
    let view = await service.progress(id, 'host', progressCommand(revision, { action: 'finish' }))
    expect((await service.game(id, 'friend')).campaign!.own).toBeNull()
    await expect(
      service.progress(
        id,
        'friend',
        progressCommand(view.revision, { action: 'ready', ready: true }),
      ),
    ).rejects.toMatchObject({ code: 'inactive_investigator' })
    await expect(
      service.progress(
        id,
        'friend',
        progressCommand(view.revision, { action: 'purchase', card: '01030', upgrade: false }),
      ),
    ).rejects.toMatchObject({ code: 'inactive_investigator' })
    view = await service.progress(
      id,
      'host',
      progressCommand(view.revision, { action: 'ready', ready: true }),
    )
    expect(view.campaign!.allReady).toBe(true)
    view = await service.progress(id, 'host', progressCommand(view.revision, { action: 'next' }))
    expect(view.investigators.map((i) => i.id)).toEqual([deck('joe').investigator])
  })
  it('checks replacement requirements and available XP at purchase time', async () => {
    const { service, data, id, revision } = await ended()
    const view = await service.progress(id, 'host', progressCommand(revision, { action: 'finish' }))
    const option = view.campaign!.own!.options.find((o) => o.needsRemoval)!
    expect(option).toBeDefined()
    const invalid = progressCommand(view.revision, {
      action: 'purchase',
      card: option.code,
      upgrade: false,
    })
    await expect(service.progress(id, 'host', invalid)).rejects.toMatchObject({
      code: 'invalid_purchase',
    })
    await expect(
      service.progress(id, 'host', {
        ...invalid,
        action: 'purchase',
        card: option.code,
        upgrade: false,
        remove: 'missing',
      }),
    ).rejects.toMatchObject({ code: 'invalid_purchase' })
    const lobby = JSON.parse(data.get(id)!) as Lobby
    lobby.campaign!.log.investigators[deck('joe').investigator]!.xp = 0
    data.set(id, JSON.stringify(lobby))
    const before = data.get(id)
    await expect(
      service.progress(
        id,
        'host',
        progressCommand(view.revision, {
          action: 'purchase',
          card: option.code,
          upgrade: false,
          remove: view.campaign!.own!.removable[0]!,
        }),
      ),
    ).rejects.toMatchObject({ code: 'invalid_purchase' })
    expect(data.get(id)).toBe(before)
  })
  it('exposes campaign progress through authenticated HTTP and rejects malformed purchases', async () => {
    const { db, id, revision } = await ended()
    const app = Fastify()
    app.setErrorHandler((error, _req, reply) =>
      reply.code(error instanceof ApiError ? error.statusCode : 400).send({}),
    )
    onlineLobbies(app, db, {
      requireUser: async (req) => ({
        id: String(req.headers['test-user']),
        name: 'Test',
        email: 'test@example.test',
        verified: 1,
        locale: 'es',
      }),
    })
    const post = (user: string, payload: object) =>
      app.inject({
        method: 'POST',
        url: `/api/online/lobbies/${id}/game/progress`,
        headers: { 'test-user': user },
        payload,
      })
    try {
      expect(
        (await post('host', { commandId: randomUUID(), revision, action: 'purchase' })).statusCode,
      ).toBe(400)
      expect(
        (await post('host', { commandId: randomUUID(), revision, action: 'ready' })).statusCode,
      ).toBe(400)
      const finish = progressCommand(revision, { action: 'finish' })
      expect((await post('outsider', finish)).statusCode).toBe(403)
      const response = await post('host', finish)
      expect(response.statusCode).toBe(200)
      const view = response.json()
      expect(view.campaign.own.deck).toEqual(deck('joe').cards)
      const ready = await post('friend', {
        ...progressCommand(view.revision, { action: 'ready', ready: true }),
        investigator: deck('joe').investigator,
      })
      expect(ready.statusCode).toBe(200)
      expect(ready.json().campaign.members[0].ready).toBe(false)
      expect(ready.json().campaign.members[1].ready).toBe(true)
      expect(ready.json().campaign.own.deck).toEqual(deck('daniela').cards)
    } finally {
      await app.close()
    }
  })
  it('lets only the host choose the new bearer before the next scenario', async () => {
    const { service, data, id, revision } = await ended()
    const finished = await service.progress(
      id,
      'host',
      progressCommand(revision, { action: 'finish' }),
    )
    const lobby = JSON.parse(data.get(id)!) as Lobby
    const [heir] = lobby.campaign!.investigators.map((i) => i.id)
    lobby.campaign!.log.values = { ...lobby.campaign!.log.values, 'transfer:03059': '03001' }
    data.set(id, JSON.stringify(lobby))
    let view = await service.game(id, 'friend')
    expect(view.campaign!.canContinue).toBe(false)
    expect(view.campaign!.transfers).toEqual([
      { card: '03059', from: '03001', candidates: lobby.campaign!.investigators.map((i) => i.id) },
    ])
    const choose = (who: string, to: string) =>
      service.progress(
        id,
        who,
        progressCommand(finished.revision, { action: 'heir', card: '03059', heir: to }),
      )
    await expect(choose('friend', heir!)).rejects.toMatchObject({ code: 'not_owner' })
    await expect(
      service.progress(
        id,
        'host',
        progressCommand(finished.revision, { action: 'ready', ready: true }),
      ),
    ).rejects.toMatchObject({ code: 'campaign_cannot_continue' })
    await expect(choose('host', '03001')).rejects.toMatchObject({ code: 'invalid_heir' })
    view = await choose('host', heir!)
    expect(view.campaign!.transfers).toEqual([])
    expect(view.campaign!.canContinue).toBe(true)
    const stored = JSON.parse(data.get(id)!) as Lobby
    expect(stored.campaign!.log.investigators[heir!]!.storyAssets).toContain('03059')
  })

  it('lets each player whose investigator left choose an unused one with a level 0 deck', async () => {
    const { service, data, id } = await ended()
    const lobby = JSON.parse(data.get(id)!) as Lobby
    for (const record of Object.values(lobby.game!.campaignLog!.investigators)) record.insane = true
    data.set(id, JSON.stringify(lobby))
    let view = await service.progress(
      id,
      'host',
      progressCommand(lobby.revision, { action: 'finish' }),
    )
    expect(view.campaign!.canContinue).toBe(false)
    expect(view.campaign!.lost).toBe(false)
    expect(view.campaign!.awaitingReplacement).toBe(true)
    expect(view.campaign!.replacement?.leaving).toBe(deck('joe').investigator)
    expect(view.campaign!.replacement?.investigators).not.toContain(deck('daniela').investigator)
    const starter = (key: 'trish' | 'isabelle') => ({
      investigator: starterInvestigator(key).id,
      cards: starterDeck(key),
    })
    const replace = (
      who: string,
      revision: number,
      chosen: { investigator: string; cards: string[] },
    ) => service.progress(id, who, progressCommand(revision, { action: 'replace', deck: chosen }))
    await expect(replace('host', view.revision, deck('daniela'))).rejects.toMatchObject({
      code: 'invalid_replacement',
    })
    view = await replace('friend', view.revision, starter('trish'))
    expect(view.ownInvestigator).toBe(starter('trish').investigator)
    expect(view.campaign!.replacement).toBeNull()
    expect(view.campaign!.members.at(-1)).toMatchObject({
      investigator: starter('trish').investigator,
      xp: 0,
      active: true,
    })
    await expect(replace('friend', view.revision, starter('isabelle'))).rejects.toMatchObject({
      code: 'invalid_replacement',
    })
    view = await replace('host', view.revision, starter('isabelle'))
    expect(view.campaign!.canContinue).toBe(true)
    expect(view.campaign!.awaitingReplacement).toBe(false)
    for (const who of ['host', 'friend'])
      view = await service.progress(
        id,
        who,
        progressCommand(view.revision, { action: 'ready', ready: true }),
      )
    view = await service.progress(id, 'host', progressCommand(view.revision, { action: 'next' }))
    expect(view.investigators.map((i) => i.id)).toEqual([
      starter('trish').investigator,
      starter('isabelle').investigator,
    ])
  })

  it('blocks further scenarios at campaign end and preserves replay outcomes without advancing twice', async () => {
    const fixture = await ended()
    const lobby = JSON.parse(fixture.data.get(fixture.id)!) as Lobby
    lobby.campaign!.scenarioIndex = 2
    lobby.game!.scenarioId = 'queen-of-ash'
    fixture.data.set(fixture.id, JSON.stringify(lobby))
    const final = await fixture.service.progress(
      fixture.id,
      'host',
      progressCommand(fixture.revision, { action: 'finish' }),
    )
    expect(final.campaign!.canContinue).toBe(false)
    await expect(
      fixture.service.progress(
        fixture.id,
        'host',
        progressCommand(final.revision, { action: 'next' }),
      ),
    ).rejects.toMatchObject({ code: 'campaign_cannot_continue' })
    const replay = await ended()
    const replayLobby = JSON.parse(replay.data.get(replay.id)!) as Lobby
    replayLobby.game!.scenarioMeta = { replay: 1 }
    replay.data.set(replay.id, JSON.stringify(replayLobby))
    const result = await replay.service.progress(
      replay.id,
      'host',
      progressCommand(replay.revision, { action: 'finish' }),
    )
    expect(result.campaign!.nextScenario).toBe('spreading-flames')
    expect((JSON.parse(replay.data.get(replay.id)!) as Lobby).campaign!.results).toHaveLength(0)
  })
  it('projects only the current player hand and decision, never messages or hidden piles', async () => {
    const { service, id } = await active()
    const host = await service.game(id, 'host'),
      friend = await service.game(id, 'friend')
    expect(host.investigators[0]!.hand).toBeDefined()
    expect(friend.investigators[0]!.hand).toBeUndefined()
    expect(host.investigators[1]!.hand).toBeUndefined()
    expect(friend.investigators[1]!.hand).toBeDefined()
    for (const view of [host, friend]) {
      for (const key of ['rng', 'queue', 'encounterDeck', 'setAside', 'campaign', 'log'])
        expect(view).not.toHaveProperty(key)
      expect(JSON.stringify(view)).not.toContain('"then"')
      expect(view.investigators.every((i) => !('deck' in i))).toBe(true)
    }
    const deciding = host.pending!.investigator === deck('joe').investigator ? host : friend
    const waiting = deciding === host ? friend : host
    expect(deciding.pending!.choices.length).toBeGreaterThan(0)
    expect(waiting.pending!.choices).toEqual([])
    expect(waiting.pending!.prompt).toBeUndefined()
    await expect(service.game(id, 'outsider')).rejects.toMatchObject({ code: 'not_member' })
  })
  it('serializes simultaneous answers, persists deduplication and rejects stale or foreign decisions', async () => {
    const { service, db, data, id } = await active()
    const view = await service.game(id, 'host')
    const user = view.pending!.investigator === deck('joe').investigator ? 'host' : 'friend'
    const command = {
      commandId: randomUUID(),
      revision: view.revision,
      questionId: view.pending!.id,
      choice: 0,
    }
    await expect(
      service.decide(id, user === 'host' ? 'friend' : 'host', command),
    ).rejects.toMatchObject({ code: 'not_your_decision' })
    await expect(service.decide(id, 'outsider', command)).rejects.toMatchObject({
      code: 'not_member',
    })
    await expect(service.decide(id, user, { ...command, choice: -1 })).rejects.toMatchObject({
      code: 'invalid_choice',
    })
    await expect(
      service.decide(id, user, { ...command, questionId: 'wrong' }),
    ).rejects.toMatchObject({ code: 'stale_question' })
    const [a, b] = await Promise.all([
      service.decide(id, user, command),
      service.decide(id, user, command),
    ])
    expect(a).toEqual(b)
    expect(a.revision).toBe(view.revision + 1)
    const stored = data.get(id)
    expect(await new LobbyService(db).decide(id, user, command)).toEqual(a)
    expect(data.get(id)).toBe(stored)
    await expect(service.decide(id, user, { ...command, choice: 1 })).rejects.toMatchObject({
      code: 'command_conflict',
    })
    await expect(
      service.decide(id, user, { ...command, commandId: randomUUID() }),
    ).rejects.toMatchObject({ code: 'stale_revision' })
  })
  it('plays setup and synchronized actions with the actual engine and resumes after reconnecting', async () => {
    const { service, db, data, id } = await active()
    // RR: setup/mulligan and investigation actions use exactly the engine choices.
    for (let step = 0; step < 80; step++) {
      const stored = JSON.parse(data.get(id)!) as Lobby
      const pending = stored.game!.pending!
      if (pending.question.prompt === 'prompt.chooseAction') break
      const user = pending.investigator === deck('joe').investigator ? 'host' : 'friend'
      const view = await service.game(id, user)
      const done = pending.question.choices.findIndex((c) => /done|finish|keep/i.test(c.label))
      await service.decide(id, user, {
        commandId: randomUUID(),
        revision: view.revision,
        questionId: view.pending!.id,
        choice: done < 0 ? 0 : done,
      })
    }
    const stored = JSON.parse(data.get(id)!) as Lobby
    expect(stored.game!.pending!.question.prompt).toBe('prompt.chooseAction')
    const p = stored.game!.pending!,
      user = p.investigator === deck('joe').investigator ? 'host' : 'friend'
    const choice = p.question.choices.findIndex((c) =>
      c.then.some((m) => m.type === 'TakeAction' && m.action.kind === 'resource'),
    )
    expect(choice).toBeGreaterThanOrEqual(0)
    const before = stored.game!.investigators.find((i) => i.id === p.investigator)!
    await service.decide(id, user, {
      commandId: randomUUID(),
      revision: stored.revision,
      questionId: String(stored.revision),
      choice,
    })
    const recovered = await new LobbyService(db).game(id, user)
    expect(recovered.investigators.find((i) => i.id === p.investigator)!.resources).toBe(
      before.resources + 1,
    )
    expect(recovered.investigators.find((i) => i.id === p.investigator)!.actionsRemaining).toBe(
      before.actionsRemaining - 1,
    )
    const other = await service.game(id, user === 'host' ? 'friend' : 'host')
    expect(other.revision).toBe(recovered.revision)
    expect(other.cards).toEqual(recovered.cards)
  })
  it('accepts only one of two distinct commands against the same question', async () => {
    const { service, id } = await active()
    const view = await service.game(id, 'host')
    const user = view.pending!.investigator === deck('joe').investigator ? 'host' : 'friend'
    const results = await Promise.allSettled(
      [0, 1].map(() =>
        service.decide(id, user, {
          commandId: randomUUID(),
          revision: view.revision,
          questionId: view.pending!.id,
          choice: 0,
        }),
      ),
    )
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'stale_revision' },
    })
    expect((await service.game(id, user)).revision).toBe(view.revision + 1)
  })
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
      const game = await app.inject({
        url: `/api/online/lobbies/${lobby.id}/game`,
        headers: { 'test-user': 'host' },
      })
      const view = game.json()
      const actor = view.pending.investigator === deck('joe').investigator ? 'host' : 'friend'
      const command = {
        commandId: randomUUID(),
        revision: view.revision,
        questionId: view.pending.id,
        choice: 0,
      }
      expect(
        (await post(`/${lobby.id}/game/decisions`, actor, { ...command, choice: -1 })).statusCode,
      ).toBe(400)
      expect(
        (await post(`/${lobby.id}/game/decisions`, actor, { ...command, commandId: '__proto__' }))
          .statusCode,
      ).toBe(400)
      const decision = await post(`/${lobby.id}/game/decisions`, actor, command)
      expect(decision.statusCode).toBe(200)
      expect(decision.json().revision).toBe(view.revision + 1)
      expect((await post(`/${lobby.id}/game/decisions`, actor, command)).json()).toEqual(
        decision.json(),
      )
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
