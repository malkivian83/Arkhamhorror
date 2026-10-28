import { expect, it } from 'vitest'
import { newCampaign, startScenario, LOST_ENCOUNTER_LOCATIONS } from '@lcg/cards'
import { skillTestValue, shroudOf } from '@lcg/engine'
import { tableView, tableStats } from './table'
import { gameView } from './game'

it('projects a discarded encounter location with its public location data while keeping the deck anonymous', () => {
  const campaign = { ...newCampaign('the-dunwich-legacy', ['joe'], 'standard'), scenarioIndex: 7 }
  const g = startScenario(campaign, 440)
  g.encounterDiscard = [LOST_ENCOUNTER_LOCATIONS[0]!]
  const view = tableView(g, g.investigators[0]!.id)
  expect(view.encounterDiscard[0]).toMatchObject({
    kind: 'location',
    code: '02324',
    shroud: 1,
    clueValue: 1,
    cluesPerInvestigator: false,
  })
  expect(view.encounterDeck.every((c) => c.code === '' && c.name === '')).toBe(true)
})

it('projects the normal board without hidden cards, future stages, RNG or deferred effects', () => {
  const g = startScenario(newCampaign('brethren-of-ash', ['joe', 'daniela'], 'standard'), 777)
  const [a, b] = g.investigators
  a!.hand = ['own-hand']
  a!.deck = ['secret-own-deck']
  b!.hand = ['secret-other-hand']
  b!.deck = ['secret-other-deck']
  a!.setAsideOpening = ['secret-mulligan']
  g.scenarioDecks = { guests: ['secret-guests'] }
  g.scenarioMeta = { secretFaction: 'secret-faction', cleanedUpTheBlood: 1 }
  g.queue = [{ type: 'Log', key: 'secret-queue' }]
  g.setAside = [{ kind: 'treachery', code: 'secret-aside', name: 'Secret', keywords: [] }]
  g.encounterDeck = g.setAside
  const location = Object.values(g.locations)[0]!
  location.beneath = g.setAside
  g.agendas.push({ code: 'secret-agenda', name: 'secret-agenda', doomThreshold: 99 })
  g.acts.push({
    code: 'secret-act',
    name: 'secret-act',
    clueThreshold: 99,
    cluesPerInvestigator: false,
    advanceTiming: 'objective',
  })
  g.placedAssets = {
    hidden: {
      id: 'hidden',
      code: 'secret-placed',
      name: 'secret-placed',
      faceDown: true,
      placement: { type: 'location', location: location.id },
      exhausted: false,
      damage: 0,
      horror: 0,
    },
  }
  g.log.push({ key: 'log.draw', params: { card: 'secret-draw' }, round: 1 })
  g.log.push({ key: 'log.round', params: { round: 1, hidden: 'secret-log-parameter' }, round: 1 })
  Object.assign(g, { futurePrivateField: 'secret-new-engine-field' })
  g.pending = {
    investigator: a!.id,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.chooseAction',
      choices: [
        {
          label: 'action.move',
          target: { type: 'location', id: location.id },
          display: { kind: 'basic', action: 'move', actions: 1 },
          then: g.queue,
        },
      ],
    },
  }
  const original = JSON.stringify(g)
  const view = gameView(
    {
      id: 'room',
      owner: 'host',
      members: ['host', 'friend'],
      revision: 1,
      game: g,
      decks: {
        host: { investigator: a!.id, cards: [] },
        friend: { investigator: b!.id, cards: [] },
      },
    },
    'host',
  )
  expect(JSON.stringify(view)).not.toContain('secret-')
  expect(JSON.stringify(view)).not.toContain('"then"')
  expect(view.table!.rng).toBe(0)
  expect(view.table!.investigators[0]!.hand).toEqual(['own-hand'])
  expect(view.table!.investigators[1]!.hand).toEqual([])
  expect(view.investigators[1]!.handCount).toBe(1)
  expect(view.table!.investigators[0]!.deck).toEqual([''])
  expect(view.table!.locations[location.id]!.connections).toEqual(location.connections)
  expect(view.table!.pending!.question.choices[0]).toMatchObject({
    target: { type: 'location', id: location.id },
    display: { action: 'move' },
  })
  expect(view.table!.scenarioMeta).toEqual({ cleanedUpTheBlood: 1 })
  const other = tableView(g, b!.id)
  expect(other.pending!.question.choices).toEqual([])
  expect(other.pending!.question.story).toBeUndefined()
  expect(JSON.stringify(other)).not.toContain('own-hand')
  expect(JSON.stringify(g)).toBe(original)
})

it('retains mulligan/story presentation and asset targets without sending engine messages', () => {
  const g = startScenario(newCampaign('brethren-of-ash', ['joe'], 'standard'), 9)
  const mine = g.investigators[0]!.id
  g.assets.a = {
    id: 'a',
    code: '01030',
    owner: mine,
    exhausted: false,
    damage: 0,
    horror: 0,
    uses: 1,
  }
  g.pending = {
    investigator: mine,
    question: {
      kind: 'chooseOne',
      mulligan: true,
      prompt: 'prompt.commitCards',
      story: { title: 'title', body: 'body', effects: [{ key: 'public-effect' }] },
      choices: [
        {
          label: 'ability',
          then: [
            {
              type: 'UseAbility',
              investigator: mine,
              key: 'a:ability',
              actions: 0,
              provokes: false,
              then: [],
            },
          ],
        },
      ],
    },
  }
  const q = tableView(g, mine).pending!.question
  expect(q.mulligan).toBe(true)
  expect(q.story?.effects).toEqual([{ key: 'public-effect', params: undefined }])
  expect(q.choices[0]).toMatchObject({
    target: { type: 'asset', id: 'a' },
    display: { kind: 'ability' },
  })
  expect(q.choices[0]).not.toHaveProperty('then')
})

it('keeps test information public but strips nested outcomes and computes display values on the server', () => {
  const g = startScenario(newCampaign('brethren-of-ash', ['joe'], 'standard'), 9)
  g.skillTest = {
    investigator: g.investigators[0]!.id,
    skill: 'intellect',
    difficulty: 3,
    kind: {
      type: 'effect',
      source: 'Public card',
      onSuccess: [{ type: 'Log', key: 'secret-success' }],
      onFail: [],
      onFailEach: [],
    },
    baseModifier: 2,
    committed: [],
    tokens: [-1],
    tokenModifier: -1,
    autoFail: false,
    tokenOnFail: [{ type: 'Log', key: 'secret-fail' }],
    tokenOnFailBy: [],
    modifiedSkill: null,
    succeeded: null,
    afterEnd: [{ type: 'Log', key: 'secret-after' }],
  }
  expect(JSON.stringify(tableView(g, g.investigators[0]!.id))).not.toContain('secret-')
  const stats = tableStats(g)
  expect(stats.agendaCount).toBe(g.agendas.length)
  expect(stats.actCount).toBe(g.acts.length)
  expect(stats.value).toEqual(skillTestValue(g))
  for (const l of Object.values(g.locations).filter((l) => l.revealed))
    expect(stats.shroud[l.id]).toBe(shroudOf(g, l.id))
  expect(stats.bag).toHaveLength(g.chaosBag.length)
  expect(JSON.stringify(stats)).not.toContain('onFail')
})

it('keeps hidden treacheries secret from other players, including the encounter log', () => {
  const g = startScenario(newCampaign('brethren-of-ash', ['joe', 'daniela'], 'standard'), 778)
  const [a, b] = g.investigators
  g.treacheries = {
    whispers: {
      kind: 'treachery',
      id: 'whispers',
      code: '03084b',
      name: 'Whispers in Your Head (Dread)',
      keywords: ['peril', 'hidden'],
      placement: { type: 'threatArea', investigator: a!.id },
      hidden: true,
    },
  }
  g.log = [
    {
      key: 'log.encounter',
      round: 1,
      params: { name: a!.name, card: 'Whispers in Your Head (Dread)', code: '03084b', hidden: 1 },
    },
  ]
  const location = Object.values(g.locations)[0]!
  location.horror = 1
  location.doom = 2
  location.unrevealedName = 'Lobby Doorway'
  location.revealed = false
  const own = tableView(g, a!.id)
  expect(own.treacheries.whispers).toMatchObject({ code: '03084b', hidden: true })
  expect(own.log[0]!.params).toMatchObject({ card: 'Whispers in Your Head (Dread)' })
  const other = tableView(g, b!.id)
  expect(other.treacheries.whispers).toMatchObject({ code: '', name: '', hidden: true })
  expect(JSON.stringify(other)).not.toContain('Dread')
  expect(other.locations[location.id]).toMatchObject({
    name: 'Lobby Doorway',
    horror: 1,
    doom: 2,
  })
})
