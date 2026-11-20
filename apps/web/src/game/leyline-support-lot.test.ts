// Lot 156 (RR Uses, Moving, Research, Attach To): the cards can be bought and registered; reviewed
// rules are enabled; every card keeps its official EN/ES presentation and scans.
import { expect, it } from 'vitest'
import { allPlayerCardDefs } from '@lcg/engine'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import bonded from '../../../../packages/cards/src/data/leyline-support.json'
import bondedEn from '../../../../packages/cards/src/leyline-support/source-en.json'
import bondedEs from '../../../../packages/cards/src/leyline-support/source-es.json'

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
import { throughSetup } from '@lcg/engine/testing'
import { newCampaign, startScenario } from '@lcg/cards'
import { decodeSession, session } from './session'
import { markOf } from './undo'
it('round-trips shared leylines and the pending choice about consuming a line', () => {
  const c = newCampaign('night-of-the-zealot', ['tommy'], 'standard')
  const s = throughSetup(startScenario(c, 3)),
    by = s.investigators[0]!.id
  const loc = Object.keys(s.locations)[0]!
  s.locations[loc]!.leylines = 2
  s.investigators[0]!.leylines = 1
  s.assets.archive = {
    id: 'archive',
    code: '08042',
    owner: by,
    uses: 3,
    damage: 0,
    horror: 0,
    exhausted: false,
  }
  s.agendaEvents = { '11091': { owner: by, skill: 'combat', bonus: 2 } }
  s.queue = []
  s.pending = {
    investigator: by,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.pilotTarget',
      choices: [
        {
          label: 'choice.conduitRemove',
          then: [{ type: 'AdjustLeylines', target: { type: 'location', id: loc }, amount: -1 }],
        },
      ],
    },
  }
  const restored = decodeSession(
    JSON.stringify(session(s, { base: s, inputs: [], marks: [markOf(s)] }, c)),
  )
  expect(restored.state!.locations[loc]!.leylines).toBe(2)
  expect(restored.state!.investigators[0]!.leylines).toBe(1)
  expect(restored.state!.assets.archive!.uses).toBe(3)
  expect(restored.state!.agendaEvents).toEqual(s.agendaEvents)
  expect(restored.state!.pending).toEqual(s.pending)
})
