import { canAffordEntry, dispatch, getInvestigator, type ExpeditionPartner } from '@lcg/engine'
import { choose, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import {
  canPlayNext,
  currentScenario,
  finishScenario,
  newCampaign,
  startScenario,
} from '../campaign'
import { iceMessage } from './ice-and-death'
import { CRASH, ICE_AND_DEATH } from './ice-and-death-cards'

// Guía de campaña, pp. 3–11: prólogo, preparación y resolución 1 de Hielo y muerte I.
describe('Hielo y muerte I en campaña', () => {
  it('cobra la entrada a Ventisqueros anchos solo a los investigadores en el Lugar de origen', () => {
    const campaign = newCampaign('edge-of-the-earth', ['daniela', 'joe'], 'standard')
    let game = throughSetup(startScenario(campaign, 44))
    for (let i = 0; i < 2; i++) game = throughSetup(choose(game, 'choice.edgeOfTheEarth.noPartner'))
    const [mover, payer] = game.investigators.map((i) => i.id) as [string, string]
    const initial = { ...game, pending: null, queue: [] }
    const shore = dispatch(initial, { type: 'MoveTo', investigator: mover, location: '08503' })
    expect(shore.locations['08506']?.revealed).toBe(false)
    const remote = {
      ...shore,
      investigators: shore.investigators.map((i) => (i.id === payer ? { ...i, clues: 2 } : i)),
    }
    const enter = { type: 'MoveTo' as const, investigator: mover, location: '08506' }
    expect(canAffordEntry(remote, '08506', mover)).toBe(false)
    expect(getInvestigator(dispatch(remote, enter), mover).location).toBe('08503')
    const nearby = dispatch(remote, { type: 'MoveTo', investigator: payer, location: '08503' })
    expect(canAffordEntry(nearby, '08506', mover)).toBe(true)
    const paid = dispatch(nearby, enter)
    expect(getInvestigator(paid, mover).location).toBe('08506')
    expect(getInvestigator(paid, payer).clues).toBe(0)
    expect(paid.locations['08506']?.clues).toBe(4)
  })

  it('el plan final asigna una debilidad y conduce a la resolución desde el campamento', () => {
    const campaign = newCampaign('edge-of-the-earth', ['daniela'], 'standard')
    const setup = throughSetup(startScenario(campaign, 44))
    const game = throughSetup(choose(setup, 'choice.edgeOfTheEarth.noPartner'))
    const investigator = game.investigators[0]!.id
    const finalAgenda = {
      ...game,
      pending: null,
      queue: [],
      agendaIndex: 2,
      locations: Object.fromEntries(
        Object.entries(game.locations).map(([id, location]) => [
          id,
          id === CRASH ? location : { ...location, clues: 1 },
        ]),
      ),
    }
    const ended = throughSetup(dispatch(finalAgenda, { type: 'AdvanceAgenda' }))
    expect(ended.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(ended.campaignLog?.expedition?.camp?.location).toBe(CRASH)
    expect(ended.tekeliliDeck).toHaveLength(15)
    expect(ended.campaignLog?.investigators[investigator]?.storyAssets).toEqual([
      expect.stringMatching(/^0872[3-9]$/),
    ])
  })

  it.each([false, true])(
    'conserva la retirada de Helada del barco al reconstruir la bolsa (ficha añadida: %s)',
    (added) => {
      const campaign = newCampaign('edge-of-the-earth', ['daniela'], 'standard')
      const prepared = throughSetup(
        choose(startScenario(campaign, 44), 'choice.edgeOfTheEarth.believeDyer'),
      )
      const game = throughSetup(choose(prepared, 'choice.edgeOfTheEarth.noPartner'))
      const investigator = game.investigators[0]!.id
      const cleared = { ...game, pending: null, queue: [] }
      const before = added
        ? dispatch(cleared, { type: 'AddChaosTokens', tokens: ['frost'] })
        : cleared
      const ship = dispatch(before, iceMessage('ship', { investigator }))
      const searched = choose(ship, 'choice.edgeOfTheEarth.removeFrost')
      expect(searched.campaignLog?.notes).toContain('edgeOfTheEarthShipSearched')
      const expected = added ? 1 : 0
      expect(searched.chaosBag.filter((token) => token === 'frost')).toHaveLength(expected)
      const rebuilt = startScenario({ ...campaign, log: searched.campaignLog! }, 44)
      expect(rebuilt.chaosBag.filter((token) => token === 'frost')).toHaveLength(expected)
    },
  )

  it('inicia desde el registro y guarda la resolución y el campamento al avanzar', () => {
    const campaign = newCampaign('edge-of-the-earth', ['daniela'], 'expert')
    expect(canPlayNext(campaign)).toBe(true)
    const opening = startScenario(campaign, 44)
    expect(opening.scenarioId).toBe(ICE_AND_DEATH)
    const setup = throughSetup(choose(opening, 'choice.edgeOfTheEarth.believeDyer'))
    expect(setup.pending?.question.prompt).toBe('prompt.edgeOfTheEarth.partner')
    const victim = setup.campaignLog!.values.edgeOfTheEarthCrash as ExpeditionPartner
    expect(setup.campaignLog?.expedition?.partners[victim]?.status).toBe('eliminated')
    expect(
      setup.pending?.question.choices.filter((choice) => choice.label === 'choice.card'),
    ).toHaveLength(8)
    const playing = throughSetup(choose(setup, 'choice.card'))
    const investigator = playing.investigators[0]!.id
    expect(getInvestigator(playing, investigator).location).toBe(CRASH)
    expect(playing.chaosBag.filter((token) => token === 'frost')).toHaveLength(3)
    expect(playing.chaosBag.filter((token) => token === 'cultist')).toHaveLength(2)
    expect(playing.tekeliliDeck).toHaveLength(16)
    expect(playing.doom).toBe(2)
    expect(Object.keys(playing.locations)).toEqual(['08502', '08503', '08504', '08505'])
    expect(Object.values(playing.assets).filter((asset) => asset.expeditionPartner)).toHaveLength(1)
    expect(playing.encounterDeck.some((card) => card.code === '08689')).toBe(false)

    const ended = throughSetup(choose(playing, 'ability.edgeOfTheEarth.camp'))
    expect(ended.outcome).toEqual({ type: 'resolution', resolution: 1 })
    const next = finishScenario(campaign, ended)
    expect(next.log.expedition?.camp).toEqual({ location: CRASH, shelter: 0 })
    expect(next.log.chaosTokens).toEqual(['cultist'])
    expect(next.results[0]?.xp[investigator]).toBe(3)
    expect(currentScenario(next)).toBe('ice-and-death-checkpoint-1')
    expect(canPlayNext(next)).toBe(false)
  })
})
