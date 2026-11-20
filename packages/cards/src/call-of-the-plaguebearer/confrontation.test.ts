import { dispatch, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { CONFRONTATION, confrontation } from './confrontation'
import { D } from './dawn-data'
import { game } from './testing'

// Guía ES p. 20 / EN p. 23: se lee tras Muerte a la puesta de sol (VII).
const END = 'testConfrontationEnd'
function interlude(notes: string[], decision?: string, s0: GameState = game(2)) {
  let s: GameState = dispatch(
    {
      ...s0,
      pending: null,
      queue: [],
      campaignLog: { ...s0.campaignLog!, notes: [...s0.campaignLog!.notes, ...notes] },
    },
    ...confrontation({ type: 'RecordNote', note: END }),
  )
  const bodies: string[] = []
  for (let n = 0; n < 20 && s.pending; n++) {
    const q = s.pending.question
    if (q.story?.body) bodies.push(q.story.body)
    if (q.prompt === 'prompt.plaguebearer.confrontation.decide') s = choose(s, decision!)
    else if (q.prompt === 'prompt.plaguebearer.confrontation.west')
      s = choose(s, 'choice.investigator', { name: s.investigators[0]!.name })
    else s = choose(s, q.choices[0]!.label, q.choices[0]!.params)
  }
  return { s, bodies }
}

describe('Interludio V · La confrontación', () => {
  it('si habéis sido advertidos, solo se lee La confrontación 4', () => {
    const { s, bodies } = interlude([CONFRONTATION.warned])
    expect(bodies).toEqual(['story.plaguebearer.confrontation.section4'])
    expect(s.campaignLog!.notes.at(-1)).toBe(END)
    expect(s.campaignLog!.notes).not.toContain(CONFRONTATION.deathConqueredWest)
  })

  it('no confiar en West: la Muerte conquistó a Herbert West y sale de los mazos', () => {
    const base = game(2)
    const withWest = {
      ...base,
      investigators: base.investigators.map((i, n) =>
        n === 0 ? { ...i, deck: [...i.deck, D.west] } : i,
      ),
    }
    const { s, bodies } = interlude([], 'choice.plaguebearer.confrontation.distrust', withWest)
    expect(bodies).toEqual([
      'story.plaguebearer.confrontation.section1',
      'story.plaguebearer.confrontation.section2',
    ])
    expect(s.campaignLog!.notes).toContain(CONFRONTATION.deathConqueredWest)
    expect(s.investigators.some((i) => i.deck.includes(D.west))).toBe(false)
  })

  it('dejarle ir: Baalshandor golpeó primero y alguien puede incluir a Herbert West', () => {
    const { s, bodies } = interlude([], 'choice.plaguebearer.confrontation.release')
    expect(bodies.at(-1)).toBe('story.plaguebearer.confrontation.section3')
    expect(s.campaignLog!.notes).toContain(CONFRONTATION.baalshandorFirst)
    expect(s.campaignLog!.investigators.a!.storyAssets).toContain(D.west)
  })
})
