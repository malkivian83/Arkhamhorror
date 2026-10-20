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
} from './content'
import {
  activeInvestigators,
  enemiesAt,
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
} from './types'

/**
 * Cartas de la mano que el investigador puede jugar ahora: apoyos y eventos con
 * efecto implementado, que pueda pagar y cuyas restricciones se cumplan.
 * `fast`: true → las rápidas (sin acción); false → las que cuestan una acción.
 */
export function playableCards(state: GameState, id: InvestigatorId, fast: boolean): CardCode[] {
  const investigator = getInvestigator(state, id)
  if (investigator.eliminated || investigator.location === null) return []
  return [...new Set(investigator.hand)].filter((code) => {
    const def = playerCardDef(code)
    if (!def || (def.fast ?? false) !== fast) return false
    if (def.type !== 'asset' && def.type !== 'event') return false
    if (def.type === 'asset' && assetsBlocked(state, id)) return false
    if (typeBlocked(investigator, def.type, state.round)) return false
    const behavior = playerCardBehavior(code)
    if (def.type === 'event' && !behavior?.play) return false
    if ((def.cost ?? 0) > investigator.resources) return false
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
    { kind: 'investigate' },
    ...(leavingBlocked(state, here) ? [] : location.connections)
      .filter((to) => state.locations[to] && canAffordEntry(state, to))
      .map((to): Action => ({ kind: 'move', to })),
    // Un enemigo distante (aloof) no enfrentado no puede ser atacado.
    ...enemiesHere
      .filter((e) => e.engagedWith !== null || !e.keywords.includes('aloof'))
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
  if (action.kind === 'investigate') {
    return 1 + (getLocation(state, here).investigateExtraActions ?? 0)
  }
  if (action.kind === 'move') return 1 + moveCost(state, here) + moveCost(state, action.to)
  return 1
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
    if (p.type === 'threatArea') {
      return p.investigator === id || getInvestigator(state, p.investigator).location === here
    }
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
  return options.filter(
    (a) => a.actions <= investigator.actionsRemaining && withinLimit(state, a.key, id, a.limit),
  )
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

/** Una debilidad en su zona de amenaza le impide jugar o usar apoyos (The Necronomicon). */
export function assetsBlocked(state: GameState, investigator: string): boolean {
  return Object.values(state.treacheries).some(
    (t) =>
      t.placement.type === 'threatArea' &&
      t.placement.investigator === investigator &&
      !!treacheryBehavior(t.code)?.blocksAssets,
  )
}
