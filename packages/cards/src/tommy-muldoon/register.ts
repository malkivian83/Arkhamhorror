// RR: Abilities, Costs, Playing Cards, Uses, Chaos Tokens, Fight, Aloof, Retaliate, Evade,
// Attachments, Revelation, Weakness, Choices, Round End.
import {
  attackBlocked,
  canPlayByEffect,
  enemyHasKeyword,
  fightEnemies,
  getInvestigator,
  playerCardBehavior,
  playerCardDef,
  registerInvestigator,
  registerPlayerCard,
  registerTreachery,
  type AbilityOption,
  type Asset,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { ask, attackable, cardName, continuation } from '../dunwich-pilot/effects'
import approvals from './approvals.json'
import '../test-modifiers/card-02299'

export const TOMMY = '60151'
export const BECKY = '60152'
export const LOOSE_CANNON = '60153'
export const OVERCONFIDENT = '60154'
export const RESTRAINED = '60165'
export const VICIOUS_BLOW_2 = '60176'
export const THOMPSON = '60182'

const isFirearm = (code: string) => !!playerCardDef(code)?.traits.includes('Firearm')
const hasAmmo = (code: string) => playerCardDef(code)?.uses?.type === 'ammo'
const firearmsInPlay = (s: GameState, by: InvestigatorId) =>
  Object.values(s.assets).filter((a) => a.owner === by && isFirearm(a.code))

/** Firearm assets in hand that can be played (paying their cost) once the ability cost is paid. */
function playableFirearms(s: GameState, by: InvestigatorId): string[] {
  return [...new Set(getInvestigator(s, by).hand)].filter(
    (code) =>
      playerCardDef(code)?.type === 'asset' &&
      isFirearm(code) &&
      canPlayByEffect(s, by, code, 'hand'),
  )
}

// Tommy Muldoon: "[action] Spend 1 resource, or discard a Firearm asset you control from play:
// Play a Firearm asset from your hand, paying its cost. It enters play with 2 additional ammo."
// Each payment is offered only when, after paying it, a Firearm in hand can still be played.
function tommyAbilities(s: GameState, by: InvestigatorId): AbilityOption[] {
  const me = getInvestigator(s, by)
  const options: AbilityOption[] = []
  const afterSpend = {
    ...s,
    investigators: s.investigators.map((i) =>
      i.id === by ? { ...i, resources: i.resources - 1 } : i,
    ),
  }
  if (me.resources >= 1 && playableFirearms(afterSpend, by).length)
    options.push({
      key: 'tommy:resource',
      label: 'ability.tommyResource',
      actions: 1,
      provokes: true,
      costs: [{ type: 'SpendResources', investigator: by, amount: 1 }],
      then: [continuation(TOMMY, by, 'play')],
    })
  for (const firearm of firearmsInPlay(s, by)) {
    const { [firearm.id]: _discarded, ...assets } = s.assets
    if (!playableFirearms({ ...s, assets }, by).length) continue
    options.push({
      key: 'tommy:discard:' + firearm.id,
      label: 'ability.tommyDiscard',
      params: { card: cardName(firearm.code) },
      actions: 1,
      provokes: true,
      costs: [{ type: 'DiscardAsset', asset: firearm.id }],
      then: [continuation(TOMMY, by, 'play')],
    })
  }
  return options
}

function becky(s: GameState, a: Asset, by: InvestigatorId): AbilityOption[] {
  if (a.uses < 1) return []
  return fightEnemies(s, by)
    .filter((e) => !attackBlocked(s, by, e, BECKY))
    .flatMap((e) => {
      const attack = (ignore: boolean): Message => ({
        type: 'BeginSkillTest',
        investigator: by,
        source: a.id,
        skill: 'combat',
        difficulty: e.fight,
        modifier: 2,
        kind: {
          type: 'fight',
          enemy: e.id,
          extraDamage: 1,
          ...(ignore ? { ignoreRetaliate: true } : {}),
        },
      })
      const options: AbilityOption[] = []
      // RR Aloof: an unengaged aloof enemy cannot be attacked, unless Becky's reaction ignores it.
      if (e.engagedWith !== null || !enemyHasKeyword(s, e, 'aloof'))
        options.push({
          key: a.id + ':fight',
          label: 'ability.fightWith',
          params: { card: cardName(BECKY), enemy: e.name },
          target: { type: 'enemy', id: e.id },
          actions: 1,
          provokes: false,
          costs: [{ type: 'SpendUses', asset: a.id, amount: 1 }],
          then: [attack(false)],
        })
      // [reaction] When you trigger this ability, exhaust Becky: ignore aloof and retaliate.
      // The reaction is chosen together with the ability, before the attack target is fixed.
      if (!a.exhausted)
        options.push({
          key: a.id + ':fight:reaction',
          label: 'ability.beckyIgnore',
          params: { card: cardName(BECKY), enemy: e.name },
          target: { type: 'enemy', id: e.id },
          actions: 1,
          provokes: false,
          costs: [
            { type: 'SpendUses', asset: a.id, amount: 1 },
            { type: 'ExhaustAsset', asset: a.id },
          ],
          then: [attack(true)],
        })
      return options
    })
}

function thompsonAttack(
  asset: string,
  by: InvestigatorId,
  enemy: string,
  difficulty: number,
  modifier: number,
): Message {
  return {
    type: 'BeginSkillTest',
    investigator: by,
    source: asset,
    skill: 'combat',
    difficulty,
    modifier,
    kind: { type: 'fight', enemy, extraDamage: 1 },
  }
}

export function registerTommyCard(code: string): void {
  if (code === TOMMY) {
    registerInvestigator({
      code,
      abilities: (s, self) => tommyAbilities(s, self.id),
      // The elder sign effect resolves when the token is revealed, whatever the test result.
      elderSign: (_s, self) => ({
        modifier: 1,
        immediate: [continuation(code, self.id, 'elderSign')],
      }),
    })
    registerPlayerCard({
      code,
      effect: (s, by, step) => {
        if (step === 'play')
          return ask(
            by,
            playableFirearms(s, by).map((card) => ({
              label: 'ability.playCard',
              params: { card: cardName(card) },
              target: { type: 'hand', code: card },
              then: [
                {
                  type: 'PlayCard',
                  investigator: by,
                  code: card,
                  byEffect: true,
                  ...(hasAmmo(card) ? { entryUses: 2 } : {}),
                },
              ],
            })),
          )
        if (step === 'elderSign')
          return ask(
            by,
            Object.values(s.assets)
              .filter((a) => a.owner === by && hasAmmo(a.code))
              .map((a) => ({
                label: 'choice.tommyAmmo',
                params: { card: cardName(a.code) },
                target: { type: 'asset', id: a.id },
                then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
              })),
          )
        return []
      },
    })
    return
  }
  if (code === BECKY) {
    registerPlayerCard({ code, abilities: (s, a, by) => becky(s, a, by) })
    return
  }
  if (code === LOOSE_CANNON) {
    registerTreachery({
      code,
      // RR Choices: only an option that can change the game state may be chosen.
      revelation: (s, by) => {
        const firearms = firearmsInPlay(s, by)
        const choices: Choice[] = [
          ...(firearms.length
            ? [
                {
                  label: 'choice.looseCannonDiscard',
                  then: firearms.map((a): Message => ({ type: 'DiscardAsset', asset: a.id })),
                },
              ]
            : []),
          ...(getInvestigator(s, by).resources > 0
            ? [
                {
                  label: 'choice.looseCannonLose',
                  then: [{ type: 'LoseResources' as const, investigator: by, amount: 5 }],
                },
              ]
            : []),
        ]
        return ask(by, choices)
      },
    })
    return
  }
  if (code === OVERCONFIDENT) {
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
        t.type === 'afterSkillTest' &&
        !t.succeeded &&
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
  if (code === RESTRAINED) {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) => {
        if (t.type !== 'afterEnemyAttack' || t.investigator !== by) return []
        const e = s.enemies[t.enemy]
        if (!e || (e.traits ?? []).includes('Elite')) return []
        return [
          {
            key: 'hand:' + code,
            investigator: by,
            label: 'ability.playCard',
            params: { card: cardName(code) },
            target: { type: 'hand', code },
            then: [
              {
                type: 'PlayCard',
                investigator: by,
                code,
                effect: [
                  { type: 'AttachPlayerCardToEnemy', investigator: by, code, enemy: e.id },
                  { type: 'EvadeEnemy', enemy: e.id, by },
                ],
              },
            ],
          },
        ]
      },
    })
    // While attached: the enemy cannot ready; at the end of the round it is discarded
    // unless that enemy is a Humanoid.
    registerTreachery({
      code,
      revelation: () => [],
      attachedEnemyCannotReady: true,
      forced: (s, t, self) =>
        t.type === 'roundEnds' &&
        self.placement.type === 'enemy' &&
        !(s.enemies[self.placement.enemy]?.traits ?? []).includes('Humanoid')
          ? [{ type: 'DiscardTreachery', treachery: self.id }]
          : [],
    })
    return
  }
  if (code === VICIOUS_BLOW_2) {
    const approval = approvals.cards.find((c) => c.code === code)
    const source = playerCardBehavior('02299')
    if (approval?.behaviorSource !== '02299' || !source)
      throw new Error('Unreviewed reprint: ' + code)
    // Exact reprint (equivalence hash in approvals.json); its callbacks reference no card code.
    registerPlayerCard({ ...source, code })
    return
  }
  if (code === THOMPSON) {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        a.uses < 1
          ? []
          : attackable(s, by).map((e) => ({
              key: a.id + ':fight',
              label: 'ability.fightWith',
              params: { card: cardName(code), enemy: e.name },
              target: { type: 'enemy' as const, id: e.id },
              actions: 1,
              provokes: false,
              costs: [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }],
              then: [
                thompsonAttack(a.id, by, e.id, e.fight, 3),
                {
                  type: 'AfterCurrentSkillTest' as const,
                  then: [continuation(code, by, 'again', { asset: a.id })],
                },
              ],
            })),
      // [reaction] After you resolve the above [action] ability, spend 1 ammo: Fight with +1
      // damage. It is not an action (no attack of opportunity) and may target any valid enemy.
      effect: (s, by, step, data) => {
        const a = s.assets[String(data?.asset)]
        if (step !== 'again' || !a || a.code !== code || a.owner !== by || a.uses < 1) return []
        const targets = attackable(s, by).filter((e) => !attackBlocked(s, by, e, code))
        return targets.length
          ? ask(
              by,
              [
                ...targets.map((e): Choice => ({
                  label: 'choice.thompsonFight',
                  params: { enemy: e.name },
                  target: { type: 'enemy', id: e.id },
                  then: [
                    { type: 'SpendUses', asset: a.id, amount: 1 },
                    thompsonAttack(a.id, by, e.id, e.fight, 0),
                  ],
                })),
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          : []
      },
    })
    return
  }
  throw new Error('Unreviewed Tommy Muldoon card: ' + code)
}
