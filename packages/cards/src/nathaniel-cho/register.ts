// RR: Triggered Abilities, Fight, Search, Damage, Limits, Uses, Fast.
import {
  attackBlocked,
  canPlayByEffect,
  engagedEnemies,
  getInvestigator,
  getLocation,
  playerCardBehavior,
  playerCardDef,
  registerEnemy,
  registerInvestigator,
  registerPlayerCard,
  registerTreachery,
  turnActionTiming,
  type Choice,
  type Enemy,
  type GameState,
  type Message,
} from '@lcg/engine'
import { mayChoose } from '../core-2026/player-cards'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { basicTest, type BasicEvent } from '../basic-events/register'
import { rebindCard } from '../reprints-wave-2/register'
import '../reactive-events/card-01023'

const reaction = (code: string, by: string, effect: Message[]) => ({
  key: 'hand:' + code,
  investigator: by,
  label: 'ability.playCard',
  params: { card: cardName(code) },
  target: { type: 'hand' as const, code },
  then: [{ type: 'PlayCard' as const, investigator: by, code, effect }],
})
const attack = (
  s: GameState,
  by: string,
  code: string,
  enemy: Enemy,
  modifier = 0,
  extraDamage = 0,
): Message => ({
  ...(basicTest(
    { action: 'fight', modifier, extraDamage, tags: ['spirit', 'tactic'] },
    { state: s, investigator: by, code },
    enemy,
  ) as Extract<Message, { type: 'BeginSkillTest' }>),
  effectSource: code,
})
const clueChoices = (s: GameState, by: string, connecting: boolean): Choice[] => {
  const here = getInvestigator(s, by).location
  if (here === null) return []
  return [here, ...(connecting ? getLocation(s, here).connections : [])]
    .filter((location) => s.locations[location] && s.locations[location]!.clues > 0)
    .map((location) => ({
      label: 'choice.location',
      params: { location: getLocation(s, location).name },
      target: { type: 'location', id: location },
      then: [{ type: 'DiscoverClues', investigator: by, amount: 1, location }],
    }))
}
const inRange = (s: GameState, by: string, range: number) => {
  const here = getInvestigator(s, by).location
  if (here === null) return []
  const reached = new Set([here])
  let frontier = [here]
  for (let n = 0; n < range; n++) {
    frontier = frontier
      .flatMap((id) => getLocation(s, id).connections)
      .filter((id) => s.locations[id] && !reached.has(id))
    frontier.forEach((id) => reached.add(id))
  }
  return Object.values(s.enemies).filter(
    (e) =>
      reached.has(e.location) && !(e.traits ?? []).includes('Elite') && !attackBlocked(s, by, e),
  )
}
const weaponChoices = (s: GameState, by: string): Choice[] => {
  const me = getInvestigator(s, by)
  return [...new Set([...me.deck, ...me.discard])]
    .filter((code) => {
      const def = playerCardDef(code)
      if (def?.type !== 'asset' || !def.traits.includes('Weapon')) return false
      const projected = {
        ...s,
        investigators: s.investigators.map((i) =>
          i.id === by ? { ...i, hand: [code, ...i.hand] } : i,
        ),
      }
      return canPlayByEffect(projected, by, code, 'hand')
    })
    .map((code) => ({
      label: 'choice.takeCard',
      params: { card: cardName(code) },
      then: [
        ...(me.deck.includes(code)
          ? [{ type: 'TakeFromDeck' as const, investigator: by, code, to: 'hand' as const }]
          : [{ type: 'DiscardToHand' as const, investigator: by, code }]),
        { type: 'PlayCard', investigator: by, code, byEffect: true },
        { type: 'ShuffleDeck', investigator: by },
      ],
    }))
}

export function registerNathanielCard(code: string): void {
  if (code === '60101') {
    registerInvestigator({
      code,
      reactions: (_s, t, self) =>
        t.type === 'beforeEnemyDamage' &&
        t.investigator === self.id &&
        t.amount > 0 &&
        !!t.source?.code &&
        playerCardDef(t.source.code)?.type === 'event'
          ? [
              {
                key: 'nathaniel',
                investigator: self.id,
                label: 'ability.nathanielDamage',
                limit: { per: 'phase' },
                then: [{ type: 'AdjustPendingEnemyDamage', enemy: t.enemy, amount: 1 }],
              },
            ]
          : [],
      elderSign: (_s, self) => ({
        modifier: 1,
        onSuccess: [continuation(code, self.id, 'elderSign')],
      }),
    })
    // Investigator effects use the same serializable continuation dispatch as player cards.
    registerPlayerCard({
      code,
      effect: (s, by, step) =>
        step === 'elderSign' && s.skillTest?.kind.type === 'fight'
          ? ask(
              by,
              [...new Set(getInvestigator(s, by).discard)]
                .filter((c) => playerCardDef(c)?.type === 'event')
                .map((c) => ({
                  label: 'choice.takeCard',
                  params: { card: cardName(c) },
                  then: [{ type: 'DiscardToHand', investigator: by, code: c }],
                })),
              true,
            )
          : [],
    })
    return
  }
  if (code === '60102') {
    registerPlayerCard({
      code,
      reactions: (_s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? [
              {
                key: a.id + ':randall',
                investigator: a.owner,
                label: 'ability.randallCho',
                then: [continuation(code, a.owner, 'choice')],
              },
            ]
          : [],
      effect: (s, by, step) =>
        step === 'choice'
          ? ask(
              by,
              [
                ...(getInvestigator(s, by).damage > 0
                  ? [
                      {
                        label: 'choice.randallHeal',
                        then: [{ type: 'Heal' as const, investigator: by, damage: 3, horror: 0 }],
                      },
                    ]
                  : []),
                { label: 'choice.randallSearch', then: [continuation(code, by, 'search')] },
              ],
              true,
            )
          : step === 'search'
            ? ask(
                by,
                [
                  { label: 'choice.pilotDone', then: [{ type: 'ShuffleDeck', investigator: by }] },
                  ...weaponChoices(s, by),
                ],
                true,
              )
            : [],
    })
    return
  }
  if (code === '60103') {
    registerPlayerCard({
      code,
      enemy: {
        kind: 'enemy',
        code,
        name: cardName(code),
        fight: 2,
        health: 3,
        evade: 3,
        damage: 2,
        horror: 0,
        keywords: ['hunter'],
        traits: ['Humanoid', 'Criminal', 'Syndicate'],
        prey: { type: 'only', investigator: '60101' },
      },
    })
    registerEnemy({ code, damageTaken: (_s, _e, amount) => ({ amount: Math.min(1, amount) }) })
    return
  }
  if (code === '60104') {
    registerTreachery({
      code,
      revelation: (_s, by, t) => [
        {
          type: 'PlaceTreachery',
          treachery: t.id,
          placement: { type: 'threatArea', investigator: by },
        },
      ],
      forced: (_s, t, self) =>
        t.type === 'afterDealDamage' &&
        self.placement.type === 'threatArea' &&
        t.investigator === self.placement.investigator
          ? [
              {
                type: 'TakeDamage',
                investigator: t.investigator,
                damage: 1,
                horror: 0,
                source: cardName(code),
              },
            ]
          : [],
      abilities: (_s, self) => [
        {
          key: self.id + ':discard',
          label: 'ability.discardTreachery',
          params: { card: self.name },
          actions: 2,
          provokes: true,
          then: [{ type: 'DiscardTreachery', treachery: self.id }],
        },
      ],
    })
    return
  }
  if (code === '60105' || code === '60127') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) =>
        t.kind.type === 'fight' && t.skill === 'combat' ? (code === '60127' ? 2 : 1) : 0,
      reactions: (_s, t, a) =>
        t.type === 'enemyDefeated' && t.by === a.owner && !a.exhausted
          ? [
              {
                key: a.id + ':gloves',
                investigator: a.owner,
                label: 'ability.boxingGloves',
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  {
                    type: 'SearchDeck',
                    investigator: a.owner,
                    top: code === '60127' ? 9 : 6,
                    traits: ['Spirit'],
                    cardType: 'event',
                    anyType: true,
                    to: 'hand',
                    optional: true,
                  },
                ],
              },
            ]
          : [],
    })
    return
  }
  if (code === '60106') {
    registerPlayerCard({
      code,
      reactions: (_s, t, a) => {
        if (
          t.type !== 'whenDealtDamage' ||
          t.investigator !== a.owner ||
          !t.enemy ||
          a.exhausted ||
          a.uses < 1
        )
          return []
        return (['damage', 'horror'] as const)
          .filter((kind) => t[kind] > 0)
          .map((kind) => ({
            key: a.id + ':' + kind,
            investigator: a.owner,
            label: kind === 'damage' ? 'ability.fleshWardDamage' : 'ability.fleshWardHorror',
            then: [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'SpendUses', asset: a.id, amount: 1 },
              {
                type: 'ReducePendingDamage',
                investigator: a.owner,
                damage: kind === 'damage' ? 1 : 0,
                horror: kind === 'horror' ? 1 : 0,
              },
            ],
          }))
      },
    })
    return
  }
  if (code === '60107' || code === '60128') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) =>
        t.skill === 'combat' || (code === '60128' && t.skill === 'intellect') ? 1 : 0,
      reactions: (s, t, a) =>
        t.type === 'enemyDefeated' &&
        t.by === a.owner &&
        !a.exhausted &&
        clueChoices(s, a.owner, code === '60128').length
          ? [
              {
                key: a.id + ':grete',
                investigator: a.owner,
                label: 'ability.greteWagner',
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'DamageAsset', asset: a.id, damage: 1, horror: 0 },
                  continuation(code, a.owner, 'clue'),
                ],
              },
            ]
          : [],
      effect: (s, by, step) =>
        step === 'clue' ? ask(by, clueChoices(s, by, code === '60128'), true) : [],
    })
    return
  }
  if (code === '60109') {
    registerPlayerCard({
      code,
      reactions: (_s, t, a) =>
        t.type === 'afterEnemyDamaged' && t.by === a.owner && (t.excess ?? 0) > 0 && !a.exhausted
          ? [
              {
                key: a.id + ':relentless',
                investigator: a.owner,
                label: 'ability.relentlessStore',
                params: { n: t.excess! },
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'DamageAsset', asset: a.id, damage: t.excess!, horror: 0 },
                ],
              },
            ]
          : [],
      fastOptions: (_s, a) =>
        a.damage > 0
          ? [
              {
                key: a.id + ':cash',
                investigator: a.owner,
                label: 'ability.relentlessCash',
                params: { n: a.damage },
                then: [
                  { type: 'DiscardAsset', asset: a.id },
                  { type: 'GainResources', investigator: a.owner, amount: a.damage },
                ],
              },
            ]
          : [],
    })
    return
  }
  if (code === '60110') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        if (a.exhausted || t.type !== 'afterMove' || t.investigator === a.owner) return []
        const me = getInvestigator(s, a.owner),
          other = getInvestigator(s, t.investigator)
        return me.location !== null &&
          me.location === t.from &&
          other.location !== null &&
          getLocation(s, me.location).connections.includes(other.location)
          ? [
              {
                key: a.id + ':follow',
                investigator: a.owner,
                label: 'ability.safeguard',
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'MoveTo', investigator: a.owner, location: other.location },
                ],
              },
            ]
          : []
      },
    })
    return
  }
  if (code === '60112' || code === '60122') {
    registerPlayerCard({
      code,
      fightAction: true,
      noAttacksOfOpportunity: true,
      handReactions: (s, t, by) => {
        if (
          t.type !== (code === '60112' ? 'afterEnemyAttack' : 'whenEnemyAttacks') ||
          t.investigator !== by
        )
          return []
        const e = s.enemies[t.enemy]
        return e && e.location === getInvestigator(s, by).location && !attackBlocked(s, by, e, code)
          ? [
              reaction(code, by, [
                attack(s, by, code, e, code === '60122' ? 2 : 0, code === '60122' ? 1 : 0),
              ]),
            ]
          : []
      },
    })
    return
  }
  if (code === '60113') {
    const source = playerCardBehavior('01023')!
    registerPlayerCard({
      code,
      handReactions: (s, t, by) => rebindCard(source.handReactions!(s, t, by), '01023', code),
    })
    return
  }
  if (code === '60114' || code === '60123') {
    registerPlayerCard({
      code,
      fightAction: true,
      noAttacksOfOpportunity: true,
      ...(code === '60123' ? { playInAnyFastWindow: true } : {}),
      canPlay: (s, by) => inRange(s, by, code === '60123' ? 2 : 1).length > 0,
      play: (s, by) =>
        ask(
          by,
          inRange(s, by, code === '60123' ? 2 : 1).map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [
              { type: 'MoveEnemy', enemy: e.id, location: getInvestigator(s, by).location! },
              { type: 'EngageEnemy', investigator: by, enemy: e.id },
              continuation(code, by, 'fight', { enemy: e.id }),
            ],
          })),
          true,
        ),
      effect: (s, by, step, data) => {
        const e = s.enemies[String(data.enemy)]
        return step === 'fight' &&
          e &&
          e.location === getInvestigator(s, by).location &&
          !attackBlocked(s, by, e, code)
          ? [attack(s, by, code, e)]
          : []
      },
    })
    return
  }
  if (code === '60120') {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) =>
        t.type === 'enemyDefeated' &&
        t.by === by &&
        getInvestigator(s, by).location !== null &&
        getLocation(s, getInvestigator(s, by).location!).clues > 0
          ? [
              reaction(code, by, [
                {
                  type: 'DiscoverClues',
                  investigator: by,
                  amount: (s.defeatedEnemyHealthThisTurn?.[by] ?? 0) >= 4 ? 2 : 1,
                },
              ]),
            ]
          : [],
    })
    return
  }
  if (code === '60121') {
    registerPlayerCard({
      code,
      // RR: Resolve as much as possible. The additional action does not depend on readying
      // an asset (there is no "then"), confirmed by MJ Newman, ArkhamDB 24 February 2021.
      canPlay: (s, by) => s.activeTurn === by,
      play: (s, by) => [
        ...ask(
          by,
          Object.values(s.assets)
            .filter(
              (a) =>
                a.owner === by &&
                a.exhausted &&
                (playerCardDef(a.code)?.classes ?? [playerCardDef(a.code)?.class]).includes(
                  'guardian',
                ),
            )
            .map((a) => ({
              label: 'choice.nathanielAsset',
              params: { card: cardName(a.code) },
              target: { type: 'asset', id: a.id },
              then: [{ type: 'ReadyAsset', asset: a.id }],
            })),
          true,
        ),
        { type: 'GainFightActionsThisTurn', investigator: by, amount: 1 },
      ],
    })
    return
  }
  if (code === '60125') {
    registerPlayerCard({
      code,
      fightAction: true,
      noAttacksOfOpportunity: true,
      canPlay: (s, by) => turnActionTiming(s, by) === 'early' && engagedEnemies(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          engagedEnemies(s, by).map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [{ type: 'DamageEnemy', enemy: e.id, amount: 2, by, source: { code } }],
          })),
          true,
        ),
    })
    return
  }
  if (code === '60131') {
    registerPlayerCard({
      code,
      forced: (_s, t, a) =>
        t.type === 'roundBegins' && a.uses !== 2
          ? [{ type: 'AddUses', asset: a.id, amount: 2 - a.uses }]
          : [],
      testOptions: (s, t, a) =>
        t.investigator === a.owner && ['willpower', 'combat'].includes(t.skill)
          ? [
              ...(getInvestigator(s, a.owner).resources > 0
                ? [{ type: 'SpendResources' as const, investigator: a.owner, amount: 1 }]
                : []),
              ...(a.uses > 0 ? [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }] : []),
            ].map((payment, n) => ({
              key: a.id + ':pump:' + n,
              investigator: a.owner,
              label: payment.type === 'SpendUses' ? 'ability.physicalTrainingUse' : 'ability.pump',
              params: { card: cardName(code), skill: t.skill, amount: 1 },
              then: [payment, { type: 'BoostSkillTest', amount: 1 }],
            }))
          : [],
    })
    return
  }
  if (code === '60132') {
    const second: BasicEvent = {
      action: 'fight',
      modifier: 3,
      extraDamage: 2,
      tags: ['spirit', 'tactic'],
    }
    registerPlayerCard({
      code,
      fightAction: true,
      noAttacksOfOpportunity: true,
      canPlay: (s, by) =>
        Object.values(s.enemies).some(
          (e) =>
            e.location === getInvestigator(s, by).location &&
            !attackBlocked(s, by, e, code) &&
            (e.engagedWith !== null || !e.keywords.includes('aloof')),
        ),
      play: (s, by) =>
        ask(
          by,
          Object.values(s.enemies)
            .filter(
              (e) =>
                e.location === getInvestigator(s, by).location &&
                !attackBlocked(s, by, e, code) &&
                (e.engagedWith !== null || !e.keywords.includes('aloof')),
            )
            .map((e) => ({
              label: 'choice.enemy',
              params: { enemy: e.name },
              target: { type: 'enemy', id: e.id },
              then: [
                { ...attack(s, by, code, e, 0, 1), autoSuccess: true } as Message,
                {
                  type: 'AfterCurrentSkillTest',
                  then: [continuation(code, by, 'again', { first: e.id })],
                },
              ],
            })),
          true,
        ),
      // Official FAQ 2.5: the same enemy can be attacked again after elusive movement.
      // The level 5 printing also permits choosing a different eligible enemy.
      effect: (s, by, step, data) =>
        step === 'again'
          ? [
              mayChoose(
                by,
                'choice.nathanielFightAgain',
                {},
                ask(
                  by,
                  Object.values(s.enemies)
                    .filter(
                      (e) =>
                        (e.id === data.first || e.location === getInvestigator(s, by).location) &&
                        !attackBlocked(s, by, e, code) &&
                        (e.id === data.first ||
                          e.engagedWith !== null ||
                          !e.keywords.includes('aloof')),
                    )
                    .map((e) => ({
                      label: 'choice.enemy',
                      params: { enemy: e.name },
                      then: [
                        {
                          ...basicTest(second, { state: s, investigator: by, code }, e),
                          effectSource: code,
                        } as Message,
                      ],
                    })),
                  true,
                ),
              ),
            ]
          : [],
    })
    return
  }
  throw new Error('Unreviewed Nathaniel card: ' + code)
}
