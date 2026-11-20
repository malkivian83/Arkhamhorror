// Lot 157 (RR Uses, Moving, Research, Attach To): the cards can be bought and registered; reviewed
// rules are enabled; every card keeps its official EN/ES presentation and scans.
import { expect, it } from 'vitest'
import { allPlayerCardDefs } from '@lcg/engine'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import bonded from '../../../../packages/cards/src/data/chaos-selection.json'
import bondedEn from '../../../../packages/cards/src/chaos-selection/source-en.json'
import bondedEs from '../../../../packages/cards/src/chaos-selection/source-es.json'

it.each(bonded)('$code has its official EN/ES presentation and scans', (card) => {
  expect(allPlayerCardDefs().filter((c) => c.code === card.code)).toHaveLength(1)
  for (const lang of ['en', 'es'] as const) {
    const source = (lang === 'en' ? bondedEn : bondedEs).find((c) => c.code === card.code)!
    const shown = fallbackCards(lang).filter((c) => c.code === card.code)
    expect(shown).toHaveLength(1)
    expect(shown[0]).toMatchObject({
      name: source.name,
      text: source.text,
      traits: source.traits,
    })
    expect(cardImages(card.code, false, lang)[0]).toBe(
      `/local-assets/cards/${lang}/${card.code}.avif`,
    )
  }
})
import { newCampaign, startScenario } from '@lcg/cards'
import { dispatch, playerCardBehavior } from '@lcg/engine'
import { choose, throughSetup } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'
it('round-trips a pending two-token choice and resolves both physical tokens afterwards', () => {
  const c = newCampaign('night-of-the-zealot', ['tommy'], 'standard')
  let s = throughSetup(startScenario(c, 3))
  const by = s.investigators[0]!.id
  s = {
    ...s,
    pending: null,
    queue: [],
    chaosBag: [0, -1, -2],
    assets: {
      olive: {
        id: 'olive',
        code: '04197',
        owner: by,
        uses: 0,
        damage: 0,
        horror: 0,
        exhausted: false,
      },
    },
    investigators: s.investigators.map((i) => ({ ...i, hand: [] })),
  }
  s = dispatch(
    s,
    ...playerCardBehavior('04197')!.wouldRevealOptions!(s, s.assets.olive!)[0]!.then,
    {
      type: 'BeginSkillTest',
      investigator: by,
      skill: 'willpower',
      difficulty: 1,
      kind: { type: 'effect', source: 'Save test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  s = choose(s, 'choice.revealToken')
  s = choose(s, 'choice.resolveToken', { token: '0' })
  const restored = decodeSession(
    JSON.stringify(session(s, { base: s, inputs: [], marks: [markOf(s)] }, c)),
  )
  expect(restored.state!.pending).toEqual(s.pending)
  const chosen = choose(restored.state!, 'choice.resolveToken', { token: '-1' })
  expect(chosen.skillTest!.tokens).toEqual([0, -1])
  expect(chosen.skillTest!.ignoredTokens).toEqual([-2])
  expect(chosen.assets.olive!.exhausted).toBe(true)
})
