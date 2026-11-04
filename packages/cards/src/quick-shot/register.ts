// RR: Fast, Myriad, Drawing Cards, Reaction Opportunities, Costs, Damage.
import {
  enemiesAt,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  enemyBehavior,
  agendaBehavior,
  scenarioBehavior,
  type GameState,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
const code = '11031'
const targets = (s: GameState, by: string) => {
  const here = getInvestigator(s, by).location
  const agenda = s.agendas[s.agendaIndex]
  return here === null
    ? []
    : enemiesAt(s, here).filter(
        (e) =>
          !e.hasNoStats &&
          !(agenda && agendaBehavior(agenda.code)?.enemyImmune?.(s, e)) &&
          !scenarioBehavior(s.scenarioId)?.enemyImmune?.(s, e) &&
          (enemyBehavior(e.code)?.damageTaken?.(s, e, 1, { attack: false, traits: ['Spirit'] })
            ?.amount ?? 1) > 0,
      )
}
export function registerQuickShot(c: string): void {
  if (c !== code) throw Error('Unreviewed Quick Shot')
  registerPlayerCard({
    code,
    canPlay: (s, by) => s.activeTurn === by && targets(s, by).length > 0,
    play: (s, by) =>
      ask(
        by,
        targets(s, by).map((e) => ({
          label: 'choice.enemy',
          params: { enemy: e.name },
          target: { type: 'enemy', id: e.id },
          then: [
            {
              type: 'DamageEnemy',
              enemy: e.id,
              by,
              amount: 1,
              source: { attack: false, traits: ['Spirit'] },
            },
          ],
        })),
      ),
    handReactions: (s, t, by) =>
      t.type === 'afterDrawCard' &&
      t.investigator === by &&
      t.card === code &&
      s.activeTurn === by &&
      targets(s, by).length > 0
        ? [
            {
              key: 'hand:' + code,
              investigator: by,
              label: 'ability.playCard',
              params: { card: playerCardDef(code)!.name },
              target: { type: 'hand', code },
              then: [{ type: 'PlayCard', investigator: by, code, discount: 2 }],
            },
          ]
        : [],
  })
}
