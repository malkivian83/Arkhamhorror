import { availableAbilities, cardCost, getInvestigator, type GameState } from '@lcg/engine'
import { choose, during, keep, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { CARCOSA_CHAOS_BAGS } from './campaign'
import {
  CODES,
  curtainCall,
  royalEmissary,
  STOLE_FROM_BOX_OFFICE,
  STRANGER_VARIANT,
} from './curtain-call'
import { SETS } from './encounter-sets'
import {
  STRANGER_DEFEATS,
  THE_MAN_IN_THE_PALLID_MASK,
  theManInThePallidMask,
} from './the-man-in-the-pallid-mask'
import {
  ability,
  applyFirst,
  game,
  horrorOn,
  man,
  placeAt,
  prep,
  putInPlay,
  resolveTest,
  update,
  withBag,
  type Mod,
} from './testing'

// Guía ES p. 4, "Preparación"; distribución sugerida de los Lugares.
describe('Curtain Call: setup', () => {
  for (const players of [1, 2, 3, 4])
    for (const difficulty of ['easy', 'standard', 'hard', 'expert'] as const)
      it(`${players} investigator(s), ${difficulty}`, () => {
        const state = game(players, difficulty)
        expect(Object.keys(state.locations).sort()).toEqual(
          [CODES.theatre, CODES.lobby, CODES.balcony, CODES.backstage].sort(),
        )
        expect(state.locations[CODES.theatre]!.revealed).toBe(true)
        expect(state.locations[CODES.lobby]!.revealed).toBe(false)
        expect(state.investigators.every((i) => i.location === CODES.theatre)).toBe(true)
        expect(Object.keys(state.setAsideLocations)).toHaveLength(6)
        expect(state.setAside.map((c) => c.code).sort()).toEqual([
          THE_MAN_IN_THE_PALLID_MASK,
          CODES.royalEmissary,
        ])
        expect(state.encounterDeck).toHaveLength(32)
        expect(state.chaosBag).toEqual(CARCOSA_CHAOS_BAGS[difficulty])
        expect(state.agendas.map((a) => [a.code, a.doomThreshold])).toEqual([
          [CODES.theThirdAct, 6],
          [CODES.encore, 6],
        ])
        // Una sola copia del acto 2, al azar y sin revelar hasta que avanza el acto 1.
        expect(state.acts.map((a) => a.code)).toEqual([
          CODES.awakening,
          expect.stringMatching(/^03047[abc]$/),
          CODES.curtainCall,
        ])
      })

  it('builds the encounter deck from the seven sets with their copies', () => {
    const deck = game().encounterDeck
    const count = (code: string) => deck.filter((c) => c.code === code).length
    expect(
      [
        SETS.blackStarsRise,
        SETS.spiresOfCarcosa,
        SETS.twistedToHisWill,
        SETS.descentIntoMadness,
        SETS.poltergeist,
        SETS.spiritsTorment,
        SETS.theKingsEdict,
        SETS.frozenInFear,
        SETS.dissonantVoices,
      ].map(count),
    ).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2])
    expect([SETS.fanatic, SETS.rottingRemains, SETS.swarmOfRats].map(count)).toEqual([3, 3, 3])
    expect(
      [
        SETS.whispersDismay,
        SETS.whispersDread,
        SETS.whispersAnxiety,
        SETS.whispersDoubt,
        SETS.agentOfTheKing,
      ].map(count),
    ).toEqual([1, 1, 1, 1, 1])
  })

  it('connects locations by their printed symbols, one-way where printed', () => {
    const { locations } = game()
    const links = (code: string) => [...locations[code]!.connections].sort()
    expect(links(CODES.theatre)).toEqual([CODES.lobby, CODES.backstage].sort())
    expect(links(CODES.balcony)).toEqual([CODES.theatre, CODES.lobby].sort())
    expect(links(CODES.lobby)).toEqual([CODES.theatre, CODES.balcony].sort())
    expect(links(CODES.backstage)).toEqual([CODES.theatre])
  })
})

describe('Curtain Call: locations', () => {
  it.each([
    [CODES.lobby, [CODES.lightingBox, CODES.boxOffice, CODES.greenRoom]],
    [CODES.backstage, [CODES.dressingRoom, CODES.rehearsalRoom, CODES.trapRoom]],
  ])('revealing %s puts two of its set-aside doorways into play at random', (hub, group) => {
    const state = during(game(2), withBag(0), { type: 'MoveTo', investigator: 'a', location: hub })
    const placed = group.filter((code) => state.locations[code])
    expect(placed).toHaveLength(2)
    for (const code of placed) {
      expect(state.locations[code]!.revealed).toBe(false)
      expect(state.locations[code]!.unrevealedName).toMatch(/Doorway$/)
      expect(state.locations[code]!.connections).toEqual([hub])
      expect(state.locations[hub]!.connections).toContain(code)
    }
    expect(Object.keys(state.setAsideLocations)).toHaveLength(4)
  })

  it('a hub only places the doorways of its group that are still set aside', () => {
    const state = prep(game(), [putInPlay(CODES.lightingBox, CODES.greenRoom)], {
      type: 'MoveTo',
      investigator: 'a',
      location: CODES.lobby,
    })
    expect(state.locations[CODES.boxOffice]).toBeDefined()
    expect(Object.keys(state.setAsideLocations).sort()).toEqual(
      [CODES.dressingRoom, CODES.rehearsalRoom, CODES.trapRoom].sort(),
    )
  })

  it('a move action from the Balcony to the Theatre deals 2 damage; other moves do not', () => {
    let state = prep(game(), [putInPlay(CODES.balcony, CODES.lobby), placeAt(CODES.balcony)], {
      type: 'MoveTo',
      investigator: 'a',
      location: CODES.theatre,
    })
    // Un movimiento por efecto no es una acción de movimiento.
    expect(getInvestigator(state, 'a').damage).toBe(0)
    state = prep(state, [placeAt(CODES.balcony)])
    state = choose(state, 'action.move', { location: 'Theatre' })
    expect(getInvestigator(state, 'a').damage).toBe(2)
    state = during(
      state,
      keep,
      { type: 'MoveTo', investigator: 'a', location: CODES.lobby },
      { type: 'MoveTo', investigator: 'a', location: CODES.theatre },
    )
    expect(getInvestigator(state, 'a').damage).toBe(2)
  })

  it('the Lobby draws 3 cards for two actions', () => {
    let state = prep(game(), [putInPlay(CODES.lobby), placeAt(CODES.lobby)])
    const draw = ability(state, ':draw')
    expect(draw.actions).toBe(2)
    const hand = getInvestigator(state, 'a').hand.length
    state = during(state, keep, ...draw.then)
    expect(getInvestigator(state, 'a').hand.length).toBe(hand + 3)
  })

  it('the Box Office gains 5 resources once per game for the whole group', () => {
    let state = prep(game(2), [
      putInPlay(CODES.boxOffice),
      placeAt(CODES.boxOffice, CODES.boxOffice),
    ])
    const before = getInvestigator(state, 'a').resources
    const steal = ability(state, ':steal')
    expect(steal.limit).toEqual({ per: 'game', group: true })
    state = during(state, keep, {
      type: 'UseAbility',
      investigator: 'a',
      key: steal.key,
      actions: 0,
      provokes: false,
      limit: steal.limit!,
      then: steal.then,
    })
    expect(getInvestigator(state, 'a').resources).toBe(before + 5)
    expect(state.scenarioMeta?.[STOLE_FROM_BOX_OFFICE]).toBe(1)
    expect(availableAbilities(state, 'b').some((a) => a.key.endsWith(':steal'))).toBe(false)
  })

  it('the Lighting Box raises the cost of cards in hand by 2 while you are in it', () => {
    let state = prep(game(), [putInPlay(CODES.lightingBox)])
    const asset = '12115' // Dr. Henry Armitage: coste 3.
    expect(cardCost(state, 'a', asset)).toBe(3)
    state = prep(state, [placeAt(CODES.lightingBox), update('a', { hand: [asset], resources: 6 })])
    expect(cardCost(state, 'a', asset)).toBe(5)
    state = during(state, keep, { type: 'PlayCard', investigator: 'a', code: asset })
    expect(getInvestigator(state, 'a').resources).toBe(1)
  })

  it('the Green Room investigates with +3 and then discards the whole hand', () => {
    let state = prep(game(), [putInPlay(CODES.greenRoom), placeAt(CODES.greenRoom), withBag(0)])
    expect(getInvestigator(state, 'a').hand.length).toBeGreaterThan(0)
    state = during(state, keep, ...ability(state, ':investigate').then)
    expect(state.skillTest?.difficulty).toBe(5)
    expect(state.skillTest?.baseModifier).toBe(3)
    state = resolveTest(state)
    expect(getInvestigator(state, 'a').clues).toBe(1)
    expect(getInvestigator(state, 'a').hand).toEqual([])
  })

  it('the Dressing Room heals 3 horror for three actions, only when hurt', () => {
    let state = prep(game(), [putInPlay(CODES.dressingRoom), placeAt(CODES.dressingRoom)])
    expect(availableAbilities(state, 'a').some((a) => a.key.endsWith(':heal'))).toBe(false)
    state = prep(state, [update('a', { horror: 4 })])
    expect(ability(state, ':heal').actions).toBe(3)
    state = during(state, keep, ...ability(state, ':heal').then)
    expect(getInvestigator(state, 'a').horror).toBe(1)
  })

  it.each([
    [3, 1],
    [2, 0],
  ])('the Rehearsal Room: intellect %i deals %i horror (succeeding by 2+)', (intellect, horror) => {
    let state = prep(game(), [
      putInPlay(CODES.rehearsalRoom),
      placeAt(CODES.rehearsalRoom),
      withBag(0),
      update('a', { skills: { willpower: 3, intellect, combat: 3, agility: 3 } }),
    ])
    state = choose(state, 'action.investigate', { location: 'Rehearsal Room' })
    state = resolveTest(state)
    expect(getInvestigator(state, 'a').horror).toBe(horror)
  })

  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
  ])(
    'revealing the Trap Room with %i investigator(s) engages %i Swarm of Rats',
    (players, rats) => {
      let state = prep(game(players), [
        putInPlay(CODES.trapRoom),
        (s) => ({
          ...s,
          locations: {
            ...s.locations,
            [CODES.trapRoom]: { ...s.locations[CODES.trapRoom]!, revealed: false },
          },
        }),
      ])
      const deck = state.encounterDeck.length
      state = during(state, keep, { type: 'MoveTo', investigator: 'a', location: CODES.trapRoom })
      const swarms = Object.values(state.enemies).filter((e) => e.code === SETS.swarmOfRats)
      expect(swarms).toHaveLength(rats)
      expect(swarms.every((e) => e.engagedWith === 'a' && e.location === CODES.trapRoom)).toBe(true)
      expect(state.encounterDeck).toHaveLength(deck - rats)
    },
  )

  it('Backstage counts each hidden treachery in hand as 3 cards for hand size', () => {
    const hidden: Mod = (s) => ({
      ...s,
      treacheries: {
        w: {
          kind: 'treachery',
          id: 'w',
          code: SETS.whispersDread,
          name: 'Whispers in Your Head (Dread)',
          keywords: ['peril'],
          placement: { type: 'threatArea', investigator: 'a' },
          hidden: true,
        },
      },
    })
    const six = update('a', { hand: Array.from({ length: 6 }, (_, n) => `a-card-${n}`) })
    let state = prep(game(), [hidden, six], { type: 'CheckHandSize', investigator: 'a' })
    expect(getInvestigator(state, 'a').hand).toHaveLength(6)
    state = prep(state, [putInPlay(CODES.backstage), placeAt(CODES.backstage)], {
      type: 'CheckHandSize',
      investigator: 'a',
    })
    expect(state.pending?.question.prompt).toBe('prompt.discardDownToHandSize')
    state = applyFirst(state)
    expect(getInvestigator(state, 'a').hand).toHaveLength(5)
    expect(state.treacheries.w).toBeDefined()
  })
})

describe('Curtain Call: acts', () => {
  it('Awakening puts a random set-aside location into play with the Man and keeps one Stranger', () => {
    let state = prep(game(2), [
      (s) => ({ ...s, investigators: s.investigators.map((i) => ({ ...i, clues: 3 })) }),
    ])
    state = choose(state, 'action.advanceAct', { act: 'Awakening', clues: 6 })
    while (state.pending && state.pending.question.prompt !== 'prompt.chooseAction')
      state = applyFirst(state)
    const stranger = man(state)!
    expect(stranger).toBeDefined()
    expect(Object.keys(state.setAsideLocations)).toHaveLength(5)
    expect(state.locations[stranger.location]!.revealed).toBe(false)
    expect(state.acts).toHaveLength(3)
    expect(state.actIndex).toBe(1)
    expect(state.acts[1]!.code).toMatch(/^03047[abc]$/)
    expect(state.acts[2]!.code).toBe(CODES.curtainCall)
  })

  const atStranger = (code: string, players = 2) =>
    prep(
      game(players),
      [
        putInPlay(CODES.lobby, CODES.dressingRoom, CODES.trapRoom, CODES.balcony),
        (s) => ({
          ...s,
          acts: s.acts.map((a) => (a.code!.startsWith('03047') ? { ...a, code } : a)),
          actIndex: 1,
        }),
      ],
      {
        type: 'SpawnEnemy',
        card: { ...theManInThePallidMask },
        location: CODES.dressingRoom,
        engageWith: null,
      },
    )

  it.each([
    [CODES.cityAflame, 'cultist', 'aflame', [CODES.theatre]],
    [CODES.pathIsMine, 'tablet', 'path', [CODES.dressingRoom]],
    [CODES.shoresOfHali, 'elderThing', 'hali', [CODES.dressingRoom, CODES.trapRoom]],
  ] as const)(
    '%s: defeating the Man advances, moves him to the Lobby and seeds horror',
    (code, token, mode, horror) => {
      let state = atStranger(code)
      const bag = state.chaosBag.length
      const enemy = man(state)!
      state = during(
        state,
        keep,
        { type: 'DamageEnemy', enemy: enemy.id, amount: 2 },
        { type: 'DefeatEnemy', enemy: enemy.id, by: 'a' },
      )
      expect(state.acts[state.actIndex]!.code).toBe(CODES.curtainCall)
      expect(man(state)).toMatchObject({ location: CODES.lobby, damageTaken: 0, engagedWith: null })
      expect(state.encounterDiscard.some((c) => c.code === THE_MAN_IN_THE_PALLID_MASK)).toBe(false)
      expect(state.chaosBag).toHaveLength(bag + 2)
      expect(state.chaosBag.filter((t) => t === token)).toHaveLength(2)
      expect(state.campaignLog!.chaosTokens).toEqual([])
      expect(state.scenarioMeta?.[STRANGER_VARIANT]).toBe(mode)
      expect(state.scenarioMeta?.[STRANGER_DEFEATS]).toBe(1)
      const withHorror = Object.values(state.locations)
        .filter((l) => l.horror)
        .map((l) => l.id)
      expect(withHorror.sort()).toEqual([...horror].sort())
    },
  )

  it('A City Aflame: entering a location with horror tests agility (3), once per round', () => {
    let state = prep(
      atStranger(CODES.cityAflame, 1),
      [
        withBag('autoFail'),
        horrorOn(CODES.lobby),
        (s) => ({ ...s, scenarioMeta: { ...s.scenarioMeta, [STRANGER_VARIANT]: 'aflame' } }),
      ],
      { type: 'MoveTo', investigator: 'a', location: CODES.lobby },
    )
    expect(state.skillTest).toMatchObject({ skill: 'agility', difficulty: 3 })
    state = resolveTest(state)
    expect(getInvestigator(state, 'a').damage).toBe(1)
    state = during(
      state,
      keep,
      { type: 'MoveTo', investigator: 'a', location: CODES.theatre },
      { type: 'MoveTo', investigator: 'a', location: CODES.lobby },
    )
    expect(state.skillTest).toBeNull()
    expect(getInvestigator(state, 'a').damage).toBe(1)
  })

  it('A City Aflame: ending the turn at a location with horror also tests agility', () => {
    let state = prep(atStranger(CODES.cityAflame, 1), [
      withBag('autoFail'),
      horrorOn(CODES.theatre),
      (s) => ({ ...s, scenarioMeta: { ...s.scenarioMeta, [STRANGER_VARIANT]: 'aflame' } }),
    ])
    state = during(state, keep, {
      type: 'Forced',
      trigger: { type: 'turnEnds', investigator: 'a' },
    })
    expect(state.skillTest).toMatchObject({ skill: 'agility', difficulty: 3 })
    expect(getInvestigator(resolveTest(state), 'a').damage).toBe(1)
  })

  it('The Path is Mine: leaving a location with horror tests agility (4) for 1 damage and 1 horror', () => {
    let state = prep(
      atStranger(CODES.pathIsMine, 1),
      [
        withBag('autoFail'),
        placeAt(CODES.lobby),
        horrorOn(CODES.lobby),
        (s) => ({ ...s, scenarioMeta: { ...s.scenarioMeta, [STRANGER_VARIANT]: 'path' } }),
      ],
      { type: 'MoveTo', investigator: 'a', location: CODES.theatre },
    )
    expect(state.skillTest).toMatchObject({ skill: 'agility', difficulty: 4 })
    state = resolveTest(state)
    expect(getInvestigator(state, 'a')).toMatchObject({
      damage: 1,
      horror: 1,
      location: CODES.theatre,
    })
  })

  it('The Shores of Hali: failing to leave cancels the move and deals 1 damage, once per round', () => {
    const hali = (bag: GameState['chaosBag'][number]) =>
      prep(
        atStranger(CODES.shoresOfHali, 1),
        [
          withBag(bag),
          placeAt(CODES.lobby),
          horrorOn(CODES.lobby),
          (s) => ({ ...s, scenarioMeta: { ...s.scenarioMeta, [STRANGER_VARIANT]: 'hali' } }),
        ],
        { type: 'MoveTo', investigator: 'a', location: CODES.theatre },
      )
    let state = hali('autoFail')
    expect(state.skillTest).toMatchObject({ skill: 'agility', difficulty: 2 })
    state = resolveTest(state)
    expect(getInvestigator(state, 'a')).toMatchObject({ damage: 1, location: CODES.lobby })
    state = during(state, keep, { type: 'MoveTo', investigator: 'a', location: CODES.theatre })
    expect(getInvestigator(state, 'a').location).toBe(CODES.theatre)
    const passed = resolveTest(hali(0))
    expect(getInvestigator(passed, 'a')).toMatchObject({ damage: 0, location: CODES.theatre })
  })

  const atCurtainCall = (players = 2) =>
    prep(atStranger(CODES.cityAflame, players), [(s) => ({ ...s, actIndex: 2 })])

  it('Curtain Call: the Lobby offers resign only while the Man is not in play', () => {
    let state = prep(atCurtainCall(), [placeAt(CODES.lobby)])
    expect(availableAbilities(state, 'a').some((a) => a.key === 'act:resign')).toBe(false)
    state = during(state, keep, { type: 'DiscardEnemy', enemy: man(state)!.id })
    expect(man(state)).toBeUndefined()
    expect(ability(state, 'act:resign').actions).toBe(1)
    expect(availableAbilities(state, 'b').some((a) => a.key === 'act:resign')).toBe(false)
  })

  it('Curtain Call: at the end of the round horror spreads to locations connected to horror', () => {
    const state = prep(atCurtainCall(), [horrorOn(CODES.lobby)], {
      type: 'Forced',
      trigger: { type: 'roundEnds' },
    })
    const horror = (code: string) => state.locations[code]!.horror ?? 0
    // Teatro y Palcos se conectan con el Vestíbulo; los camerinos no.
    expect([CODES.theatre, CODES.balcony, CODES.lobby].map(horror)).toEqual([1, 1, 1])
    expect([CODES.dressingRoom, CODES.trapRoom, CODES.backstage].map(horror)).toEqual([0, 0, 0])
  })

  it('Curtain Call: when every undefeated investigator has resigned, the group chooses R1 or R2', () => {
    let state = prep(atCurtainCall(), [
      placeAt(CODES.lobby, CODES.lobby),
      (s) => ({ ...s, enemies: {} }),
    ])
    state = during(state, keep, { type: 'DefeatInvestigator', investigator: 'b' })
    state = during(state, keep, { type: 'Resign', investigator: 'a' })
    expect(state.pending?.question.story?.title ?? state.pending?.question.prompt).toBeDefined()
    expect(labels(state)).toEqual(['story.curtainCall.decide1', 'story.curtainCall.decide2'])
    state = choose(state, 'story.curtainCall.decide2')
    state = choose(state, 'choice.continue')
    expect(state.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(state.campaignLog!.notes).toContain('carcosaAvoidedPolice')
  })
})

describe('Curtain Call: agendas', () => {
  it('The Third Act spawns the Royal Emissary in the Theatre', () => {
    const state = during(game(), keep, { type: 'PlaceDoom', amount: 6 }, { type: 'CheckAgenda' })
    expect(state.agendaIndex).toBe(1)
    const emissary = Object.values(state.enemies).find((e) => e.code === CODES.royalEmissary)
    expect(emissary).toMatchObject({ location: CODES.theatre, health: 4, fight: 4 })
  })

  it('the Royal Emissary deals 1 horror at the end of the enemy phase at or next to him', () => {
    const state = prep(
      game(4),
      [
        putInPlay(CODES.lobby, CODES.balcony, CODES.backstage),
        placeAt(CODES.theatre, CODES.lobby, CODES.balcony, CODES.backstage),
      ],
      { type: 'SpawnEnemy', card: { ...royalEmissary }, location: CODES.lobby, engageWith: null },
      { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } },
    )
    // El Vestíbulo conecta con el Teatro y los Palcos; Bastidores no.
    expect(state.investigators.map((i) => i.horror)).toEqual([1, 1, 1, 0])
  })

  it('Encore: defeating the Emissary resets to agenda 1 with 3 doom; it returns from the victory display', () => {
    let state = prep(
      game(),
      [putInPlay(CODES.balcony)],
      { type: 'PlaceDoom', amount: 6 },
      { type: 'CheckAgenda' },
      { type: 'PlaceLocationTokens', location: CODES.balcony, doom: 1 },
    )
    const emissary = Object.values(state.enemies).find((e) => e.code === CODES.royalEmissary)!
    state = during(state, keep, { type: 'DefeatEnemy', enemy: emissary.id, by: 'a' })
    expect(state.victoryDisplay).toContain(CODES.royalEmissary)
    expect(state.agendaIndex).toBe(0)
    expect(state.doom).toBe(3)
    expect(state.locations[CODES.balcony]!.doom).toBe(0)
    const points = state.victoryPoints ?? 0
    state = during(state, keep, { type: 'PlaceDoom', amount: 3 }, { type: 'CheckAgenda' })
    expect(state.agendaIndex).toBe(1)
    expect(state.victoryDisplay).not.toContain(CODES.royalEmissary)
    expect(state.victoryPoints).toBe(points - 2)
    expect(Object.values(state.enemies).some((e) => e.code === CODES.royalEmissary)).toBe(true)
  })

  it('Encore: advancing deals 100 horror to each investigator and ends with no resolution', () => {
    let state = during(
      game(2),
      (s) => ({ ...s, agendaIndex: 1 }),
      { type: 'PlaceDoom', amount: 6 },
      { type: 'CheckAgenda' },
    )
    while (state.pending && state.pending.question.prompt !== 'prompt.story')
      state = applyFirst(state)
    expect(state.pending?.question.story?.title).toBe('story.curtainCall.noResolutionTitle')
    state = choose(state, 'choice.continue')
    expect(state.outcome).toEqual({ type: 'noResolution' })
    expect(state.investigators.every((i) => i.eliminated && !i.resigned)).toBe(true)
  })
})

describe('Curtain Call: act 2 copy', () => {
  it('each seed keeps one of the three Stranger copies, and all three occur', () => {
    const picked = new Set(
      Array.from(
        { length: 30 },
        (_, seed) => curtainCall({ difficulty: 'standard', seed }).acts[1]!.code,
      ),
    )
    expect([...picked].sort()).toEqual([CODES.cityAflame, CODES.pathIsMine, CODES.shoresOfHali])
  })
})
