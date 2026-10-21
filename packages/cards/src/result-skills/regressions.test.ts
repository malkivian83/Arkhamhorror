// RR: Skill Tests, Search, Drawing Cards, Uses, Ready, Heal, Automatic Success/Failure.
import {
  allPlayerCardDefs,
  dispatch,
  investigatorBehavior,
  playerCardDef,
  registerPlayerCard,
  type GameState,
  type SkillTestKind,
  type SkillType,
} from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const effect: SkillTestKind = {
  type: 'effect',
  source: 'result-test',
  onSuccess: [],
  onFail: [],
  onFailEach: [],
}
const open = (
  code: string,
  modify: (s: GameState) => GameState = (s) => s,
  kind: SkillTestKind = effect,
  skill: SkillType = 'willpower',
  difficulty = 1,
) =>
  during(game(), (s) => modify(patch({ hand: [code] })(s)), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty,
    kind,
  })
const commit = (s: GameState) => choose(s, 'choice.commit')
registerPlayerCard({
  code: 'result-draw-observer',
  forced: (_s, t, a) =>
    t.type === 'afterDrawCard' && t.investigator === a.owner
      ? [{ type: 'GainResources', investigator: a.owner, amount: 1 }]
      : [],
})

registerPlayerCard({
  code: 'result-evade-observer',
  forced: (_s, t, a) =>
    t.type === 'afterEvade' ? [{ type: 'GainResources', investigator: a.owner, amount: 1 }] : [],
})
it('includes Vicious Blow in attack damage before defeat effects and Stunning Blow', () => {
  let s = during(
    game(),
    (s) => withAsset(patch({ hand: ['04112', '12025'], resources: 0 })(s), 'result-evade-observer'),
    spawnAt('A', { ...ghoul, health: 2 }, 'a'),
  )
  const enemy = Object.values(s.enemies)[0]!
  s = during(s, (s) => s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty: 1,
    kind: {
      type: 'fight',
      enemy: enemy.id,
      extraDamage: 0,
      onDefeat: [{ type: 'GainResources', investigator: 'a', amount: 5 }],
    },
  })
  s = choose(s, 'choice.commit', { card: playerCardDef('04112')!.name })
  s = choose(s, 'choice.commit', { card: playerCardDef('12025')!.name })
  expect(Object.keys(s.enemies)).toHaveLength(0)
  expect(me(s).resources).toBe(5)
})

it('does not add Vicious Blow damage to a failed attack hitting another investigator', () => {
  let s = during(game(['a', 'b']), patch({ hand: ['12025'] }), spawnAt('A', ghoul, 'b'))
  const enemy = Object.values(s.enemies)[0]!
  s = during(s, (s) => s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty: 99,
    kind: { type: 'fight', enemy: enemy.id, extraDamage: 1 },
  })
  s = choose(s, 'choice.commit')
  expect(s.investigators[1]!.damage).toBe(2)
})

it('Eureka searches only the top three, excludes weaknesses and actually draws its selected card', () => {
  const weakness = allPlayerCardDefs().find((d) => !!d.weakness)!.code
  let s = open('03231', (s) =>
    withAsset(
      patch({ resources: 0, deck: [weakness, '01072', '01075', '60171'] })(s),
      'result-draw-observer',
    ),
  )
  s = commit(s)
  const names = s.pending!.question.choices.map((c) => c.params?.card)
  expect(names).not.toContain(playerCardDef(weakness)!.name)
  expect(names).not.toContain(playerCardDef('60171')!.name)
  s = choose(s, 'choice.takeCard', { card: playerCardDef('01075')!.name })
  expect(me(s).hand).toContain('01075')
  expect(me(s).resources).toBe(1)
  expect(me(s).deck).toEqual(expect.arrayContaining([weakness, '01072', '60171']))
})

it('Inspiring Presence offers horror healing separately from damage healing', () => {
  const ally = allPlayerCardDefs().find(
    (d) =>
      d.type === 'asset' && d.traits.includes('Ally') && (d.health ?? 0) > 1 && (d.sanity ?? 0) > 1,
  )!
  let s = open('03228', (s) => withAsset(s, ally.code, { damage: 1, horror: 1, exhausted: true }))
  s = choose(commit(s), 'choice.resultAllyHorror')
  expect(s.assets[ally.code]).toMatchObject({ damage: 1, horror: 0, exhausted: false })
})

it('readies and heals a face-up placed Ally at the committer location', () => {
  const ally = allPlayerCardDefs().find(
    (d) =>
      d.type === 'asset' && d.traits.includes('Ally') && (d.health ?? 0) > 1 && (d.sanity ?? 0) > 1,
  )!
  const s = commit(
    open('11029', (s) => ({
      ...s,
      placedAssets: {
        ally: {
          id: 'ally',
          code: ally.code,
          name: ally.name,
          placement: { type: 'location', location: 'A' },
          exhausted: true,
          damage: 1,
          horror: 1,
        },
      },
    })),
  )
  expect(s.placedAssets!.ally).toMatchObject({ exhausted: false, damage: 0, horror: 0 })
})

it('does not select a distant or face-down Ally', () => {
  const ally = allPlayerCardDefs().find((d) => d.type === 'asset' && d.traits.includes('Ally'))!
  const s = commit(
    open('11029', (s) => ({
      ...s,
      placedAssets: {
        remote: {
          id: 'remote',
          code: ally.code,
          name: ally.name,
          placement: { type: 'location', location: 'B' },
          exhausted: true,
          damage: 0,
          horror: 0,
        },
        hidden: {
          id: 'hidden',
          code: ally.code,
          name: ally.name,
          placement: { type: 'location', location: 'A' },
          exhausted: true,
          damage: 0,
          horror: 0,
          faceDown: true,
        },
      },
    })),
  )
  expect(s.placedAssets!.remote!.exhausted).toBe(true)
  expect(s.placedAssets!.hidden!.exhausted).toBe(true)
})

it('Enraptured accepts secrets but neither ammo nor another investigator’s asset', () => {
  const secret = allPlayerCardDefs().find((d) =>
    ['secret', 'secrets'].includes(d.uses?.type ?? ''),
  )!
  let s = open(
    '04157',
    (s) =>
      withAsset(
        withAsset(withAsset(s, secret.code, { id: 'secret', uses: 0 }), secret.code, {
          id: 'other',
          owner: 'b',
          uses: 0,
        }),
        '60171',
        { id: 'ammo', uses: 0 },
      ),
    { type: 'investigate', location: 'A' },
    'intellect',
  )
  s = commit(s)
  expect(s.assets.secret!.uses).toBe(1)
  expect(s.assets.other!.uses).toBe(0)
  expect(s.assets.ammo!.uses).toBe(0)
})

it('does not add uses when the successful test is not an investigation', () => {
  const secret = allPlayerCardDefs().find((d) =>
    ['secret', 'secrets'].includes(d.uses?.type ?? ''),
  )!
  const s = commit(
    open('04157', (s) => withAsset(s, secret.code, { uses: 0 }), effect, 'intellect'),
  )
  expect(s.assets[secret.code]!.uses).toBe(0)
})

it('Stunning Blow safely skips an enemy already defeated by the attack', () => {
  let s = during(game(), patch({ hand: ['04112'] }), spawnAt('A', { ...ghoul, health: 1 }, 'a'))
  const enemy = Object.values(s.enemies)[0]!
  s = during(s, (s) => s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty: 1,
    kind: { type: 'fight', enemy: enemy.id, extraDamage: 0 },
  })
  s = commit(s)
  expect(Object.keys(s.enemies)).toHaveLength(0)
})

for (const skill of ['willpower', 'intellect', 'combat', 'agility'] as const)
  it('commits iconless Take Heart to ' + skill + ' with a shared single-copy limit', () => {
    const s = open('04201', patch({ hand: ['04201', '04201'] }), effect, skill, 99)
    const one = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'CommitCard', investigator: 'a', code: '04201' },
    )
    const two = dispatch(one, { type: 'CommitCard', investigator: 'a', code: '04201' })
    expect(two.skillTest!.committed).toHaveLength(1)
    expect(me(two).hand).toContain('04201')
    const options = investigatorBehavior('12013')!.testOptions!(
      patch({ discard: ['04201'] })(two),
      two.skillTest!,
      me(two),
    )
    expect(options).toEqual([])
  })

it('Isabelle can offer Take Heart from the discard pile without matching icons', () => {
  const s = open('04201', patch({ discard: ['04201'] }), effect, 'combat', 99)
  const options = investigatorBehavior('12013')!.testOptions!(s, s.skillTest!, me(s))
  expect(options.some((o) => o.params?.card === playerCardDef('04201')!.name)).toBe(true)
})
