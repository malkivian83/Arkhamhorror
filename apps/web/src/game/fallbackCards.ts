import {
  theGathering,
  DUNWICH_ENCOUNTER_SETS,
  extracurricularActivity,
  theHouseAlwaysWins,
  theMiskatonicMuseum,
  theEssexCountyExpress,
  bloodOnTheAltar,
  undimensionedAndUnseen,
  UNSEEN_LOCATIONS,
  ALTAR_LOCATIONS,
  ESSEX_LOCATIONS,
  MUSEUM_LOCATIONS,
  HOUSE_LOCATIONS,
  HOUSE_PIT_BOSS,
  DUNWICH_LOCATION_CARDS,
  CURTAIN_CALL_STRANGERS,
  curtainCall,
  theLastKing,
  THE_LAST_KING_VIPS,
  echoesOfThePast,
  theUnspeakableOath,
  aPhantomOfTruth,
  thePallidMask,
  blackStarsRise,
  BLACK_STARS_RISE_CODES,
  dimCarcosa,
  DIM_CARCOSA_CODES,
  DIM_CARCOSA_STORIES,
  spreadingFlames,
  smokeAndMirrors,
  queenOfAsh,
  midwinterGala,
  murderAtTheExcelsiorHotel,
  EXCELSIOR_TRUE_CULPRIT,
  GALA_BLOODLESS_MAN,
  GALA_BLOODLESS_MAN_UNLEASHED,
  GALA_FACTION_CARDS,
  fortuneAndFollyPartOne,
  fortuneAndFollyPartTwo,
  FORTUNE_SETUP_ENEMIES,
  FORTUNE_CODES,
} from '@lcg/cards'
import {
  allPlayerCardDefs,
  playerCardBehavior,
  playerCardDef,
  printedCode,
  type EncounterCard,
  type LocationCard,
} from '@lcg/engine'
import {
  cardNarratives,
  carcosaCards,
  excelsiorCards,
  fortuneCards,
  zealotCards,
  dunwichCards,
  messages,
} from '@lcg/i18n'
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
    const narrative = cardNarratives[locale === 'es' ? 'es' : 'en'][draft.code ?? '']
    const card = Object.fromEntries(
      Object.entries(draft).filter(([, value]) => value !== undefined),
    ) as unknown as LocalizedCard
    cards.set(card.code, {
      ...card,
      ...(narrative?.flavor && !draft.flavor ? { flavor: narrative.flavor } : {}),
      ...(narrative?.backFlavor && !draft.back_flavor ? { back_flavor: narrative.backFlavor } : {}),
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
      code: printedCode(l.id),
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
            health: c.hasNoStats ? undefined : c.health,
            health_per_investigator: c.healthPerInvestigator,
            enemy_fight: c.hasNoStats ? undefined : c.fight,
            enemy_evade: c.hasNoStats ? undefined : c.evade,
            enemy_damage: c.damage,
            enemy_horror: c.horror,
            victory: c.victory,
          }
        : {}),
    })
  }
  const scenarios = [
    extracurricularActivity(),
    theHouseAlwaysWins(),
    theMiskatonicMuseum(),
    theEssexCountyExpress(),
    bloodOnTheAltar(),
    undimensionedAndUnseen(),
    theGathering(),
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
    // Una copia de Montmartre, Opéra Garnier y Le Marais por partida, y ambos actos 1–2.
    ...Array.from({ length: 12 }, (_, seed) =>
      aPhantomOfTruth({
        difficulty: 'standard',
        seed,
        log: {
          notes: [],
          crossedOut: [],
          values: seed % 2 ? { carcosaConviction: '1' } : {},
          investigators: {},
          chaosTokens: [],
        },
      }),
    ),
    // Todas las Catacumbas (incluidas las segundas copias, ~2) entran en cada partida.
    ...[[], ['carcosaUnableToFindNigel']].map((notes) =>
      thePallidMask({
        difficulty: 'standard',
        seed: 0,
        log: { notes, crossedOut: [], values: {}, investigators: {}, chaosTokens: [] },
      }),
    ),
    // Las dos versiones (planes 2a/2c, Capilla y Torre) y todas las copias de los Lugares.
    ...(['flood', 'vortex'] as const).flatMap((version) =>
      Array.from({ length: 12 }, (_, seed) =>
        blackStarsRise({ difficulty: 'standard', seed, version }),
      ),
    ),
    // Cada versión del acto 2 (por las Dudas y Convicciones) y todas las copias de Lugares.
    ...[
      {},
      { carcosaDoubt: '6', carcosaConviction: '1' },
      { carcosaDoubt: '1', carcosaConviction: '6' },
    ].map((values, seed) =>
      dimCarcosa({
        difficulty: 'standard',
        seed,
        log: { notes: [], crossedOut: [], values, investigators: {}, chaosTokens: [] },
      }),
    ),
    fortuneAndFollyPartOne({}),
    fortuneAndFollyPartTwo({}),
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
    ;[...scenario.agendas, ...(scenario.secondAgendas ?? [])].forEach((c) => {
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
  Object.values(DUNWICH_ENCOUNTER_SETS).flat().forEach(encounter)
  Object.values(DUNWICH_LOCATION_CARDS).forEach(location)
  Object.values(ESSEX_LOCATIONS).forEach(location)
  Object.values(ALTAR_LOCATIONS).forEach(location)
  Object.values(UNSEEN_LOCATIONS).forEach(location)
  put({
    code: '02236',
    name: 'Undimensioned and Unseen',
    real_name: 'Undimensioned and Unseen',
    type_code: 'scenario',
  })
  put({
    code: '02195',
    name: 'Blood on the Altar',
    real_name: 'Blood on the Altar',
    type_code: 'scenario',
  })
  put({
    code: '02159',
    name: 'Essex County Express',
    real_name: 'Essex County Express',
    type_code: 'scenario',
  })
  put({ ...cards.get('02179')!, type_code: 'asset', faction_code: 'neutral' })
  Object.values(MUSEUM_LOCATIONS).forEach(location)
  put({
    code: '02118',
    name: 'The Miskatonic Museum',
    real_name: 'The Miskatonic Museum',
    type_code: 'scenario',
  })
  put({
    code: '02124',
    name: 'Breaking and Entering',
    real_name: 'Breaking and Entering',
    type_code: 'act',
  })
  Object.values(HOUSE_LOCATIONS).forEach(location)
  encounter(HOUSE_PIT_BOSS)
  put({ code: '02069', name: 'Fold', real_name: 'Fold', type_code: 'act' })
  put({
    code: '02062',
    name: 'The House Always Wins',
    real_name: 'The House Always Wins',
    type_code: 'scenario',
  })
  put({
    code: '02041',
    name: 'Extracurricular Activity',
    real_name: 'Extracurricular Activity',
    type_code: 'scenario',
  })
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
    code: '03200',
    name: 'A Phantom of Truth',
    real_name: 'A Phantom of Truth',
    type_code: 'scenario',
  })
  put({
    code: '03316',
    name: 'Dim Carcosa',
    real_name: 'Dim Carcosa',
    type_code: 'scenario',
  })
  // Penumbrosa Carcosa: Historias del reverso de los Lugares, La máscara pálida (03321b) y
  // Hastur (El Rey de Amarillo), que está junto al acto.
  for (const code of Object.values(DIM_CARCOSA_STORIES))
    put({ code, name: code, real_name: code, type_code: 'story' })
  put({
    code: DIM_CARCOSA_CODES.hasturKingInYellow,
    name: 'Hastur',
    real_name: 'Hastur',
    type_code: 'enemy',
    enemy_fight: 4,
    enemy_evade: 2,
    health: 7,
    health_per_investigator: true,
    enemy_horror: 2,
  })
  put({
    code: '03274',
    name: 'Black Stars Rise',
    real_name: 'Black Stars Rise',
    type_code: 'scenario',
  })
  // Surgen estrellas negras: los actos 3a y 3c sustituyen a un mazo de Plan durante la partida.
  for (const [code, name] of [
    [BLACK_STARS_RISE_CODES.openThePathBelow, 'Open The Path Below'],
    [BLACK_STARS_RISE_CODES.openThePathAbove, 'Open The Path Above'],
  ])
    put({ code, name, real_name: name, type_code: 'act', clues: 0 })
  put({
    code: '03240',
    name: 'The Pallid Mask',
    real_name: 'The Pallid Mask',
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
  // Fortuna e insensatez: los enemigos que aparecen en la preparación, la tarjeta de
  // referencia y las cartas de Historia en juego.
  FORTUNE_SETUP_ENEMIES.forEach(encounter)
  put({
    code: FORTUNE_CODES.scenario,
    name: 'Fortune and Folly',
    real_name: 'Fortune and Folly',
    type_code: 'scenario',
  })
  for (const code of [
    FORTUNE_CODES.theStakeout,
    FORTUNE_CODES.ifTheUniformFits,
    FORTUNE_CODES.wellspring,
  ])
    put({ code, name: code, real_name: fortuneCards.en[code]?.name ?? code, type_code: 'story' })
  put({
    code: 'fof-dimensional-duplicate',
    real_name: 'Extradimensional Enemy',
    name: names['fof-dimensional-duplicate'],
    text: summaries['fof-dimensional-duplicate'],
    type_code: 'enemy',
    enemy_fight: 1,
    health: 1,
    enemy_evade: 1,
    enemy_damage: 1,
    enemy_horror: 1,
  })
  // Caras traseras de Historia de la parte II (El golpe, Entrega de paquete, Desaprobaciones).
  const fortune = fortuneCards[locale === 'es' ? 'es' : 'en']
  for (const front of ['88023', '88024', '88025', '88026', '88027']) {
    const text = fortune[front]
    if (text)
      put({
        code: `${front}b`,
        name: text.backName ?? text.name,
        real_name: fortuneCards.en[front]?.backName ?? fortuneCards.en[front]?.name ?? front,
        type_code: 'story',
        text: text.backText,
      })
  }
  put({ code: '01104', name: 'The Gathering', real_name: 'The Gathering', type_code: 'scenario' })
  const catalogues = [excelsiorCards, carcosaCards, fortuneCards, zealotCards, dunwichCards].map(
    (c) => c[locale === 'es' ? 'es' : 'en'],
  )
  for (const [code, text] of catalogues.flatMap((c) => Object.entries(c))) {
    const card = cards.get(code)
    if (!card) continue
    put({
      ...card,
      name: text.name,
      subname: text.subname,
      traits: text.traits ?? card.traits,
      // Sin acciones, solo el texto narrativo (Fortuna e insensatez: Lugares sin revelar).
      text: text.text ?? (text.flavor ? '' : undefined),
      back_name: text.backName ?? card.back_name,
      back_text: text.backText ?? (text.backFlavor ? '' : card.back_text),
      flavor: text.flavor,
      back_flavor: text.backFlavor,
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
