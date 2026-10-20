import { enemiesAt, getInvestigator, registerPlayerCard } from '@lcg/engine'
import { ask, continuation } from './effects'
const code = '02017'
registerPlayerCard({
  code,
  canPlay: (state, investigator) =>
    state.activeTurn === investigator &&
    getInvestigator(state, investigator).location !== null &&
    enemiesAt(state, getInvestigator(state, investigator).location!).some(
      (e) => e.engagedWith !== investigator && !e.keywords.includes('massive'),
    ),
  play: (_state, investigator) => [continuation(code, investigator, 'choose')],
  effect: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return here === null
      ? []
      : ask(
          investigator,
          [
            { label: 'choice.pilotDone', then: [] },
            ...enemiesAt(state, here)
              .filter((e) => e.engagedWith !== investigator && !e.keywords.includes('massive'))
              .map((enemy) => ({
                label: 'action.engage',
                params: { enemy: enemy.name },
                target: { type: 'enemy' as const, id: enemy.id },
                then: [
                  { type: 'EngageEnemy' as const, enemy: enemy.id, investigator },
                  continuation(code, investigator, 'choose'),
                ],
              })),
          ],
          true,
        )
  },
})
