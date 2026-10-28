import {
  applyInput,
  availableAbilities,
  createGame,
  emptyCampaignLog,
  scenarioBehavior,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, keep, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { whereDoomAwaits, W, WN, DOOM_LOCATIONS, DOOM_ENCOUNTERS } from './where-doom-awaits'
import { ALTERED_PATHS, DIVERGING_PATHS } from './doom-codes'
import { doomSpecific as specific } from './doom-helpers'
import { BN } from './altar-codes'
import { HN } from './house-codes'
import { MN } from './museum-codes'
import { UN } from './unseen-codes'
import { crazedShoggoth } from './crazed-shoggoth'
import { devoteeOfTheKey } from './devotee-of-the-key'
import { conglomerationOfSpheres } from './conglomeration-of-spheres'
import { servantOfTheLurker } from './servant-of-the-lurker'
import {
  newCampaign,
  startScenario,
  finishScenario,
  currentScenario,
  campaignLost,
} from '../campaign'
import { playRandomlyToEnd } from '../scenario-testing'
function game(players = 1, notes: string[] = [], values: Record<string, string> = {}) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players),
    log = emptyCampaignLog(ids)
  log.notes = notes
  log.values = values
  let s = throughSetup(
    createGame({
      seed: 7,
      interactive: true,
      campaignLog: log,
      scenario: { ...whereDoomAwaits({ log }), chaosBag: [0] },
      investigators: ids.map((id) =>
        testInvestigator(id, {
          health: 20,
          sanity: 20,
          skills: { willpower: 9, intellect: 9, combat: 9, agility: 9 },
        }),
      ),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator')
  return s
}
const actor =
  (patch: Partial<GameState['investigators'][number]>, id = 'a') =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  })
const path = (s: GameState, code: string, revealed = false): GameState => ({
  ...s,
  locations: {
    ...s.locations,
    [code]: { ...DOOM_LOCATIONS.find((l) => l.id === code)!, revealed, clues: 0 },
  },
})
function settle(s: GameState) {
  for (
    let n = 0;
    s.pending && !s.outcome && s.pending.question.prompt !== 'prompt.chooseAction' && n < 1000;
    n++
  ) {
    const q = s.pending,
      option = q.question.choices.findIndex((c) =>
        ['choice.revealToken', 'choice.applyResults', 'choice.skip'].includes(c.label),
      )
    s = applyInput(s, { investigator: q.investigator, choice: option < 0 ? 0 : option })
  }
  return s
}
const draw = (code: string): Message => ({
  type: 'ResolveEncounterCard',
  investigator: 'a',
  card: DOOM_ENCOUNTERS.find((c) => c.code === code)!,
})
describe('Where Doom Awaits — campaign guide pp.19–20 and printed cards', () => {
  it.each([1, 2, 3, 4])(
    'a legal run with %i real starter decks reaches a resolution and saves',
    (players) => {
      const campaign = {
        ...newCampaign(
          'the-dunwich-legacy',
          ['joe', 'daniela', 'trish', 'dexter'].slice(0, players),
          'standard',
        ),
        scenarioIndex: 6,
      }
      const s = playRandomlyToEnd(
        startScenario(campaign, 920 + players, true),
        920 + players,
        12000,
      )
      const next = JSON.parse(JSON.stringify(finishScenario(campaign, s)))
      expect(currentScenario(next)).toBe('lost-in-time-and-space')
      expect(campaignLost(next)).toBe(s.campaignLog?.notes.includes('campaignLost'))
    },
  )
  it('reaches the gate through legal actions without editing the prepared state', () => {
    let s = game()
    const trace: unknown[] = []
    for (let n = 0; n < 700 && !s.outcome; n++) {
      s = settle(s)
      if (s.outcome) break
      const p = s.pending!,
        choices = p.question.choices,
        i = s.investigators[0]!,
        here = i.location!
      let selected = choices.findIndex((c) => c.label === 'action.advanceAct')
      if (selected < 0 && !(s.actIndex === 2 && here === W.peak))
        selected = choices.findIndex((c) => c.label === 'action.fight')
      if (selected < 0 && (s.locations[here]?.clues ?? 0) > 0 && (s.actIndex === 2 || i.clues < 2))
        selected = choices.findIndex((c) => c.label === 'action.investigate')
      if (
        selected < 0 &&
        ((s.actIndex === 0 && here === W.base) ||
          (s.actIndex === 1 && here === W.ascent && i.clues < 2))
      )
        selected = choices.findIndex((c) => c.label === 'ability.doom.investigate')
      if (selected < 0) {
        const candidates = Object.values(s.locations).filter(
          (l) =>
            l.id !== here &&
            (s.actIndex === 2
              ? l.id === W.peak
              : s.actIndex === 1 && i.clues >= 2
                ? l.id === W.peak
                : (s.actIndex === 1 ? ALTERED_PATHS : DIVERGING_PATHS).includes(l.id) &&
                  (!l.revealed || l.clues > 0)),
        )
        const target =
          candidates.sort((a, b) => Number(b.clues > 0) - Number(a.clues > 0))[0]?.id ??
          (s.actIndex === 0 ? W.base : W.ascent)
        const queue = [{ id: here, step: '' }],
          visited = new Set([here])
        let move: string | undefined
        while (queue.length) {
          const node = queue.shift()!
          if (node.id === target) {
            move = node.step
            break
          }
          for (const l of s.locations[node.id]!.connections)
            if (!visited.has(l) && (l !== W.ascent || s.locations[l]?.revealed)) {
              visited.add(l)
              queue.push({ id: l, step: node.step || l })
            }
        }
        if (move)
          selected = choices.findIndex(
            (c) =>
              c.label === 'action.move' && c.target?.type === 'location' && c.target.id === move,
          )
      }
      if (selected < 0) selected = choices.findIndex((c) => c.label === 'action.endTurn')
      if (selected < 0) throw Error(JSON.stringify(p.question))
      trace.push({
        round: s.round,
        act: s.actIndex,
        location: here,
        clues: i.clues,
        choice: choices[selected]!.label,
      })
      s = applyInput(s, { investigator: p.investigator, choice: selected })
    }
    expect(s.outcome, JSON.stringify(trace.slice(-25))).toEqual({
      type: 'resolution',
      resolution: 1,
    })
  })
  it.each([1, 2, 3, 4])('sets up %i investigators and six random set-aside paths', (players) => {
    const s = game(players)
    expect(Object.keys(s.locations)).toHaveLength(3)
    expect(
      Object.keys(s.setAsideLocations).filter((l) => DIVERGING_PATHS.includes(l)),
    ).toHaveLength(3)
    expect(Object.keys(s.setAsideLocations).filter((l) => ALTERED_PATHS.includes(l))).toHaveLength(
      3,
    )
    expect(s.encounterDeck).toHaveLength(44)
    expect(s.campaignLog?.chaosTokens).toContain(-5)
  })
  it.each([
    [BN.restored, W.ascendingI],
    [MN.failed, W.ascendingII],
    ['', W.ascendingIII],
  ])('selects act II from %s', (note, code) =>
    expect(game(1, note ? [note] : []).acts[1]?.code).toBe(code),
  )
  it('uses escaped Broods, Naomi support and the distinct Hideous Abominations set', () => {
    const s = game(3, [BN.killed, HN.naomi], { [UN.escaped]: '3' })
    expect(s.doom).toBe(3)
    expect(s.investigators[0]?.clues).toBe(2)
    expect(s.encounterDeck).toHaveLength(46)
    expect(Object.values(s.enemies).find((e) => e.code === W.spheres)?.location).toBe(W.ascent)
  })
  it('immediately pays the mandatory first objective and clears all location clues', () => {
    let s = game(2)
    s = during(
      s,
      (x) => ({
        ...actor({ clues: 2 }, 'b')(actor({ clues: 2 })(x)),
        locations: { ...x.locations, [W.base]: { ...x.locations[W.base]!, clues: 5 } },
      }),
      { type: 'CheckActObjective' },
    )
    s = settle(s)
    expect(s.actIndex).toBe(1)
    expect(s.investigators.map((i) => i.clues)).toEqual([0, 0])
    expect(s.locations[W.ascent]?.revealed).toBe(true)
    expect(s.locations[W.base]?.clues).toBe(0)
  })
  it.each([W.ascendingI, W.ascendingII, W.ascendingIII])(
    'advances %s WHEN entering Peak, before its reveal clues',
    (code) => {
      let s = game(
        2,
        code === W.ascendingI ? [BN.restored] : code === W.ascendingII ? [MN.failed] : [],
      )
      s = during(s, (x) => actor({ location: W.ascent, clues: 4 })({ ...x, actIndex: 1 }), {
        type: 'MoveTo',
        investigator: 'a',
        location: W.peak,
      })
      s = settle(s)
      expect(s.actIndex).toBe(2)
      expect(s.locations[W.peak]?.clues).toBe(4)
      const seth = Object.values(s.enemies).find((e) => e.code === W.seth)
      if (code === W.ascendingI) expect(seth).toBeUndefined()
      else {
        expect(seth?.location).toBe(W.peak)
        expect(seth?.damageTaken).toBe(code === W.ascendingIII ? 2 : 0)
      }
    },
  )
  it('places reveal clues only on Altered paths during act II and rejects other transfers without spending', () => {
    let s = game()
    s = during(
      s,
      (x) => actor({ clues: 2 })({ ...path(path(x, W.tear), W.slaughtered), actIndex: 1 }),
      { type: 'RevealLocation', location: W.tear },
      { type: 'RevealLocation', location: W.slaughtered },
      { type: 'PlaceCluesOnLocationFromPool', location: W.base, amount: 2 },
      {
        type: 'MoveClues',
        from: { type: 'investigator', id: 'a' },
        to: { type: 'location', id: W.base },
        amount: 1,
      },
    )
    expect(s.locations[W.tear]?.clues).toBe(1)
    expect(s.locations[W.slaughtered]?.clues).toBe(0)
    expect(s.locations[W.base]?.clues).toBe(0)
    expect(s.investigators[0]?.clues).toBe(2)
  })
  it('discovers a random path through a real investigate test and limits it per investigator', () => {
    let s = game(2)
    s = during(s, keep, { type: 'BeginTurn', investigator: 'a' })
    const ability = availableAbilities(s, 'a').find((a) => a.key === `${W.base}:investigate`)!
    s = settle(during(s, keep, ...ability.then))
    expect(Object.keys(s.locations)).toHaveLength(4)
    expect(s.investigators[0]?.clues).toBe(0)
    const added = Object.keys(s.locations).find((l) => DIVERGING_PATHS.includes(l))!
    expect(s.locations[added]?.connections).toContain(W.base)
    expect(s.locations[W.base]?.connections).toContain(added)
  })
  it.each([W.slaughtered, W.eerie, W.destroyed, W.frozen, W.gap, W.tear, W.uprooted, W.memories])(
    'resolves the principal reveal effect of %s',
    (code) => {
      let s = game(code === W.frozen ? 2 : 1)
      s = during(
        s,
        (x) =>
          actor({
            location: code,
            actionsRemaining: code === W.eerie || code === W.memories || code === W.gap ? 2 : 0,
            deck: Array(20).fill('01088'),
          })(path(x, code)),
        { type: 'RevealLocation', location: code, investigator: 'a' },
      )
      s = settle(s)
      const i = s.investigators[0]!
      if (code === W.slaughtered || code === W.memories) expect(i.horror).toBe(2)
      if (code === W.eerie) expect(i.discard).toHaveLength(4)
      if (code === W.uprooted) expect(i.discard).toHaveLength(5)
      if (code === W.tear) expect(i.damage).toBe(2)
      if (code === W.destroyed) expect(s.locations[code]?.doom).toBe(1)
      if (code === W.frozen) expect(i.actionsRemaining).toBe(0)
      if (code === W.gap)
        expect(Object.values(s.enemies).some((e) => e.location === W.gap)).toBe(true)
    },
  )
  it('Devotee moves at phase end, then sacrifices itself on a later phase without advancing agenda', () => {
    let s = during(game(), keep, {
      type: 'SpawnEnemy',
      card: devoteeOfTheKey,
      location: W.ascent,
      engageWith: null,
    })
    const id = Object.keys(s.enemies)[0]!
    s = during(s, keep, { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } })
    expect(s.enemies[id]?.location).toBe(W.peak)
    s = during(s, (x) => ({ ...x, doom: 11 }), {
      type: 'Forced',
      trigger: { type: 'enemyPhaseEnds' },
    })
    expect(s.enemies[id]).toBeUndefined()
    expect(s.doom).toBe(13)
    expect(s.agendaIndex).toBe(0)
  })
  it('Shoggoth kills only on a lethal attack and does not add defeat trauma', () => {
    let s = during(game(), actor({ damage: 19 }), {
      type: 'SpawnEnemy',
      card: crazedShoggoth,
      location: W.base,
      engageWith: 'a',
    })
    s = settle(
      during(s, keep, {
        type: 'EnemyAttack',
        exhaustAfter: false,
        enemy: Object.keys(s.enemies)[0]!,
        investigator: 'a',
      }),
    )
    expect(s.campaignLog?.investigators.a?.killed).toBe(true)
    expect(s.campaignLog?.investigators.a?.physicalTrauma).toBe(0)
  })
  it('Spaces Between flips paths, removes clues, moves occupants and preserves doom', () => {
    let s = game()
    s = during(
      s,
      (x) => actor({ location: W.slaughtered })(path(path(x, W.slaughtered, true), W.tear, true)),
      specific('doomLocationDoom', { location: W.slaughtered, amount: 2 }),
      { type: 'SpawnEnemy', card: devoteeOfTheKey, location: W.tear, engageWith: null },
      draw(W.spaces),
    )
    s = settle(s)
    expect(s.investigators[0]?.location).toBe(W.base)
    expect(s.locations[W.slaughtered]?.revealed).toBe(false)
    expect(s.locations[W.slaughtered]?.doom).toBe(2)
    expect(Object.values(s.enemies)[0]?.location).toBe(W.ascent)
  })
  it('Rites shuffles weaknesses just milled at Altered locations exactly once', () => {
    let s = game()
    s = during(
      s,
      (x) =>
        actor({ location: W.tear, deck: ['12097', '01088', '01088'], discard: [] })(
          path(x, W.tear, true),
        ),
      draw(W.rites),
    )
    s = settle(s)
    expect(s.investigators[0]?.deck.filter((c) => c === '12097')).toHaveLength(1)
    expect(s.investigators[0]?.discard).not.toContain('12097')
  })
  it('Vortex only tests investigators at Sentinel Hill', () => {
    let s = game(2)
    s = during(s, (x) => actor({ location: W.tear }, 'b')(path(x, W.tear, true)), draw(W.vortex))
    s = settle(s)
    expect(s.investigators.every((i) => i.damage === 0)).toBe(true)
  })
  it('the distinct abominations have their printed attack effects', () => {
    let s = during(
      game(),
      actor({ deck: Array(10).fill('01088') }),
      { type: 'SpawnEnemy', card: servantOfTheLurker, location: W.base, engageWith: null },
      { type: 'SpawnEnemy', card: conglomerationOfSpheres, location: W.base, engageWith: null },
    )
    const enemy = Object.values(s.enemies).find((e) => e.code === W.lurker)!
    s = during(s, keep, {
      type: 'Forced',
      trigger: { type: 'whenEnemyAttacks', enemy: enemy.id, investigator: 'a' },
    })
    expect(s.investigators[0]?.discard).toHaveLength(2)
  })
  it.each([1, 2])('records resolution %i and campaign loss only on failure', (n) => {
    const s = settle(
      during(game(), keep, { type: 'EndScenario', outcome: { type: 'resolution', resolution: n } }),
    )
    expect(s.campaignLog?.notes).toContain(n === 1 ? WN.entered : WN.merged)
    expect(s.campaignLog?.notes.includes('campaignLost')).toBe(n === 2)
    expect(s.campaignLog?.investigators.a?.insane ?? false).toBe(n === 2)
  })
  it('uses correct printed chaos tokens on both difficulties', () => {
    const s = game(),
      b = scenarioBehavior(s.scenarioId)!
    expect(b.tokenEffect?.(s, 'skull', 'a').modifier).toBe(-1)
    expect(
      b.tokenEffect?.(
        { ...path(actor({ location: W.tear })(s), W.tear, true), difficulty: 'hard' },
        'skull',
        'a',
      ).modifier,
    ).toBe(-5)
    expect(
      b.tokenEffect?.({ ...s, agendaIndex: 1, difficulty: 'hard' }, 'tablet', 'a').autoFail,
    ).toBe(true)
  })
  it('Shoggoth damage assigned to an ally can prevent the lethal replacement', () => {
    let s = during(
      game(),
      (x) => ({
        ...actor({ damage: 19, horror: 0 })(x),
        assets: {
          ally: {
            id: 'ally',
            code: '01018',
            owner: 'a',
            exhausted: false,
            damage: 0,
            horror: 0,
            uses: 0,
          },
        },
      }),
      { type: 'SpawnEnemy', card: crazedShoggoth, location: W.base, engageWith: 'a' },
    )
    s = during(s, keep, {
      type: 'EnemyAttack',
      enemy: Object.keys(s.enemies)[0]!,
      investigator: 'a',
      exhaustAfter: false,
    })
    while (
      s.pending &&
      ['prompt.assignDamage', 'prompt.assignHorror'].includes(s.pending.question.prompt)
    ) {
      const p = s.pending,
        index = p.question.choices.findIndex((c) => c.target?.type === 'asset')
      s = applyInput(s, { investigator: p.investigator, choice: index < 0 ? 0 : index })
    }
    s = settle(s)
    expect(s.campaignLog?.investigators.a?.killed ?? false).toBe(false)
    expect(s.investigators[0]?.damage).toBe(19)
  })
  it('Peak reacts to drawing a Hex even if its revelation is subsequently cancelled', () => {
    let s = during(game(), actor({ location: W.peak }), {
      type: 'RevealLocation',
      location: W.peak,
    })
    // RR: the when-drawn window precedes the revelation cancellation window.
    s = during(
      s,
      (x) => ({
        ...x,
        treacheries: {
          hex: {
            kind: 'treachery',
            id: 'hex',
            code: W.rites,
            name: 'Rites Howled',
            traits: ['Hex'],
            keywords: [],
            placement: { type: 'limbo' },
          },
        },
      }),
      {
        type: 'Forced',
        trigger: { type: 'whenTreacheryDrawn', investigator: 'a', treachery: 'hex' },
      },
      { type: 'CancelRevelation', treachery: 'hex' },
      { type: 'RevealTreachery', investigator: 'a', treachery: 'hex' },
    )
    expect(s.investigators[0]?.damage).toBe(1)
    expect(s.treacheries.hex?.canceled).toBe(true)
  })
  it('the path investigation limit is personal and resets each round', () => {
    let s = game(2)
    const p = s.pending!,
      index = p.question.choices.findIndex((c) => c.label === 'ability.doom.investigate')
    expect(index).toBeGreaterThanOrEqual(0)
    s = settle(applyInput(s, { investigator: p.investigator, choice: index }))
    expect(availableAbilities(s, 'a').some((a) => a.key === `${W.base}:investigate`)).toBe(false)
    expect(
      availableAbilities(actor({ actionsRemaining: 3 }, 'b')(s), 'b').some(
        (a) => a.key === `${W.base}:investigate`,
      ),
    ).toBe(true)
    expect(
      availableAbilities({ ...s, round: s.round + 1 }, 'a').some(
        (a) => a.key === `${W.base}:investigate`,
      ),
    ).toBe(true)
  })
  it('Destroyed Path substitutes a real investigation with removal of one doom', () => {
    let s = during(
      game(),
      (x) => actor({ location: W.destroyed })(path(x, W.destroyed, true)),
      specific('doomLocationDoom', { location: W.destroyed, amount: 2 }),
    )
    const ability = availableAbilities(s, 'a').find((a) => a.key === `${W.destroyed}:investigate`)!
    s = settle(during(s, keep, ...ability.then))
    expect(s.locations[W.destroyed]?.doom).toBe(1)
    expect(s.investigators[0]?.clues).toBe(0)
  })
  it('the Spheres discard the Melee asset after the attack test finishes', () => {
    let s = during(
      game(),
      (x) => ({
        ...x,
        assets: {
          blade: {
            id: 'blade',
            code: '01020',
            owner: 'a',
            exhausted: false,
            damage: 0,
            horror: 0,
            uses: 0,
          },
        },
      }),
      { type: 'SpawnEnemy', card: conglomerationOfSpheres, location: W.base, engageWith: 'a' },
    )
    const enemy = Object.keys(s.enemies)[0]!
    s = during(s, keep, {
      type: 'Forced',
      trigger: {
        type: 'afterSkillTest',
        investigator: 'a',
        kind: 'fight',
        enemy,
        source: 'blade',
        succeeded: false,
        margin: -1,
      },
    })
    expect(s.assets.blade).toBeDefined()
    s = during(s, keep, {
      type: 'Forced',
      trigger: {
        type: 'skillTestEnded',
        investigator: 'a',
        kind: 'fight',
        enemy,
        source: 'blade',
        succeeded: false,
        margin: -1,
      },
    })
    expect(s.assets.blade).toBeUndefined()
    expect(s.investigators[0]?.discard).toContain('01020')
  })
  it.each([W.base, W.tear])('elimination obeys the act II clue prohibition at %s', (location) => {
    let s = game(2)
    s = during(s, (x) => actor({ location, clues: 2 })({ ...path(x, W.tear, true), actIndex: 1 }), {
      type: 'DefeatInvestigator',
      investigator: 'a',
    })
    expect(s.locations[location]?.clues).toBe(location === W.tear ? 2 : 0)
  })
})
