// RR: Base values, Mythos, Skill Tests ST.1/ST.3, Uses, Additional Actions, Seal, Equipment Slots.
import {
  getInvestigator,
  turnActionTiming,
  playerCardDef,
  type Message,
  type SkillType,
} from '@lcg/engine'
import {
  ask,
  cardName,
  local,
  exhaust,
  spend,
  option,
  registerAdvancedCard as registerPlayerCard,
} from './common'
const skills: SkillType[] = ['willpower', 'intellect', 'combat', 'agility']
export function registerAdvancedAsset(code: string): boolean {
  if (code === '02310') {
    registerPlayerCard({
      code,
      minimumSkillBase: (_s, a, t) => (a.form?.split(':').includes(t.skill) ? 6 : 0),
      reactions: (_s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? [
              option(
                a,
                ask(
                  a.owner,
                  skills.map((first) => ({
                    label: 'skill.' + first,
                    then: ask(
                      a.owner,
                      skills
                        .filter((second) => second !== first)
                        .map((second) => ({
                          label: 'skill.' + second,
                          then: [{ type: 'SetAssetForm', asset: a.id, form: first + ':' + second }],
                        })),
                      true,
                    ),
                  })),
                  true,
                ),
              ),
            ]
          : [],
      forced: (_s, t, a) =>
        t.type === 'mythosPhaseEnds' ? [{ type: 'DiscardAsset', asset: a.id }] : [],
    })
    return true
  }
  if (code === '07225') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        if (
          t.type === 'afterSkillTestInitiated' &&
          t.investigator === a.owner &&
          turnActionTiming(s, a.owner) !== null &&
          !a.exhausted
        )
          return [
            option(a, [
              exhaust(a),
              { type: 'ModifySkillTest', baseSkill: 5 },
              {
                type: 'WatchTestToken',
                key: a.id + ':bless',
                token: 'bless',
                then: [{ type: 'ReadyAsset', asset: a.id }],
              },
              {
                type: 'WatchTestToken',
                key: a.id + ':curse',
                token: 'curse',
                then: ask(
                  a.owner,
                  [
                    {
                      label: 'choice.gainAction',
                      then: [{ type: 'GainActions', investigator: a.owner, amount: 1 }],
                    },
                    { label: 'choice.skip', then: [] },
                  ],
                  true,
                ),
              },
            ]),
          ]
        return []
      },
    })
    return true
  }
  if (code === '04307') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'afterSkillTestInitiated' &&
        s.skillTest?.revelation &&
        !s.skillTest.noTokens &&
        a.uses > 0 &&
        local(s, s.skillTest, a.owner)
          ? [option(a, [spend(a), { type: 'ModifySkillTest', noTokens: true }])]
          : [],
      abilities: (s, a) =>
        a.uses > 0
          ? s.investigators
              .filter(
                (i) =>
                  !i.eliminated &&
                  i.location !== null &&
                  i.location === getInvestigator(s, a.owner).location,
              )
              .map((i) => ({
                key: a.id + ':skip:' + i.id,
                label: 'ability.advancedTest',
                params: { card: cardName(code), name: i.name },
                actions: 1,
                provokes: true,
                costs: [spend(a)],
                then: [{ type: 'SkipNextRoundTestTokens', investigator: i.id }],
              }))
          : [],
    })
    return true
  }
  if (code === '07220') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (t.skill === 'willpower' ? 1 : 0),
      reactions: (s, t, a) =>
        t.type === 'afterSkillTest' &&
        t.succeeded &&
        t.investigator === a.owner &&
        s.skillTest?.skill === 'willpower' &&
        s.skillTest.onTreachery &&
        !a.exhausted
          ? [
              option(a, [
                exhaust(a),
                { type: 'AddChaosTokens', tokens: ['bless', 'bless'], scenarioOnly: true },
              ]),
            ]
          : [],
    })
    return true
  }
  if (code === '60406') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'afterSkillTestInitiated' &&
        s.skillTest &&
        !s.skillTest.noTokens &&
        !s.skillTest.earlyReveal &&
        !s.skillTest.earlyRevealDone &&
        !a.exhausted &&
        a.uses > 0 &&
        local(s, s.skillTest, a.owner)
          ? [option(a, [exhaust(a), spend(a), { type: 'ModifySkillTest', earlyReveal: true }])]
          : [],
    })
    return true
  }
  const empower = { '06241': 'combat', '06242': 'agility', '06243': 'intellect' } as const
  if (code in empower) {
    const skill = empower[code as keyof typeof empower]
    const kind = { combat: 'fight', agility: 'evade', intellect: 'investigate' }[skill]
    registerPlayerCard({
      code,
      sharedSlot: { key: 'empower-self', size: 3 },
      deckLimitBySubtitle: true,
      reactions: (s, t, a) =>
        t.type === 'afterSkillTestInitiated' &&
        s.skillTest?.investigator === a.owner &&
        s.skillTest.skill === 'willpower' &&
        s.skillTest.kind.type === kind &&
        !s.skillTest.basicAction
          ? [
              {
                ...option(a, [{ type: 'ModifySkillTest', skill, preserveModifier: true }]),
                label: 'ability.advancedUse' + skill[0]!.toUpperCase() + skill.slice(1),
              },
            ]
          : [],
      testOptions: (_s, t, a) =>
        t.investigator === a.owner && t.skill === skill && !a.exhausted
          ? [option(a, [exhaust(a), { type: 'BoostSkillTest', amount: 2 }])]
          : [],
    })
    return true
  }
  if (code === '11038') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        if (t.type === 'afterTokenManipulated' && t.investigator === a.owner && !a.exhausted)
          return [option(a, [exhaust(a), { type: 'AddUses', asset: a.id, amount: 1 }])]
        if (
          t.type !== 'whenEnemyAttacks' ||
          a.exhausted ||
          a.uses < 1 ||
          getInvestigator(s, t.investigator).location !== getInvestigator(s, a.owner).location
        )
          return []
        return [
          option(a, [
            exhaust(a),
            spend(a),
            { type: 'DiscoverClues', investigator: a.owner, amount: 1 },
            ...(s.enemies[t.enemy]?.traits?.includes('Geist')
              ? [{ type: 'DamageEnemy', enemy: t.enemy, amount: 1, by: a.owner } as Message]
              : []),
          ]),
        ]
      },
    })
    return true
  }
  if (code === '11103') {
    registerPlayerCard({
      code,
      requiredInvestigatorTraits: ['Blessed', 'Cursed', 'Sorcerer'],
      skillModifier: (_s, _a, t) =>
        playerCardDef(t.effectSource ?? '')?.type === 'event' &&
        playerCardDef(t.effectSource ?? '')?.traits.includes('Spell')
          ? 1
          : 0,
      testOptions: (_s, t, a) =>
        t.investigator === a.owner &&
        playerCardDef(t.effectSource ?? '')?.type === 'event' &&
        playerCardDef(t.effectSource ?? '')?.traits.includes('Spell') &&
        !t.abilityCounts?.[a.id + ':sutra'] &&
        !t.tokens.length &&
        !t.revealing
          ? [1, 2, 3].map((n) => ({
              ...option(
                a,
                [
                  { type: 'ModifySkillTest', use: a.id + ':sutra' },
                  { type: 'TakeDamage', investigator: a.owner, damage: 0, horror: n },
                  {
                    type: 'ReplaceNextTokenReveal',
                    replacement: { investigator: a.owner, reveal: n + 1 },
                  },
                ],
                ':' + n,
              ),
              label: 'ability.advancedHorror',
              params: { card: cardName(code), n },
            }))
          : [],
    })
    return true
  }
  if (code === '10020' || code === '10033') {
    registerPlayerCard({
      code,
      lendsUses: { traits: [], types: ['supply', 'ammo'] },
      ...(code === '10033'
        ? {
            reactions: (s, t, a) => {
              if (t.type !== 'afterUsesSpent' || t.asset.id !== a.id || a.exhausted) return []
              const target = t.forAsset ?? a.id
              const pending = s.queue.some(
                (m) => m.type === 'BeginSkillTest' && m.source === target,
              )
              return pending || s.skillTest?.source === target
                ? [
                    option(a, [
                      exhaust(a),
                      { type: 'BoostTestFromAsset', asset: target, amount: 2 },
                    ]),
                  ]
                : []
            },
          }
        : {}),
    })
    return true
  }
  return false
}
