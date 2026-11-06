import {
  applyInput,
  dispatch,
  skillValueFor,
  type GameState,
  type SkillTestKind,
} from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { CURIOSITY } from './friends-in-low-places'
import { HIBBS, N } from './night-data'
import { nightGame } from './night-testing'
import { emit, settle } from './testing'

const defend = (s: GameState, ids: string[]): GameState => ({
  ...s,
  locations: Object.fromEntries(
    Object.entries(s.locations).map(([id, l]) => [
      id,
      { ...l, ...(ids.includes(id) ? { resources: 1 } : {}) },
    ]),
  ),
})
const withNotes = (s: GameState, ...notes: string[]): GameState => ({
  ...s,
  campaignLog: { ...s.campaignLog!, notes: [...s.campaignLog!.notes, ...notes] },
})
const end = (s: GameState) =>
  settle(
    dispatch(
      { ...s, pending: null, queue: [] },
      {
        type: 'EndScenario',
        outcome: { type: 'noResolution' },
      },
    ),
  )
const story = (s: GameState) => s.pending?.question.story?.body

// Guía ES p. 6 / EN p. 6: Interludio I, al final del escenario II.
describe('Interludio I · Amigos en los bajos fondos', () => {
  it('con Hibb cubriendo y el secreto del Motel, un investigador añade a Hibb y entra un sectario', () => {
    let s = withNotes(defend(nightGame(2), [HIBBS, '78024', '78025']), 'plaguebearerMotel')
    const bag = s.campaignLog!.chaosTokens.length
    s = dispatch(
      { ...s, pending: null, queue: [] },
      {
        type: 'EndScenario',
        outcome: { type: 'noResolution' },
      },
    )
    for (let n = 0; n < 10 && story(s) !== 'story.plaguebearer.friends.section2'; n++)
      s = choose(s, s.pending!.question.choices[0]!.label)
    expect(story(s)).toBe('story.plaguebearer.friends.section2')
    expect(s.campaignLog?.notes).toContain('plaguebearerHibbsHelping')
    expect(s.pending!.question.choices.map((c) => c.params?.name ?? c.label)).toHaveLength(3)
    s = applyInput(s, { investigator: s.pending!.investigator, choice: 1 })
    expect(s.campaignLog?.investigators.b?.storyAssets).toContain(N.hibbs)
    expect(s.campaignLog?.investigators.a?.storyAssets).not.toContain(N.hibbs)
    expect(s.campaignLog!.chaosTokens.slice(bag)).toEqual(['cultist'])
  })
  it('sin el secreto del Motel, Hibb vuelve al Motel y entra una calavera', () => {
    const s = end(defend(nightGame(), [HIBBS, '78024', '78025']))
    expect(s.campaignLog?.notes).toContain('plaguebearerHibbsHelping')
    expect(s.campaignLog?.chaosTokens.at(-1)).toBe('skull')
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(s.campaignLog?.investigators.a?.storyAssets).not.toContain(N.hibbs)
  })
  it('sin Hibb ni Arkham unida, se recibe un regalo envenenado y una tablilla', () => {
    const s = end(defend(nightGame(), ['78024', '78025']))
    expect(s.campaignLog?.notes).toContain('plaguebearerTwistedGift')
    expect(s.campaignLog?.notes).not.toContain('plaguebearerHibbsHelping')
    expect(s.campaignLog?.chaosTokens.at(-1)).toBe('tablet')
  })
  it('R2 (Arkham unida) también lleva a la ruta de Hibb', () => {
    const s = end(defend(nightGame(), Object.keys(nightGame().locations)))
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(s.campaignLog?.notes).toContain('plaguebearerHibbsHelping')
  })
  it('solo quien lee el texto oculto anota su lectura para el escenario III', () => {
    let s = defend(nightGame(2), ['78024'])
    s = dispatch(
      { ...s, pending: null, queue: [] },
      {
        type: 'EndScenario',
        outcome: { type: 'noResolution' },
      },
    )
    for (let n = 0; n < 10 && s.pending?.question.prompt === 'prompt.story'; n++)
      s = choose(s, s.pending.question.choices[0]!.label)
    expect(s.pending?.question.prompt).toBe('prompt.plaguebearer.friendsHidden')
    expect(s.pending?.investigator).toBe('a')
    s = choose(s, 'choice.skip')
    expect(s.pending?.investigator).toBe('b')
    s = choose(s, 'choice.plaguebearer.friends.read')
    expect(story(s)).toBe('story.plaguebearer.friends.hiddenGift')
    s = settle(choose(s, 'choice.continue'))
    expect(JSON.parse(s.campaignLog!.values[CURIOSITY]!)).toEqual(['b'])
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
  })
  it('Hibb (Listo para ayudar) da +1 a voluntad y agilidad, no a combate', () => {
    const s = emit(nightGame(), { type: 'PutAssetIntoPlay', investigator: 'a', code: N.hibbs })
    const kind = {
      type: 'effect',
      source: 'test',
      onSuccess: [],
      onFail: [],
      onFailEach: [],
    } satisfies SkillTestKind
    const value = (skill: 'willpower' | 'combat' | 'agility') => skillValueFor(s, 'a', skill, kind)
    const base = s.investigators[0]!.skills
    expect(value('willpower')).toBe(base.willpower + 1)
    expect(value('agility')).toBe(base.agility + 1)
    expect(value('combat')).toBe(base.combat)
  })
})
