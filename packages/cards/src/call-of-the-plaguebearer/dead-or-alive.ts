import {
  push,
  registerPlayerCard,
  registerPlayerCards,
  type Choice,
  type GameState,
  type Message,
} from '@lcg/engine'
import { recordNote } from '../scenario-helpers'
import { C, ask, on, specific } from './helpers'
import { D } from './dawn-data'

/**
 * Interludio II · Vivo o muerto (guía ES p. 9, EN pp. 10–11). Sigue a las
 * resoluciones 2–4 de Muerte al amanecer; la R5 lo salta.
 */
const story = (key: string, effects: { key: string }[] = []) => ({
  title: 'story.plaguebearer.alive.title',
  body: `story.plaguebearer.alive.${key}`,
  effects,
})
export function deadOrAlive(s: GameState, taken: boolean, end: Message): Message[] {
  const respect = !!s.campaignLog?.notes.includes('plaguebearerRespect')
  const sections = respect ? [1, taken ? 3 : 4, 6] : taken ? [2, 8] : [2, 5, 6]
  const finale = sections.includes(6) ? 7 : 8
  const holder = s.investigators.find((i) =>
    s.campaignLog?.investigators[i.id]?.storyAssets.includes(C.briefcase),
  )
  const choose: Message[] = [
    ...(finale === 7 ? [{ type: 'Story', entry: story('section7') } as Message] : []),
    specific('alive.path', { index: 0, finale }),
    end,
  ]
  const briefcase: Message[] =
    holder && finale === 7
      ? [
          {
            type: 'Story',
            entry: story('section6', [
              { key: 'story.plaguebearer.alive.briefcaseEffect' },
              { key: 'story.plaguebearer.alive.hideEffect' },
            ]),
            choices: [
              {
                label: 'choice.plaguebearer.alive.handOver',
                then: [
                  specific('alive.removeBriefcase', { investigator: holder.id }),
                  recordNote('plaguebearerWestReagent'),
                  specific('alive.west'),
                  ...choose,
                ],
              },
              {
                label: 'choice.plaguebearer.alive.hide',
                then: [recordNote('plaguebearerHidBriefcase'), ...choose],
              },
            ],
          },
        ]
      : [
          ...(finale === 7 ? [{ type: 'Story', entry: story('section6') } as Message] : []),
          ...choose,
        ]
  return [
    ...sections
      .filter((n) => n !== 6)
      .map((n): Message => ({ type: 'Story', entry: story(`section${n}`) })),
    ...briefcase,
  ]
}

on('alive.west', (s) =>
  ask(
    s,
    s.investigators[0]!.id,
    [
      ...s.investigators.map((i): Choice => ({
        label: 'choice.plaguebearer.alive.west',
        params: { name: i.name },
        then: [{ type: 'AddStoryAsset', investigator: i.id, code: D.west }],
      })),
      { label: 'choice.plaguebearer.alive.noWest', then: [] },
    ],
    'prompt.plaguebearer.alive.west',
  ),
)
on('alive.removeBriefcase', (s, d) => {
  const by = String(d.investigator),
    log = s.campaignLog,
    record = log?.investigators[by]
  if (!log || !record) return s
  const index = record.storyAssets.indexOf(C.briefcase)
  return {
    ...s,
    campaignLog: {
      ...log,
      investigators: {
        ...log.investigators,
        [by]: { ...record, storyAssets: record.storyAssets.filter((_, n) => n !== index) },
      },
    },
  }
})
// Cada investigador decide individualmente; quien se inyectó un reactivo puro debe aceptar.
on('alive.path', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i) return s
  const next = specific('alive.path', { index: index + 1, finale: d.finale! })
  const injected = (
    JSON.parse(s.campaignLog?.values.plaguebearerReagent ?? '[]') as string[]
  ).includes(i.id)
  const perks: Message[] = [
    {
      type: 'Story',
      entry: {
        title: 'story.plaguebearer.alive.perksTitle',
        body: 'story.plaguebearer.alive.perks',
        effects: [{ key: 'story.plaguebearer.alive.perksEffect' }],
      },
    },
    { type: 'AddStoryAsset', investigator: i.id, code: D.strength },
    { type: 'AddStoryAsset', investigator: i.id, code: D.deathsHold },
    next,
  ]
  const good: Message[] = [
    {
      type: 'Story',
      entry: {
        title: 'story.plaguebearer.alive.goodTitle',
        body: 'story.plaguebearer.alive.good',
        effects: [{ key: 'story.plaguebearer.alive.goodEffect' }],
      },
    },
    { type: 'AddStoryAsset', investigator: i.id, code: D.will },
    { type: 'AddStoryAsset', investigator: i.id, code: D.folly },
    next,
  ]
  if (injected) return push(s, ...perks)
  return ask(
    s,
    i.id,
    [
      { label: 'choice.plaguebearer.alive.perks', then: perks },
      { label: `choice.plaguebearer.alive.good${Number(d.finale)}`, then: good },
    ],
    'prompt.plaguebearer.alive.path',
  )
})

// La Fuerza de la Carne y Voluntad inquebrantable: talentos permanentes que absorben
// daño u horror y se curan al tener éxito revelando calavera o sectario.
registerPlayerCards([
  {
    code: D.strength,
    name: 'Strength of Flesh',
    type: 'asset',
    class: 'neutral',
    story: true,
    traits: ['Geist', 'Talent'],
    slots: [],
    health: 2,
    icons: {},
  },
  {
    code: D.will,
    name: 'Unbreakable Will',
    type: 'asset',
    class: 'neutral',
    story: true,
    traits: ['Human', 'Talent'],
    slots: [],
    sanity: 2,
    icons: {},
  },
])
for (const [code, token, field] of [
  [D.strength, 'skull', 'damage'],
  [D.will, 'cultist', 'horror'],
] as const)
  registerPlayerCard({
    code,
    permanent: {},
    cannotLeavePlay: () => true,
    reactions: (s, t, a) =>
      t.type === 'afterSkillTest' &&
      t.succeeded &&
      t.investigator === a.owner &&
      !a.exhausted &&
      a[field] > 0 &&
      s.skillTest?.tokens.includes(token)
        ? [
            {
              key: `${a.id}:heal`,
              investigator: a.owner,
              label: `ability.plaguebearer.alive.${field}`,
              then: [
                { type: 'ExhaustAsset', asset: a.id },
                {
                  type: 'HealAsset',
                  asset: a.id,
                  damage: field === 'damage' ? a.damage : 0,
                  horror: field === 'horror' ? a.horror : 0,
                },
              ],
            },
          ]
        : [],
  })
