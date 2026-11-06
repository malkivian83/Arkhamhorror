import { dispatch, type GameState } from '@lcg/engine'
import { choose, withBag } from '@lcg/engine/testing'
import { effectTest } from '../scenario-helpers'
import { emit } from './testing'
import { describe, expect, it } from 'vitest'
import { C } from './helpers'
import { D } from './dawn-data'
import { dawnGame } from './dawn-testing'

const resolve = (state: GameState, n: number, answers: string[] = []) => {
  let s = dispatch(
    { ...state, pending: null, queue: [] },
    { type: 'EndScenario', outcome: { type: 'resolution', resolution: n } },
  )
  const queue = [...answers]
  const bodies: string[] = []
  for (let k = 0; k < 40 && s.pending; k++) {
    const q = s.pending.question
    if (q.story?.body) bodies.push(q.story.body)
    const wanted = q.choices.findIndex((c) => c.label === queue[0])
    if (wanted >= 0) queue.shift()
    s = choose(s, q.choices[Math.max(0, wanted)]!.label)
  }
  return { s, bodies }
}
const assets = (s: GameState, id = 'a') => s.campaignLog!.investigators[id]!.storyAssets

// Guía ES p. 9 / EN pp. 10–11.
describe('Interludio II · Vivo o muerto', () => {
  it('sin respeto y con West llevado a la fuerza: secciones 2 y 8, y elección individual', () => {
    const { s, bodies } = resolve(dawnGame(), 3, ['choice.plaguebearer.alive.good8'])
    const sections = bodies.filter((b) => b.startsWith('story.plaguebearer.alive.section'))
    expect(sections).toEqual([
      'story.plaguebearer.alive.section2',
      'story.plaguebearer.alive.section8',
    ])
    expect(assets(s)).toEqual(expect.arrayContaining([D.will, D.folly]))
    expect(assets(s)).not.toContain(D.strength)
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 3 })
  })
  it('con respeto y West libre: 1, 4, 6 y 7; entregar el maletín permite añadir a West', () => {
    let g = dawnGame({ notes: ['plaguebearerRespect'], storyAssets: { a: [C.briefcase] } })
    const { s, bodies } = resolve(g, 2, [
      'choice.plaguebearer.alive.handOver',
      'choice.plaguebearer.alive.west',
      'choice.plaguebearer.alive.perks',
    ])
    expect(bodies.filter((b) => /alive\.section/.test(b))).toEqual(
      ['1', '4', '6', '7'].map((n) => `story.plaguebearer.alive.section${n}`),
    )
    expect(assets(s)).not.toContain(C.briefcase)
    expect(assets(s)).toEqual(expect.arrayContaining([D.west, D.strength, D.deathsHold]))
    expect(s.campaignLog?.notes).toContain('plaguebearerWestReagent')
    g = dawnGame({ storyAssets: { a: [C.briefcase] } })
    const hidden = resolve(g, 4, ['choice.plaguebearer.alive.hide'])
    expect(hidden.bodies.filter((b) => /alive\.section/.test(b))).toEqual(
      ['2', '5', '6', '7'].map((n) => `story.plaguebearer.alive.section${n}`),
    )
    expect(hidden.s.campaignLog?.notes).toContain('plaguebearerHidBriefcase')
    expect(assets(hidden.s)).toContain(C.briefcase)
  })
  it('quien se inyectó un reactivo puro debe aceptar ser Reanimado', () => {
    const g = dawnGame({ values: { plaguebearerReagent: JSON.stringify(['a']) } })
    const { s } = resolve(g, 3)
    expect(assets(s)).toEqual(expect.arrayContaining([D.strength, D.deathsHold]))
    expect(assets(s)).not.toContain(D.will)
  })
  it('La Fuerza de la Carne cura todo su daño tras tener éxito revelando una calavera', () => {
    let s = emit(dawnGame(), { type: 'PutAssetIntoPlay', investigator: 'a', code: D.strength })
    const id = Object.values(s.assets).find((a) => a.code === D.strength)!.id
    s = { ...s, assets: { ...s.assets, [id]: { ...s.assets[id]!, damage: 2 } } }
    s = withBag('skull')(s)
    s = dispatch({ ...s, pending: null, queue: [] }, effectTest('a', 'test', 'willpower', 0, {}))
    for (let k = 0; k < 10 && s.pending; k++) {
      const labels = s.pending.question.choices.map((c) => c.label)
      if (labels.includes('ability.plaguebearer.alive.damage')) {
        s = choose(s, 'ability.plaguebearer.alive.damage')
        break
      }
      s = choose(s, labels.includes('choice.revealToken') ? 'choice.revealToken' : labels[0]!)
    }
    for (let k = 0; k < 10 && s.pending; k++) s = choose(s, s.pending.question.choices[0]!.label)
    expect(s.assets[id]!.damage).toBe(0)
    expect(s.assets[id]!.exhausted).toBe(true)
  })
})
