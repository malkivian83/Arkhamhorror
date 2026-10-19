import { finishScenario, newCampaign, startScenario } from '@lcg/cards'
import { applyInput, type GameState, type Message, type PlayerInput } from '@lcg/engine'
import { during, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { decodeSession, replay, session } from './session'
import { markOf, undoTarget } from './undo'

// AHC80 ES pp. 3–4, 13–19; RR: "Control", "Story Cards", "Victory Display".
// Registered cards and directed tables. These are NOT full legal victories.
const campaign = () => newCampaign('the-midwinter-gala', ['joe', 'trish'], 'standard')
function table() {
  let s = throughSetup(startScenario(campaign(), 13))
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return during(s, (g) => ({
    ...g,
    enemies: {},
    assets: {},
    placedAssets: {},
    stories: {},
    chaosBag: [0],
    investigators: g.investigators.map((i) => ({
      ...i,
      skills: { willpower: 5, intellect: 5, combat: 5, agility: 5 },
      location: '71007',
      clues: 12,
      resources: 10,
      actionsRemaining: 3,
    })),
    locations: Object.fromEntries(
      Object.entries(g.locations).map(([id, l]) => [id, { ...l, revealed: true, clues: 0 }]),
    ),
  }))
}
const put = (code: string, tokens = {}): Message => ({
  type: 'PutAssetIntoPlay',
  investigator: '12004',
  code,
  tokens,
})
const place = (code: string, faceDown = false): Message => ({
  type: 'PlaceAsset',
  code,
  name: code,
  faceDown,
  placement: { type: 'location', location: '71007' },
})
const forced = (messages: Message[]): Message => ({
  type: 'BeginSkillTest',
  investigator: '12004',
  skill: 'intellect',
  difficulty: 0,
  kind: {
    type: 'effect',
    source: 'Gala directed persistence fixture',
    onSuccess: messages,
    onFail: [],
    onFailEach: [],
  },
})

const kinds = [
  'reward',
  'negotiate',
  'spellbind',
  'unspell',
  'jewelControlled',
  'jewelEnemy',
  'jewelMystery',
  'jewelLeaves',
  'lanternBreak',
  'lanternLeaves',
  'rival',
  'carl',
]
function window(kind: string): GameState {
  let s = table()
  if (kind === 'reward')
    return during(
      s,
      (g) => ({ ...g, scenarioMeta: { ...g.scenarioMeta, ally: 'foundation' } }),
      put('71016'),
      put('71017'),
      { type: 'PutAssetIntoPlay', code: '71018', investigator: '12007' },
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } },
    )
  if (kind === 'negotiate') return during(s, (g) => g, place('71017'))
  if (kind === 'unspell' || kind === 'lanternBreak')
    return during(
      s,
      (g) => g,
      put('71046b', { damage: kind === 'lanternBreak' ? 2 : 0 }),
      place('71017', true),
    )
  if (kind === 'spellbind') {
    s = during(s, (g) => g, put('71035', { uses: 1, doom: 1 }))
    return during(
      s,
      (g) => g,
      forced([{ type: 'DiscardAsset', asset: Object.values(s.assets)[0]!.id }]),
    )
  }
  if (kind === 'jewelLeaves' || kind === 'lanternLeaves') {
    s = during(
      s,
      (g) => g,
      put(kind === 'jewelLeaves' ? '71052' : '71046b', { damage: 1, doom: 1 }),
    )
    return during(
      s,
      (g) => g,
      forced([{ type: 'DiscardAsset', asset: Object.values(s.assets)[0]!.id }]),
    )
  }
  if (kind === 'jewelControlled' || kind === 'jewelEnemy') {
    s = during(s, (g) => g, {
      type: 'SpawnEnemy',
      card: {
        kind: 'enemy',
        code: '71051',
        name: 'Declan Pearce',
        health: 6,
        fight: 2,
        evade: 2,
        damage: 0,
        horror: 2,
        keywords: [],
      },
      location: '71007',
      engageWith: '12004',
    })
    if (kind === 'jewelControlled') return during(s, (g) => g, put('71052', { damage: 3, doom: 1 }))
    const enemy = Object.values(s.enemies)[0]!
    s = during(s, (g) => g, {
      type: 'PlaceAsset',
      code: '71052',
      name: 'Jewel of Sarnath',
      damage: 2,
      doom: 1,
      placement: { type: 'enemy', enemy: enemy.id },
    })
    return during(
      s,
      (g) => g,
      forced([{ type: 'DamageEnemy', enemy: enemy.id, amount: 6, by: '12004' }]),
    )
  }
  if (kind === 'jewelMystery')
    return during(
      s,
      (g) => ({
        ...g,
        locations: {
          ...g.locations,
          '71007': {
            ...g.locations['71007']!,
            beneath: [{ kind: 'treachery', code: '71052', name: 'Jewel of Sarnath', keywords: [] }],
          },
        },
      }),
      { type: 'PutStoryIntoPlay', code: '71027', name: 'The Syndicate' },
    )
  if (kind === 'rival') {
    // Seed 13's Foundation table has one specific Rival, preserved in its set-aside cards.
    const stories: Record<string, string> = {
      foundation: '71015',
      miskatonic: '71021',
      syndicate: '71027',
      lodge: '71033',
      kingsport: '71039',
    }
    const code = stories[String(s.scenarioMeta!.rival)]!
    return during(s, (g) => g, { type: 'PutStoryIntoPlay', code: `${code}b`, name: code })
  }
  s = during(
    s,
    (g) => ({ ...g, investigators: g.investigators.map((i) => ({ ...i, hand: [] })) }),
    put('71034'),
    put('71037'),
  )
  return during(s, (g) => g, {
    type: 'ResolveEncounterCard',
    investigator: '12004',
    card: { kind: 'treachery', code: '71054', name: 'Bleeding Walls', keywords: [] },
  })
}

function verifyEveryStep(base: GameState, preferred: string[], terminal = false) {
  const states = [base]
  const inputs: PlayerInput[] = []
  let state = base
  for (let n = 0; state.pending && !state.outcome && n < 60; n++) {
    if (n > 0 && state.pending.question.prompt === 'prompt.chooseAction') break
    const choices = state.pending.question.choices
    const index = [...preferred, 'choice.revealToken', 'choice.applyResults', 'choice.skip']
      .map((label) => choices.findIndex((c) => c.label === label))
      .find((index) => index >= 0)
    const input = { investigator: state.pending.investigator, choice: index ?? 0 }
    state = applyInput(state, input)
    states.push(state)
    inputs.push(input)
    const history = { base, inputs: [...inputs], marks: states.map(markOf) }
    const data = session(state, history, campaign())
    const restored = decodeSession(JSON.stringify(data))
    expect(restored.state).toEqual(state)
    expect(replay(restored.history!.base, restored.history!.inputs).state).toEqual(state)
    const target = undoTarget(restored.history!.marks, 'step')!
    expect(replay(base, inputs.slice(0, target)).state).toEqual(states[target])
  }
  expect(inputs.length).toBeGreaterThan(0)
  if (terminal) {
    expect(state.outcome?.type).toBe('resolution')
    const completed = finishScenario(campaign(), state)
    const stored = decodeSession(JSON.stringify(session(null, null, completed)))
    expect(stored.campaign).toEqual(completed)
    expect(completed.results[0]!.experience).toEqual(state.experience)
    expect(completed.results[0]!.score).toBe(state.scenarioMeta!.score)
    const invalid = JSON.parse(JSON.stringify(session(null, null, completed)))
    invalid.campaign.results[0].score = -1
    expect(() => decodeSession(JSON.stringify(invalid))).toThrow()
  } else expect(state.pending?.question.prompt).toBe('prompt.chooseAction')
  return state
}

describe('Gala fase 3: guardar, reanudar y deshacer ventanas especiales', () => {
  it.each(kinds)('%s conserva cada decisión y su estado completo', (kind) => {
    const labels: Record<string, string[]> = {
      reward: ['choice.gala.keepGuest'],
      negotiate: ['ability.gala.parleyGuest'],
      unspell: ['ability.gala.unspell'],
      jewelControlled: ['ability.gala.channelJewel'],
      jewelMystery: ['ability.gala.drawMystery'],
      lanternBreak: ['ability.gala.breakLantern'],
      rival: ['ability.gala.parleyRival'],
      carl: ['ability.gala.raymond', 'ability.gala.carl'],
    }
    const s = verifyEveryStep(window(kind), labels[kind] ?? [], kind === 'reward')
    if (kind === 'reward') {
      expect(s.campaignLog!.investigators['12004']!.storyAssets).toEqual(['71017'])
      expect(s.campaignLog!.investigators['12007']!.storyAssets).toEqual(['71018'])
      expect(s.scenarioMeta!.score).toBe(27)
      expect(Object.values(s.assets).map((a) => a.code)).toEqual(['71016'])
    }
    if (kind === 'negotiate')
      expect(Object.values(s.assets).some((a) => a.code === '71017')).toBe(true)
    if (kind === 'spellbind')
      expect(Object.values(s.placedAssets!)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: '71035', faceDown: true, uses: 1, doom: 1 }),
        ]),
      )
    if (kind === 'jewelMystery')
      expect(Object.values(s.assets).find((a) => a.code === '71052')).toMatchObject({
        damage: 3,
        doom: 1,
      })
    if (kind === 'jewelEnemy')
      expect(Object.values(s.placedAssets!).find((p) => p.code === '71052')!.placement).toEqual({
        type: 'location',
        location: '71007',
      })
    if (kind === 'jewelLeaves')
      expect(s.encounterDeck.filter((c) => c.code === '71052')).toHaveLength(1)
    if (kind === 'lanternLeaves')
      expect(Object.values(s.placedAssets!).find((p) => p.code === '71046')).toMatchObject({
        damage: 1,
        placement: { type: 'location', location: '71007' },
      })
    if (kind === 'lanternBreak') {
      expect(s.victoryDisplay).toContain('71046')
      expect(Object.values(s.placedAssets!).every((p) => !p.faceDown)).toBe(true)
    }
    if (kind === 'carl') expect(s.victoryDisplay).toContain('71054')
  })
  it.each(['foundation', 'miskatonic', 'syndicate', 'lodge', 'kingsport'])(
    '%s conserva lecturas finales, experiencia y registro',
    (ally) => {
      const stories: Record<string, string> = {
        foundation: '71015',
        miskatonic: '71021',
        syndicate: '71027',
        lodge: '71033',
        kingsport: '71039',
      }
      const s = during(
        table(),
        (g) => ({ ...g, actIndex: 1, scenarioMeta: { ...g.scenarioMeta, ally } }),
        put('71052'),
        { type: 'PutStoryIntoPlay', code: stories[ally]!, name: ally },
        { type: 'Forced', trigger: { type: 'roundEnds' } },
      )
      verifyEveryStep(s, ['choice.gala.completeObjective'], true)
    },
  )
})
