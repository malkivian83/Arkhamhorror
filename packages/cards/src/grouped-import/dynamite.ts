import {
  enemiesAt,
  getInvestigator,
  investigatorsAt,
  playerCardBehavior,
  registerPlayerCard,
} from '@lcg/engine'
import '../jenny-barnes/card-01024'
// Reuse the reviewed simultaneous damage/defeat ordering of level zero.
export function registerDynamite(code: string, fast: boolean): void {
  registerPlayerCard({
    code,
    ...(fast ? { playInAnyFastWindow: true } : { noAttacksOfOpportunity: true }),
    canPlay: (s, by) => getInvestigator(s, by).location !== null,
    play: (s, by) =>
      playerCardBehavior('01024')!.play!(s, by).map((m) =>
        m.type === 'Ask' && m.question.kind === 'chooseOne'
          ? {
              ...m,
              question: {
                ...m.question,
                choices: m.question.choices.filter(
                  (c) =>
                    c.target?.type !== 'location' ||
                    enemiesAt(s, c.target.id).length > 0 ||
                    investigatorsAt(s, c.target.id).length > 0,
                ),
              },
            }
          : m,
      ),
  })
}
