// RR: Skill Tests ST.3 vs ST.4, Drawing/Returning Tokens, Costs, Per-test Limits, Seal.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  registerPlayerCard,
  registerPlayerCards,
  registerLocation,
  registerTreachery,
  usesLenders,
  type ChaosToken,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { game, patch, withAsset, me } from '../dunwich-pilot/testing'
import { cardName } from './common'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = () => ({
  ...patch({ hand: [], resources: 10 })(clear(game(['a', 'b']))),
  interactive: true,
})
const test: Message = {
  type: 'BeginSkillTest',
  investigator: 'a',
  skill: 'willpower',
  difficulty: 2,
  kind: { type: 'effect', source: 'interaction-test', onSuccess: [], onFail: [], onFailEach: [] },
}
const begin = (s: GameState, message: Message = test) => dispatch(clear(s), message)
const react = (s: GameState, code: string) =>
  choose(s, 'ability.advancedTest', { card: cardName(code) })
const reveal = (s: GameState, token: ChaosToken) =>
  choose({ ...s, chaosBag: [token] }, 'choice.revealToken')

registerPlayerCards([
  {
    code: 'mirror-stage-source',
    name: 'Mirror source',
    type: 'asset',
    class: 'mystic',
    traits: [],
    cost: 0,
    slots: [],
  },
])
registerPlayerCard({
  code: 'mirror-stage-source',
  onTokenRevealed: (_s, _t, a) => [{ type: 'GainResources', investigator: a.owner, amount: 1 }],
})
it('Mirror advances only ST.3: source-token effects wait until after committing', () => {
  let s = withAsset(withAsset(base(), '60406'), 'mirror-stage-source')
  s = react(begin({ ...s, chaosBag: [-2] }, { ...test, source: 'mirror-stage-source' }), '60406')
  expect(s.skillTest!.tokens).toEqual([-2])
  expect(s.skillTest!.tokenModifier).toBe(0)
  expect(me(s).resources).toBe(10)
  s = choose(s, 'choice.revealToken')
  expect(s.skillTest!.tokenModifier).toBe(-2)
  expect(me(s).resources).toBe(11)
  expect(s.skillTest!.tokens).toEqual([-2])
})

it('Seal committed after Mirror treats the held physical token as elder sign and returns only that physical token', () => {
  let s = patch({ hand: ['03312'] })(withAsset(base(), '60406'))
  s = react(begin({ ...s, chaosBag: [-4] }), '60406')
  s = choose(s, 'choice.commit', { card: cardName('03312') })
  s = choose(s, 'choice.revealToken')
  expect(s.skillTest!.tokens).toEqual(['elderSign'])
  s = choose(s, 'choice.applyResults')
  expect(s.chaosBag).toEqual([-4])
  expect(me(s).discard).not.toContain('03312')
})

it('Mirror resumes after JSON serialization without repeating its reveal or losing the held token', () => {
  let s = react(begin({ ...withAsset(base(), '60406'), chaosBag: [-2] }), '60406')
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = choose(s, 'choice.revealToken')
  expect(s.skillTest!.tokens).toEqual([-2])
  expect(s.skillTest!.tokenModifier).toBe(-2)
  s = choose(s, 'choice.applyResults')
  expect(s.chaosBag).toEqual([-2])
})

it('Hit me during Mirror reveals its extra token before committing but resolves both modifiers at ST.4', () => {
  let s = patch({ hand: ['08112'] })(withAsset(base(), '60406'))
  s = react(begin({ ...s, chaosBag: [0] }), '60406')
  s = choose({ ...s, chaosBag: [-2] }, 'ability.playCard', { card: cardName('08112') })
  expect(s.skillTest!.tokens).toEqual([0, -2])
  expect(s.skillTest!.tokenModifier).toBe(0)
  s = choose(s, 'choice.revealToken')
  expect(s.skillTest!.tokens).toEqual([0, -2])
  expect(s.skillTest!.tokenModifier).toBe(2)
})

it('Manuscripts action spends one secret and one action to protect another local investigator', () => {
  let s = withAsset(base(), '04307')
  s = dispatch(s, { type: 'PlayerWindow', investigator: 'a' })
  s = choose(s, 'ability.advancedTest', { card: cardName('04307'), name: 'B' })
  expect(me(s).actionsRemaining).toBe(2)
  expect(s.assets['04307']!.uses).toBe(2)
  expect(s.investigators[1]!.noTokensNextRoundTest).toBe(s.round)
})

registerPlayerCards([
  {
    code: 'advanced-player-revelation',
    name: 'Player revelation',
    type: 'event',
    class: 'mystic',
    cost: 0,
    traits: [],
  },
])
registerPlayerCard({ code: 'advanced-player-revelation', revelation: () => [test] })
registerLocation({ code: 'advanced-location-revelation', revelation: () => [test] })
it.each(['player', 'location'])(
  'Manuscripts also supports a %s card revelation without classifying it as a treachery test',
  (kind) => {
    let s = withAsset(base(), '04307')
    s =
      kind === 'player'
        ? dispatch(patch({ hand: ['advanced-player-revelation'] })(s), {
            type: 'ResolvePlayerRevelation',
            investigator: 'a',
            code: 'advanced-player-revelation',
          })
        : dispatch(s, {
            type: 'PutEncounterLocation',
            investigator: 'a',
            card: {
              code: 'advanced-location-revelation',
              name: 'Encounter location',
              kind: 'location',
              keywords: [],
              shroud: 1,
              clueValue: 0,
              cluesPerInvestigator: false,
              connections: [],
            },
          })
    s = react(s, '04307')
    expect(s.skillTest!.revelation).toBeDefined()
    expect(s.skillTest!.onTreachery).toBeUndefined()
    expect(s.skillTest!.noTokens).toBe(true)
  },
)

it('nested revelations of the same source retain the outer context when the inner one ends', () => {
  const s = dispatch(
    base(),
    { type: 'RevelationContext', treachery: 'same-source' },
    { type: 'RevelationContext', treachery: 'same-source' },
    { type: 'RevelationContext', treachery: 'same-source', end: true },
  )
  expect(s.revelationContexts).toEqual(['same-source'])
})

const peril = {
  code: 'advanced-peril',
  name: 'Advanced Peril',
  kind: 'treachery' as const,
  keywords: ['peril' as const],
}
registerTreachery({ code: peril.code, revelation: () => [test] })
it('Peril blocks other investigators’ new reactions and commitments throughout the revelation', () => {
  let s = withAsset(
    withAsset(withAsset(base(), '04307', { owner: 'b' }), '60406', { owner: 'b' }),
    '11039',
    { owner: 'b' },
  )
  s = patch({ hand: ['07161', '03312'] }, 'b')(s)
  s = dispatch(s, { type: 'ResolveEncounterCard', investigator: 'a', card: peril })
  expect(s.pending!.investigator).toBe('a')
  expect(labels(s)).not.toContain('ability.advancedTest')
  expect(playerCardBehavior('03312')!.canCommit!(s, s.skillTest!, 'b')).toBe(false)
  s = reveal(s, 'skull')
  expect(labels(s)).not.toContain('ability.advancedTest')
  expect(s.assets['11039']).toBeDefined()
})

it('Lucky Dice work outside tests and return all ignored tokens when their final token resolves', () => {
  let s = withAsset(base(), '02230')
  s = dispatch(
    { ...s, chaosBag: [-2] },
    {
      type: 'RevealTokenOutsideTest',
      investigator: 'a',
      then: { type: 'PlayerCardEffect', code: '02230', investigator: 'a', step: 'test' },
    },
  )
  expect(s.tokenReveal!.face).toBe(-2)
  s = react({ ...s, chaosBag: [0] }, '02230')
  s = choose(s, 'choice.skip')
  expect(s.chaosBag.map(String).sort()).toEqual(['-2', '0'])
  expect(me(s).resources).toBe(8)
})

it('Uncanny Specimen is offered for another local investigator, but never for autofail or a remote test', () => {
  let s = withAsset(base(), '11039', { owner: 'b' })
  s = reveal(begin(s), 'skull')
  expect(labels(s)).toContain('ability.advancedTest')
  const b = playerCardBehavior('11039')!
  expect(
    b.reactions!(
      patch({ location: 'B' }, 'b')(s),
      { type: 'whenRevealChaosToken', investigator: 'a', token: 'skull' },
      s.assets['11039']!,
    ),
  ).toEqual([])
  const failed = {
    ...s,
    skillTest: {
      ...s.skillTest!,
      revealing: { token: 'autoFail' as const, face: 'autoFail' as const },
    },
  }
  expect(
    b.reactions!(
      failed,
      { type: 'whenRevealChaosToken', investigator: 'a', token: 'autoFail' },
      s.assets['11039']!,
    ),
  ).toEqual([])
})

it('Oculus credits cancellation to its controller when another investigator performs the test', () => {
  let s = withAsset(withAsset(base(), '11039', { owner: 'b' }), '11038', { owner: 'b' })
  s = reveal(begin(s), 'skull')
  s = react({ ...s, chaosBag: [0, 0, 0] }, '11039')
  expect(s.pending?.investigator).toBe('b')
  s = react(s, '11038')
  expect(s.assets['11038']!.uses).toBe(1)
  expect(s.assets['11038']!.exhausted).toBe(true)
})

it.each(['04307', '60406'])('%s excludes distant tests and unavailable uses', (code) => {
  const s = begin(withAsset(base(), code, { uses: 0 }))
  const b = playerCardBehavior(code)!
  expect(
    b.reactions!(s, { type: 'afterSkillTestInitiated', investigator: 'a' }, s.assets[code]!),
  ).toEqual([])
  expect(
    b.reactions!(
      patch({ location: 'B' })(s),
      { type: 'afterSkillTestInitiated', investigator: 'a' },
      { ...s.assets[code]!, owner: 'b', uses: 3 },
    ),
  ).toEqual([])
})

it('Cleaning Kit excludes charge/secret assets and assets controlled by other investigators', () => {
  let s = withAsset(withAsset(base(), '10020'), '01060')
  s = withAsset(withAsset(s, '60272'), '01016', { owner: 'b' })
  for (const code of ['01060', '60272', '01016'])
    expect(usesLenders(s, s.assets[code]!)).toEqual([])
})

it('Eat lead and Grotesque Statue declare their nested replacement before drawing and choose one of all three tokens', () => {
  let s = patch({ hand: ['03304'] })(withAsset(withAsset(base(), '01016'), '01071'))
  s = begin(s, {
    ...test,
    skill: 'combat',
    source: '01016',
    kind: { type: 'fight', enemy: 'absent' },
  })
  s = choose(s, 'ability.playCard', { card: cardName('03304') })
  s = choose(s, 'choice.advancedExtraAmmo', { n: 1 })
  s = choose(s, 'ability.tokenRevealReplace', { card: cardName('01071') })
  expect(s.skillTest!.tokens).toEqual([])
  s = choose(s, 'choice.advancedReplaceReveal', { n: 1 })
  expect(s.nextTokenReplacement!.nested).toBeDefined()
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = choose({ ...s, chaosBag: [-4, -3, 0] }, 'choice.revealToken')
  while (s.pending?.question.prompt === 'prompt.chooseRevealedToken') {
    const values = s.pending.question.choices.map((c) => Number(c.params!.token))
    s = choose(s, 'choice.resolveToken', { token: String(Math.max(...values)) })
  }
  expect(s.skillTest!.tokens).toEqual([0])
  expect(s.skillTest!.ignoredTokens!.map(String).sort()).toEqual(['-3', '-4'])
  expect(s.assets['01071']!.uses).toBe(3)
  expect(s.assets['01016']!.uses).toBe(3)
})

it('a nested token preference restricts its own group without restricting the outer choice', () => {
  let s = begin(base())
  s = dispatch(
    { ...clear(s), chaosBag: [] },
    {
      type: 'ChooseTokenRevealTree',
      investigator: 'a',
      tree: {
        children: [
          { children: [{ token: -3 }, { token: 'skull' }], ignored: [], prefer: ['skull'] },
          { token: 0 },
        ],
        ignored: [],
      },
    },
  )
  s = choose(s, 'choice.resolveToken', { token: '0' })
  expect(s.skillTest!.tokens).toEqual([0])
  expect(s.skillTest!.ignoredTokens!.map(String).sort()).toEqual(['-3', 'skull'])
})
