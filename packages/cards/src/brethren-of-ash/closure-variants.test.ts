import {
  applyInput,
  enemyBehavior,
  type Difficulty,
  type GameState,
  type Message,
  type Trigger,
} from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { finishScenario, newCampaign, startScenario } from '../campaign'
import { CODES as Q, servantSacrifice } from './queen-of-ash'
import { CODES as SM, suspects } from './smoke-and-mirrors'

const teams = ['joe', 'trish', 'daniela', 'isabelle']
const difficulties: Difficulty[] = ['easy', 'standard', 'hard', 'expert']
function settle(state: GameState): GameState {
  for (
    let n = 0;
    state.pending &&
    state.pending.question.prompt !== 'prompt.chooseAction' &&
    !state.outcome &&
    n < 60;
    n++
  ) {
    const skip = state.pending.question.choices.findIndex((c) => c.label === 'choice.skip')
    state = applyInput(state, {
      investigator: state.pending.investigator,
      choice: Math.max(0, skip),
    })
  }
  return state
}

describe('matriz de antecedentes de Brethren of Ash', () => {
  for (const difficulty of difficulties)
    it(`Queen: 384 variantes en ${difficulty}`, () => {
      const added = {
        easy: ['elderThing'],
        standard: ['elderThing', 'tablet'],
        hard: ['skull', 'tablet', 'elderThing'],
        expert: ['cultist', 'tablet', 'elderThing', 'skull'],
      }[difficulty]
      for (const size of [1, 2, 3, 4])
        for (let bits = 0; bits < 16; bits++)
          for (const suspect of suspects) {
            const c = newCampaign('brethren-of-ash', teams.slice(0, size), difficulty)
            const notes = [
              'discoveredWhereabouts',
              'scouredArkham',
              'stirredUpTrouble',
              'killedServant',
            ].filter((_, n) => bits & (1 << n))
            const g = startScenario(
              {
                ...c,
                scenarioIndex: 2,
                log: { ...c.log, notes, values: { harbinger: suspect.name } },
              },
              bits + 19,
              false,
            )
            expect(g.doom).toBe((size >= 3 ? 1 : 0) + (bits & 1 ? 0 : 1))
            expect(g.investigators.every((i) => i.clues === (bits & 2 ? 1 : 0))).toBe(true)
            expect(Object.values(g.enemies)).toHaveLength(bits & 4 ? size : 0)
            expect(new Set(Object.values(g.enemies).map((e) => e.location)).size).toBe(
              bits & 4 ? size : 0,
            )
            expect(g.setAside.some((e) => e.code === Q.servantOfFlame)).toBe(!(bits & 8))
            expect(g.campaignLog?.chaosTokens).toEqual(added)
          }
    })

  // 960 complete setups legitimately exceed the default 5s during parallel runs.
  it('Smoke: universidades, barrios, heraldos y bolsa en 960 preparaciones', () => {
    const heralds = new Set<string>()
    const downtown = new Set<string>()
    const uptown = new Set<string>()
    for (const difficulty of difficulties)
      for (const size of [1, 2, 3, 4])
        for (const notes of [[], ['savedUniversity'], ['universityBurned']])
          for (let seed = 1; seed <= 20; seed++) {
            const c = newCampaign('brethren-of-ash', teams.slice(0, size), difficulty)
            const g = startScenario(
              { ...c, scenarioIndex: 1, log: { ...c.log, notes } },
              seed,
              false,
            )
            expect(g.doom).toBe(size + (notes.includes('savedUniversity') ? 1 : 0))
            expect(g.investigators[0]?.location).toBe(
              notes.includes('savedUniversity') ? SM.universityQuietCampus : SM.universityInFlames,
            )
            expect(g.campaignLog?.chaosTokens).toEqual(['cultist', 'cultist'])
            const beneath = Object.values(g.locations).flatMap((l) => l.beneath ?? [])
            expect(beneath).toHaveLength(6)
            const harbinger = g.setAside.find((e) => suspects.some((s) => s.code === e.code))!
            expect(beneath.some((e) => e.code === harbinger.code)).toBe(false)
            heralds.add(harbinger.code)
            Object.keys(g.locations)
              .filter((id) =>
                [SM.downtownBank, SM.downtownSanatorium].includes(id as typeof SM.downtownBank),
              )
              .forEach((id) => downtown.add(id))
            Object.keys(g.locations)
              .filter((id) =>
                [SM.uptownHospital, SM.uptownShoppe].includes(id as typeof SM.uptownHospital),
              )
              .forEach((id) => uptown.add(id))
          }
    expect(heralds.size).toBe(6)
    expect(downtown.size).toBe(2)
    expect(uptown.size).toBe(2)
  }, 30_000)
})

describe('Smoke: los seis códices y el umbral por investigador', () => {
  for (const size of [1, 2, 4])
    for (const card of suspects)
      it(`${card.name}, ${size} investigador(es)`, () => {
        const c = newCampaign('brethren-of-ash', teams.slice(0, size), 'standard')
        let g = startScenario({ ...c, scenarioIndex: 1 }, 7, false)
        if (g.pending?.question.prompt === 'prompt.chooseNextInvestigator')
          g = choose(g, 'choice.investigator')
        const who = g.investigators[0]!.id
        const here = g.investigators[0]!.location!
        g = during(
          g,
          (s) => ({
            ...s,
            chaosBag: [0],
            investigators: s.investigators.map((i) => ({
              ...i,
              location: here,
              resources: 20,
              damage: 2,
              horror: 2,
              skills: { willpower: 8, intellect: 8, combat: 8, agility: 8 },
              // This matrix isolates codex thresholds, not optional card commitments.
              hand: [],
            })),
          }),
          { type: 'SpawnEnemy', card, location: here, engageWith: null },
        )
        g = settle(g)
        const id = Object.values(g.enemies).find((e) => e.code === card.code)!.id
        for (let n = 1; n <= size; n++) {
          expect(g.pending?.question.prompt).toBe('prompt.chooseAction')
          const self = g.enemies[id]!
          const behavior = enemyBehavior(card.code)!
          let messages: Message[]
          if (
            [SM.naomiOBannion, SM.earlMonroe, SM.abigailForeman].includes(
              card.code as typeof SM.naomiOBannion,
            )
          ) {
            messages = behavior.abilities!(g, self, who)[0]!.then
          } else {
            const trigger: Trigger =
              card.code === SM.corneliaAkely
                ? { type: 'afterEvade', investigator: who, enemy: id }
                : {
                    type: 'afterSkillTest',
                    investigator: who,
                    kind: 'investigate',
                    succeeded: true,
                    margin: 2,
                    location: self.location,
                  }
            messages = behavior.reactions!(g, trigger, self)[0]!.then
          }
          g = settle(during(g, (s) => s, ...messages))
          if (n < size) {
            expect(g.enemies[id]?.leads).toBe(n)
            expect(g.underAct ?? []).not.toContain(card.code)
          } else {
            expect(g.enemies[id]).toBeUndefined()
            expect(g.underAct).toContain(card.code)
          }
        }
      })
})

describe('Smoke: registro de las tres combinaciones del objetivo', () => {
  for (const mode of ['interrogated', 'defeated', 'mixed'] as const)
    it(mode, () => {
      const c = { ...newCampaign('brethren-of-ash', ['joe'], 'standard'), scenarioIndex: 1 }
      const six = [...suspects.slice(0, 5).map((e) => e.code), SM.servantOfFlame]
      const underAct = mode === 'interrogated' ? six : mode === 'mixed' ? six.slice(0, 3) : []
      const victory = mode === 'defeated' ? six : mode === 'mixed' ? six.slice(3) : []
      const base = settle(startScenario(c, 7))
      const ended = settle(
        during(
          base,
          (s) => ({ ...s, underAct, victoryDisplay: victory, victoryPoints: victory.length }),
          { type: 'CheckActObjective' },
        ),
      )
      expect(ended.outcome).toEqual({
        type: 'resolution',
        resolution: mode === 'interrogated' ? 2 : 1,
      })
      const next = finishScenario(c, ended)
      expect(next.log.notes.includes('scouredArkham')).toBe(mode === 'interrogated')
      expect(next.log.notes.includes('stirredUpTrouble')).toBe(mode === 'defeated')
      expect(next.log.notes.includes('killedServant')).toBe(mode !== 'interrogated')
      expect(next.log.notes).toContain('discoveredWhereabouts')
      expect(startScenario(next, 9).scenarioId).toBe('queen-of-ash')
    })
})

describe('Queen: el códex del Servant conserva el efecto de los seis heraldos para todo el grupo', () => {
  for (const size of [1, 2, 4])
    for (const herald of suspects)
      it(`${herald.name}, ${size} investigador(es)`, () => {
        const c = newCampaign('brethren-of-ash', teams.slice(0, size), 'standard')
        let g = startScenario(
          { ...c, scenarioIndex: 2, log: { ...c.log, values: { harbinger: herald.name } } },
          4,
          false,
        )
        if (g.pending?.question.prompt === 'prompt.chooseNextInvestigator')
          g = choose(g, 'choice.investigator')
        g = settle(
          during(
            g,
            (s) => ({
              ...s,
              investigators: s.investigators.map((i) => ({
                ...i,
                damage: 4,
                horror: 4,
                resources: 5,
                hand: [],
                deck: ['12040', '12019', '12059', ...Array(20).fill('12089')],
              })),
            }),
            {
              type: 'SpawnEnemy',
              card: servantSacrifice,
              location: Q.sewerCulvert,
              engageWith: null,
            },
          ),
        )
        const self = Object.values(g.enemies).find((e) => e.code === Q.servantOfFlame)!
        const messages = enemyBehavior(Q.servantOfFlame)!.forced!(
          g,
          { type: 'enemyDefeated', enemy: self },
          self,
        )
        g = during(g, (s) => s, ...messages)
        for (
          let n = 0;
          g.pending && g.pending.question.prompt !== 'prompt.chooseAction' && n < 80;
          n++
        ) {
          const choices = g.pending.question.choices
          const drawThree = choices.findIndex(
            (c) => c.label === 'ability.drawCards' && c.params?.n === 3,
          )
          g = applyInput(g, {
            investigator: g.pending.investigator,
            choice: Math.max(0, drawThree),
          })
        }
        for (const i of g.investigators) {
          if (herald.code === SM.corneliaAkely) expect(i.damage).toBe(1)
          if (herald.code === SM.margaretLiu) expect(i.horror).toBe(1)
          if (herald.code === SM.naomiOBannion) expect(i.resources).toBe(10)
          if (herald.code === SM.abigailForeman) expect(i.hand).toHaveLength(3)
          if (herald.code === SM.davidRenfield)
            expect(
              Object.values(g.assets).some((a) => a.owner === i.id && a.code === '12040'),
            ).toBe(true)
          if (herald.code === SM.earlMonroe)
            expect(
              Object.values(g.assets).some((a) => a.owner === i.id && a.code === '12019'),
            ).toBe(true)
        }
      })
})
