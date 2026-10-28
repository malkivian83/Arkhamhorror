import { getLocation, registerPlayerCard } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
import { SHED_A_LIGHT } from './codes'

// RR: Fast, Automatic Success, Discover. Shed a Light: play before revealing a chaos token during
// an investigation you are performing, only if its difficulty is currently 0. It succeeds
// automatically (steps 3 and 4 are skipped, FAQ); you discover 1 additional clue at this location
// and 1 additional clue at any location.
registerPlayerCard({
  code: SHED_A_LIGHT,
  playInAnyFastWindow: true,
  canPlay: (state, investigator) => {
    const test = state.skillTest
    return (
      !!test &&
      test.investigator === investigator &&
      test.kind.type === 'investigate' &&
      test.tokens.length === 0 &&
      !test.revealing &&
      !test.noTokens &&
      test.difficulty === 0
    )
  },
  play: (state, investigator) => {
    const any = Object.values(state.locations).filter((l) => l.revealed && l.clues > 0)
    return [
      { type: 'AutoSucceedSkillTest' },
      { type: 'AddInvestigationResults', extraClues: 1 },
      ...ask(
        investigator,
        any.map((l) => ({
          label: 'choice.discoverAt',
          params: { location: getLocation(state, l.id).name },
          target: { type: 'location' as const, id: l.id },
          then: [
            {
              type: 'AddInvestigationResults' as const,
              onSuccess: [
                { type: 'DiscoverClues' as const, investigator, location: l.id, amount: 1 },
              ],
            },
          ],
        })),
        true,
      ),
    ]
  },
})
