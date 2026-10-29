import { push, shuffle, type EnemyCard, type GameState } from '@lcg/engine'
import { isEncounterGhoul } from '../encounter-variant-rules'
/** RR Search: choose a matching card and its zone, then shuffle the deck. */
export function classicSearch(
  s: GameState,
  key: string,
  d: Record<string, string | number | boolean>,
): GameState | null {
  const investigator = String(d.investigator)
  if (key === 'carcosaFindCultist' || key === 'devourerFindMonster' || key === 'searchGhoul') {
    const trait =
      key === 'searchGhoul' ? 'Ghoul' : key === 'carcosaFindCultist' ? 'Cultist' : 'Monster'
    const choices = (['deck', 'discard'] as const).flatMap((zone) => {
      const cards = zone === 'deck' ? s.encounterDeck : s.encounterDiscard
      return [
        ...new Map(
          cards
            .filter(
              (c): c is EnemyCard =>
                c.kind === 'enemy' &&
                (trait === 'Ghoul' ? isEncounterGhoul(s, c) : !!c.traits?.includes(trait)),
            )
            .map((c) => [c.code, c]),
        ).values(),
      ].map((c) => ({
        label:
          zone === 'deck' ? 'choice.zealot.searchDeckEnemy' : 'choice.zealot.searchDiscardEnemy',
        params: { enemy: c.name },
        then: [
          {
            type: 'ScenarioSpecific' as const,
            key: 'zealotDrawSearched',
            data: { investigator, code: c.code, zone },
          },
        ],
      }))
    })
    if (!choices.length) {
      const [encounterDeck, rng] = shuffle(s.encounterDeck, s.rng)
      return { ...s, encounterDeck, rng }
    }
    return push(s, {
      type: 'Ask',
      investigator,
      question: { kind: 'chooseOne', prompt: 'prompt.chooseEnemy', choices },
    })
  }
  if (key === 'zealotDrawSearched') {
    const inDeck = d.zone === 'deck',
      cards = inDeck ? s.encounterDeck : s.encounterDiscard
    const index = cards.findIndex((c) => c.code === d.code)
    const card = cards[index]
    if (!card) return s
    const rest = cards.filter((_, n) => n !== index)
    const [encounterDeck, rng] = shuffle(inDeck ? rest : s.encounterDeck, s.rng)
    return push(
      { ...s, rng, encounterDeck, encounterDiscard: inDeck ? s.encounterDiscard : rest },
      { type: 'ResolveEncounterCard', investigator, card },
    )
  }
  return null
}
