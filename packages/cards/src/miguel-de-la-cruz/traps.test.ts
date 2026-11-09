// RR: Attach To, Limits Pertaining to Play Areas, Triggered Abilities ("You may trigger this
// ability from any location"), Evade, Investigate, Fight, Damage, Immune, Upkeep.
import { playableCards, playerCardDef, type GameState } from '@lcg/engine'
import { choose, during, ghoul, labels, spawnAt, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch } from '../dunwich-pilot/testing'
import {
  DECOY_TRAP,
  FELINE_HYBRID,
  GLASSING,
  HIDDEN_SHELTER,
  LIE_IN_WAIT,
  MAKESHIFT_BOMB,
  ROPE_TRAP,
  attach,
  attachmentsAt,
  name,
  sturdy,
} from './testing'

const ready = (s: GameState) => patch({ hand: [], resources: 10 })(s)
const enemy = (s: GameState) => Object.values(s.enemies)[0]!
/** An enemy with Feline Hybrid's code: immune to player card effects. */
const feline = {
  ...ghoul,
  code: FELINE_HYBRID,
  name: 'Feline Hybrid',
  keywords: ['elusive' as const, 'hunter' as const],
}

describe('Trap events: attach to your location', () => {
  it.each([DECOY_TRAP, GLASSING, LIE_IN_WAIT, ROPE_TRAP, MAKESHIFT_BOMB])(
    '%s attaches to the location and leaves the discard pile',
    (code) => {
      let s = during(game(), patch({ hand: [code], resources: 10 }))
      s = choose(s, playerCardDef(code)!.fast ? 'action.playFast' : 'action.play', {
        card: name(code),
      })
      expect(attachmentsAt(s, 'A').map((a) => a.code)).toEqual([code])
      expect(me(s).discard).not.toContain(code)
      expect(me(s).resources).toBe(10 - playerCardDef(code)!.cost!)
    },
  )

  it('allows only one Trap per location (not playable without a ready Knapsack)', () => {
    const s = during(game(), (s) =>
      attach(patch({ hand: [GLASSING], resources: 10 })(s), DECOY_TRAP, 'A'),
    )
    expect(playableCards(s, 'a', false)).not.toContain(GLASSING)
    expect(playableCards(s, 'a', true)).not.toContain(GLASSING)
    // The attach check itself also fails: the event stays in the discard pile.
    const t = during(s, patch({ discard: [GLASSING] }), {
      type: 'AttachEventToLocation',
      investigator: 'a',
      code: GLASSING,
      location: 'A',
      limitTrait: 'Trap',
    })
    expect(attachmentsAt(t, 'A')).toHaveLength(1)
    expect(me(t).discard).toContain(GLASSING)
  })

  it('Hidden Shelter is limited by title, not by Trap', () => {
    let s = during(game(), (s) =>
      attach(patch({ hand: [HIDDEN_SHELTER, HIDDEN_SHELTER], resources: 10 })(s), DECOY_TRAP, 'A'),
    )
    s = choose(s, 'action.play', { card: name(HIDDEN_SHELTER) })
    expect(
      attachmentsAt(s, 'A')
        .map((a) => a.code)
        .sort(),
    ).toEqual([DECOY_TRAP, HIDDEN_SHELTER])
    expect(playableCards(s, 'a', false)).not.toContain(HIDDEN_SHELTER)
  })

  it('attached events ready during the upkeep and are discarded with their location', () => {
    let s = attach(game(), DECOY_TRAP, 'B', 'a', { exhausted: true })
    s = during(s, (x) => x, { type: 'ReadyAll' })
    expect(attachmentsAt(s, 'B')[0]!.exhausted).toBe(false)
    s = during(s, (x) => x, { type: 'RemoveLocation', location: 'B' })
    expect(s.locationAttachments).toEqual({})
    expect(me(s).discard).toContain(DECOY_TRAP)
  })
})

describe('60562: Decoy Trap', () => {
  it('evades an enemy entering the attached location from another location, then moves there', () => {
    let s = during(game(), (s) => attach(ready(s), DECOY_TRAP, 'B'), spawnAt('B'))
    expect(labels(s)).toContain('ability.decoyTrap')
    s = choose(s, 'ability.decoyTrap', { card: name(DECOY_TRAP), enemy: 'Ghoul' })
    expect(attachmentsAt(s, 'B')[0]!.exhausted).toBe(true)
    s = choose(s, 'choice.test.intellect', { difficulty: 2 })
    expect(enemy(s).exhausted).toBe(true)
    s = choose(s, 'choice.decoyTrapMove', { card: name(DECOY_TRAP), location: 'Room B' })
    expect(me(s).location).toBe('B')
    expect(attachmentsAt(s, 'B')).toEqual([])
    expect(me(s).discard).toContain(DECOY_TRAP)
  })

  it('cannot be triggered while exhausted or against an enemy immune to player cards', () => {
    let s = during(
      game(),
      (s) => attach(ready(s), DECOY_TRAP, 'B', 'a', { exhausted: true }),
      spawnAt('B'),
    )
    expect(labels(s)).not.toContain('ability.decoyTrap')
    s = during(game(), (s) => attach(ready(s), DECOY_TRAP, 'B'), spawnAt('B', feline))
    expect(labels(s)).not.toContain('ability.decoyTrap')
  })
})

describe('60563: Glassing', () => {
  it('investigates the attached location remotely and may discover 1 additional clue', () => {
    let s = during(
      game(),
      (s) => {
        const t = attach(ready(s), GLASSING, 'B')
        return { ...t, locations: { ...t.locations, B: { ...t.locations.B!, clues: 3 } } }
      },
      spawnAt('B'),
    )
    s = choose(s, 'ability.glassing', { card: name(GLASSING), location: 'Room B' })
    s = choose(s, 'choice.test.agility', { difficulty: 3 })
    s = choose(s, 'choice.glassingClue', { card: name(GLASSING), location: 'Room B' })
    expect(me(s).clues).toBe(2)
    expect(s.locations.B!.clues).toBe(1)
    expect(me(s).discard).toContain(GLASSING)
  })

  it('does not affect the entering enemy, so an immune enemy still triggers it', () => {
    const s = during(game(), (s) => attach(ready(s), GLASSING, 'B'), spawnAt('B', feline))
    expect(labels(s)).toContain('ability.glassing')
  })
})

describe('60566: Lie in Wait', () => {
  it('attacks the entering enemy with +1 and may be discarded for +1 damage', () => {
    let s = during(game(), (s) => attach(ready(s), LIE_IN_WAIT, 'B'), spawnAt('B', sturdy))
    s = choose(s, 'ability.lieInWait', { card: name(LIE_IN_WAIT), enemy: 'Brute' })
    s = choose(s, 'choice.test.combat', { difficulty: 2 })
    s = choose(s, 'ability.lieInWaitDamage', { card: name(LIE_IN_WAIT) })
    expect(enemy(s).damageTaken).toBe(2)
    expect(me(s).discard).toContain(LIE_IN_WAIT)
  })

  it('keeps the card (exhausted) if not discarded, and offers nothing on failure', () => {
    let s = during(game(), (s) => attach(ready(s), LIE_IN_WAIT, 'B'), spawnAt('B', sturdy))
    s = choose(s, 'ability.lieInWait', { card: name(LIE_IN_WAIT), enemy: 'Brute' })
    s = choose(s, 'choice.test.agility', { difficulty: 2 })
    s = choose(s, 'choice.skip')
    expect(enemy(s).damageTaken).toBe(1)
    expect(attachmentsAt(s, 'B')[0]!.exhausted).toBe(true)
    let f = during(
      game(),
      (s) => attach(withBag('autoFail')(ready(s)), LIE_IN_WAIT, 'B'),
      spawnAt('B', sturdy),
    )
    f = choose(f, 'ability.lieInWait', { card: name(LIE_IN_WAIT), enemy: 'Brute' })
    f = choose(f, 'choice.test.combat', { difficulty: 2 })
    expect(labels(f)).not.toContain('ability.lieInWaitDamage')
    expect(enemy(f).damageTaken).toBe(0)
  })
})

describe('60578: Rope Trap', () => {
  it('deals 1 damage and stays unless a skull or auto-fail is revealed', () => {
    let s = during(game(), (s) => attach(ready(s), ROPE_TRAP, 'B'), spawnAt('B', sturdy))
    s = choose(s, 'ability.ropeTrap', { card: name(ROPE_TRAP), enemy: 'Brute' })
    expect(enemy(s).damageTaken).toBe(1)
    expect(attachmentsAt(s, 'B')[0]!.exhausted).toBe(true)
    let k = during(
      game(),
      (s) => attach(withBag('skull')(ready(s)), ROPE_TRAP, 'B'),
      spawnAt('B', sturdy),
    )
    k = choose(k, 'ability.ropeTrap', { card: name(ROPE_TRAP), enemy: 'Brute' })
    expect(attachmentsAt(k, 'B')).toEqual([])
    expect(me(k).discard).toContain(ROPE_TRAP)
  })
})

describe('60581: Makeshift Bomb', () => {
  it('deals 3 damage to each enemy and investigator at the location after an enemy enters', () => {
    let s = during(
      game(['a', 'b']),
      (s) => attach(patch({ location: 'B' }, 'b')(ready(s)), MAKESHIFT_BOMB, 'B'),
      spawnAt('B', sturdy),
    )
    s = choose(s, 'ability.makeshiftBomb', { card: name(MAKESHIFT_BOMB), location: 'Room B' })
    expect(enemy(s).damageTaken).toBe(3)
    expect(s.investigators.find((i) => i.id === 'b')!.damage).toBe(3)
    expect(me(s).damage).toBe(0)
    expect(me(s).discard).toContain(MAKESHIFT_BOMB)
  })

  it('also triggers after an investigator enters the location', () => {
    let s = during(game(), (s) => attach(ready(s), MAKESHIFT_BOMB, 'B'))
    s = choose(s, 'action.move', { location: 'Room B' })
    expect(labels(s)).toContain('ability.makeshiftBomb')
  })
})

describe('60565: Hidden Shelter', () => {
  it('lets each investigator there choose a benefit when the round ends', () => {
    let s = during(game(), (s) => attach(patch({ damage: 2 })(ready(s)), HIDDEN_SHELTER, 'A'))
    s = during(s, (x) => x, { type: 'Forced', trigger: { type: 'roundEnds' } })
    s = choose(s, 'ability.hiddenShelter', { card: name(HIDDEN_SHELTER), location: 'Room A' })
    expect(labels(s)).toEqual(
      expect.arrayContaining([
        'choice.shelterDraw',
        'choice.shelterResource',
        'choice.shelterDamage',
      ]),
    )
    expect(labels(s)).not.toContain('choice.shelterHorror')
    s = choose(s, 'choice.shelterDamage')
    expect(me(s).damage).toBe(1)
    expect(attachmentsAt(s, 'A')).toHaveLength(1)
  })

  it('is discarded after an enemy enters its location', () => {
    const s = during(game(), (s) => attach(ready(s), HIDDEN_SHELTER, 'B'), spawnAt('B'))
    expect(attachmentsAt(s, 'B')).toEqual([])
    expect(me(s).discard).toContain(HIDDEN_SHELTER)
  })
})
