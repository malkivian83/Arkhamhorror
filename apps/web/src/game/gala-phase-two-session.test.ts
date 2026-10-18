import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, type GameState, type Message, type PlayerInput } from '@lcg/engine'
import { during, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { decodeSession, replay, session } from './session'
import { markOf, undoTarget } from './undo'

function table() {
  let s = throughSetup(
    startScenario(newCampaign('the-midwinter-gala', ['joe', 'trish'], 'standard'), 13),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return during(s, (g) => ({
    ...g,
    enemies: {},
    assets: {},
    placedAssets: {},
    stories: {},
    investigators: g.investigators.map((i) => ({
      ...i,
      location: '71007',
      resources: 8,
      hand: [],
    })),
    locations: Object.fromEntries(
      Object.entries(g.locations).map(([id, l]) => [id, { ...l, revealed: true, clues: 0 }]),
    ),
  }))
}
const encounter = (code: string) => ({ kind: 'treachery' as const, code, name: code, keywords: [] })
const specific = (key: string, data: Record<string, string | number | boolean> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data: { investigator: '12004', ...data },
})

/** Real registered cards, directed windows; not a legal full campaign recording. */
function window(kind: string): GameState {
  let s = table()
  if (kind === 'Prudence')
    return during(
      s,
      (g) => ({
        ...g,
        encounterDeck: ['71054', '71055', '71056', '71057', '71058'].map(encounter),
      }),
      specific('prudence', { left: 2 }),
    )
  if (kind === 'Archibald')
    return during(
      s,
      (g) => ({
        ...g,
        encounterDeck: [
          {
            kind: 'enemy',
            code: '71053',
            name: 'Lantern Club Member',
            fight: 3,
            health: 2,
            evade: 2,
            damage: 1,
            horror: 0,
            keywords: [],
          },
          {
            kind: 'enemy',
            code: '71047',
            name: 'Enraged Gug',
            fight: 4,
            health: 3,
            evade: 1,
            damage: 1,
            horror: 1,
            keywords: [],
          },
        ],
      }),
      specific('archibald'),
    )
  if (kind === 'Lucas')
    return during(
      s,
      (g) => ({
        ...g,
        investigators: g.investigators.map((i) =>
          i.id === '12004' ? { ...i, deck: ['12040', '12068', '12089'] } : i,
        ),
      }),
      specific('lucas'),
    )
  if (kind === 'Misterios')
    return during(
      s,
      (g) => ({
        ...g,
        locations: {
          ...g.locations,
          '71010': { ...g.locations['71010']!, beneath: [encounter('71054'), encounter('71055')] },
        },
      }),
      { type: 'PutStoryIntoPlay', code: '71027', name: 'Syndicate' },
    )
  if (kind === 'Baile') {
    s = during(
      s,
      (g) => ({ ...g, investigators: g.investigators.map((i) => ({ ...i, location: '71010' })) }),
      ...['71022', '71023', '71024'].map((code): Message => ({
        type: 'PutAssetIntoPlay',
        investigator: '12004',
        code,
      })),
    )
    return s
  }
  s = during(
    s,
    (g) => ({
      ...g,
      investigators: g.investigators.map((i) => (i.id === '12004' ? { ...i, deck: ['12088'] } : i)),
    }),
    { type: 'PutAssetIntoPlay', investigator: '12004', code: '71042' },
    {
      type: 'BeginSkillTest',
      investigator: '12007',
      skill: 'intellect',
      difficulty: 0,
      kind: { type: 'effect', source: 'Test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  return s
}

describe('Gala fase 2: guardar, reproducir y deshacer decisiones pendientes', () => {
  it.each(['Prudence', 'Archibald', 'Lucas', 'Misterios', 'Baile', 'Olney'])(
    '%s conserva cada ventana y la decisión anterior',
    (kind) => {
      const base = window(kind)
      const states = [base]
      const inputs: PlayerInput[] = []
      let state = base
      for (let n = 0; n < 12 && state.pending; n++) {
        const choices = state.pending.question.choices
        const labels =
          kind === 'Misterios'
            ? ['ability.gala.drawMystery']
            : kind === 'Baile'
              ? ['ability.gala.dance']
              : kind === 'Olney'
                ? ['ability.gala.olneyCommit']
                : []
        const preferred = labels
          .map((l) => choices.findIndex((c) => c.label === l))
          .find((index) => index >= 0)
        if (n > 0 && state.pending.question.prompt === 'prompt.chooseAction') break
        const input = { investigator: state.pending.investigator, choice: preferred ?? 0 }
        state = applyInput(state, input)
        inputs.push(input)
        states.push(state)
        const marks = states.map(markOf)
        const data = session(state, { base, inputs: [...inputs], marks }, null)
        const restored = decodeSession(JSON.stringify(data))
        expect(restored).toEqual(data)
        expect(replay(restored.history!.base, restored.history!.inputs).state).toEqual(state)
        const target = undoTarget(restored.history!.marks, 'step')!
        expect(replay(base, inputs.slice(0, target)).state).toEqual(states[target])
        // Finish after reaching the test's reveal window; later test resolution is covered elsewhere.
        if (kind === 'Olney' && state.skillTest!.committed.length) break
      }
      expect(inputs.length).toBeGreaterThanOrEqual(kind === 'Olney' || kind === 'Archibald' ? 1 : 2)
    },
  )
})
