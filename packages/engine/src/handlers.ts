import {
  actContributors,
  actionCost,
  availableAbilities,
  availableActions,
  assetsBlocked,
  canAdvanceAct,
  cluesToAdvanceAct,
  describeAction,
  playableCards,
  provokesAttacksOfOpportunity,
  withinLimit,
} from './actions'
import {
  actBehavior,
  agendaBehavior,
  enemyBehavior,
  investigatorBehavior,
  locationBehavior,
  playerCardBehavior,
  playerCardDef,
  scenarioBehavior,
  treacheryBehavior,
} from './content'
import { EngineError } from './errors'
import { nextInt, shuffle } from './rng'
import {
  activeInvestigators,
  enemiesAt,
  engagedEnemies,
  findEnemy,
  getEnemy,
  getInvestigator,
  getLocation,
  investigatorsAt,
  leadInvestigator,
  newId,
  nextStepToward,
  perInvestigator,
  push,
  removeEnemy,
  shroudOf,
  updateEnemy,
  updateInvestigator,
  updateLocation,
} from './state'
import { emptyCampaignLog } from './setup'
import type {
  Action,
  Asset,
  CampaignLog,
  ChaosToken,
  Choice,
  LabelParams,
  SlotType,
  EncounterCard,
  Enemy,
  EnemyCard,
  GameState,
  Investigator,
  InvestigatorId,
  InvestigatorRecord,
  Message,
  Prey,
  ReactionOption,
  Requirement,
  SkillTest,
  SkillType,
  TokenEffect,
  Treachery,
  Trigger,
} from './types'

export const ACTIONS_PER_TURN = 3
export const MAX_HAND_SIZE = 8

/**
 * Aplica un mensaje al estado. Las referencias "RR" apuntan a las secciones del
 * reglamento (docs-proyecto/reglas).
 */
export function handle(state: GameState, message: Message): GameState {
  switch (message.type) {
    // ----------------------------------------------------------------- Ronda
    case 'Round': {
      // RR "Round Sequence": en la primera ronda se omite la fase de mitos.
      const round = state.round + 1
      const phases: Message[] = [
        ...(round === 1 ? [] : [{ type: 'MythosPhase' } as const]),
        { type: 'InvestigationPhase' },
        { type: 'EnemyPhase' },
        { type: 'UpkeepPhase' },
        { type: 'EndOfRound' },
        { type: 'Round' },
      ]
      return push(log({ ...state, round }, 'log.round', { round }), ...phases)
    }

    // ----------------------------------------------------------------- Mitos
    case 'MythosPhase':
      // RR "The Mythos Phase": perdición, comprobar plan, cada investigador roba un encuentro.
      return push(
        log({ ...state, phase: 'mythos' }, 'log.phase', { phase: 'mythos' }),
        { type: 'PlaceDoom', amount: 1 },
        { type: 'CheckAgenda' },
        ...activeInvestigators(state).map((i): Message => ({
          type: 'DrawEncounterCard',
          investigator: i.id,
        })),
      )

    case 'PlaceDoom':
      return push(
        { ...state, doom: state.doom + message.amount },
        { type: 'Forced', trigger: { type: 'afterDoomPlaced' } },
      )

    case 'CheckAgenda': {
      const agenda = state.agendas[state.agendaIndex]
      if (agenda && totalDoom(state) >= agenda.doomThreshold)
        return push(state, { type: 'AdvanceAgenda' })
      return state
    }

    case 'AdvanceAgenda': {
      // RR "The Mythos Phase": se descarta la perdición, se resuelve el reverso y
      // la siguiente carta pasa a ser el plan actual.
      const agenda = state.agendas[state.agendaIndex]
      const onAdvance = agendaBehavior(agenda?.code)?.onAdvance?.(state) ?? []
      return push(
        log(
          {
            ...state,
            doom: 0,
            // También se retira la perdición de las cartas de jugador.
            investigators: state.investigators.map((i) => (i.doom ? { ...i, doom: 0 } : i)),
            enemies: Object.fromEntries(
              Object.entries(state.enemies).map(([id, e]) => [id, e.doom ? { ...e, doom: 0 } : e]),
            ),
          },
          'log.agendaAdvanced',
          { name: agenda?.name ?? '' },
        ),
        ...onAdvance,
        { type: 'AgendaAdvanced' },
      )
    }

    case 'AgendaAdvanced': {
      const agendaIndex = state.agendaIndex + 1
      if (agendaIndex >= state.agendas.length) {
        return push(state, { type: 'EndScenario', outcome: { type: 'noResolution' } })
      }
      return { ...state, agendaIndex }
    }

    case 'DrawEncounterCard': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated || investigator.location === null) return state
      let deck = state.encounterDeck
      let discard = state.encounterDiscard
      let rng = state.rng
      if (deck.length === 0) {
        ;[deck, rng] = shuffle(discard, rng)
        discard = []
      }
      const [card, ...rest] = deck
      const next = { ...state, encounterDeck: rest, encounterDiscard: discard, rng }
      if (!card) return next
      return push(next, { type: 'ResolveEncounterCard', investigator: investigator.id, card })
    }

    case 'DrawFromEncounterDiscard': {
      // "Roba la copia superior de X de la pila de descartes de encuentros, si puedes."
      const index = state.encounterDiscard.map((c) => c.code).lastIndexOf(message.code)
      const card = state.encounterDiscard[index]
      if (!card) return state
      return push(
        { ...state, encounterDiscard: state.encounterDiscard.filter((_, n) => n !== index) },
        { type: 'ResolveEncounterCard', investigator: message.investigator, card },
      )
    }

    case 'ResolveEncounterCard': {
      const investigator = getInvestigator(state, message.investigator)
      const { card } = message
      if (investigator.eliminated || investigator.location === null) {
        return { ...state, encounterDiscard: [...state.encounterDiscard, card] }
      }
      state = log(state, 'log.encounter', {
        name: investigator.name,
        card: card.name,
        code: card.code,
      })
      if (card.kind === 'treachery') {
        const [id, next] = newId(state, 'treachery-')
        return push(
          {
            ...next,
            treacheries: {
              ...next.treacheries,
              [id]: { ...card, keywords: [...card.keywords], id, placement: { type: 'limbo' } },
            },
          },
          {
            type: 'Forced',
            trigger: { type: 'whenTreacheryDrawn', investigator: investigator.id, treachery: id },
          },
          { type: 'RevealTreachery', treachery: id, investigator: investigator.id },
          { type: 'AfterRevelation', treachery: id, investigator: investigator.id },
        )
      }
      const next = state
      if (card.spawnAt !== undefined) {
        // RR "Enemy": si no se pueden cumplir las instrucciones de aparición, se descarta.
        if (!state.locations[card.spawnAt]) {
          return { ...next, encounterDiscard: [...next.encounterDiscard, card] }
        }
        return push(next, { type: 'SpawnEnemy', card, location: card.spawnAt, engageWith: null })
      }
      const engageWith = card.keywords.includes('aloof') ? null : investigator.id
      return push(next, { type: 'SpawnEnemy', card, location: investigator.location, engageWith })
    }

    case 'SpawnEnemy': {
      const [id, withId] = newId(state, 'enemy-')
      const { card } = message
      const next = {
        ...withId,
        enemies: {
          ...withId.enemies,
          [id]: {
            ...card,
            keywords: [...card.keywords],
            id,
            maxHealth: perInvestigator(withId, card.health, card.healthPerInvestigator ?? false),
            damageTaken: 0,
            location: message.location,
            engagedWith: message.engageWith,
            exhausted: false,
            ...(message.owner ? { owner: message.owner } : {}),
          },
        },
      }
      return push(
        next,
        { type: 'CheckEngagement', location: message.location },
        {
          type: 'Forced',
          trigger: { type: 'enemyEntersLocation', enemy: id, location: message.location },
        },
      )
    }

    // --------------------------------------------------------------- Traiciones
    case 'RevealTreachery': {
      const treachery = state.treacheries[message.treachery]
      if (!treachery || treachery.canceled) return state
      const behavior = treacheryBehavior(treachery.code)
      return behavior
        ? push(state, ...behavior.revelation(state, message.investigator, treachery))
        : state
    }

    case 'AfterRevelation': {
      const treachery = state.treacheries[message.treachery]
      let next: GameState = { ...state, surgePending: false }
      // Si la revelación no la puso en juego, va a la pila de descartes.
      if (treachery?.placement.type === 'limbo') next = discardTreachery(next, treachery.id)
      const surge = state.surgePending || (treachery?.keywords.includes('surge') ?? false)
      return surge
        ? push(next, { type: 'DrawEncounterCard', investigator: message.investigator })
        : next
    }

    case 'GainSurge':
      return { ...state, surgePending: true }

    case 'PlaceTreachery':
      if (!state.treacheries[message.treachery]) return state
      return {
        ...state,
        treacheries: {
          ...state.treacheries,
          [message.treachery]: {
            ...(state.treacheries[message.treachery] as Treachery),
            placement: message.placement,
          },
        },
      }

    case 'DiscardTreachery':
      return state.treacheries[message.treachery]
        ? discardTreachery(state, message.treachery)
        : state

    case 'Forced':
      // Primero lo obligatorio; después, las reacciones que quieran usar los jugadores.
      return push(state, ...forcedAbilities(state, message.trigger), {
        type: 'Reactions',
        trigger: message.trigger,
      })

    // ---------------------------------------------------------- Investigación
    case 'InvestigationPhase':
      return push(
        log(
          {
            ...state,
            phase: 'investigation',
            investigators: state.investigators.map((i) => ({ ...i, turnTaken: false })),
          },
          'log.phase',
          { phase: 'investigation' },
        ),
        { type: 'ChooseNextTurn' },
        { type: 'Forced', trigger: { type: 'investigationPhaseEnds' } },
      )

    case 'ChooseNextTurn': {
      // RR "The Investigation Phase": el grupo elige quién juega el siguiente turno.
      const waiting = activeInvestigators(state).filter((i) => !i.turnTaken)
      const [only] = waiting
      if (!only) return state
      if (waiting.length === 1) {
        return push(state, { type: 'BeginTurn', investigator: only.id }, { type: 'ChooseNextTurn' })
      }
      const lead = leadInvestigator(state)
      if (!lead) return state
      return push(state, {
        type: 'Ask',
        investigator: lead.id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseNextInvestigator',
          choices: waiting.map((i): Choice => ({
            label: 'choice.investigator',
            params: { name: i.name },
            then: [{ type: 'BeginTurn', investigator: i.id }, { type: 'ChooseNextTurn' }],
          })),
        },
      })
    }

    case 'BeginTurn':
      return push(
        updateInvestigator(
          { ...state, activeTurn: message.investigator },
          message.investigator,
          (i) => ({
            ...i,
            turnTaken: true,
            actionsRemaining: ACTIONS_PER_TURN,
            movedThisTurn: false,
            extraEvade: investigatorBehavior(i.id)?.extraEvadeAction ?? false,
          }),
        ),
        { type: 'Forced', trigger: { type: 'turnBegins', investigator: message.investigator } },
        { type: 'PlayerWindow', investigator: message.investigator },
      )

    case 'PlayerWindow': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated) return state
      const id = investigator.id
      const again: Message = { type: 'PlayerWindow', investigator: id }
      if (actObjectiveMet(state)) return push(state, { type: 'AdvanceAct' }, again)
      const actions =
        investigator.actionsRemaining > 0 || investigator.extraEvade
          ? availableActions(state, id).map((action): Choice => {
              const choice = describeAction(state, id, action)
              return { ...choice, then: [{ type: 'TakeAction', investigator: id, action }, again] }
            })
          : []
      const act = state.acts[state.actIndex]
      const advanceAct: Choice[] =
        act?.advanceTiming === 'anytime' && canAdvanceAct(state)
          ? [
              {
                label: 'action.advanceAct',
                params: { act: act.name, clues: cluesToAdvanceAct(state) ?? 0 },
                then: [{ type: 'AdvanceAct' }, again],
              },
            ]
          : []
      const fastCards = playableCards(state, id, true).map((code): Choice => ({
        label: 'action.playFast',
        params: { card: playerCardDef(code)?.name ?? code },
        target: { type: 'hand', code },
        display: { kind: 'play', action: 'play', actions: 0 },
        then: [{ type: 'PlayCard', investigator: id, code }, again],
      }))
      const abilities = availableAbilities(state, id).map((a): Choice => ({
        label: a.label,
        ...(a.params ? { params: a.params } : {}),
        ...(a.target ? { target: a.target } : {}),
        display: { kind: 'ability', actions: a.actions, ...abilitySkill(a.then) },
        then: [
          {
            type: 'UseAbility',
            investigator: id,
            key: a.key,
            actions: a.actions,
            provokes: a.provokes,
            ...(a.limit ? { limit: a.limit } : {}),
            then: a.then,
          },
          again,
        ],
      }))
      // Sin acciones ni nada gratuito que hacer, el turno termina solo.
      if (
        actions.length === 0 &&
        advanceAct.length === 0 &&
        abilities.length === 0 &&
        fastCards.length === 0
      ) {
        return push(state, { type: 'EndTurn', investigator: id })
      }
      return push(state, {
        type: 'Ask',
        investigator: id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseAction',
          choices: [
            ...actions,
            ...fastCards,
            ...abilities,
            ...advanceAct,
            { label: 'action.endTurn', then: [{ type: 'EndTurn', investigator: id }] },
          ],
        },
      })
    }

    case 'EndTurn': {
      // "Al final de tu turno": efectos pendientes de este investigador.
      const pending = (state.endOfTurn ?? []).filter((e) => e.investigator === message.investigator)
      const next = updateInvestigator(
        {
          ...state,
          activeTurn: null,
          endOfTurn: (state.endOfTurn ?? []).filter((e) => e.investigator !== message.investigator),
        },
        message.investigator,
        (i) => ({ ...i, actionsRemaining: 0, extraEvade: false }),
      )
      return push(next, ...pending.flatMap((e) => e.then), {
        type: 'Forced',
        trigger: { type: 'turnEnds', investigator: message.investigator },
      })
    }

    case 'TakeAction': {
      const investigator = getInvestigator(state, message.investigator)
      // La acción adicional de evitar (Trish) se gasta antes que las normales.
      const useExtra = !!investigator.extraEvade && isEvadeAction(message.action)
      if (!useExtra && investigator.actionsRemaining <= 0) {
        throw new EngineError('No quedan acciones')
      }
      const cost = actionCost(state, investigator.id, message.action)
      const paid = updateInvestigator(state, investigator.id, (i) =>
        useExtra
          ? { ...i, extraEvade: false }
          : { ...i, actionsRemaining: Math.max(0, i.actionsRemaining - cost) },
      )
      // RR "Attack of Opportunity": tras pagar el coste y antes de resolver la acción.
      const attacks: Message[] = provokesAttacksOfOpportunity(message.action)
        ? engagedEnemies(state, investigator.id)
            .filter((e) => !e.exhausted)
            .map((e) => ({
              type: 'EnemyAttack',
              enemy: e.id,
              investigator: investigator.id,
              exhaustAfter: false,
            }))
        : []
      return push(paid, ...attacks, {
        type: 'PerformAction',
        investigator: investigator.id,
        action: message.action,
      })
    }

    case 'PerformAction': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated || investigator.location === null) return state
      const id = investigator.id
      const { action } = message
      if (action.kind !== 'play') {
        state = log(state, `log.action.${action.kind}`, {
          name: investigator.name,
          ...(describeAction(state, id, action).params ?? {}),
        })
      }
      switch (action.kind) {
        case 'play':
          return push(state, { type: 'PlayCard', investigator: id, code: action.card })
        case 'draw':
          return push(state, { type: 'DrawCards', investigator: id, amount: 1 })
        case 'resource':
          return push(state, { type: 'GainResources', investigator: id, amount: 1 })
        case 'move':
          return push(state, { type: 'MoveTo', investigator: id, location: action.to })
        case 'investigate':
          return push(state, {
            type: 'BeginSkillTest',
            investigator: id,
            skill: 'intellect',
            difficulty: shroudOf(state, investigator.location),
            kind: { type: 'investigate', location: investigator.location },
          })
        case 'fight': {
          const enemy = findEnemy(state, action.enemy)
          if (!enemy) return state
          return push(state, {
            type: 'BeginSkillTest',
            investigator: id,
            skill: 'combat',
            difficulty: enemy.fight,
            kind: { type: 'fight', enemy: enemy.id },
          })
        }
        case 'evade': {
          const enemy = findEnemy(state, action.enemy)
          if (!enemy) return state
          return push(state, {
            type: 'BeginSkillTest',
            investigator: id,
            skill: 'agility',
            difficulty: enemy.evade,
            kind: { type: 'evade', enemy: enemy.id },
          })
        }
        case 'engage':
          return push(state, { type: 'EngageEnemy', enemy: action.enemy, investigator: id })
      }
      break
    }

    // ------------------------------------------------------------ Investigador
    case 'GainResources':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        resources: i.resources + message.amount,
      }))

    case 'DrawCards': {
      if (message.amount <= 0) return state
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated) return state
      if (investigator.deck.length === 0) {
        // RR "Draw": con el mazo vacío, 1 horror y se baraja la pila de descartes.
        const [deck, rng] = shuffle(investigator.discard, state.rng)
        const reshuffled = updateInvestigator({ ...state, rng }, investigator.id, (i) => ({
          ...i,
          deck,
          discard: [],
        }))
        const horror: Message = {
          type: 'TakeDamage',
          investigator: investigator.id,
          damage: 0,
          horror: 1,
        }
        return deck.length === 0 ? push(reshuffled, horror) : push(reshuffled, horror, message)
      }
      const [card, ...deck] = investigator.deck as [string, ...string[]]
      const more: Message[] = message.amount > 1 ? [{ ...message, amount: message.amount - 1 }] : []
      if (message.opening && playerCardDef(card)?.weakness) {
        // RR "Setup": las debilidades de la mano inicial se apartan, se roba otra
        // y después se barajan de nuevo en el mazo.
        const rest = updateInvestigator(state, investigator.id, (i) => ({
          ...i,
          deck: [...deck, card],
        }))
        return push(rest, message, { type: 'ShuffleDeck', investigator: investigator.id })
      }
      if (resolvesWhenDrawn(card)) {
        const removed = updateInvestigator(state, investigator.id, (i) => ({ ...i, deck }))
        return push(
          removed,
          { type: 'ResolveWeakness', investigator: investigator.id, code: card },
          ...more,
        )
      }
      const drawn = updateInvestigator(state, investigator.id, (i) => ({
        ...i,
        deck,
        hand: [...i.hand, card],
      }))
      const after: Message[] = message.opening
        ? []
        : [
            {
              type: 'Forced',
              trigger: { type: 'afterDrawCard', investigator: investigator.id, card },
            },
          ]
      return push(drawn, ...after, ...more)
    }

    case 'DiscardFromHand':
      return updateInvestigator(state, message.investigator, (i) => {
        const index = i.hand.indexOf(message.card)
        if (index < 0) return i
        return {
          ...i,
          hand: i.hand.filter((_, n) => n !== index),
          discard: [...i.discard, message.card],
        }
      })

    case 'CheckHandSize': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated || investigator.hand.length <= handSize(state, investigator.id)) {
        return state
      }
      return push(state, {
        type: 'Ask',
        investigator: investigator.id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.discardDownToHandSize',
          choices: [...new Set(investigator.hand)].map((card): Choice => ({
            label: 'choice.discard',
            params: { card },
            then: [
              { type: 'DiscardFromHand', investigator: investigator.id, card },
              { type: 'CheckHandSize', investigator: investigator.id },
            ],
          })),
        },
      })
    }

    case 'MoveTo': {
      getLocation(state, message.location)
      // Los enemigos enfrentados acompañan al investigador.
      const first = !getInvestigator(state, message.investigator).movedThisTurn
      let next = updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        location: message.location,
        movedThisTurn: true,
      }))
      for (const enemy of engagedEnemies(next, message.investigator)) {
        next = updateEnemy(next, enemy.id, (e) => ({ ...e, location: message.location }))
      }
      const reveal: Message[] = getLocation(next, message.location).revealed
        ? []
        : [{ type: 'RevealLocation', location: message.location }]
      return push(
        next,
        ...reveal,
        { type: 'CheckEngagement', location: message.location },
        {
          type: 'Forced',
          trigger: { type: 'afterMove', investigator: message.investigator, first },
        },
      )
    }

    case 'RevealLocation':
      return updateLocation(state, message.location, (l) =>
        l.revealed
          ? l
          : {
              ...l,
              revealed: true,
              clues: perInvestigator(state, l.clueValue, l.cluesPerInvestigator),
            },
      )

    case 'DiscoverClues': {
      const investigator = getInvestigator(state, message.investigator)
      const where = message.location ?? investigator.location
      if (where === null || !state.locations[where]) return state
      const location = getLocation(state, where)
      const amount = Math.min(message.amount, location.clues)
      if (amount <= 0) return state
      return push(
        updateInvestigator(
          updateLocation(state, location.id, (l) => ({ ...l, clues: l.clues - amount })),
          investigator.id,
          (i) => ({ ...i, clues: i.clues + amount }),
        ),
        { type: 'Log', key: 'log.clues', params: { name: investigator.name, amount } },
        {
          type: 'Forced',
          trigger: {
            type: 'afterDiscoverClues',
            investigator: investigator.id,
            location: location.id,
          },
        },
      )
    }

    case 'PlaceCluesOnLocation': {
      const investigator = getInvestigator(state, message.investigator)
      const amount = Math.min(message.amount, investigator.clues)
      if (investigator.location === null || amount <= 0) return state
      return updateLocation(
        updateInvestigator(state, investigator.id, (i) => ({ ...i, clues: i.clues - amount })),
        investigator.location,
        (l) => ({ ...l, clues: l.clues + amount }),
      )
    }

    case 'LoseResources':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        resources: Math.max(0, i.resources - message.amount),
      }))

    case 'DiscardRandomFromHand': {
      const investigator = getInvestigator(state, message.investigator)
      if (message.amount <= 0 || investigator.hand.length === 0) return state
      const [index, rng] = nextInt(state.rng, investigator.hand.length)
      const card = investigator.hand[index] as string
      const next = updateInvestigator({ ...state, rng }, investigator.id, (i) => ({
        ...i,
        hand: i.hand.filter((_, n) => n !== index),
        discard: [...i.discard, card],
      }))
      return message.amount > 1 ? push(next, { ...message, amount: message.amount - 1 }) : next
    }

    case 'TakeDamage': {
      // RR "Damage and Horror": si hay apoyos que puedan recibirlo, el jugador asigna.
      const canSoak =
        !message.direct &&
        soakers(state, message.investigator, 'damage').length +
          soakers(state, message.investigator, 'horror').length >
          0
      if (canSoak) {
        return push(state, {
          type: 'AssignDamage',
          investigator: message.investigator,
          damage: message.damage,
          horror: message.horror,
        })
      }
      if (message.damage === 0 && message.horror === 0) return state
      const name = getInvestigator(state, message.investigator).name
      return push(
        log(
          updateInvestigator(state, message.investigator, (i) => ({
            ...i,
            damage: i.damage + message.damage,
            horror: i.horror + message.horror,
          })),
          'log.damage',
          { name, damage: message.damage, horror: message.horror },
        ),
        { type: 'CheckDefeat', investigator: message.investigator },
        {
          type: 'Forced',
          trigger: {
            type: 'afterTakeDamage',
            investigator: message.investigator,
            damage: message.damage,
            horror: message.horror,
          },
        },
      )
    }

    case 'AssignDamage': {
      const { investigator, damage, horror } = message
      const kind = damage > 0 ? 'damage' : horror > 0 ? 'horror' : null
      if (kind === null) return state
      const rest: Message = {
        type: 'AssignDamage',
        investigator,
        damage: kind === 'damage' ? damage - 1 : damage,
        horror: kind === 'horror' ? horror - 1 : horror,
      }
      const options = soakers(state, investigator, kind)
      const toInvestigator: Message = {
        type: 'TakeDamage',
        investigator,
        damage: kind === 'damage' ? 1 : 0,
        horror: kind === 'horror' ? 1 : 0,
        direct: true,
      }
      if (options.length === 0) {
        // Lo que queda va al investigador de una vez.
        return push(state, { type: 'TakeDamage', investigator, damage, horror, direct: true })
      }
      return push(state, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: kind === 'damage' ? 'prompt.assignDamage' : 'prompt.assignHorror',
          choices: [
            {
              label: 'choice.assignToInvestigator',
              params: { name: getInvestigator(state, investigator).name },
              target: { type: 'investigator', id: investigator },
              then: [toInvestigator, rest],
            },
            ...options.map((a): Choice => ({
              label: 'choice.assignToAsset',
              params: { card: playerCardDef(a.code)?.name ?? a.code },
              target: { type: 'asset', id: a.id },
              then: [
                {
                  type: 'DamageAsset',
                  asset: a.id,
                  damage: kind === 'damage' ? 1 : 0,
                  horror: kind === 'horror' ? 1 : 0,
                },
                rest,
              ],
            })),
          ],
        },
      })
    }

    case 'DamageAsset': {
      const asset = state.assets[message.asset]
      if (!asset) return state
      const def = playerCardDef(asset.code)
      const damaged = {
        ...asset,
        damage: asset.damage + message.damage,
        horror: asset.horror + message.horror,
      }
      const next = { ...state, assets: { ...state.assets, [asset.id]: damaged } }
      const defeated =
        (def?.health !== undefined && damaged.damage >= def.health) ||
        (def?.sanity !== undefined && damaged.horror >= def.sanity)
      const after: Message[] = [
        {
          type: 'Forced',
          trigger: {
            type: 'afterAssetDamaged',
            asset: asset.id,
            damage: message.damage,
            horror: message.horror,
          },
        },
      ]
      return defeated
        ? push(
            next,
            ...after,
            { type: 'Forced', trigger: { type: 'assetDefeated', asset: damaged } },
            { type: 'DiscardAsset', asset: asset.id },
          )
        : push(next, ...after)
    }

    // ------------------------------------------------------- Cartas de jugador
    case 'PlayCard': {
      const investigator = getInvestigator(state, message.investigator)
      const def = playerCardDef(message.code)
      const index = investigator.hand.indexOf(message.code)
      if (!def || index < 0) return state
      const cost = Math.max(0, (def.cost ?? 0) - (message.discount ?? 0))
      if (cost > investigator.resources) throw new EngineError('No hay recursos suficientes')
      const paid = log(
        updateInvestigator(state, investigator.id, (i) => ({
          ...i,
          resources: i.resources - cost,
          hand: i.hand.filter((_, n) => n !== index),
          // Un evento va a la pila de descartes tras resolverse.
          discard: def.type === 'event' ? [...i.discard, message.code] : i.discard,
        })),
        'log.play',
        { name: investigator.name, card: def.name },
      )
      const spent: Message[] =
        cost > 0
          ? [
              {
                type: 'Forced',
                trigger: {
                  type: 'afterSpendResources',
                  investigator: investigator.id,
                  amount: cost,
                },
              },
            ]
          : []
      if (def.type === 'asset') {
        return push(
          paid,
          { type: 'PutAssetIntoPlay', investigator: investigator.id, code: message.code },
          ...spent,
          {
            type: 'Forced',
            trigger: { type: 'afterPlayAsset', investigator: investigator.id, code: message.code },
          },
        )
      }
      const effect =
        message.effect ?? playerCardBehavior(message.code)?.play?.(paid, investigator.id) ?? []
      return push(paid, ...spent, ...effect)
    }

    case 'PutAssetIntoPlay': {
      // RR "Equipment Slots": si no hay ranura libre, se descarta un apoyo que la ocupe.
      const def = playerCardDef(message.code)
      if (!def) return state
      const full = (message.noSlot ? [] : (def.slots ?? [])).find(
        (slot) =>
          slotsUsed(state, message.investigator, slot) + count(def.slots ?? [], slot) >
          slotCapacity(state, message.investigator, slot),
      )
      if (full) {
        const occupying = Object.values(state.assets).filter(
          (a) =>
            a.owner === message.investigator && (playerCardDef(a.code)?.slots ?? []).includes(full),
        )
        return push(state, {
          type: 'Ask',
          investigator: message.investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.freeSlot',
            choices: occupying.map((a): Choice => ({
              label: 'choice.discard',
              params: { card: playerCardDef(a.code)?.name ?? a.code },
              target: { type: 'asset', id: a.id },
              then: [{ type: 'DiscardAsset', asset: a.id }, message],
            })),
          },
        })
      }
      const [id, next] = newId(state, 'asset-')
      const noSlot = message.noSlot ? { noSlot: true } : {}
      const placed: GameState = {
        ...next,
        assets: {
          ...next.assets,
          [id]: {
            id,
            code: message.code,
            owner: message.investigator,
            exhausted: false,
            damage: 0,
            horror: 0,
            uses: def.uses?.count ?? 0,
            ...noSlot,
          },
        },
      }
      return push(placed, {
        type: 'Forced',
        trigger: { type: 'afterAssetEntersPlay', investigator: message.investigator, asset: id },
      })
    }

    case 'ModifyShroud':
      return updateLocation(state, message.location, (l) => ({
        ...l,
        shroudModifier: (l.shroudModifier ?? 0) + message.amount,
      }))

    case 'DiscardAsset': {
      const asset = state.assets[message.asset]
      if (!asset) return state
      const { [asset.id]: _gone, ...assets } = state.assets
      return updateInvestigator({ ...state, assets }, asset.owner, (i) =>
        i.eliminated ? i : { ...i, discard: [...i.discard, asset.code] },
      )
    }

    case 'ExhaustAsset':
      if (!state.assets[message.asset]) return state
      return {
        ...state,
        assets: {
          ...state.assets,
          [message.asset]: { ...(state.assets[message.asset] as Asset), exhausted: true },
        },
      }

    case 'SpendUses': {
      const asset = state.assets[message.asset]
      if (!asset) return state
      const uses = Math.max(0, asset.uses - message.amount)
      const next = { ...state, assets: { ...state.assets, [asset.id]: { ...asset, uses } } }
      // "Si no le quedan usos, descártalo."
      return uses === 0 && playerCardBehavior(asset.code)?.discardWhenEmpty
        ? push(next, { type: 'DiscardAsset', asset: asset.id })
        : next
    }

    case 'CommitWindow': {
      // RR paso 2: comprometer cartas de la mano con iconos que coincidan.
      const test = state.skillTest
      if (!test) return state
      const investigator = getInvestigator(state, test.investigator)
      if (investigator.eliminated) return state
      const committable = [...new Set(investigator.hand)].filter((code) => canCommit(test, code))
      // Cada otro investigador en la misma localización puede comprometer 1 carta.
      const helpers = (
        investigator.location === null ? [] : investigatorsAt(state, investigator.location)
      )
        .filter((o) => o.id !== investigator.id && !test.committed.some((c) => c.by === o.id))
        .flatMap((o) =>
          [...new Set(o.hand)]
            .filter((code) => canCommit(test, code))
            .map((code) => ({ helper: o, code })),
        )
      if (
        committable.length === 0 &&
        helpers.length === 0 &&
        testOptions(state, test).length === 0 &&
        !state.interactive
      ) {
        return state
      }
      return push(state, {
        type: 'Ask',
        investigator: investigator.id,
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.commitCards',
          choices: [
            ...committable.map((code): Choice => ({
              label: 'choice.commit',
              params: {
                card: playerCardDef(code)?.name ?? code,
                icons: matchingIcons(playerCardDef(code)?.icons, test.skill),
              },
              target: { type: 'hand', code },
              then: [
                { type: 'CommitCard', investigator: investigator.id, code },
                { type: 'CommitWindow' },
              ],
            })),
            ...helpers.map(({ helper, code }): Choice => ({
              label: 'choice.commitFrom',
              params: {
                name: helper.name,
                card: playerCardDef(code)?.name ?? code,
                icons: matchingIcons(playerCardDef(code)?.icons, test.skill),
              },
              then: [
                { type: 'CommitCard', investigator: helper.id, code },
                { type: 'CommitWindow' },
              ],
            })),
            ...testOptions(state, test).map((o): Choice => ({
              label: o.label,
              ...(o.params ? { params: o.params } : {}),
              then: [
                {
                  type: 'UseAbility',
                  investigator: o.investigator,
                  key: o.key,
                  actions: 0,
                  provokes: false,
                  ...(o.limit ? { limit: o.limit } : {}),
                  then: o.then,
                },
                { type: 'CommitWindow' },
              ],
            })),
            { label: 'choice.revealToken', then: [] },
          ],
        },
      })
    }

    case 'CommitCard': {
      const test = state.skillTest
      const investigator = getInvestigator(state, message.investigator)
      const index = investigator.hand.indexOf(message.code)
      if (!test || index < 0) return state
      return push(
        {
          ...updateInvestigator(state, investigator.id, (i) => ({
            ...i,
            hand: i.hand.filter((_, n) => n !== index),
          })),
          skillTest: {
            ...test,
            committed: [...test.committed, { code: message.code, by: investigator.id }],
          },
        },
        ...(playerCardBehavior(message.code)?.onCommit?.(state, investigator.id) ?? []),
      )
    }

    case 'Log':
      return log(state, message.key, message.params)

    case 'CheckDefeat': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated) return state
      const byDamage = investigator.damage >= investigator.health
      const byHorror = investigator.horror >= investigator.sanity
      if (!byDamage && !byHorror) return state
      const eliminate: Message = { type: 'EliminateInvestigator', investigator: investigator.id }
      // Reglamento, "Trauma": derrotado por daño → 1 trauma físico; por horror → 1 mental.
      // Si es por ambos a la vez, el jugador elige cuál sufre.
      if (byDamage && byHorror) {
        const trauma = (kind: 'physical' | 'mental'): Choice => ({
          label: `choice.${kind}Trauma`,
          then: [{ type: 'SufferTrauma', investigator: investigator.id, [kind]: 1 }, eliminate],
        })
        return push(state, {
          type: 'Ask',
          investigator: investigator.id,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseTrauma',
            choices: [trauma('physical'), trauma('mental')],
          },
        })
      }
      return push(
        state,
        {
          type: 'SufferTrauma',
          investigator: investigator.id,
          ...(byDamage ? { physical: 1 } : { mental: 1 }),
        },
        eliminate,
      )
    }

    // ------------------------------------------------------------ Registro de campaña
    case 'RecordNote':
      return updateCampaignLog(state, (c) => ({
        ...c,
        notes: c.notes.includes(message.note) ? c.notes : [...c.notes, message.note],
        values:
          message.value === undefined ? c.values : { ...c.values, [message.note]: message.value },
      }))

    case 'CrossOutNote':
      return updateCampaignLog(state, (c) => ({
        ...c,
        crossedOut: c.crossedOut.includes(message.note)
          ? c.crossedOut
          : [...c.crossedOut, message.note],
      }))

    case 'EarnExperience': {
      const amount = message.amount + (message.victory ? victoryTotal(state) : 0)
      return updateRecords(state, message.investigator, (r) => ({ ...r, xp: r.xp + amount }))
    }

    case 'SufferTrauma':
      return updateRecords(state, message.investigator, (r, i) => {
        const physicalTrauma = r.physicalTrauma + (message.physical ?? 0)
        const mentalTrauma = r.mentalTrauma + (message.mental ?? 0)
        // Trauma igual a la salud/cordura impresa: muerto/enloquecido.
        return {
          ...r,
          physicalTrauma,
          mentalTrauma,
          ...(physicalTrauma >= i.health ? { killed: true } : {}),
          ...(mentalTrauma >= i.sanity ? { insane: true } : {}),
        }
      })

    case 'AddStoryAsset':
      return updateRecords(state, message.investigator, (r) => ({
        ...r,
        storyAssets: [...r.storyAssets, message.code],
      }))

    case 'AddChaosTokens':
      return updateCampaignLog(
        { ...state, chaosBag: [...state.chaosBag, ...message.tokens] },
        (c) => ({ ...c, chaosTokens: [...c.chaosTokens, ...message.tokens] }),
      )

    case 'DefeatInvestigator':
      return push(state, { type: 'EliminateInvestigator', investigator: message.investigator })

    case 'Resign':
      // RR "Resign": deja sus pistas en su localización y sale del escenario.
      return push(
        updateInvestigator(state, message.investigator, (i) => ({ ...i, resigned: true })),
        { type: 'EliminateInvestigator', investigator: message.investigator },
      )

    case 'EliminateInvestigator': {
      // RR "Elimination": pistas y enemigos enfrentados quedan en su localización.
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated) return state
      let next = state
      const here = investigator.location
      if (here !== null && investigator.clues > 0) {
        next = updateLocation(next, here, (l) => ({ ...l, clues: l.clues + investigator.clues }))
      }
      for (const enemy of engagedEnemies(next, investigator.id)) {
        next = updateEnemy(next, enemy.id, (e) => ({ ...e, engagedWith: null }))
      }
      next = {
        ...next,
        assets: Object.fromEntries(
          Object.entries(next.assets).filter(([, a]) => a.owner !== investigator.id),
        ),
      }
      next = log(next, investigator.resigned ? 'log.resigned' : 'log.eliminated', {
        name: investigator.name,
      })
      next = updateInvestigator(next, investigator.id, (i) => ({
        ...i,
        eliminated: true,
        clues: 0,
        resources: 0,
        actionsRemaining: 0,
        location: null,
        deck: [],
        hand: [],
        discard: [],
      }))
      if (activeInvestigators(next).length === 0) {
        return push(next, { type: 'EndScenario', outcome: { type: 'noResolution' } })
      }
      return push(
        next,
        ...(here === null ? [] : [{ type: 'CheckEngagement', location: here } as const]),
        { type: 'CheckActObjective' },
      )
    }

    // ------------------------------------------------------ Prueba de habilidad
    case 'BeginSkillTest': {
      if (state.skillTest) throw new EngineError('Ya hay una prueba de habilidad en curso')
      return push(
        {
          ...state,
          skillTest: {
            investigator: message.investigator,
            skill: message.skill,
            difficulty: Math.max(0, message.difficulty),
            kind: message.kind,
            baseModifier: message.modifier ?? 0,
            ...(message.source ? { source: message.source } : {}),
            tags: message.tags ?? (message.kind.type === 'effect' ? ['scenario'] : []),
            committed: [],
            tokens: [],
            tokenModifier: 0,
            autoFail: false,
            tokenOnFail: [],
            tokenOnFailBy: [],
            modifiedSkill: null,
            succeeded: null,
          },
        },
        // Pendiente: que otros investigadores en la localización comprometan 1 carta.
        { type: 'CommitWindow' },
        { type: 'RevealChaosToken' },
        { type: 'AfterRevealWindow' },
        { type: 'ResolveSkillTest' },
        { type: 'EndSkillTest' },
      )
    }

    case 'RevealChaosToken': {
      // RR pasos 3 y 4: revelar ficha y resolver su símbolo. La ficha sale de la
      // bolsa hasta que termina la prueba (así "revela otra" no repite la misma).
      const test = state.skillTest
      if (!test) throw new EngineError('No hay prueba de habilidad')
      // Premonition: se resuelve la ficha sellada en lugar de sacar una.
      const [sealed, ...stillSealed] = message.token === undefined ? (state.sealed ?? []) : []
      // Mask of Silenus: se sacan dos fichas y se elige cuál resolver.
      if (
        !sealed &&
        message.token === undefined &&
        test.chooseToken &&
        state.chaosBag.length >= 2
      ) {
        const [first, rng1] = nextInt(state.rng, state.chaosBag.length)
        const rest = state.chaosBag.filter((_, n) => n !== first)
        const [second, rng2] = nextInt(rng1, rest.length)
        const a = state.chaosBag[first] as ChaosToken
        const b = rest[second] as ChaosToken
        const chooser = test.chooseToken
        const pick = (token: ChaosToken, ignored: ChaosToken): Choice => ({
          label: 'choice.resolveToken',
          params: { token: String(token) },
          then: [
            { type: 'RevealChaosToken', token, ignored },
            ...(typeof token === 'string'
              ? [{ type: 'TakeDamage', investigator: chooser, damage: 0, horror: 1 } as Message]
              : []),
          ],
        })
        return push(
          {
            ...state,
            rng: rng2,
            chaosBag: rest.filter((_, n) => n !== second),
            skillTest: (({ chooseToken: _used, ...rest }) => rest)(test),
          },
          {
            type: 'Ask',
            investigator: chooser,
            question: {
              kind: 'chooseOne',
              alwaysAsk: true,
              prompt: 'prompt.chooseToken',
              choices: [pick(a, b), pick(b, a)],
            },
          },
        )
      }
      const chosen = message.token !== undefined
      if (!sealed && !chosen && state.chaosBag.length === 0) return state
      const [index, rng] =
        sealed || chosen ? [-1, state.rng] : nextInt(state.rng, state.chaosBag.length)
      const token = message.token ?? (sealed ? sealed.token : (state.chaosBag[index] as ChaosToken))
      const effect = resolveToken(state, token, test.investigator)
      const source = test.source ? state.assets[test.source] : undefined
      const onReveal = source
        ? (playerCardBehavior(source.code)?.onTokenRevealed?.(state, token, source) ?? [])
        : []
      const unsealed: GameState = sealed
        ? updateInvestigator({ ...state, sealed: stillSealed }, sealed.investigator, (i) => ({
            ...i,
            discard: [...i.discard, sealed.code],
          }))
        : state
      const next: GameState = {
        ...unsealed,
        rng,
        chaosBag: sealed || chosen ? state.chaosBag : state.chaosBag.filter((_, n) => n !== index),
        skillTest: {
          ...test,
          ...(message.ignored !== undefined
            ? { ignoredTokens: [...(test.ignoredTokens ?? []), message.ignored] }
            : {}),
          tokens: [...test.tokens, token],
          tokenModifier: test.tokenModifier + effect.modifier,
          autoFail: test.autoFail || token === 'autoFail',
          tokenOnFail: [...test.tokenOnFail, ...(effect.onFail ?? [])],
          tokenOnFailBy: effect.onFailBy
            ? [...test.tokenOnFailBy, effect.onFailBy]
            : test.tokenOnFailBy,
          tokenOnSuccess: [...(test.tokenOnSuccess ?? []), ...(effect.onSuccess ?? [])],
          tokenAfter: [...(test.tokenAfter ?? []), ...(effect.after ?? [])],
        },
      }
      return push(
        next,
        ...(effect.immediate ?? []),
        ...onReveal,
        ...(effect.revealAnother ? [{ type: 'RevealChaosToken' } as const] : []),
      )
    }

    case 'ResolveSkillTest': {
      const test = state.skillTest
      if (!test || test.tokens.length === 0) throw new EngineError('Prueba sin ficha revelada')
      const investigator = getInvestigator(state, test.investigator)
      // RR "Skills and Skill Tests": la ficha de fallo automático deja el valor en 0.
      const modifiedSkill = test.forcedSuccess
        ? test.difficulty
        : test.autoFail
          ? 0
          : Math.max(0, skillTestValue(state).total + test.tokenModifier)
      const succeeded = !!test.forcedSuccess || (!test.autoFail && modifiedSkill >= test.difficulty)
      const next = log(
        { ...state, skillTest: { ...test, modifiedSkill, succeeded } },
        succeeded ? 'log.testSuccess' : 'log.testFailure',
        {
          name: investigator.name,
          skill: test.skill,
          value: modifiedSkill,
          difficulty: test.difficulty,
          tokens: test.tokens
            .map((t) => (typeof t === 'number' ? (t > 0 ? `+${t}` : `${t}`) : t))
            .join(' '),
        },
      )
      if (investigator.eliminated) return next
      const failBy = Math.max(0, test.difficulty - modifiedSkill)
      const tokenResults: Message[] = succeeded
        ? (test.tokenOnSuccess ?? [])
        : [
            ...test.tokenOnFail,
            ...test.tokenOnFailBy.filter((f) => failBy >= f.atLeast).flatMap((f) => f.then),
          ]
      const committedResults = test.committed.flatMap(
        (c) =>
          playerCardBehavior(c.code)?.afterCommittedTest?.(
            next,
            next.skillTest ?? test,
            succeeded,
            c.by,
          ) ?? [],
      )
      const results = [
        ...skillTestResults(next, succeeded, failBy),
        ...committedResults,
        ...tokenResults,
      ]
      // En la mesa, el jugador ve el resultado (paso 6) antes de aplicarlo (paso 7).
      if (state.interactive) {
        return push(next, {
          type: 'Ask',
          investigator: investigator.id,
          question: {
            kind: 'chooseOne',
            alwaysAsk: true,
            prompt: succeeded ? 'prompt.skillTestSucceeded' : 'prompt.skillTestFailed',
            choices: [{ label: 'choice.applyResults', then: results }],
          },
        })
      }
      return push(next, ...results)
    }

    case 'EndSkillTest': {
      // RR paso 8: las fichas reveladas vuelven a la bolsa.
      // Las cartas comprometidas van a la pila de descartes de su dueño.
      const test = state.skillTest
      const tokens = [...(test?.tokens ?? []), ...(test?.ignoredTokens ?? [])]
      let next: GameState = { ...state, skillTest: null, chaosBag: [...state.chaosBag, ...tokens] }
      const reshuffle: Message[] = []
      for (const c of test?.committed ?? []) {
        // Isabelle: la carta comprometida desde el descarte se baraja en el mazo.
        if (c.fromDiscard) {
          next = updateInvestigator(next, c.by, (i) =>
            i.eliminated ? i : { ...i, deck: [...i.deck, c.code] },
          )
          reshuffle.push({ type: 'ShuffleDeck', investigator: c.by })
          continue
        }
        next = updateInvestigator(next, c.by, (i) =>
          i.eliminated ? i : { ...i, discard: [...i.discard, c.code] },
        )
      }
      if (!test || test.succeeded === null) return push(next, ...reshuffle)
      return push(next, ...reshuffle, ...(test.tokenAfter ?? []), {
        type: 'Forced',
        trigger: {
          type: 'afterSkillTest',
          investigator: test.investigator,
          kind: test.kind.type,
          succeeded: test.succeeded,
          margin: (test.modifiedSkill ?? 0) - test.difficulty,
          ...(test.kind.type === 'fight' || test.kind.type === 'evade'
            ? { enemy: test.kind.enemy }
            : {}),
          ...(test.kind.type === 'investigate' ? { location: test.kind.location } : {}),
          ...(test.source ? { source: test.source } : {}),
        },
      })
    }

    // --------------------------------------------------------------- Enemigos
    case 'EngageEnemy': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.location === null || !findEnemy(state, message.enemy)) return state
      return push(
        updateEnemy(state, message.enemy, (e) => ({
          ...e,
          engagedWith: investigator.id,
          location: investigator.location as string,
        })),
        {
          type: 'Forced',
          trigger: { type: 'afterEngage', investigator: investigator.id, enemy: message.enemy },
        },
      )
    }

    case 'CheckEngagement': {
      // RR "Enemy Engagement": un enemigo preparado y no enfrentado se enfrenta
      // a un investigador de su localización. Con presa, el que mejor la cumpla;
      // si no (o empate), decide el jefe: aquí, el primero en orden de jugadores.
      const candidates = investigatorsAt(state, message.location)
      if (candidates.length === 0) return state
      let next = state
      const engaged: Message[] = []
      for (const enemy of enemiesAt(state, message.location)) {
        if (enemy.exhausted || enemy.engagedWith !== null || enemy.keywords.includes('aloof')) {
          continue
        }
        const target = preferredByPrey(candidates, enemy.prey)
        if (!target) continue
        next = updateEnemy(next, enemy.id, (e) => ({ ...e, engagedWith: target.id }))
        engaged.push({
          type: 'Forced',
          trigger: { type: 'afterEngage', investigator: target.id, enemy: enemy.id },
        })
      }
      return push(next, ...engaged)
    }

    case 'EnemyAttack': {
      const enemy = findEnemy(state, message.enemy)
      const investigator = getInvestigator(state, message.investigator)
      if (!enemy || enemy.exhausted || investigator.eliminated) return state
      const attacked: GameState = {
        ...state,
        enemyAttacks: [
          ...(state.enemyAttacks ?? []).filter((a) => a.round === state.round),
          { enemy: enemy.id, investigator: investigator.id, round: state.round },
        ],
      }
      const next = message.exhaustAfter
        ? updateEnemy(attacked, enemy.id, (e) => ({ ...e, exhausted: true }))
        : attacked
      // Solo los ataques de la fase de enemigos agotan al atacante.
      const after: Message[] = message.exhaustAfter
        ? [
            {
              type: 'Forced',
              trigger: {
                type: 'afterEnemyPhaseAttack',
                enemy: enemy.id,
                investigator: investigator.id,
              },
            },
          ]
        : []
      return push(
        next,
        // Ventana para cancelar el ataque antes de resolverlo (Counterattack).
        {
          type: 'Reactions',
          trigger: { type: 'whenEnemyAttacks', enemy: enemy.id, investigator: investigator.id },
        },
        {
          type: 'ResolveEnemyAttack',
          enemy: enemy.id,
          investigator: investigator.id,
          exhaustAfter: message.exhaustAfter,
        },
        ...after,
      )
    }

    case 'RevealExtraToken':
      return state.skillTest
        ? { ...state, skillTest: { ...state.skillTest, chooseToken: message.investigator } }
        : state

    case 'ForceSkillTestSuccess':
      return state.skillTest
        ? { ...state, skillTest: { ...state.skillTest, forcedSuccess: true } }
        : state

    case 'ReturnCommittedToHand': {
      const test = state.skillTest
      if (!test) return state
      const back = test.committed.filter((c) => c.code !== message.except && !c.fromDiscard)
      let next: GameState = {
        ...state,
        skillTest: { ...test, committed: test.committed.filter((c) => !back.includes(c)) },
      }
      for (const c of back) {
        next = updateInvestigator(next, c.by, (i) => ({ ...i, hand: [...i.hand, c.code] }))
      }
      return next
    }

    case 'IfSymbolRevealed':
      return state.skillTest?.tokens.some((t) => typeof t === 'string')
        ? push(state, ...message.then)
        : state

    case 'IfEnemyDefeated':
      return state.enemies[message.enemy] ? state : push(state, ...message.then)

    case 'ChooseFromTop': {
      const investigator = getInvestigator(state, message.investigator)
      const top = investigator.deck.slice(0, message.top)
      if (message.picks <= 0 || top.length === 0) {
        // El resto de las cartas miradas va al fondo del mazo.
        return updateInvestigator(state, investigator.id, (i) => ({
          ...i,
          deck: [...i.deck.slice(top.length), ...top],
        }))
      }
      return push(state, {
        type: 'Ask',
        investigator: investigator.id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.searchToHand',
          choices: [...new Set(top)].map((code): Choice => ({
            label: 'choice.takeCard',
            params: { card: playerCardDef(code)?.name ?? code },
            then: [
              { type: 'TakeFromDeck', investigator: investigator.id, code, to: 'hand' },
              {
                type: 'ChooseFromTop',
                investigator: investigator.id,
                top: top.length - 1,
                picks: message.picks - 1,
              },
            ],
          })),
        },
      })
    }

    case 'PlaceDoomOnEnemy':
      return push(
        updateEnemy(state, message.enemy, (e) => ({ ...e, doom: (e.doom ?? 0) + message.amount })),
        { type: 'CheckAgenda' },
      )

    case 'AddLead':
      return updateEnemy(state, message.enemy, (e) => ({ ...e, leads: (e.leads ?? 0) + 1 }))

    case 'PlaceUnderAct': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      return log(
        { ...removeEnemy(state, enemy.id), underAct: [...(state.underAct ?? []), enemy.code] },
        'log.underAct',
        { enemy: enemy.name },
      )
    }

    case 'DrawBeneath': {
      const location = state.locations[message.location]
      const [card, ...rest] = location?.beneath ?? []
      if (!location || !card) return state
      return push(
        updateLocation(state, location.id, (l) => ({ ...l, beneath: rest })),
        { type: 'ResolveEncounterCard', investigator: message.investigator, card },
      )
    }

    case 'ElusiveRetreat': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      const connections = getLocation(state, enemy.location).connections.filter(
        (l) => state.locations[l],
      )
      const empty = connections.filter((l) => investigatorsAt(state, l).length === 0)
      const options = empty.length ? empty : connections
      const [to] = options
      const exhausted = updateEnemy(state, enemy.id, (e) => ({
        ...e,
        engagedWith: null,
        exhausted: message.exhaust === false ? e.exhausted : true,
      }))
      if (options.length <= 1) {
        return to
          ? push(exhausted, { type: 'MoveEnemy', enemy: enemy.id, location: to })
          : exhausted
      }
      // Varias opciones: decide el investigador jefe.
      const lead = leadInvestigator(state)
      if (!lead) return exhausted
      return push(exhausted, {
        type: 'Ask',
        investigator: lead.id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEnemyDestination',
          choices: options.map((l): Choice => ({
            label: 'choice.location',
            params: { location: getLocation(state, l).name },
            target: { type: 'location', id: l },
            then: [{ type: 'MoveEnemy', enemy: enemy.id, location: l }],
          })),
        },
      })
    }

    case 'HuntOnce': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy || enemy.location === message.toward) return state
      const step = nextStepToward(state, enemy.location, (l) => l === message.toward)
      if (step === null) return state
      return push(
        state,
        { type: 'MoveEnemy', enemy: enemy.id, location: step },
        { type: 'CheckEngagement', location: step },
        { type: 'AttackIfEngaged', enemy: enemy.id },
      )
    }

    case 'AttackIfEngaged': {
      const enemy = findEnemy(state, message.enemy)
      return enemy?.engagedWith
        ? push(state, {
            type: 'EnemyAttack',
            enemy: enemy.id,
            investigator: enemy.engagedWith,
            exhaustAfter: false,
          })
        : state
    }

    case 'IfEnemyLeads': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      return (enemy.leads ?? 0) >= message.atLeast
        ? push(state, ...message.then)
        : push(state, ...(message.otherwise ?? []))
    }

    case 'DiscardTopEncounter': {
      const [top, ...rest] = state.encounterDeck
      if (!top) return state
      return { ...state, encounterDeck: rest, encounterDiscard: [...state.encounterDiscard, top] }
    }

    case 'GainClues':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        clues: i.clues + message.amount,
      }))

    case 'VictoryToUnderAct': {
      const index = state.victoryDisplay.lastIndexOf(message.code)
      if (index < 0) return state
      return {
        ...state,
        victoryDisplay: state.victoryDisplay.filter((_, n) => n !== index),
        victoryPoints: (state.victoryPoints ?? 0) - message.victory,
        underAct: [...(state.underAct ?? []), message.code],
      }
    }

    case 'AddUses': {
      const asset = state.assets[message.asset]
      if (!asset) return state
      return {
        ...state,
        assets: { ...state.assets, [asset.id]: { ...asset, uses: asset.uses + message.amount } },
      }
    }

    case 'LoseActions':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        actionsRemaining: Math.max(0, i.actionsRemaining - message.amount),
      }))

    case 'ChooseEnemyToDamage': {
      const here = getInvestigator(state, message.investigator).location
      const enemies = here === null ? [] : enemiesAt(state, here)
      if (enemies.length === 0) return state
      return push(state, {
        type: 'Ask',
        investigator: message.investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEnemy',
          choices: enemies.map((e): Choice => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [
              {
                type: 'DamageEnemy',
                enemy: e.id,
                amount: message.amount,
                by: message.investigator,
              },
            ],
          })),
        },
      })
    }

    case 'CancelEnemyAttack':
      return { ...state, canceledAttack: message.enemy }

    case 'ResolveEnemyAttack': {
      if (state.canceledAttack === message.enemy) return { ...state, canceledAttack: null }
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      const elusive: Message[] = enemy.keywords.includes('elusive')
        ? [{ type: 'ElusiveRetreat', enemy: enemy.id }]
        : []
      return push(
        state,
        {
          type: 'TakeDamage',
          investigator: message.investigator,
          damage: enemy.damage,
          horror: enemy.horror,
        },
        {
          type: 'Forced',
          trigger: {
            type: 'afterEnemyAttack',
            enemy: enemy.id,
            investigator: message.investigator,
          },
        },
        // Esquivo: una vez resuelto el ataque.
        ...elusive,
      )
    }

    case 'DamageEnemy': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      const damageTaken = enemy.damageTaken + message.amount
      const next = updateEnemy(state, enemy.id, (e) => ({ ...e, damageTaken }))
      const by = message.by
      const dealt: Message[] = by
        ? [
            {
              type: 'Forced',
              trigger: { type: 'afterDealDamage', investigator: by, enemy: enemy.id },
            },
          ]
        : []
      return damageTaken >= enemy.maxHealth
        ? push(next, ...dealt, { type: 'DefeatEnemy', enemy: enemy.id, ...(by ? { by } : {}) })
        : push(next, ...dealt)
    }

    case 'DefeatEnemy': {
      const enemy = getEnemy(state, message.enemy)
      const removed = log(removeEnemy(state, enemy.id), 'log.enemyDefeated', { enemy: enemy.name })
      const next = enemy.owner
        ? toOwnerDiscard(removed, enemy.owner, enemy.code)
        : enemy.victory !== undefined
          ? {
              ...removed,
              victoryDisplay: [...removed.victoryDisplay, enemy.code],
              victoryPoints: (removed.victoryPoints ?? 0) + enemy.victory,
            }
          : { ...removed, encounterDiscard: [...removed.encounterDiscard, enemyCard(enemy)] }
      // RR "Doomed": al ser derrotado (no descartado), 1 perdición en el plan.
      const doomed: Message[] = enemy.keywords.includes('doomed')
        ? [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }]
        : []
      const trigger: Trigger = {
        type: 'enemyDefeated',
        enemy,
        ...(message.by ? { by: message.by } : {}),
      }
      return push(next, { type: 'Forced', trigger }, ...doomed, {
        type: 'CheckActObjective',
      })
    }

    case 'EvadeEnemy': {
      if (!findEnemy(state, message.enemy)) return state
      const evaded = updateEnemy(state, message.enemy, (e) => ({
        ...e,
        engagedWith: null,
        exhausted: true,
      }))
      return message.by
        ? push(evaded, {
            type: 'Forced',
            trigger: { type: 'afterEvade', investigator: message.by, enemy: message.enemy },
          })
        : evaded
    }

    case 'ReadyEnemy':
      if (!findEnemy(state, message.enemy)) return state
      return updateEnemy(state, message.enemy, (e) => ({ ...e, exhausted: false }))

    case 'EnemyPhase':
      return push(
        log({ ...state, phase: 'enemy' }, 'log.phase', { phase: 'enemy' }),
        { type: 'HuntersMove' },
        { type: 'EnemiesAttack' },
      )

    case 'HuntersMove': {
      // RR "Hunter": cada enemigo preparado y no enfrentado con cazador se mueve
      // una vez por el camino más corto hacia el investigador más cercano.
      const occupied = (location: string) => investigatorsAt(state, location).length > 0
      let next = state
      const destinations = new Set<string>()
      const entered: Message[] = []
      for (const enemy of Object.values(state.enemies)) {
        if (enemy.exhausted || enemy.engagedWith !== null || !enemy.keywords.includes('hunter')) {
          continue
        }
        const step = nextStepToward(state, enemy.location, occupied)
        if (step === null) continue
        next = updateEnemy(next, enemy.id, (e) => ({ ...e, location: step }))
        destinations.add(step)
        entered.push({
          type: 'Forced',
          trigger: { type: 'enemyEntersLocation', enemy: enemy.id, location: step },
        })
      }
      return push(
        next,
        ...[...destinations].map((location): Message => ({ type: 'CheckEngagement', location })),
        ...entered,
      )
    }

    case 'EnemiesAttack':
      // RR "The Enemy Phase": en orden de jugadores; cada enemigo se agota tras atacar.
      return push(
        state,
        ...activeInvestigators(state).flatMap((i) =>
          engagedEnemies(state, i.id)
            .filter((e) => !e.exhausted)
            .map((e): Message => ({
              type: 'EnemyAttack',
              enemy: e.id,
              investigator: i.id,
              exhaustAfter: true,
            })),
        ),
      )

    // -------------------------------------------------------- Mantenimiento
    case 'UpkeepPhase':
      return push(
        log({ ...state, phase: 'upkeep' }, 'log.phase', { phase: 'upkeep' }),
        { type: 'ReadyAll' },
        ...activeInvestigators(state).flatMap((i): Message[] => [
          { type: 'DrawCards', investigator: i.id, amount: 1 },
          { type: 'GainResources', investigator: i.id, amount: 1 },
        ]),
        ...activeInvestigators(state).map((i): Message => ({
          type: 'CheckHandSize',
          investigator: i.id,
        })),
      )

    case 'ReadyAll': {
      // Slippery: el enemigo marcado no se prepara esta vez.
      const enemies = Object.fromEntries(
        Object.entries(state.enemies).map(([id, e]) => {
          if (!e.stayExhausted) return [id, { ...e, exhausted: false }]
          const { stayExhausted: _skip, ...rest } = e
          return [id, rest]
        }),
      )
      const assets = Object.fromEntries(
        Object.entries(state.assets).map(([id, a]) => [id, { ...a, exhausted: false }]),
      )
      const occupied = [
        ...new Set(activeInvestigators(state).flatMap((i) => (i.location ? [i.location] : []))),
      ]
      return push(
        { ...state, enemies, assets },
        ...occupied.map((location): Message => ({ type: 'CheckEngagement', location })),
      )
    }

    case 'EndOfRound': {
      state = clearRoundModifiers(state)
      const act = state.acts[state.actIndex]
      return act?.advanceTiming === 'endOfRound'
        ? push(state, { type: 'OfferActAdvance' })
        : push(state, { type: 'CheckActObjective' })
    }

    case 'CheckActObjective':
      return actObjectiveMet(state) ? push(state, { type: 'AdvanceAct' }) : state

    // ------------------------------------------------------------ Acto
    case 'OfferActAdvance': {
      const lead = leadInvestigator(state)
      const act = state.acts[state.actIndex]
      if (!lead || !act || !canAdvanceAct(state)) return state
      return push(state, {
        type: 'Ask',
        investigator: lead.id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.advanceAct',
          choices: [
            {
              label: 'action.advanceAct',
              params: { act: act.name, clues: cluesToAdvanceAct(state) ?? 0 },
              then: [{ type: 'AdvanceAct' }],
            },
            { label: 'choice.notNow', then: [] },
          ],
        },
      })
    }

    case 'AdvanceAct': {
      const act = state.acts[state.actIndex]
      if (!act) return state
      let next = state
      let required = cluesToAdvanceAct(state)
      if (required !== null) {
        if (!canAdvanceAct(state)) throw new EngineError('No se puede avanzar el acto')
        // Pendiente: que el grupo elija cuántas pistas aporta cada uno. Ahora, en orden de jugadores.
        for (const investigator of actContributors(state)) {
          const spent = Math.min(required, investigator.clues)
          required -= spent
          next = updateInvestigator(next, investigator.id, (i) => ({
            ...i,
            clues: i.clues - spent,
          }))
        }
      }
      const onAdvance = actBehavior(act.code)?.onAdvance?.(next) ?? []
      return push(log(next, 'log.actAdvanced', { name: act.name }), ...onAdvance, {
        type: 'ActAdvanced',
      })
    }

    case 'ActAdvanced': {
      const actIndex = state.actIndex + 1
      if (actIndex >= state.acts.length) {
        return push(state, { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } })
      }
      return { ...state, actIndex }
    }

    // ------------------------------------------------------- Habilidades
    case 'UseAbility': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.actionsRemaining < message.actions)
        throw new EngineError('No quedan acciones')
      const paid = updateInvestigator(
        {
          ...state,
          abilityUses: [
            ...state.abilityUses,
            { key: message.key, investigator: investigator.id, round: state.round },
          ],
        },
        investigator.id,
        (i) => ({ ...i, actionsRemaining: i.actionsRemaining - message.actions }),
      )
      // Una habilidad de acción provoca ataques de oportunidad (una vez), salvo parlamento/retirarse.
      const attacks: Message[] =
        message.actions > 0 && message.provokes
          ? engagedEnemies(state, investigator.id)
              .filter((e) => !e.exhausted)
              .map((e) => ({
                type: 'EnemyAttack',
                enemy: e.id,
                investigator: investigator.id,
                exhaustAfter: false,
              }))
          : []
      return push(paid, ...attacks, ...message.then)
    }

    // ------------------------------------------------ Efectos de escenario
    case 'DiscardEnemy': {
      // Descartar no es derrotar: no activa condenado ni "al ser derrotado".
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      if (enemy.owner) return toOwnerDiscard(removeEnemy(state, enemy.id), enemy.owner, enemy.code)
      return {
        ...removeEnemy(state, enemy.id),
        encounterDiscard: [...state.encounterDiscard, enemyCard(enemy)],
      }
    }

    case 'MoveEnemy':
      if (!findEnemy(state, message.enemy) || !state.locations[message.location]) return state
      return push(
        updateEnemy(state, message.enemy, (e) => ({
          ...e,
          location: message.location,
          engagedWith: null,
        })),
        { type: 'CheckEngagement', location: message.location },
        {
          type: 'Forced',
          trigger: {
            type: 'enemyEntersLocation',
            enemy: message.enemy,
            location: message.location,
          },
        },
      )

    case 'PutLocationIntoPlay': {
      const card = state.setAsideLocations[message.location]
      if (!card || state.locations[message.location]) return state
      const { [message.location]: _taken, ...setAsideLocations } = state.setAsideLocations
      return {
        ...state,
        setAsideLocations,
        locations: {
          ...state.locations,
          [card.id]: { ...card, connections: [...card.connections], revealed: false, clues: 0 },
        },
      }
    }

    case 'RemoveLocation': {
      // Se descartan sus fichas y vinculadas, y sale del juego.
      if (!state.locations[message.location]) return state
      let next = state
      for (const t of Object.values(state.treacheries)) {
        if (t.placement.type === 'location' && t.placement.location === message.location) {
          next = discardTreachery(next, t.id)
        }
      }
      const { [message.location]: _removed, ...locations } = next.locations
      return { ...next, locations }
    }

    case 'PlaceCluesOnLocationFromPool':
      if (!state.locations[message.location]) return state
      return updateLocation(state, message.location, (l) => ({
        ...l,
        clues: l.clues + message.amount,
      }))

    case 'SpawnSetAsideEnemy': {
      const index = state.setAside.findIndex((c) => c.code === message.code)
      const card = state.setAside[index]
      if (!card || card.kind !== 'enemy' || !state.locations[message.location]) return state
      return push(
        { ...state, setAside: state.setAside.filter((_, n) => n !== index) },
        { type: 'SpawnEnemy', card, location: message.location, engageWith: null },
      )
    }

    case 'SetAsideEnemy': {
      // Busca en juego y en las zonas fuera de juego; se aparta curado.
      const inPlay = Object.values(state.enemies).find((e) => e.code === message.code)
      if (inPlay) {
        return {
          ...removeEnemy(state, inPlay.id),
          setAside: [...state.setAside, enemyCard(inPlay)],
        }
      }
      const index = state.encounterDiscard.findIndex((c) => c.code === message.code)
      const card = state.encounterDiscard[index]
      if (!card) return state
      return {
        ...state,
        encounterDiscard: state.encounterDiscard.filter((_, n) => n !== index),
        setAside: [...state.setAside, card],
      }
    }

    case 'PlaceSetAsideTreachery': {
      const index = state.setAside.findIndex((c) => c.code === message.code)
      const card = state.setAside[index]
      if (!card || card.kind !== 'treachery') return state
      const [id, next] = newId(
        { ...state, setAside: state.setAside.filter((_, n) => n !== index) },
        'treachery-',
      )
      return {
        ...next,
        treacheries: {
          ...next.treacheries,
          [id]: { ...card, keywords: [...card.keywords], id, placement: message.placement },
        },
      }
    }

    case 'MoveSetAsideToEncounterDiscard': {
      const limit = message.count ?? Infinity
      const moved: EncounterCard[] = []
      const setAside = state.setAside.filter((c) => {
        if (c.code !== message.code || moved.length >= limit) return true
        moved.push(c)
        return false
      })
      return { ...state, setAside, encounterDiscard: [...state.encounterDiscard, ...moved] }
    }

    case 'SpendGroupClues': {
      // Pendiente: que el grupo elija quién paga. Ahora, en orden de jugadores.
      let remaining = message.amount
      let next = state
      for (const investigator of activeInvestigators(state)) {
        const spent = Math.min(remaining, investigator.clues)
        remaining -= spent
        next = updateInvestigator(next, investigator.id, (i) => ({ ...i, clues: i.clues - spent }))
      }
      return next
    }

    case 'ChooseDiscardFromHand': {
      const investigator = getInvestigator(state, message.investigator)
      if (message.amount <= 0 || investigator.hand.length === 0) return state
      return push(state, {
        type: 'Ask',
        investigator: investigator.id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseCardToDiscard',
          choices: [...new Set(investigator.hand)].map((card): Choice => ({
            label: 'choice.discard',
            params: { card },
            then: [
              { type: 'DiscardFromHand', investigator: investigator.id, card },
              { ...message, amount: message.amount - 1 },
            ],
          })),
        },
      })
    }

    case 'SearchAndDrawEncounter': {
      let deck = state.encounterDeck
      let discard = state.encounterDiscard
      const found: EncounterCard[] = []
      for (let n = 0; n < message.amount; n++) {
        const fromDeck = deck.findIndex((c) => c.code === message.code)
        if (fromDeck >= 0) {
          found.push(deck[fromDeck] as EncounterCard)
          deck = deck.filter((_, i) => i !== fromDeck)
          continue
        }
        const fromDiscard = discard.findIndex((c) => c.code === message.code)
        if (fromDiscard < 0) break
        found.push(discard[fromDiscard] as EncounterCard)
        discard = discard.filter((_, i) => i !== fromDiscard)
      }
      // Se baraja el mazo de encuentros porque se ha buscado en él.
      const [shuffled, rng] = shuffle(deck, state.rng)
      return push(
        { ...state, rng, encounterDeck: shuffled, encounterDiscard: discard },
        ...found.map((card): Message => ({
          type: 'ResolveEncounterCard',
          investigator: message.investigator,
          card,
        })),
      )
    }

    case 'Heal':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        damage: Math.max(0, i.damage - message.damage),
        horror: Math.max(0, i.horror - message.horror),
      }))

    // ------------------------------------------------------------ Varios
    case 'EndScenario': {
      const told = state.interactive && !message.told
      const story = told
        ? scenarioBehavior(state.scenarioId)?.resolution?.(state, message.outcome)
        : undefined
      // Primero los textos de resolución; el escenario ya no sigue.
      if (story?.length) return push({ ...state, queue: [], pending: null }, ...story)
      return log({ ...state, outcome: message.outcome, queue: [], pending: null }, 'log.end', {
        outcome: message.outcome.type === 'resolution' ? `R${message.outcome.resolution}` : '—',
      })
    }

    // ------------------------------------------------- Cartas de jugador
    case 'Reactions': {
      // Cada investigador con reacciones posibles elige una o pasa; después se
      // vuelve a abrir la ventana sin las ya usadas, hasta que nadie quiera más.
      const used = message.used ?? []
      const passed = message.passed ?? []
      const options = reactionOptions(state, message.trigger).filter(
        (o) =>
          !used.includes(o.key) &&
          !passed.includes(o.investigator) &&
          withinLimit(state, o.key, o.investigator, o.limit),
      )
      const [first] = options
      if (!first) return state
      const who = first.investigator
      const again = (u: string[], p: string[]): Message => ({
        type: 'Reactions',
        trigger: message.trigger,
        used: u,
        passed: p,
      })
      return push(state, {
        type: 'Ask',
        investigator: who,
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.reaction',
          choices: [
            ...options
              .filter((o) => o.investigator === who)
              .map((o): Choice => ({
                label: o.label,
                ...(o.params ? { params: o.params } : {}),
                ...(o.target ? { target: o.target } : {}),
                then: [
                  {
                    type: 'UseAbility',
                    investigator: who,
                    key: o.key,
                    actions: 0,
                    provokes: false,
                    ...(o.limit ? { limit: o.limit } : {}),
                    then: o.then,
                  },
                  again([...used, o.key], passed),
                ],
              })),
            { label: 'choice.skip', then: [again(used, [...passed, who])] },
          ],
        },
      })
    }

    case 'SpendResources': {
      const investigator = getInvestigator(state, message.investigator)
      const amount = Math.min(message.amount, investigator.resources)
      if (amount <= 0) return state
      return push(
        updateInvestigator(state, investigator.id, (i) => ({
          ...i,
          resources: i.resources - amount,
        })),
        {
          type: 'Forced',
          trigger: { type: 'afterSpendResources', investigator: investigator.id, amount },
        },
      )
    }

    case 'BoostSkillTest':
      if (!state.skillTest) return state
      return {
        ...state,
        skillTest: {
          ...state.skillTest,
          baseModifier: state.skillTest.baseModifier + message.amount,
        },
      }

    case 'CommitFromDiscard': {
      const test = state.skillTest
      const investigator = getInvestigator(state, message.investigator)
      const index = investigator.discard.lastIndexOf(message.code)
      if (!test || index < 0) return state
      return {
        ...updateInvestigator(state, investigator.id, (i) => ({
          ...i,
          discard: i.discard.filter((_, n) => n !== index),
        })),
        skillTest: {
          ...test,
          committed: [
            ...test.committed,
            { code: message.code, by: investigator.id, fromDiscard: true },
          ],
        },
      }
    }

    case 'AfterRevealWindow': {
      // Cartas que pueden comprometerse después de revelar las fichas.
      const test = state.skillTest
      if (!test) return state
      const investigator = getInvestigator(state, test.investigator)
      const late = [...new Set(investigator.hand)].filter(
        (code) => playerCardBehavior(code)?.commitAfterReveal && canCommit(test, code),
      )
      // Va a fallar, y no por la ficha de fallo automático.
      const failing =
        !test.autoFail &&
        !test.forcedSuccess &&
        skillTestValue(state).total + test.tokenModifier < test.difficulty
      const saves = failing
        ? [...new Set(investigator.hand)].filter(
            (code) =>
              playerCardBehavior(code)?.playWhenFailing &&
              (playerCardDef(code)?.cost ?? 0) <= investigator.resources,
          )
        : []
      if (late.length === 0 && saves.length === 0) return state
      return push(state, {
        type: 'Ask',
        investigator: investigator.id,
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.commitAfterReveal',
          choices: [
            ...late.map((code): Choice => ({
              label: 'choice.commit',
              params: {
                card: playerCardDef(code)?.name ?? code,
                icons: matchingIcons(playerCardDef(code)?.icons, test.skill),
              },
              target: { type: 'hand', code },
              then: [{ type: 'CommitCard', investigator: investigator.id, code }],
            })),
            ...saves.map((code): Choice => ({
              label: 'ability.playCard',
              params: { card: playerCardDef(code)?.name ?? code },
              target: { type: 'hand', code },
              then: [{ type: 'PlayCard', investigator: investigator.id, code }],
            })),
            { label: 'choice.skip', then: [] },
          ],
        },
      })
    }

    case 'CancelRevelation': {
      const treachery = state.treacheries[message.treachery]
      if (!treachery) return state
      return {
        ...state,
        treacheries: { ...state.treacheries, [treachery.id]: { ...treachery, canceled: true } },
      }
    }

    case 'PlaceDoomOnInvestigator':
      return push(
        updateInvestigator(state, message.investigator, (i) => ({
          ...i,
          doom: (i.doom ?? 0) + message.amount,
        })),
        { type: 'CheckAgenda' },
      )

    case 'HealAsset': {
      const asset = state.assets[message.asset]
      if (!asset) return state
      return {
        ...state,
        assets: {
          ...state.assets,
          [asset.id]: {
            ...asset,
            damage: Math.max(0, asset.damage - message.damage),
            horror: Math.max(0, asset.horror - message.horror),
          },
        },
      }
    }

    case 'ReturnAssetToHand': {
      const asset = state.assets[message.asset]
      if (!asset) return state
      const { [asset.id]: _gone, ...assets } = state.assets
      return updateInvestigator({ ...state, assets }, asset.owner, (i) => ({
        ...i,
        hand: [...i.hand, asset.code],
      }))
    }

    case 'DiscardToHand':
      return updateInvestigator(state, message.investigator, (i) => {
        const index = i.discard.lastIndexOf(message.code)
        if (index < 0) return i
        return {
          ...i,
          discard: i.discard.filter((_, n) => n !== index),
          hand: [...i.hand, message.code],
        }
      })

    case 'SearchDeck': {
      const investigator = getInvestigator(state, message.investigator)
      const searched =
        message.top === undefined ? investigator.deck : investigator.deck.slice(0, message.top)
      const shuffleDeck: Message = { type: 'ShuffleDeck', investigator: investigator.id }
      // Dead Ends: si está entre las cartas buscadas, se roba y se cancela la búsqueda.
      const deadEnd = searched.find((code) => playerCardBehavior(code)?.cancelsSearch)
      if (deadEnd) {
        const index = investigator.deck.indexOf(deadEnd)
        return push(
          log(
            updateInvestigator(state, investigator.id, (i) => ({
              ...i,
              deck: i.deck.filter((_, n) => n !== index),
              hand: [...i.hand, deadEnd],
            })),
            'log.searchCanceled',
            { name: investigator.name, card: playerCardDef(deadEnd)?.name ?? deadEnd },
          ),
          shuffleDeck,
        )
      }
      // Mysterious Grimoire: las debilidades entre las cartas buscadas también se roban.
      const weaknesses = message.drawWeaknesses
        ? searched.filter((code) => playerCardDef(code)?.weakness)
        : []
      if (weaknesses.length) {
        const drawn = updateInvestigator(state, investigator.id, (i) => {
          const deck = [...i.deck]
          for (const w of weaknesses) deck.splice(deck.indexOf(w), 1)
          return { ...i, deck, hand: [...i.hand, ...weaknesses] }
        })
        return push(drawn, {
          ...message,
          drawWeaknesses: false,
          top: (message.top ?? 0) - weaknesses.length,
        })
      }
      const matches = [...new Set(searched)].filter((code) => {
        const def = playerCardDef(code)
        if (message.anyCard) return !!def && !def.weakness
        if (!def || def.type !== 'asset') return false
        if (!def.traits.some((t) => message.traits.includes(t))) return false
        if (message.to === 'play') {
          const cost = Math.max(0, (def.cost ?? 0) - (message.discount ?? 0))
          if (cost > investigator.resources || assetsBlocked(state, investigator.id)) return false
        }
        return true
      })
      if (matches.length === 0) {
        return push(
          state,
          shuffleDeck,
          ...(message.orDraw
            ? [
                {
                  type: 'DrawCards',
                  investigator: investigator.id,
                  amount: message.orDraw,
                } as Message,
              ]
            : []),
        )
      }
      return push(state, {
        type: 'Ask',
        investigator: investigator.id,
        question: {
          kind: 'chooseOne',
          prompt: message.to === 'play' ? 'prompt.searchToPlay' : 'prompt.searchToHand',
          choices: matches.map((code): Choice => ({
            label: 'choice.takeCard',
            params: { card: playerCardDef(code)?.name ?? code },
            then: [
              {
                type: 'TakeFromDeck',
                investigator: investigator.id,
                code,
                to: message.to,
                ...(message.discount ? { discount: message.discount } : {}),
              },
              shuffleDeck,
            ],
          })),
        },
      })
    }

    case 'TakeFromDeck': {
      const investigator = getInvestigator(state, message.investigator)
      const index = investigator.deck.indexOf(message.code)
      if (index < 0) return state
      const taken = updateInvestigator(state, investigator.id, (i) => ({
        ...i,
        deck: i.deck.filter((_, n) => n !== index),
        hand: [...i.hand, message.code],
      }))
      if (message.to === 'hand') return taken
      return push(taken, {
        type: 'PlayCard',
        investigator: investigator.id,
        code: message.code,
        ...(message.discount ? { discount: message.discount } : {}),
      })
    }

    case 'ShuffleDeck': {
      const investigator = getInvestigator(state, message.investigator)
      const [deck, rng] = shuffle(investigator.deck, state.rng)
      return updateInvestigator({ ...state, rng }, investigator.id, (i) => ({ ...i, deck }))
    }

    case 'SearchEncounterForEnemy': {
      // Paint the Town Red: el primer enemigo no Élite de las primeras cartas.
      const top = state.encounterDeck.slice(0, message.top)
      const index = top.findIndex((c) => c.kind === 'enemy' && !(c.traits ?? []).includes('Elite'))
      const card = state.encounterDeck[index]
      const rest =
        index < 0 ? state.encounterDeck : state.encounterDeck.filter((_, n) => n !== index)
      const [encounterDeck, rng] = shuffle(rest, state.rng)
      const next = { ...state, encounterDeck, rng }
      if (!card || card.kind !== 'enemy') return next
      return push(
        next,
        { type: 'GainResources', investigator: message.investigator, amount: card.health },
        { type: 'ResolveEncounterCard', investigator: message.investigator, card },
      )
    }

    case 'DisengageAll': {
      let next = state
      for (const enemy of engagedEnemies(state, message.investigator)) {
        next = updateEnemy(next, enemy.id, (e) => ({ ...e, engagedWith: null }))
      }
      return next
    }

    case 'ChooseMove': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.location === null) return state
      const options = withinConnections(state, investigator.location, message.range ?? 1).filter(
        (to) => state.locations[to] && (!message.revealedOnly || state.locations[to]?.revealed),
      )
      if (options.length === 0) return state
      return push(state, {
        type: 'Ask',
        investigator: investigator.id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseMove',
          choices: [
            ...options.map((to): Choice => ({
              label: 'action.move',
              params: { location: getLocation(state, to).name },
              target: { type: 'location', id: to },
              then: [{ type: 'MoveTo', investigator: investigator.id, location: to }],
            })),
            { label: 'choice.skip', then: [] },
          ],
        },
      })
    }

    case 'AtEndOfTurn':
      return {
        ...state,
        endOfTurn: [
          ...(state.endOfTurn ?? []),
          { investigator: message.investigator, then: message.then },
        ],
      }

    case 'SealToken': {
      // Premonition: entra en juego con una ficha al azar sellada encima.
      if (state.chaosBag.length === 0) return state
      const [index, rng] = nextInt(state.rng, state.chaosBag.length)
      const token = state.chaosBag[index] as ChaosToken
      const next = updateInvestigator(
        {
          ...state,
          rng,
          chaosBag: state.chaosBag.filter((_, n) => n !== index),
          sealed: [
            ...(state.sealed ?? []),
            { token, investigator: message.investigator, code: message.code },
          ],
        },
        message.investigator,
        (i) => {
          const at = i.discard.lastIndexOf(message.code)
          return at < 0 ? i : { ...i, discard: i.discard.filter((_, n) => n !== at) }
        },
      )
      return log(next, 'log.sealed', {
        name: getInvestigator(state, message.investigator).name,
        token: typeof token === 'number' ? (token > 0 ? `+${token}` : `${token}`) : token,
      })
    }

    case 'AddTreacheryTokens': {
      const treachery = state.treacheries[message.treachery]
      if (!treachery) return state
      const tokens = (treachery.tokens ?? 0) + message.amount
      const next = {
        ...state,
        treacheries: { ...state.treacheries, [treachery.id]: { ...treachery, tokens } },
      }
      return message.discardAt !== undefined && tokens >= message.discardAt
        ? discardTreachery(next, treachery.id)
        : next
    }

    case 'ShuffleTreacheryIntoDeck': {
      const treachery = state.treacheries[message.treachery]
      if (!treachery?.owner) return state
      const { [treachery.id]: _gone, ...treacheries } = state.treacheries
      const owner = treachery.owner
      return push(
        updateInvestigator({ ...state, treacheries }, owner, (i) => ({
          ...i,
          deck: [...i.deck, treachery.code],
        })),
        { type: 'ShuffleDeck', investigator: owner },
      )
    }

    case 'ResolveWeakness': {
      // Una debilidad robada se resuelve en vez de ir a la mano.
      const investigator = getInvestigator(state, message.investigator)
      const def = playerCardDef(message.code)
      const named = log(state, 'log.weakness', {
        name: investigator.name,
        card: def?.name ?? message.code,
        code: message.code,
      })
      const enemy = playerCardBehavior(message.code)?.enemy
      if (enemy) {
        if (investigator.location === null)
          return toOwnerDiscard(named, investigator.id, message.code)
        return push(named, {
          type: 'SpawnEnemy',
          card: enemy,
          location: investigator.location,
          engageWith: investigator.id,
          owner: investigator.id,
        })
      }
      const [id, next] = newId(named, 'treachery-')
      return push(
        {
          ...next,
          treacheries: {
            ...next.treacheries,
            [id]: {
              kind: 'treachery',
              code: message.code,
              name: def?.name ?? message.code,
              traits: def?.traits ?? [],
              keywords: [],
              id,
              owner: investigator.id,
              placement: { type: 'limbo' },
            },
          },
        },
        { type: 'RevealTreachery', treachery: id, investigator: investigator.id },
        { type: 'AfterRevelation', treachery: id, investigator: investigator.id },
      )
    }

    case 'MoveDamage': {
      // Lucky Charm: mueve 1 daño u horror de una carta a otra.
      const amount = {
        damage: message.kind === 'damage' ? 1 : 0,
        horror: message.kind === 'horror' ? 1 : 0,
      }
      const removeFrom: Message =
        message.from.type === 'asset'
          ? { type: 'HealAsset', asset: message.from.id, ...amount }
          : { type: 'Heal', investigator: message.from.id, ...amount }
      const addTo: Message =
        message.to.type === 'asset'
          ? { type: 'DamageAsset', asset: message.to.id, ...amount }
          : { type: 'TakeDamage', investigator: message.to.id, ...amount, direct: true }
      return push(state, removeFrom, addTo)
    }

    case 'ReturnAssetWithTrait': {
      const options = Object.values(state.assets).filter(
        (a) =>
          a.owner === message.investigator &&
          (playerCardDef(a.code)?.traits ?? []).includes(message.trait),
      )
      if (options.length === 0) return state
      return push(state, {
        type: 'Ask',
        investigator: message.investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.returnAsset',
          choices: options.map((a): Choice => ({
            label: 'choice.returnToHand',
            params: { card: playerCardDef(a.code)?.name ?? a.code },
            target: { type: 'asset', id: a.id },
            then: [{ type: 'ReturnAssetToHand', asset: a.id }],
          })),
        },
      })
    }

    case 'EnemyStaysExhausted':
      if (!findEnemy(state, message.enemy)) return state
      return updateEnemy(state, message.enemy, (e) => ({ ...e, stayExhausted: true }))

    case 'Story': {
      const lead = leadInvestigator(state) ?? state.investigators[0]
      if (!lead) return state
      return push(state, {
        type: 'Ask',
        investigator: lead.id,
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.story',
          story: message.entry,
          choices: message.choices ?? [{ label: 'choice.continue', then: [] }],
        },
      })
    }

    case 'Ask': {
      // Solo se ofrecen las opciones cuyos requisitos se cumplen ahora mismo;
      // si queda una sola, se resuelve sin preguntar.
      const choices = message.question.choices.filter(
        (c) => c.requires === undefined || meetsRequirement(state, c.requires),
      )
      const [only] = choices
      if (!only) return state
      if (
        choices.length === 1 &&
        !message.question.alwaysAsk &&
        message.question.prompt !== 'prompt.chooseAction'
      ) {
        return push(state, ...only.then)
      }
      return {
        ...state,
        pending: {
          investigator: message.investigator,
          question: { ...message.question, choices },
        },
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Cartas de jugador: reacciones, ventanas de prueba y debilidades
// ---------------------------------------------------------------------------

/** Perdición total en juego: la del plan y la de las cartas de jugador. */
function totalDoom(state: GameState): number {
  const onEnemies = Object.values(state.enemies).reduce((sum, e) => sum + (e.doom ?? 0), 0)
  return state.investigators.reduce((sum, i) => sum + (i.doom ?? 0), state.doom + onEnemies)
}

/** Acción de evitar: la básica o la de un evento con "Evitar". */
function isEvadeAction(action: Action): boolean {
  return (
    action.kind === 'evade' ||
    (action.kind === 'play' && !!playerCardBehavior(action.card)?.evadeAction)
  )
}

/** Debilidades que se resuelven al robarlas (traiciones, enemigos, The Necronomicon). */
function resolvesWhenDrawn(code: string): boolean {
  return (
    !!playerCardDef(code)?.weakness &&
    (!!treacheryBehavior(code) || !!playerCardBehavior(code)?.enemy)
  )
}

/** Tamaño máximo de mano: 8 más lo que den sus apoyos. */
function handSize(state: GameState, investigator: string): number {
  return Object.values(state.assets)
    .filter((a) => a.owner === investigator)
    .reduce((size, a) => size + (playerCardBehavior(a.code)?.handSize ?? 0), MAX_HAND_SIZE)
}

function canCommit(test: SkillTest, code: string): boolean {
  const def = playerCardDef(code)
  if (!def || matchingIcons(def.icons, test.skill) === 0) return false
  const already = test.committed.filter((c) => c.code === code).length
  return def.commitLimit === undefined || already < def.commitLimit
}

/** Margen de la prueba en curso (valor final menos dificultad). */
function margin(state: GameState): number {
  const test = state.skillTest
  return test ? (test.modifiedSkill ?? 0) - test.difficulty : 0
}

/** Habilidades rápidas que el investigador que hace la prueba puede usar antes de revelar. */
function testOptions(state: GameState, test: SkillTest): ReactionOption[] {
  const investigator = getInvestigator(state, test.investigator)
  const own = investigatorBehavior(investigator.id)?.testOptions?.(state, test, investigator) ?? []
  const assets = assetsBlocked(state, investigator.id)
    ? []
    : Object.values(state.assets)
        .filter((a) => a.owner === investigator.id)
        .flatMap((a) => playerCardBehavior(a.code)?.testOptions?.(state, test, a) ?? [])
  return [...own, ...assets].filter((o) => withinLimit(state, o.key, o.investigator, o.limit))
}

/**
 * Reacciones posibles a `trigger`: de los investigadores, de sus apoyos en juego
 * y de los eventos de su mano que se juegan "después de…" (si pueden pagarlos).
 */
function reactionOptions(state: GameState, trigger: Trigger): ReactionOption[] {
  const active = activeInvestigators(state)
  const fromInvestigators = active.flatMap(
    (i) => investigatorBehavior(i.id)?.reactions?.(state, trigger, i) ?? [],
  )
  const assets = Object.values(state.assets)
  // Un apoyo que acaba de ser derrotado aún reacciona "al ser derrotado".
  if (trigger.type === 'assetDefeated' && !state.assets[trigger.asset.id])
    assets.push(trigger.asset)
  const fromAssets = assets
    .filter((a) => !assetsBlocked(state, a.owner))
    .flatMap((a) => playerCardBehavior(a.code)?.reactions?.(state, trigger, a) ?? [])
  const fromHands = active.flatMap((i) =>
    [...new Set(i.hand)].flatMap((code) => {
      if ((playerCardDef(code)?.cost ?? 0) > i.resources) return []
      return playerCardBehavior(code)?.handReactions?.(state, trigger, i.id) ?? []
    }),
  )
  const fromEnemies = Object.values(state.enemies).flatMap(
    (e) => enemyBehavior(e.code)?.reactions?.(state, trigger, e) ?? [],
  )
  return [...fromInvestigators, ...fromAssets, ...fromHands, ...fromEnemies]
}

function meetsRequirement(state: GameState, requirement: Requirement): boolean {
  const investigator = getInvestigator(state, requirement.investigator)
  switch (requirement.type) {
    case 'hasClues':
      return investigator.clues > 0
    case 'hasCardsInHand':
      return investigator.hand.length > 0
    case 'hasResources':
      return investigator.resources > 0
  }
}

function discardTreachery(state: GameState, id: string): GameState {
  const treachery = state.treacheries[id]
  if (!treachery) return state
  const { [id]: _removed, ...treacheries } = state.treacheries
  // Una debilidad de jugador va a la pila de descartes de su dueño.
  if (treachery.owner)
    return toOwnerDiscard({ ...state, treacheries }, treachery.owner, treachery.code)
  const {
    id: _id,
    placement: _placement,
    owner: _owner,
    canceled: _canceled,
    tokens: _tokens,
    ...card
  } = treachery
  return { ...state, treacheries, encounterDiscard: [...state.encounterDiscard, card] }
}

function toOwnerDiscard(state: GameState, owner: string, code: string): GameState {
  return updateInvestigator(state, owner, (i) =>
    i.eliminated ? i : { ...i, discard: [...i.discard, code] },
  )
}

/** Habilidades forzadas de las cartas en juego que responden a `trigger`. */
function forcedAbilities(state: GameState, trigger: Trigger): Message[] {
  const fromTreacheries = Object.values(state.treacheries)
    .filter((t) => t.placement.type !== 'limbo')
    .flatMap((t) => treacheryBehavior(t.code)?.forced?.(state, trigger, t) ?? [])
  const enemies = trigger.type === 'enemyDefeated' ? [trigger.enemy] : Object.values(state.enemies)
  const fromEnemies = enemies.flatMap(
    (e) => enemyBehavior(e.code)?.forced?.(state, trigger, e) ?? [],
  )
  const agenda = state.agendas[state.agendaIndex]
  const fromAgenda = agenda
    ? (agendaBehavior(agenda.code)?.forced?.(state, trigger, agenda) ?? [])
    : []
  const fromLocations = Object.values(state.locations).flatMap(
    (l) => locationBehavior(l.id)?.forced?.(state, trigger, l) ?? [],
  )
  const fromAssets = Object.values(state.assets).flatMap(
    (a) => playerCardBehavior(a.code)?.forced?.(state, trigger, a) ?? [],
  )
  return [...fromAgenda, ...fromEnemies, ...fromLocations, ...fromTreacheries, ...fromAssets]
}

function actObjectiveMet(state: GameState): boolean {
  if (state.outcome) return false
  const act = state.acts[state.actIndex]
  return (
    act?.advanceTiming === 'objective' && (actBehavior(act.code)?.objectiveMet?.(state) ?? false)
  )
}

function enemyCard(enemy: Enemy): EnemyCard {
  const {
    id: _id,
    maxHealth: _max,
    damageTaken: _dmg,
    location: _loc,
    engagedWith: _eng,
    exhausted: _exh,
    ...card
  } = enemy
  return card
}

/** Valor y efectos de una ficha del caos (RR paso 4). */
function resolveToken(state: GameState, token: ChaosToken, investigator: string): TokenEffect {
  if (typeof token === 'number') return { modifier: token }
  switch (token) {
    case 'autoFail':
      return { modifier: 0 }
    case 'elderSign': {
      const self = getInvestigator(state, investigator)
      return (
        investigatorBehavior(self.id)?.elderSign?.(state, self) ?? {
          modifier: self.elderSignModifier,
        }
      )
    }
    default: {
      const scenario = scenarioBehavior(state.scenarioId)
      return scenario?.tokenEffect
        ? scenario.tokenEffect(state, token, investigator)
        : { modifier: state.tokenValues[token] ?? 0 }
    }
  }
}

function preferredByPrey(
  candidates: Investigator[],
  prey: Prey | undefined,
): Investigator | undefined {
  const [first] = candidates as [Investigator, ...Investigator[]]
  if (!prey) return first
  if (prey.type === 'only') return candidates.find((i) => i.id === prey.investigator)
  if (prey.type === 'mostResources') {
    return candidates.reduce((best, i) => (i.resources > best.resources ? i : best))
  }
  const sign = prey.type === 'lowestSkill' ? 1 : -1
  return candidates.reduce((best, i) =>
    sign * (i.skills[prey.skill] - best.skills[prey.skill]) < 0 ? i : best,
  )
}

/** RR paso 7 de la prueba de habilidad: aplicar los resultados. */
function skillTestResults(state: GameState, succeeded: boolean, failBy: number): Message[] {
  const test = state.skillTest
  if (!test) return []
  const { kind, investigator } = test
  switch (kind.type) {
    case 'effect':
      return succeeded
        ? kind.onSuccess
        : [...kind.onFail, ...Array.from({ length: failBy }, () => kind.onFailEach).flat()]
    case 'investigate':
      return succeeded
        ? [
            {
              type: 'DiscoverClues',
              investigator,
              amount: 1 + (kind.extraClues ?? 0),
              location: kind.location,
            },
            ...(kind.onSuccess ?? []),
            ...(kind.onSuccessBy && margin(state) >= kind.onSuccessBy.atLeast
              ? kind.onSuccessBy.then
              : []),
          ]
        : (kind.onFail ?? [])
    case 'fight': {
      const enemy = findEnemy(state, kind.enemy)
      if (!enemy) return []
      if (succeeded) {
        const bonus = Math.min(kind.bonusPerSuccess ?? 0, Math.max(0, margin(state)))
        return [
          {
            type: 'DamageEnemy',
            enemy: enemy.id,
            amount: 1 + (kind.extraDamage ?? 0) + bonus,
            by: investigator,
          },
          ...(kind.onSuccess ?? []),
          ...(kind.onDefeat?.length
            ? [{ type: 'IfEnemyDefeated', enemy: enemy.id, then: kind.onDefeat } as Message]
            : []),
          ...(enemy.keywords.includes('elusive') && !enemy.exhausted
            ? [{ type: 'ElusiveRetreat', enemy: enemy.id } as Message]
            : []),
        ]
      }
      const results: Message[] = []
      // RR "Fight": al fallar contra un enemigo enfrentado con otro, el daño va a ese investigador.
      if (enemy.engagedWith !== null && enemy.engagedWith !== investigator) {
        const damage =
          kind.failDamagePerPoint !== undefined ? Math.min(kind.failDamagePerPoint, failBy) : 1
        results.push({ type: 'TakeDamage', investigator: enemy.engagedWith, damage, horror: 0 })
      }
      if (enemy.keywords.includes('retaliate') && !enemy.exhausted) {
        results.push({ type: 'EnemyAttack', enemy: enemy.id, investigator, exhaustAfter: false })
      }
      if (enemy.keywords.includes('elusive') && !enemy.exhausted) {
        results.push({ type: 'ElusiveRetreat', enemy: enemy.id })
      }
      return results
    }
    case 'evade': {
      const enemy = findEnemy(state, kind.enemy)
      if (!enemy) return []
      if (succeeded) {
        return [
          { type: 'EvadeEnemy', enemy: enemy.id, by: investigator },
          ...(kind.onSuccess ?? []),
        ]
      }
      return [
        ...(enemy.keywords.includes('alert') && !enemy.exhausted
          ? [{ type: 'EnemyAttack', enemy: enemy.id, investigator, exhaustAfter: false } as const]
          : []),
        ...(kind.onFail ?? []),
      ]
    }
  }
}

/**
 * Valor de victoria total al acabar: la zona de victoria más las localizaciones
 * en juego con victoria, reveladas y sin pistas (reglamento, "Victory X").
 */
export function victoryTotal(state: GameState): number {
  const locations = Object.values(state.locations).reduce(
    (sum, l) => sum + (l.revealed && l.clues === 0 ? (l.victory ?? 0) : 0),
    0,
  )
  return (state.victoryPoints ?? 0) + locations
}

function updateCampaignLog(state: GameState, update: (log: CampaignLog) => CampaignLog): GameState {
  const current = state.campaignLog ?? emptyCampaignLog(state.investigators.map((i) => i.id))
  return { ...state, campaignLog: update(current) }
}

/** Cambia el registro de un investigador o, sin `investigator`, el de todos los de la partida. */
function updateRecords(
  state: GameState,
  investigator: InvestigatorId | undefined,
  update: (record: InvestigatorRecord, investigator: Investigator) => InvestigatorRecord,
): GameState {
  return updateCampaignLog(state, (c) => {
    const records = { ...c.investigators }
    for (const i of state.investigators) {
      if (investigator !== undefined && i.id !== investigator) continue
      const record = records[i.id] ?? { xp: 0, physicalTrauma: 0, mentalTrauma: 0, storyAssets: [] }
      records[i.id] = update(record, i)
    }
    return { ...c, investigators: records }
  })
}

/** Al final de la ronda caducan los efectos "hasta el final de la ronda". */
function clearRoundModifiers(state: GameState): GameState {
  const locations = Object.fromEntries(
    Object.entries(state.locations).map(([id, l]) => {
      const { shroudModifier: _expired, ...rest } = l
      return [id, rest]
    }),
  )
  return { ...state, locations }
}

/** RR "Equipment Slots": cuántas ranuras de cada tipo tiene un investigador. */
export const SLOT_CAPACITY: Record<SlotType, number> = {
  hand: 2,
  arcane: 2,
  accessory: 1,
  body: 1,
  ally: 1,
  head: 1,
}

/** Localizaciones a 1..`range` conexiones de `from` (sin contar `from`). */
function withinConnections(state: GameState, from: string, range: number): string[] {
  const seen = new Set([from])
  let frontier = [from]
  for (let step = 0; step < range; step++) {
    frontier = frontier
      .flatMap((id) => state.locations[id]?.connections ?? [])
      .filter((id) => !seen.has(id) && state.locations[id])
    for (const id of frontier) seen.add(id)
  }
  seen.delete(from)
  return [...seen]
}

/** Ranuras de un tipo que tiene un investigador: las básicas más las de sus cartas permanentes. */
export function slotCapacity(
  state: GameState,
  investigator: InvestigatorId,
  slot: SlotType,
): number {
  return Object.values(state.assets)
    .filter((a) => a.owner === investigator)
    .reduce(
      (total, a) => total + (playerCardBehavior(a.code)?.permanent?.slots?.[slot] ?? 0),
      SLOT_CAPACITY[slot],
    )
}

const count = <T>(items: T[], item: T) => items.filter((x) => x === item).length

function slotsUsed(state: GameState, investigator: string, slot: SlotType): number {
  return Object.values(state.assets)
    .filter((a) => a.owner === investigator && !a.noSlot)
    .reduce((sum, a) => sum + count(playerCardDef(a.code)?.slots ?? [], slot), 0)
}

/** Iconos que cuentan para la prueba: los de la habilidad más los comodín. */
function matchingIcons(icons: Partial<Record<string, number>> | undefined, skill: string): number {
  return (icons?.[skill] ?? 0) + (icons?.wild ?? 0)
}

/**
 * Apoyos que pueden recibir el daño u horror del investigador: los suyos y los
 * de otros investigadores de su localización que lo permitan (Bodyguard).
 */
function soakers(state: GameState, investigator: string, kind: 'damage' | 'horror'): Asset[] {
  const here = getInvestigator(state, investigator).location
  return Object.values(state.assets).filter((a) => {
    if (a.owner !== investigator) {
      const other = getInvestigator(state, a.owner)
      const guards =
        kind === 'damage' &&
        playerCardBehavior(a.code)?.soaksForOthers &&
        here !== null &&
        other.location === here
      if (!guards) return false
    }
    const def = playerCardDef(a.code)
    return kind === 'damage'
      ? def?.health !== undefined && a.damage < def.health
      : def?.sanity !== undefined && a.horror < def.sanity
  })
}

function log(state: GameState, key: string, params?: LabelParams): GameState {
  return {
    ...state,
    log: [...state.log, { key, round: state.round, ...(params ? { params } : {}) }],
  }
}

/**
 * Valor de la prueba en curso antes de las fichas: habilidad base, modificador
 * del efecto, iconos comprometidos y modificadores constantes de apoyos.
 */
export function skillTestValue(state: GameState): {
  base: number
  modifier: number
  icons: number
  passive: number
  total: number
} {
  const test = state.skillTest
  if (!test) return { base: 0, modifier: 0, icons: 0, passive: 0, total: 0 }
  const investigator = getInvestigator(state, test.investigator)
  const icons = test.committed.reduce(
    (sum, c) => sum + matchingIcons(playerCardDef(c.code)?.icons, test.skill),
    0,
  )
  const passive = Object.values(state.assets)
    .filter((a) => a.owner === investigator.id)
    .reduce((sum, a) => sum + (playerCardBehavior(a.code)?.skillModifier?.(state, a, test) ?? 0), 0)
  const auras =
    investigator.location === null
      ? 0
      : enemiesAt(state, investigator.location).reduce(
          (sum, e) => sum + (enemyBehavior(e.code)?.skillModifier?.(state, e, test) ?? 0),
          0,
        )
  const base = investigator.skills[test.skill]
  return {
    base,
    modifier: test.baseModifier,
    icons,
    passive: passive + auras,
    total: base + test.baseModifier + icons + passive + auras,
  }
}

/** Lo que haría cada ficha de la bolsa en la prueba en curso (para mostrar y calcular probabilidades). */
export function previewToken(
  state: GameState,
  token: ChaosToken,
): TokenEffect & { autoFail: boolean } {
  const investigator = state.skillTest?.investigator ?? state.investigators[0]?.id ?? ''
  return { ...resolveToken(state, token, investigator), autoFail: token === 'autoFail' }
}

/**
 * Probabilidad de éxito de la prueba en curso al revelar una ficha (las de
 * "revela otra" cuentan solo con su propio modificador).
 */
export function successChance(state: GameState): number | null {
  const test = state.skillTest
  if (!test || state.chaosBag.length === 0) return null
  const value = skillTestValue(state).total
  const wins = state.chaosBag.filter((token) => {
    const effect = previewToken(state, token)
    return !effect.autoFail && Math.max(0, value + effect.modifier) >= test.difficulty
  }).length
  return wins / state.chaosBag.length
}

/** Habilidad que prueba una habilidad activada (la de su primera prueba), para dibujar el botón. */
function abilitySkill(messages: Message[]): { skill?: SkillType } {
  const test = messages.find((m) => m.type === 'BeginSkillTest')
  return test?.type === 'BeginSkillTest' ? { skill: test.skill } : {}
}
