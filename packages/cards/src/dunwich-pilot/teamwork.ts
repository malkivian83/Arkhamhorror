import {
  getInvestigator,
  isPermanent,
  playerCardDef,
  registerPlayerCard,
  type Choice,
  type Message,
} from '@lcg/engine'
import { assetsHere, atLocation } from './helpers'
import { ask, cardName, continuation } from './effects'

const code = '02018'
const eligible = (asset: { code: string }) =>
  !isPermanent(asset.code) &&
  playerCardDef(asset.code)?.traits.some((trait) => ['Item', 'Ally'].includes(trait))
const confirm = (investigator: string, then: Message[]): Message[] =>
  ask(
    investigator,
    [
      { label: 'choice.pilotAgree', then },
      { label: 'choice.skip', then: [] },
    ],
    true,
  )
// RR: Control/Ownership; Slots. Transfers preserve tokens and owner, without entering play again.
registerPlayerCard({
  code,
  canPlay: (state, investigator) =>
    atLocation(state, investigator).length > 1 &&
    (atLocation(state, investigator).some((i) => i.resources > 0) ||
      assetsHere(state, investigator).some(eligible)),
  play: (_state, investigator) => [continuation(code, investigator, 'menu')],
  effect: (state, investigator, step, data) => {
    const again = continuation(code, investigator, 'menu')
    if (step === 'resources') {
      const from = String(data.from),
        to = String(data.to),
        amount = Number(data.amount)
      return [...confirm(from, [{ type: 'TransferResources', from, to, amount }]), again]
    }
    if (step === 'asset') {
      const asset = state.assets[String(data.asset)]
      return asset
        ? [
            ...confirm(asset.owner, [
              { type: 'TransferAssets', transfers: [{ asset: asset.id, to: String(data.to) }] },
            ]),
            again,
          ]
        : [again]
    }
    if (step === 'exchange') {
      const first = state.assets[String(data.first)],
        second = state.assets[String(data.second)]
      return first && second
        ? [
            ...confirm(
              first.owner,
              confirm(second.owner, [
                {
                  type: 'TransferAssets',
                  transfers: [
                    { asset: first.id, to: second.owner },
                    { asset: second.id, to: first.owner },
                  ],
                },
              ]),
            ),
            again,
          ]
        : [again]
    }
    const players = atLocation(state, investigator),
      assets = assetsHere(state, investigator).filter(eligible)
    const choices: Choice[] = [{ label: 'choice.pilotDone', then: [] }]
    for (const from of players)
      for (const to of players.filter((i) => i.id !== from.id)) {
        for (const amount of new Set([1, from.resources]))
          if (amount > 0 && amount <= from.resources)
            choices.push({
              label: 'choice.pilotGiveResources',
              params: { from: from.name, to: to.name, n: amount },
              then: [
                continuation(code, investigator, 'resources', { from: from.id, to: to.id, amount }),
              ],
            })
        for (const asset of assets.filter((a) => a.owner === from.id))
          choices.push({
            label: 'choice.pilotGiveAsset',
            params: { card: cardName(asset.code), from: from.name, to: to.name },
            then: [continuation(code, investigator, 'asset', { asset: asset.id, to: to.id })],
          })
      }
    for (let i = 0; i < assets.length; i++)
      for (const second of assets.slice(i + 1)) {
        const first = assets[i]!
        if (first.owner !== second.owner)
          choices.push({
            label: 'choice.pilotExchange',
            params: { first: cardName(first.code), second: cardName(second.code) },
            then: [
              continuation(code, investigator, 'exchange', { first: first.id, second: second.id }),
            ],
          })
      }
    // The caster coordinates, but each giver explicitly agrees under their own decision.
    return getInvestigator(state, investigator).eliminated ? [] : ask(investigator, choices, true)
  },
})
