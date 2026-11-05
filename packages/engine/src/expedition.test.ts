import { describe, expect, it } from 'vitest'
import { registerPlayerCards } from './content'
import { dispatch } from './engine'
import { expeditionPartners } from './expedition'
import { choose, newTestGame } from './testing'
import type { GameState, Message } from './types'

const partner = '08714'
const resolute = expeditionPartners[partner]
registerPlayerCards(
  [partner, resolute, '08715'].map((code) => ({
    code,
    name: code,
    type: 'asset',
    class: 'neutral',
    traits: ['Ally'],
    health: 3,
    sanity: 4,
  })),
)

const fresh = () => ({ ...newTestGame({ players: ['a', 'b'] }), queue: [], pending: null })
const select = (investigator = 'a', code: '08714' | '08715' = partner): Message => ({
  type: 'SelectExpeditionPartner',
  investigator,
  partner: code,
})
const record = (state: GameState) => state.campaignLog?.expedition?.partners[partner]
const start = () => dispatch(fresh(), { type: 'InitializeExpedition' }, select())

// Guía de campaña, p. 3, «Compañero».
describe('Expedition partners', () => {
  it('asks each investigator in order and removes a selected partner from later options', () => {
    const picking = dispatch(
      fresh(),
      { type: 'InitializeExpedition' },
      { type: 'ChooseExpeditionPartners' },
    )
    expect(picking.pending?.investigator).toBe('a')
    const picked = choose(picking, 'choice.card', { card: partner })
    expect(picked.pending?.investigator).toBe('b')
    expect(picked.pending?.question.choices.map((choice) => choice.params?.card)).not.toContain(
      partner,
    )
    expect(Object.values(choose(picked, 'choice.edgeOfTheEarth.noPartner').assets)).toHaveLength(1)
  })

  it('initializes nine partners and allows one distinct available partner per investigator', () => {
    const old = fresh()
    expect(dispatch(old, select()).assets).toEqual({})
    const game = dispatch(
      old,
      { type: 'InitializeExpedition' },
      select(),
      select('b'),
      select('a', '08715'),
    )
    expect(Object.keys(game.campaignLog!.expedition!.partners)).toHaveLength(9)
    expect(Object.values(game.assets)).toMatchObject([{ code: partner, owner: 'a', noSlot: true }])
    expect(Object.values(dispatch(game, select('b', '08715')).assets)).toHaveLength(2)
  })

  it('keeps damage and horror on resignation and loads them on the resolute card in the next scenario', () => {
    const game = start()
    const asset = Object.values(game.assets)[0]!.id
    const left = dispatch(
      game,
      { type: 'DamageAsset', asset, damage: 1, horror: 2 },
      { type: 'Resign', investigator: 'a' },
    )
    expect(record(left)).toEqual({ status: 'safe', damage: 1, horror: 2 })
    expect(left.assets[asset]).toBeUndefined()
    const resumed = dispatch(
      { ...fresh(), campaignLog: JSON.parse(JSON.stringify(left.campaignLog)) },
      { type: 'InitializeExpedition' },
      { type: 'SetExpeditionPartnerStatus', partner, status: 'resolute' },
      select('b'),
    )
    expect(Object.values(resumed.assets)).toMatchObject([
      { code: resolute, owner: 'b', damage: 1, horror: 2 },
    ])
  })

  it.each(['asset', 'investigator'] as const)(
    'permanently loses the partner on %s defeat',
    (target) => {
      const game = start()
      const asset = Object.values(game.assets)[0]!.id
      const protectedGame = dispatch(
        game,
        { type: 'DiscardAsset', asset },
        { type: 'RemoveAssetFromGame', asset },
        { type: 'ReturnAssetToHand', asset },
      )
      expect(protectedGame.assets[asset]).toBeDefined()
      const defeated = dispatch(
        protectedGame,
        target === 'asset'
          ? { type: 'DamageAsset', asset, damage: 3, horror: 0 }
          : { type: 'DefeatInvestigator', investigator: 'a' },
      )
      expect(defeated.assets[asset]).toBeUndefined()
      expect(record(defeated)?.status).toBe('eliminated')
      expect(
        dispatch({ ...fresh(), campaignLog: defeated.campaignLog! }, select('b')).assets,
      ).toEqual({})
    },
  )

  it('persists surviving partners, the camp, and recovered supplies at scenario end', () => {
    const game = start()
    const asset = Object.values(game.assets)[0]!.id
    const finished = dispatch(
      game,
      { type: 'DamageAsset', asset, damage: 1, horror: 1 },
      { type: 'RecordExpeditionCamp', location: '08513', shelter: 3 },
      { type: 'RecoverExpeditionSupply', supply: '08614' },
      { type: 'RecoverExpeditionSupply', supply: '08614' },
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 }, told: true },
    )
    expect(record(finished)).toEqual({ status: 'safe', damage: 1, horror: 1 })
    expect(finished.campaignLog!.expedition).toMatchObject({
      camp: { location: '08513', shelter: 3 },
      supplies: ['08614'],
    })
  })
})
