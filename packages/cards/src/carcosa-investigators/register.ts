// RR: Investigators, Placing/Moving Damage, Skill Test Results ST.7, Charges, Weaknesses.
import {
  getInvestigator,
  immuneToPlayerCards,
  activeEnemyModifiers,
  playerCardDef,
  registerInvestigator,
  registerTreachery,
  stuckInPlay,
  type GameState,
  type Asset,
  type Treachery,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  ask,
  option,
  cardName,
  mayParticipate,
} from '../advanced-tests/common'
const charged = (c: string) => ['charge', 'charges'].includes(playerCardDef(c)?.uses?.type ?? '')
const own = (s: GameState, by: string) => Object.values(s.assets).filter((a) => a.owner === by)
const chargeChoices = (s: GameState, by: string) =>
  own(s, by)
    .filter((a) => charged(a.code))
    .map((a) => ({
      label: 'choice.asset',
      params: { asset: cardName(a.code) },
      target: { type: 'asset' as const, id: a.id },
      then: [{ type: 'AddUses' as const, asset: a.id, amount: 1 }],
    }))
const speaker = (s: GameState, a: Asset) =>
  a.exhausted
    ? []
    : own(s, a.owner)
        .filter((x) => charged(x.code) && (!stuckInPlay(s, x) || x.uses > 0))
        .flatMap((x) => [
          ...(!stuckInPlay(s, x)
            ? [
                {
                  label: 'choice.carcosaReturn',
                  params: { card: cardName(x.code) },
                  then: [
                    { type: 'ExhaustAsset' as const, asset: a.id },
                    { type: 'ReturnAssetToHand' as const, asset: x.id },
                  ],
                },
              ]
            : []),
          {
            label: 'choice.carcosaCash',
            params: { card: cardName(x.code), n: x.uses },
            then: [
              { type: 'ExhaustAsset' as const, asset: a.id },
              {
                type: 'MoveUsesToResources' as const,
                asset: x.id,
                investigator: a.owner,
                amount: x.uses,
              },
              { type: 'DiscardAsset' as const, asset: x.id },
            ],
          },
        ])
const spiritOptions = (s: GameState, t: Treachery, by: string) => {
  const host = t.placement.type === 'threatArea' ? t.placement.investigator : undefined
  if (
    !host ||
    getInvestigator(s, host).location !== getInvestigator(s, by).location ||
    !mayParticipate(s, by)
  )
    return []
  return own(s, by)
    .filter(
      (a) =>
        !a.exhausted &&
        a.uses > 0 &&
        charged(a.code) &&
        playerCardDef(a.code)?.traits.includes('Spell'),
    )
    .map((a) => ({
      key: t.id + ':charge:' + a.id,
      investigator: by,
      label: 'ability.carcosaSpirits',
      params: { card: cardName(a.code) },
      actions: 0,
      provokes: false,
      then: [
        { type: 'ExhaustAsset' as const, asset: a.id },
        { type: 'SpendUses' as const, asset: a.id, amount: 1 },
        { type: 'AddTreacheryTokens' as const, treachery: t.id, amount: 1 },
      ],
    }))
}
export function registerCarcosaInvestigator(code: string): void {
  if (code === '03001') {
    registerInvestigator({
      code,
      startingAssets: ['03009'],
      elderSign: (_s, i) => ({ modifier: i.damage }),
      reactions: (s, t, i) => {
        const damaged =
          (t.type === 'afterTakeDamage' && t.investigator === i.id && t.damage > 0) ||
          (t.type === 'afterAssetDamaged' &&
            t.damage > 0 &&
            (t.owner ?? s.assets[t.asset]?.owner) === i.id) ||
          (t.type === 'afterDamageMoved' && t.kind === 'damage' && t.owner === i.id)
        return damaged
          ? [
              {
                key: code + ':draw',
                investigator: i.id,
                label: 'ability.markDraw',
                limit: { per: 'phase' },
                then: [{ type: 'DrawCards', investigator: i.id, amount: 1 }],
              },
            ]
          : []
      },
    })
    return
  }
  if (code === '03004') {
    registerInvestigator({
      code,
      initialUsesBonus: (c) => (charged(c) ? 1 : 0),
      elderSign: (s, i) => ({ modifier: 1, immediate: ask(i.id, chargeChoices(s, i.id), true) }),
    })
    return
  }
  if (code === '03009' || code === '03009b') {
    registerPlayerCard({
      code,
      cannotLeavePlay: () => true,
      skillModifier: () => (code === '03009b' ? -1 : 0),
      forced: (s, _t, a) => {
        const back = getInvestigator(s, '03001').damage >= 5,
          next = back ? '03009b' : '03009'
        return a.code !== next ? [{ type: 'FlipPlayerAsset', asset: a.id, code: next }] : []
      },
      ...(code === '03009'
        ? {
            testOptions: (s: GameState, t: NonNullable<GameState['skillTest']>, a: Asset) =>
              t.investigator === a.owner
                ? [
                    option(a, [
                      {
                        type: 'TakeDamage',
                        investigator: a.owner,
                        damage: 1,
                        horror: 0,
                        direct: true,
                      },
                      { type: 'BoostSkillTest', amount: 2 },
                    ]),
                  ]
                : [],
          }
        : {}),
    })
    return
  }
  if (code === '03007') {
    registerPlayerCard({
      code,
      chooseResultOrder: true,
      afterCommittedTest: (s, t, success, by) =>
        success &&
        t.kind.type === 'fight' &&
        getInvestigator(s, by).damage > 0 &&
        s.enemies[t.kind.enemy] &&
        !immuneToPlayerCards(s.enemies[t.kind.enemy]!) &&
        !activeEnemyModifiers(s, t.kind.enemy).some((m) => m.cannotTakeDamage)
          ? [
              {
                type: 'MoveDamage',
                from: { type: 'investigator', id: by },
                to: { type: 'enemy', id: t.kind.enemy },
                kind: 'damage',
                by,
              },
            ]
          : [],
    })
    return
  }
  if (code === '03008') {
    registerPlayerCard({ code })
    registerTreachery({
      code,
      revelation: (s, by) => [
        {
          type: 'TakeDamage',
          investigator: by,
          damage: 0,
          horror: Math.floor(getInvestigator(s, by).damage / 2),
        },
      ],
    })
    return
  }
  if (code === '03014') {
    registerPlayerCard({
      code,
      fastOptions: (s, a) =>
        speaker(s, a).length ? [{ ...option(a, ask(a.owner, speaker(s, a), true)) }] : [],
      testOptions: (s, _t, a) =>
        speaker(s, a).length ? [option(a, ask(a.owner, speaker(s, a), true))] : [],
    })
    return
  }
  if (code === '03015') {
    registerPlayerCard({ code })
    registerTreachery({
      code,
      revelation: (_s, by, t) => [
        {
          type: 'PlaceTreachery',
          treachery: t.id,
          placement: { type: 'threatArea', investigator: by },
        },
      ],
      abilities: spiritOptions,
      testOptions: (s, _test, t) =>
        s.investigators.filter((i) => !i.eliminated).flatMap((i) => spiritOptions(s, t, i.id)),
      whenGameEnds: (_s, t) =>
        t.owner && (t.tokens ?? 0) < 4
          ? [{ type: 'SufferTrauma', investigator: t.owner, physical: 1 }]
          : [],
    })
    return
  }
  throw Error('Unreviewed Carcosa investigator ' + code)
}
