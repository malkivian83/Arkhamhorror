import {
  playableCards,
  playerCardDef,
  registerLocation,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during as open, ghoul, labels, spawnAt, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch } from '../dunwich-pilot/testing'

type Step = ((s: GameState) => GameState) | Message
/** Apply state changes in order, then dispatch the messages (spawns). */
const during = (s: GameState, ...steps: Step[]) =>
  open(
    s,
    (x) => steps.reduce((y, f) => (typeof f === 'function' ? f(y) : y), x),
    ...steps.filter((m): m is Message => typeof m !== 'function'),
  )
const card = (code: string) => playerCardDef(code)!.name
const play = (s: GameState, code: string) => choose(s, 'action.play', { card: card(code) })
const skills = (agility: number) => ({ willpower: 3, intellect: 3, combat: 3, agility })

describe('10071: Grift', () => {
  // RR: Parley; one resource per point succeeded by, up to 6.
  it('gains a resource per point succeeded by, to a maximum of 6', () => {
    let s = during(
      game(),
      withBag(0),
      patch({ hand: ['10071'], resources: 0, skills: skills(8) }),
      spawnAt('A', ghoul, 'a'),
    )
    s = choose(play(s, '10071'), 'choice.enemy', { enemy: 'Ghoul' })
    expect(me(s).resources).toBe(6)
    expect(me(s).damage).toBe(0)
  })
  it('makes the enemy attack on a failure and needs an enemy at your location', () => {
    let s = during(
      game(),
      withBag('autoFail'),
      patch({ hand: ['10071'], resources: 0, skills: skills(0) }),
      spawnAt('A', ghoul, 'a'),
    )
    s = choose(play(s, '10071'), 'choice.enemy', { enemy: 'Ghoul' })
    expect(me(s).resources).toBe(0)
    expect(me(s).damage).toBe(1)
    const empty = during(game(), patch({ hand: ['10071'] }))
    expect(playableCards(empty, 'a', false)).not.toContain('10071')
  })
})

describe('10078: Snitch (2)', () => {
  // RR: Fast; after a successful parley test, 2 clues one at a time among your location and
  // connecting locations.
  it('is played after a successful parley and discovers 2 total clues', () => {
    let s = during(
      game(),
      withBag(0),
      patch({ hand: ['10071', '10078'], resources: 5, skills: skills(3) }),
      spawnAt('A', ghoul, 'a'),
    )
    s = choose(play(s, '10071'), 'choice.enemy', { enemy: 'Ghoul' })
    s = choose(s, 'choice.revealToken')
    s = choose(s, 'ability.playCard', { card: card('10078') })
    s = choose(s, 'choice.discoverAt', { location: 'Room A' })
    s = choose(s, 'choice.discoverAt', { location: 'Room A' })
    expect(me(s).clues).toBe(2)
    expect(me(s).hand).not.toContain('10078')
  })
  it('is not offered after a failed parley or a non-parley test', () => {
    let s = during(
      game(),
      withBag('autoFail'),
      patch({ hand: ['10071', '10078'], resources: 5, skills: skills(0) }),
      spawnAt('A', ghoul, 'a'),
    )
    s = choose(play(s, '10071'), 'choice.enemy', { enemy: 'Ghoul' })
    s = choose(s, 'choice.revealToken')
    expect(labels(s)).not.toContain('ability.playCard')
    expect(me(s).hand).toContain('10078')
    s = during(game(), withBag(0), patch({ hand: ['10078'], skills: skills(3) }))
    s = choose(s, 'action.investigate')
    s = choose(s, 'choice.revealToken')
    expect(labels(s)).not.toContain('ability.playCard')
    expect(me(s).clues).toBe(1)
  })
})

describe('09028: Motivational Speech', () => {
  // RR: Parley; the chosen investigator may play an Ally from hand at −3 cost.
  it('lets the chosen investigator play an Ally from hand reducing its cost by 3', () => {
    let s = during(game(), patch({ hand: ['09028', '01018'], resources: 1 }))
    s = play(s, '09028')
    s = choose(s, 'choice.investigator', { name: 'A' })
    s = choose(s, 'ability.playCard', { card: card('01018') })
    expect(Object.values(s.assets).some((a) => a.code === '01018')).toBe(true)
    expect(me(s).resources).toBe(0)
  })
  it('may be declined, and offers no play without an affordable Ally', () => {
    let s = during(game(), patch({ hand: ['09028', '01018'], resources: 0 }))
    s = play(s, '09028')
    s = choose(s, 'choice.investigator', { name: 'A' })
    expect(labels(s)).not.toContain('ability.playCard')
    expect(me(s).hand).toEqual(['01018'])
  })
})

registerLocation({
  code: 'reused-resign-room',
  abilities: (_s, _self, investigator) => [
    {
      key: 'reused-resign-room:resign',
      label: 'ability.resign',
      actions: 1,
      provokes: false,
      then: [{ type: 'Resign', investigator }],
    },
  ],
})
const withResignRoom = (revealed: boolean) => (s: GameState) => ({
  ...s,
  locations: {
    ...s.locations,
    'reused-resign-room': { ...s.locations.C!, id: 'reused-resign-room', revealed },
  },
})

describe('02151: "I\'m outta here!"', () => {
  // RR: Resign; a scenario card in play with a resign ability, wherever it is.
  it('resigns when a revealed scenario card in play has a resign ability', () => {
    let s = during(game(['a', 'b']), withResignRoom(true), patch({ hand: ['02151'] }))
    s = play(s, '02151')
    expect(me(s).resigned).toBe(true)
  })
  it('cannot be played without such an ability in play', () => {
    const s = during(game(), withResignRoom(false), patch({ hand: ['02151'] }))
    expect(playableCards(s, 'a', false)).not.toContain('02151')
  })
})
