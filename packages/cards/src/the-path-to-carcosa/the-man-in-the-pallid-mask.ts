import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  shroudOf,
  printedCode,
  registerEnemy,
  registerPlayerCard,
  registerPlayerCards,
  type Message,
} from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { CARCOSA_COUNTERS, carcosaCount } from './log'

export const THE_MAN_IN_THE_PALLID_MASK = '03059'
export const STRANGER_DEFEATS = 'carcosa:strangerDefeats'

export const theManInThePallidMask = enemy({
  code: THE_MAN_IN_THE_PALLID_MASK,
  name: 'The Man in the Pallid Mask',
  traits: ['Humanoid', 'Elite'],
  fight: 4,
  health: 3,
  evade: 4,
  damage: 0,
  horror: 1,
  keywords: ['aloof'],
})

registerPlayerCards([
  {
    code: THE_MAN_IN_THE_PALLID_MASK,
    name: theManInThePallidMask.name,
    type: 'enemy',
    class: 'neutral',
    traits: ['Humanoid', 'Elite'],
    unique: true,
    story: true,
    weakness: 'The Man in the Pallid Mask',
  },
])
registerPlayerCard({ code: THE_MAN_IN_THE_PALLID_MASK, enemy: theManInThePallidMask })

// RR: "Investigate", "Weakness", "Spawn". La investigación sustituye el descubrimiento.
registerEnemy({
  code: THE_MAN_IN_THE_PALLID_MASK,
  spawn: (state) => {
    const distances = activeInvestigators(state)
      .filter((i) => i.location !== null)
      .map((i) => distancesFrom(state, i.location!))
    if (!distances.length) return []
    const distance = (location: string) =>
      Math.min(...distances.map((d) => d.get(location) ?? Infinity))
    const reachable = Object.keys(state.locations).filter((id) => Number.isFinite(distance(id)))
    const farthest = Math.max(...reachable.map(distance))
    return reachable.filter((id) => distance(id) === farthest)
  },
  abilities: (state, self, investigator) => {
    const location = getInvestigator(state, investigator).location
    if (location === null || location !== self.location) return []
    return [
      {
        key: `${self.id}:investigate`,
        label: 'ability.carcosaInvestigateStranger',
        actions: 1,
        provokes: true,
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'intellect',
            difficulty: shroudOf(state, location) + 2,
            tags: ['investigate'],
            effectSource: self.code,
            kind: {
              type: 'investigate',
              location,
              replaceClue: true,
              // La máscara pálida: en la Tumba de sombras no puede ser derrotado así.
              // Penumbrosa Carcosa: lo decide la versión del acto 2.
              onSuccess:
                state.scenarioId === 'the-pallid-mask' && printedCode(location) === '03257'
                  ? []
                  : state.scenarioId === 'dim-carcosa'
                    ? [{ type: 'ScenarioSpecific', key: 'dimManAbility', data: { enemy: self.id } }]
                    : [{ type: 'DefeatEnemy', enemy: self.id, by: investigator }],
            },
          },
        ],
      },
    ]
  },
  // Se cierra el telón, acto 2 (Objetivo): al ir a descartarse, el acto avanza y su
  // reverso lo mueve al Vestíbulo en lugar de descartarlo.
  insteadOfDiscard: (state) =>
    state.scenarioId === 'curtain-call' && state.acts[state.actIndex]?.code?.startsWith('03047')
      ? [{ type: 'AdvanceAct' }]
      : null,
  forced: (state, trigger, self): Message[] => {
    if (trigger.type !== 'enemyDefeated' || trigger.enemy.id !== self.id) return []
    if (state.scenarioId === 'curtain-call')
      return [
        {
          type: 'SetScenarioMeta',
          key: STRANGER_DEFEATS,
          value: Number(state.scenarioMeta?.[STRANGER_DEFEATS] ?? 0) + 1,
        },
      ]
    if (
      state.scenarioId === 'dim-carcosa' ||
      !state.campaignLog?.notes.includes('carcosaStrangerIsOnToYou')
    )
      return []
    return [
      {
        type: 'RecordNote',
        note: CARCOSA_COUNTERS.chasing,
        value: String(carcosaCount(state.campaignLog, 'chasing') + 1),
      },
    ]
  },
})
