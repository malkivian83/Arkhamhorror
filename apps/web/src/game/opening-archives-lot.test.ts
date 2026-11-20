// Lot 152 (RR Actions, Activate, Costs): the cards can be bought and registered; reviewed
// rules are enabled; every card keeps its official EN/ES presentation and scans.
import { expect, it } from 'vitest'
import { allPlayerCardDefs, dispatch } from '@lcg/engine'
import { throughSetup } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'
import { newCampaign, startScenario } from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import bonded from '../../../../packages/cards/src/data/opening-archives.json'
import bondedEn from '../../../../packages/cards/src/opening-archives/source-en.json'
import bondedEs from '../../../../packages/cards/src/opening-archives/source-es.json'

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

it('preserves the hidden Market deck and its pending ordering choice in a session save', () => {
  const c = newCampaign('night-of-the-zealot', ['tommy'], 'standard')
  let s = throughSetup(startScenario(c, 3))
  const by = s.investigators[0]!.id
  s = {
    ...s,
    pending: null,
    queue: [],
    assets: {
      ...s.assets,
      market: {
        id: 'market',
        code: '09077',
        owner: by,
        uses: 0,
        damage: 0,
        horror: 0,
        exhausted: false,
        storedCards: [
          { code: '01090', owner: by },
          { code: '01089', owner: by },
        ],
      },
    },
  }
  s = dispatch(s, {
    type: 'PlayerCardEffect',
    code: '09077',
    investigator: by,
    step: 'bottom',
    data: { asset: 'market', left: 2 },
  })
  const restored = decodeSession(
    JSON.stringify(session(s, { base: s, inputs: [], marks: [markOf(s)] }, c)),
  )
  expect(restored.state!.assets.market!.storedCards).toEqual(s.assets.market!.storedCards)
  expect(restored.state!.pending).toEqual(s.pending)
})
