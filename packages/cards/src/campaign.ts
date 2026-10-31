import './direct-effects'
import './round-effects'
import './skill-replacement'
import './next-test-effects'
import './attack-history'
import './protected-draw'
import './action-history'
import './reused-mechanics'
import './upgraded-variants'
import './backup-events'
import './support-skills'
import './damage-turn'
import './tools-parley'
import './charged-assets'
import './rex-murphy'
import './grouped-import'
import './immediate-action-events'
import './immediate-action-skills'
import './synergy-attacks'
import './synergy'
import './targeted-events'
import './exclusive-skills'
import './skill-utilities'
import './skill-tricks'
import './support-allies'
import './simple-assets'
import './starter-actions'
import './restricted-slots'
import './sequenced-events'
import './permanent-talents'
import './phase-bonuses'
import './movement-skills'
import './reactive-events'
import './direct-events'
import './search-assets'
import './attached-upgrades'
import './survivor-deck'
import './basic-abilities'
import './basic-events'
import './asset-utilities'
/**
 * Partida de campaña: lo que dura entre escenarios. El registro de campaña lo
 * escribe el motor durante cada escenario (notas, experiencia, trauma…); aquí
 * se guarda, se usa para preparar el siguiente escenario y se gasta la
 * experiencia en mejorar los mazos (reglamento, "Deck Customization", y guía de
 * campaña, "Earning and Spending Experience").
 */
import {
  allPlayerCardDefs,
  customizationCost,
  customizedCard,
  retainedCustomizations,
  validCustomizations,
  type Customizations,
  createGame,
  shuffle,
  seedRng,
  emptyCampaignLog,
  deckOptionAllows,
  isPermanent,
  offClassAllowed,
  playerCardBehavior,
  playerCardDef,
  treacheryBehavior,
  investigatorBehavior,
  type Boon,
  type CampaignLog,
  type CardCode,
  type Difficulty,
  type GameState,
  type InvestigatorId,
  type PlayerCardDef,
  type ScenarioOutcome,
  type ExperienceGain,
} from '@lcg/engine'
import { campaignDefinition, type CampaignScenario } from './campaign-definition'
import {
  assertEncounterSetVariant,
  prepareEncounterVariant,
  type EncounterSetVariant,
} from './encounter-variants'
import { validateDeck, withRandomBasicWeakness, type DeckProblem } from './decks'
import {
  IN_THE_THICK_OF_IT,
  startingExperience,
  startingExperienceSpent,
} from './survivor-deck/card-08125'
import {
  code,
  investigatorSetup,
  playerCards,
  starterDeck,
  STARTER_DECKS,
} from './core-2026/player-cards'
// Campañas registradas.
import './brethren-of-ash/definition'
import './night-of-the-zealot/definition'
import './midwinter-gala/definition'
import './excelsior/definition'
import './carnevale/definition'
import './the-path-to-carcosa/definition'
import './the-dunwich-legacy/definition'
import './fortune-and-folly/definition'
// Comportamiento de las cartas: hace falta para saber cuáles se pueden comprar.
import './core-2026/cards'
import './core-2026/investigators'
import './core-2026/upgrades'
import './core-2026/meat-cleaver'
import './core-2026/weaknesses'
import './dunwich-pilot'
import './dunwich-followup'
import './dunwich-support'
import './reprints-wave-1'
import './reprints-wave-2'
import './classic-foundations'
import './classic-equipment'
import './reactive-support'
import './combat-tools'
import './conditional-commit'
import './variable-icons'
import './context-skills'
import './result-skills'
import './test-modifiers'
import './distributed-results'
import './basic-action-skills'
import './ashcan-pete'
import './jenny-barnes'
import './lola-hayes'
import './andre-patel'
import './wendy-adams'
import './father-mateo'
import './marie-lambeau'
import './stella-clark'
import './stella-sideboard'
import './nathaniel-cho'
import './harvey-walters'

export type DeckKey = keyof typeof STARTER_DECKS

export interface CampaignInvestigator {
  customizations?: Customizations
  id: InvestigatorId
  /** Mazo actual (sin los apoyos de historia, que se añaden al empezar cada escenario). */
  deck: CardCode[]
  /** Cards exiled during the last scenario (Déjà Vu discounts repurchasing up to 3). */
  exiled?: CardCode[]
  /** Déjà Vu discounts already used since the last scenario. */
  dejaVuUsed?: number
  /**
   * Deck slots opened by upgrades to Permanent versions since the last scenario. FAQ 1.18
   * only fills slots left by removed cards for free; these must be filled paying (FAQ 1.8).
   */
  owedFills?: number
}

export interface ScenarioResult {
  scenario: string
  outcome: ScenarioOutcome
  /** Deliberately skipped before investigator setup, rather than played and lost. */
  skipped?: boolean
  /** Experiencia ganada en el escenario por cada investigador. */
  xp: Record<InvestigatorId, number>
  experience?: ExperienceGain[]
  /** Final scenario score, when that scenario awards points. */
  score?: number
}

export interface Campaign {
  /** Optional Carnevale interlude, inserted before this campaign position. */
  carnevaleAt?: number
  /** Absent in legacy saves: retain the campaign's original encounter sets. */
  encounterSetVariant?: EncounterSetVariant
  boons?: Boon[]
  weaknessChoices?: Record<string, CardCode[]>
  /** Id de la definición de campaña. */
  id: string
  difficulty: Difficulty
  /** Escenario que toca jugar (índice en los escenarios de la definición). */
  scenarioIndex: number
  investigators: CampaignInvestigator[]
  log: CampaignLog
  results: ScenarioResult[]
}

/** Un investigador con su mazo: un mazo inicial de la caja o una lista propia. */
export type CampaignMember =
  | DeckKey
  | {
      investigator: CardCode
      cards: CardCode[]
      customizations?: Customizations
      /** Chosen when creating a deck with In the Thick of It; totals exactly two. */
      startingTrauma?: { physical: number; mental: number }
    }

export function newCampaign(
  campaignId: string,
  members: CampaignMember[],
  difficulty: Difficulty,
  seed = 1,
  boons: Boon[] = [],
  rewards: CardCode[] = [],
  openingScenario?: string,
  encounterSetVariant?: EncounterSetVariant,
): Campaign {
  assertEncounterSetVariant(campaignId, encounterSetVariant)
  const definition = campaignDefinition(campaignId)
  if (openingScenario && !definition.openingScenarios?.includes(openingScenario))
    throw new Error('Escenario inicial no permitido')
  if (campaignDefinition(campaignId).standalone)
    boons = boons.filter((b) => b !== 'ancients' && b !== 'persephone')
  if (members.length < 1 || members.length > 4)
    throw new Error('La campaña necesita de 1 a 4 investigadores')
  const weaknessChoices: Record<string, CardCode[]> = {}
  const investigators: CampaignInvestigator[] = members.map((member, n) => {
    if (typeof member !== 'string') {
      // Un mazo propio sin debilidad básica recibe una al azar (reglamento).
      return {
        id: member.investigator,
        deck: withRandomBasicWeakness(member.cards, seed + n),
        ...(member.customizations
          ? {
              customizations: Object.fromEntries(
                Object.entries(member.customizations).map(([c, s]) => [c, { ...s }]),
              ),
            }
          : {}),
      }
    }
    const list = STARTER_DECKS[member]
    if (!list) throw new Error(`Mazo desconocido: ${member}`)
    return { id: list.investigatorCode ?? code(list.investigator), deck: starterDeck(member) }
  })
  if (boons.includes('morrigan')) {
    for (const [n, i] of investigators.entries()) {
      const member = members[n]!
      if (
        typeof member !== 'string' &&
        member.cards.some((c) => playerCardDef(c)?.weakness === 'basicweakness')
      )
        continue
      i.deck = i.deck.filter((c) => playerCardDef(c)?.weakness !== 'basicweakness')
      const [pool] = shuffle(
        playerCards.filter((c) => c.weakness === 'basicweakness').map((c) => c.code),
        seedRng(seed + n),
      )
      weaknessChoices[i.id] = pool.slice(0, 3)
    }
  }
  if (new Set(investigators.map((i) => i.id)).size !== investigators.length)
    throw new Error('Un investigador no puede repetirse')
  if (
    investigators.some((i) => !playerCardDef(i.id) || i.deck.some((code) => !playerCardDef(code)))
  )
    throw new Error('Contenido de mazo desconocido')
  for (const investigator of investigators) assertDeck(investigator, true, rewards)
  const log = emptyCampaignLog(investigators.map((i) => i.id))
  if (openingScenario) log.values.openingScenario = openingScenario
  for (const [n, investigator] of investigators.entries()) {
    if (!investigator.deck.includes(IN_THE_THICK_OF_IT)) continue
    const source = members[n]!
    const trauma = typeof source === 'string' ? undefined : source.startingTrauma
    if (
      !trauma ||
      !Number.isInteger(trauma.physical) ||
      !Number.isInteger(trauma.mental) ||
      trauma.physical < 0 ||
      trauma.mental < 0 ||
      trauma.physical + trauma.mental !== 2
    )
      throw new Error('In the Thick of It requires a choice of two physical and/or mental trauma')
    const record = log.investigators[investigator.id]!
    record.physicalTrauma += trauma.physical
    record.mentalTrauma += trauma.mental
    record.xp +=
      startingExperience(investigator.deck) -
      startingExperienceSpent(investigator.deck, investigator.customizations)
  }
  // Father Mateo: bonus experience when the campaign begins.
  for (const investigator of investigators)
    log.investigators[investigator.id]!.xp += playerCardDef(investigator.id)?.bonusExperience ?? 0
  if (rewards.length) log.rewards = [...new Set(rewards)]
  if (boons.includes('ancients') && !campaignDefinition(campaignId).standalone) {
    for (const record of Object.values(log.investigators)) record.xp += 5
  }
  return {
    ...(boons.length ? { boons: [...new Set(boons)] } : {}),
    ...(Object.keys(weaknessChoices).length ? { weaknessChoices } : {}),
    id: campaignId,
    ...(encounterSetVariant === 'chapter-two' ? { encounterSetVariant } : {}),
    difficulty,
    scenarioIndex: 0,
    investigators,
    log,
    results: [],
  }
}

/** Orden de escenarios de esta partida, conservando la elección del prólogo. */
export function campaignScenarios(campaign: Campaign): CampaignScenario[] {
  const definition = campaignDefinition(campaign.id)
  const first = campaign.log.values.openingScenario
  const insertSide = (scenarios: CampaignScenario[]) => {
    const result = [...scenarios]
    if (campaign.carnevaleAt !== undefined)
      result.splice(
        campaign.carnevaleAt,
        0,
        campaignDefinition('carnevale-of-horrors').scenarios[0]!,
      )
    return result
  }
  if (!first || !definition.openingScenarios?.includes(first))
    return insertSide(definition.scenarios)
  const opening = definition.scenarios.filter((s) => definition.openingScenarios!.includes(s.id))
  return insertSide([
    ...opening.filter((s) => s.id === first),
    ...opening.filter((s) => s.id !== first),
    ...definition.scenarios.filter((s) => !definition.openingScenarios!.includes(s.id)),
  ])
}

export function canAddCarnevale(campaign: Campaign): boolean {
  return (
    !campaignDefinition(campaign.id).standalone &&
    campaign.carnevaleAt === undefined &&
    campaign.scenarioIndex > 0 &&
    canPlayNext(campaign) &&
    campaignScenarios(campaign)[campaign.scenarioIndex - 1]?.allowDeckChangesAfter !== false &&
    activeMembers(campaign).every((i) => (campaign.log.investigators[i.id]?.xp ?? 0) >= 3)
  )
}

export function addCarnevale(campaign: Campaign): Campaign {
  if (!canAddCarnevale(campaign))
    throw new Error('Carnevale no disponible como historia secundaria')
  const investigators = { ...campaign.log.investigators }
  for (const i of activeMembers(campaign))
    investigators[i.id] = { ...investigators[i.id]!, xp: investigators[i.id]!.xp - 3 }
  return {
    ...campaign,
    carnevaleAt: campaign.scenarioIndex,
    log: { ...campaign.log, investigators },
  }
}

function scenarioEntry(campaign: Campaign): CampaignScenario | null {
  return campaignScenarios(campaign)[campaign.scenarioIndex] ?? null
}

/** Id del escenario que toca jugar, o null si la campaña ha terminado. */
export function currentScenario(campaign: Campaign): string | null {
  return scenarioEntry(campaign)?.id ?? null
}

/** Investigadores que siguen en la campaña (ni muertos ni enloquecidos). */
export function activeMembers(campaign: Campaign): CampaignInvestigator[] {
  return campaign.investigators.filter((i) => {
    const record = campaign.log.investigators[i.id]
    return !record?.killed && !record?.insane
  })
}

/** El escenario que toca ya se puede jugar. */
export function canPlayNext(campaign: Campaign): boolean {
  return (
    !!scenarioEntry(campaign)?.build &&
    !campaign.log.notes.includes(CAMPAIGN_LOST) &&
    activeMembers(campaign).length > 0 &&
    !replaceableMembers(campaign).length &&
    !pendingTransfers(campaign).length &&
    !deckIssues(campaign).length
  )
}

/**
 * Las recompensas de mazos ya creados siguen siendo válidas; los guardados antiguos
 * no anotaban en el registro las ganadas en campañas anteriores.
 */
function memberRewards(campaign: Campaign, member: CampaignInvestigator): CardCode[] {
  return [...(campaign.log.rewards ?? []), ...member.deck.filter((c) => playerCardDef(c)?.reward)]
}

/**
 * Motivos por los que un mazo activo no puede empezar el siguiente escenario, con las
 * mismas reglas que `startScenario`, para avisar antes de intentarlo.
 */
export function deckIssues(
  campaign: Campaign,
): { investigator: InvestigatorId; problem: DeckProblem }[] {
  return activeMembers(campaign).flatMap((member) =>
    memberDeckProblems(member, false, memberRewards(campaign, member)).map((problem) => ({
      investigator: member.id,
      problem,
    })),
  )
}

/** Prepara el escenario que toca con el estado de la campaña (trauma, bolsa del caos). */
export function startScenario(campaign: Campaign, seed: number, interactive = true): GameState {
  const entry = scenarioEntry(campaign)
  if (!entry?.build) throw new Error(`Escenario no disponible: ${entry?.id ?? '—'}`)
  const definition = campaignDefinition(campaign.id)
  const members = activeMembers(campaign)
  if (!members.length) throw new Error('No quedan investigadores que puedan continuar')
  if (campaign.log.notes.includes(CAMPAIGN_LOST)) throw new Error('La campaña ha terminado')
  if (replaceableMembers(campaign).length) throw new Error('Falta elegir un investigador sustituto')
  if (pendingTransfers(campaign).length) throw new Error('Falta elegir el nuevo portador')
  for (const investigator of members)
    assertDeck(investigator, false, memberRewards(campaign, investigator))
  const scenario = prepareEncounterVariant(
    entry.build({
      ...(campaign.encounterSetVariant === 'chapter-two'
        ? { encounterSetVariant: campaign.encounterSetVariant }
        : {}),
      difficulty: campaign.difficulty,
      log: campaign.log,
      seed,
      investigators: members.map((i) => i.id),
    }),
    campaign.id,
    campaign.encounterSetVariant,
  )
  const game = createGame({
    seed,
    difficulty: campaign.difficulty,
    interactive,
    boons: campaign.boons ?? [],
    weaknessChoices: Object.fromEntries(
      Object.entries(campaign.weaknessChoices ?? {}).filter(
        ([id]) => !campaign.log.values['boonWeakness:' + id],
      ),
    ),
    campaignLog: campaign.log,
    scenario: {
      ...scenario,
      ...(campaign.scenarioIndex === 0 && definition.prologue
        ? { prologue: definition.prologue }
        : {}),
      // Reglamento: en campaña, la bolsa del caos sigue como acabó el escenario anterior.
      chaosBag: [
        ...(entry.id === 'carnevale-of-horrors' && !definition.standalone
          ? definition.chaosBags[campaign.difficulty]
          : scenario.chaosBag),
        ...campaign.log.chaosTokens,
      ],
    },
    investigators: members.map((i) => {
      const record = campaign.log.investigators[i.id]
      // Los apoyos de historia y debilidades ganados van en el mazo (salvo los que el
      // escenario pone en juego).
      const earned = (record?.storyAssets ?? []).filter(
        (code) => !entry.storyAssetsInPlay?.includes(code),
      )
      return {
        ...investigatorSetup(i.id, [
          ...i.deck.filter((code) => !campaign.log.removedCards?.includes(code)),
          ...earned.filter((code) => !campaign.log.removedCards?.includes(code)),
          ...(campaign.log.values['boonWeakness:' + i.id]
            ? [campaign.log.values['boonWeakness:' + i.id]!]
            : []),
        ]),
        physicalTrauma: record?.physicalTrauma ?? 0,
        ...(i.customizations ? { customizations: i.customizations } : {}),
        mentalTrauma: record?.mentalTrauma ?? 0,
      }
    }),
  })
  // The prologue can pause before setup messages run; save the choice from the first frame.
  return campaign.encounterSetVariant === 'chapter-two'
    ? { ...game, scenarioMeta: { ...game.scenarioMeta, chapterTwoEncounters: 1 } }
    : game
}

/** Clave del registro que guarda un traspaso pendiente de elegir heredero. */
const TRANSFER = 'transfer:'

const leftCampaign = (log: CampaignLog, id: string) =>
  !!log.investigators[id]?.killed || !!log.investigators[id]?.insane

/**
 * Guía de El camino a Carcosa: si el portador de una carta que se transfiere abandona la
 * campaña, se elige a otro investigador que siga en ella. Con un solo candidato pasa
 * directamente; con varios queda pendiente hasta `chooseTransferHeir`.
 */
function transferFromLeavers(campaign: Campaign, log: CampaignLog): CampaignLog {
  const codes = campaignDefinition(campaign.id).transferOnLeave ?? []
  const heirs = campaign.investigators.filter((i) => !leftCampaign(log, i.id))
  if (!codes.length || !heirs.length) return log
  let investigators = log.investigators
  let values = log.values
  for (const code of codes)
    for (const member of campaign.investigators) {
      const record = investigators[member.id]
      if (!record || !leftCampaign(log, member.id) || !record.storyAssets.includes(code)) continue
      const index = record.storyAssets.indexOf(code)
      investigators = {
        ...investigators,
        [member.id]: { ...record, storyAssets: record.storyAssets.filter((_, n) => n !== index) },
      }
      if (heirs.length === 1) {
        const heir = investigators[heirs[0]!.id]!
        investigators = {
          ...investigators,
          [heirs[0]!.id]: { ...heir, storyAssets: [...heir.storyAssets, code] },
        }
      } else values = { ...values, [TRANSFER + code]: member.id }
    }
  return { ...log, investigators, values }
}

/** Cartas que esperan a que el grupo elija su nuevo portador, con los candidatos. */
export function pendingTransfers(
  campaign: Campaign,
): { card: CardCode; from: InvestigatorId; candidates: InvestigatorId[] }[] {
  const candidates = activeMembers(campaign).map((i) => i.id)
  return Object.entries(campaign.log.values)
    .filter(([key]) => key.startsWith(TRANSFER))
    .map(([key, from]) => ({ card: key.slice(TRANSFER.length), from, candidates }))
}

/** Asigna la carta pendiente al investigador elegido. */
export function chooseTransferHeir(
  campaign: Campaign,
  card: CardCode,
  heir: InvestigatorId,
): Campaign {
  const pending = pendingTransfers(campaign).find((p) => p.card === card)
  if (!pending) throw new Error(`No hay traspaso pendiente de ${card}`)
  if (!pending.candidates.includes(heir)) throw new Error(`${heir} no puede recibir ${card}`)
  const record = campaign.log.investigators[heir]!
  const values = { ...campaign.log.values }
  delete values[TRANSFER + card]
  return {
    ...campaign,
    log: {
      ...campaign.log,
      values,
      investigators: {
        ...campaign.log.investigators,
        [heir]: { ...record, storyAssets: [...record.storyAssets, card] },
      },
    },
  }
}

/** Clave del registro que enlaza a un investigador que dejó la campaña con su sustituto. */
const REPLACED_BY = 'replacedBy:'

/** Nota del registro con la que una resolución da la campaña por perdida. */
const CAMPAIGN_LOST = 'campaignLost'

/** Investigadores muertos o enloquecidos cuyo jugador aún no ha elegido sustituto. */
export function replaceableMembers(campaign: Campaign): InvestigatorId[] {
  // Sin escenarios por jugar o con la campaña perdida no hay a quién sustituir.
  if (!scenarioEntry(campaign) || campaign.log.notes.includes(CAMPAIGN_LOST)) return []
  return campaign.investigators
    .filter((i) => leftCampaign(campaign.log, i.id) && !campaign.log.values[REPLACED_BY + i.id])
    .map((i) => i.id)
}

/** Mazos iniciales de investigadores que aún no han participado en la campaña. */
export function replacementOptions(campaign: Campaign): DeckKey[] {
  return (Object.keys(STARTER_DECKS) as DeckKey[]).filter((key) => {
    const list = STARTER_DECKS[key]!
    return !campaign.log.investigators[list.investigatorCode ?? code(list.investigator)]
  })
}

/**
 * La campaña se ha perdido: lo dice una resolución, o nadie puede seguir y ningún
 * jugador puede elegir un investigador nuevo (reglamento, "Campaign Play").
 */
export function campaignLost(campaign: Campaign): boolean {
  if (campaign.log.notes.includes(CAMPAIGN_LOST)) return true
  return (
    !activeMembers(campaign).length &&
    !(replaceableMembers(campaign).length && replacementOptions(campaign).length)
  )
}

/**
 * Reglamento, "Campaign Play": el jugador cuyo investigador muere, enloquece o es
 * devorado elige otro que no se haya usado en la campaña y le crea un mazo de nivel 0.
 * Si un apoyo que se transfiere seguía en poder de quien se fue, el sustituto puede
 * recibirlo (guía de El camino a Carcosa).
 */
export function replaceInvestigator(
  campaign: Campaign,
  leaving: InvestigatorId,
  member: CampaignMember,
  seed = 1,
): Campaign {
  if (!replaceableMembers(campaign).includes(leaving))
    throw new Error(`${leaving} no necesita sustituto`)
  const fresh = newCampaign(
    campaign.id,
    [member],
    campaign.difficulty,
    seed,
    [],
    campaign.log.rewards ?? [],
  )
  const joining = fresh.investigators[0]!
  if (campaign.log.investigators[joining.id]) throw new Error('Un investigador no puede repetirse')
  const next: Campaign = {
    ...campaign,
    investigators: [...campaign.investigators, joining],
    log: {
      ...campaign.log,
      values: { ...campaign.log.values, [REPLACED_BY + leaving]: joining.id },
      investigators: {
        ...campaign.log.investigators,
        [joining.id]: fresh.log.investigators[joining.id]!,
      },
    },
  }
  return { ...next, log: transferFromLeavers(next, next.log) }
}

/** Cierra el escenario terminado: guarda su registro y pasa al siguiente. */
export function finishScenario(campaign: Campaign, game: GameState): Campaign {
  if (!game.outcome) throw new Error('El escenario aún no ha terminado')
  if (game.scenarioId !== currentScenario(campaign) || game.difficulty !== campaign.difficulty)
    throw new Error('El resultado no pertenece al escenario actual de esta campaña')
  const played = game.campaignLog ?? campaign.log
  const expected = new Set(activeMembers(campaign).map((i) => i.id))
  const actual = new Set(game.investigators.map((i) => i.id))
  if (
    game.investigators.length !== expected.size ||
    actual.size !== expected.size ||
    [...actual].some((id) => !expected.has(id)) ||
    Object.keys(played.investigators).length !== campaign.investigators.length ||
    campaign.investigators.some((i) => !played.investigators[i.id])
  )
    throw new Error('El resultado no pertenece al escenario actual de esta campaña')
  // La experiencia no baja de 0 (Dead Ends puede restar más de lo ganado).
  const log = transferFromLeavers(campaign, {
    ...played,
    investigators: Object.fromEntries(
      Object.entries(played.investigators).map(([id, r]) => [id, { ...r, xp: Math.max(0, r.xp) }]),
    ),
  })
  // "Volver a jugar" (Asesinato en el hotel Excelsior, R2 y R3): el mismo escenario
  // vuelve a la preparación; solo se conserva lo anotado (el trauma) y no se gana
  // experiencia ni se cuenta como resultado.
  if (game.scenarioMeta?.replay === 1) {
    return {
      ...campaign,
      log: { ...log, values: { ...log.values, [`replayed:${game.scenarioId}`]: '1' } },
    }
  }
  const xp = Object.fromEntries(
    campaign.investigators.map((i) => [
      i.id,
      (log.investigators[i.id]?.xp ?? 0) - (campaign.log.investigators[i.id]?.xp ?? 0),
    ]),
  )
  return {
    ...campaign,
    scenarioIndex: campaign.scenarioIndex + 1,
    investigators: campaign.investigators.map(
      ({ exiled: _last, dejaVuUsed: _used, owedFills: _owed, ...i }) => {
        // RR Exile: exiled copies leave the deck; they must be purchased again (FAQ 1.18).
        const exiled = (game.exiled ?? []).filter((e) => e.investigator === i.id).map((e) => e.code)
        const deck = i.deck.filter((code) => !log.removedCards?.includes(code))
        for (const code of exiled) if (deck.includes(code)) deck.splice(deck.indexOf(code), 1)
        return {
          ...i,
          deck,
          ...(i.customizations
            ? { customizations: retainedCustomizations(deck, i.customizations) }
            : {}),
          ...(exiled.length ? { exiled } : {}),
        }
      },
    ),
    log,
    results: [
      ...campaign.results,
      {
        scenario: game.scenarioId,
        outcome: game.outcome,
        ...(game.scenarioMeta?.skipped === 1 ? { skipped: true } : {}),
        xp,
        ...(game.experience ? { experience: game.experience } : {}),
        ...(typeof game.scenarioMeta?.score === 'number' ? { score: game.scenarioMeta.score } : {}),
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Mejorar el mazo con experiencia
// ---------------------------------------------------------------------------

/** Tamaño del mazo si la carta del investigador no lo indica (sin contar debilidades). */
export const DECK_SIZE = 30

/** Tamaño del mazo de un investigador (más lo que añaden sus cartas, como Collector). */
export const deckSizeOf = (investigator: InvestigatorId, deck: CardCode[] = []) =>
  (byCode(investigator)?.deckSize ?? DECK_SIZE) +
  [...new Set(deck)].reduce((n, code) => n + (playerCardDef(code)?.deckSizeBonus ?? 0), 0)

/** Cartas exclusivas (y debilidades exclusivas) de cualquier investigador. */
const SIGNATURES = new Set(allPlayerCardDefs().flatMap((c) => c.signatures ?? []))
const isSignature = (card: CardCode) => SIGNATURES.has(card)

const byCode = (card: CardCode): PlayerCardDef | undefined => playerCardDef(card)

/** Content with a registered implementation, including cards with printed data only. */
export function isImplemented(card: CardCode): boolean {
  return !!(playerCardBehavior(card) || treacheryBehavior(card) || investigatorBehavior(card))
}

function assertAvailable(investigator: CardCode, cards: CardCode[]): void {
  const pending = [investigator, ...cards].filter(
    (code) => !playerCardDef(code) || !isImplemented(code),
  )
  if (pending.length) throw new Error(`Cartas no disponibles: ${[...new Set(pending)].join(', ')}`)
}

function memberDeckProblems(
  member: CampaignInvestigator,
  campaignStart: boolean,
  rewards: CardCode[],
): DeckProblem[] {
  return validateDeck(
    {
      id: member.id,
      name: member.id,
      investigator: member.id,
      cards: member.deck,
      ...(member.customizations ? { customizations: member.customizations } : {}),
    },
    campaignStart,
    rewards,
  ).problems
}

function assertDeck(
  member: CampaignInvestigator,
  campaignStart: boolean,
  rewards: CardCode[],
): void {
  assertAvailable(member.id, member.deck)
  const problems = memberDeckProblems(member, campaignStart, rewards)
  if (problems.length) throw new Error(problems[0]!.key)
}

/** Cuenta para el tamaño del mazo (ni debilidades, ni exclusivas, ni permanentes). */
const countsForSize = (card: CardCode) =>
  card !== '01000' && !byCode(card)?.weakness && !isSignature(card) && !isPermanent(card)

/** Cartas del mazo que cuentan para su tamaño. */
export const deckSize = (deck: CardCode[]) => deck.filter(countsForSize).length

export interface PurchaseOption {
  code: CardCode
  name: string
  level: number
  /** Experiencia que cuesta. */
  cost: number
  /** Versión de menor nivel del mazo que se sustituye al mejorarla. */
  replaces?: CardCode
  /** Hace falta quitar otra carta para no pasar del tamaño del mazo. */
  needsRemoval: boolean
  implemented: boolean
}

function member(campaign: Campaign, investigator: InvestigatorId): CampaignInvestigator {
  const found = campaign.investigators.find((i) => i.id === investigator)
  if (!found) throw new Error(`Investigador fuera de la campaña: ${investigator}`)
  return found
}

/** Cartas que el investigador puede comprar o mejorar con su experiencia actual. */
export function purchaseOptions(
  campaign: Campaign,
  investigator: InvestigatorId,
): PurchaseOption[] {
  if (campaignScenarios(campaign)[campaign.scenarioIndex - 1]?.allowDeckChangesAfter === false)
    return []
  const { deck } = member(campaign, investigator)
  const xp = campaign.log.investigators[investigator]?.xp ?? 0
  const options = byCode(investigator)?.deckOptions ?? []
  const full = deckSize(deck) >= deckSizeOf(investigator, deck)
  const self = member(campaign, investigator)
  // FAQ 1.18: below the deck size after cards were removed, level 0 cards cost 0 experience.
  const short = freeFillSlots(self) > 0
  const excluded = byCode(investigator)?.excludedDeckTraits ?? []
  return allPlayerCardDefs()
    .map((card) => customizedCard(card, self.customizations))
    .filter(
      (card) =>
        ['asset', 'event', 'skill'].includes(card.type) &&
        !card.weakness &&
        !card.reward &&
        !card.story &&
        !campaign.log.removedCards?.includes(card.code) &&
        ![IN_THE_THICK_OF_IT, '08071'].includes(card.code) &&
        isImplemented(card.code) &&
        !isSignature(card.code) &&
        !card.traits.some((trait) => excluded.includes(trait)) &&
        (!playerCardBehavior(card.code)?.requiredResearch ||
          campaign.log.notes.includes(playerCardBehavior(card.code)!.requiredResearch!)) &&
        (options.some((o) => deckOptionAllows(o, card)) ||
          offClassAllowed(byCode(investigator)!, card)),
    )
    .flatMap((card): PurchaseOption[] => {
      const base = {
        code: card.code,
        name: card.name,
        level: card.xp ?? 0,
        implemented: isImplemented(card.code),
      }
      const copies = deck.filter((c) => byCode(c)?.name === card.name)
      // Mejora: una copia de menor nivel del mismo título pasa a la nueva versión. Se
      // ofrece desde cada versión inferior distinta, porque cuesta la diferencia (p. 22).
      const lower = [
        ...new Set(
          copies.filter(
            (c) =>
              (customizedCard(byCode(c)!, self.customizations).xp ?? 0) < base.level &&
              !isPermanent(c),
          ),
        ),
      ]
      // RR Exceptional: twice the printed level in experience.
      const price = (code: CardCode) =>
        (customizedCard(byCode(code)!, self.customizations).xp ?? 0) *
        (byCode(code)?.exceptional ? 2 : 1)
      const upgrade: PurchaseOption[] = lower.map((replaces) => ({
        ...base,
        cost: price(card.code) - price(replaces),
        replaces,
        needsRemoval: false,
      }))
      // Carta nueva: como máximo 2 copias por título; cuesta al menos 1 experiencia.
      const add: PurchaseOption[] =
        !playerCardBehavior(card.code)?.requiredResearch && copies.length < (card.deckLimit ?? 2)
          ? [
              {
                ...base,
                cost:
                  short && base.level === 0 && !isPermanent(card.code)
                    ? 0
                    : Math.max(0, Math.max(1, price(card.code)) - dejaVu(self, deck, card.code)),
                needsRemoval: full && !isPermanent(card.code),
              },
            ]
          : []
      return [...upgrade, ...add].filter((o) => o.cost <= xp)
    })
}

const DEJA_VU = '60531'

/** Déjà Vu: 1 less to repurchase a card exiled during the last scenario (up to 3 cards). */
function dejaVu(member: CampaignInvestigator, deck: CardCode[], code: CardCode): number {
  const exiled = member.exiled ?? []
  return deck.includes(DEJA_VU) && (member.dejaVuUsed ?? 0) < 3 && exiled.includes(code) ? 1 : 0
}

/** Huecos del mazo que se rellenan gratis: los que dejaron cartas retiradas (FAQ 1.18). */
function freeFillSlots(self: CampaignInvestigator, deck = self.deck): number {
  return deckSizeOf(self.id, deck) - deckSize(deck) - (self.owedFills ?? 0)
}

/** El mazo resultante incumple una regla de construcción que antes cumplía. */
export class DeckProblemError extends Error {
  constructor(readonly problem: DeckProblem) {
    super(problem.key)
  }
}

/**
 * Cartas que se pueden quitar del mazo para hacer sitio: las que cuentan para su
 * tamaño (las permanentes no se pueden quitar una vez añadidas, FAQ).
 */
export function removableCards(campaign: Campaign, investigator: InvestigatorId): CardCode[] {
  const { deck } = member(campaign, investigator)
  return [...new Set(deck.filter(countsForSize))]
}

/**
 * Compra una carta (o mejora una de menor nivel) gastando experiencia. Si el
 * mazo está completo, `remove` es la carta que sale para hacer sitio.
 */
export function purchase(
  campaign: Campaign,
  investigator: InvestigatorId,
  card: CardCode,
  options: { remove?: CardCode; upgrade?: boolean; replaces?: CardCode } = {},
): Campaign {
  // Sin indicar qué versión se mejora, la más barata (la de mayor nivel).
  const [option] = purchaseOptions(campaign, investigator)
    .filter(
      (o) =>
        o.code === card &&
        !!o.replaces === !!options.upgrade &&
        (!options.replaces || o.replaces === options.replaces),
    )
    .sort((a, b) => a.cost - b.cost)
  if (!option) throw new Error(`No se puede comprar ${card}`)
  if (!option.implemented) throw new Error(`${option.name} aún no está implementada`)
  const out = option.replaces ?? (option.needsRemoval ? options.remove : undefined)
  if (option.needsRemoval && (!out || !removableCards(campaign, investigator).includes(out))) {
    throw new Error('Hay que quitar una carta para no pasar del tamaño del mazo')
  }
  const deck = [...member(campaign, investigator).deck]
  if (out) deck.splice(deck.indexOf(out), 1)
  deck.push(card)
  const offClassLimit = byCode(investigator)?.offClassLevelZeroLimit
  if (
    offClassLimit !== undefined &&
    deck.filter((c) => {
      const d = byCode(c)
      return (
        d &&
        countsForSize(c) &&
        !d.reward &&
        !byCode(investigator)!.deckOptions!.some((o) => deckOptionAllows(o, d))
      )
    }).length > offClassLimit
  )
    throw new Error(`Máximo ${offClassLimit} cartas de otras clases`)
  const record = campaign.log.investigators[investigator]
  if (!record) throw new Error(`Sin registro de campaña: ${investigator}`)
  const self = member(campaign, investigator)
  const customizations = self.customizations
    ? retainedCustomizations(deck, self.customizations)
    : undefined
  // RR p. 29: every card bought must respect the deckbuilding options (excluded traits,
  // class minimums…). A shorter deck is completed afterwards; earlier problems are kept.
  const rewards = memberRewards(campaign, self)
  const signature = (p: DeckProblem) => JSON.stringify(p)
  const before = new Set(memberDeckProblems(self, false, rewards).map(signature))
  const added = memberDeckProblems(
    { ...self, deck, ...(customizations ? { customizations } : {}) },
    false,
    rewards,
  ).find((p) => p.key !== 'deck.problem.size' && !before.has(signature(p)))
  if (added) throw new DeckProblemError(added)
  const freeFill =
    (customizedCard(byCode(card)!, self.customizations).xp ?? 0) === 0 &&
    !isPermanent(card) &&
    freeFillSlots(self) > 0
  // An upgrade to a Permanent opens a slot that is filled paying, not for free.
  const opened = option.replaces && countsForSize(option.replaces) && !countsForSize(card) ? 1 : 0
  const paidFill = !out && countsForSize(card) && !freeFill ? 1 : 0
  const owedFills = Math.max(
    0,
    Math.min(
      deckSizeOf(investigator, deck) - deckSize(deck),
      (self.owedFills ?? 0) + opened - paidFill,
    ),
  )
  // Déjà Vu: the discounted repurchase uses up one exiled copy.
  const discounted = !option.replaces && !freeFill && dejaVu(self, self.deck, card) > 0
  const exiled = [...(self.exiled ?? [])]
  if (discounted) exiled.splice(exiled.indexOf(card), 1)
  return {
    ...campaign,
    investigators: campaign.investigators.map((i) => {
      if (i.id !== investigator) return i
      const { owedFills: _previous, ...rest } = i
      return {
        ...rest,
        deck,
        ...(customizations ? { customizations } : {}),
        ...(discounted ? { exiled, dejaVuUsed: (i.dejaVuUsed ?? 0) + 1 } : {}),
        ...(owedFills ? { owedFills } : {}),
      }
    }),
    log: {
      ...campaign.log,
      investigators: {
        ...campaign.log.investigators,
        [investigator]: { ...record, xp: record.xp - option.cost },
      },
    },
  }
}

/**
 * Experience for checking boxes and adding copies of a customizable card. FAQ: spending
 * experience on the sheet adds one copy for free; any other copy costs the card's level
 * (half the checked boxes, rounded up), at least 1.
 */
export function customizationPurchaseCost(
  previous: Record<string, number>,
  sheet: Record<string, number>,
  copies: number,
): number {
  const level = Math.ceil(customizationCost(sheet) / 2)
  return (
    customizationCost(sheet) -
    customizationCost(previous) +
    Math.max(0, copies - 1) * Math.max(1, level)
  )
}

/** RR Customizable: permanent checked boxes, one XP each, shared by all owned copies.
 * One new copy may be added together with upgrades without a separate card cost.
 */
export function customize(
  campaign: Campaign,
  investigator: InvestigatorId,
  code: CardCode,
  sheet: Record<string, number>,
  options: { copies?: number; remove?: CardCode[] } = {},
): Campaign {
  if (campaignScenarios(campaign)[campaign.scenarioIndex - 1]?.allowDeckChangesAfter === false)
    throw new Error('customization.unavailable')
  const self = member(campaign, investigator)
  const record = campaign.log.investigators[investigator]
  if (!record || record.killed || record.insane || !isImplemented(code))
    throw new Error('customization.unavailable')
  const previous = self.customizations?.[code] ?? {}
  if (Object.entries(previous).some(([key, n]) => (sheet[key] ?? 0) < n))
    throw new Error('customization.permanent')
  const copies = options.copies ?? (self.deck.includes(code) ? 0 : 1)
  if (!Number.isInteger(copies) || copies < 0 || copies > 2)
    throw new Error('customization.invalid')
  const cost = customizationPurchaseCost(previous, sheet, copies)
  if (customizationCost(sheet) <= customizationCost(previous) || cost > record.xp)
    throw new Error('customization.experience')
  const deck = [...self.deck]
  for (const out of options.remove ?? []) {
    if (!removableCards(campaign, investigator).includes(out) || !deck.includes(out))
      throw new Error('customization.invalid')
    deck.splice(deck.indexOf(out), 1)
  }
  deck.push(...Array<string>(copies).fill(code))
  const customizations = {
    ...retainedCustomizations(deck, self.customizations),
    [code]: { ...sheet },
  }
  if (!validCustomizations(deck, customizations)) throw new Error('customization.invalid')
  const checked = validateDeck(
    { id: self.id, name: self.id, investigator, cards: deck, customizations },
    false,
    campaign.log.rewards ?? [],
  )
  if (checked.problems.some((p) => p.key !== 'deck.problem.size' || p.params.n > p.params.size))
    throw new Error('customization.invalid')
  if (deckSize(deck) < deckSize(self.deck) && (options.remove?.length ?? 0) > copies)
    throw new Error('customization.invalid')
  return {
    ...campaign,
    investigators: campaign.investigators.map((i) =>
      i.id === investigator ? { ...i, deck, customizations } : i,
    ),
    log: {
      ...campaign.log,
      investigators: {
        ...campaign.log.investigators,
        [investigator]: { ...record, xp: record.xp - cost },
      },
    },
  }
}
