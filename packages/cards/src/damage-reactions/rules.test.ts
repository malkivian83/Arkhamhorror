// RR: Enemy Attacks, Dealing Damage/Horror, Defeat, Triggered Abilities.
import { expect, it } from 'vitest'
import {
  dispatch,
  effectiveVitals,
  registerScenario,
  skillTestValue,
  type GameState,
} from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import './index'

const start = (code: string): GameState => withAsset({ ...game(), queue: [], pending: null }, code)
function attack(code: string, includeOther = true, scenarioId?: string): GameState {
  const s = start(code)
  const foe = {
    ...ghoul,
    id: 'foe',
    location: 'A',
    engagedWith: 'a',
    exhausted: false,
    damageTaken: 0,
    maxHealth: 4,
    doom: 0,
    damage: 2,
    horror: 1,
  }
  return dispatch(
    {
      ...s,
      ...(scenarioId ? { scenarioId } : {}),
      enemies: {
        foe,
        ...(includeOther
          ? { other: { ...foe, id: 'other', engagedWith: null, maxHealth: 3 } }
          : {}),
      },
    },
    { type: 'EnemyAttack', enemy: 'foe', investigator: 'a', exhaustAfter: false },
  )
}

it.each([
  ['01082', 'other'],
  ['02308', 'foe'],
] as const)('Aquinnah %s sends the damage to %s and leaves the attack horror', (code, id) => {
  const s = attack(code)
  const options = s.pending!.question.choices.filter((c) => c.label === 'ability.aquinnahRedirect')
  expect(options.map((c) => (c.target?.type === 'enemy' ? c.target.id : undefined))).toEqual(
    code === '01082' ? ['other'] : ['foe', 'other'],
  )
  const reacted = choose(s, 'ability.aquinnahRedirect', { enemy: s.enemies[id]!.name })
  const resolved = choose(reacted, 'choice.assignToInvestigator')
  expect(resolved.enemies[id]?.damageTaken).toBe(2)
  expect(me(resolved)).toMatchObject({ damage: 0, horror: 1 })
  expect(resolved.assets[code]).toMatchObject({ exhausted: true, horror: 1 })
})

it('Aquinnah redirects the modified damage and credits its defeat to her controller', () => {
  registerScenario({
    id: 'aquinnah-credit',
    enemyDamageModifier: () => 1,
    forced: (_s, t) =>
      t.type === 'enemyDefeated' && t.by
        ? [{ type: 'SetScenarioMeta', key: 'defeatedBy', value: t.by }]
        : [],
  })
  const pending = attack('01082', true, 'aquinnah-credit')
  const reacted = choose(pending, 'ability.aquinnahRedirect')
  const s = choose(reacted, 'choice.assignToInvestigator')
  expect(s.enemies.other).toBeUndefined()
  expect(s.scenarioMeta?.defeatedBy).toBe('a')
})

it('level 1 Aquinnah cannot redirect a lone attacker’s damage back to itself', () => {
  const s = attack('01082', false)
  expect(s.pending?.question.prompt).toBe('prompt.assignDamage')
  expect(s.enemies.foe?.damageTaken).toBe(0)
})

it('the Key reduces sanity, increases both skills, and can avert defeat by horror', () => {
  const code = '03269'
  const initial = start(code)
  const sanity = effectiveVitals(initial, me(initial)).sanity
  expect(sanity).toBe(me(initial).sanity - 2)
  for (const skill of ['willpower', 'intellect'] as const) {
    const s = dispatch(
      { ...initial, interactive: true },
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill,
        difficulty: 3,
        kind: { type: 'effect', source: code, onSuccess: [], onFail: [], onFailEach: [] },
      },
    )
    expect(skillTestValue(s).total).toBe(me(initial).skills[skill] + 1)
  }
  let s = dispatch(patch({ horror: sanity - 1 })(initial), {
    type: 'TakeDamage',
    investigator: 'a',
    damage: 0,
    horror: 1,
    direct: true,
  })
  s = choose(s, 'ability.hubertKey')
  expect(me(s)).toMatchObject({ eliminated: false, horror: sanity - 2 })
  expect(s.assets[code]).toBeUndefined()
  expect(me(s).discard).toContain(code)
  expect(effectiveVitals(s, me(s)).sanity).toBe(me(s).sanity)
})

it('the Key does not prevent defeat when the same effect also deals lethal damage', () => {
  const initial = start('03269')
  const { health, sanity } = effectiveVitals(initial, me(initial))
  const fatal = dispatch(patch({ damage: health - 1, horror: sanity - 1 })(initial), {
    type: 'TakeDamage',
    investigator: 'a',
    damage: 1,
    horror: 1,
    direct: true,
  })
  const s = choose(fatal, 'ability.hubertKey')
  expect(me(s).eliminated).toBe(true)
  expect(me(s).damage).toBe(health)
})

it('Armor of Ardennes exhausts to cancel only one point assigned to it', () => {
  const code = '03305'
  const initial = start(code)
  let s = dispatch(initial, { type: 'TakeDamage', investigator: 'a', damage: 2, horror: 0 })
  s = choose(s, 'choice.assignToAsset')
  s = choose(s, 'ability.ardennesArmor')
  s = choose(s, 'choice.assignToAsset')
  expect(s.assets[code]).toMatchObject({ exhausted: true, damage: 1 })
  expect(me(s).damage).toBe(0)

  const direct = dispatch(initial, { type: 'DamageAsset', asset: code, damage: 1, horror: 0 })
  expect(direct.assets[code]).toMatchObject({ exhausted: false, damage: 1 })
})
