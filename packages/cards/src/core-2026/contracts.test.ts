import {
  applyInput,
  createGame,
  isPermanent,
  playerCardBehavior,
  playerCardDef,
  investigatorBehavior,
  skillTestValue,
  type GameState,
  type Message,
  type Trigger,
} from '@lcg/engine'
import { choose, during, ghoul, testInvestigator, testScenario } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { playerCards, code } from './player-cards'
import '../index'

function fixture() {
  return createGame({
    seed: 17,
    scenario: testScenario({ chaosBag: [0] }),
    investigators: [
      testInvestigator('a', { deck: Array(30).fill(code(89)), health: 20, sanity: 20 }),
    ],
  })
}
function settle(state: GameState) {
  for (
    let n = 0;
    state.pending && state.pending.question.prompt !== 'prompt.chooseAction' && n < 40;
    n++
  ) {
    const skip = state.pending.question.choices.findIndex((c) => c.label === 'choice.skip')
    state = applyInput(state, {
      investigator: state.pending.investigator,
      choice: Math.max(skip, 0),
    })
  }
  return state
}

describe('contrato de cada apoyo de la caja: coste, zona, acción y usos', () => {
  for (const card of playerCards.filter((c) => c.type === 'asset' && !c.weakness))
    it(`${card.code} ${card.name}`, () => {
      // RR: Play / Permanent / Uses. Test each printed definition, not just a shared example.
      if (isPermanent(card.code)) {
        const g = createGame({
          seed: 17,
          scenario: testScenario(),
          investigators: [
            testInvestigator('a', { deck: [card.code, ...Array(20).fill(code(89))] }),
          ],
        })
        expect(Object.values(g.assets).some((a) => a.code === card.code)).toBe(true)
        expect([...g.investigators[0]!.deck, ...g.investigators[0]!.hand]).not.toContain(card.code)
        return
      }
      let g = during(fixture(), (s) => ({
        ...s,
        investigators: s.investigators.map((i) => ({ ...i, resources: 50, hand: [card.code] })),
      }))
      g = settle(choose(g, card.fast ? 'action.playFast' : 'action.play'))
      const asset = Object.values(g.assets).find((a) => a.code === card.code)
      expect(asset).toMatchObject({
        owner: 'a',
        uses: card.uses?.count ?? 0,
        exhausted: false,
        damage: 0,
        horror: 0,
      })
      expect(g.investigators[0]!.hand).not.toContain(card.code)
      expect(g.investigators[0]!.resources).toBe(50 - (card.cost ?? 0))
      expect(g.investigators[0]!.actionsRemaining).toBe(card.fast ? 3 : 2)
    })
})

const effects: Record<number, Partial<Message>> = {
  5: { type: 'GainResources', amount: 2 },
  11: { type: 'SearchDeck', discount: 2 },
  23: { type: 'SearchDeck', top: 9 },
  24: { type: 'DiscoverClues', amount: 2 },
  37: { type: 'BeginSkillTest', skill: 'agility', modifier: 2 },
  38: { type: 'DiscoverClues', amount: 1 },
  41: { type: 'BeginSkillTest', modifier: 4 },
  43: { type: 'ChooseFromTop', top: 8, picks: 3 },
  50: { type: 'BeginSkillTest', skill: 'intellect', modifier: 3 },
  51: { type: 'SearchEncounterForEnemy', top: 9 },
  52: { type: 'Ask' },
  55: { type: 'BeginSkillTest', modifier: 2 },
  // Premonition: revela la ficha (admite respuestas) y después la sella.
  64: { type: 'RevealTokenOutsideTest' },
  66: { type: 'PlaceDoomOnInvestigator', amount: 1 },
  70: { type: 'BeginSkillTest', modifier: 3 },
  79: { type: 'BeginSkillTest', skill: 'agility' },
  82: { type: 'ForceSkillTestSuccess' },
  89: { type: 'GainResources', amount: 3 },
}
describe('contrato de cada evento: efecto principal y ventanas de reacción', () => {
  for (const card of playerCards.filter((c) => c.type === 'event' && !c.weakness))
    it(`${card.code} ${card.name}`, () => {
      let g = during(
        fixture(),
        (s) => ({
          ...s,
          activeTurn: 'a',
          investigators: s.investigators.map((i) => ({
            ...i,
            hand: [card.code, code(20)],
            clues: 2,
            damage: 2,
            horror: 2,
            resources: 20,
          })),
        }),
        { type: 'SpawnEnemy', card: { ...ghoul, health: 20 }, location: 'A', engageWith: 'a' },
      )
      g = settle(g)
      const behavior = playerCardBehavior(card.code)!
      const position = Number(card.code.slice(2))
      const before = JSON.stringify(g)
      if (effects[position]) {
        const messages = behavior.play!(g, 'a')
        expect(messages[0]).toMatchObject(effects[position]!)
        expect(messages.length).toBeGreaterThan(0)
        expect(behavior.play!(g, 'a')).toEqual(messages)
      } else {
        const trigger: Trigger =
          position === 22
            ? { type: 'afterEnemyAttack', enemy: Object.keys(g.enemies)[0]!, investigator: 'a' }
            : position === 26
              ? { type: 'whenEnemyAttacks', enemy: Object.keys(g.enemies)[0]!, investigator: 'a' }
              : position === 36
                ? { type: 'enemyEntersLocation', enemy: Object.keys(g.enemies)[0]!, location: 'A' }
                : position === 65
                  ? { type: 'whenTreacheryDrawn', investigator: 'a', treachery: 't' }
                  : {
                      type: 'afterSkillTest',
                      investigator: 'a',
                      kind: 'investigate',
                      succeeded: false,
                      margin: -2,
                      location: 'A',
                    }
        if (position === 65)
          g = {
            ...g,
            treacheries: {
              t: {
                id: 't',
                kind: 'treachery',
                code: 'test-encounter',
                name: 'Test',
                keywords: [],
                placement: { type: 'limbo' },
              },
            },
          }
        const options = behavior.handReactions!(g, trigger, 'a')
        expect(options).toHaveLength(1)
        expect(options[0]!.then).toContainEqual(
          expect.objectContaining({ type: 'PlayCard', code: card.code }),
        )
        expect(behavior.handReactions!(g, { type: 'roundEnds' }, 'a')).toEqual([])
      }
      if (position !== 65) expect(JSON.stringify(g)).toBe(before)
    })
})

describe('contrato de cada habilidad: iconos y compromiso', () => {
  for (const card of playerCards.filter((c) => c.type === 'skill'))
    it(`${card.code} ${card.name}`, () => {
      const skill = (['willpower', 'intellect', 'combat', 'agility'] as const).find(
        (s) => (card.icons?.[s] ?? 0) + (card.icons?.wild ?? 0) > 0,
      )!
      let g = during(
        fixture(),
        (s) => ({
          ...s,
          interactive: true,
          investigators: s.investigators.map((i) => ({ ...i, hand: [card.code] })),
        }),
        {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill,
          difficulty: 1,
          kind: { type: 'investigate', location: 'A' },
        },
      )
      const before = skillTestValue(g).total
      g = choose(g, 'choice.commit')
      expect(skillTestValue(g).total - before).toBe(
        (card.icons?.[skill] ?? 0) + (card.icons?.wild ?? 0),
      )
      expect(g.skillTest?.committed).toContainEqual(
        expect.objectContaining({ code: card.code, by: 'a' }),
      )
      expect(g.investigators[0]!.hand).not.toContain(card.code)
    })
})

describe('contrato de cada debilidad: registro y resolución al robar', () => {
  for (const card of playerCards.filter((c) => c.weakness))
    it(`${card.code} ${card.name}`, () => {
      let g = during(
        fixture(),
        (s) => ({
          ...s,
          investigators: s.investigators.map((i) => ({
            ...i,
            deck: [card.code, ...i.deck],
            resources: 7,
            hand: [code(20), code(19), code(89)],
          })),
        }),
        { type: 'DrawCards', investigator: 'a', amount: 1 },
      )
      g = settle(g)
      const me = g.investigators[0]!
      if (card.type === 'enemy')
        expect(Object.values(g.enemies).some((e) => e.code === card.code && e.owner === 'a')).toBe(
          true,
        )
      else if (card.code === code(6)) expect(me.hand).toContain(card.code)
      else if ([3, 12, 98, 102, 103, 104].some((p) => card.code === code(p)))
        expect(
          Object.values(g.treacheries).some((t) => t.code === card.code && t.owner === 'a'),
        ).toBe(true)
      else if (card.code === code(15)) expect(me.damage).toBe(1)
      else if (card.code === code(97)) expect(me.hand).toHaveLength(1)
      else if (card.code === code(101)) expect(me.resources).toBe(0)
      else if (card.code === code(100)) expect(Object.values(g.enemies)).toHaveLength(2)
      expect(g.outcome || g.pending).toBeTruthy()
    })
})

describe('contrato de los cinco signos arcanos y habilidades', () => {
  for (const card of playerCards.filter((c) => c.type === 'investigator'))
    it(`${card.code} ${card.name}`, () => {
      let g = fixture()
      const self = { ...g.investigators[0]!, id: card.code }
      g = { ...g, investigators: [self] }
      const b = investigatorBehavior(card.code)!
      expect(b.elderSign!(g, self).modifier).toBe(card.code === code(7) ? 0 : 1)
      expect(b.reactions || b.testOptions || b.extraEvadeAction).toBeTruthy()
      expect(playerCardDef(card.code)?.signatures).toHaveLength(2)
    })
})
