import { createGame, getInvestigator, type GameState, type Message } from '@lcg/engine'
import {
  choose,
  during,
  keep,
  spawnAt,
  testInvestigator,
  testScenario,
  throughSetup,
} from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { DUNWICH_ENCOUNTER_SETS, DUNWICH_SETS as C } from './encounter-sets'
import { thrall } from './thrall'
import { wizardOfYogSothoth } from './wizard-of-yog-sothoth'
import { yithianObserver } from './yithian-observer'
import './professor-warren-rice'
import { EA } from './extracurricular-codes'

function game(players = 1) {
  let s = throughSetup(
    createGame({
      seed: 7,
      interactive: true,
      scenario: testScenario({
        agendas: [
          { code: 'remaining-agenda1', name: 'First', doomThreshold: 2 },
          { code: 'remaining-agenda2', name: 'Second', doomThreshold: 20 },
        ],
        acts: [
          {
            code: 'remaining-act1',
            name: 'First',
            clueThreshold: 0,
            cluesPerInvestigator: false,
            advanceTiming: 'objective',
          },
          {
            code: 'remaining-act2',
            name: 'Second',
            clueThreshold: 0,
            cluesPerInvestigator: false,
            advanceTiming: 'objective',
          },
        ],
      }),
      investigators: ['a', 'b']
        .slice(0, players)
        .map((id) => testInvestigator(id, { health: 30, sanity: 30 })),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator')
  return s
}
const draw = (code: string, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card: {
    ...Object.values(DUNWICH_ENCOUNTER_SETS)
      .flat()
      .find((c) => c.code === code)!,
  },
})
const change =
  (id: string, patch: Partial<GameState['investigators'][number]>) =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  })

// Card texts 02085–02087, 01177–01178; RR: Prey, Spawn, Attach To, Direct Damage, Forced Abilities.
describe('Bishop’s Thralls and Agents of Yog-Sothoth', () => {
  it('preserves original set quantities', () => {
    expect(DUNWICH_ENCOUNTER_SETS.bishopsThralls.map((c) => c.code)).toEqual([
      '02085',
      '02085',
      '02086',
      '02086',
      '02086',
      '02087',
    ])
    expect(DUNWICH_ENCOUNTER_SETS.agentsOfYog.map((c) => c.code)).toEqual([
      '01177',
      '01177',
      '01178',
      '01178',
    ])
  })
  it('Light of Aforgomon binds one copy per act/agenda, makes all investigator damage direct, and leaves with its host', () => {
    let s = during(
      game(),
      keep,
      { type: 'PutAssetIntoPlay', investigator: 'a', code: EA.rice },
      draw(C.lightOfAforgomon),
    )
    s = choose(s, 'choice.dunwich.attachAgenda')
    s = during(s, keep, draw(C.lightOfAforgomon))
    expect(
      Object.values(s.treacheries)
        .map((t) => t.placement.type)
        .sort(),
    ).toEqual(['act', 'agenda'])
    s = during(s, keep, draw(C.lightOfAforgomon), {
      type: 'TakeDamage',
      investigator: 'a',
      damage: 1,
      horror: 1,
    })
    expect(Object.values(s.treacheries)).toHaveLength(2)
    expect(getInvestigator(s, 'a')).toMatchObject({ damage: 1, horror: 1 })
    expect(Object.values(s.assets)[0]).toMatchObject({ damage: 0, horror: 0 })
    s = during(s, keep, { type: 'AdvanceAgenda' })
    expect(Object.values(s.treacheries)).toHaveLength(1)
    s = during(s, keep, { type: 'AdvanceAct', paid: true })
    expect(Object.values(s.treacheries)).toHaveLength(0)
    s = during(s, keep, { type: 'TakeDamage', investigator: 'a', damage: 1, horror: 0 })
    expect(s.pending?.question.prompt).not.toBe('prompt.chooseAction')
  })
  it('Thrall spawns at the most clues; the lead investigator breaks ties', () => {
    let s = during(
      game(),
      (s) => ({
        ...s,
        locations: {
          ...s.locations,
          B: { ...s.locations.B!, clues: 4 },
          C: { ...s.locations.C!, clues: 4 },
        },
      }),
      draw(C.thrall),
    )
    expect(s.pending?.question.prompt).toBe('prompt.chooseSpawnLocation')
    s = choose(s, 'choice.location', { location: 'Room C' })
    expect(Object.values(s.enemies)[0]).toMatchObject({
      code: C.thrall,
      location: 'C',
      keywords: ['retaliate'],
    })
    expect(thrall).toMatchObject({ fight: 2, health: 2, evade: 2, damage: 1, horror: 1 })
  })
  it('both prey enemies prefer the investigator with fewer cards', () => {
    for (const enemy of [wizardOfYogSothoth, yithianObserver]) {
      const s = during(game(2), (s) => change('b', { hand: [] })(s), spawnAt('A', enemy))
      expect(Object.values(s.enemies)[0]?.engagedWith).toBe('b')
    }
  })
  it('Wizard attacks for drawing Hex/Pact before revelation, including an exhausted engaged Wizard', () => {
    let s = during(game(), keep, spawnAt('A', wizardOfYogSothoth))
    const id = Object.values(s.enemies)[0]!.id
    s = during(s, keep, { type: 'ExhaustEnemy', enemy: id }, draw(C.visionsOfFuturesPast))
    expect(getInvestigator(s, 'a')).toMatchObject({ damage: 1, horror: 2 })
    expect(s.skillTest?.difficulty).toBe(5)
  })
  it.each([0, 1])(
    'Yithian Observer snapshots its attack bonus before discarding (%i hand cards)',
    (cards) => {
      let s = during(
        game(),
        change('a', { hand: cards ? ['x'] : [] }),
        spawnAt('A', yithianObserver),
      )
      const id = Object.values(s.enemies)[0]!.id
      s = during(s, keep, {
        type: 'EnemyAttack',
        enemy: id,
        investigator: 'a',
        exhaustAfter: false,
      })
      expect(getInvestigator(s, 'a')).toMatchObject({
        hand: [],
        damage: cards ? 1 : 2,
        horror: cards ? 1 : 2,
      })
    },
  )
  it('Offer of Power draws two cards and can advance the agenda, or gives two horror without doom', () => {
    const initial = game()
    let s = during(initial, keep, draw(C.offerOfPower))
    s = choose(s, 'choice.dunwich.acceptPower')
    expect(s.agendaIndex).toBe(1)
    expect(getInvestigator(s, 'a').hand.length).toBe(getInvestigator(initial, 'a').hand.length + 2)
    s = choose(during(game(), keep, draw(C.offerOfPower)), 'choice.dunwich.refusePower')
    expect(s.agendaIndex).toBe(0)
    expect(s.doom).toBe(0)
    expect(getInvestigator(s, 'a').horror).toBe(2)
  })
})
