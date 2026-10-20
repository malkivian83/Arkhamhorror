import {
  getInvestigator,
  playerCardDef,
  type Asset,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'

export const atLocation = (state: GameState, investigator: InvestigatorId) => {
  const here = getInvestigator(state, investigator).location
  return here === null
    ? []
    : state.investigators.filter((other) => !other.eliminated && other.location === here)
}

export const assetsHere = (state: GameState, investigator: InvestigatorId): Asset[] => {
  const owners = new Set(atLocation(state, investigator).map((other) => other.id))
  return Object.values(state.assets).filter((asset) => owners.has(asset.owner))
}

export function chooseTarget(investigator: InvestigatorId, choices: Choice[]): Message[] {
  return choices.length
    ? [
        {
          type: 'Ask',
          investigator,
          question: { kind: 'chooseOne', prompt: 'prompt.pilotTarget', choices },
        },
      ]
    : []
}

export const assetName = (asset: Asset) => playerCardDef(asset.code)?.name ?? asset.code
