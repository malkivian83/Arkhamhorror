import { applyInput, createGame, registerAct, type GameState, type Message } from '@lcg/engine'
import { during, testInvestigator, testScenario, throughSetup } from '@lcg/engine/testing'
import { newCampaign, startScenario } from '@lcg/cards'
import { describe, expect, it } from 'vitest'
import {
  createAdvanceReview,
  resumedAdvanceReview,
  unreviewedEncounterDraws,
  validAdvanceReview,
} from './advanceReview'
import { decodeSession, replay, session } from './session'
import { markOf } from './undo'

const code = 'visual-review-act'
registerAct({
  code,
  onAdvance: () => [
    { type: 'PutLocationIntoPlay', location: 'D' },
    {
      type: 'Ask',
      investigator: 'a',
      question: {
        kind: 'chooseOne',
        prompt: 'review.choice',
        choices: [
          { label: 'review.gain', then: [{ type: 'GainResources', investigator: 'a', amount: 2 }] },
          { label: 'review.skip', then: [] },
        ],
      },
    },
    { type: 'PutAssetIntoPlay', investigator: 'a', code: '12017' },
  ],
})
function table(players = 1) {
  let s = throughSetup(
    createGame({
      seed: 7,
      interactive: true,
      scenario: testScenario({
        acts: [
          {
            code,
            name: 'First act',
            clueThreshold: 2,
            cluesPerInvestigator: true,
            advanceTiming: 'anytime',
          },
          {
            name: 'Second act',
            clueThreshold: 10,
            cluesPerInvestigator: false,
            advanceTiming: 'anytime',
          },
        ],
        setAsideLocations: [
          {
            id: 'D',
            name: 'New room',
            shroud: 1,
            clueValue: 1,
            cluesPerInvestigator: true,
            connections: ['A'],
          },
        ],
      }),
      investigators: Array.from({ length: players }, (_, n) => testInvestigator(n ? 'b' : 'a')),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return during(s, (g) => ({
    ...g,
    investigators: g.investigators.map((i) => ({ ...i, clues: 3 })),
  }))
}
function reviewed(s: GameState, label: string) {
  const choice = s.pending!.question.choices.findIndex((c) => c.label === label)
  expect(choice).toBeGreaterThanOrEqual(0)
  const collector = createAdvanceReview(s)
  const input = { investigator: s.pending!.investigator, choice }
  const next = applyInput(s, input, collector.observe)
  expect(next).toEqual(applyInput(s, input))
  return { state: next, frames: collector.finish(next), input }
}

describe('avance visual con aceptación, independiente de las reglas', () => {
  it('conserva el aviso de robos posteriores al avance sin duplicar los revisados', () => {
    const { frames } = reviewed(table(), 'action.advanceAct')
    const advancedDraw = { key: 'log.encounter', params: { code: 'A' }, round: 1 }
    const followingDraw = { key: 'log.encounter', params: { code: 'B' }, round: 2 }
    frames[0]!.effects.push(advancedDraw)
    // Incluso otra copia de la misma carta, robada después, conserva su aviso.
    const followingCopy = { ...advancedDraw, round: 2 }
    expect(unreviewedEncounterDraws([advancedDraw, followingDraw, followingCopy], frames)).toEqual([
      followingDraw,
      followingCopy,
    ])
  })
  it('conserva el orden de un plan seguido de un acto dentro de una misma decisión', () => {
    const s = table()
    const initial: GameState = {
      ...s,
      pending: {
        investigator: 'a',
        question: {
          kind: 'chooseOne',
          prompt: 'review.sequence',
          choices: [
            {
              label: 'review.advance',
              then: [{ type: 'AdvanceAgenda' }, { type: 'AdvanceAct', paid: true }],
            },
          ],
        },
      },
    }
    const { state, frames } = reviewed(initial, 'review.advance')
    expect(state.agendaIndex).toBe(1)
    expect(state.actIndex).toBe(0)
    expect(frames.map((f) => `${f.kind}:${f.stage}`)).toEqual([
      'agenda:reverse',
      'agenda:next',
      'act:reverse',
      'act:entered',
      'act:decision',
    ])
  })
  it('muestra pago, reverso, entrada y decisión sin anunciar el segundo acto antes de tiempo', () => {
    const { state, frames } = reviewed(table(), 'action.advanceAct')
    expect(state.actIndex).toBe(0)
    expect(state.pending!.question.prompt).toBe('review.choice')
    expect(frames.map((f) => f.stage)).toEqual(['payment', 'reverse', 'entered', 'decision'])
    expect(frames[2]!.cards).toContainEqual(expect.objectContaining({ code: 'D', back: true }))
    expect(frames.some((f) => f.stage === 'next')).toBe(false)
    expect(validAdvanceReview(frames)).toBe(true)
  })
  it('continúa los efectos del reverso y solo presenta el nuevo acto al terminar', () => {
    const paused = reviewed(table(), 'action.advanceAct').state
    const { state, frames } = reviewed(paused, 'review.gain')
    expect(state.actIndex).toBe(1)
    expect(frames.map((f) => f.stage)).toEqual(['effects', 'entered', 'next'])
    expect(frames.at(-1)!.cards[0]!.name).toBe('Second act')
    expect(frames.some((f) => f.stage === 'reverse')).toBe(false)
  })
  it('mantiene las decisiones reales del pago colectivo', () => {
    const { state, frames } = reviewed(table(2), 'action.advanceAct')
    expect(state.pending!.question.prompt).toBe('prompt.whoPaysClue')
    expect(frames.map((f) => f.stage)).toEqual(['decision'])
    const resumed = resumedAdvanceReview(state)
    expect(resumed[0]!.stage).toBe('payment')
    expect(resumed.some((f) => f.stage === 'reverse')).toBe(false)
  })
  it('reanuda un reverso antiguo y no inventa avances en turnos normales', () => {
    expect(resumedAdvanceReview(table())).toEqual([])
    const paused = reviewed(table(), 'action.advanceAct').state
    expect(resumedAdvanceReview(paused).map((f) => f.stage)).toEqual(['reverse', 'decision'])
    expect(reviewed(table(), 'action.resource').frames).toEqual([])
  })
  it('no trata un AdvanceAct futuro sin ejecutar como un avance en curso', () => {
    const s = table()
    expect(resumedAdvanceReview({ ...s, queue: [{ type: 'AdvanceAct' }, ...s.queue] })).toEqual([])
  })
  it('no expone cartas hechizadas al entrar boca abajo', () => {
    const s = reviewed(table(), 'action.advanceAct').state
    const c = createAdvanceReview(s)
    const message: Message = { type: 'Log', key: 'review.test' }
    const after: GameState = {
      ...s,
      placedAssets: {
        hidden: {
          id: 'hidden',
          code: '71035',
          name: 'Hidden guest',
          placement: { type: 'location', location: 'A' },
          faceDown: true,
          damage: 0,
          horror: 0,
          exhausted: false,
        },
      },
    }
    c.observe(s, message, after)
    expect(
      c
        .finish(after)
        .flatMap((f) => f.cards)
        .some((card) => card.code === '71035'),
    ).toBe(false)
  })
})

function gala() {
  const s = throughSetup(startScenario(newCampaign('the-midwinter-gala', ['joe'], 'standard'), 13))
  return during(s, (g) => ({
    ...g,
    agendaIndex: 1,
    investigators: g.investigators.map((i) => ({ ...i, clues: 0 })),
    acts: g.acts.map((a, n) => (n ? a : { ...a, clueThreshold: 0 })),
    assets: {
      ...g.assets,
      g1: {
        id: 'g1',
        owner: '12004',
        code: '71017',
        exhausted: false,
        uses: 0,
        damage: 0,
        horror: 0,
      },
      g2: {
        id: 'g2',
        owner: '12004',
        code: '71018',
        exhausted: false,
        uses: 0,
        damage: 0,
        horror: 0,
      },
    },
  }))
}
describe('guardado e historial del avance visual', () => {
  it('Gala conserva la lectura pendiente sin cambiar su historial ni la revisión de reglas', () => {
    const base = gala()
    const { state, frames, input } = reviewed(base, 'action.advanceAct')
    expect(state.actIndex).toBe(0)
    expect(state.pending?.question.story).toBeTruthy()
    expect(frames.some((f) => f.stage === 'next')).toBe(false)
    const history = { base, inputs: [input], marks: [markOf(base), markOf(state)] }
    const save = session(state, history, null, frames.slice(1))
    const decoded = decodeSession(JSON.stringify(save))
    expect(decoded.advanceReview).toEqual(frames.slice(1))
    expect(replay(decoded.history!.base, decoded.history!.inputs).state).toEqual(state)
    expect(state.scenarioRulesVersion).toBe(4)
    expect(
      decodeSession(JSON.stringify(session(state, history, null))).advanceReview,
    ).toBeUndefined()
    expect(decodeSession(JSON.stringify(session(state, history, null, []))).advanceReview).toEqual(
      [],
    )
  })
  it('explica dónde aparecen los enemigos, quién controla los apoyos y dónde se vincula la Joya', () => {
    const paused = reviewed(gala(), 'action.advanceAct').state
    const choice = paused.pending!.question.choices[0]!.label
    const { state, frames } = reviewed(paused, choice)
    const shown = frames.flatMap((f) => f.cards)
    const declan = Object.values(state.enemies).find((e) => e.name === 'Declan Pearce')
    expect(declan).toBeDefined()
    expect(shown).toContainEqual(
      expect.objectContaining({
        code: declan!.code,
        location: state.locations[declan!.location]!.name,
        exhausted: true,
      }),
    )
    expect(shown).toContainEqual(
      expect.objectContaining({ name: 'Jewel of Sarnath', attachedTo: expect.any(String) }),
    )
    const assetFrame = reviewed(reviewed(table(), 'action.advanceAct').state, 'review.gain')
      .frames.flatMap((f) => f.cards)
      .find((c) => c.code === '12017')
    expect(assetFrame?.controlledBy).toBe('A')
  })
  it.each([{}, [{ stage: 'executeScript' }], Array(251).fill({})])(
    'rechaza datos de presentación inválidos',
    (review) => {
      const base = gala()
      const value = session(base, { base, inputs: [], marks: [markOf(base)] }, null)
      expect(() => decodeSession(JSON.stringify({ ...value, advanceReview: review }))).toThrow(
        'invalid',
      )
    },
  )
})
