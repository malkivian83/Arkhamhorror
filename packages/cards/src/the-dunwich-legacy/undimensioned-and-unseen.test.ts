import {
  applyInput,
  availableActions,
  availableAbilities,
  createGame,
  emptyCampaignLog,
  enemyMaxHealth,
  getInvestigator,
  playerCardDef,
  scenarioBehavior,
  skillTestValue,
  nextInt,
  type GameState,
  type Message,
  type Difficulty,
} from '@lcg/engine'
import { choose, during, keep, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { expect, it, describe } from 'vitest'
import '../index'
import {
  undimensionedAndUnseen,
  U,
  UN,
  UNSEEN_LOCATIONS,
  UNSEEN_ENCOUNTERS,
} from './undimensioned-and-unseen'
import { unseenSpecific as specific, broods, unseenWeaknessPool } from './unseen-helpers'
import { UNSEEN_WEAKNESS_POOL } from './unseen-weakness-pool'
import { B, BN } from './altar-codes'
import { H } from './house-codes'
import { newCampaign, startScenario, finishScenario, currentScenario } from '../campaign'
import { playRandomlyToEnd } from '../scenario-testing'
const change =
  (patch: Partial<GameState['investigators'][number]>, id = 'a') =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  })
function game(
  players = 1,
  sacrificed = 0,
  seed = 11,
  difficulty: Difficulty = 'standard',
  strong = false,
) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players),
    log = emptyCampaignLog(ids)
  log.values[BN.sacrificed] = [H.armitage, '02061', '02080', B.zebulon, B.earl]
    .slice(0, sacrificed)
    .join(',')
  let s = throughSetup(
    createGame({
      seed,
      difficulty,
      interactive: true,
      campaignLog: log,
      scenario: { ...undimensionedAndUnseen({ difficulty, log }), chaosBag: [0] },
      investigators: ids.map((id) =>
        testInvestigator(id, {
          health: 30,
          sanity: 30,
          ...(strong ? { skills: { willpower: 9, intellect: 9, combat: 9, agility: 9 } } : {}),
        }),
      ),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator')
  return s
}
function settle(s: GameState, accept = false) {
  for (
    let n = 0;
    s.pending && !s.outcome && s.pending.question.prompt !== 'prompt.chooseAction' && n < 500;
    n++
  ) {
    const p = s.pending,
      choice = p.question.choices.findIndex((c) =>
        ['choice.revealToken', 'choice.applyResults', ...(accept ? [] : ['choice.skip'])].includes(
          c.label,
        ),
      )
    s = applyInput(s, { investigator: p.investigator, choice: choice < 0 ? 0 : choice })
  }
  return s
}
const draw = (code: string): Message => ({
  type: 'ResolveEncounterCard',
  investigator: 'a',
  card: { ...UNSEEN_ENCOUNTERS.find((c) => c.code === code)! },
})

it.each([U.glenClues, U.heathClues])(
  'the group at %s can pool two clues onto one local Abomination once',
  (code) => {
    let s = game(2)
    const enemy = broods(s)[0]!
    s = during(
      s,
      (x) => ({
        ...room(code)(x),
        investigators: x.investigators.map((i) => ({ ...i, location: code, clues: 1 })),
        enemies: { ...x.enemies, [enemy.id]: { ...enemy, location: code } },
      }),
      put(code),
      reveal(code),
    )
    s = doAbility(s, `${code}:clue`)
    if (s.pending?.question.prompt === 'prompt.chooseEnemy') s = choose(s, 'choice.unseen.enemy')
    s = choose(s, 'choice.unseen.amount', { amount: 2 })
    s = settle(s)
    expect(s.enemies[enemy.id]!.clues).toBe(2)
    expect(s.investigators.every((i) => i.clues === 0)).toBe(true)
    expect(availableAbilities(s, 'a').some((a) => a.key === `${code}:clue`)).toBe(false)
  },
)
it.each([
  [U.ruinsPaint, 3],
  [U.yardFog, 2],
] as const)('the personal clue ability at %s respects its maximum %i', (code, max) => {
  let s = game()
  const enemy = broods(s)[0]!
  s = during(
    s,
    (x) => ({
      ...room(code)(change({ location: code, clues: 4 })(x)),
      enemies: { ...x.enemies, [enemy.id]: { ...enemy, location: code } },
    }),
    put(code),
    reveal(code),
  )
  s = doAbility(s, `${code}:clue`)
  s = choose(s, 'choice.unseen.amount', { amount: max })
  s = settle(s)
  expect(s.enemies[enemy.id]!.clues).toBe(max)
  expect(getInvestigator(s, 'a').clues).toBe(4 - max)
})
it.each([U.meadowBait, U.yardMud])('each investigator at %s may contribute one clue', (code) => {
  let s = game(2)
  const enemy = broods(s)[0]!
  s = during(
    s,
    (x) => ({
      ...room(code)(x),
      investigators: x.investigators.map((i) => ({ ...i, location: code, clues: 2 })),
      enemies: { ...x.enemies, [enemy.id]: { ...enemy, location: code } },
    }),
    put(code),
    reveal(code),
  )
  s = settle(doAbility(s, `${code}:clue`), true)
  expect(s.enemies[enemy.id]!.clues).toBe(2)
  expect(s.investigators.every((i) => i.clues === 1)).toBe(true)
})
it('the village hounds can put a clue on a distant Abomination', () => {
  let s = game()
  const enemy = broods(s)[0]!
  s = during(
    s,
    (x) => room(U.villageHounds)(change({ location: U.villageHounds, clues: 1 })(x)),
    put(U.villageHounds),
    reveal(U.villageHounds),
  )
  s = doAbility(s, `${U.villageHounds}:clue`)
  s = choose(s, 'choice.unseen.enemy', { enemy: enemy.name })
  s = choose(s, 'choice.unseen.amount', { amount: 1 })
  s = settle(s)
  expect(broods(s).some((e) => e.clues === 1)).toBe(true)
  expect(getInvestigator(s, 'a').clues).toBe(0)
})
it('rain lends a clue only until the end of the round and the heath deals end-turn damage', () => {
  let s = game()
  const enemy = broods(s)[0]!
  s = during(
    s,
    (x) => ({
      ...room(U.meadowRain)(change({ location: U.meadowRain })(x)),
      enemies: { ...x.enemies, [enemy.id]: { ...enemy, location: U.meadowRain } },
    }),
    put(U.meadowRain),
    reveal(U.meadowRain),
  )
  s = settle(doAbility(s, `${U.meadowRain}:clue`))
  expect(s.enemies[enemy.id]!.clues).toBe(1)
  s = during(s, keep, { type: 'Forced', trigger: { type: 'roundEnds' } })
  expect(s.enemies[enemy.id]!.clues).toBe(0)
  s = during(
    s,
    (x) => room(U.heathDamage)(change({ location: U.heathDamage })(x)),
    put(U.heathDamage),
    reveal(U.heathDamage),
    { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } },
  )
  expect(getInvestigator(s, 'a').damage).toBe(1)
})
it('village lure and Whateley’s intellect test move a selected Brood along real connections', () => {
  let s = game(1, 0, 11, 'standard', true)
  const enemy = broods(s)[0]!
  s = during(
    s,
    (x) => ({
      ...room(U.villageLure)(change({ location: U.villageLure })(x)),
      enemies: {
        ...x.enemies,
        [enemy.id]: {
          ...enemy,
          location: Object.keys(x.locations).find(
            (id) => id === U.glenClues || id === U.glenRandom,
          )!,
        },
      },
    }),
    put(U.villageLure),
    reveal(U.villageLure),
  )
  s = settle(doAbility(s, `${U.villageLure}:lure`))
  expect(s.enemies[enemy.id]!.location).toBe(U.villageLure)
  s = during(
    s,
    (x) => room(U.ruinsMove)(change({ location: U.ruinsMove })(x)),
    put(U.ruinsMove),
    reveal(U.ruinsMove),
  )
  s = settle(doAbility(s, 'unseen:move'))
  expect(s.enemies[enemy.id]!.location).not.toBe(U.villageLure)
})
it('Cold Spring Glen can reroll its selection after a successful agility test', () => {
  let s = game(1, 0, 1, 'standard', true)
  for (let seed = 2; !s.locations[U.glenRandom] && seed < 35; seed++)
    s = game(1, 0, seed, 'standard', true)
  expect(s.locations[U.glenRandom]).toBeDefined()
  const enemy = broods(s)[0]!,
    ids = Object.keys(s.locations),
    wanted = ids.indexOf(U.glenRandom)
  let rng = 1
  while (nextInt(rng, ids.length)[0] !== wanted) rng++
  s = during(
    s,
    (x) => ({
      ...change({ location: U.glenRandom })(x),
      rng,
      enemies: { ...x.enemies, [enemy.id]: { ...enemy, location: U.glenRandom } },
    }),
    reveal(U.glenRandom),
    specific('unseenRandom', { purpose: 'move', enemy: enemy.id }),
  )
  expect(s.pending!.question.prompt).toBe('prompt.unseen.randomGlen')
  s = choose(s, 'choice.investigator')
  s = settle(s)
  expect(s.enemies[enemy.id]!.location).not.toBe(U.glenRandom)
})
it('the elder thing immediately makes the tested Brood attack, even if exhausted', () => {
  let s = game()
  const enemy = broods(s)[0]!
  s = during(
    s,
    (x) => ({ ...change({ location: enemy.location })(x), chaosBag: ['elderThing'] }),
    reveal(enemy.location),
    { type: 'PutAssetIntoPlay', investigator: 'a', code: U.formula },
    { type: 'ExhaustEnemy', enemy: enemy.id },
  )
  const a = availableAbilities(s, 'a').find(
    (a) =>
      a.target?.type === 'enemy' &&
      a.target.id === enemy.id &&
      a.label === 'ability.unseen.formula',
  )!
  s = during(s, keep, ...a.then)
  s = choose(s, 'choice.revealToken')
  expect(getInvestigator(s, 'a').damage).toBe(2)
  expect(getInvestigator(s, 'a').horror).toBe(2)
})
it('resolution removes Powder from campaign decks and preserves the escaped count', () => {
  let s = during(
    game(),
    (x) => ({
      ...x,
      campaignLog: {
        ...x.campaignLog!,
        investigators: { a: { ...x.campaignLog!.investigators.a!, storyAssets: [B.powder] } },
      },
    }),
    { type: 'Resign', investigator: 'a' },
  )
  s = settle(s)
  expect(s.campaignLog!.investigators.a!.storyAssets).not.toContain(B.powder)
  expect(s.campaignLog!.values[UN.escaped]).toBe('5')
})
const room = (id: string) => (s: GameState) => ({
  ...s,
  setAsideLocations: {
    ...s.setAsideLocations,
    [id]: Object.values(UNSEEN_LOCATIONS).find((l) => l.id === id)!,
  },
})
const put = (location: string): Message => ({ type: 'PutLocationIntoPlay', location })
const reveal = (location: string): Message => ({
  type: 'RevealLocation',
  location,
  investigator: 'a',
})
const doAbility = (s: GameState, key: string) =>
  during(s, keep, ...availableAbilities(s, 'a').find((a) => a.key === key)!.then)

it('a complete legal sequence translates the Formula and destroys every Brood', () => {
  let s = game(1, 4, 11, 'standard', true)
  const trace: unknown[] = []
  for (let n = 0; n < 250 && !s.outcome; n++) {
    s = settle(s)
    if (s.outcome) break
    const p = s.pending
    if (!p) throw Error('Unseen interrupted')
    const choices = p.question.choices,
      here = getInvestigator(s, 'a').location!
    let selected = choices.findIndex((c) => c.label === 'action.advanceAct')
    if (selected < 0)
      selected = choices.findIndex(
        (c) =>
          c.label === 'ability.unseen.formula' &&
          c.target?.type === 'enemy' &&
          s.enemies[c.target.id]?.code === U.brood,
      )
    if (selected < 0)
      selected = choices.findIndex(
        (c) =>
          c.label === 'action.evade' &&
          c.target?.type === 'enemy' &&
          !s.enemies[c.target.id]!.exhausted,
      )
    if (
      selected < 0 &&
      s.actIndex === 0 &&
      here === s.acts[0]!.cluesAtLocation &&
      getInvestigator(s, 'a').clues < 2
    )
      selected = choices.findIndex((c) => c.label === 'action.investigate')
    if (selected < 0) {
      const visited = new Set([here]),
        queue = [{ id: here, step: '' }]
      let target: string | undefined
      while (queue.length) {
        const node = queue.shift()!
        if (
          node.id !== here &&
          (s.actIndex === 0
            ? node.id === s.acts[0]!.cluesAtLocation
            : broods(s).some((e) => e.location === node.id))
        ) {
          target = node.step
          break
        }
        for (const id of s.locations[node.id]!.connections)
          if (s.locations[id] && !visited.has(id)) {
            visited.add(id)
            queue.push({ id, step: node.step || id })
          }
      }
      if (target)
        selected = choices.findIndex(
          (c) =>
            c.label === 'action.move' && c.target?.type === 'location' && c.target.id === target,
        )
    }
    if (selected < 0) selected = choices.findIndex((c) => c.label === 'action.endTurn')
    if (selected < 0) throw Error(JSON.stringify(p.question))
    trace.push({
      round: s.round,
      act: s.actIndex,
      location: here,
      choice: choices[selected]!.label,
      broods: broods(s).length,
      aside: s.setAside.filter((c) => c.code === U.brood).length,
    })
    s = applyInput(s, { investigator: p.investigator, choice: selected })
  }
  expect(s.outcome, JSON.stringify(trace.slice(-30))).toEqual({ type: 'resolution', resolution: 2 })
  expect(s.campaignLog!.values[UN.escaped]).toBe('0')
})
it('the random weakness pool shares reprints, respects printed copies and avoids counting campaign cards twice', () => {
  let s = game()
  s = {
    ...s,
    investigators: s.investigators.map((i) => ({ ...i, deck: ['01096'], hand: [], discard: [] })),
    campaignLog: {
      ...s.campaignLog!,
      investigators: { a: { ...s.campaignLog!.investigators.a!, storyAssets: ['01096'] } },
    },
  }
  const amnesia = UNSEEN_WEAKNESS_POOL.find((e) =>
    (e.codes as readonly string[]).includes('01096'),
  )!.codes.find((c) => playerCardDef(c)?.weakness === 'basicweakness')!
  expect(amnesia).toBeDefined()
  expect(unseenWeaknessPool(s).filter((c) => c === amnesia)).toHaveLength(1)
  s = change({ deck: ['01096', '01596'] })(s)
  expect(unseenWeaknessPool(s)).not.toContain(amnesia)
  s = change({ deck: ['04039'] })(s)
  expect(unseenWeaknessPool(s)).not.toContain('04038')
})
it('clues on Powder may pay the act while the investigator has no clues on their card', () => {
  let s = game()
  const ruins = s.acts[0]!.cluesAtLocation!
  s = during(
    s,
    (x) => ({
      ...change({ location: ruins, clues: 0 })(x),
      campaignLog: {
        ...x.campaignLog!,
        values: { ...x.campaignLog!.values, [BN.survivors]: [H.armitage, B.earl].join(',') },
      },
    }),
    reveal(ruins),
    { type: 'PutAssetIntoPlay', investigator: 'a', code: B.powder },
  )
  const powder = Object.values(s.assets).find((a) => a.code === B.powder)!
  expect(powder.clues).toBe(2)
  s = during(s, keep, { type: 'AdvanceAct' })
  s = settle(s)
  expect(s.actIndex).toBe(1)
  expect(s.assets[powder.id]!.clues).toBe(0)
  expect(getInvestigator(s, 'a').clues).toBe(0)
})
it('location clue abilities can move clues controlled on Powder onto an Abomination', () => {
  let s = game()
  s = during(
    s,
    (x) => ({
      ...room(U.villageHounds)(change({ location: U.villageHounds, clues: 0 })(x)),
      campaignLog: {
        ...x.campaignLog!,
        values: { ...x.campaignLog!.values, [BN.survivors]: [H.armitage, B.earl].join(',') },
      },
    }),
    put(U.villageHounds),
    reveal(U.villageHounds),
    { type: 'PutAssetIntoPlay', investigator: 'a', code: B.powder },
  )
  const powder = Object.values(s.assets).find((a) => a.code === B.powder)!
  s = doAbility(s, `${U.villageHounds}:clue`)
  s = choose(s, 'choice.unseen.enemy')
  s = choose(s, 'choice.unseen.amount', { amount: 1 })
  s = settle(s)
  expect(s.assets[powder.id]!.clues).toBe(1)
  expect(broods(s).some((e) => e.clues === 1)).toBe(true)
})
it('a clue payment lets the investigator preserve held clues by choosing a controlled asset', () => {
  let s = during(
    game(),
    (x) => ({
      ...change({ clues: 1 })(x),
      campaignLog: {
        ...x.campaignLog!,
        values: { ...x.campaignLog!.values, [BN.survivors]: [H.armitage, B.earl].join(',') },
      },
    }),
    { type: 'PutAssetIntoPlay', investigator: 'a', code: B.powder },
    { type: 'SpendClues', investigator: 'a', amount: 1 },
  )
  s = choose(s, 'choice.asset', { asset: 'Powder of Ibn Ghazi' })
  const powder = Object.values(s.assets).find((a) => a.code === B.powder)!
  expect(powder.clues).toBe(1)
  expect(getInvestigator(s, 'a').clues).toBe(1)
})
it('the intro can warn the townsfolk and standalone setup uses three sacrifices without adding a weakness', () => {
  let s = createGame({
    seed: 11,
    interactive: true,
    scenario: undimensionedAndUnseen(),
    investigators: [testInvestigator('a', { health: 30, sanity: 30 })],
  })
  for (let n = 0; s.pending && s.phase === 'setup' && n < 100; n++) {
    const p = s.pending,
      warning = p.question.choices.findIndex((c) => c.label === 'choice.unseen.warn')
    s = applyInput(s, { investigator: p.investigator, choice: warning < 0 ? 0 : warning })
  }
  s = throughSetup(s)
  expect(s.campaignLog!.notes).toContain(UN.warned)
  expect(broods(s)).toHaveLength(1)
  expect(s.setAside.filter((c) => c.code === U.brood)).toHaveLength(2)
  expect(s.campaignLog!.investigators.a!.storyAssets).toHaveLength(0)
})
it('setup optionally finds Powder in the deck and puts it into play with survivor clues', () => {
  const log = emptyCampaignLog(['a'])
  log.investigators.a!.storyAssets = [B.powder]
  log.values[BN.survivors] = [H.armitage, B.earl, B.zebulon].join(',')
  let s: GameState | undefined
  for (let seed = 1; seed <= 20; seed++) {
    const candidate = throughSetup(
      createGame({
        seed,
        interactive: true,
        campaignLog: log,
        scenario: undimensionedAndUnseen({ log }),
        investigators: [
          testInvestigator('a', {
            deck: [...Array.from({ length: 15 }, () => '01089'), B.powder],
            health: 30,
            sanity: 30,
          }),
        ],
      }),
    )
    if (candidate.pending?.question.prompt === 'prompt.unseen.powder') {
      s = candidate
      break
    }
  }
  expect(s).toBeDefined()
  s = choose(s!, 'choice.unseen.powder')
  s = throughSetup(s)
  expect(Object.values(s.assets).find((a) => a.code === B.powder)!.clues).toBe(3)
  expect(getInvestigator(s, 'a').deck).not.toContain(B.powder)
  expect(getInvestigator(s, 'a').hand).not.toContain(B.powder)
})
it('removing the target clues during a Formula attack removes the willpower bonus before results', () => {
  let s = game()
  const e = broods(s)[0]!
  s = during(
    s,
    (x) => ({
      ...change({ location: e.location })(x),
      chaosBag: ['tablet'],
      enemies: { ...x.enemies, [e.id]: { ...e, clues: 2 } },
    }),
    reveal(e.location),
    { type: 'PutAssetIntoPlay', investigator: 'a', code: U.formula },
  )
  s = during(
    s,
    keep,
    ...availableAbilities(s, 'a').find(
      (a) =>
        a.label === 'ability.unseen.formula' && a.target?.type === 'enemy' && a.target.id === e.id,
    )!.then,
  )
  expect(skillTestValue(s).total).toBe(7)
  s = choose(s, 'choice.revealToken')
  s = choose(s, 'choice.unseen.removeClues')
  expect(skillTestValue(s).total).toBe(3)
  s = settle(s)
  expect(s.enemies[e.id]!.damageTaken).toBe(0)
})
it.each([1, 2, 3, 4])(
  'a campaign run with %i real starter decks finishes and saves the next scenario',
  (players) => {
    const c = {
      ...newCampaign(
        'the-dunwich-legacy',
        ['joe', 'daniela', 'trish', 'dexter'].slice(0, players),
        'standard',
      ),
      scenarioIndex: 5,
    }
    c.log.values[BN.sacrificed] = [H.armitage, '02061', '02080'].join(',')
    const s = playRandomlyToEnd(startScenario(c, 800 + players, true), 800 + players, 12000)
    const next = JSON.parse(JSON.stringify(finishScenario(c, s)))
    expect(currentScenario(next)).toBe('where-doom-awaits')
    expect(next.log.values[UN.escaped]).toMatch(/^[0-3]$/)
  },
)
// Revised guide pp.17–18; RR "Cannot", "Massive", "Skill Tests", "Clues" and "Campaign Play".
describe('Undimensioned and Unseen', () => {
  it.each([1, 2, 3, 4])(
    'sets up %i investigators, six variant locations and all printed sets',
    (players) => {
      const s = game(players)
      expect(Object.keys(s.locations)).toHaveLength(6)
      expect(
        s.investigators.every((i) =>
          [U.villageHounds, U.villageLure].includes(i.location as typeof U.villageHounds),
        ),
      ).toBe(true)
      expect(s.encounterDeck).toHaveLength(33)
      expect(broods(s)).toHaveLength(2)
      expect(s.setAside.filter((c) => c.code === U.brood)).toHaveLength(3)
      for (const i of s.investigators) {
        const weaknesses = s.campaignLog!.investigators[i.id]!.storyAssets
        expect(weaknesses).toHaveLength(1)
        expect(playerCardDef(weaknesses[0]!)!.weakness).toBe('basicweakness')
        expect(
          playerCardDef(weaknesses[0]!)!.traits.some((t) =>
            ['Madness', 'Injury', 'Pact'].includes(t),
          ),
        ).toBe(true)
      }
      expect(s.campaignLog!.notes).toContain(UN.calmed)
    },
  )
  it.each([
    [0, 2, 3],
    [1, 2, 3],
    [2, 1, 3],
    [3, 1, 2],
    [4, 0, 2],
    [5, 0, 2],
  ])('uses %i sacrifices to select %i initial and %i set-aside Broods', (count, initial, aside) => {
    const s = game(1, count)
    expect(broods(s)).toHaveLength(initial)
    expect(s.setAside.filter((c) => c.code === U.brood)).toHaveLength(aside)
  })
  it('selects both copies of every location across random seeds', () => {
    const found = new Set<string>()
    for (let n = 1; n <= 35; n++)
      Object.keys(game(1, 0, n).locations).forEach((id) => found.add(id))
    expect(found.size).toBe(12)
  })
  it('Broods have one health plus one per investigator, reject ordinary attacks and ignore ordinary damage', () => {
    let s = game(3)
    const e = broods(s)[0]!
    expect(enemyMaxHealth(s, e)).toBe(4)
    s = during(s, change({ location: e.location }), reveal(e.location), {
      type: 'DamageEnemy',
      enemy: e.id,
      amount: 4,
      source: { attack: true },
    })
    expect(s.enemies[e.id]!.damageTaken).toBe(0)
    expect(availableActions(s, 'a').some((a) => a.kind === 'fight' && a.enemy === e.id)).toBe(false)
    s = during(s, keep, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'combat',
      difficulty: 6,
      kind: { type: 'fight', enemy: e.id, extraDamage: 0 },
    })
    expect(s.skillTest).toBeNull()
  })
  it('Formula attacks use willpower and continuously gain two per clue on the target', () => {
    let s = game()
    const e = broods(s)[0]!
    s = during(
      s,
      (x) => ({
        ...change({ location: e.location })(x),
        enemies: { ...x.enemies, [e.id]: { ...e, clues: 2 } },
      }),
      reveal(e.location),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: U.formula },
    )
    const a = availableAbilities(s, 'a').find(
      (a) =>
        a.label === 'ability.unseen.formula' && a.target?.type === 'enemy' && a.target.id === e.id,
    )!
    s = during(s, keep, ...a.then)
    expect(s.skillTest!.skill).toBe('willpower')
    expect(skillTestValue(s).total).toBe(getInvestigator(s, 'a').skills.willpower + 4)
    s = settle(s)
    expect(s.enemies[e.id]!.damageTaken).toBe(1)
  })
  it('advancing Saracenic Script grants a Formula to everyone and adds doom only if Armitage was sacrificed', () => {
    for (const sacrificed of [false, true]) {
      let s = game(2, sacrificed ? 1 : 0)
      const ruins = s.acts[0]!.cluesAtLocation!
      s = during(
        s,
        (x) => ({
          ...x,
          investigators: x.investigators.map((i) => ({ ...i, location: ruins, clues: 2 })),
        }),
        reveal(ruins),
        { type: 'AdvanceAct' },
      )
      s = settle(s)
      expect(Object.values(s.assets).filter((a) => a.code === U.formula)).toHaveLength(2)
      expect(s.setAside.filter((c) => c.code === U.formula)).toHaveLength(2)
      expect(s.doom).toBe(sacrificed ? 1 : 0)
    }
  })
  it('only investigators at the chosen Whateley Ruins can pay the act clues', () => {
    const s = game()
    expect(s.acts[0]!.cluesAtLocation).toBe(
      Object.keys(s.locations).find((l) =>
        [U.ruinsPaint, U.ruinsMove].includes(l as typeof U.ruinsPaint),
      ),
    )
  })
  it('Towering Beasts attaches, increases fight/health and deals damage only at its location', () => {
    let s = game()
    const e = broods(s)[0]!
    s = during(s, change({ location: e.location }), draw(U.towering))
    s = settle(s)
    expect(enemyMaxHealth(s, s.enemies[e.id]!)).toBe(3)
    expect(getInvestigator(s, 'a').damage).toBe(1)
    expect(
      Object.values(s.treacheries).some(
        (t) => t.code === U.towering && t.placement.type === 'enemy',
      ),
    ).toBe(true)
  })
  it('Ruin and Destruction tests each investigator sharing a location with a Brood', () => {
    let s = game(2)
    const e = broods(s)[0]!
    s = during(
      s,
      (x) =>
        change({
          location: e.location,
          skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 },
        })(
          change(
            { location: e.location, skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } },
            'b',
          )(x),
        ),
      draw(U.ruin),
    )
    s = settle(s)
    expect(s.investigators.every((i) => i.damage === 3)).toBe(true)
  })
  it('The Creatures’ Tracks can spawn a set-aside Brood and cannot offer that choice when none remain', () => {
    let s = during(game(1, 4), keep, draw(U.tracks))
    s = choose(s, 'choice.unseen.spawn')
    s = settle(s)
    expect(broods(s)).toHaveLength(1)
    expect(s.setAside.filter((c) => c.code === U.brood)).toHaveLength(1)
    s = during(
      s,
      (x) => ({ ...x, setAside: x.setAside.filter((c) => c.code !== U.brood) }),
      draw(U.tracks),
    )
    expect(s.pending!.question.choices.map((c) => c.label)).not.toContain('choice.unseen.spawn')
  })
  it('Attracting Attention moves every Brood one step toward the investigator', () => {
    let s = game()
    const before = broods(s).map((e) => [e.id, e.location])
    s = during(s, keep, draw(U.attention))
    s = settle(s)
    expect(broods(s).some((e) => before.some(([id, l]) => e.id === id && e.location !== l))).toBe(
      true,
    )
  })
  it('agendas shuffle encounters and spawn another Brood, then the second ambush tests its occupants', () => {
    let s = game(1, 4)
    const deck = s.encounterDeck.length
    s = during(
      s,
      (x) => ({
        ...x,
        encounterDiscard: [x.encounterDeck[0]!],
        encounterDeck: x.encounterDeck.slice(1),
      }),
      { type: 'AdvanceAgenda' },
    )
    s = settle(s)
    expect(s.encounterDeck).toHaveLength(deck)
    expect(broods(s)).toHaveLength(1)
    s = during(s, change({ skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } }), {
      type: 'AdvanceAgenda',
    })
    s = settle(s)
    expect(broods(s)).toHaveLength(2)
    expect(getInvestigator(s, 'a').damage).toBe(2)
    expect(getInvestigator(s, 'a').horror).toBe(2)
  })
  it('end of the enemy phase moves Broods even if exhausted without performing an extra attack', () => {
    let s = game()
    const e = broods(s)[0]!
    s = during(
      s,
      keep,
      { type: 'ExhaustEnemy', enemy: e.id },
      { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } },
    )
    s = settle(s)
    expect(s.enemies[e.id]!.exhausted).toBe(true)
    expect(getInvestigator(s, 'a').damage).toBe(0)
  })
  it('the final agenda resolves with the count of living and set-aside Broods', () => {
    let s = during(game(), (x) => ({ ...x, agendaIndex: 2 }), { type: 'AdvanceAgenda' })
    s = settle(s)
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(s.campaignLog!.values[UN.escaped]).toBe('5')
  })
  it('defeating the last Brood advances the objective and records zero escaped', () => {
    let s = game(1, 4)
    const ruins = s.acts[0]!.cluesAtLocation!
    s = during(s, change({ location: ruins, clues: 2 }), reveal(ruins), { type: 'AdvanceAct' })
    s = settle(s)
    s = during(s, keep, specific('unseenSpawn', { location: ruins }))
    const enemy = broods(s)[0]!
    s = during(s, (x) => ({ ...x, setAside: x.setAside.filter((c) => c.code !== U.brood) }), {
      type: 'DefeatEnemy',
      enemy: enemy.id,
      by: 'a',
    })
    s = settle(s)
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(s.campaignLog!.values[UN.escaped]).toBe('0')
  })
  it.each(['standard', 'hard'] as const)(
    'the %s tablet offers removal of real clues or its printed penalty',
    (difficulty) => {
      let s = game(1, 0, 11, difficulty)
      const e = broods(s)[0]!
      s = during(
        s,
        (x) => ({
          ...x,
          chaosBag: ['tablet'],
          enemies: { ...x.enemies, [e.id]: { ...e, clues: 2 } },
        }),
        {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill: 'intellect',
          difficulty: 1,
          kind: { type: 'effect', source: 'Test', onSuccess: [], onFail: [], onFailEach: [] },
        },
      )
      s = choose(s, 'choice.revealToken')
      expect(s.pending!.question.choices.some((c) => c.label === 'choice.unseen.removeClues')).toBe(
        true,
      )
      s = choose(s, 'choice.unseen.removeClues')
      expect(s.enemies[e.id]!.clues).toBe(0)
      s = settle(s)
      expect(getInvestigator(s, 'a').damage).toBe(0)
    },
  )
  it('the tablet cannot remove zero clues and hard mode automatically fails when the penalty is chosen', () => {
    let s = during(game(1, 0, 11, 'hard'), (x) => ({ ...x, chaosBag: ['tablet'] }), {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      kind: { type: 'effect', source: 'Test', onSuccess: [], onFail: [], onFailEach: [] },
    })
    s = choose(s, 'choice.revealToken')
    expect(s.skillTest!.autoFail).toBe(true)
  })
  it('the last agenda boosts all Abomination statistics and Cold Spring Glen still reduces evade', () => {
    const s = { ...game(), agendaIndex: 2 },
      e = broods(s).find((e) =>
        [U.glenClues, U.glenRandom].includes(e.location as typeof U.glenClues),
      )!
    const rule = scenarioBehavior(s.scenarioId)!
    expect(rule.enemyStat!(s, e, 'fight')).toBe(1)
    expect(rule.enemyStat!(s, e, 'evade')).toBe(0)
  })
})
