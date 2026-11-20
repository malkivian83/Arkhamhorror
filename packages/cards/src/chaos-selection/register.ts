// RR/FAQ: multiple chaos tokens, Seal, Costs, Triggered Abilities and ST.3-ST.8.
import {
  maximumCostX,
  getInvestigator,
  getLocation,
  fightEnemies,
  enemiesAt,
  immuneToPlayerCards,
  type GameState,
  type Asset,
  type Message,
  type Choice,
  type ChaosToken,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  ask,
  cardName,
  continuation,
  option,
  mayParticipate,
} from '../advanced-tests/common'
import {
  registerBasicAsset,
  basicAbilityOptions,
  type BasicAbility,
} from '../basic-abilities/register'
import { sealBehavior, sealedOn } from '../sealed-tokens/cards'
type Data = Record<string, string | number | boolean>
const call = (code: string, by: string, step: string, data: Data = {}): Message =>
  continuation(code, by, step, data)
const here = (s: GameState, by: string) => getInvestigator(s, by).location
const local = (s: GameState, a: string, b: string) =>
  here(s, a) !== null && here(s, a) === here(s, b)
const held = (a: Asset) => ({ type: 'asset' as const, id: a.id })
const release = (a: Asset, token?: ChaosToken): Message => ({
  type: 'ReleaseSealedTokens',
  holder: held(a),
  count: 1,
  ...(token !== undefined ? { token } : {}),
})
const exhaust = (a: Asset): Message => ({ type: 'ExhaustAsset', asset: a.id })
const spend = (a: Asset): Message => ({ type: 'SpendUses', asset: a.id, amount: 1 })
const pick = (token: ChaosToken, then: Message[]): Choice => ({
  label: 'choice.sealTokenOn',
  params: { token: String(token), card: '' },
  then,
})
function sealable(s: GameState): { token: ChaosToken; face: ChaosToken }[] {
  const t = s.skillTest
  if (!t) return []
  const used = [...(t.sealedTokens ?? [])]
  const normal = (
    t.resolvedTokens?.filter((r) => !r.virtual) ?? t.tokens.map((token) => ({ token, face: token }))
  ).filter((r) => {
    const at = used.indexOf(r.token)
    if (at < 0) return true
    used.splice(at, 1)
    return false
  })
  const physical = Object.values(s.heldChaosTokens ?? {}).flat()
  const extra = (t.supplementalResolvedTokens ?? []).filter((r) => {
    const at = physical.indexOf(r.token)
    if (at < 0) return false
    physical.splice(at, 1)
    return true
  })
  return [...normal, ...extra]
}
function obscure(s: GameState, a: Asset, enemy: string): Choice[] {
  const e = s.enemies[enemy]
  if (!e) return []
  const canFight = fightEnemies(s, a.owner).some((x) => x.id === enemy) && !immuneToPlayerCards(e)
  const canEvade =
    !e.cannotBeEvaded && !e.hasNoStats && e.location === here(s, a.owner) && !immuneToPlayerCards(e)
  return (['fight', 'evade'] as const)
    .filter((kind) => (kind === 'fight' ? canFight : canEvade))
    .map((kind) => ({
      label: kind === 'fight' ? 'action.fight' : 'action.evade',
      params: { enemy: e.name },
      target: { type: 'enemy', id: enemy },
      then: [
        {
          type: 'BeginSkillTest',
          investigator: a.owner,
          skill: kind === 'fight' ? 'combat' : 'agility',
          baseFromShroud: true,
          difficulty: kind === 'fight' ? e.fight : e.evade,
          source: a.id,
          kind: kind === 'fight' ? { type: 'fight', enemy } : { type: 'evade', enemy },
        },
      ],
    }))
}
export function registerSupport(code: string): void {
  if (code === '04197' || code === '10097') {
    registerPlayerCard({
      code,
      wouldRevealOptions: (s, a) =>
        !a.exhausted && mayParticipate(s, a.owner)
          ? [
              option(a, [
                exhaust(a),
                {
                  type: 'ReplaceNextTokenReveal',
                  replacement: {
                    investigator: a.owner,
                    reveal: code === '04197' ? 3 : 4,
                    resolve: 2,
                    source: a.id,
                  },
                },
              ]),
            ]
          : [],
    })
    return
  }
  if (code === '04310') {
    const entry = sealBehavior(code, { one: [0] })
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          key: ':charge',
          label: 'ability.chaosShardCharge',
          skills: ['willpower'],
          cost: ['use'],
          extraDamage: 1,
        },
        {
          action: 'fight',
          skills: ['willpower'],
          extraDamage: 1,
          available: ({ state, self }) => sealedOn(state, self.id).length > 0,
          key: ':release',
          label: 'ability.chaosShardRelease',
          extraCosts: ({ state, self }) =>
            ask(
              self.owner,
              [...new Set(sealedOn(state, self.id).map((e) => e.token))].map((token) => ({
                label: 'choice.chaosRelease',
                params: { token: String(token) },
                then: [release(self, token)],
              })),
            ),
        },
      ],
      () => ({
        ...entry,
        skillModifier: (s, a, t) => (t.source === a.id ? 2 * sealedOn(s, a.id, 0).length : 0),
        forced: (s, t, a) => {
          const initial = entry.forced(s, t, a)
          if (
            t.type !== 'afterRevealChaosToken' ||
            t.investigator !== a.owner ||
            t.token !== 0 ||
            s.skillTest?.source !== a.id ||
            s.skillTest.kind.type !== 'fight'
          )
            return initial
          const zero = sealable(s).find((r) => r.face === 0)
          return [
            ...initial,
            ...(zero ? [{ type: 'SealTestToken', asset: a.id, token: zero.token } as Message] : []),
            { type: 'AdjustAttackDamage', amount: 1 },
          ]
        },
      }),
    )
    return
  }
  if (code === '11046') {
    registerPlayerCard({
      code,
      requiredResearch: 'calculatedReckoning',
      reactions: (s, t, a) =>
        t.type === 'afterSkillTest' &&
        !t.succeeded &&
        local(s, a.owner, t.investigator) &&
        !a.exhausted &&
        sealable(s).length
          ? [
              option(a, [
                exhaust(a),
                ...ask(
                  a.owner,
                  [...new Set(sealable(s).map((r) => r.token))].map((token) =>
                    pick(token, [{ type: 'SealTestToken', asset: a.id, token }]),
                  ),
                  true,
                ),
              ]),
            ]
          : [],
      forced: (s, t, a) =>
        t.type === 'roundEnds'
          ? [
              call(code, a.owner, 'maintain', {
                asset: a.id,
                tokens: JSON.stringify(sealedOn(s, a.id).map((e) => e.token)),
              }),
            ]
          : [],
      effect: (s, by, step, d) => {
        const a = s.assets[String(d.asset)],
          tokens = JSON.parse(String(d.tokens ?? '[]')) as ChaosToken[]
        if (step !== 'maintain' || !a || !tokens.length) return []
        const [token, ...rest] = tokens
        const next = call(code, by, step, { asset: a.id, tokens: JSON.stringify(rest) })
        if (!sealedOn(s, a.id, token).length) return [next]
        return ask(
          by,
          [
            ...(a.uses > 0
              ? [
                  {
                    label: 'choice.chaosKeepSealed',
                    params: { token: String(token) },
                    then: [spend(a), next],
                  },
                ]
              : []),
            {
              label: 'choice.chaosRelease',
              params: { token: String(token) },
              then: [release(a, token), next],
            },
          ],
          true,
        )
      },
    })
    return
  }
  if (code === '11047') {
    registerBasicAsset(
      code,
      (['fight', 'evade'] as const).map((action) => ({
        action,
        onSuccess: ({ self }: { self: Asset }, enemy?: import('@lcg/engine').Enemy): Message[] =>
          enemy
            ? [
                {
                  type: 'DamageEnemy',
                  enemy: enemy.id,
                  by: self.owner,
                  amount: 1,
                  source: { code },
                },
              ]
            : [],
      })),
      () => ({
        requiredResearch: 'calculatedReckoning',
        reactions: (s, t, a) =>
          t.type === 'whenRevealChaosToken' &&
          t.investigator === a.owner &&
          s.skillTest?.source === a.id &&
          a.uses > 0
            ? [option(a, [spend(a), { type: 'CancelRevealedToken', redraw: true }])]
            : [],
      }),
    )
    return
  }
  if (code === '11048') {
    const ability: BasicAbility = {
      action: 'investigate',
      actions: 0,
      cost: ['use', 'exhaust'],
      available: ({ state, self }) => state.activeTurn === self.owner,
    }
    registerBasicAsset(code, [ability], () => ({
      requiredResearch: 'calculatedReckoning',
      fastOptions: (s, a) =>
        mayParticipate(s, a.owner)
          ? basicAbilityOptions(code, ability, { state: s, self: a, investigator: a.owner }).map(
              (o) => option(a, [...(o.costs ?? []), ...o.then]),
            )
          : [],
      forced: (s, t, a) =>
        t.type === 'afterSkillTestInitiated' &&
        t.investigator === a.owner &&
        s.skillTest?.source === a.id
          ? [
              {
                type: 'ReplaceNextTokenReveal',
                replacement: {
                  investigator: a.owner,
                  reveal: 1 + enemiesAt(s, here(s, a.owner)!).length,
                  source: a.id,
                },
              },
            ]
          : [],
    }))
    return
  }
  if (code === '11060') {
    const entry = sealBehavior(code, { one: [0] })
    registerPlayerCard({
      code,
      ...entry,
      limitTitle: true,
      reactions: (s, t, a) => {
        if (
          (t.type === 'afterRevealLocation' || t.type === 'afterPutLocation') &&
          t.investigator === a.owner &&
          s.chaosBag.includes(0)
        )
          return [
            option(a, [
              { type: 'SealToken', investigator: a.owner, code, token: 0, holder: held(a) },
            ]),
          ]
        if (
          t.type !== 'afterEngage' ||
          t.investigator !== a.owner ||
          a.exhausted ||
          !sealedOn(s, a.id).length
        )
          return []
        const choices = obscure(s, a, t.enemy)
        return choices.length
          ? [option(a, [exhaust(a), release(a), ...ask(a.owner, choices, true)])]
          : []
      },
    })
    return
  }
  if (code === '07268') {
    registerPlayerCard({
      code,
      costX: true,
      xOptions: (s, by, discount = 0) =>
        Array.from({ length: maximumCostX(s, by, code, discount) + 1 }, (_, n) => n),
      ...sealBehavior(code, { upTo: { token: 'curse', max: (a) => a.uses } }),
      abilities: (s, a) =>
        a.exhausted || !sealedOn(s, a.id, 'curse').length
          ? []
          : [
              {
                key: a.id + ':flute',
                label: 'ability.advancedTest',
                params: { card: cardName(code) },
                actions: 1,
                provokes: false,
                then: ask(
                  a.owner,
                  Object.values(s.enemies)
                    .filter(
                      (e) =>
                        e.location === here(s, a.owner) &&
                        !e.traits?.includes('Elite') &&
                        !immuneToPlayerCards(e),
                    )
                    .map((e) => ({
                      label: 'choice.enemy',
                      params: { enemy: e.name },
                      target: { type: 'enemy', id: e.id },
                      then: [
                        exhaust(a),
                        release(a, 'curse'),
                        call(code, a.owner, 'command', { enemy: e.id }),
                      ],
                    })),
                  true,
                ),
              },
            ].filter((o) => o.then.length),
      effect: (s, by, step, d) => {
        const e = s.enemies[String(d.enemy)]
        if (step !== 'command' || !e || !e.location) return []
        const choices: Choice[] = [
          ...getLocation(s, e.location)
            .connections.filter((id) => s.locations[id])
            .map((id) => ({
              label: 'choice.chaosFluteMove',
              params: { enemy: e.name, location: getLocation(s, id).name },
              target: { type: 'location' as const, id },
              then: [{ type: 'MoveEnemy' as const, enemy: e.id, location: id }],
            })),
          ...Object.values(s.enemies)
            .filter(
              (x) =>
                x.location === e.location &&
                !immuneToPlayerCards(x) &&
                getInvestigator(s, by).etherealRound !== s.round,
            )
            .map((x) => ({
              label: 'choice.chaosFluteDamage',
              params: { enemy: x.name, n: e.damage },
              target: { type: 'enemy' as const, id: x.id },
              then: [
                {
                  type: 'DamageEnemy' as const,
                  enemy: x.id,
                  by,
                  amount: e.damage,
                  source: { code },
                },
              ],
            })),
        ]
        return ask(by, choices, true)
      },
    })
    return
  }
  if (code === '11073') {
    registerPlayerCard({
      code,
      revealsEncounterTop: true,
      skillModifier: (_s, _a, t) => (t.skill === 'willpower' ? 1 : 0),
    })
    return
  }
  throw Error('Unreviewed chaos selection ' + code)
}
