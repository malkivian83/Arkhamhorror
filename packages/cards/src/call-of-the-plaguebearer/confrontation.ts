import { getInvestigator, push, type Choice, type GameState, type Message } from '@lcg/engine'
import { recordNote } from '../scenario-helpers'
import { ask, lead, on, specific } from './helpers'
import { D } from './dawn-data'

/**
 * Interludio V · La confrontación (guía ES p. 20 / EN p. 23). Se lee tras Muerte a la puesta
 * de sol (VII): `confrontation(end)` devuelve sus mensajes para encadenarlos tras sus
 * resoluciones, como el Interludio IV tras el V.
 */
export const CONFRONTATION = {
  warned: 'plaguebearerWarned',
  deathConqueredWest: 'plaguebearerDeathConqueredWest',
  baalshandorFirst: 'plaguebearerBaalshandorFirst',
} as const

const story = (key: string, effects: { key: string }[] = []): Message => ({
  type: 'Story',
  entry: {
    title: 'story.plaguebearer.confrontation.title',
    body: `story.plaguebearer.confrontation.${key}`,
    ...(effects.length ? { effects } : {}),
  },
})

export function confrontation(end: Message): Message[] {
  return [specific('confrontation.start'), end]
}

on('confrontation.start', (s) => {
  // «Si habéis sido advertidos» (VII, resolución oculta): La confrontación 4.
  if (s.campaignLog?.notes.includes(CONFRONTATION.warned)) return push(s, story('section4'))
  return push(s, story('section1'), specific('confrontation.decide'))
})
on('confrontation.decide', (s) =>
  ask(
    s,
    lead(s),
    [
      {
        label: 'choice.plaguebearer.confrontation.distrust',
        then: [
          story('section2', [{ key: 'story.plaguebearer.confrontation.section2Effect' }]),
          // Herbert West sale de cualquier mazo durante el resto de la campaña.
          specific('noon.removeWest'),
          recordNote(CONFRONTATION.deathConqueredWest),
        ],
      },
      {
        label: 'choice.plaguebearer.confrontation.release',
        then: [
          story('section3', [{ key: 'story.plaguebearer.confrontation.section3Effect' }]),
          specific('confrontation.offerWest'),
          recordNote(CONFRONTATION.baalshandorFirst),
        ],
      },
    ],
    'prompt.plaguebearer.confrontation.decide',
  ),
)
const ownsWest = (s: GameState, id: string) => {
  const i = getInvestigator(s, id)
  return (
    [...i.deck, ...i.hand, ...i.discard].includes(D.west) ||
    !!s.campaignLog?.investigators[id]?.storyAssets.includes(D.west) ||
    Object.values(s.assets).some((a) => a.code === D.west && a.owner === id)
  )
}
// La confrontación 3: si Herbert West no está en el mazo de nadie, alguien puede incluirlo.
on('confrontation.offerWest', (s) => {
  if (s.investigators.some((i) => ownsWest(s, i.id))) return s
  return ask(
    s,
    lead(s),
    [
      ...s.investigators.map((i): Choice => ({
        label: 'choice.investigator',
        params: { name: i.name },
        target: { type: 'investigator', id: i.id },
        then: [{ type: 'AddStoryAsset', investigator: i.id, code: D.west }],
      })),
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.confrontation.west',
  )
})
