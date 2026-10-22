import { playerCardDef } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { game, patch } from '../dunwich-pilot/testing'

// RR: Deckbuilding. New codes and levels must enter legal decks exactly once.
describe('reactive events inventory and campaign integration', () => {
  it('honors the round restriction on playing events in both reaction windows', () => {
    const initial = game()
    const blocked = during(
      initial,
      patch({
        hand: ['01023', '01080'],
        blockedTypes: [{ cardType: 'event', round: initial.round }],
      }),
      spawnAt('A', ghoul, 'a'),
    )
    const attack = during(blocked, (s) => s, {
      type: 'EnemyAttack',
      enemy: Object.keys(blocked.enemies)[0]!,
      investigator: 'a',
      exhaustAfter: false,
    })
    expect(attack.investigators[0]!.damage).toBe(1)
    const failed = during(blocked, (s) => s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 5,
      kind: { type: 'investigate', location: 'A' },
    })
    expect(failed.investigators[0]!.clues).toBe(0)
    expect(failed.pending?.question.choices.some((c) => c.params?.card === 'Lucky!')).toBeFalsy()
  })
  it('does not offer a redundant cancellation to a second player', () => {
    let s = during(game(['a', 'b']), patch({ hand: ['01023'] }), spawnAt('A', ghoul, 'a'))
    s = during(s, patch({ hand: ['01023'] }, 'b'), {
      type: 'EnemyAttack',
      enemy: Object.keys(s.enemies)[0]!,
      investigator: 'a',
      exhaustAfter: false,
    })
    s = choose(s, 'ability.playCard', { card: 'Dodge' })
    expect(s.investigators[1]!.hand).toContain('01023')
    expect(s.pending?.question.prompt).not.toBe('prompt.reaction')
  })
  for (const code of ['01023', '01080'])
    it(`purchases ${code} and starts a legal scenario`, () => {
      let campaign = newCampaign(
        'brethren-of-ash',
        [code === '01023' ? 'daniela' : 'isabelle'],
        'easy',
      )
      const id = campaign.investigators[0]!.id
      campaign.log.investigators[id]!.xp = 2
      expect(purchaseOptions(campaign, id).filter((c) => c.code === code)).toHaveLength(1)
      campaign = purchase(campaign, id, code, {
        remove: campaign.investigators[0]!.deck.find(isStandard)!,
      })
      const i = startScenario(campaign, 3, false).investigators[0]!
      expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
      expect(playerCardDef(code)!.fast).toBe(true)
    })
})
