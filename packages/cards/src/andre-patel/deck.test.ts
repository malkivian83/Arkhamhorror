// RR: Uses, Limits, Parley, Cost X, Fight, Evade, Committing Cards, Skill Test (ST.6), Upkeep.
import {
  availableAbilities,
  dispatch,
  enemyHasKeyword,
  playableCards,
  playerCardBehavior,
  type EnemyCard,
  type GameState,
} from '@lcg/engine'
import { choose, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import {
  ANDRE,
  andre,
  CENTER_STAGE,
  clear,
  effectTest,
  EXTRAVAGANT_RING,
  FAME,
  makeGame,
  MARCUS_SENGSTACKE,
  PAY_YOUR_DUES,
  POLISHED_CANE,
  RIGHT_UNDER_THEIR_NOSES,
  THE_GRAPEVINE,
  WATCH_THIS,
  withAndre,
} from './testing'

/** Su turno, sin cartas en la mano y con recursos. */
const ready = (bag: GameState['chaosBag'] = [0]) =>
  withAndre(clear(makeGame(false, bag)), { hand: [], resources: 10 })
const put = (s: GameState, code: string) =>
  dispatch(s, { type: 'PutAssetIntoPlay', investigator: ANDRE, code })
const asset = (s: GameState, code: string) => Object.values(s.assets).find((a) => a.code === code)
const succeeded = (s: GameState) => s.log.findLast((e) => e.key.startsWith('log.test'))?.key
const through = (s: GameState, label = 'choice.skip') => {
  while (s.pending) s = choose(s, labels(s).includes(label) ? label : labels(s).at(-1)!)
  return s
}

describe('Center Stage', () => {
  it('+1 skill value for each action spent this round; limit 1 per investigator', () => {
    let s = put(ready(), CENTER_STAGE)
    s = withAndre(s, { spentActions: { round: s.round, count: 2 }, hand: [CENTER_STAGE] })
    expect(playableCards(s, ANDRE, false)).not.toContain(CENTER_STAGE)
    s = dispatch(withAndre(s, { hand: [] }), effectTest(7))
    s = choose(s, 'ability.centerStage', { n: 2 })
    expect(asset(s, CENTER_STAGE)).toMatchObject({ uses: 2, exhausted: true })
    s = through(s, 'choice.revealToken')
    expect(succeeded(s)).toBe('log.testSuccess')
  })

  it('is discarded when its last renown is spent', () => {
    let s = put(ready(), CENTER_STAGE)
    s = {
      ...s,
      assets: {
        ...s.assets,
        [asset(s, CENTER_STAGE)!.id]: { ...asset(s, CENTER_STAGE)!, uses: 1 },
      },
    }
    s = choose(dispatch(s, effectTest(4)), 'ability.centerStage')
    expect(asset(s, CENTER_STAGE)).toBeUndefined()
  })
})

describe('Fame', () => {
  it('parley with an enemy at your location: spend 1 renown to gain 2 resources', () => {
    let s = put(ready(), FAME)
    expect(availableAbilities(s, ANDRE).some((a) => a.label === 'ability.fame')).toBe(false)
    s = dispatch(s, spawnAt('A', { ...ghoul }))
    const fame = availableAbilities(s, ANDRE).find((a) => a.label === 'ability.fame')!
    expect(fame).toMatchObject({ actions: 1, parley: true, provokes: false })
    s = dispatch(s, { type: 'PlayerWindow', investigator: ANDRE })
    const resources = andre(s).resources
    s = choose(s, 'ability.fame')
    expect(andre(s).resources).toBe(resources + 2)
    expect(asset(s, FAME)!.uses).toBe(3)
  })
})

describe('The Grapevine', () => {
  it('parley: move along the shortest path to an enemy up to 2 connections away and engage it', () => {
    let s = put(ready(), THE_GRAPEVINE)
    s = {
      ...s,
      locations: Object.fromEntries(
        Object.entries(s.locations).map(([id, l]) => [id, { ...l, revealed: true }]),
      ),
    }
    s = dispatch(s, spawnAt('C', { ...ghoul, keywords: ['aloof'] }))
    s = dispatch(s, { type: 'PlayerWindow', investigator: ANDRE })
    // Un solo enemigo al alcance: se elige solo, y André vuelve a su menú en C.
    s = choose(s, 'ability.grapevine')
    expect(andre(s).location).toBe('C')
    expect(Object.values(s.enemies)[0]!.engagedWith).toBe(ANDRE)
    expect(asset(s, THE_GRAPEVINE)).toMatchObject({ uses: 2, exhausted: true })
  })
})

describe('Extravagant Ring', () => {
  it('when you would succeed: +2 skill value, which can reach a margin of 2', () => {
    let s = put(ready(), EXTRAVAGANT_RING)
    // Agilidad 5 contra 5: tendría éxito por 0; con el anillo, por 2 (y André reacciona).
    s = dispatch(s, effectTest(5))
    s = choose(s, 'ability.extravagantRing')
    expect(asset(s, EXTRAVAGANT_RING)).toMatchObject({ uses: 2, exhausted: true })
    expect(labels(s)).toContain('ability.andre.action')
  })

  it('is not offered when the test would fail', () => {
    const s = dispatch(put(ready(), EXTRAVAGANT_RING), effectTest(9))
    expect(s.pending).toBeNull()
  })
})

describe('Marcus Sengstacke', () => {
  it('one more resource in the upkeep phase; 1 horror on him when you fail a test', () => {
    let s = put(ready(), MARCUS_SENGSTACKE)
    const resources = andre(s).resources
    s = dispatch(s, { type: 'UpkeepPhase' })
    expect(andre(clear(s)).resources).toBe(resources + 2)
    s = dispatch(withAndre(clear(s), { hand: [] }), effectTest(9))
    expect(asset(s, MARCUS_SENGSTACKE)!.horror).toBe(1)
  })
})

describe('Polished Cane', () => {
  const spawn =
    (card: Partial<EnemyCard> = {}) =>
    (s: GameState) =>
      dispatch(s, spawnAt('A', { ...ghoul, health: 9, fight: 4, ...card }, ANDRE))

  it('adds agility to the attack and may exhaust to evade after succeeding by 2', () => {
    let s = spawn()(put(ready(), POLISHED_CANE))
    s = dispatch(s, { type: 'PlayerWindow', investigator: ANDRE })
    // Combate 2 + agilidad 5 = 7 contra 4: éxito por 3.
    s = choose(s, 'ability.fightWith', { card: 'Polished Cane', enemy: 'Ghoul' })
    s = through(s, 'choice.polishedCane')
    const enemy = Object.values(s.enemies)[0]!
    expect(enemy).toMatchObject({ damageTaken: 1, exhausted: true, engagedWith: null })
    expect(asset(s, POLISHED_CANE)!.exhausted).toBe(true)
  })

  it('cannot evade an Elite enemy', () => {
    let s = spawn({ traits: ['Elite'] })(put(ready(), POLISHED_CANE))
    s = dispatch(s, { type: 'PlayerWindow', investigator: ANDRE })
    s = choose(s, 'ability.fightWith', { card: 'Polished Cane', enemy: 'Ghoul' })
    expect(labels(s)).not.toContain('choice.polishedCane')
  })
})

describe('Pay Your Dues', () => {
  it('parley: X is the remaining health of a non-Elite enemy here, which disengages and gains aloof', () => {
    let s = dispatch(ready(), spawnAt('A', { ...ghoul, health: 3 }, ANDRE))
    s = withAndre(s, { hand: [PAY_YOUR_DUES] })
    s = dispatch(s, { type: 'PlayerWindow', investigator: ANDRE })
    const clues = andre(s).clues
    // X solo puede ser la salud restante de un objetivo válido: 3 (se elige solo).
    expect(playerCardBehavior(PAY_YOUR_DUES)!.xOptions!(s, ANDRE)).toEqual([3])
    s = choose(s, 'action.play', { card: 'Pay Your Dues' })
    const enemy = Object.values(s.enemies)[0]!
    expect(enemy.engagedWith).toBeNull()
    expect(enemyHasKeyword(s, enemy, 'aloof')).toBe(true)
    expect(enemyHasKeyword({ ...s, round: s.round + 1 }, enemy, 'aloof')).toBe(false)
    expect(andre(s).clues).toBe(clues + 1)
    expect(andre(s).resources).toBe(10 - 3)
  })
})

describe('Right Under Their Noses', () => {
  const evade = (difficulty: number) => {
    let s = dispatch(ready(), spawnAt('A', { ...ghoul, evade: difficulty }, ANDRE))
    s = withAndre(s, { hand: [RIGHT_UNDER_THEIR_NOSES] })
    s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, revealed: true, clues: 1 } } }
    const enemy = Object.keys(s.enemies)[0]!
    return dispatch(s, {
      type: 'BeginSkillTest',
      investigator: ANDRE,
      skill: 'agility',
      difficulty,
      kind: { type: 'evade', enemy },
    })
  }

  it('after succeeding by 2 or more, the clue may come from a connecting location', () => {
    // Primero, la reacción de André por superar por 2.
    let s = choose(evade(3), 'choice.skip')
    s = choose(s, 'ability.playCard', { card: 'Right Under Their Noses' })
    s = choose(s, 'choice.discoverAt', { location: 'Room B' })
    expect(s.locations.B!.clues).toBe(0)
    expect(andre(s).clues).toBe(1)
  })

  it('by less than 2, only at your location', () => {
    let s = evade(5)
    s = choose(s, 'ability.playCard', { card: 'Right Under Their Noses' })
    expect(labels(s)).not.toContain('choice.discoverAt')
    s = through(s)
    expect(andre(s).clues).toBe(1)
  })
})

describe('"Watch this!"', () => {
  const commit = (difficulty: number, spend: number) => {
    let s = withAndre(ready(), { hand: [WATCH_THIS], resources: 5 })
    s = dispatch(s, effectTest(difficulty, 'willpower'))
    s = choose(s, 'choice.commit')
    return choose(s, 'choice.spendResources', { n: spend })
  }

  it('spend up to 3; succeeding by 1 or more gains twice as many', () => {
    // Voluntad 2 + 1 icono contra 2: éxito por 1.
    const s = through(commit(2, 3), 'choice.revealToken')
    expect(andre(s).resources).toBe(5 - 3 + 6)
  })

  it('succeeding by 0 or failing gains nothing', () => {
    expect(andre(through(commit(3, 2), 'choice.revealToken')).resources).toBe(5 - 2)
    expect(andre(through(commit(9, 1), 'choice.revealToken')).resources).toBe(5 - 1)
  })
})
