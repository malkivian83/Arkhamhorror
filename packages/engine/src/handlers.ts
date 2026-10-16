import {
  actContributors,
  availableAbilities,
  availableActions,
  canAdvanceAct,
  cluesToAdvanceAct,
  describeAction,
  playableCards,
  provokesAttacksOfOpportunity,
} from './actions'
import {
  actBehavior,
  agendaBehavior,
  enemyBehavior,
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
  updateEnemy,
  updateInvestigator,
  updateLocation,
} from './state'
import type {
  Asset,
  ChaosToken,
  Choice,
  LabelParams,
  SlotType,
  EncounterCard,
  Enemy,
  EnemyCard,
  GameState,
  Investigator,
  Message,
  Prey,
  Requirement,
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
      if (agenda && state.doom >= agenda.doomThreshold)
        return push(state, { type: 'AdvanceAgenda' })
      return state
    }

    case 'AdvanceAgenda': {
      // RR "The Mythos Phase": se descarta la perdición, se resuelve el reverso y
      // la siguiente carta pasa a ser el plan actual.
      const agenda = state.agendas[state.agendaIndex]
      const onAdvance = agendaBehavior(agenda?.code)?.onAdvance?.(state) ?? []
      return push(
        log({ ...state, doom: 0 }, 'log.agendaAdvanced', { name: agenda?.name ?? '' }),
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
      state = log(state, 'log.encounter', { name: investigator.name, card: card.name })
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
          },
        },
      }
      return push(next, { type: 'CheckEngagement', location: message.location })
    }

    // --------------------------------------------------------------- Traiciones
    case 'RevealTreachery': {
      const treachery = state.treacheries[message.treachery]
      if (!treachery) return state
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
      return push(state, ...forcedAbilities(state, message.trigger))

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
        updateInvestigator(state, message.investigator, (i) => ({
          ...i,
          turnTaken: true,
          actionsRemaining: ACTIONS_PER_TURN,
        })),
        { type: 'PlayerWindow', investigator: message.investigator },
      )

    case 'PlayerWindow': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated) return state
      const id = investigator.id
      const again: Message = { type: 'PlayerWindow', investigator: id }
      if (actObjectiveMet(state)) return push(state, { type: 'AdvanceAct' }, again)
      const actions =
        investigator.actionsRemaining > 0
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
        then: [{ type: 'PlayCard', investigator: id, code }, again],
      }))
      const abilities = availableAbilities(state, id).map((a): Choice => ({
        label: a.label,
        ...(a.params ? { params: a.params } : {}),
        ...(a.target ? { target: a.target } : {}),
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

    case 'EndTurn':
      return updateInvestigator(state, message.investigator, (i) => ({ ...i, actionsRemaining: 0 }))

    case 'TakeAction': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.actionsRemaining <= 0) throw new EngineError('No quedan acciones')
      const paid = updateInvestigator(state, investigator.id, (i) => ({
        ...i,
        actionsRemaining: i.actionsRemaining - 1,
      }))
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
            difficulty: getLocation(state, investigator.location).shroud,
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
      const drawn = updateInvestigator(state, investigator.id, (i) => ({
        ...i,
        deck,
        hand: [...i.hand, card],
      }))
      return message.amount > 1 ? push(drawn, { ...message, amount: message.amount - 1 }) : drawn
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
      if (investigator.eliminated || investigator.hand.length <= MAX_HAND_SIZE) return state
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
      let next = updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        location: message.location,
      }))
      for (const enemy of engagedEnemies(next, message.investigator)) {
        next = updateEnemy(next, enemy.id, (e) => ({ ...e, location: message.location }))
      }
      const reveal: Message[] = getLocation(next, message.location).revealed
        ? []
        : [{ type: 'RevealLocation', location: message.location }]
      return push(next, ...reveal, { type: 'CheckEngagement', location: message.location })
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
      if (investigator.location === null) return state
      const location = getLocation(state, investigator.location)
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
      return defeated ? push(next, { type: 'DiscardAsset', asset: asset.id }) : next
    }

    // ------------------------------------------------------- Cartas de jugador
    case 'PlayCard': {
      const investigator = getInvestigator(state, message.investigator)
      const def = playerCardDef(message.code)
      const index = investigator.hand.indexOf(message.code)
      if (!def || index < 0) return state
      const cost = def.cost ?? 0
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
      if (def.type === 'asset') {
        return push(paid, {
          type: 'PutAssetIntoPlay',
          investigator: investigator.id,
          code: message.code,
        })
      }
      return push(paid, ...(playerCardBehavior(message.code)?.play?.(paid, investigator.id) ?? []))
    }

    case 'PutAssetIntoPlay': {
      // RR "Equipment Slots": si no hay ranura libre, se descarta un apoyo que la ocupe.
      const def = playerCardDef(message.code)
      if (!def) return state
      const full = (def.slots ?? []).find(
        (slot) =>
          slotsUsed(state, message.investigator, slot) + count(def.slots ?? [], slot) >
          SLOT_CAPACITY[slot],
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
      return {
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
          },
        },
      }
    }

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
      return {
        ...state,
        assets: {
          ...state.assets,
          [asset.id]: { ...asset, uses: Math.max(0, asset.uses - message.amount) },
        },
      }
    }

    case 'CommitWindow': {
      // RR paso 2: comprometer cartas de la mano con iconos que coincidan.
      const test = state.skillTest
      if (!test) return state
      const investigator = getInvestigator(state, test.investigator)
      if (investigator.eliminated) return state
      const committable = [...new Set(investigator.hand)].filter((code) => {
        const def = playerCardDef(code)
        if (!def || matchingIcons(def.icons, test.skill) === 0) return false
        const already = test.committed.filter((c) => c.code === code).length
        return def.commitLimit === undefined || already < def.commitLimit
      })
      if (committable.length === 0 && !state.interactive) return state
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
      return {
        ...updateInvestigator(state, investigator.id, (i) => ({
          ...i,
          hand: i.hand.filter((_, n) => n !== index),
        })),
        skillTest: {
          ...test,
          committed: [...test.committed, { code: message.code, by: investigator.id }],
        },
      }
    }

    case 'Log':
      return log(state, message.key, message.params)

    case 'CheckDefeat': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated) return state
      const defeated =
        investigator.damage >= investigator.health || investigator.horror >= investigator.sanity
      return defeated
        ? push(state, { type: 'EliminateInvestigator', investigator: investigator.id })
        : state
    }

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
        { type: 'ResolveSkillTest' },
        { type: 'EndSkillTest' },
      )
    }

    case 'RevealChaosToken': {
      // RR pasos 3 y 4: revelar ficha y resolver su símbolo. La ficha sale de la
      // bolsa hasta que termina la prueba (así "revela otra" no repite la misma).
      const test = state.skillTest
      if (!test) throw new EngineError('No hay prueba de habilidad')
      if (state.chaosBag.length === 0) return state
      const [index, rng] = nextInt(state.rng, state.chaosBag.length)
      const token = state.chaosBag[index] as ChaosToken
      const effect = resolveToken(state, token, test.investigator)
      const next: GameState = {
        ...state,
        rng,
        chaosBag: state.chaosBag.filter((_, n) => n !== index),
        skillTest: {
          ...test,
          tokens: [...test.tokens, token],
          tokenModifier: test.tokenModifier + effect.modifier,
          autoFail: test.autoFail || token === 'autoFail',
          tokenOnFail: [...test.tokenOnFail, ...(effect.onFail ?? [])],
          tokenOnFailBy: effect.onFailBy
            ? [...test.tokenOnFailBy, effect.onFailBy]
            : test.tokenOnFailBy,
        },
      }
      return effect.revealAnother ? push(next, { type: 'RevealChaosToken' }) : next
    }

    case 'ResolveSkillTest': {
      const test = state.skillTest
      if (!test || test.tokens.length === 0) throw new EngineError('Prueba sin ficha revelada')
      const investigator = getInvestigator(state, test.investigator)
      // RR "Skills and Skill Tests": la ficha de fallo automático deja el valor en 0.
      const modifiedSkill = test.autoFail
        ? 0
        : Math.max(0, skillTestValue(state).total + test.tokenModifier)
      const succeeded = !test.autoFail && modifiedSkill >= test.difficulty
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
        ? []
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
      const tokens = state.skillTest?.tokens ?? []
      let next: GameState = { ...state, skillTest: null, chaosBag: [...state.chaosBag, ...tokens] }
      for (const c of state.skillTest?.committed ?? []) {
        next = updateInvestigator(next, c.by, (i) =>
          i.eliminated ? i : { ...i, discard: [...i.discard, c.code] },
        )
      }
      return next
    }

    // --------------------------------------------------------------- Enemigos
    case 'EngageEnemy': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.location === null || !findEnemy(state, message.enemy)) return state
      return updateEnemy(state, message.enemy, (e) => ({
        ...e,
        engagedWith: investigator.id,
        location: investigator.location as string,
      }))
    }

    case 'CheckEngagement': {
      // RR "Enemy Engagement": un enemigo preparado y no enfrentado se enfrenta
      // a un investigador de su localización. Con presa, el que mejor la cumpla;
      // si no (o empate), decide el jefe: aquí, el primero en orden de jugadores.
      const candidates = investigatorsAt(state, message.location)
      if (candidates.length === 0) return state
      let next = state
      for (const enemy of enemiesAt(state, message.location)) {
        if (enemy.exhausted || enemy.engagedWith !== null || enemy.keywords.includes('aloof')) {
          continue
        }
        const target = preferredByPrey(candidates, enemy.prey)
        next = updateEnemy(next, enemy.id, (e) => ({ ...e, engagedWith: target.id }))
      }
      return next
    }

    case 'EnemyAttack': {
      const enemy = findEnemy(state, message.enemy)
      const investigator = getInvestigator(state, message.investigator)
      if (!enemy || enemy.exhausted || investigator.eliminated) return state
      const next = message.exhaustAfter
        ? updateEnemy(state, enemy.id, (e) => ({ ...e, exhausted: true }))
        : state
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
        {
          type: 'TakeDamage',
          investigator: investigator.id,
          damage: enemy.damage,
          horror: enemy.horror,
        },
        ...after,
      )
    }

    case 'DamageEnemy': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      const damageTaken = enemy.damageTaken + message.amount
      const next = updateEnemy(state, enemy.id, (e) => ({ ...e, damageTaken }))
      return damageTaken >= enemy.maxHealth
        ? push(next, { type: 'DefeatEnemy', enemy: enemy.id })
        : next
    }

    case 'DefeatEnemy': {
      const enemy = getEnemy(state, message.enemy)
      const removed = log(removeEnemy(state, enemy.id), 'log.enemyDefeated', { enemy: enemy.name })
      const next =
        enemy.victory !== undefined
          ? { ...removed, victoryDisplay: [...removed.victoryDisplay, enemy.code] }
          : { ...removed, encounterDiscard: [...removed.encounterDiscard, enemyCard(enemy)] }
      // RR "Doomed": al ser derrotado (no descartado), 1 perdición en el plan.
      const doomed: Message[] = enemy.keywords.includes('doomed')
        ? [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }]
        : []
      return push(next, { type: 'Forced', trigger: { type: 'enemyDefeated', enemy } }, ...doomed, {
        type: 'CheckActObjective',
      })
    }

    case 'EvadeEnemy':
      if (!findEnemy(state, message.enemy)) return state
      return updateEnemy(state, message.enemy, (e) => ({
        ...e,
        engagedWith: null,
        exhausted: true,
      }))

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
      for (const enemy of Object.values(state.enemies)) {
        if (enemy.exhausted || enemy.engagedWith !== null || !enemy.keywords.includes('hunter')) {
          continue
        }
        const step = nextStepToward(state, enemy.location, occupied)
        if (step === null) continue
        next = updateEnemy(next, enemy.id, (e) => ({ ...e, location: step }))
        destinations.add(step)
      }
      return push(
        next,
        ...[...destinations].map((location): Message => ({ type: 'CheckEngagement', location })),
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
      const enemies = Object.fromEntries(
        Object.entries(state.enemies).map(([id, e]) => [id, { ...e, exhausted: false }]),
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
    case 'EndScenario':
      return log({ ...state, outcome: message.outcome, queue: [], pending: null }, 'log.end', {
        outcome: message.outcome.type === 'resolution' ? `R${message.outcome.resolution}` : '—',
      })

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
  const { id: _id, placement: _placement, ...card } = treachery
  return { ...state, treacheries, encounterDiscard: [...state.encounterDiscard, card] }
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
  return [...fromAgenda, ...fromEnemies, ...fromLocations, ...fromTreacheries]
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
    case 'elderSign':
      return { modifier: getInvestigator(state, investigator).elderSignModifier }
    default: {
      const scenario = scenarioBehavior(state.scenarioId)
      return scenario?.tokenEffect
        ? scenario.tokenEffect(state, token, investigator)
        : { modifier: state.tokenValues[token] ?? 0 }
    }
  }
}

function preferredByPrey(candidates: Investigator[], prey: Prey | undefined): Investigator {
  const [first] = candidates as [Investigator, ...Investigator[]]
  if (!prey) return first
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
            { type: 'DiscoverClues', investigator, amount: 1 + (kind.extraClues ?? 0) },
            ...(kind.onSuccess ?? []),
          ]
        : []
    case 'fight': {
      const enemy = findEnemy(state, kind.enemy)
      if (!enemy) return []
      if (succeeded) {
        return [
          { type: 'DamageEnemy', enemy: enemy.id, amount: 1 + (kind.extraDamage ?? 0) },
          ...(kind.onSuccess ?? []),
        ]
      }
      const results: Message[] = []
      // RR "Fight": al fallar contra un enemigo enfrentado con otro, el daño va a ese investigador.
      if (enemy.engagedWith !== null && enemy.engagedWith !== investigator) {
        results.push({ type: 'TakeDamage', investigator: enemy.engagedWith, damage: 1, horror: 0 })
      }
      if (enemy.keywords.includes('retaliate') && !enemy.exhausted) {
        results.push({ type: 'EnemyAttack', enemy: enemy.id, investigator, exhaustAfter: false })
      }
      return results
    }
    case 'evade': {
      const enemy = findEnemy(state, kind.enemy)
      if (!enemy) return []
      if (succeeded) return [{ type: 'EvadeEnemy', enemy: enemy.id }, ...(kind.onSuccess ?? [])]
      return enemy.keywords.includes('alert') && !enemy.exhausted
        ? [{ type: 'EnemyAttack', enemy: enemy.id, investigator, exhaustAfter: false }]
        : []
    }
  }
}

const SLOT_CAPACITY: Record<SlotType, number> = {
  hand: 2,
  arcane: 2,
  accessory: 1,
  body: 1,
  ally: 1,
  head: 1,
}

const count = <T>(items: T[], item: T) => items.filter((x) => x === item).length

function slotsUsed(state: GameState, investigator: string, slot: SlotType): number {
  return Object.values(state.assets)
    .filter((a) => a.owner === investigator)
    .reduce((sum, a) => sum + count(playerCardDef(a.code)?.slots ?? [], slot), 0)
}

/** Iconos que cuentan para la prueba: los de la habilidad más los comodín. */
function matchingIcons(icons: Partial<Record<string, number>> | undefined, skill: string): number {
  return (icons?.[skill] ?? 0) + (icons?.wild ?? 0)
}

/** Apoyos del investigador que aún pueden recibir daño u horror. */
function soakers(state: GameState, investigator: string, kind: 'damage' | 'horror'): Asset[] {
  return Object.values(state.assets).filter((a) => {
    if (a.owner !== investigator) return false
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
  const base = investigator.skills[test.skill]
  return {
    base,
    modifier: test.baseModifier,
    icons,
    passive,
    total: base + test.baseModifier + icons + passive,
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
