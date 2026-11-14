import { dispatch, playerCardDef, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { HISTORY_QUESTIONS, historyLesson } from './history-lesson'
import { game } from './testing'

// Guía ES p. 15 / EN p. 18: se lee tras cualquier resolución de Descenso al mediodía.
const END = 'testHistoryLessonEnd'
function lesson(players: number, questions: (keyof typeof HISTORY_QUESTIONS)[]) {
  let s: GameState = dispatch(
    { ...game(players), pending: null, queue: [] },
    ...historyLesson({ type: 'RecordNote', note: END }),
  )
  const bodies: string[] = []
  const prompts: string[][] = []
  const pending = [...questions]
  for (let n = 0; n < 30 && s.pending; n++) {
    const q = s.pending.question
    if (q.story?.body) bodies.push(q.story.body)
    if (q.prompt.startsWith('prompt.plaguebearer.history')) {
      prompts.push(q.choices.map((choice) => choice.label))
      const next = pending.shift()
      s = choose(
        s,
        next ? `choice.plaguebearer.history.${next}` : 'choice.plaguebearer.history.enough',
      )
    } else s = choose(s, q.choices[0]!.label)
  }
  return { s, bodies, prompts }
}
const weaknesses = (s: GameState, id: string) =>
  s.campaignLog!.investigators[id]!.storyAssets.filter(
    (code) => playerCardDef(code)?.weakness === 'basicweakness',
  )

describe('Interludio IV · Lección de historia', () => {
  it('a single question is free: one note, no weaknesses, then History Lesson 2', () => {
    const { s, bodies, prompts } = lesson(2, ['first'])
    expect(prompts[0]).not.toContain('choice.plaguebearer.history.enough')
    expect(prompts[1]).toContain('choice.plaguebearer.history.enough')
    expect(bodies).toEqual([
      'story.plaguebearer.history.lesson1',
      'story.plaguebearer.history.first',
      'story.plaguebearer.history.lesson2',
    ])
    expect(s.campaignLog!.notes).toEqual(expect.arrayContaining([HISTORY_QUESTIONS.first, END]))
    expect(s.campaignLog!.notes).not.toContain(HISTORY_QUESTIONS.portals)
    for (const id of ['a', 'b']) expect(weaknesses(s, id)).toEqual([])
  })

  it('each box after the first adds a random basic Madness or Pact weakness to every deck', () => {
    const { s, prompts } = lesson(2, ['portals', 'baalshandor', 'first'])
    expect(prompts).toHaveLength(3)
    expect(s.campaignLog!.notes).toEqual(expect.arrayContaining(Object.values(HISTORY_QUESTIONS)))
    for (const id of ['a', 'b']) {
      const added = weaknesses(s, id)
      expect(added).toHaveLength(2)
      for (const code of added)
        expect(playerCardDef(code)!.traits.some((t) => t === 'Madness' || t === 'Pact')).toBe(true)
    }
    expect(s.campaignLog!.notes.at(-1)).toBe(END)
  })
})
