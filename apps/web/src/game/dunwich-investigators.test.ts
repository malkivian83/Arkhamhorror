// Original core investigators (RR Investigator Setup): the cards can be bought and registered; reviewed
// rules are enabled; every card keeps its official EN/ES presentation and scans.
import { expect, it } from 'vitest'
import { allPlayerCardDefs } from '@lcg/engine'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import bonded from '../../../../packages/cards/src/data/dunwich-investigators.json'
import bondedEn from '../../../../packages/cards/src/dunwich-investigators/source-en.json'
import bondedEs from '../../../../packages/cards/src/dunwich-investigators/source-es.json'

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
import { dispatch } from '@lcg/engine'
import { choose, throughSetup } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'
it('round-trips Jim’s pending elder-sign choice without losing the physical token', () => {
  const c = newCampaign('night-of-the-zealot', ['jim'], 'standard')
  let s = throughSetup(startScenario(c, 3))
  s = {
    ...s,
    pending: null,
    queue: [],
    chaosBag: ['elderSign'],
    interactive: true,
    assets: {},
    investigators: s.investigators.map((i) => ({ ...i, hand: [] })),
  }
  s = dispatch(s, {
    type: 'BeginSkillTest',
    investigator: '02004',
    skill: 'willpower',
    difficulty: 1,
    kind: { type: 'effect', source: 'Probe', onSuccess: [], onFail: [], onFailEach: [] },
  })
  s = choose(s, 'choice.revealToken')
  const decoded = decodeSession(
    JSON.stringify(session(s, { base: s, inputs: [], marks: [markOf(s)] }, c)),
  )
  expect(decoded).toBeDefined()
  s = choose(decoded.state!, 'ability.jimSkull')
  expect(s.skillTest!.tokens).toEqual(['skull'])
  s = choose(s, 'choice.applyResults')
  expect(s.chaosBag).toEqual(['elderSign'])
})
