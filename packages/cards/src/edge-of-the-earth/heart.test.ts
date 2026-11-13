// Campaign guide pp. 49–60 and RR: Skill Tests, Hunter, Damage, Elimination, Replacement Effects.
import {
  availableAbilities,
  dispatch,
  distancesFrom,
  fightEnemies,
  getInvestigator,
  huntingSteps,
  shroudOf,
  treacheryBehavior,
  scenarioBehavior,
  type GameState,
  type Enemy,
  type Message,
  type Treachery,
} from '@lcg/engine'
import { choose, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { campaignDefinition } from '../campaign-definition'
import {
  canPlayNext,
  finishScenario,
  newCampaign,
  purchaseOptions,
  startScenario,
} from '../campaign'
import { withAsset } from '../dunwich-pilot/testing'
import { EOTE_HEART_ONE, EOTE_HEART_TWO } from './ice-and-death-cards'
import { GATE, heartMap, meta, ownedSeals, putSeal, SEALS, seals, setMeta } from './heart-common'
import { heartDeck, namelessMadness, protoplasmicMass, unsealedPhantasm } from './heart-encounters'
import './heart'

function campaign(part: 1 | 2 = 1, players = ['joe']) {
  const c = newCampaign('edge-of-the-earth', players, 'standard')
  const first = startScenario(c, 12)
  c.log = dispatch(
    { ...first, pending: null, queue: [] },
    { type: 'InitializeExpedition' },
  ).campaignLog!
  c.scenarioIndex = campaignDefinition(c.id).scenarios.findIndex(
    (s) => s.id === (part === 1 ? EOTE_HEART_ONE : EOTE_HEART_TWO),
  )
  return c
}
const clean = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const step = (s: GameState, key: string, data: Record<string, string | number | boolean> = {}) =>
  dispatch(clean(s), { type: 'ScenarioSpecific', key: 'heart:' + key, data })
const me = (s: GameState) => s.investigators[0]!.id
const revealedTreachery = (code: string): Treachery => ({
  kind: 'treachery',
  code,
  name: code,
  keywords: [],
  id: code,
  placement: { type: 'limbo' },
})
function start(part: 1 | 2 = 1, players = ['joe']) {
  let s = throughSetup(startScenario(campaign(part, players), 87))
  for (let n = 0; n < 12 && s.pending; n++) {
    const p = s.pending.question.prompt
    if (p === 'prompt.edgeOfTheEarth.heartChoosePart')
      s = throughSetup(choose(s, 'choice.edgeOfTheEarth.heartStudy'))
    else if (p === 'prompt.edgeOfTheEarth.partner')
      s = throughSetup(choose(s, 'choice.edgeOfTheEarth.noPartner'))
    else if (p === 'prompt.edgeOfTheEarth.heartStart')
      s = throughSetup(
        choose(s, s.pending.question.choices[0]!.label, s.pending.question.choices[0]!.params),
      )
    else break
  }
  return s
}
function finishStories(s: GameState) {
  s = throughSetup(s)
  return s.pending?.question.prompt === 'prompt.edgeOfTheEarth.heartCheckpoint'
    ? throughSetup(choose(s, 'choice.edgeOfTheEarth.heartRest'))
    : s
}
function move(s: GameState, id: string, who = me(s)) {
  return dispatch(clean(s), {
    type: 'MoveTo',
    investigator: who,
    location: id,
    unpreventable: true,
  })
}

describe('The Heart of Madness', () => {
  it.each(['immediate', 'rest'] as const)(
    'checkpoint III resumes %s with a new game and the printed seal allocation',
    (mode) => {
      const c = campaign(1, ['joe', 'daniela'])
      let s = start(1, ['joe', 'daniela'])
      const [oldOwner, other] = s.investigators.map((i) => i.id) as [string, string]
      s = putSeal(putSeal(s, 'a', 'l:' + GATE, true), 'b', 'i:' + oldOwner, true)
      s = {
        ...s,
        investigators: s.investigators.map((i) => ({
          ...i,
          resources: 1,
          hand: [],
          damage: 2,
          horror: 2,
        })),
      }
      s = throughSetup(step(s, 'firstConclusion', { outcome: 2 }))
      expect(s.pending?.question.prompt).toBe('prompt.edgeOfTheEarth.heartCheckpoint')
      expect(s.outcome).toBeNull()
      s = throughSetup(
        choose(
          s,
          'choice.edgeOfTheEarth.' + (mode === 'immediate' ? 'heartContinue' : 'heartRest'),
        ),
      )
      expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
      const next = JSON.parse(JSON.stringify(finishScenario(c, s))) as typeof c
      expect(next.log.values.edgeOfTheEarthHeartCheckpoint).toBe(mode)
      expect(next.results.at(-1)?.xp[oldOwner]).toBe(2)
      expect(purchaseOptions(next, oldOwner).length).toBeGreaterThan(0)
      let second = throughSetup(startScenario(next, 101))
      expect(second.pending?.question.prompt).toBe('prompt.edgeOfTheEarth.heartStart')
      second = throughSetup(
        choose(
          second,
          second.pending!.question.choices[0]!.label,
          second.pending!.question.choices[0]!.params,
        ),
      )
      expect(second.pending?.question.prompt).toBe('prompt.edgeOfTheEarth.heartAllocateActiveSeal')
      expect(second.pending?.question.promptParams).toEqual({ seal: 'A' })
      second = throughSetup(
        choose(second, 'choice.investigator', { name: getInvestigator(second, other).name }),
      )
      if (mode === 'rest') {
        expect(second.pending?.question.prompt).toBe(
          'prompt.edgeOfTheEarth.heartAllocateDormantSeal',
        )
        expect(second.pending?.question.promptParams).toEqual({ seal: 'B' })
        second = throughSetup(
          choose(second, 'choice.investigator', { name: getInvestigator(second, other).name }),
        )
      }
      expect(seals(second)).toEqual([
        { seal: 'a', holder: 'i:' + other, active: true },
        { seal: 'b', holder: 'i:' + (mode === 'immediate' ? oldOwner : other), active: false },
      ])
      for (const i of second.investigators) {
        expect(i.resources).toBe(5)
        expect(i.damage).toBe(0)
        expect(i.horror).toBe(0)
        expect(i.hand).toHaveLength(5)
        expect(i.eliminated).toBe(false)
        expect(i.resigned).toBe(false)
      }
      expect(second.doom).toBe(0)
      expect(second.encounterDiscard).toHaveLength(0)
    },
  )
  it.each([false, true])(
    'moves a Phantasm one step toward a revealed pylon only while ready (exhausted: %s)',
    (exhausted) => {
      let s = move(start(2), '08674')
      const enemy: Enemy = {
        ...unsealedPhantasm,
        id: 'phantasm',
        maxHealth: 5,
        damageTaken: 0,
        location: '08650',
        engagedWith: null,
        exhausted,
      }
      s = { ...s, enemies: { [enemy.id]: enemy } }
      const distance = distancesFrom(s, '08674', enemy),
        before = distance.get(enemy.location)!
      s = dispatch(clean(s), { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } })
      for (
        let n = 0;
        n < 3 && s.pending?.question.prompt === 'prompt.edgeOfTheEarth.heartMovePhantasm';
        n++
      )
        s = choose(s, s.pending.question.choices[0]!.label, s.pending.question.choices[0]!.params)
      expect(distance.get(s.enemies.phantasm!.location)).toBe(exhausted ? before : before - 1)
    },
  )
  it.each([false, true])(
    'the first Madness spawn can only identify a revealed Mist-Pylon (%s)',
    (revealed) => {
      let s = start(2)
      if (revealed) s = move(s, '08674')
      s = throughSetup(dispatch(clean(s), { type: 'AdvanceAgenda' }))
      const spawned = Object.values(s.enemies).filter((e) => e.code === '08679')
      expect(spawned).toHaveLength(revealed ? 1 : 0)
      if (revealed) expect(spawned[0]!.location).toBe('08674')
    },
  )
  it('connects every campaign step and can start part II after completing part I', () => {
    expect(
      campaignDefinition('edge-of-the-earth').scenarios.every(
        (entry) => entry.build || entry.checkpoint,
      ),
    ).toBe(true)
    let s = start()
    s = putSeal(s, 'a', 'l:' + GATE, true)
    s = finishStories(step(s, 'firstConclusion', { outcome: 2 }))
    const next = finishScenario(campaign(), s)
    expect(canPlayNext(next)).toBe(true)
    const restored = JSON.parse(JSON.stringify(next)) as typeof next
    const second = throughSetup(startScenario(restored, 22))
    expect(second.scenarioId).toBe(EOTE_HEART_TWO)
    expect(second.pending?.question.prompt).toBe('prompt.edgeOfTheEarth.heartStart')
  })
  it.each([
    ['08720', '08717', 'KenslerSinha'],
    ['08721', '08718', 'EllsworthClaypool'],
    ['08722', '08719', 'TakadaCookie'],
    ['08714', '08715', 'DyerDanforth'],
    ['08716', '08716', 'Eliyah'],
  ] as const)('reads the complete conditional epilogue %s/%s', (a, b, scene) => {
    let s = start(2)
    const log = s.campaignLog!,
      e = log.expedition!
    s = {
      ...s,
      campaignLog: {
        ...log,
        expedition: {
          ...e,
          partners: Object.fromEntries(
            Object.entries(e.partners).map(([id, r]) => [
              id,
              { ...r, status: id === a || id === b ? 'safe' : 'eliminated' },
            ]),
          ),
        },
      },
    } as GameState
    s = step(s, 'epilogue')
    expect(s.pending?.question.story?.body).toBe(`story.edgeOfTheEarth.heartEpilogue${scene}.body`)
    expect(s.campaignLog!.values.edgeOfTheEarthSurvivors).toContain(a)
    expect(s.campaignLog!.values.edgeOfTheEarthSurvivors).toContain(me(s))
    if (a !== b) {
      const e = s.campaignLog!.expedition!
      s = {
        ...s,
        campaignLog: {
          ...s.campaignLog!,
          expedition: {
            ...e,
            partners: { ...e.partners, [b]: { ...e.partners[b]!, status: 'eliminated' } },
          },
        },
      }
      expect(step(s, 'epilogue').pending).toBeNull()
    }
  })
  it.each(['hard', 'expert'] as const)('adds initial doom only in part I on %s', (difficulty) => {
    for (const part of [1, 2] as const) {
      const c = campaign(part)
      c.difficulty = difficulty
      let s = throughSetup(startScenario(c, 87))
      for (let n = 0; n < 12 && s.pending; n++) {
        const prompt = s.pending.question.prompt
        if (prompt === 'prompt.edgeOfTheEarth.heartChoosePart')
          s = throughSetup(choose(s, 'choice.edgeOfTheEarth.heartStudy'))
        else if (prompt === 'prompt.edgeOfTheEarth.partner')
          s = throughSetup(choose(s, 'choice.edgeOfTheEarth.noPartner'))
        else if (prompt === 'prompt.edgeOfTheEarth.heartStart')
          s = throughSetup(
            choose(s, s.pending.question.choices[0]!.label, s.pending.question.choices[0]!.params),
          )
        else break
      }
      expect(s.doom).toBe(part === 1 ? (difficulty === 'expert' ? 2 : 1) : 0)
    }
  })
  it('reallocates placed and recovered seals when resuming after the checkpoint', () => {
    const c = campaign(2, ['joe', 'daniela'])
    c.log.values['heartSeal:a'] = 'placed'
    c.log.values['heartSeal:b'] = 'recovered:' + c.investigators[0]!.id
    let s = throughSetup(startScenario(c, 87))
    s = throughSetup(
      choose(s, s.pending!.question.choices[0]!.label, s.pending!.question.choices[0]!.params),
    )
    const owner = s.investigators[1]!
    for (let n = 0; n < 2; n++) {
      expect(s.pending?.question.prompt).toBe(
        `prompt.edgeOfTheEarth.${n === 0 ? 'heartAllocateActiveSeal' : 'heartAllocateDormantSeal'}`,
      )
      s = throughSetup(choose(s, 'choice.investigator', { name: owner.name }))
    }
    expect(ownedSeals(s, owner.id)).toEqual([
      { seal: 'a', holder: 'i:' + owner.id, active: true },
      { seal: 'b', holder: 'i:' + owner.id, active: false },
    ])
  })
  it('applies the attack, shroud and skill bonuses of unleashed seals', () => {
    let s = move(start(2), '08675')
    s = setMeta(setMeta(setMeta(s, 'unleashed:a', 1), 'unleashed:b', 1), 'unleashed:c', 1)
    expect(shroudOf(s, '08675')).toBe(3)
    s = step(s, 'damagePylon', { location: '08674', amount: 1 })
    expect(meta(s, 'damage:08674')).toBe(2)
    s = step(s, 'damagePylon', { location: '08674', amount: 0 })
    expect(meta(s, 'damage:08674')).toBe(2)
    const by = me(s),
      base = getInvestigator(s, by).skills.willpower
    s = dispatch(clean({ ...s, chaosBag: [0] }), {
      type: 'BeginSkillTest',
      investigator: by,
      skill: 'willpower',
      difficulty: 0,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    })
    s = choose(s, 'choice.revealToken')
    expect(s.skillTest?.modifiedSkill).toBe(base + 1)
  })
  it.each(['damage', 'horror'] as const)('cancels exactly one %s with seal D', (field) => {
    let s = setMeta(move(start(2), '08677'), 'unleashed:d', 1)
    const by = me(s),
      before = getInvestigator(s, by)
    s = dispatch(clean(s), { type: 'TakeDamage', investigator: by, damage: 1, horror: 1 })
    expect(s.pending?.question.prompt).toBe('prompt.edgeOfTheEarth.heartCancel')
    s = choose(s, 'choice.edgeOfTheEarth.heartCancel' + (field === 'damage' ? 'Damage' : 'Horror'))
    if (s.pending)
      s = choose(s, s.pending.question.choices[0]!.label, s.pending.question.choices[0]!.params)
    const after = getInvestigator(s, by)
    expect(after.damage - before.damage).toBe(field === 'damage' ? 0 : 1)
    expect(after.horror - before.horror).toBe(field === 'horror' ? 0 : 1)
  })
  it.each(['08657', '08658'] as const)('scales %s with the distance to the gate', (code) => {
    let s = start()
    const by = me(s),
      far = Object.values(s.locations).find(
        (l) => l.position?.[0] === 6 && l.position?.[1] === 0,
      )!.id
    s = move(s, far)
    s = dispatch(clean(s), ...treacheryBehavior(code)!.revelation!(s, by, revealedTreachery(code)))
    expect(s.skillTest?.difficulty).toBe(5)
    expect(s.skillTest?.skill).toBe(code === '08657' ? 'willpower' : 'agility')
  })
  it('Electrostatic Discharge affects all local investigators once, including a seal on the ground', () => {
    let s = start(1, ['joe', 'daniela'])
    s = putSeal(s, 'a', 'l:' + GATE, true)
    s = putSeal(s, 'b', 'l:' + GATE)
    s = dispatch(
      clean(s),
      ...treacheryBehavior('08670')!.revelation!(s, me(s), revealedTreachery('08670')),
    )
    for (let n = 0; n < 3 && s.pending; n++)
      s = choose(s, s.pending.question.choices[0]!.label, s.pending.question.choices[0]!.params)
    for (const i of s.investigators) {
      expect(i.damage).toBe(1)
      expect(i.horror).toBe(1)
    }
  })
  it.each(SEALS)('activates dormant seal %s only once and pays the local group cost', (seal) => {
    const location = { a: '08650', b: '08652', c: '08651', d: '08653', e: '08654' }[seal]
    let s = move(start(), location)
    s = putSeal(s, seal, 'i:' + me(s))
    s = {
      ...s,
      chaosBag: [0],
      investigators: s.investigators.map((i) => ({
        ...i,
        clues: 1,
        hand: ['01000', '01000'],
        skills: { willpower: 10, intellect: 10, combat: 10, agility: 10 },
      })),
    }
    s = dispatch(clean(s), { type: 'PlayerWindow', investigator: me(s) })
    s = choose(s, 'ability.edgeOfTheEarth.heart.activateSeal', { seal })
    if (seal !== 'e') {
      s = choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
      s = choose(s, 'choice.edgeOfTheEarth.heartYes')
    }
    for (let n = 0; n < 5 && s.pending?.question.prompt === 'prompt.edgeOfTheEarth.heartPay'; n++)
      s = choose(s, s.pending.question.choices[0]!.label, s.pending.question.choices[0]!.params)
    s = throughSetup(s)
    expect(ownedSeals(s, me(s)).find((t) => t.seal === seal)?.active).toBe(true)
    expect(getInvestigator(s, me(s)).clues).toBe(0)
    if (seal === 'e') expect(getInvestigator(s, me(s)).hand).toHaveLength(0)
    expect(
      availableAbilities(s, me(s)).some(
        (a) => a.label === 'ability.edgeOfTheEarth.heart.activateSeal',
      ),
    ).toBe(false)
  })
  it.each(SEALS)('unleashes seal %s on its matching pylon and consumes its control', (seal) => {
    const loc = String(8674 + SEALS.indexOf(seal)).padStart(5, '0')
    let s = move(start(2), loc)
    s = putSeal(s, seal, 'i:' + me(s), true)
    s = step(s, 'unleash', { investigator: me(s), seal, location: loc })
    expect(meta(s, 'unleashed:' + seal)).toBe(1)
    expect(seals(s)).toContainEqual({ seal, holder: 'l:' + loc, active: true })
    expect(
      availableAbilities(s, me(s)).some((a) => a.label === 'ability.edgeOfTheEarth.heart.unleash'),
    ).toBe(false)
  })
  it('places all five activated seals and reaches the checkpoint through the act deck', () => {
    let s = start()
    for (const seal of SEALS) {
      s = putSeal(s, seal, 'i:' + me(s), true)
      s = step(s, 'placeSeal', { investigator: me(s), seal })
      s = dispatch(clean(s), { type: 'PlayerWindow', investigator: me(s) })
      s = finishStories(s)
    }
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
    for (const seal of SEALS) expect(s.campaignLog!.values['heartSeal:' + seal]).toBe('placed')
    expect(s.campaignLog!.investigators[me(s)]!.xp).toBe(5)
  })
  it.each([
    ['08720', '08717'],
    ['08714', '08720'],
    ['08715', '08714'],
    ['08722', '08716'],
    ['08716', '08718'],
    ['08717', '08715'],
    ['08719', '08722'],
    ['08721', '08719'],
    ['08718', '08721'],
  ] as const)('the Final Straw tests the correct rescuer for %s', (victim, rescuer) => {
    for (const saved of [true, false]) {
      let s = start()
      const e = s.campaignLog!.expedition!
      s = {
        ...s,
        campaignLog: {
          ...s.campaignLog!,
          expedition: {
            ...e,
            partners: Object.fromEntries(
              Object.entries(e.partners).map(([id, r]) => [
                id,
                {
                  ...r,
                  status:
                    id === victim ? 'safe' : id === rescuer && saved ? 'resolute' : 'eliminated',
                },
              ]),
            ),
          },
        },
      } as GameState
      s = throughSetup(step(s, 'finalStraw'))
      expect(s.campaignLog!.expedition!.partners[victim]!.status).toBe(
        saved ? 'safe' : 'eliminated',
      )
    }
  })
  it('pays the first entrance to an unrevealed pylon from the origin and not on later entries', () => {
    let s = start(2)
    const by = me(s)
    s = { ...s, investigators: s.investigators.map((i) => ({ ...i, clues: 1 })) }
    s = dispatch(clean(s), { type: 'MoveTo', investigator: by, location: '08674' })
    expect(s.pending?.question.prompt).toBe('prompt.edgeOfTheEarth.heartPay')
    s = choose(s, 'choice.investigator', { name: getInvestigator(s, by).name })
    expect(getInvestigator(s, by).location).toBe('08674')
    expect(getInvestigator(s, by).clues).toBe(0)
    s = dispatch(
      clean(s),
      { type: 'MoveTo', investigator: by, location: '08650' },
      { type: 'MoveTo', investigator: by, location: '08674' },
    )
    expect(getInvestigator(s, by).location).toBe('08674')
  })
  it('resolves existing Tekeli-li without duplicating them or returning them to the scenario deck', () => {
    let s = start(2)
    const id = me(s),
      pool = s.tekeliliDeck!.length
    s = {
      ...s,
      investigators: s.investigators.map((i) => ({ ...i, deck: ['08724', ...i.deck], damage: 0 })),
      campaignLog: {
        ...s.campaignLog!,
        investigators: {
          ...s.campaignLog!.investigators,
          [id]: { ...s.campaignLog!.investigators[id]!, storyAssets: ['08724'] },
        },
      },
    }
    s = step(s, 'resolveAllTekelili')
    // Damage assignment is the only decision for this Tekeli-li.
    if (s.pending)
      s = choose(s, s.pending.question.choices[0]!.label, s.pending.question.choices[0]!.params)
    expect(s.tekeliliDeck).toHaveLength(pool)
    expect(getInvestigator(s, id).deck.filter((c) => c === '08724')).toHaveLength(1)
    expect(s.campaignLog!.investigators[id]!.storyAssets.filter((c) => c === '08724')).toHaveLength(
      1,
    )
    expect(getInvestigator(s, id).damage).toBe(1)
  })
  it.each([1, 2] as const)('builds the complete ring/spoke map for part %i', (part) => {
    for (let seed = 1; seed <= 40; seed++) {
      const { locations, inner } = heartMap(part, seed)
      expect(locations).toHaveLength(16)
      expect(new Set(locations.map((l) => l.id)).size).toBe(16)
      for (const l of locations)
        for (const n of l.connections)
          expect(locations.find((x) => x.id === n)!.connections).toContain(l.id)
      if (part === 2) expect(inner.every((id) => /^0867[4-8]$/.test(id))).toBe(false)
    }
    const s = start(part)
    expect(s.phase).toBe('investigation')
    expect(s.tekeliliDeck?.length).toBeGreaterThan(0)
    expect(s.investigators[0]!.location === GATE).toBe(part === 1)
    expect(s.agendas.map((a) => a.code)).toEqual(
      part === 1 ? ['08659', '08660', '08661'] : ['08671', '08672'],
    )
  })
  it('uses exactly the printed encounter sets of each part', () => {
    const first = heartDeck(1, 2),
      second = heartDeck(2, 2)
    expect(first.encounterDeck.filter((c) => c.code === '01166')).toHaveLength(3)
    expect(first.encounterDeck.filter((c) => c.code === '08669')).toHaveLength(2)
    expect(
      second.encounterDeck.some((c) =>
        ['01163', '08669', '08670', '08710', '08711'].includes(c.code),
      ),
    ).toBe(false)
    expect(second.encounterDeck.filter((c) => c.code === '08680')).toHaveLength(2)
    expect(second.setAside).toHaveLength(15)
  })
  it('can skip part I and finish it as skipped without claiming XP or recovered seals', () => {
    const c = campaign(),
      s = throughSetup(startScenario(c, 87))
    const skipped = choose(s, 'choice.edgeOfTheEarth.heartSkip')
    expect(skipped.outcome).toEqual({ type: 'noResolution' })
    const next = finishScenario(c, skipped)
    expect(next.results.at(-1)?.skipped).toBe(true)
    expect(campaignDefinition(next.id).scenarios[next.scenarioIndex]?.id).toBe(EOTE_HEART_TWO)
    expect(next.log.values.edgeOfTheEarthHeartPlayed).toBeUndefined()
  })
  it('reveals each dormant seal only once, and never recreates a lost seal', () => {
    let s = move(start(), '08664')
    expect(seals(s)).toContainEqual({ seal: 'a', holder: 'l:08664', active: false })
    s = putSeal(s, 'a', 'removed')
    s = dispatch(clean(s), { type: 'RevealLocation', location: '08664' })
    expect(seals(s).some((t) => t.seal === 'a')).toBe(false)
  })
  it('acquires a seal through its printed test and the local group payment', () => {
    let s = move(start(), '08664')
    const id = me(s)
    s = {
      ...s,
      chaosBag: [0],
      investigators: s.investigators.map((i) => ({
        ...i,
        clues: 1,
        skills: { ...i.skills, combat: 6 },
      })),
    }
    s = dispatch(clean(s), { type: 'PlayerWindow', investigator: id })
    s = choose(s, 'ability.edgeOfTheEarth.heart.takeSeal', { seal: 'a' })
    s = choose(s, 'choice.revealToken')
    s = choose(s, 'choice.applyResults')
    s = choose(s, 'choice.edgeOfTheEarth.heartYes')
    s = choose(s, 'choice.investigator', { name: getInvestigator(s, id).name })
    expect(ownedSeals(s, id)).toContainEqual({ seal: 'a', holder: 'i:' + id, active: false })
    expect(getInvestigator(s, id).clues).toBe(0)
  })
  it('does not offer a group cost funded only by investigators at other locations', () => {
    let s = move(start(1, ['joe', 'daniela']), '08668')
    s = {
      ...s,
      investigators: s.investigators.map((i, n) => ({
        ...i,
        clues: n ? 10 : 0,
        resources: n ? 10 : 0,
      })),
    }
    expect(
      availableAbilities(s, me(s)).some((a) => a.label === 'ability.edgeOfTheEarth.heart.takeSeal'),
    ).toBe(false)
  })
  it('destroys the world when active seals meet in part I, but not in part II', () => {
    for (const part of [1, 2] as const) {
      let s = start(part)
      s = putSeal(putSeal(s, 'a', 'i:' + me(s), true), 'b', 'i:' + me(s), true)
      s = finishStories(step(s, 'collision'))
      expect(s.outcome).toEqual(part === 1 ? { type: 'resolution', resolution: 3 } : null)
      expect(s.campaignLog!.notes.includes('campaignLost')).toBe(part === 1)
    }
  })
  it('keeps resigned seals, removes defeated seals, and persists only placed/recovered ones', () => {
    let s = start()
    s = putSeal(putSeal(s, 'a', 'i:' + me(s), true), 'b', 'l:' + GATE, true)
    s = {
      ...s,
      investigators: s.investigators.map((i) => ({
        ...i,
        resigned: true,
        eliminated: true,
        location: null,
      })),
    }
    const ended = finishStories(step(s, 'firstConclusion', { outcome: 0 }))
    expect(ended.campaignLog!.values['heartSeal:a']).toBe('recovered:' + me(s))
    expect(ended.campaignLog!.values['heartSeal:b']).toBe('placed')
    const defeated = step(
      { ...s, investigators: s.investigators.map((i) => ({ ...i, resigned: false })) },
      'loseSeals',
      { investigator: me(s) },
    )
    expect(ownedSeals(defeated, me(s))).toHaveLength(0)
  })
  it('allows weapon attacks on a revealed pylon, but not ordinary enemy damage or evasion', () => {
    let s = move(start(2), '08674')
    const id = me(s)
    const target = fightEnemies(s, id).find((e) => e.id === 'heart-pylon:08674')!
    expect(target).toBeDefined()
    expect(s.enemies[target.id]).toBeUndefined()
    s = dispatch(clean(s), { type: 'DamageEnemy', enemy: target.id, amount: 3, by: id })
    expect(meta(s, 'damage:08674')).toBeUndefined()
    s = withAsset(s, '01016', { uses: 4, owner: id })
    s = {
      ...s,
      chaosBag: [0],
      investigators: s.investigators.map((i) => ({ ...i, skills: { ...i.skills, combat: 10 } })),
    }
    s = dispatch(clean(s), { type: 'PlayerWindow', investigator: id })
    s = choose(s, 'ability.fightWith', { card: '.45 Automatic' })
    s = choose(s, 'choice.revealToken')
    s = choose(s, 'choice.applyResults')
    expect(meta(s, 'damage:08674')).toBe(2)
    expect(s.assets['01016']?.uses).toBe(3)
  })
  it('a successful attack exhausts the nearest ready Madness copies without damaging them', () => {
    let s = move(start(2), '08674')
    const by = me(s)
    s = {
      ...s,
      chaosBag: [0],
      investigators: s.investigators.map((i) => ({ ...i, skills: { ...i.skills, combat: 3 } })),
      enemies: Object.fromEntries(
        Array.from({ length: 3 }, (_, n) => [
          'madness' + n,
          {
            ...namelessMadness,
            id: 'madness' + n,
            maxHealth: 1,
            damageTaken: 0,
            location: '08674',
            engagedWith: null,
            exhausted: false,
          },
        ]),
      ),
    }
    s = dispatch(clean(s), {
      type: 'BeginSkillTest',
      investigator: by,
      skill: 'combat',
      difficulty: 1,
      kind: { type: 'fight', enemy: 'madness0' },
    })
    s = choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
    for (
      let n = 0;
      n < 3 && s.pending?.question.prompt === 'prompt.edgeOfTheEarth.heartExhaust';
      n++
    )
      s = choose(s, s.pending.question.choices[0]!.label, s.pending.question.choices[0]!.params)
    expect(Object.values(s.enemies).filter((e) => e.exhausted)).toHaveLength(2)
    expect(Object.values(s.enemies).every((e) => e.damageTaken === 0)).toBe(true)
  })
  it('spends only newly discovered clues to damage a pylon, once', () => {
    let s = move(start(2), '08674')
    const by = me(s)
    s = { ...s, investigators: s.investigators.map((i) => ({ ...i, clues: 2 })) }
    const trigger = {
      type: 'afterDiscoverClues' as const,
      investigator: by,
      location: '08674',
      amount: 1,
    }
    const reaction = scenarioBehavior(s.scenarioId)!.reactions!(s, trigger)[0]!
    s = dispatch(clean(s), ...reaction.then)
    expect(getInvestigator(s, by).clues).toBe(1)
    expect(meta(s, 'damage:08674')).toBe(1)
  })
  it('does not finish the escape until every undefeated investigator reaches the tunnel', () => {
    let s = start(2, ['joe', 'daniela'])
    s = throughSetup(step(s, 'escape', { all: false }))
    const [a, b] = s.investigators.map((i) => i.id)
    s = throughSetup(move(s, '08686', a))
    expect(s.outcome).toBeNull()
    s = throughSetup(move(s, '08686', b))
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 3 })
  })
  it.each([0, 99])('does not defeat an enemy when a pylon has %i damage', (damage) => {
    let s = setMeta(move(start(2), '08674'), 'damage:08674', damage)
    s = dispatch(clean(s), {
      type: 'IfEnemyDefeated',
      enemy: 'heart-pylon:08674',
      then: [{ type: 'RecordNote', note: 'incorrectEnemyReward' }],
    })
    expect(s.campaignLog!.notes).not.toContain('incorrectEnemyReward')
  })
  it('never creates a real enemy from weapon effects applied to a pylon', () => {
    let s = move(start(2), '08674')
    const enemy = 'heart-pylon:08674',
      by = me(s)
    s = dispatch(
      clean(s),
      { type: 'EvadeEnemy', enemy, by },
      { type: 'EngageEnemy', enemy, investigator: by },
      { type: 'ReadyEnemy', enemy },
      { type: 'DefeatEnemy', enemy, by },
    )
    expect(s.enemies[enemy]).toBeUndefined()
    expect(s.encounterDiscard).toHaveLength(0)
    expect(s.enemyDefeats ?? []).toHaveLength(0)
    expect(s.locations['08674']).toBeDefined()
  })
  it('continues with a surviving lead when introductory trauma kills the original lead', () => {
    let s = start(1, ['joe', 'daniela'])
    const original = me(s),
      survivor = s.investigators[1]!.id
    const log = s.campaignLog!,
      expedition = log.expedition!
    s = {
      ...s,
      leadInvestigatorId: original,
      investigators: s.investigators.map((i) => ({ ...i, eliminated: false })),
      campaignLog: {
        ...log,
        values: { ...log.values, edgeOfTheEarthHeartIntroduced: '0' },
        investigators: {
          ...log.investigators,
          [original]: {
            ...log.investigators[original]!,
            physicalTrauma: s.investigators[0]!.health - 1,
          },
        },
        expedition: {
          ...expedition,
          partners: {
            ...expedition.partners,
            '08720': { ...expedition.partners['08720']!, status: 'eliminated' },
          },
        },
      },
    }
    s = step(s, 'introEffects')
    s = step(s, 'choosePart')
    expect(s.campaignLog!.investigators[original]!.killed).toBe(true)
    expect(s.leadInvestigatorId).toBe(survivor)
    expect(s.pending?.investigator).toBe(survivor)
  })
  it('a ready Unsealed Phantasm prevents damage and exhaustion removes that protection', () => {
    let s = move(start(2), '08674')
    s = dispatch(clean(s), {
      type: 'SpawnEnemy',
      card: unsealedPhantasm,
      location: '08674',
      engageWith: null,
    })
    s = step(s, 'damagePylon', { location: '08674', amount: 3 })
    expect(meta(s, 'damage:08674')).toBeUndefined()
    const e = Object.values(s.enemies).find((e) => e.code === '08680')!
    s = dispatch(clean(s), { type: 'ExhaustEnemy', enemy: e.id })
    s = step(s, 'damagePylon', { location: '08674', amount: 3 })
    expect(meta(s, 'damage:08674')).toBe(3)
  })
  it('replaces doom on every destination with a single madness spawn', () => {
    const cases: Message[] = [
      { type: 'PlaceDoom', amount: 2 },
      { type: 'PlaceDoomOnInvestigator', investigator: 'joe', amount: 1 },
    ]
    for (const message of cases) {
      let s = move(start(2), '08674')
      s = {
        ...s,
        agendaIndex: 1,
        enemies: {
          first: {
            ...namelessMadness,
            id: 'first',
            maxHealth: 1,
            damageTaken: 0,
            location: '08674',
            engagedWith: null,
            exhausted: true,
          },
        },
      }
      s = dispatch(clean(s), message)
      if (s.pending?.question.prompt === 'prompt.edgeOfTheEarth.heartSpawn')
        s = choose(s, s.pending.question.choices[0]!.label, s.pending.question.choices[0]!.params)
      expect(s.doom).toBe(0)
      expect(Object.values(s.enemies).filter((e) => e.code === '08679')).toHaveLength(2)
    }
  })
  it('Protoplasmic Mass hunts only seal bearers and stays put if none remain', () => {
    let s = start(1, ['joe', 'daniela'])
    const ids = s.investigators.map((i) => i.id),
      far = Object.keys(s.locations).find((id) => id !== GATE)!
    s = move(s, far, ids[1]!)
    const e: Enemy = {
      ...protoplasmicMass,
      id: 'mass',
      maxHealth: 4,
      damageTaken: 0,
      location: GATE,
      engagedWith: null,
      exhausted: false,
    }
    expect(huntingSteps(s, e)).toEqual([])
    s = putSeal(s, 'a', 'i:' + ids[1]!)
    expect(huntingSteps(s, e).length).toBeGreaterThan(0)
  })
  it('sets aside the correct number of copies when escaping and keeps the survivors alive', () => {
    let s = start(2)
    for (const seal of ['a', 'b'] as const)
      s = setMeta(s, 'damage:' + String(8674 + SEALS.indexOf(seal)).padStart(5, '0'), 99)
    s = {
      ...s,
      enemies: Object.fromEntries(
        Array.from({ length: 15 }, (_, n) => [
          'n' + n,
          {
            ...namelessMadness,
            id: 'n' + n,
            maxHealth: 1,
            damageTaken: 0,
            location: Object.keys(s.locations)[0]!,
            engagedWith: null,
            exhausted: true,
          },
        ]),
      ),
    }
    s = finishStories(step(s, 'escape', { all: false }))
    expect(s.acts[0]!.code).toBe('08681')
    expect(s.agendas[0]!.code).toBe('08681')
    expect(Object.values(s.enemies).filter((e) => e.code === '08679')).toHaveLength(9)
    expect(getInvestigator(s, me(s)).location).toBe('08682')
    expect(Object.keys(s.locations)).toHaveLength(6)
  })
  it.each([0, 1, 2, 3] as const)(
    'applies the complete final outcome %i and its campaign consequences',
    (n) => {
      const s = finishStories(step(start(2), 'finalConclusion', { outcome: n }))
      expect(s.outcome).toEqual(
        n === 0 ? { type: 'noResolution' } : { type: 'resolution', resolution: n },
      )
      const record = s.campaignLog!.investigators[me(s)]!
      if (n === 0) {
        expect(s.campaignLog!.notes).toContain('campaignLost')
        expect(record.insane).toBe(true)
      } else {
        expect(record.xp).toBe(n === 3 ? 5 : 10)
        expect(record.physicalTrauma).toBe(n === 2 ? 1 : n === 3 ? 2 : 0)
        expect(record.mentalTrauma).toBe(n === 2 ? 1 : n === 3 ? 2 : 0)
      }
    },
  )
  it('restores seal state and the escape position from JSON', () => {
    let s = start(2)
    s = putSeal(s, 'a', 'i:' + me(s), true)
    s = setMeta(s, 'damage:08674', 3)
    const loaded = JSON.parse(JSON.stringify(s)) as GameState
    expect(seals(loaded)).toEqual(seals(s))
    expect(meta(loaded, 'damage:08674')).toBe(3)
    expect(scenarioBehavior(loaded.scenarioId)).toBeDefined()
  })
  it.each([false, true])(
    'finishes the escape by passing the four ramp tests (Kensler plan: %s)',
    (plan) => {
      let s = start(2)
      if (plan)
        s = {
          ...s,
          campaignLog: {
            ...s.campaignLog!,
            notes: [...s.campaignLog!.notes, 'edgeOfTheEarthKenslerPlan'],
          },
        }
      for (let n = 0; n < 5; n++) s = setMeta(s, 'damage:' + String(8674 + n).padStart(5, '0'), 99)
      s = throughSetup(dispatch(clean(s), { type: 'Forced', trigger: { type: 'roundEnds' } }))
      expect(meta(s, 'escape')).toBe(1)
      const by = me(s)
      s = {
        ...s,
        chaosBag: [0],
        investigators: s.investigators.map((i) => ({ ...i, skills: { ...i.skills, agility: 10 } })),
      }
      for (const to of ['08683', '08684', '08685', '08686']) {
        s = dispatch(clean(s), { type: 'MoveTo', investigator: by, location: to })
        expect(s.pending?.question.prompt).toBe('prompt.edgeOfTheEarth.heartRamp')
        s = choose(s, 'choice.edgeOfTheEarth.heartTestRamp')
        s = choose(s, 'choice.revealToken')
        s = throughSetup(choose(s, 'choice.applyResults'))
      }
      expect(s.outcome).toEqual({ type: 'resolution', resolution: plan ? 1 : 2 })
    },
  )
  it.each(['standard', 'hard'] as const)(
    'treats the cultist as frost without losing the physical token on %s',
    (difficulty) => {
      const original = move(start(2), '08674'),
        by = me(original)
      let revealed: GameState | undefined
      for (let seed = 1; seed < 25 && !revealed; seed++) {
        let s: GameState = {
          ...original,
          difficulty,
          rng: seed,
          chaosBag: ['cultist', 0] as ('cultist' | number)[],
        }
        s = dispatch(clean(s), {
          type: 'BeginSkillTest',
          investigator: by,
          skill: 'willpower',
          difficulty: 1,
          kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
        })
        s = choose(s, 'choice.revealToken')
        if (s.skillTest?.resolvedTokens?.some((t) => t.token === 'cultist' && t.face === 'frost'))
          revealed = s
      }
      expect(revealed).toBeDefined()
      expect(revealed!.skillTest!.tokenModifier).toBe(difficulty === 'hard' ? -2 : -1)
      const ended = choose(revealed!, 'choice.applyResults')
      expect(ended.chaosBag.filter((t) => t === 'cultist')).toHaveLength(1)
      expect(ended.chaosBag).not.toContain('frost')
    },
  )
})
