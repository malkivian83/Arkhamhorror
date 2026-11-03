// RR: Cancel, Exile, Damage Timing, Additional Costs, Defeat, Slots.
import {
  registerPlayerCard,
  getInvestigator,
  getLocation,
  assetSlots,
  slotCapacity,
  restrictedSlotCapacity,
  engagedEnemies,
  type Message,
  type GameState,
  type Choice,
} from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
import { near, reaction, play } from './helpers'
const pendingDamage = (s: GameState, by: string) =>
  s.queue.find(
    (m): m is Extract<Message, { type: 'TakeDamage' }> =>
      m.type === 'TakeDamage' && m.investigator === by && !!m.damageWindowResolved,
  )
const cancelChoices = (s: GameState, payer: string, target: string, code: string): Message[] => {
  const p = pendingDamage(s, target)
  if (!p) return []
  const cap =
    code === '03157' ? 10 : Math.min(code === '11054' ? 3 : 5, getInvestigator(s, target).resources)
  const choices: Choice[] = []
  for (let damage = 0; damage <= Math.min(cap, p.damage); damage++)
    for (let horror = 0; horror <= Math.min(cap - damage, p.horror); horror++) {
      const n = damage + horror
      if (!n) continue
      choices.push({
        label: code === '03157' ? 'choice.windowCancel' : 'choice.protectionResource',
        params: { n, damage, horror },
        then: [
          ...(code === '11054'
            ? [{ type: 'SpendResources' as const, investigator: target, amount: n }]
            : code === '11063'
              ? [
                  {
                    type: 'TransferResources' as const,
                    from: target,
                    to: payer,
                    amount: n,
                    connecting: true,
                  },
                ]
              : []),
          { type: 'ReducePendingDamage', investigator: target, damage, horror },
        ],
      })
    }
  return ask(target, [...choices, { label: 'choice.skip', then: [] }], true)
}
export function registerEvents(code: string): boolean {
  if (code === '03156') {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) => {
        if (t.type !== 'whenTreacheryDrawn' || !near(s, by).some((i) => i.id === t.investigator))
          return []
        const c = s.treacheries[t.treachery]
        if (!c || c.owner || c.canceled) return []
        // RR Peril: other investigators cannot play cards while its effects resolve.
        if (t.investigator !== by && c.keywords.includes('peril')) return []
        return [
          reaction(code, by, code, [
            play(code, by, [
              { type: 'CancelRevelation', treachery: c.id },
              { type: 'ExileCard', investigator: by, code, playedEvent: true },
            ]),
          ]),
        ]
      },
    })
    return true
  }
  if (['03157', '11054', '11063'].includes(code)) {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) => {
        if (t.type !== 'whenDealtDamage') return []
        const target = getInvestigator(s, t.investigator),
          owner = getInvestigator(s, by)
        const local =
          owner.location !== null &&
          (owner.location === target.location ||
            getLocation(s, owner.location).connections.includes(target.location ?? ''))
        if (
          code === '03157'
            ? t.investigator !== by
            : !local || (code === '11063' && t.investigator === by)
        )
          return []
        const choices = cancelChoices(s, by, t.investigator, code)
        if (
          !choices.length ||
          (code !== '03157' && target.resources < 1) ||
          t.damage + t.horror === 0
        )
          return []
        return [
          reaction(code, by, code, [
            play(code, by, [
              ...choices,
              ...(code === '03157'
                ? [{ type: 'ExileCard' as const, investigator: by, code, playedEvent: true }]
                : []),
            ]),
          ]),
        ]
      },
    })
    return true
  }
  if (code === '04110') {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) => {
        if (t.type !== 'whenRevealChaosToken' || !near(s, by).some((i) => i.id === t.investigator))
          return []
        const token = s.skillTest?.revealing?.face
        return ['skull', 'cultist', 'tablet', 'elderThing'].includes(String(token))
          ? [reaction(code, by, code, [play(code, by, [{ type: 'CancelRevealedToken' }])])]
          : []
      },
    })
    return true
  }
  if (code === '03189') {
    registerPlayerCard({
      code,
      noAttacksOfOpportunity: true,
      play: (s, by) => [
        ...engagedEnemies(s, by)
          .filter((e) => !e.traits?.includes('Elite'))
          .map((e): Message => ({ type: 'DefeatEnemy', enemy: e.id, by })),
        { type: 'SufferTrauma', investigator: by, physical: 1 },
        { type: 'DefeatInvestigator', investigator: by },
      ],
    })
    return true
  }
  if (code === '09086') {
    registerPlayerCard({
      code,
      play: (s, by) => {
        const filled = Object.values(s.assets)
          .filter((a) => a.owner === by)
          .reduce((n, a) => n + assetSlots(a).filter((slot) => slot === 'arcane').length, 0)
        return [
          {
            type: 'DrawCards',
            investigator: by,
            amount: Math.min(
              5,
              Math.max(
                0,
                slotCapacity(s, by, 'arcane') +
                  restrictedSlotCapacity(s, by, 'arcane').reduce((n, r) => n + r.count, 0),
              ),
            ),
          },
          { type: 'ChooseDiscardFromHand', investigator: by, amount: filled },
        ]
      },
    })
    return true
  }
  if (code === '10112') {
    registerPlayerCard({
      code,
      additionalPlayActions: 1,
      noAttacksOfOpportunity: true,
      canPlay: (s, by) => {
        const here = getInvestigator(s, by).location
        return (
          here !== null &&
          Object.values(s.enemies).some(
            (e) => e.location === here || getLocation(s, here).connections.includes(e.location),
          )
        )
      },
      play: (s, by) => {
        const here = getInvestigator(s, by).location
        if (here === null) return []
        return Object.values(s.enemies)
          .filter(
            (e) => e.location === here || getLocation(s, here).connections.includes(e.location),
          )
          .map((e) => continuation(code, by, 'enemy', { enemy: e.id }))
      },
      effect: (s, by, step, data) => {
        if (step !== 'enemy') return []
        const e = s.enemies[String(data.enemy)]
        if (!e) return []
        return ask(
          by,
          [
            {
              label: 'choice.protectionEnemy',
              params: { enemy: e.name },
              then: [{ type: 'DamageEnemy', enemy: e.id, amount: 1, by }],
            },
            ...(!e.traits?.includes('Elite') && !e.cannotBeEvaded
              ? [
                  {
                    label: 'ability.evade',
                    params: { enemy: e.name },
                    then: [{ type: 'EvadeEnemy' as const, enemy: e.id, by }],
                  },
                ]
              : []),
          ],
          true,
        )
      },
    })
    return true
  }
  return false
}
