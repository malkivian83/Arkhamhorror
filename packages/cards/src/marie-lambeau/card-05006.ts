import {
  playerCardDef,
  registerInvestigator,
  type Choice,
  type GameState,
  type Investigator,
} from '@lcg/engine'
import { MARIE } from './codes'

/** Doom among the cards she controls: her investigator card and her assets. */
export const controlledDoom = (state: GameState, self: Investigator): number =>
  Object.values(state.assets)
    .filter((a) => a.owner === self.id)
    .reduce((n, a) => n + (a.doom ?? 0), self.doom ?? 0)

// RR: Additional Actions, Doom, Elder Sign. Marie Lambeau: while she has 1 or more doom
// among cards she controls, she may take an additional action during her turn, only to
// play Spell cards or activate [action] abilities on Spell cards.
registerInvestigator({
  code: MARIE,
  traitAction: { trait: 'Spell', active: (state, self) => controlledDoom(state, self) > 0 },
  // Signo arcano: +1; puedes poner 1 perdición en una carta que controles o quitarle 1.
  elderSign: (state, self) => {
    const assets = Object.values(state.assets).filter((a) => a.owner === self.id)
    const card = (code: string) => playerCardDef(code)?.name ?? code
    const choices: Choice[] = [
      {
        label: 'choice.marie.addDoom',
        params: { card: self.name },
        target: { type: 'investigator', id: self.id },
        then: [{ type: 'PlaceDoomOnInvestigator', investigator: self.id, amount: 1 }],
      },
      ...assets.map((a): Choice => ({
        label: 'choice.marie.addDoom',
        params: { card: card(a.code) },
        target: { type: 'asset', id: a.id },
        then: [{ type: 'PlaceDoomOnAsset', asset: a.id, amount: 1 }],
      })),
      ...((self.doom ?? 0) > 0
        ? [
            {
              label: 'choice.marie.removeDoom',
              params: { card: self.name },
              target: { type: 'investigator', id: self.id },
              then: [
                { type: 'RemoveDoom', target: { type: 'investigator', id: self.id }, amount: 1 },
              ],
            } satisfies Choice,
          ]
        : []),
      ...assets
        .filter((a) => (a.doom ?? 0) > 0)
        .map((a): Choice => ({
          label: 'choice.marie.removeDoom',
          params: { card: card(a.code) },
          target: { type: 'asset', id: a.id },
          then: [{ type: 'RemoveDoom', target: { type: 'asset', id: a.id }, amount: 1 }],
        })),
      { label: 'choice.skip', then: [] },
    ]
    return {
      modifier: 1,
      immediate: [
        {
          type: 'Ask',
          investigator: self.id,
          question: { kind: 'chooseOne', prompt: 'prompt.marie.doom', choices },
        },
      ],
    }
  },
})
