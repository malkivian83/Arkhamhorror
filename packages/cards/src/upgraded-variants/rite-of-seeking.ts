import { getInvestigator, getLocation, registerPlayerCard, shroudOf } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'

// RR ST.3 / ST.8. Upgraded Rite of Seeking: +2 [willpower] and more additional clues; the
// delayed end of turn is applied once, after results, as in the level 0 card (02028).
export function registerRiteOfSeeking(code: string, extraClues: number): void {
  registerPlayerCard({
    code,
    abilities: (state, self, investigator) => {
      const here = getInvestigator(state, investigator).location
      return here === null || self.uses < 1
        ? []
        : [
            {
              key: `${self.id}:investigate`,
              label: 'ability.investigateWith',
              params: { card: cardName(self.code), skill: 'willpower' },
              actions: 1 + (getLocation(state, here).investigateExtraActions ?? 0),
              provokes: true,
              costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
              then: [
                {
                  type: 'BeginSkillTest',
                  investigator,
                  source: self.id,
                  skill: 'willpower',
                  difficulty: shroudOf(state, here),
                  modifier: 2,
                  tags: ['spell'],
                  kind: { type: 'investigate', location: here, extraClues },
                },
              ],
            },
          ]
    },
    onTokenRevealed: (state, token, self) =>
      ['skull', 'cultist', 'tablet', 'elderThing', 'autoFail'].includes(String(token)) &&
      !state.skillTest?.tokenAfter?.some(
        (m) => m.type === 'EndCurrentTurn' && m.investigator === self.owner,
      )
        ? [
            {
              type: 'ModifySkillTest',
              after: [{ type: 'EndCurrentTurn', investigator: self.owner }],
            },
          ]
        : [],
  })
}
