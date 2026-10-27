// RR: Revelation, Leaves Play, Forced, Fast, Doom, Weakness.
import { availableActions, dispatch } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { BARON_SAMEDI, clear, makeGame, MARIE, marie, withMarie } from './testing'

const withBaron = (others = false) => {
  const s = withMarie(clear(makeGame(others)), { hand: [], deck: [BARON_SAMEDI, '01088'] })
  return dispatch(s, { type: 'DrawCards', investigator: MARIE, amount: 1 })
}
const baron = (s: ReturnType<typeof withBaron>) =>
  Object.values(s.assets).find((a) => a.code === BARON_SAMEDI)

it('enters play under her control and cannot leave play with fewer than 3 doom', () => {
  let s = withBaron()
  expect(baron(s)?.owner).toBe(MARIE)
  expect(marie(s).discard).not.toContain(BARON_SAMEDI)
  s = dispatch(s, { type: 'DiscardAsset', asset: baron(s)!.id })
  expect(baron(s)).toBeDefined()
  s = dispatch(s, { type: 'ReturnAssetToHand', asset: baron(s)!.id })
  expect(baron(s)).toBeDefined()
})

it('places 1 additional damage on investigators at his location, without retriggering', () => {
  let s = withBaron(true)
  s = dispatch(s, { type: 'TakeDamage', investigator: MARIE, damage: 1, horror: 0, direct: true })
  expect(marie(s).damage).toBe(2)
  s = dispatch(s, { type: 'TakeDamage', investigator: 'b', damage: 1, horror: 1, direct: true })
  expect(s.investigators.find((i) => i.id === 'b')!.damage).toBe(2)
  // Solo horror: no hay daño adicional.
  s = dispatch(s, { type: 'TakeDamage', investigator: MARIE, damage: 0, horror: 1, direct: true })
  expect(marie(s).damage).toBe(2)
})

it('[fast] exhaust: 1 doom on him, which feeds her additional action; at 3 doom he is discarded', () => {
  // Umbral alto: su perdición cuenta para el plan, que avanzaría y la retiraría.
  let s = withBaron()
  s = { ...s, agendas: s.agendas.map((a) => ({ ...a, doomThreshold: 10 })) }
  const use = (x: typeof s) =>
    choose(dispatch(x, { type: 'PlayerWindow', investigator: MARIE }), 'ability.baronSamedi')
  s = use(s)
  expect(baron(s)).toMatchObject({ doom: 1, exhausted: true })
  // Con perdición en una carta suya, Marie puede jugar un Hechizo sin acciones normales.
  const spell = withMarie(clear(s), { actionsRemaining: 0, resources: 10, hand: ['01060'] })
  expect(availableActions(spell, MARIE)).toEqual([{ kind: 'play', card: '01060' }])
  for (let n = 0; n < 2; n++) {
    s = clear(s)
    s = dispatch(s, { type: 'ReadyAsset', asset: baron(s)!.id })
    s = use(s)
  }
  expect(baron(s)).toBeUndefined()
  expect(marie(s).discard).toContain(BARON_SAMEDI)
})
