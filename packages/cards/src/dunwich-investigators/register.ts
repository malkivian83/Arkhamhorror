// RR: Engagement, Chaos Tokens, Reveal, Seal/physical tokens, Healing, Weaknesses and Spawn.
import {
  getInvestigator,
  getLocation,
  leadInvestigator,
  distancesFrom,
  registerInvestigator,
  registerTreachery,
  type GameState,
  type Message,
  type Choice,
  type ChaosToken,
} from '@lcg/engine'
import { ask, option, registerAdvancedCard as registerPlayerCard } from '../advanced-tests/common'
import {
  continuation,
  nextToken,
  resolvedFaces,
  resolvedPhysical,
  startTokens,
  type Data,
} from '../chaos-allies/common'
const call = (
  code: string,
  by: string,
  step: string,
  data: Data = {},
): Extract<Message, { type: 'PlayerCardEffect' }> =>
  continuation(code, by, step, data) as Extract<Message, { type: 'PlayerCardEffect' }>
const heals = (s: GameState, by: string): Choice[] => {
  const at = getInvestigator(s, by).location
  if (!at) return []
  const locations = [at, ...getLocation(s, at).connections]
  return s.investigators
    .filter(
      (i) => !i.eliminated && i.location !== null && locations.includes(i.location) && i.horror > 0,
    )
    .map((i) => ({
      label: 'choice.healHorrorOf',
      params: { name: i.name },
      target: { type: 'investigator', id: i.id },
      then: [{ type: 'Heal', investigator: i.id, damage: 0, horror: 1, healer: by }],
    }))
}
export function registerDunwich(code: string): void {
  if (code === '02001') {
    registerInvestigator({
      code,
      reactions: (_s, t, i) =>
        t.type === 'afterEngage' && t.investigator === i.id
          ? [
              {
                key: code + ':' + t.enemy,
                investigator: i.id,
                label: 'ability.zoeyEngage',
                then: [{ type: 'GainResources', investigator: i.id, amount: 1 }],
              },
            ]
          : [],
      elderSign: (s) => ({
        modifier: 1,
        ...(s.skillTest?.kind.type === 'fight'
          ? { immediate: [{ type: 'AdjustAttackDamage', amount: 1 } as Message] }
          : {}),
      }),
    })
    return
  }
  if (code === '02004') {
    registerInvestigator({
      code,
      tokenModifier: (_s, _i, token, modifier) => (token === 'skull' ? 0 : modifier),
      elderSign: () => ({ modifier: 1 }),
      reactions: (s, t, i) =>
        t.type === 'whenRevealChaosToken' &&
        t.investigator === i.id &&
        (s.tokenReveal ?? s.skillTest?.revealing)?.face === 'elderSign'
          ? [
              {
                key: code + ':skull',
                investigator: i.id,
                label: 'ability.jimSkull',
                then: [{ type: 'TreatRevealedTokenAs', token: 'skull', cancel: false }],
              },
            ]
          : [],
    })
    return
  }
  if (code === '02006') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'afterEngage' &&
        t.investigator === a.owner &&
        !a.exhausted &&
        getInvestigator(s, a.owner).resources > 0 &&
        s.enemies[t.enemy]
          ? [
              option(a, [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'SpendResources', investigator: a.owner, amount: 1 },
                { type: 'DamageEnemy', enemy: t.enemy, by: a.owner, amount: 1, source: { code } },
              ]),
            ]
          : [],
    })
    return
  }
  if (code === '02007') {
    registerTreachery({
      code,
      revelation: (_s, by, t) => [
        {
          type: 'PlaceTreachery',
          treachery: t.id,
          placement: { type: 'threatArea', investigator: by },
        },
        call(code, by, 'discard', { treachery: t.id }),
      ],
      whenGameEnds: (s, t) =>
        t.owner && t.placement.type === 'enemy' && s.enemies[t.placement.enemy]
          ? [{ type: 'SufferTrauma', investigator: t.owner, mental: 1 }]
          : [],
    })
    registerPlayerCard({
      code,
      effect: (s, by, step, d) => {
        const t = s.treacheries[String(d.treachery)]
        if (!t) return []
        if (step === 'attach')
          return s.enemies[String(d.enemy)]
            ? [
                {
                  type: 'PlaceTreachery',
                  treachery: t.id,
                  placement: { type: 'enemy', enemy: String(d.enemy) },
                },
              ]
            : []
        if (step === 'discard') {
          const top = s.encounterDeck[0]
          if (!top) return [{ type: 'DiscardTreachery', treachery: t.id }]
          return [
            { type: 'DiscardTopEncounter', investigator: by },
            {
              type: 'Forced',
              trigger: { type: 'encounterCardDiscarded', card: top, investigator: by },
            },
            call(code, by, top.kind === 'enemy' ? 'spawn' : 'discard', {
              ...d,
              ...(top.kind === 'enemy' ? { enemyCode: top.code } : {}),
            }),
          ]
        }
        if (step !== 'spawn') return []
        const at = getInvestigator(s, by).location
        if (!at) return [{ type: 'DiscardTreachery', treachery: t.id }]
        const distances = distancesFrom(s, at),
          furthest = Math.max(...distances.values())
        return ask(
          leadInvestigator(s)!.id,
          [...distances]
            .filter(([, n]) => n === furthest)
            .map(([location]) => ({
              label: 'choice.location',
              params: { location: getLocation(s, location).name },
              target: { type: 'location', id: location },
              then: [
                {
                  type: 'SpawnEncounterDiscardEnemy',
                  code: String(d.enemyCode),
                  location,
                  onSpawn: call(code, by, 'attach', d),
                },
              ],
            })),
        )
      },
    })
    return
  }
  if (code === '02012') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'whenRevealChaosToken' &&
        s.skillTest &&
        (s.tokenReveal ?? s.skillTest?.revealing)?.face === 'skull' &&
        !a.exhausted &&
        heals(s, a.owner).length
          ? [
              option(a, [
                { type: 'ExhaustAsset', asset: a.id },
                ...ask(a.owner, heals(s, a.owner), true),
              ]),
            ]
          : [],
    })
    return
  }
  if (code === '02013') {
    registerTreachery({
      code,
      revelation: (s, by) => [startTokens(code, by, { countsDuringTest: !!s.skillTest })],
    })
    registerPlayerCard({
      code,
      effect: (s, by, step, d) => {
        if (step === 'draw')
          return s.chaosBag.length
            ? [nextToken(code, by, d)]
            : [{ type: 'ReturnHeldChaosTokens', group: String(d.group) }]
        if (step !== 'token') return []
        const faces = [
          ...(JSON.parse(String(d.faces ?? '[]')) as ChaosToken[]),
          ...resolvedFaces(d).filter((x): x is ChaosToken => x !== null),
        ]
        const count = Number(d.draws ?? 0) + 1,
          harm = faces.filter((t) => t === 'skull' || t === 'autoFail').length
        return [
          {
            type: 'StoreHeldChaosTokens',
            group: String(d.group),
            tokens: [...resolvedPhysical(d), ...JSON.parse(String(d.ignored ?? '[]'))],
          },
          ...(count >= 5 || !s.chaosBag.length
            ? [
                { type: 'ReturnHeldChaosTokens' as const, group: String(d.group) },
                ...(harm
                  ? [{ type: 'TakeDamage' as const, investigator: by, damage: harm, horror: harm }]
                  : []),
              ]
            : [nextToken(code, by, { ...d, draws: count, faces: JSON.stringify(faces) })]),
        ]
      },
    })
    return
  }
  throw Error('Unreviewed investigator card ' + code)
}
