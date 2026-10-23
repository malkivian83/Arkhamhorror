/** Reglas de campaña y referencia de Se cierra el telón. No habilita el escenario. */
import {
  getInvestigator,
  leadInvestigator,
  registerScenario,
  type GameState,
  type Message,
  type ScenarioOutcome,
} from '@lcg/engine'
import {
  earnExperience,
  endScenario,
  noteEffect,
  recordNote,
  storyEntries,
} from '../scenario-helpers'
import { applyCarcosaMark, CARCOSA_COUNTERS, markCarcosa } from './log'
import { STRANGER_DEFEATS, THE_MAN_IN_THE_PALLID_MASK } from './the-man-in-the-pallid-mask'

export const CURTAIN_CALL = 'curtain-call'
export const locationHorrorKey = (location: string) => `carcosa:horror:${location}`
const entry = storyEntries('curtainCall')

function resolutionStory(state: GameState, outcome: ScenarioOutcome): Message[] {
  const number = outcome.type === 'resolution' ? outcome.resolution : 0
  if (number !== 0 && number !== 1 && number !== 2)
    throw new Error('Invalid Curtain Call resolution')
  const key = number === 0 ? 'noResolution' : `resolution${number}`
  const belief = number === 1 ? 'conviction' : 'doubt'
  const policeNote = number === 1 ? 'carcosaWarnedPolice' : 'carcosaAvoidedPolice'
  // Guía ES pp. 5–6: sospechas por robo solo en R1; la referencia también las añade en R2.
  const suspicious = number === 1 && state.scenarioMeta?.['carcosa:stoleFromBoxOffice'] === 1
  const marks = number === 0 ? Number(state.scenarioMeta?.[STRANGER_DEFEATS] ?? 0) : 2
  const lead = leadInvestigator(state) ?? state.investigators[0]
  if (!lead) throw new Error('Curtain Call needs a lead investigator')
  return [
    {
      type: 'Story',
      entry: entry(key, [
        ...(number
          ? [
              noteEffect(policeNote),
              { key: `story.carcosa.mark${number === 1 ? 'Conviction' : 'Doubt'}` },
            ]
          : []),
        ...(suspicious ? [noteEffect('carcosaPoliceSuspicious')] : []),
        noteEffect('carcosaStrangerIsOnToYou'),
        { key: 'story.carcosa.strangerBearer', params: { name: lead.name } },
        { key: 'story.carcosa.chasingMarks', params: { n: marks } },
        { key: 'story.effect.experience', params: { bonus: 0 } },
        { key: 'story.effect.proceed', params: { scenario: 'story.carcosa.nextScenario' } },
      ]),
    },
    ...(number ? [recordNote(policeNote), markCarcosa(belief)] : []),
    ...(suspicious ? [recordNote('carcosaPoliceSuspicious')] : []),
    recordNote('carcosaStrangerIsOnToYou'),
    { type: 'AddStoryAsset', investigator: lead.id, code: THE_MAN_IN_THE_PALLID_MASK },
    markCarcosa('chasing', marks),
    earnExperience(0, true),
    endScenario(outcome),
  ]
}

registerScenario({
  id: CURTAIN_CALL,
  resolution: resolutionStory,
  tokenEffect: (state, token, investigator) => {
    const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
    const self = getInvestigator(state, investigator)
    if (token === 'skull')
      return { modifier: -(hard ? Math.max(1, self.horror) : self.horror >= 3 ? 3 : 1) }
    if (token === 'cultist' || token === 'tablet' || token === 'elderThing')
      return {
        modifier: hard ? -5 : -4,
        // Se evalúa al resolver, antes del resultado de la prueba, para evitar cifras obsoletas.
        immediate: [{ type: 'ScenarioSpecific', key: 'carcosaSymbol', data: { investigator } }],
      }
    return { modifier: 0 }
  },
  specific: (state, key, data) => {
    if (
      key === 'carcosaMark' &&
      typeof data.counter === 'string' &&
      Object.hasOwn(CARCOSA_COUNTERS, data.counter)
    )
      return applyCarcosaMark(
        state,
        data.counter as keyof typeof CARCOSA_COUNTERS,
        Number(data.amount),
      )
    if (key === 'carcosaSymbol' && typeof data.investigator === 'string') {
      const location = getInvestigator(state, data.investigator).location
      if (location === null || !state.locations[location]) return state
      const horrorKey = locationHorrorKey(location)
      const horror = Number(state.scenarioMeta?.[horrorKey] ?? 0)
      if (horror > 0)
        return {
          ...state,
          queue: [
            { type: 'TakeDamage', investigator: data.investigator, damage: 0, horror: 1 },
            ...state.queue,
          ],
        }
      return { ...state, scenarioMeta: { ...state.scenarioMeta, [horrorKey]: 1 } }
    }
    return state
  },
})
