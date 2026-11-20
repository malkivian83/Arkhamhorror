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
import bonded from '../../../../packages/cards/src/data/field-support.json'
import bondedEn from '../../../../packages/cards/src/field-support/source-en.json'
import bondedEs from '../../../../packages/cards/src/field-support/source-es.json'

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

it('saves Katja’s stored cards and a pending choice between drawn encounters', () => {
  const c = newCampaign('night-of-the-zealot', ['tommy'], 'standard')
  let s = throughSetup(startScenario(c, 3))
  const by = s.investigators[0]!.id
  s = {
    ...s,
    pending: null,
    queue: [],
    assets: {
      ...s.assets,
      katja: {
        id: 'katja',
        code: '09114',
        owner: by,
        uses: 0,
        damage: 0,
        horror: 0,
        exhausted: false,
        storedCards: [{ code: '12090', owner: by }],
      },
    },
    encounterDeck: [{ kind: 'treachery', code: '01166', name: 'Test', keywords: [] }],
  }
  const message = {
    type: 'ResolveEncounterCard' as const,
    investigator: by,
    card: s.encounterDeck[0]!,
    draw: { id: 'original', stage: 'resolve' as const },
  }
  s = dispatch(
    { ...s, queue: [message] },
    { ...message, draw: { id: 'second', stage: 'resolve' }, chooseWith: 'original' },
  )
  const restored = decodeSession(
    JSON.stringify(session(s, { base: s, inputs: [], marks: [markOf(s)] }, c)),
  )
  expect(restored.state!.assets.katja!.storedCards).toEqual(s.assets.katja!.storedCards)
  expect(restored.state!.pending).toEqual(s.pending)
  expect(restored.state!.queue).toEqual(s.queue)
})
