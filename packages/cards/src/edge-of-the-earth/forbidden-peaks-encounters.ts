import {
  engagedEnemies,
  getInvestigator,
  push,
  registerEnemy,
  registerTreachery,
  testMargin,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import {
  CONSTRICTING,
  GUARDIAN,
  PEAKS_TERROR,
  SCAVENGER,
  levelOf,
  locationAtLevel,
} from './forbidden-peaks-cards'
import { iceCanAddFrost } from './ice-and-death-locations'

const scenario = (key: string, data: Record<string, string | number>): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const isElderThing = (traits?: string[]) => !!traits?.includes('Elder Thing')
const here = (state: GameState, investigator: InvestigatorId) =>
  getInvestigator(state, investigator).location

registerEnemy({
  code: PEAKS_TERROR,
  // Forced – At the end of the round: move each investigator at its location directly below.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'roundEnds') return []
    const lower = locationAtLevel(state, levelOf(state, self.location) - 1)
    if (!lower || levelOf(state, self.location) === 0) return []
    return state.investigators
      .filter(({ location, eliminated }) => !eliminated && location === self.location)
      .map(({ id }): Message => ({ type: 'MoveTo', investigator: id, location: lower }))
  },
})
registerEnemy({
  code: CONSTRICTING,
  // Health X: the level of the location (to a minimum of 1).
  healthModifier: (state, self) => Math.max(1, levelOf(state, self.location)),
})
registerEnemy({
  code: SCAVENGER,
  forced: (_state, trigger, self) =>
    trigger.type === 'afterEnemyAttack' && trigger.enemy === self.id
      ? [scenario('mill', { investigator: trigger.investigator, amount: 3 })]
      : [],
})
registerEnemy({
  code: GUARDIAN,
  // Forced – When you deal damage to it: discard 1 card from your deck per point dealt.
  damageTaken: (state, _self, amount) => {
    const investigator = state.skillTest?.investigator
    return {
      amount,
      then: investigator && amount > 0 ? [scenario('mill', { investigator, amount })] : [],
    }
  },
})

registerTreachery({
  code: '08610',
  revelation: (state, investigator) => {
    const location = here(state, investigator)
    return location ? [{ type: 'PlaceCluesOnLocationFromPool', location, amount: 2 }] : []
  },
})
registerTreachery({
  code: '08611',
  revelation: (state, investigator) => {
    const level = levelOf(state, here(state, investigator))
    return level >= 1 && level <= 4
      ? [scenario('avalanche', { investigator })]
      : [{ type: 'GainSurge' }]
  },
})
registerTreachery({
  code: '08612',
  revelation: (_state, investigator) => [
    effectTest(investigator, '08612', 'agility', 3, {
      onFail: [
        { type: 'TakeDamage', investigator, damage: 2, horror: 0 },
        scenario('loseAllExpedition', { investigator }),
        scenario('moveDown', { investigator }),
      ],
    }),
  ],
})
registerTreachery({
  code: '08613',
  // The additional token at level 4 or 5 is revealed by the scenario rules.
  revelation: (_state, investigator) => [
    effectTest(investigator, '08613', 'willpower', 3, {
      onFail: [scenario('hypothermia', { investigator })],
    }),
  ],
})
registerTreachery({
  code: '08697',
  revelation: (state, investigator) => {
    const index = state.encounterDiscard.findLastIndex(
      (card) => card.kind === 'enemy' && isElderThing(card.traits),
    )
    return [
      ...(index >= 0 ? [scenario('riseOfElderThings', { investigator, index })] : []),
      scenario('riseModifiers', { investigator, surge: index >= 0 ? 0 : 1 }),
    ]
  },
})

/** Scenario steps shared by the To the Forbidden Peaks and Elder Things encounter cards. */
export function peaksEncounterStep(
  state: GameState,
  key: string,
  data: Record<string, unknown>,
): GameState | null {
  const investigator = String(data.investigator ?? '')
  switch (key) {
    case 'avalanche': {
      const level = levelOf(state, here(state, investigator))
      const lower = locationAtLevel(state, level - 1)
      if (level < 1 || level > 4 || !lower) return state
      return push(
        state,
        { type: 'MoveTo', investigator, location: lower, encounterEffect: true },
        scenario('avalancheTest', { investigator }),
      )
    }
    case 'avalancheTest':
      return push(
        state,
        effectTest(investigator, '08611', 'willpower', levelOf(state, here(state, investigator)), {
          onFail: [scenario('avalanche', { investigator })],
        }),
      )
    case 'hypothermia': {
      const margin = state.skillTest ? Math.max(1, -testMargin(state.skillTest)) : 1
      return push(state, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.edgeOfTheEarth.peaksHypothermia',
          choices: [
            ...(iceCanAddFrost(state)
              ? [
                  {
                    label: 'choice.edgeOfTheEarth.addFrost',
                    then: [{ type: 'AddChaosTokens', tokens: ['frost'] } as Message],
                  },
                ]
              : []),
            {
              label: 'choice.edgeOfTheEarth.takeHorror',
              params: { amount: margin },
              then: [{ type: 'TakeDamage', investigator, damage: 0, horror: margin }],
            },
          ],
        },
      })
    }
    case 'riseOfElderThings': {
      const index = Number(data.index)
      const card = state.encounterDiscard[index]
      if (!card || card.kind !== 'enemy') return state
      return push(
        { ...state, encounterDiscard: state.encounterDiscard.filter((_, n) => n !== index) },
        {
          type: 'SpawnEnemy',
          card: card as EnemyCard,
          location: here(state, investigator)!,
          engageWith: investigator,
        },
      )
    }
    case 'riseModifiers':
      return push(
        state,
        ...engagedEnemies(state, investigator)
          .filter(({ traits }) => isElderThing(traits))
          .map(({ id }): Message => ({
            type: 'AddEnemyModifier',
            enemy: id,
            modifier: { source: '08697', until: 'round', fight: 1, evade: 1 },
          })),
        ...(Number(data.surge) ? [{ type: 'GainSurge' } as Message] : []),
      )
    default:
      return null
  }
}
