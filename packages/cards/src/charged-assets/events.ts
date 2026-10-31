// RR: Fast, Then, Moving, Random, Cancel, Enemy Attacks, Remove from Game.
import {
  canEnter,
  canAffordEntry,
  moveBlocked,
  leavingBlocked,
  getInvestigator,
  registerPlayerCard,
  enemyBehavior,
  playerCardDef,
  stuckInPlay,
} from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'
const symbols = ['skull', 'cultist', 'tablet', 'elderThing', 'autoFail']
export function registerEvents(code: string): boolean {
  if (code === '09104') {
    registerPlayerCard({
      code,
      canPlay: (s, by) =>
        s.phase === 'investigation' &&
        (s.immediateActions?.[0]
          ? s.immediateActions[0].endedTurn
            ? null
            : s.immediateActions[0].activeTurn
          : s.activeTurn) === by &&
        s.agendas.length > 0 &&
        s.agendaIndex === s.agendas.length - 1,
      play: (_s, by) => [
        // The resolving event cannot be included in an empty-deck reshuffle.
        { type: 'RemoveFromDiscard', investigator: by, code, playedEvent: true },
        { type: 'DrawCards', investigator: by, amount: 1 },
        { type: 'GainResources', investigator: by, amount: 1 },
        { type: 'GainActions', investigator: by, amount: 1 },
      ],
    })
    return true
  }
  if (code === '02153') {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) => {
        if (t.type !== 'whenEnemyAttacks' || s.canceledAttack === t.enemy) return []
        const e = s.enemies[t.enemy] ?? s.attackSourcesWithoutLocation?.[t.enemy]
        if (
          !e ||
          enemyBehavior(e.code)?.attacksCannotBeCanceled ||
          getInvestigator(s, by).location === null ||
          getInvestigator(s, t.investigator).location !== getInvestigator(s, by).location
        )
          return []
        return [
          {
            key: code + ':cancel',
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
                  { type: 'CancelEnemyAttack', enemy: e.id },
                  {
                    type: 'RevealTokenOutsideTest',
                    investigator: by,
                    then: {
                      type: 'PlayerCardEffect',
                      code,
                      investigator: by,
                      step: 'token',
                      data: { enemy: e.id, damage: e.damage },
                    },
                  },
                ],
              },
            ],
          },
        ]
      },
      effect: (_s, by, step, data) =>
        step === 'token' && symbols.includes(String(data.token))
          ? [
              {
                type: 'DamageEnemy',
                enemy: String(data.enemy),
                amount: Number(data.damage),
                investigator: by,
              },
            ]
          : [],
    })
    return true
  }
  if (code === '03034') {
    const destinations = (s: Parameters<typeof getInvestigator>[0], by: string) => {
      const i = getInvestigator(s, by)
      return i.location === null || moveBlocked(s, by) || leavingBlocked(s, i.location)
        ? []
        : Object.values(s.locations).filter(
            (l) =>
              l.revealed && l.id !== i.location && canEnter(s, by, l.id) && canAffordEntry(s, l.id),
          )
    }
    registerPlayerCard({
      code,
      canPlay: (s, by) => destinations(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          destinations(s, by).map((l) => ({
            label: 'choice.pilotMove',
            params: { name: getInvestigator(s, by).name, location: l.name },
            target: { type: 'location', id: l.id },
            then: [
              { type: 'MoveTo', investigator: by, location: l.id },
              {
                type: 'RevealTokenOutsideTest',
                investigator: by,
                then: { type: 'PlayerCardEffect', code, investigator: by, step: 'token' },
              },
            ],
          })),
          true,
        ),
      effect: (s, by, step, data) => {
        if (step !== 'token' || !symbols.includes(String(data.token))) return []
        const assets = Object.values(s.assets).filter(
          (a) =>
            a.owner === by &&
            !stuckInPlay(s, a) &&
            playerCardDef(a.code)?.traits.some((t) => ['Item', 'Ally'].includes(t)),
        )
        return assets.length
          ? ask(
              by,
              assets.map((a) => ({
                label: 'choice.chargedTrash',
                params: { card: cardName(a.code) },
                target: { type: 'asset', id: a.id },
                then: [{ type: 'DiscardAsset', asset: a.id }],
              })),
              true,
            )
          : [{ type: 'TakeDamage', investigator: by, damage: 1, horror: 0 }]
      },
    })
    return true
  }
  return false
}
