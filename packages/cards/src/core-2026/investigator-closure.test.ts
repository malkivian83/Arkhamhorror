import { applyInput, createGame, type GameState } from '@lcg/engine'
import { choose, during, ghoul, labels, testInvestigator, testScenario } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { DR_ARMITAGE } from '../brethren-of-ash/spreading-flames'
import { cardPool } from '../decks'
import { code } from './player-cards'
import '../index'

function game(id: string) {
  return createGame({
    seed: 13,
    scenario: testScenario({ chaosBag: ['elderSign'] }),
    investigators: [testInvestigator(id, { deck: Array(20).fill(code(89)) })],
  })
}
function resolve(g: GameState, prefer: string[] = []) {
  for (let n = 0; g.pending && g.pending.question.prompt !== 'prompt.chooseAction' && n < 50; n++) {
    const choices = g.pending.question.choices
    const preferred = choices.findIndex((c) => prefer.includes(c.label))
    const skip = choices.findIndex((c) => c.label === 'choice.skip')
    g = applyInput(g, {
      investigator: g.pending.investigator,
      choice: preferred >= 0 ? preferred : Math.max(0, skip),
    })
  }
  return g
}
describe('cierre: efecto completo de los cinco signos arcanos', () => {
  for (const position of [1, 4, 7, 10, 13])
    it(code(position), () => {
      const id = code(position)
      let g = during(
        game(id),
        (s) => ({
          ...s,
          investigators: s.investigators.map((i) => ({ ...i, horror: 2, hand: [] })),
        }),
        { type: 'SpawnEnemy', card: { ...ghoul, health: 8 }, location: 'A', engageWith: id },
        ...(position === 10
          ? [{ type: 'PutAssetIntoPlay', investigator: id, code: code(20) } as const]
          : []),
      )
      g = resolve(g)
      const before = g.investigators[0]!
      g = resolve(
        during(g, (s) => s, {
          type: 'BeginSkillTest',
          investigator: id,
          skill: 'intellect',
          difficulty: 1,
          kind: { type: 'investigate', location: 'A' },
        }),
        ['choice.disengageAndMove', 'choice.returnToHand', 'action.move'],
      )
      const after = g.investigators[0]!
      if (position === 1) expect(Object.values(g.enemies)[0]!.damageTaken).toBe(1)
      if (position === 4) {
        expect(after.resources).toBe(before.resources + 1)
        expect(after.hand.length).toBe(before.hand.length + 1)
      }
      if (position === 7) {
        expect(after.location).toBe('B')
        expect(Object.values(g.enemies)[0]!.engagedWith).toBeNull()
      }
      if (position === 10) {
        expect(after.hand).toContain(code(20))
        expect(Object.values(g.assets)).toHaveLength(0)
      }
      if (position === 13) expect(after.horror).toBe(1)
    })
})

describe('cierre: reacciones y límites de los investigadores', () => {
  for (const mode of ['play', 'return'])
    it(`Dexter: ${mode} paga el coste correcto y respeta el límite por ronda`, () => {
      const id = code(10)
      let g = during(
        game(id),
        (s) => ({
          ...s,
          investigators: s.investigators.map((i) => ({
            ...i,
            resources: 5,
            hand: mode === 'play' ? [code(20), code(88)] : [code(88)],
          })),
        }),
        ...(mode === 'return'
          ? [{ type: 'PutAssetIntoPlay', investigator: id, code: code(20) } as const]
          : []),
      )
      g = choose(g, 'action.play', { card: mode === 'play' ? 'Machete' : 'Hand-Crank Flashlight' })
      g = choose(g, mode === 'play' ? 'ability.dexterPlay' : 'ability.dexterReturn')
      g = resolve(g)
      expect(g.investigators[0]!.actionsRemaining).toBe(2)
      expect(g.investigators[0]!.resources).toBe(mode === 'play' ? 1 : 4)
      expect(g.abilityUses.filter((use) => use.key === 'dexter')).toHaveLength(1)
      if (mode === 'return') expect(g.investigators[0]!.hand).toContain(code(20))
      else expect(Object.values(g.assets)).toHaveLength(2)
      g = during(g, (s) => s, {
        type: 'Forced',
        trigger: { type: 'afterPlayAsset', investigator: id, code: code(88) },
      })
      expect(g.pending?.question.prompt).toBe('prompt.chooseAction')
    })
  it('Daniela puede usar el ataque pesado de Sledgehammer al reaccionar', () => {
    const id = code(1)
    let g = during(
      game(id),
      (s) => ({ ...s, chaosBag: [0] }),
      { type: 'SpawnEnemy', card: { ...ghoul, health: 20 }, location: 'A', engageWith: id },
      { type: 'PutAssetIntoPlay', investigator: id, code: code(28) },
    )
    const enemy = Object.keys(g.enemies)[0]!
    g = during(g, (s) => s, { type: 'EnemyAttack', enemy, investigator: id, exhaustAfter: false })
    expect(labels(g)).toContain('ability.heavyFightWith')
    g = choose(g, 'ability.heavyFightWith')
    g = resolve(g)
    expect(g.investigators[0]!.actionsRemaining).toBe(3)
    g = during(g, (s) => s, { type: 'EnemyAttack', enemy, investigator: id, exhaustAfter: false })
    expect(g.pending?.question.prompt).toBe('prompt.chooseAction')
    expect(g.abilityUses.filter((use) => use.key === 'daniela')).toHaveLength(1)
  })
  it('Esquivo se resuelve antes de las reacciones; Daniela todavía puede atacar al enemigo que huyó', () => {
    const id = code(1)
    let g = during(game(id), (s) => ({ ...s, chaosBag: [0] }), {
      type: 'SpawnEnemy',
      card: { ...ghoul, health: 8, keywords: ['elusive'] },
      location: 'A',
      engageWith: id,
    })
    const enemy = Object.keys(g.enemies)[0]!
    g = during(g, (s) => s, { type: 'EnemyAttack', enemy, investigator: id, exhaustAfter: false })
    expect(g.enemies[enemy]!.location).toBe('B')
    expect(labels(g)).toContain('ability.danielaFight')
    g = resolve(choose(g, 'ability.danielaFight'))
    expect(g.enemies[enemy]!.damageTaken).toBe(1)
  })
  it('Dexter no devuelve apoyos de historia ni permanentes', () => {
    const id = code(10)
    let g = during(
      game(id),
      (s) => s,
      { type: 'PutAssetIntoPlay', investigator: id, code: DR_ARMITAGE, noSlot: true },
      { type: 'PutAssetIntoPlay', investigator: id, code: code(95) },
    )
    g = during(g, (s) => s, { type: 'PutAssetIntoPlay', investigator: id, code: code(20) })
    g = during(g, (s) => s, {
      type: 'Forced',
      trigger: { type: 'afterPlayAsset', investigator: id, code: code(20) },
    })
    expect(labels(g)).not.toContain('ability.dexterReturn')
    g = resolve(
      during(g, (s) => s, {
        type: 'BeginSkillTest',
        investigator: id,
        skill: 'intellect',
        difficulty: 1,
        kind: { type: 'investigate', location: 'A' },
      }),
      ['choice.returnToHand'],
    )
    expect(Object.values(g.assets).some((a) => a.code === DR_ARMITAGE)).toBe(true)
    expect(Object.values(g.assets).some((a) => a.code === code(95))).toBe(true)
    expect(cardPool(id).some((c) => c.code === DR_ARMITAGE)).toBe(false)
  })
  it('Isabelle paga horror directo, compromete del descarte una vez y baraja la habilidad después', () => {
    const id = code(13)
    let g = during(
      game(id),
      (s) => ({
        ...s,
        interactive: true,
        chaosBag: [0],
        investigators: s.investigators.map((i) => ({ ...i, hand: [], discard: [code(93)] })),
      }),
      {
        type: 'BeginSkillTest',
        investigator: id,
        skill: 'intellect',
        difficulty: 2,
        kind: { type: 'investigate', location: 'A' },
      },
    )
    g = choose(g, 'ability.isabelleCommit')
    expect(g.investigators[0]!.horror).toBe(1)
    expect(labels(g)).not.toContain('ability.isabelleCommit')
    g = resolve(g)
    expect(g.investigators[0]!.discard).not.toContain(code(93))
    expect(g.investigators[0]!.deck).toContain(code(93))
  })
})
