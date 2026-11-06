import type { ChaosToken, GameState, Message } from '@lcg/engine'
import { recordNote } from '../scenario-helpers'
import { ask, on, specific } from './helpers'
import { N } from './night-data'

/** Lectores del texto oculto 5: empiezan el escenario III con 1 horror y 1 carta más. */
export const CURIOSITY = 'plaguebearerCuriosity'
const story = (key: string, effects: { key: string }[] = []) => ({
  title: 'story.plaguebearer.friends.title',
  body: `story.plaguebearer.friends.${key}`,
  effects,
})
const tokens = (token: ChaosToken): Message => ({ type: 'AddChaosTokens', tokens: [token] })

/**
 * Interludio I · Amigos en los bajos fondos (guía ES p. 6, EN p. 6). Se resuelve al
 * final del escenario II; `covered` es «Hibb te cubre las espaldas» o «Arkham
 * permanece unida», anotados en esa misma resolución.
 */
export function friendsInLowPlaces(s: GameState, covered: boolean, end: Message): Message[] {
  const hidden = (gift: boolean) => [
    specific('plaguebearer.friendsHidden', { index: 0, gift }),
    end,
  ]
  if (!covered)
    return [
      {
        type: 'Story',
        entry: story('section4', [
          { key: 'story.plaguebearer.friends.giftEffect' },
          { key: 'story.plaguebearer.friends.tabletEffect' },
        ]),
      },
      recordNote('plaguebearerTwistedGift'),
      tokens('tablet'),
      ...hidden(true),
    ]
  const secret = s.campaignLog?.notes.includes('plaguebearerMotel')
  const second: Message[] = secret
    ? [
        {
          type: 'Story',
          entry: story('section2', [
            { key: 'story.plaguebearer.friends.hibbsEffect' },
            { key: 'story.plaguebearer.friends.cultistEffect' },
          ]),
          choices: [
            ...s.investigators.map((i) => ({
              label: 'choice.plaguebearer.friends.hibbs',
              params: { name: i.name },
              then: [
                { type: 'AddStoryAsset' as const, investigator: i.id, code: N.hibbs },
                tokens('cultist'),
                ...hidden(false),
              ],
            })),
            {
              label: 'choice.plaguebearer.friends.noHibbs',
              then: [tokens('cultist'), ...hidden(false)],
            },
          ],
        },
      ]
    : [
        {
          type: 'Story',
          entry: story('section3', [{ key: 'story.plaguebearer.friends.skullEffect' }]),
        },
        tokens('skull'),
        ...hidden(false),
      ]
  return [
    {
      type: 'Story',
      entry: story('section1', [{ key: 'story.plaguebearer.friends.helpEffect' }]),
    },
    recordNote('plaguebearerHibbsHelping'),
    ...second,
  ]
}

on('plaguebearer.friendsHidden', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i) return s
  const next = specific('plaguebearer.friendsHidden', { index: index + 1, gift: d.gift! })
  const readers = JSON.parse(s.campaignLog?.values[CURIOSITY] ?? '[]') as string[]
  return ask(
    s,
    i.id,
    [
      {
        label: 'choice.plaguebearer.friends.read',
        then: [
          {
            type: 'Story',
            entry: {
              title: 'story.plaguebearer.hiddenTitle',
              body: d.gift
                ? 'story.plaguebearer.friends.hiddenGift'
                : 'story.plaguebearer.friends.hidden',
              effects: [{ key: 'story.plaguebearer.friends.hiddenEffect' }],
            },
          },
          recordNote(CURIOSITY, JSON.stringify([...readers, i.id])),
          next,
        ],
      },
      { label: 'choice.skip', then: [next] },
    ],
    'prompt.plaguebearer.friendsHidden',
  )
})
