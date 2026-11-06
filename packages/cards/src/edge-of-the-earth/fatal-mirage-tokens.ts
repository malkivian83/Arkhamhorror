import {
  getInvestigator,
  push,
  testMargin,
  type Choice,
  type Message,
  type ScenarioBehavior,
} from '@lcg/engine'
import { isMirageStory, PRISON_OF_MEMORIES } from './fatal-mirage-map'

const hard = (difficulty: string) => difficulty === 'hard' || difficulty === 'expert'

export const mirageTokenEffect: NonNullable<ScenarioBehavior['tokenEffect']> = (
  state,
  token,
  investigator,
) => {
  const difficult = hard(state.difficulty)
  switch (token) {
    case 'skull': {
      const plan = Number(state.agendas[state.agendaIndex]?.code ?? '08550') - 8549
      return {
        modifier: -(state.victoryDisplay.filter(isMirageStory).length + (difficult ? plan : 0)),
      }
    }
    case 'cultist': {
      const then: Message[] = [{ type: 'PlaceCluesOnLocation', investigator, amount: 1 }]
      return difficult
        ? { modifier: -2, onSuccessBelow: { margin: 2, then } }
        : { modifier: -2, onFail: then }
    }
    case 'tablet':
      return {
        modifier: difficult ? -4 : -3,
        onFail: [{ type: 'ScenarioSpecific', key: 'mirageTablet', data: { investigator } }],
      }
    case 'elderThing':
      return {
        modifier: difficult ? -5 : -4,
        onFail: [{ type: 'ScenarioSpecific', key: 'mirageElderThing', data: { investigator } }],
      }
    default:
      return { modifier: 0 }
  }
}

export const resolveMirageToken: NonNullable<ScenarioBehavior['specific']> = (state, key, data) => {
  const investigator = String(data.investigator)
  if (key === 'mirageTablet') {
    const choices: Choice[] = []
    if (getInvestigator(state, investigator).location !== PRISON_OF_MEMORIES)
      choices.push({
        label: 'choice.edgeOfTheEarth.mirageMoveToPrison',
        then: [{ type: 'MoveTo', investigator, location: PRISON_OF_MEMORIES }],
      })
    if (state.tekeliliDeck?.length)
      choices.push({
        label: 'choice.edgeOfTheEarth.mirageShuffleTekelili',
        then: [{ type: 'ShuffleTekeliliIntoDeck', investigator, amount: 1 }],
      })
    if (hard(state.difficulty) && state.skillTest && testMargin(state.skillTest) <= -2)
      return push(state, ...choices.flatMap(({ then }) => then))
    return push(state, {
      type: 'Ask',
      investigator,
      question: { kind: 'chooseOne', prompt: 'prompt.chooseEffect', choices },
    })
  }
  if (key === 'mirageElderThing') {
    return push(state, {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEffect',
        choices: Object.values(state.enemies)
          .filter(({ traits }) => traits?.includes('Eidolon'))
          .map(({ id, name }) => ({
            label: 'choice.edgeOfTheEarth.mirageDoom',
            params: { name },
            target: { type: 'enemy', id },
            then: [{ type: 'PlaceDoomOnEnemy', enemy: id, amount: 1 }],
          })),
      },
    })
  }
  return state
}
