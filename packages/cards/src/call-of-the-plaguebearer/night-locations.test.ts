import {
  allPlayerCardDefs,
  applyInput,
  availableAbilities,
  dispatch,
  getInvestigator,
  type GameState,
  type Message,
  type Trigger,
} from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { N, gasGhoul } from './night-data'
import { nightGame } from './night-testing'
import { emit, settle } from './testing'

const me = (s: GameState) => getInvestigator(s, 'a')
const patch = (s: GameState, data: Partial<ReturnType<typeof me>>): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === 'a' ? { ...i, ...data } : i)),
})
const finish = (state: GameState) => {
  let s = state
  for (let n = 0; n < 40 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = settle(applyInput(s, { investigator: s.pending.investigator, choice: 0 }))
  return s
}
const located = (id: string) => {
  let s = nightGame()
  if (!s.locations[id]) s = emit(s, { type: 'PutLocationIntoPlay', location: id })
  return emit(patch(s, { location: id }), { type: 'RevealLocation', location: id })
}
const turn = (s: GameState) =>
  finish(emit(s, { type: 'Forced', trigger: { type: 'turnBegins', investigator: 'a' } }))
const use = (s: GameState, label: string) => {
  const a = availableAbilities(s, 'a').find((a) => a.label === label)!
  expect(a, label).toBeDefined()
  return finish(emit(s, { type: 'UseAbility', investigator: 'a', ...a }))
}
const react = (s: GameState, trigger: Trigger) =>
  dispatch({ ...s, pending: null, queue: [] }, { type: 'Reactions', trigger })
const asset = (ally = false) =>
  allPlayerCardDefs().find(
    (d) =>
      d.type === 'asset' &&
      !d.story &&
      !d.unique &&
      (d.cost ?? 0) > 0 &&
      d.traits.includes('Ally') === ally,
  )!
// Cartas ES 023–039 y 353–360; RR «Triggered Abilities», «Search», «Limits».
it('el Colmado pone en juego un Apoyo entre las 2X primeras cartas pagando X recursos', () => {
  const card = asset()
  let s = patch(located('78025'), { deck: [card.code, '01089'], resources: 5 })
  s = use(s, 'ability.plaguebearer.night.store')
  expect(me(s).resources).toBe(4)
  expect(Object.values(s.assets).some((a) => a.code === card.code)).toBe(true)
  expect(
    availableAbilities(s, 'a').some((a) => a.label === 'ability.plaguebearer.night.store'),
  ).toBe(false)
})
it('la Pensión busca un Aliado en todo el mazo y la tienda pone un Hechizo/Relic tras robar encuentro', () => {
  const ally = asset(true)
  let s = patch(located('78027'), { deck: [ally.code] })
  s = use(s, 'ability.plaguebearer.night.boarding')
  expect(me(s).hand).toContain(ally.code)
  const spell = allPlayerCardDefs().find(
    (d) =>
      d.type === 'asset' && !d.story && (d.traits.includes('Spell') || d.traits.includes('Relic')),
  )!
  s = patch(located('78030'), { deck: [spell.code] })
  s = { ...s, encounterDeck: [ENCOUNTER_SETS.ancientEvils[0]!], encounterDiscard: [] }
  s = use(s, 'ability.plaguebearer.night.shop')
  expect(s.doom).toBe(1)
  expect(Object.values(s.assets).some((a) => a.code === spell.code)).toBe(true)
})
it('Advertiser da carta y recurso tras jugar un evento', () => {
  let s = located('78023')
  const before = me(s)
  const event = allPlayerCardDefs().find((d) => d.type === 'event')!
  s = settle(
    choose(
      react(s, { type: 'afterPlayCard', investigator: 'a', code: event.code }),
      'ability.plaguebearer.night.benefit',
    ),
  )
  expect(me(s).hand.length).toBe(before.hand.length + 1)
  expect(me(s).resources).toBe(before.resources + 1)
})
it('el límite del Banco es individual por investigador, no de grupo', () => {
  let s = nightGame(2)
  s = emit(s, { type: 'RevealLocation', location: '78024' })
  s = { ...s, investigators: s.investigators.map((i) => ({ ...i, location: '78024' })) }
  const trigger = (by: string): Trigger => ({
    type: 'afterSkillTest',
    investigator: by,
    kind: 'investigate',
    succeeded: true,
    margin: 0,
  })
  s = settle(choose(react(s, trigger('a')), 'ability.plaguebearer.night.benefit'))
  expect(me(s).resources).toBe(7)
  expect(react(s, trigger('a')).pending).toBeNull()
  s = settle(choose(react(s, trigger('b')), 'ability.plaguebearer.night.benefit'))
  expect(getInvestigator(s, 'b').resources).toBe(7)
})
it('Motel Hibb cura un punto tras tener éxito por dos; la biblioteca solo añade una carta por mantenimiento', () => {
  let s = patch(located('78026'), { damage: 1 })
  s = settle(
    choose(
      react(s, {
        type: 'afterSkillTest',
        investigator: 'a',
        kind: 'investigate',
        succeeded: true,
        margin: 2,
      }),
      'ability.plaguebearer.night.healDamage',
    ),
  )
  expect(me(s).damage).toBe(0)
  s = located('78028')
  s = { ...s, phase: 'upkeep' }
  const hand = me(s).hand.length
  s = emit(s, { type: 'DrawCards', investigator: 'a', amount: 1 })
  expect(me(s).hand.length).toBe(hand + 2)
  s = emit(s, { type: 'DrawCards', investigator: 'a', amount: 1 })
  expect(me(s).hand.length).toBe(hand + 3)
})
it('Banco en Ruinas pierde la mitad redondeada hacia arriba', () => {
  const s = turn(patch(located('78276'), { resources: 5 }))
  expect(me(s).resources).toBe(2)
})
it('Biblioteca en Ruinas descarta hasta tres cartas', () => {
  const s = turn(patch(located('78280'), { hand: Array.from({ length: 7 }, () => '01089') }))
  expect(me(s).hand).toHaveLength(3)
})
it('Colmado en Ruinas descarta dos Apoyos cuando hay cinco', () => {
  const card = asset()
  let s = located('78277')
  s = emit(
    s,
    ...Array.from({ length: 5 }, (): Message => ({
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: card.code,
      noSlot: true,
    })),
  )
  s = turn(s)
  expect(Object.values(s.assets).filter((a) => a.owner === 'a')).toHaveLength(3)
})
it('Motel en Ruinas reduce la habilidad más alta durante la fase', () => {
  const s = turn(
    patch(located('78278'), { skills: { willpower: 5, intellect: 2, combat: 2, agility: 2 } }),
  )
  expect(me(s).untilPhaseSkills?.find((b) => b.skill === 'willpower')?.amount).toBe(-4)
})
it('Pensión en Ruinas inflige el valor no nulo de salud o cordura del Aliado más caro', () => {
  const ally = allPlayerCardDefs().find(
    (d) => d.type === 'asset' && !d.story && d.traits.includes('Ally') && (d.health ?? 0) > 0,
  )!
  let s = emit(located('78279'), {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code: ally.code,
    noSlot: true,
  })
  s = turn(s)
  // Asignación interactiva a investigador/aliado: el total no se pierde.
  expect(me(s).damage + Object.values(s.assets).reduce((n, a) => n + a.damage, 0)).toBe(ally.health)
})
it('Muelles en Ruinas permite descartar la habilidad revelada y la tienda puede descartar el Apoyo más caro', () => {
  let s = turn(patch(located('78281'), { hand: ['01089'] }))
  expect(me(s).hand).toHaveLength(0)
  const card = asset()
  s = emit(located('78282'), {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code: card.code,
    noSlot: true,
  })
  s = emit(s, { type: 'Forced', trigger: { type: 'turnBegins', investigator: 'a' } })
  s = settle(choose(s, 'choice.discard', { card: card.name }))
  expect(Object.values(s.assets).some((a) => a.code === card.code)).toBe(false)
})
it('Advertiser en Ruinas recibe el coste del evento y retira de la partida uno de coste cero', () => {
  const event = allPlayerCardDefs().find(
    (d) => d.type === 'event' && (d.cost ?? 0) === 1 && !d.weakness,
  )!
  let s = turn(patch(located('78275'), { hand: [event.code] }))
  expect(me(s).damage + me(s).horror).toBe(1)
  const zero = allPlayerCardDefs().find((d) => d.type === 'event' && d.cost === 0 && !d.weakness)!
  s = turn(patch(located('78275'), { hand: [zero.code] }))
  expect(me(s).hand).not.toContain(zero.code)
  expect(me(s).discard).not.toContain(zero.code)
})
it('Hibb (Listo para ayudar) cancela un ataque de oportunidad al agotarse', () => {
  let s = emit(
    nightGame(),
    { type: 'PutAssetIntoPlay', investigator: 'a', code: N.hibbs },
    { type: 'SpawnEnemy', card: gasGhoul, location: '78026', engageWith: 'a' },
  )
  const e = Object.values(s.enemies)[0]!
  s = dispatch(
    { ...s, pending: null, queue: [] },
    { type: 'EnemyAttack', enemy: e.id, investigator: 'a', opportunity: true, exhaustAfter: false },
  )
  s = settle(choose(s, 'ability.plaguebearer.night.hibbs'))
  expect(me(s).damage).toBe(0)
  expect(Object.values(s.assets).find((a) => a.code === N.hibbs)?.exhausted).toBe(true)
})
