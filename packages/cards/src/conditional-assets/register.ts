// RR: Reactions, Complete Resolution, Myriad, Healing, Constant Abilities, Skill Tests.
import {
  registerPlayerCard,
  playerCardDef,
  getInvestigator,
  type GameState,
  type Choice,
  type ChaosToken,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { registerTokenSkill } from '../token-skills/register'
const local = (s: GameState, by: string) => {
  const here = getInvestigator(s, by).location
  return here === null ? [] : s.investigators.filter((i) => !i.eliminated && i.location === here)
}
const healChoices = (s: GameState, by: string): Choice[] => {
  const nearby = local(s, by)
  return [
    ...nearby.flatMap((i) =>
      (['damage', 'horror'] as const)
        .filter((kind) => i[kind] > 0)
        .map((kind) => ({
          label:
            kind === 'damage' ? 'choice.conditionalHealDamage' : 'choice.conditionalHealHorror',
          params: { name: i.name },
          target: { type: 'investigator' as const, id: i.id },
          then: [
            {
              type: 'Heal' as const,
              investigator: i.id,
              damage: kind === 'damage' ? 1 : 0,
              horror: kind === 'horror' ? 1 : 0,
            },
          ],
        })),
    ),
    ...Object.values(s.assets)
      .filter(
        (a) =>
          nearby.some((i) => i.id === a.owner) && playerCardDef(a.code)?.traits.includes('Ally'),
      )
      .flatMap((a) =>
        (['damage', 'horror'] as const)
          .filter((kind) => a[kind] > 0)
          .map((kind) => ({
            label:
              kind === 'damage' ? 'choice.conditionalHealDamage' : 'choice.conditionalHealHorror',
            params: { name: cardName(a.code) },
            target: { type: 'asset' as const, id: a.id },
            then: [
              {
                type: 'HealAsset' as const,
                asset: a.id,
                damage: kind === 'damage' ? 1 : 0,
                horror: kind === 'horror' ? 1 : 0,
              },
            ],
          })),
      ),
  ]
}
const faces = (s: GameState): ChaosToken[] => [
  ...new Set<ChaosToken>([
    -8,
    -7,
    -6,
    -5,
    -4,
    -3,
    -2,
    -1,
    0,
    1,
    'skull',
    'cultist',
    'tablet',
    'elderThing',
    'elderSign',
    'autoFail',
    ...s.chaosBag,
    ...(s.sealed ?? []).map((x) => x.token),
  ]),
]
export function registerConditional(code: string): void {
  if (code === '11090') {
    registerTokenSkill(code)
    return
  }
  if (['06026', '11096'].includes(code)) {
    const easy = code === '06026'
    registerPlayerCard({
      code,
      afterEventPlayWindow: true,
      canPlay: (s, by) => easy || healChoices(s, by).length > 0,
      play: (s, by) =>
        easy
          ? [
              { type: 'GainResources', investigator: by, amount: 2 },
              { type: 'DrawCards', investigator: by, amount: 1 },
            ]
          : ask(by, healChoices(s, by), true),
      handReactions: (s, t, by) => {
        if (
          t.type !== 'afterEventPlayed' ||
          t.code !== code ||
          !getInvestigator(s, by).hand.includes(code)
        )
          return []
        if (
          easy
            ? t.investigator !== by
            : !local(s, by).some((i) => i.id === t.investigator) || healChoices(s, by).length === 0
        )
          return []
        return [
          {
            key: `${code}:${by}:chain`,
            investigator: by,
            label: 'choice.conditionalPlay',
            params: { card: cardName(code) },
            then: [
              {
                type: 'PlayCard',
                investigator: by,
                code,
                byEffect: true,
                ...(easy ? { noCost: true } : {}),
              },
            ],
          },
        ]
      },
    })
    return
  }
  if (code === '06323') {
    registerPlayerCard({
      code,
      fastOptions: (s, a) => {
        if ((!a.damage && !a.horror) || !getInvestigator(s, a.owner).hand.includes(code)) return []
        return [
          {
            key: `${a.id}:heal`,
            investigator: a.owner,
            label: 'choice.conditionalResolve',
            params: { card: cardName(code) },
            target: { type: 'asset', id: a.id },
            then: [
              { type: 'DiscardFromHand', investigator: a.owner, card: code },
              continuation(code, a.owner, 'heal', { asset: a.id }),
            ],
          },
        ]
      },
      effect: (s, by, step, data) => {
        const a = s.assets[String(data.asset)]
        return step === 'heal' && a?.owner === by
          ? [{ type: 'HealAsset', asset: a.id, damage: a.damage, horror: a.horror }]
          : []
      },
    })
    return
  }
  if (code === '10127') {
    registerPlayerCard({
      code,
      permanent: {},
      limitTitle: true,
      mayDeclineUpkeepResources: true,
      skillModifier: (s, a) => (getInvestigator(s, a.owner).resources === 0 ? 1 : 0),
    })
    return
  }
  if (code === '03313') {
    registerPlayerCard({
      code,
      extraClueWhenEmpty: true,
      skillModifier: (s, a, t) =>
        t.skill === 'intellect' &&
        t.kind.type === 'investigate' &&
        getInvestigator(s, a.owner).clues === 0
          ? 2
          : 0,
    })
    return
  }
  if (code === '06159') {
    registerPlayerCard({
      code,
      ignoresDuplicateHandCards: true,
      reactions: (s, t, a) => {
        if (t.type !== 'afterDrawCard' || t.investigator !== a.owner || a.exhausted) return []
        const i = getInvestigator(s, a.owner),
          title = cardName(t.card)
        if (i.hand.filter((c) => cardName(c) === title).length < 2) return []
        return [
          {
            key: `${a.id}:draw`,
            investigator: a.owner,
            label: 'choice.conditionalReveal',
            params: { name: i.name, card: title },
            then: [
              {
                type: 'Log',
                key: 'choice.conditionalReveal',
                params: { name: i.name, card: title },
              },
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'DrawCards', investigator: a.owner, amount: 1 },
            ],
          },
        ]
      },
    })
    return
  }
  if (code === '04158') {
    registerPlayerCard({
      code,
      reactions: (_s, t, a) =>
        t.type === 'afterSkillTestInitiated' && t.investigator === a.owner && !a.exhausted
          ? [
              {
                key: `${a.id}:predict`,
                investigator: a.owner,
                label: 'choice.conditionalRecall',
                params: { card: cardName(code) },
                then: [continuation(code, a.owner, 'name', { asset: a.id })],
              },
            ]
          : [],
      effect: (s, by, step, data) =>
        step === 'name'
          ? ask(
              by,
              faces(s).map((token) => ({
                label:
                  typeof token === 'number' ? 'choice.conditionalToken' : `chaosTokenName.${token}`,
                ...(typeof token === 'number'
                  ? { params: { token: token > 0 ? '+' + token : String(token) } }
                  : {}),
                then: [{ type: 'NameSkillTestToken', asset: String(data.asset), token }],
              })),
              true,
            )
          : [],
      forced: (s, t, a) => {
        const test = s.skillTest
        if (
          t.type !== 'afterRevealChaosToken' ||
          a.exhausted ||
          !test ||
          test.tokenPredictions?.[a.id] !== t.token ||
          test.abilityCounts?.[`${a.id}:predicted`]
        )
          return []
        return [
          { type: 'ExhaustAsset', asset: a.id },
          { type: 'BoostSkillTest', amount: 2 },
          { type: 'ModifySkillTest', use: `${a.id}:predicted` },
        ]
      },
    })
    return
  }
  throw Error('Unreviewed conditional asset ' + code)
}
