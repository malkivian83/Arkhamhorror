import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, type GameState } from '@lcg/engine'
import { during, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { decodeSession, replay, session } from './session'
import { markOf, undoTarget } from './undo'

function table() {
  let state = throughSetup(
    startScenario(newCampaign('the-midwinter-gala', ['joe'], 'standard'), 13),
  )
  state = during(state, (s) => ({
    ...s,
    investigators: s.investigators.map((i) => ({ ...i, hand: [], resources: 8 })),
    assets: {},
    enemies: {},
    placedAssets: {},
    locations: {
      ...s.locations,
      '71012': { ...s.locations['71007']!, id: '71012', revealed: true },
    },
  }))
  return state
}
function roundTrip(base: GameState, choice: number) {
  const input = { investigator: base.pending!.investigator, choice }
  const state = applyInput(base, input)
  const data = session(state, { base, inputs: [input], marks: [markOf(base), markOf(state)] }, null)
  const restored = decodeSession(JSON.stringify(data))
  expect(restored).toEqual(data)
  expect(replay(restored.history!.base, restored.history!.inputs).state).toEqual(state)
  const target = undoTarget(restored.history!.marks, 'step')!
  expect(replay(restored.history!.base, restored.history!.inputs.slice(0, target)).state).toEqual(
    base,
  )
  return restored.state!
}
describe('Gala fase 1: guardado, reproducción y deshacer', () => {
  it('conserva el uso por turno de Dormitorio y su prueba pendiente', () => {
    let base = table()
    base = during(
      base,
      (s) => ({ ...s, investigators: s.investigators.map((i) => ({ ...i, location: '71012' })) }),
      {
        type: 'SpawnEnemy',
        card: {
          kind: 'enemy',
          code: '71047',
          name: 'Enraged Gug',
          fight: 3,
          health: 20,
          evade: 2,
          damage: 1,
          horror: 1,
          keywords: [],
        },
        location: '71012',
        engageWith: '12004',
      },
    )
    const choice = base.pending!.question.choices.findIndex(
      (c) => c.label === 'ability.gala.bedroomFight',
    )
    const saved = roundTrip(base, choice)
    expect(saved.pending?.question.prompt).toBe('prompt.commitCards')
    expect(
      saved.abilityUses.some((use) => use.key === '71012:fight' && typeof use.turn === 'number'),
    ).toBe(true)
  })
  it('restaura una asignación obligatoria y vuelve a ofrecer los mismos Invitados al deshacer', () => {
    let base = table()
    base = during(
      base,
      (s) => s,
      { type: 'PutAssetIntoPlay', investigator: '12004', code: '71018' },
      { type: 'PutAssetIntoPlay', investigator: '12004', code: '71031' },
      {
        type: 'SpawnEnemy',
        card: {
          kind: 'enemy',
          code: '71047',
          name: 'Enraged Gug',
          fight: 3,
          health: 20,
          evade: 2,
          damage: 0,
          horror: 2,
          keywords: [],
        },
        location: '71007',
        engageWith: '12004',
      },
    )
    base = during(base, (s) => s, {
      type: 'EnemyAttack',
      enemy: Object.keys(base.enemies)[0]!,
      investigator: '12004',
      exhaustAfter: false,
    })
    expect(base.pending?.question.prompt).toBe('prompt.assignHorror')
    expect(base.pending?.question.choices).toHaveLength(2)
    const saved = roundTrip(base, 0)
    expect(Object.values(saved.placedAssets ?? {}).filter((a) => a.faceDown)).toHaveLength(2)
    expect(saved.investigators[0]!.horror).toBe(0)
  })
})
