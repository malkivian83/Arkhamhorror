import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  registerPlayerCards,
  type GameState,
  type Message,
  type StoryEntry,
} from '@lcg/engine'
import {
  earnExperience,
  effectTest,
  noteEffect,
  recordNote,
  storyEntries,
} from '../scenario-helpers'
import { H, HN } from './house-codes'
import { DUNWICH_NOTES as N } from './extracurricular-codes'
const entry = storyEntries('house')
export function storyReward(s: GameState, code: string, story: StoryEntry): Message {
  return {
    type: 'Story',
    entry: story,
    choices: [
      ...s.investigators
        .filter(
          (i) =>
            !s.campaignLog?.investigators[i.id]?.killed &&
            !s.campaignLog?.investigators[i.id]?.insane,
        )
        .map((i) => ({
          label: 'choice.investigator',
          params: { name: i.name },
          then: [{ type: 'AddStoryAsset' as const, investigator: i.id, code }],
        })),
      { label: 'choice.skip', then: [] },
    ],
  }
}
export function armitageInterlude(s: GameState, unconscious = false): Message[] {
  const kidnapped = unconscious || !!s.campaignLog?.notes.includes(N.unconscious)
  const note = kidnapped ? HN.armitageKidnapped : HN.armitageRescued
  return [
    {
      type: 'Story',
      entry: entry(kidnapped ? 'armitage1' : 'armitage2', [
        noteEffect(note),
        ...(kidnapped ? [{ key: 'story.effect.experience', params: { bonus: 2 } }] : []),
      ]),
    },
    recordNote(note),
    ...(kidnapped ? [earnExperience(2)] : [storyReward(s, H.armitage, entry('armitageReward'))]),
  ]
}
registerPlayerCards([
  {
    code: H.morgan,
    name: 'Dr. Francis Morgan',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    cost: 3,
    slots: ['ally'],
    traits: ['Ally', 'Miskatonic'],
    health: 4,
    sanity: 1,
    icons: { combat: 1, wild: 1 },
  },
  {
    code: H.peter,
    name: 'Peter Clover',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    cost: 0,
    traits: ['Humanoid', 'Criminal'],
    health: 3,
    sanity: 2,
  },
  {
    code: H.armitage,
    name: 'Dr. Henry Armitage',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    cost: 2,
    slots: ['ally'],
    traits: ['Ally', 'Miskatonic'],
    health: 2,
    sanity: 2,
    icons: { wild: 2 },
  },
])
const parley: NonNullable<import('@lcg/engine').PlayerCardBehavior['placedAbilities']> = (
  s,
  self,
  i,
) =>
  s.actIndex === 2
    ? [
        {
          key: `${self.id}:parley`,
          label: 'ability.house.parley',
          actions: 1,
          provokes: false,
          parley: true,
          then: [
            effectTest(i, self.name, 'willpower', 3, {
              onSuccess: [
                {
                  type: 'ScenarioSpecific',
                  key: 'hawParley',
                  data: { placed: self.id, investigator: i },
                },
              ],
            }),
          ],
        },
      ]
    : []
registerPlayerCard({
  code: H.morgan,
  placedAbilities: parley,
  skillModifier: (_s, _self, test) => (test.skill === 'combat' ? 1 : 0),
  reactions: (_s, t, self) =>
    t.type === 'enemyDefeated' && t.by === self.owner && !self.exhausted
      ? [
          {
            key: `${self.id}:draw`,
            investigator: self.owner,
            label: 'ability.house.morganDraw',
            then: [
              { type: 'ExhaustAsset', asset: self.id },
              { type: 'DrawCards', investigator: self.owner, amount: 1 },
            ],
          },
        ]
      : [],
})
registerPlayerCard({
  code: H.peter,
  placedAbilities: parley,
  placedForced: (_s, t, self) =>
    t.type === 'enemyPhaseBegins'
      ? [{ type: 'DamagePlacedAsset', placed: self.id, damage: 1, horror: 0 }]
      : [],
  abilities: (s, self) =>
    self.exhausted
      ? []
      : Object.values(s.enemies)
          .filter(
            (e) =>
              e.location === getInvestigator(s, self.owner).location &&
              e.traits?.includes('Criminal'),
          )
          .map((e) => ({
            key: `${self.id}:evade:${e.id}`,
            label: 'ability.house.peterEvade',
            actions: 0,
            provokes: false,
            costs: [{ type: 'ExhaustAsset', asset: self.id }],
            then: [{ type: 'EvadeEnemy', enemy: e.id, by: self.owner }],
          })),
})
registerPlayerCard({
  code: H.armitage,
  reactions: (s, t, self) =>
    t.type === 'afterDrawCard' &&
    t.investigator === self.owner &&
    !self.exhausted &&
    !playerCardDef(t.card)?.weakness &&
    getInvestigator(s, self.owner).hand.includes(t.card)
      ? [
          {
            key: `${self.id}:resources`,
            investigator: self.owner,
            label: 'ability.house.armitageResources',
            then: [
              { type: 'DiscardFromHand', investigator: self.owner, card: t.card },
              { type: 'ExhaustAsset', asset: self.id },
              { type: 'GainResources', investigator: self.owner, amount: 3 },
            ],
          },
        ]
      : [],
})
