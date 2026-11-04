// RR: Play vs Put into Play, Additional Costs, Lasting Effects, Reveal Chaos Tokens.
import {
  canPlayByEffect,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  shroudOf,
  stuckInPlay,
  type GameState,
  type Message,
  type ChaosToken,
} from '@lcg/engine'
import { ask, continuation, cardName, draw, gain, heal, hurt } from './common'
const spellAsset = (c: string) => {
  const d = playerCardDef(c)
  return d?.type === 'asset' && d.traits.some((t) => ['Spell', 'Ritual'].includes(t))
}
export function registerFieldEvent(code: string): boolean {
  if (code === '11024') {
    registerPlayerCard({
      code,
      noAttacksOfOpportunity: true,
      canPlay: (s, by) => s.activeTurn === by && (getInvestigator(s, by).actionsTaken ?? 0) === 0,
      play: (s, by) => [
        draw(by, getInvestigator(s, by).drewEnemyRound === s.round ? 2 : 1),
        heal(by, 0, 1),
      ],
    })
    return true
  }
  if (code === '60175') {
    registerPlayerCard({
      code,
      canPlay: (s, by) =>
        Object.values(s.assets).some(
          (a) =>
            a.owner === by &&
            playerCardDef(a.code)?.traits.includes('Firearm') &&
            playerCardDef(a.code)?.uses?.type === 'ammo',
        ),
      play: (_s, by) => [continuation(code, by, 'ammo', { remaining: 5 })],
      effect: (s, by, _step, data) =>
        Number(data.remaining) <= 0
          ? []
          : ask(
              by,
              Object.values(s.assets)
                .filter(
                  (a) =>
                    a.owner === by &&
                    playerCardDef(a.code)?.traits.includes('Firearm') &&
                    playerCardDef(a.code)?.uses?.type === 'ammo',
                )
                .map((a) => ({
                  label: 'choice.fieldAbility',
                  params: { card: cardName(a.code) },
                  target: { type: 'asset' as const, id: a.id },
                  then: [
                    { type: 'AddUses', asset: a.id, amount: 1 },
                    continuation(code, by, 'ammo', { remaining: Number(data.remaining) - 1 }),
                  ],
                })),
              true,
            ),
    })
    return true
  }
  if (code === '60463') {
    const candidates = (s: GameState, by: string) =>
      getInvestigator(s, by).hand.filter(
        (c) => spellAsset(c) && canPlayByEffect(s, by, c, 'hand', false, 3),
      )
    registerPlayerCard({
      code,
      noAttacksOfOpportunity: true,
      additionalPlayCosts: (_s, by) => [hurt(by, 1)],
      canPlay: (s, by) => candidates(s, by).length > 0,
      play: (s, by) => [
        ...ask(
          by,
          candidates(s, by).map((c) => ({
            label: 'choice.takeCard',
            params: { card: cardName(c) },
            then: [{ type: 'PlayCard', investigator: by, code: c, discount: 3, byEffect: true }],
          })),
        ),
      ],
    })
    return true
  }
  if (code === '60465') {
    const cards = (s: GameState, by: string) =>
      getInvestigator(s, by).hand.filter((c) => {
        const d = playerCardDef(c)
        return (
          (d?.type === 'asset' &&
            d.traits.some((t) => ['Spell', 'Charm'].includes(t)) &&
            !d.unique) ||
          (d?.type === 'asset' &&
            d.traits.some((t) => ['Spell', 'Charm'].includes(t)) &&
            !Object.values(s.assets).some((a) => playerCardDef(a.code)?.name === d.name))
        )
      })
    registerPlayerCard({
      code,
      canPlay: (s, by) => s.activeTurn === by && cards(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          cards(s, by).map((c) => ({
            label: 'choice.takeCard',
            params: { card: cardName(c) },
            then: [
              {
                type: 'PutAssetIntoPlay',
                investigator: by,
                code: c,
                fromHand: true,
                onEntered: continuation(code, by, 'entered') as Extract<
                  Message,
                  { type: 'PlayerCardEffect' }
                >,
              },
            ],
          })),
        ),
      effect: (s, _by, _step, data) =>
        s.assets[String(data.asset)]
          ? [
              {
                type: 'AtEndOfRound',
                then: [
                  continuation(code, s.assets[String(data.asset)]!.owner, 'return', {
                    asset: String(data.asset),
                  }),
                ],
              },
            ]
          : [],
    })
    // The delayed continuation uses the exact instance, so another copy is never shuffled.
    registerMirrorReturn(code)
    return true
  }
  if (code === '60416') {
    registerPlayerCard({
      code,
      play: (_s, by) => [gain(by), continuation(code, by, 'next', { held: '[]', hits: 0 })],
      effect: (s, by, step, data) => {
        const held = JSON.parse(String(data.held ?? '[]')) as ChaosToken[]
        let hits = Number(data.hits ?? 0)
        if (step === 'token') {
          held.push(data.physical as ChaosToken)
          if (['skull', 'cultist', 'tablet', 'elderThing', 'autoFail'].includes(String(data.token)))
            hits++
        }
        if (held.length >= 3 || s.chaosBag.length === 0)
          return [{ type: 'AddChaosTokens', tokens: held, scenarioOnly: true }, gain(by, hits * 2)]
        return [
          {
            type: 'RevealTokenOutsideTest',
            investigator: by,
            hold: true,
            then: continuation(code, by, 'token', { held: JSON.stringify(held), hits }) as Extract<
              Message,
              { type: 'PlayerCardEffect' }
            >,
          },
        ]
      },
    })
    return true
  }
  if (code === '60282') {
    registerPlayerCard({
      code,
      investigateAction: true,
      canPlay: (s, by) => getInvestigator(s, by).location !== null,
      play: (_s, by) =>
        ask(
          by,
          [0, 1, 2, 3].map((n) => ({
            label: 'choice.fieldHorror',
            params: { n },
            then: [...(n ? [hurt(by, 0, n)] : []), continuation(code, by, 'test')],
          })),
          true,
        ),
      effect: (s, by) => {
        const i = getInvestigator(s, by)
        return i.location === null
          ? []
          : [
              {
                type: 'BeginSkillTest',
                investigator: by,
                skill: 'intellect',
                difficulty: shroudOf(s, i.location),
                modifier: 2,
                effectSource: code,
                kind: {
                  type: 'investigate',
                  location: i.location,
                  extraClues: Math.min(4, i.horror),
                },
              },
            ]
      },
    })
    return true
  }
  return false
}
import { playerCardBehavior } from '@lcg/engine'
function registerMirrorReturn(code: string) {
  const b = playerCardBehavior(code)!
  registerPlayerCard({
    ...b,
    effect: (s, by, step, data) =>
      step === 'return'
        ? s.assets[String(data.asset)] && !stuckInPlay(s, s.assets[String(data.asset)]!)
          ? [{ type: 'ShuffleAssetIntoDeck', asset: String(data.asset) }]
          : []
        : b.effect!(s, by, step, data),
  })
}
