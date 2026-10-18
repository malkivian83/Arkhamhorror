import { spreadingFlames, smokeAndMirrors, queenOfAsh } from '@lcg/cards'
import { allPlayerCardDefs, type EncounterCard, type LocationCard } from '@lcg/engine'
import { messages } from '@lcg/i18n'
import type { LocalizedCard } from './localized'

/** Bundled mechanical data and our own short summaries; no remote images or card prose. */
export function fallbackCards(locale: string): LocalizedCard[] {
  const language = locale === 'es' ? messages.es : messages.en
  const types = language.offlineCard.types
  const summaries = language.offlineCard.summary as Record<string, string>
  const backSummaries = language.offlineCard.backSummary as Record<string, string>
  const cards = new Map<string, LocalizedCard>()
  function put(draft: { [K in keyof LocalizedCard]: LocalizedCard[K] | undefined }) {
    const card = Object.fromEntries(
      Object.entries(draft).filter(([, value]) => value !== undefined),
    ) as unknown as LocalizedCard
    cards.set(card.code, {
      ...card,
      type_name: types[card.type_code as keyof typeof types] ?? card.type_code,
      text: summaries[card.code] ?? language.offlineCard.help,
      back_text: backSummaries[card.code] ?? summaries[card.code] ?? language.offlineCard.help,
    })
  }
  allPlayerCardDefs().forEach((d) =>
    put({
      code: d.code,
      name: d.name,
      real_name: d.name,
      type_code: d.type,
      faction_code: d.class,
      cost: d.cost,
      xp: d.xp,
      traits: d.traits.join('. '),
      health: d.health,
      sanity: d.sanity,
      slot: d.slots?.join(', '),
      skill_willpower: d.icons?.willpower,
      skill_intellect: d.icons?.intellect,
      skill_combat: d.icons?.combat,
      skill_agility: d.icons?.agility,
      skill_wild: d.icons?.wild,
    }),
  )
  function location(l: LocationCard) {
    put({
      code: l.id,
      name: l.name,
      real_name: l.name,
      type_code: 'location',
      shroud: l.shroud,
      clues: l.clueValue,
      clues_fixed: !l.cluesPerInvestigator,
      victory: l.victory,
    })
  }
  function encounter(c: EncounterCard) {
    put({
      code: c.code,
      name: c.name,
      real_name: c.name,
      type_code: c.kind,
      traits: c.traits?.join('. '),
      ...(c.kind === 'enemy'
        ? {
            health: c.health,
            health_per_investigator: c.healthPerInvestigator,
            enemy_fight: c.fight,
            enemy_evade: c.evade,
            enemy_damage: c.damage,
            enemy_horror: c.horror,
            victory: c.victory,
          }
        : {}),
    })
  }
  const scenarios = [
    spreadingFlames(),
    queenOfAsh(),
    ...Array.from({ length: 12 }, (_, seed) =>
      smokeAndMirrors({
        seed,
        log: {
          notes: seed % 2 ? ['savedUniversity'] : [],
          crossedOut: [],
          values: {},
          investigators: {},
          chaosTokens: [],
        },
      }),
    ),
  ]
  for (const scenario of scenarios) {
    ;[...scenario.locations, ...(scenario.setAsideLocations ?? [])].forEach(location)
    ;[
      ...scenario.encounterDeck,
      ...(scenario.setAside ?? []),
      ...scenario.locations.flatMap((l) => l.beneath ?? []),
    ].forEach(encounter)
    scenario.agendas.forEach((c) => {
      if (c.code)
        put({
          code: c.code,
          name: c.name,
          real_name: c.name,
          type_code: 'agenda',
          doom: c.doomThreshold,
        })
    })
    scenario.acts.forEach((c) => {
      if (c.code)
        put({
          code: c.code,
          name: c.name,
          real_name: c.name,
          type_code: 'act',
          clues: c.clueThreshold,
        })
    })
  }
  const elokoss = cards.get('12179')
  if (elokoss) put({ ...elokoss, code: '12179b', type_code: 'enemy' })
  return [...cards.values()]
}
