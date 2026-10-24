import {
  CURTAIN_CALL_STRANGERS,
  curtainCall,
  theLastKing,
  THE_LAST_KING_VIPS,
  echoesOfThePast,
  theUnspeakableOath,
  spreadingFlames,
  smokeAndMirrors,
  queenOfAsh,
  midwinterGala,
  murderAtTheExcelsiorHotel,
  EXCELSIOR_TRUE_CULPRIT,
  GALA_BLOODLESS_MAN,
  GALA_BLOODLESS_MAN_UNLEASHED,
  GALA_FACTION_CARDS,
} from '@lcg/cards'
import {
  allPlayerCardDefs,
  playerCardBehavior,
  playerCardDef,
  type EncounterCard,
  type LocationCard,
} from '@lcg/engine'
import { carcosaCards, excelsiorCards, messages } from '@lcg/i18n'
import type { LocalizedCard } from './localized'

/** Bundled mechanical data, official text where available and local summaries. */
export function fallbackCards(locale: string): LocalizedCard[] {
  const language = locale === 'es' ? messages.es : messages.en
  const types = language.offlineCard.types
  const summaries = language.offlineCard.summary as Record<string, string>
  const names = language.offlineCard.names as Record<string, string>
  const traits = language.offlineCard.traits as Record<string, string>
  const backSummaries = language.offlineCard.backSummary as Record<string, string>
  const cards = new Map<string, LocalizedCard>()
  function put(draft: { [K in keyof LocalizedCard]: LocalizedCard[K] | undefined }) {
    const card = Object.fromEntries(
      Object.entries(draft).filter(([, value]) => value !== undefined),
    ) as unknown as LocalizedCard
    cards.set(card.code, {
      ...card,
      type_name: types[card.type_code as keyof typeof types] ?? card.type_code,
      text: draft.text ?? summaries[card.code] ?? language.offlineCard.help,
      back_text:
        draft.back_text ??
        backSummaries[card.code] ??
        summaries[card.code] ??
        language.offlineCard.help,
    })
  }
  allPlayerCardDefs().forEach((d) =>
    put({
      code: d.code,
      name: names[d.code] ?? d.name,
      real_name: d.name,
      type_code: d.type,
      faction_code: d.class,
      // A printed X uses the ArkhamDB encoding (-2); RenderedCard shows it as X.
      cost: d.cost ?? (playerCardBehavior(d.code)?.costX ? -2 : undefined),
      xp: d.xp,
      traits: traits[d.code] ?? d.traits.join('. '),
      health: d.health ?? playerCardBehavior(d.code)?.enemy?.health,
      enemy_fight: playerCardBehavior(d.code)?.enemy?.fight,
      enemy_evade: playerCardBehavior(d.code)?.enemy?.evade,
      enemy_damage: playerCardBehavior(d.code)?.enemy?.damage,
      enemy_horror: playerCardBehavior(d.code)?.enemy?.horror,
      sanity: d.sanity,
      slot: d.slots?.join(', '),
      skill_willpower: d.skills?.willpower ?? d.icons?.willpower,
      skill_intellect: d.skills?.intellect ?? d.icons?.intellect,
      skill_combat: d.skills?.combat ?? d.icons?.combat,
      skill_agility: d.skills?.agility ?? d.icons?.agility,
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
    // Debilidades de jugador apartadas en un escenario (03059): se conserva su ficha propia.
    if (playerCardDef(c.code)) return
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
    midwinterGala({ players: 1 }),
    murderAtTheExcelsiorHotel({ players: 1 }),
    curtainCall({ difficulty: 'standard' }),
    theLastKing({ difficulty: 'standard' }),
    // Cada semilla deja fuera un Lugar por planta: con varias aparecen todos.
    ...Array.from({ length: 8 }, (_, seed) => echoesOfThePast({ difficulty: 'standard', seed })),
    // Una copia de cada ala de los Pasillos y las dos versiones del acto 2.
    ...Array.from({ length: 8 }, (_, seed) =>
      theUnspeakableOath({
        difficulty: 'standard',
        seed,
        log: {
          notes: seed % 2 ? ['carcosaTookTheOnyxClasp'] : [],
          crossedOut: [],
          values: {},
          investigators: {},
          chaosTokens: [],
        },
      }),
    ),
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

  // The Bloodless Man starts in play, outside the scenario's encounter/set-aside lists.
  encounter(GALA_BLOODLESS_MAN)
  encounter(GALA_BLOODLESS_MAN_UNLEASHED)
  const jewel = allPlayerCardDefs().find((d) => d.code === '71052')!
  // This is an asset with an encounter revelation, not a threat-area treachery.
  put({ ...cards.get(jewel.code)!, type_code: 'asset', faction_code: 'neutral' })
  for (const faction of Object.values(GALA_FACTION_CARDS)) {
    for (const code of [faction.story, `${faction.story}b`])
      put({
        code,
        name: faction.storyName,
        real_name: faction.storyName,
        type_code: 'story',
        faction_code: faction.className,
      })
  }
  put({
    code: '71001',
    name: 'The Midwinter Gala',
    real_name: 'The Midwinter Gala',
    type_code: 'scenario',
  })
  // Asesinato en el hotel Excelsior: El verdadero culpable (plan y acto a la vez),
  // la carta de escenario y los textos oficiales del catálogo local.
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  EXCELSIOR_TRUE_CULPRIT.forEach((code, n) =>
    put({
      code,
      name: `The True Culprit (v. ${roman[n]})`,
      real_name: `The True Culprit (v. ${roman[n]})`,
      type_code: 'agenda',
    }),
  )
  put({
    code: '84001',
    name: 'Murder at the Excelsior Hotel',
    real_name: 'Murder at the Excelsior Hotel',
    type_code: 'scenario',
  })
  put({ code: '03043', name: 'Curtain Call', real_name: 'Curtain Call', type_code: 'scenario' })
  // Se cierra el telón usa una sola de las tres copias del acto 2 por partida.
  for (const code of CURTAIN_CALL_STRANGERS)
    put({ code, name: 'The Stranger', real_name: 'The Stranger', type_code: 'act', clues: 0 })
  put({ code: '03061', name: 'The Last King', real_name: 'The Last King', type_code: 'scenario' })
  put({
    code: '03120',
    name: 'Echoes of the Past',
    real_name: 'Echoes of the Past',
    type_code: 'scenario',
  })
  put({
    code: '03159',
    name: 'The Unspeakable Oath',
    real_name: 'The Unspeakable Oath',
    type_code: 'scenario',
  })
  // El Último Rey: Realidades repulsivas (Historia con el Enemigo Lunático al dorso) y el
  // reverso de Historia de cada Transeúnte.
  for (const vip of THE_LAST_KING_VIPS) {
    put({
      code: vip.sickening,
      name: 'Sickening Reality',
      real_name: 'Sickening Reality',
      type_code: 'story',
    })
    put({ code: vip.interview, name: vip.name, real_name: vip.name, type_code: 'story' })
  }
  const catalogues = [excelsiorCards, carcosaCards].map((c) => c[locale === 'es' ? 'es' : 'en'])
  for (const [code, text] of catalogues.flatMap((c) => Object.entries(c))) {
    const card = cards.get(code)
    if (!card) continue
    put({
      ...card,
      name: text.name,
      subname: text.subname,
      traits: text.traits ?? card.traits,
      text: text.text,
      back_name: text.backName ?? card.back_name,
      back_text: text.backText ?? card.back_text,
    })
  }
  const catalogue = language.galaCards as Record<
    string,
    { name: string; summary: string; backName?: string; backSummary?: string }
  >
  // Keep both mechanical faces, and make a back-face code reverse to the front text.
  for (const [code, text] of Object.entries(catalogue)) {
    const front = cards.get(code)!
    put({
      ...front,
      name: text.name,
      text: text.summary,
      back_name: text.backName ?? text.name,
      back_text: text.backSummary ?? text.summary,
    })
    const back = cards.get(`${code}b`)
    if (back)
      put({
        ...back,
        name: text.backName ?? text.name,
        text: text.backSummary ?? text.summary,
        back_name: text.name,
        back_text: text.summary,
      })
  }
  return [...cards.values()]
}
