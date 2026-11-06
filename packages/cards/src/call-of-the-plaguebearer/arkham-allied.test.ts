import { dispatch, getInvestigator, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { R } from './arkham-allied'
import { dawnGame } from './dawn-testing'
import { emit } from './testing'

// Guía ES p. 12 / EN p. 14: se resuelve al final de Cantos fúnebres.
describe('Interludio III · Arkham unido', () => {
  it('cada Lugar Protegido ofrece su recompensa y el texto oculto da 2 PX y 1 trauma mental', async () => {
    const { mourningChorus } = await import('./mourning-chorus')
    void mourningChorus
    let s: GameState = dawnGame()
    s = {
      ...s,
      scenarioId: 'mourning-chorus',
      scenarioDecks: { ...s.scenarioDecks, chorusRallied: ['78027', '78028'] },
      scenarioMeta: { ...s.scenarioMeta, chorusSite: '78026' },
    }
    s = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } },
    )
    const bodies: string[] = []
    for (let n = 0; n < 30 && s.pending; n++) {
      const q = s.pending.question
      if (q.story?.body) bodies.push(q.story.body)
      const add = q.choices.find((c) => c.label === 'choice.plaguebearer.allied.add')
      const read = q.choices.find((c) => c.label === 'choice.plaguebearer.friends.read')
      s = choose(s, (add ?? read ?? q.choices[0]!).label)
    }
    expect(bodies).toEqual(
      expect.arrayContaining([
        'story.plaguebearer.allied.boarding',
        'story.plaguebearer.allied.library',
        'story.plaguebearer.allied.hidden',
      ]),
    )
    const record = s.campaignLog!.investigators.a!
    expect(record.storyAssets).toEqual(expect.arrayContaining([R.approval, R.tome]))
    expect(record.mentalTrauma).toBe(1)
    expect(s.campaignLog!.notes).toContain('plaguebearerTown78027Rallied')
  })
  it('Tomo sagrado roba 2 cartas y Ampliación de préstamo recibe 2 recursos al empezar el turno', () => {
    let s = emit(
      dawnGame(),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: R.tome },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: R.loan },
    )
    const loan = Object.values(s.assets).find((a) => a.code === R.loan)!
    s = emit(s, { type: 'Forced', trigger: { type: 'turnBegins', investigator: 'a' } })
    expect(s.assets[loan.id]!.uses).toBe(2)
    s = emit(s, { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } })
    expect(s.assets[loan.id]!.uses).toBe(0)
    const hand = getInvestigator(s, 'a').hand.length
    const tome = Object.values(s.assets).find((a) => a.code === R.tome)!
    s = emit(
      s,
      { type: 'ExhaustAsset', asset: tome.id },
      { type: 'DrawCards', investigator: 'a', amount: 2 },
    )
    expect(getInvestigator(s, 'a').hand.length).toBe(hand + 2)
  })
})
