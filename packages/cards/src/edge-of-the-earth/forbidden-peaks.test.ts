import {
  availableAbilities,
  dispatch,
  enemyMaxHealth,
  playerCardBehavior,
  playerCardDef,
  getInvestigator,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, startScenario, type Campaign } from '../campaign'
import { campaignDefinition } from '../campaign-definition'
import { forbiddenPeaks } from './forbidden-peaks'
import {
  constricting,
  levelOf,
  locationAtLevel,
  peaksEncounters,
  scavenger,
  terrorOfTheStars,
} from './forbidden-peaks-cards'
import { EOTE_FORBIDDEN_PEAKS } from './ice-and-death-cards'

// The scenario is not in the campaign selector yet: connect its builder for these tests only.
const definition = campaignDefinition('edge-of-the-earth')
const index = definition.scenarios.findIndex(({ id }) => id === EOTE_FORBIDDEN_PEAKS)
definition.scenarios[index] = { ...definition.scenarios[index]!, build: forbiddenPeaks }

function campaignAt(
  setup: Message[] = [],
  difficulty: 'standard' | 'hard' = 'standard',
  players = 1,
): Campaign {
  const campaign = newCampaign(
    'edge-of-the-earth',
    (['joe', 'daniela'] as const).slice(0, players) as ('joe' | 'daniela')[],
    difficulty,
  )
  const initial = startScenario({ ...campaign, scenarioIndex: 0 }, 45)
  const game = dispatch(
    { ...initial, pending: null, queue: [] },
    { type: 'InitializeExpedition' },
    ...setup,
  )
  return { ...campaign, log: game.campaignLog!, scenarioIndex: index }
}

function start(campaign: Campaign, seed = 75): GameState {
  let game = throughSetup(startScenario(campaign, seed))
  while (game.pending?.question.prompt === 'prompt.edgeOfTheEarth.partner')
    game = throughSetup(choose(game, 'choice.edgeOfTheEarth.noPartner'))
  return game
}
const ready = (game: GameState): GameState => ({ ...game, pending: null, queue: [] })
/** Read every story screen until the next decision. */
function proceed(game: GameState): GameState {
  let state = game
  while (state.pending?.question.prompt === 'prompt.story') state = choose(state, 'choice.continue')
  return state
}
const me = (game: GameState) => game.investigators[0]!.id
const at = (game: GameState, level: number) => locationAtLevel(game, level)!
/** First seed whose diagonal has `code` at `level`. */
function seedWith(code: string, level: number): number {
  for (let seed = 1; seed < 500; seed++) {
    const scenario = forbiddenPeaks({
      difficulty: 'standard',
      log: campaignAt().log,
      seed,
      investigators: ['joe'],
    })
    if (scenario.locations[level]?.id === code) return seed
  }
  throw new Error(`no seed for ${code}`)
}
const clear = (game: GameState, location: string): GameState => ({
  ...game,
  locations: { ...game.locations, [location]: { ...game.locations[location]!, clues: 0 } },
})

describe('To the Forbidden Peaks', () => {
  it('places five Mountainsides and The Summit in a diagonal from level 0 to level 5', () => {
    const game = start(campaignAt())
    const line = [0, 1, 2, 3, 4, 5].map((level) => at(game, level))
    expect(line.at(-1)).toBe('08607')
    expect(new Set(line).size).toBe(6)
    expect(getInvestigator(game, me(game)).location).toBe(line[0])
    expect(game.locations[line[0]!]?.revealed).toBe(true)
    expect(game.locations[line[1]!]?.connections).toEqual([line[0], line[2]])
    expect(game.chaosBag.filter((token) => token === 'elderThing')).toHaveLength(1)
  })

  it('reads the introduction checks: without the sledge a frost token is added', () => {
    const base = edgeBag(start(campaignAt()))
    const sledge = campaignAt([{ type: 'RecoverExpeditionSupply', supply: '08615' }])
    expect(edgeBag(start(sledge))).toBe(base - 1)
  })

  it('offers frost or trauma when Claypool is gone', () => {
    const campaign = campaignAt([
      { type: 'SetExpeditionPartnerStatus', partner: '08718', status: 'eliminated' },
    ])
    const game = startScenario(campaign, 75)
    let state = game
    while (state.pending && state.pending.question.prompt !== 'prompt.edgeOfTheEarth.peaksHardship')
      state = throughSetup(
        state.pending.question.prompt === 'prompt.edgeOfTheEarth.partner'
          ? choose(state, 'choice.edgeOfTheEarth.noPartner')
          : state,
      )
    expect(state.pending?.question.choices.map(({ label }) => label)).toEqual([
      'choice.edgeOfTheEarth.addFrost',
      'choice.edgeOfTheEarth.physicalTrauma',
    ])
  })

  it('halves the starting clues after scouting the mountain pass', () => {
    const seed = seedWith('08600', 0)
    const plain = start(campaignAt([], 'standard', 2), seed)
    const scouted = start(
      campaignAt(
        [{ type: 'RecordNote', note: 'edgeOfTheEarthScoutedMountainPass' }],
        'standard',
        2,
      ),
      seed,
    )
    expect(plain.locations['08600']?.clues).toBe(6)
    expect(scouted.locations['08600']?.clues).toBe(3)
  })

  it('puts the recovered supplies into play at level 0 and adds doom on Hard', () => {
    const game = start(
      campaignAt(
        [
          { type: 'RecoverExpeditionSupply', supply: '08616' },
          { type: 'RecoverExpeditionSupply', supply: '08620' },
        ],
        'hard',
      ),
    )
    expect(
      Object.values(game.placedAssets ?? {}).map(({ code, placement }) => [code, placement]),
    ).toEqual([
      ['08616', { type: 'location', location: at(game, 0) }],
      ['08620', { type: 'location', location: at(game, 0) }],
    ])
    expect(game.doom).toBe(1)
  })

  it('blocks unrevealed locations until the location below is cleared, and drops clues on moving', () => {
    let game = ready(start(campaignAt()))
    const [low, high] = [at(game, 0), at(game, 1)]
    game = dispatch(game, { type: 'MoveTo', investigator: me(game), location: high })
    expect(getInvestigator(game, me(game)).location).toBe(low)
    game = dispatch(clear(game, low), { type: 'GainClues', investigator: me(game), amount: 2 })
    game = dispatch(game, { type: 'MoveTo', investigator: me(game), location: high })
    expect(getInvestigator(game, me(game))).toMatchObject({ location: high, clues: 0 })
  })

  it.each([
    ['08602', { damage: 1, horror: 0 }],
    ['08603', { damage: 0, horror: 1 }],
  ] as const)('%s resolves its forced effect when entered from below', (code, taken) => {
    let game = ready(start(campaignAt(), seedWith(code, 1)))
    game = dispatch(clear(game, at(game, 0)), {
      type: 'MoveTo',
      investigator: me(game),
      location: code,
    })
    expect(getInvestigator(game, me(game))).toMatchObject({ location: code, ...taken })
  })

  it('values the skull by the level of your location', () => {
    let game = ready(start(campaignAt(), seedWith('08602', 1)))
    game = dispatch(clear(game, at(game, 0)), {
      type: 'MoveTo',
      investigator: me(game),
      location: '08602',
    })
    expect(levelOf(game, getInvestigator(game, me(game)).location)).toBe(1)
  })

  it('resigns at The Summit with Expedition assets and reaches Resolution 1', () => {
    let game = ready(
      start(
        campaignAt([
          { type: 'RecoverExpeditionSupply', supply: '08616' },
          { type: 'RecoverExpeditionSupply', supply: '08620' },
        ]),
      ),
    )
    const placed = Object.values(game.placedAssets ?? {}).find(({ code }) => code === '08616')!
    game = dispatch(game, {
      type: 'TakeControlOfPlaced',
      placed: placed.id,
      investigator: me(game),
    })
    game = {
      ...game,
      investigators: game.investigators.map((player) => ({ ...player, location: '08607' })),
    }
    game = dispatch(game, { type: 'RevealLocation', location: '08607' })
    const resign = availableAbilities(game, me(game)).find(({ key }) => key.endsWith(':resign'))!
    game = proceed(dispatch(game, ...resign.then))
    expect(game.victoryDisplay).toContain('08616')
    expect(game.pending?.question.prompt).toBe('prompt.edgeOfTheEarth.peaksExpeditionDeck')
    game = proceed(choose(game, 'choice.edgeOfTheEarth.peaksAddSupply'))
    expect(game.campaignLog?.notes).toContain('edgeOfTheEarthClimbedSummit')
    expect(game.campaignLog?.expedition?.supplies).toEqual(['08616'])
  })

  it('crosses off every supply when the team finds another way', () => {
    let game = ready(start(campaignAt([{ type: 'RecoverExpeditionSupply', supply: '08616' }])))
    game = proceed(dispatch(game, { type: 'DefeatInvestigator', investigator: me(game) }))
    expect(game.campaignLog?.notes).toContain('edgeOfTheEarthFoundAnotherWay')
    expect(game.campaignLog?.expedition?.supplies).toEqual([])
  })

  it('brings the Terror down at the highest occupied level and strikes a companion', () => {
    let game = ready(start(campaignAt([{ type: 'RecoverExpeditionSupply', supply: '08616' }])))
    const placed = Object.values(game.placedAssets ?? {})[0]!
    game = dispatch(game, {
      type: 'TakeControlOfPlaced',
      placed: placed.id,
      investigator: me(game),
    })
    game = dispatch(game, { type: 'ScenarioSpecific', key: 'terrorDescends', data: {} })
    while (
      game.pending?.question.kind === 'chooseOne' &&
      game.pending.question.choices.length === 1
    )
      game = choose(game, game.pending.question.choices[0]!.label)
    const terror = Object.values(game.enemies).find(({ code }) => code === '08608')
    expect(terror?.location).toBe(at(game, 0))
    expect(Object.values(game.assets).some(({ code }) => code === '08616')).toBe(false)
    const statuses = Object.values(game.campaignLog?.expedition?.partners ?? {}).map(
      ({ status }) => status,
    )
    expect(statuses.filter((status) => status === 'eliminated')).toHaveLength(1)
  })
})

describe('To the Forbidden Peaks encounter cards', () => {
  const card = (code: string) => peaksEncounters.find((entry) => entry.code === code)!
  /** Investigator at level 2 with the two lower locations cleared. */
  function climbed(supplies: Message[] = []): GameState {
    let game = ready(start(campaignAt(supplies)))
    game = clear(clear(game, at(game, 0)), at(game, 1))
    for (const level of [1, 2])
      game = dispatch(game, { type: 'RevealLocation', location: at(game, level) })
    return {
      ...game,
      interactive: false,
      investigators: game.investigators.map((player) => ({
        ...player,
        hand: [] as string[],
        location: at(game, 2),
      })),
      chaosBag: [-8 as const],
    }
  }

  it('Hanging on the Edge: a failed test deals damage, drops Expedition assets and moves you down', () => {
    let game = climbed([{ type: 'RecoverExpeditionSupply', supply: '08616' }])
    const placed = Object.values(game.placedAssets ?? {})[0]!
    game = dispatch(game, {
      type: 'TakeControlOfPlaced',
      placed: placed.id,
      investigator: me(game),
    })
    game = dispatch(game, {
      type: 'ResolveEncounterCard',
      investigator: me(game),
      card: card('08612'),
    })
    expect(getInvestigator(game, me(game))).toMatchObject({ location: at(game, 1), damage: 2 })
    expect(Object.values(game.placedAssets ?? {})).toMatchObject([
      { code: '08616', placement: { type: 'location', location: at(game, 2) } },
    ])
  })

  it('Rise of the Elder Things spawns the topmost Elder Thing in the discard engaged with you', () => {
    let game = climbed()
    game = { ...game, encounterDiscard: [scavenger, card('08610')] }
    game = dispatch(game, {
      type: 'ResolveEncounterCard',
      investigator: me(game),
      card: card('08697'),
    })
    const enemy = Object.values(game.enemies).find(({ code }) => code === '08695')
    expect(enemy?.engagedWith).toBe(me(game))
    expect(enemy?.modifiers).toMatchObject([{ fight: 1, evade: 1, until: 'round' }])
    expect(game.encounterDiscard.map(({ code }) => code)).toEqual(['08610', '08697'])
  })

  it('Constricting Elder Thing has health equal to its level and keeps you from climbing', () => {
    let game = climbed()
    game = dispatch(game, {
      type: 'SpawnEnemy',
      card: constricting,
      location: at(game, 2),
      engageWith: me(game),
    })
    const enemy = Object.values(game.enemies)[0]!
    expect(enemyHealth(game, enemy.id)).toBe(2)
    game = dispatch(clear(game, at(game, 2)), {
      type: 'MoveTo',
      investigator: me(game),
      location: at(game, 3),
    })
    expect(getInvestigator(game, me(game)).location).toBe(at(game, 2))
  })

  it('Terror of the Stars uses the level as fight and moves investigators down at the end of the round', () => {
    let game = climbed()
    game = dispatch(game, {
      type: 'SpawnEnemy',
      card: terrorOfTheStars(1),
      location: at(game, 2),
      engageWith: null,
    })
    const terror = Object.values(game.enemies)[0]!
    expect(terror.health).toBe(6)
    game = dispatch(game, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(getInvestigator(game, me(game)).location).toBe(at(game, 1))
  })
})

describe('Expedition supplies', () => {
  /** Joe at level 0 controlling the recovered supply; the location clues are cleared. */
  function holding(code: string, extra: Message[] = []): GameState {
    let game = ready(
      start(campaignAt([{ type: 'RecoverExpeditionSupply', supply: code as never }, ...extra])),
    )
    const placed = Object.values(game.placedAssets ?? {})[0]!
    game = dispatch(game, {
      type: 'TakeControlOfPlaced',
      placed: placed.id,
      investigator: me(game),
    })
    return {
      ...game,
      interactive: false,
      investigators: game.investigators.map((player) => ({ ...player, hand: [] as string[] })),
    }
  }
  /** Single choices resolve on their own. */
  const pick = (game: GameState, label: string, params = {}) =>
    game.pending ? choose(game, label, params) : game
  const asset = (game: GameState, code: string) =>
    Object.values(game.assets).find((entry) => entry.code === code)!
  const use = (game: GameState, key: string) => {
    const ability = availableAbilities(game, me(game)).find((entry) => entry.key.includes(key))!
    return dispatch(game, {
      type: 'UseAbility',
      investigator: me(game),
      key: ability.key,
      actions: ability.actions,
      provokes: ability.provokes,
      ...(ability.costs ? { costs: ability.costs } : {}),
      then: ability.then,
    })
  }

  it('Green Soapstone adds 1 damage to a successful attack', () => {
    const game = holding('08614')
    const soapstone = asset(game, '08614')
    const [reaction] = playerCardBehavior('08614')!.reactions!(
      game,
      {
        type: 'beforeEnemyDamage',
        enemy: 'e1',
        investigator: me(game),
        amount: 1,
        source: { attack: true },
      },
      soapstone,
    )
    expect(reaction?.then).toContainEqual({
      type: 'AdjustPendingEnemyDamage',
      enemy: 'e1',
      amount: 1,
    })
    expect(
      playerCardBehavior('08614')!.reactions!(
        game,
        { type: 'beforeEnemyDamage', enemy: 'e1', investigator: me(game), amount: 1 },
        soapstone,
      ),
    ).toEqual([])
  })

  it('Dynamite deals 3 damage to each enemy and investigator at the chosen location', () => {
    let game = holding('08616')
    game = dispatch(game, {
      type: 'SpawnEnemy',
      card: scavenger,
      location: at(game, 0),
      engageWith: null,
    })
    game = use(game, ':blast')
    game = pick(game, 'choice.location', { location: game.locations[at(game, 0)]!.name })
    expect(Object.values(game.enemies)).toHaveLength(0)
    // The engaged enemy also makes its attack of opportunity (1 damage).
    expect(game.log.at(-1)).toMatchObject({
      key: 'log.damage',
      params: { source: 'Dynamite', damage: 3 },
    })
    expect(asset(game, '08616')).toMatchObject({ uses: 1, exhausted: true })
  })

  it('Mineral Specimen investigates with base intellect 5, cancelling frost', () => {
    let game: GameState = { ...holding('08618'), chaosBag: ['frost'] }
    const location = at(game, 0)
    game = {
      ...game,
      locations: {
        ...game.locations,
        [location]: { ...game.locations[location]!, shroud: 5, clues: 3 },
      },
    }
    game = pick(use(game, ':investigate'), 'choice.skip')
    expect(getInvestigator(game, me(game)).clues).toBe(2)
    expect(asset(game, '08618').uses).toBe(2)
  })

  it('Spare Parts gives an investigator at your location 1 resource', () => {
    let game = holding('08620')
    const before = getInvestigator(game, me(game)).resources
    game = use(game, ':parts')
    game = pick(game, 'choice.edgeOfTheEarth.peaksGainResource')
    expect(getInvestigator(game, me(game)).resources).toBe(before + 1)
  })

  it('Wooden Sledge carries Item cards that can be played from it', () => {
    expect(playerCardDef('01087')?.traits).toContain('Item')
    let game = holding('08615')
    game = {
      ...game,
      investigators: game.investigators.map((player) => ({
        ...player,
        deck: ['01087', ...player.deck.filter((code) => code !== '01087')],
        resources: 5,
      })),
    }
    game = use(game, ':load')
    game = choose(game, 'choice.card', { card: playerCardDef('01087')!.name })
    game = choose(game, 'choice.edgeOfTheEarth.peaksSledgeDone')
    expect(game.scenarioDecks?.peaksSledge).toEqual([`${me(game)}|01087`])
    expect(getInvestigator(game, me(game)).deck).not.toContain('01087')
    const play = availableAbilities(game, me(game)).find(({ key }) => key.startsWith('sledge:'))!
    game = dispatch(game, {
      type: 'UseAbility',
      investigator: me(game),
      key: play.key,
      actions: play.actions,
      provokes: play.provokes,
      then: play.then,
    })
    expect(Object.values(game.assets).some(({ code }) => code === '01087')).toBe(true)
    expect(game.scenarioDecks?.peaksSledge).toEqual([])
  })

  it('Small Radio uses the abilities of absent partners for its own costs', () => {
    const game = holding('08619')
    const radio = availableAbilities(game, me(game)).filter(({ key }) => key.includes(':radio:'))
    expect(radio.length).toBeGreaterThan(0)
    for (const ability of radio) {
      expect(ability.costs?.slice(0, 2)).toEqual([
        { type: 'ExhaustAsset', asset: asset(game, '08619').id },
        { type: 'SpendUses', asset: asset(game, '08619').id, amount: 1 },
      ])
      expect(JSON.stringify([ability.costs, ability.then])).not.toContain('~')
    }
  })

  it('Miasmic Crystal cancels a Tekeli-li drawn at its location', () => {
    let game = holding('08617')
    game = { ...game, interactive: true }
    game = dispatch(game, {
      type: 'ShuffleTekeliliIntoDeck',
      investigator: me(game),
      amount: 1,
      drawInstead: true,
    })
    expect(game.pending?.question.prompt).toBe('prompt.edgeOfTheEarth.peaksCrystal')
    const deck = game.tekeliliDeck?.length ?? 0
    game = choose(game, 'choice.edgeOfTheEarth.peaksCrystalUse')
    expect(asset(game, '08617').uses).toBe(2)
    expect(game.tekeliliDeck?.length).toBe(deck + 1)
  })
})

function edgeBag(game: GameState): number {
  return game.chaosBag.filter((token) => token === 'frost').length
}

const enemyHealth = (game: GameState, id: string) => enemyMaxHealth(game, game.enemies[id]!)
