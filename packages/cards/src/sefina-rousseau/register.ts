// RR: Setup, Draw, Action, Copy, Revelation; FAQ 2.6 and Painted World, 21 September 2022.
import {
  getInvestigator,
  playerCardDef,
  registerInvestigator,
  registerTreachery,
  scenarioBehavior,
  type GameState,
} from '@lcg/engine'
import {
  ask,
  cardName,
  continuation,
  mayParticipate,
  registerAdvancedCard as registerPlayerCard,
} from '../advanced-tests/common'
export function registerSefinaCard(code: string): void {
  if (code === '03003') {
    const options = (s: GameState, by: string) =>
      (scenarioBehavior(s.scenarioId)?.cannotDrawCards?.(s, by)
        ? []
        : (getInvestigator(s, by).beneath ?? [])
      ).map((c, index) => ({
        label: 'choice.sefinaDraw',
        params: { card: cardName(c) },
        then: [{ type: 'DrawInvestigatorBeneath' as const, investigator: by, index }],
      }))
    registerInvestigator({
      code,
      openingReplacement: {
        draw: 13,
        keep: 8,
        maximum: 5,
        canStore: (c) => c !== '03012' && playerCardDef(c)?.type === 'event',
      },
      elderSign: (s, i) => ({
        modifier: 3,
        immediate: ask(i.id, [...options(s, i.id), { label: 'choice.skip', then: [] }], true),
      }),
      abilities: (s, i, by) =>
        by === i.id && !scenarioBehavior(s.scenarioId)?.cannotDrawCards?.(s, by)
          ? (getInvestigator(s, by).beneath ?? []).map((c, index) => ({
              key: code + ':draw:' + index,
              label: 'ability.sefinaDraw',
              params: { card: cardName(c) },
              actions: 1,
              provokes: false,
              then: [{ type: 'DrawInvestigatorBeneath', investigator: by, index }],
            }))
          : [],
    })
    return
  }
  if (code === '03012') {
    registerPlayerCard({
      code,
      copyEvents: (s, by) =>
        (mayParticipate(s, by)
          ? (s.investigators.find((i) => i.id === '03003')?.beneath ?? [])
          : []
        ).filter((c) => c !== code && !playerCardDef(c)?.exceptional),
    })
    return
  }
  if (code === '03013') {
    registerPlayerCard({
      code,
      effect: (s, by, step, d) =>
        step === 'finish' &&
        s.treacheries[String(d.treachery)] &&
        getInvestigator(s, by).deck.length >= 5
          ? [{ type: 'ShuffleTreacheryIntoDeck', treachery: String(d.treachery), investigator: by }]
          : [],
    })
    registerTreachery({
      code,
      revelation: (_s, by, t) => [
        {
          type: 'RemoveRandomBeneath',
          investigator: by,
          otherwise: [{ type: 'TakeDamage', investigator: by, damage: 1, horror: 1 }],
        },
        continuation(code, by, 'finish', { treachery: t.id }),
      ],
    })
    return
  }
  throw Error('Unreviewed Sefina card ' + code)
}
