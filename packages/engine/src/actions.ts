import {
  actBehavior,
  agendaBehavior,
  enemyBehavior,
  locationBehavior,
  playerCardBehavior,
  playerCardDef,
  scenarioBehavior,
  storyBehavior,
  treacheryBehavior,
  type TreacheryBehavior,
} from './content'
import {
  activeInvestigators,
  enemiesAt,
  enemyHasKeyword,
  engagedEnemies,
  getInvestigator,
  getLocation,
  perInvestigator,
  placedLocation,
  turnStartedAt,
} from './state'
import type {
  AbilityLimit,
  AbilityOption,
  Action,
  CardCode,
  Choice,
  ChoiceTarget,
  GameState,
  Investigator,
  InvestigatorId,
  LocationId,
  Message,
  Treachery,
} from './types'

/** RR: Unique. The shared canonical title applies across controllers and printings. */
export function uniqueAssetInPlay(state: GameState, code: CardCode): boolean {
  const def = playerCardDef(code)
  return (
    !!def?.unique &&
    Object.values(state.assets).some((asset) => playerCardDef(asset.code)?.name === def.name)
  )
}

/** Playable assets/events matching the requested fast or action window. */
export function playableCards(state: GameState, id: InvestigatorId, fast: boolean): CardCode[] {
  const investigator = getInvestigator(state, id)
  if (investigator.eliminated || investigator.location === null) return []
  return [...new Set(investigator.hand)].filter((code) => {
    const def = playerCardDef(code)
    if (!def || (def.fast ?? false) !== fast) return false
    if (def.type !== 'asset' && def.type !== 'event') return false
    if (def.type === 'asset' && assetsBlocked(state, id)) return false
    if (def.type === 'asset' && uniqueAssetInPlay(state, code)) return false
    if (playBlocked(state, id, def.type)) return false
    const behavior = playerCardBehavior(code)
    if (def.type === 'event' && !behavior?.play) return false
    if (cardCost(state, id, code) > investigator.resources) return false
    return behavior?.canPlay?.(state, id) ?? true
  })
}

/** Acciones básicas que el investigador puede realizar ahora mismo. */
export function availableActions(state: GameState, id: InvestigatorId): Action[] {
  const investigator = getInvestigator(state, id)
  if (investigator.eliminated || investigator.location === null) return []
  const here = investigator.location
  const location = getLocation(state, here)
  const enemiesHere = enemiesAt(state, here)

  // Sin acciones normales, solo la adicional de evitar (Trish Scarborough).
  if (investigator.actionsRemaining <= 0 && !investigator.extraMove) {
    if (!investigator.extraEvade) return []
    return [
      ...playableCards(state, id, false)
        .filter((card) => playerCardBehavior(card)?.evadeAction)
        .map((card): Action => ({ kind: 'play', card })),
      ...engagedEnemies(state, id).map((e): Action => ({ kind: 'evade', enemy: e.id })),
    ]
  }

  const actions: Action[] = [
    ...playableCards(state, id, false).map((card): Action => ({ kind: 'play', card })),
    { kind: 'draw' },
    { kind: 'resource' },
    ...(investigationBlocked(state, here) ? [] : [{ kind: 'investigate' } as Action]),
    ...(leavingBlocked(state, here) || moveBlocked(state, id) ? [] : location.connections)
      .filter((to) => state.locations[to] && canAffordEntry(state, to) && canEnter(state, id, to))
      .map((to): Action => ({ kind: 'move', to })),
    // Un enemigo distante (aloof) no enfrentado no puede ser atacado.
    ...enemiesHere
      .filter((e) => e.engagedWith !== null || !enemyHasKeyword(state, e, 'aloof'))
      .map((e): Action => ({ kind: 'fight', enemy: e.id })),
    ...engagedEnemies(state, id).map((e): Action => ({ kind: 'evade', enemy: e.id })),
    ...enemiesHere
      .filter((e) => e.engagedWith !== id && !e.keywords.includes('massive'))
      .map((e): Action => ({ kind: 'engage', enemy: e.id })),
  ]
  return actions.filter(
    (a) =>
      actionCost(state, id, a) <=
      investigator.actionsRemaining + (a.kind === 'move' && investigator.extraMove ? 1 : 0),
  )
}

/** El escenario deja entrar al investigador en `to` desde donde está (Habitación 212, Despacho). */
export function canEnter(state: GameState, id: InvestigatorId, to: string): boolean {
  const from = getInvestigator(state, id).location
  return scenarioBehavior(state.scenarioId)?.canEnter?.(state, id, from, to) ?? true
}

/** Pistas en grupo que cuesta entrar en una localización sin revelar (0 si no tiene coste). */
export function entryCost(state: GameState, location: string): number {
  const l = state.locations[location]
  if (!l || l.revealed || !l.enterCost) return 0
  return l.enterCost * state.startingInvestigatorCount
}

/** El grupo tiene pistas suficientes para entrar. */
export function canAffordEntry(state: GameState, location: string): boolean {
  const cost = entryCost(state, location)
  return cost === 0 || activeInvestigators(state).reduce((sum, i) => sum + i.clues, 0) >= cost
}

/** Acciones que cuesta una acción básica, con costes adicionales (Waterfront, Arcane Lock). */
export function actionCost(state: GameState, id: InvestigatorId, action: Action): number {
  const here = getInvestigator(state, id).location
  if (here === null) return 1
  // Frozen in Fear: costes adicionales de las traiciones de su zona de amenaza.
  const extra = threatAreaTreacheries(state, id).reduce(
    (sum, t) => sum + (treacheryBehavior(t.code)?.actionCost?.(state, t, action) ?? 0),
    0,
  )
  if (
    action.kind === 'investigate' ||
    (action.kind === 'play' && playerCardBehavior(action.card)?.investigateAction)
  ) {
    return 1 + extra + (getLocation(state, here).investigateExtraActions ?? 0)
  }
  if (action.kind === 'move') return 1 + extra + moveCost(state, here) + moveCost(state, action.to)
  return 1 + extra
}

/** Tipos de acción básica que ya ha realizado en esta ronda. */
export function actionsThisRound(state: GameState, id: InvestigatorId): Action['kind'][] {
  const record = getInvestigator(state, id).roundActions
  return record?.round === state.round ? record.kinds : []
}

/** Coste adicional de entrar o salir de una localización por las traiciones unidas a ella. */
/** Una traición unida impide salir de la localización (Secret Door). */
export function leavingBlocked(state: GameState, location: string): boolean {
  return Object.values(state.treacheries).some(
    (t) =>
      t.placement.type === 'location' &&
      t.placement.location === location &&
      treacheryBehavior(t.code)?.blocksLeaving,
  )
}

function moveCost(state: GameState, location: string): number {
  return Object.values(state.treacheries).reduce(
    (sum, t) =>
      t.placement.type === 'location' && t.placement.location === location
        ? sum + (treacheryBehavior(t.code)?.moveCost ?? 0)
        : sum,
    0,
  )
}

/** Etiqueta i18n, parámetros y elemento de la mesa de una acción. */
export function describeAction(state: GameState, id: InvestigatorId, action: Action): Choice {
  switch (action.kind) {
    case 'play': {
      const target: ChoiceTarget = { type: 'hand', code: action.card }
      return {
        label: 'action.play',
        params: { card: playerCardDef(action.card)?.name ?? action.card },
        target,
        display: { kind: 'play', action: 'play', actions: 1 },
        then: [],
      }
    }
    case 'draw':
    case 'resource':
      return {
        label: `action.${action.kind}`,
        display: { kind: 'basic', action: action.kind, actions: 1 },
        then: [],
      }
    case 'investigate': {
      const location = getLocation(state, getInvestigator(state, id).location as string)
      return {
        label: 'action.investigate',
        params: { location: location.name },
        target: { type: 'location', id: location.id },
        display: { kind: 'basic', action: 'investigate', actions: 1, skill: 'intellect' },
        then: [],
      }
    }
    case 'move':
      return {
        label: 'action.move',
        params: { location: getLocation(state, action.to).name },
        target: { type: 'location', id: action.to },
        display: { kind: 'basic', action: 'move', actions: 1 },
        then: [],
      }
    case 'fight':
    case 'evade':
    case 'engage': {
      const enemy = state.enemies[action.enemy]
      return {
        label: `action.${action.kind}`,
        params: { enemy: enemy?.name ?? '?' },
        target: { type: 'enemy', id: action.enemy },
        display: {
          kind: 'basic',
          action: action.kind,
          actions: 1,
          ...(action.kind === 'fight' ? { skill: 'combat' as const } : {}),
          ...(action.kind === 'evade' ? { skill: 'agility' as const } : {}),
        },
        then: [],
      }
    }
  }
}

/** Pistas necesarias para avanzar el acto actual (null si no avanza con pistas). */
export function cluesToAdvanceAct(state: GameState): number | null {
  const act = state.acts[state.actIndex]
  if (!act || act.advanceTiming === 'objective') return null
  return perInvestigator(state, act.clueThreshold, act.cluesPerInvestigator)
}

/** Investigadores que pueden aportar pistas al acto actual. */
export function actContributors(state: GameState): Investigator[] {
  const act = state.acts[state.actIndex]
  const at = act?.cluesAtLocation
  return activeInvestigators(state).filter((i) => at === undefined || i.location === at)
}

export function canAdvanceAct(state: GameState): boolean {
  const required = cluesToAdvanceAct(state)
  if (required === null) return false
  if (scenarioBehavior(state.scenarioId)?.actAdvanceAllowed?.(state) === false) return false
  const available = actContributors(state).reduce((sum, i) => sum + i.clues, 0)
  return available >= required
}

export function withinLimit(
  state: GameState,
  key: string,
  investigator: InvestigatorId,
  limit: AbilityLimit | undefined,
): boolean {
  if (!limit) return true
  return !state.abilityUses.some(
    (u) =>
      u.key === key &&
      (limit.group || u.investigator === investigator) &&
      (limit.per === 'game' ||
        (u.round === state.round && (limit.per !== 'turn' || u.turn === turnStartedAt(state)))),
  )
}

/**
 * Habilidades activadas disponibles para el investigador: de su localización,
 * del plan y el acto actuales, de las traiciones en su zona de amenaza o en su
 * localización y de sus apoyos (RR "Activate"). Se filtran por límites y
 * acciones restantes.
 */
export function availableAbilities(state: GameState, id: InvestigatorId): AbilityOption[] {
  const investigator = getInvestigator(state, id)
  if (investigator.eliminated || investigator.location === null) return []
  const here = investigator.location
  const location = getLocation(state, here)
  const agenda = state.agendas[state.agendaIndex]
  const act = state.acts[state.actIndex]
  const treacheries = Object.values(state.treacheries).filter((t) => {
    const p = t.placement
    if (p.type === 'location') return p.location === here
    // Guía de El camino a Carcosa, "Oculto": solo su investigador activa sus habilidades.
    if (p.type === 'threatArea') {
      return (
        p.investigator === id ||
        (!t.hidden && getInvestigator(state, p.investigator).location === here)
      )
    }
    if (p.type === 'enemy') return state.enemies[p.enemy]?.location === here
    return false
  })
  // The Necronomicon: no se pueden usar las habilidades de los propios apoyos.
  const assets = assetsBlocked(state, id)
    ? []
    : Object.values(state.assets).filter((a) => a.owner === id)
  const withTarget = (options: AbilityOption[], target: ChoiceTarget) =>
    options.map((o) => ({ target, ...o }))
  const options = [
    ...(location.revealed
      ? withTarget(locationBehavior(location.id)?.abilities?.(state, location, id) ?? [], {
          type: 'location',
          id: location.id,
        })
      : []),
    ...(agenda
      ? withTarget(agendaBehavior(agenda.code)?.abilities?.(state, agenda, id) ?? [], {
          type: 'agenda',
        })
      : []),
    ...(act
      ? withTarget(actBehavior(act.code)?.abilities?.(state, act, id) ?? [], { type: 'act' })
      : []),
    ...treacheries.flatMap((t) =>
      withTarget(treacheryBehavior(t.code)?.abilities?.(state, t, id) ?? [], {
        type: 'treachery',
        id: t.id,
      }),
    ),
    ...enemiesAt(state, here).flatMap((e) =>
      withTarget(enemyBehavior(e.code)?.abilities?.(state, e, id) ?? [], {
        type: 'enemy',
        id: e.id,
      }),
    ),
    ...assets.flatMap((a) =>
      withTarget(playerCardBehavior(a.code)?.abilities?.(state, a, id) ?? [], {
        type: 'asset',
        id: a.id,
      }),
    ),
    // RR: Attachments. Abilities printed on events attached to your assets.
    ...Object.values(state.assets)
      .filter((a) => a.owner === id)
      .flatMap((a) =>
        (a.upgrades ?? []).flatMap((u, index) =>
          u.owner === id
            ? withTarget(
                playerCardBehavior(u.code)?.attachedAbilities?.(state, a, index, id) ?? [],
                { type: 'asset', id: a.id },
              )
            : [],
        ),
      ),
    // Cartas de Historia: cualquier investigador puede usar sus habilidades.
    ...Object.values(state.stories ?? {}).flatMap((s) =>
      withTarget(storyBehavior(s.code)?.abilities?.(state, s, id) ?? [], {
        type: 'story',
        id: s.code,
      }),
    ),
    // Apoyos sin dueño en tu localización (o vinculados a un enemigo de ella).
    ...Object.values(state.placedAssets ?? {})
      .filter((p) => !p.faceDown && placedLocation(state, p) === here)
      .flatMap((p) =>
        withTarget(playerCardBehavior(p.code)?.placedAbilities?.(state, p, id) ?? [], {
          type: 'placed',
          id: p.id,
        }),
      ),
    ...(scenarioBehavior(state.scenarioId)?.abilities?.(state, null, id) ?? []),
  ]
  const noFast = fastAbilitiesBlocked(state, id)
  return options
    .filter(
      (a) =>
        a.actions <= investigator.actionsRemaining &&
        !(noFast && a.actions === 0) &&
        withinLimit(state, a.key, id, a.limit),
    )
    .flatMap((a) => {
      if (!a.parley) return [a]
      const extra = parleyCosts(state, id)
      return extra ? [{ ...a, costs: [...(a.costs ?? []), ...extra] }] : []
    })
}

/** Una traición unida al Lugar impide investigarlo (Puerta cerrada con llave). */
export function investigationBlocked(state: GameState, location: LocationId): boolean {
  return Object.values(state.treacheries).some(
    (t) =>
      t.placement.type === 'location' &&
      t.placement.location === location &&
      !!treacheryBehavior(t.code)?.blocksInvestigation,
  )
}

/**
 * Costes adicionales para negociar de las cartas de la zona de amenaza del
 * investigador (¿Qué has hecho?). `null` si alguno no se puede pagar.
 */
export function parleyCosts(state: GameState, id: InvestigatorId): Message[] | null {
  const costs: Message[] = []
  for (const t of Object.values(state.treacheries)) {
    if (t.placement.type !== 'threatArea' || t.placement.investigator !== id) continue
    const cost = treacheryBehavior(t.code)?.parleyCost
    if (!cost) continue
    const messages = cost(state, id)
    if (!messages) return null
    costs.push(...messages)
  }
  return costs
}

/** Las acciones que no provocan ataques de oportunidad. */
export function provokesAttacksOfOpportunity(action: Action): boolean {
  if (action.kind === 'play') {
    const behavior = playerCardBehavior(action.card)
    return !behavior?.evadeAction && !behavior?.noAttacksOfOpportunity
  }
  return action.kind !== 'fight' && action.kind !== 'evade'
}

/** Languor: no puede jugar ni comprometer cartas de este tipo esta ronda. */
export function typeBlocked(investigator: Investigator, cardType: string, round: number): boolean {
  return (investigator.blockedTypes ?? []).some((b) => b.cardType === cardType && b.round === round)
}

/** Traiciones de su zona de amenaza, incluidas las Ocultas de su mano. */
export function threatAreaTreacheries(state: GameState, id: InvestigatorId): Treachery[] {
  return Object.values(state.treacheries).filter(
    (t) => t.placement.type === 'threatArea' && t.placement.investigator === id,
  )
}

type Restriction = NonNullable<TreacheryBehavior['restricts']>

function restricted(
  state: GameState,
  id: InvestigatorId,
  applies: (r: Restriction) => boolean | undefined,
): boolean {
  return threatAreaTreacheries(state, id).some((t) => {
    const r = treacheryBehavior(t.code)?.restricts
    return !!r && !!applies(r)
  })
}

/** Una traición de su zona de amenaza le impide jugar este tipo (Dissonant Voices). */
export const treacheryBlocksPlay = (state: GameState, id: InvestigatorId, cardType: string) =>
  restricted(state, id, (r) => r.play?.some((type) => type === cardType))

/** No puede jugar cartas de este tipo (Languor, Dissonant Voices, Whispers in Your Head). */
export function playBlocked(state: GameState, id: InvestigatorId, cardType: string): boolean {
  return (
    typeBlocked(getInvestigator(state, id), cardType, state.round) ||
    treacheryBlocksPlay(state, id, cardType)
  )
}

/** No puede comprometer cartas de este tipo a pruebas de habilidad. */
export function commitBlocked(state: GameState, id: InvestigatorId, cardType: string): boolean {
  return (
    typeBlocked(getInvestigator(state, id), cardType, state.round) ||
    restricted(state, id, (r) => r.commit?.some((type) => type === cardType))
  )
}

/** No puede activar habilidades [fast] (Whispers in Your Head: Anxiety). */
export const fastAbilitiesBlocked = (state: GameState, id: InvestigatorId): boolean =>
  restricted(state, id, (r) => r.fastAbilities)

/** Ya se ha movido en este turno y no puede moverse más de una vez por turno (Dread). */
export function moveBlocked(state: GameState, id: InvestigatorId): boolean {
  const investigator = getInvestigator(state, id)
  return (
    !!state.activeTurn &&
    investigator.lastMoveTurn === turnStartedAt(state) &&
    restricted(state, id, (r) => r.moveOncePerTurn)
  )
}

/** Coste en recursos de una carta de su mano, con los cambios del escenario (Cabina de luces). */
export function cardCost(
  state: GameState,
  id: InvestigatorId,
  code: CardCode,
  discount = 0,
): number {
  const printed = playerCardDef(code)?.cost ?? 0
  const change = scenarioBehavior(state.scenarioId)?.cardCostModifier?.(state, id, code) ?? 0
  // Cartas de la mano que encarecen las demás (una copia de la propia carta no cuenta).
  const hand = [...(state.investigators.find((i) => i.id === id)?.hand ?? [])]
  const own = hand.indexOf(code)
  if (own >= 0) hand.splice(own, 1)
  const fromHand = hand.reduce((n, c) => n + (playerCardBehavior(c)?.handCostModifier ?? 0), 0)
  return Math.max(0, printed + change + fromHand - discount)
}

/** Una debilidad en su zona de amenaza le impide jugar o usar apoyos (The Necronomicon). */
export function assetsBlocked(state: GameState, investigator: string): boolean {
  return Object.values(state.treacheries).some(
    (t) =>
      t.placement.type === 'threatArea' &&
      t.placement.investigator === investigator &&
      !!treacheryBehavior(t.code)?.blocksAssets,
  )
}
