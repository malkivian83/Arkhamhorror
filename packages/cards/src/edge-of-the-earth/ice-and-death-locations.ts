import {
  registerLocation,
  withinFrostLimit,
  type GameState,
  type ExpeditionSupply,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { chooseSkillTest, effectTest } from '../scenario-helpers'
import { iceMessage } from './ice-and-death'

const recover = (supply: ExpeditionSupply): Message => ({ type: 'RecoverExpeditionSupply', supply })
const recovered = (state: GameState, supply: ExpeditionSupply) =>
  state.campaignLog?.expedition?.supplies.includes(supply)

for (const [code, supply, skill, difficulty, parley] of [
  ['08502', '08620', 'intellect', 3, false],
  ['08510', '08619', 'intellect', 4, true],
  ['08512', '08616', 'willpower', 4, true],
  ['08513', '08615', 'combat', 4, false],
  ['08514', '08617', 'agility', 5, false],
] as const satisfies readonly [string, ExpeditionSupply, SkillType, number, boolean][]) {
  registerLocation({
    code,
    abilities: (state, self, investigator) => {
      if (
        recovered(state, supply) ||
        (code === '08510' && state.campaignLog?.notes.includes('edgeOfTheEarthShipSearched'))
      )
        return []
      const onSuccess = [code === '08510' ? iceMessage('ship', { investigator }) : recover(supply)]
      return [
        {
          key: `${code}:supply`,
          label: `ability.edgeOfTheEarth.supply${supply}`,
          actions: 1,
          provokes: !parley,
          parley,
          target: { type: 'location', id: self.id },
          then: [
            code === '08502'
              ? chooseSkillTest(investigator, code, ['intellect', 'agility'], difficulty, {
                  onSuccess,
                })
              : effectTest(investigator, code, skill, difficulty, { onSuccess }),
          ],
        },
      ]
    },
  })
}
registerLocation({
  code: '08511',
  abilities: (state, self) =>
    recovered(state, '08618') || !iceCanAddFrost(state)
      ? []
      : [
          {
            key: '08511:supply',
            label: 'ability.edgeOfTheEarth.supply08618',
            actions: 1,
            provokes: true,
            target: { type: 'location', id: self.id },
            costs: [{ type: 'AddChaosTokens', tokens: ['frost'] }],
            then: [recover('08618')],
          },
        ],
})
export function iceCanAddFrost(state: GameState): boolean {
  return withinFrostLimit(state, ['frost']).length === 1
}
