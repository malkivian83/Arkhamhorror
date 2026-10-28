// RR: Play by card effect, Discard Pile, Automatic Success, Instead, Elite.
import { dispatch, canPlayByEffect, playableCards } from '@lcg/engine'
import { choose, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { clear, makeGame, withStella, stella, STELLA, through } from '../stella-clark/testing'
import './index'

const ready = () => withStella(clear(makeGame(false, [0])), { hand: [], discard: [], resources: 8 })

it.each(['hand', 'play'])(
  'Scavenging 2 can recover an Item by %s without taking another action',
  (mode) => {
    let s = dispatch(ready(), { type: 'PutAssetIntoPlay', investigator: STELLA, code: '06332' })
    s = withStella(clear(s), { discard: ['60505'], resources: 8 })
    s = dispatch(s, {
      type: 'BeginSkillTest',
      investigator: STELLA,
      skill: 'intellect',
      difficulty: 0,
      kind: { type: 'investigate', location: 'A' },
    })
    if (labels(s).includes('choice.revealToken')) s = choose(s, 'choice.revealToken')
    s = choose(s, 'ability.scavenging2')
    s = choose(s, 'choice.card', { card: '.18 Derringer' })
    const actions = stella(s).actionsRemaining
    s =
      mode === 'hand'
        ? choose(s, 'choice.takeCard', { card: '.18 Derringer' })
        : choose(s, 'choice.playFromDiscard')
    s = through(s)
    expect(stella(s).actionsRemaining).toBe(actions)
    expect(stella(s).discard).not.toContain('60505')
    expect(Object.values(s.assets).find((a) => a.code === '06332')!.exhausted).toBe(true)
    if (mode === 'hand') expect(stella(s).hand).toContain('60505')
    else {
      expect(Object.values(s.assets).some((a) => a.code === '60505')).toBe(true)
      expect(stella(s).resources).toBe(5)
    }
  },
)

it('effect play checks funds, blocked assets, and explicit discard permission', () => {
  let s = withStella(ready(), { discard: ['60505'], resources: 0 })
  expect(canPlayByEffect(s, STELLA, '60505', 'discard')).toBe(false)
  expect(canPlayByEffect(s, STELLA, '60505', 'discard', true)).toBe(true)
  s = withStella(s, { resources: 8, blockedTypes: [{ cardType: 'asset', round: s.round }] })
  expect(canPlayByEffect(s, STELLA, '60505', 'discard', true)).toBe(false)
  const denied = dispatch(clear(s), {
    type: 'PlayCard',
    investigator: STELLA,
    code: '60505',
    from: 'discard',
    byEffect: true,
  })
  expect(stella(denied).discard).toContain('60505')
  expect(Object.values(denied.assets).some((a) => a.code === '60505')).toBe(false)
})

it.each(['resources', 'play'])('Salvage: %s branch removes only the selected copy', (mode) => {
  let s = withStella(ready(), { hand: ['09116'], discard: ['60505', '60505', '04201'] })
  s = dispatch(s, { type: 'PlayCard', investigator: STELLA, code: '09116' })
  expect(s.pending!.question.choices).toHaveLength(1)
  s = choose(s, 'choice.card', { card: '.18 Derringer' })
  s = through(
    choose(s, mode === 'resources' ? 'choice.salvageResources' : 'choice.playFromDiscard'),
  )
  expect(stella(s).discard.filter((c) => c === '60505')).toHaveLength(1)
  expect(stella(s).resources).toBe(mode === 'resources' ? 11 : 5)
  expect(s.exiled ?? []).toEqual([])
  expect(Object.values(s.assets).some((a) => a.code === '60505')).toBe(mode === 'play')
})

it.each(['fight', 'evade'] as const)(
  'Exploit Weakness replaces a %s result without drawing a token',
  (kind) => {
    for (const elite of [false, true]) {
      let s = dispatch(
        ready(),
        spawnAt('A', { ...ghoul, health: 10, traits: elite ? ['Elite'] : [], victory: 2 }, STELLA),
      )
      const enemy = Object.keys(s.enemies)[0]!
      s = withStella(clear(s), { hand: ['09105'] })
      s = dispatch(s, {
        type: 'BeginSkillTest',
        investigator: STELLA,
        skill: 'agility',
        difficulty: 0,
        kind:
          kind === 'fight' ? { type: 'fight', enemy, extraDamage: 5 } : { type: 'evade', enemy },
      })
      expect(playableCards(s, STELLA, true)).toContain('09105')
      s = choose(s, 'ability.playFastFor', { name: 'Stella Clark', card: 'Exploit Weakness' })
      s = choose(s, 'ability.playCard', { card: 'Exploit Weakness' })
      s = through(s, 'choice.revealToken')
      if (elite) {
        expect(s.enemies[enemy]?.damageTaken).toBe(3)
        expect(s.enemies[enemy]?.exhausted).toBe(true)
      } else {
        expect(s.enemies[enemy]).toBeUndefined()
        expect(s.victoryDisplay).toEqual([])
      }
      expect(s.log.some((e) => e.key === 'log.testSuccess')).toBe(true)
    }
  },
)

it('Exploit Weakness rejects other tests and nonzero difficulty', () => {
  let s = withStella(ready(), { hand: ['09105'] })
  s = dispatch(s, {
    type: 'BeginSkillTest',
    investigator: STELLA,
    skill: 'intellect',
    difficulty: 0,
    kind: { type: 'investigate', location: 'A' },
  })
  expect(playableCards(s, STELLA, true)).not.toContain('09105')
})

it('Scrounge for Supplies respects purchased levels even while Shotcaster is discarded', () => {
  const s = withStella(ready(), {
    hand: ['06165'],
    discard: ['09119'],
    customizations: { '09119': { railshooter: 1 } },
  })
  expect(playableCards(s, STELLA, false)).not.toContain('06165')
  expect(playableCards(withStella(s, { customizations: {} }), STELLA, false)).toContain('06165')
})
