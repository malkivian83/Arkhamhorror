// RR: Skill Icons, Committing Cards, Skill Test Results.
import {
  dispatch,
  playerCardBehavior,
  registerTreachery,
  type GameState,
  type SkillTest,
  type SkillTestKind,
} from '@lcg/engine'
import { choose, labels, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import {
  ANDRE,
  andre,
  clear,
  KNOW_THE_EXIT,
  KNOW_THE_LINE,
  KNOW_THE_SCENE,
  makeGame,
  withAndre,
} from './testing'

const test = (kind: SkillTestKind, tags: string[] = []): SkillTest => ({
  investigator: ANDRE,
  skill: 'agility',
  difficulty: 3,
  kind,
  tags,
  baseModifier: 0,
  committed: [],
  tokens: [],
  tokenModifier: 0,
  autoFail: false,
  tokenOnFail: [],
  tokenOnFailBy: [],
  modifiedSkill: null,
  succeeded: null,
})
const effect = (source = 'x'): SkillTestKind => ({
  type: 'effect',
  source,
  onSuccess: [],
  onFail: [],
  onFailEach: [],
})
const fight = test({ type: 'fight', enemy: 'e' })
const evade = test({ type: 'evade', enemy: 'e' })
const investigate = test({ type: 'investigate', location: 'A' })
const scenarioTest = test(effect(), ['scenario'])
const scenarioParley = test(effect(), ['parley', 'scenario'])
const scenarioInvestigate = test(effect(), ['investigate', 'scenario'])
const playerEffect = test(effect())
const playerAttack = test({ type: 'fight', enemy: 'e' }, ['spell'])

describe('Know the Exit, Know the Line and Know the Scene', () => {
  const cases: [string, SkillTest[], SkillTest[]][] = [
    [KNOW_THE_EXIT, [fight, evade, playerAttack], [investigate, scenarioTest]],
    [KNOW_THE_LINE, [scenarioTest, scenarioParley, scenarioInvestigate], [fight, playerEffect]],
    [
      KNOW_THE_SCENE,
      [investigate, scenarioParley, scenarioInvestigate],
      [fight, evade, scenarioTest],
    ],
  ]
  for (const [code, gains, plain] of cases)
    it(`${code} gains [wild][wild] only on its kind of test`, () => {
      const icons = playerCardBehavior(code)!.additionalIcons!
      const s = makeGame()
      for (const t of gains) expect(icons(s, t, ANDRE, 'committed')).toEqual({ wild: 2 })
      for (const t of plain) expect(icons(s, t, ANDRE, 'committed')).toEqual({})
    })

  it('committed to a real attack, Know the Exit adds three icons', () => {
    let s = withAndre(clear(makeGame()), { hand: [KNOW_THE_EXIT] })
    s = dispatch(s, spawnAt('A', undefined, ANDRE))
    const enemy = Object.keys(s.enemies)[0]!
    // Combate 2 + 3 iconos contra 5: tiene éxito por 0.
    s = dispatch(clear(s), {
      type: 'BeginSkillTest',
      investigator: ANDRE,
      skill: 'combat',
      difficulty: 5,
      kind: { type: 'fight', enemy },
    })
    s = choose(s, 'choice.commit')
    expect(s.pending).toBeNull()
    expect(s.log.some((e) => e.key === 'log.testSuccess')).toBe(true)
    expect(andre(s).discard).toContain(KNOW_THE_EXIT)
  })
})

describe('skill tests on a scenario card', () => {
  // Traición de encuentro de prueba: su revelación exige una prueba de Agilidad (3).
  registerTreachery({
    code: 'test-andre-trap',
    revelation: (_s, investigator) => [
      {
        type: 'BeginSkillTest',
        investigator,
        skill: 'agility',
        difficulty: 3,
        kind: effect('Trap'),
      },
    ],
  })
  const open = (s: GameState) => {
    for (let n = 0; n < 5 && s.pending?.question.prompt !== 'prompt.commitCards'; n++)
      s = choose(s, labels(s)[0]!)
    return s
  }

  it('an encounter treachery starts a test on a scenario card', () => {
    const s = dispatch(withAndre(clear(makeGame()), { hand: [KNOW_THE_LINE] }), {
      type: 'ResolveEncounterCard',
      investigator: ANDRE,
      card: { kind: 'treachery', code: 'test-andre-trap', name: 'Trap', keywords: [] },
    })
    expect(open(s).skillTest?.tags).toContain('scenario')
  })

  it("a player weakness's test is not on a scenario card (The Necronomicon)", () => {
    let s = withAndre(clear(makeGame()), { hand: [] })
    s = dispatch(s, { type: 'ResolveWeakness', investigator: ANDRE, code: '12012' })
    s = dispatch(s, { type: 'PlayerWindow', investigator: ANDRE })
    s = choose(s, 'ability.necronomicon')
    expect(s.skillTest?.tags ?? []).not.toContain('scenario')
  })
})
