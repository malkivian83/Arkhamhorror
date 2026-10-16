import {
  availableActions,
  canAdvanceAct,
  cluesToAdvanceAct,
  describeAction,
  provokesAttacksOfOpportunity,
} from './actions'
import { enemyBehavior, scenarioBehavior, treacheryBehavior } from './content'
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
  ChaosToken,
  Choice,
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
      return push({ ...state, round }, ...phases)
    }

    // ----------------------------------------------------------------- Mitos
    case 'MythosPhase':
      // RR "The Mythos Phase": perdición, comprobar plan, cada investigador roba un encuentro.
      return push(
        { ...state, phase: 'mythos' },
        { type: 'PlaceDoom', amount: 1 },
        { type: 'CheckAgenda' },
        ...activeInvestigators(state).map((i): Message => ({
          type: 'DrawEncounterCard',
          investigator: i.id,
        })),
      )

    case 'PlaceDoom':
      return { ...state, doom: state.doom + message.amount }

    case 'CheckAgenda': {
      const agenda = state.agendas[state.agendaIndex]
      if (agenda && state.doom >= agenda.doomThreshold)
        return push(state, { type: 'AdvanceAgenda' })
      return state
    }

    case 'AdvanceAgenda': {
      const agendaIndex = state.agendaIndex + 1
      const next = { ...state, doom: 0, agendaIndex }
      if (agendaIndex >= state.agendas.length) {
        return push(next, { type: 'EndScenario', outcome: { type: 'noResolution' } })
      }
      return next
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
        {
          ...state,
          phase: 'investigation',
          investigators: state.investigators.map((i) => ({ ...i, turnTaken: false })),
        },
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
      // Sin acciones ni nada gratuito que hacer, el turno termina solo.
      if (actions.length === 0 && advanceAct.length === 0) {
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
      switch (action.kind) {
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

    case 'TakeDamage':
      return push(
        updateInvestigator(state, message.investigator, (i) => ({
          ...i,
          damage: i.damage + message.damage,
          horror: i.horror + message.horror,
        })),
        { type: 'CheckDefeat', investigator: message.investigator },
      )

    case 'CheckDefeat': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated) return state
      const defeated =
        investigator.damage >= investigator.health || investigator.horror >= investigator.sanity
      return defeated
        ? push(state, { type: 'EliminateInvestigator', investigator: investigator.id })
        : state
    }

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
      return here === null ? next : push(next, { type: 'CheckEngagement', location: here })
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
            tokens: [],
            tokenModifier: 0,
            autoFail: false,
            tokenOnFail: [],
            tokenOnFailBy: [],
            modifiedSkill: null,
            succeeded: null,
          },
        },
        // Pendiente: paso 2 (comprometer cartas) y ventanas de jugador.
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
        : Math.max(0, investigator.skills[test.skill] + test.tokenModifier)
      const succeeded = !test.autoFail && modifiedSkill >= test.difficulty
      const next = { ...state, skillTest: { ...test, modifiedSkill, succeeded } }
      if (investigator.eliminated) return next
      const failBy = Math.max(0, test.difficulty - modifiedSkill)
      const tokenResults: Message[] = succeeded
        ? []
        : [
            ...test.tokenOnFail,
            ...test.tokenOnFailBy.filter((f) => failBy >= f.atLeast).flatMap((f) => f.then),
          ]
      return push(next, ...skillTestResults(next, succeeded, failBy), ...tokenResults)
    }

    case 'EndSkillTest': {
      // RR paso 8: las fichas reveladas vuelven a la bolsa.
      const tokens = state.skillTest?.tokens ?? []
      return { ...state, skillTest: null, chaosBag: [...state.chaosBag, ...tokens] }
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
      const removed = removeEnemy(state, enemy.id)
      const {
        id: _id,
        maxHealth: _max,
        damageTaken: _dmg,
        location: _loc,
        engagedWith: _eng,
        exhausted: _exh,
        ...card
      } = enemy
      const next =
        enemy.victory !== undefined
          ? { ...removed, victoryDisplay: [...removed.victoryDisplay, enemy.code] }
          : { ...removed, encounterDiscard: [...removed.encounterDiscard, card] }
      // RR "Doomed": al ser derrotado (no descartado), 1 perdición en el plan.
      const doomed: Message[] = enemy.keywords.includes('doomed')
        ? [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }]
        : []
      return push(next, { type: 'Forced', trigger: { type: 'enemyDefeated', enemy } }, ...doomed)
    }

    case 'EvadeEnemy':
      if (!findEnemy(state, message.enemy)) return state
      return updateEnemy(state, message.enemy, (e) => ({
        ...e,
        engagedWith: null,
        exhausted: true,
      }))

    case 'EnemyPhase':
      return push({ ...state, phase: 'enemy' }, { type: 'HuntersMove' }, { type: 'EnemiesAttack' })

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
        { ...state, phase: 'upkeep' },
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
      const occupied = [
        ...new Set(activeInvestigators(state).flatMap((i) => (i.location ? [i.location] : []))),
      ]
      return push(
        { ...state, enemies },
        ...occupied.map((location): Message => ({ type: 'CheckEngagement', location })),
      )
    }

    case 'EndOfRound': {
      const act = state.acts[state.actIndex]
      return act?.advanceTiming === 'endOfRound' ? push(state, { type: 'OfferActAdvance' }) : state
    }

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
      let required = cluesToAdvanceAct(state)
      if (required === null || !canAdvanceAct(state))
        throw new EngineError('No se puede avanzar el acto')
      // Pendiente: que el grupo elija cuántas pistas aporta cada uno. Ahora, en orden de jugadores.
      let next = state
      for (const investigator of activeInvestigators(state)) {
        const spent = Math.min(required, investigator.clues)
        required -= spent
        next = updateInvestigator(next, investigator.id, (i) => ({ ...i, clues: i.clues - spent }))
      }
      const actIndex = state.actIndex + 1
      next = { ...next, actIndex }
      if (actIndex >= state.acts.length) {
        return push(next, { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } })
      }
      return next
    }

    // ------------------------------------------------------------ Varios
    case 'EndScenario':
      return { ...state, outcome: message.outcome, queue: [], pending: null }

    case 'Ask': {
      // Solo se ofrecen las opciones cuyos requisitos se cumplen ahora mismo;
      // si queda una sola, se resuelve sin preguntar.
      const choices = message.question.choices.filter(
        (c) => c.requires === undefined || meetsRequirement(state, c.requires),
      )
      const [only] = choices
      if (!only) return state
      if (choices.length === 1 && message.question.prompt !== 'prompt.chooseAction') {
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
  return [...fromEnemies, ...fromTreacheries]
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
      return succeeded ? [{ type: 'DiscoverClues', investigator, amount: 1 }] : []
    case 'fight': {
      const enemy = findEnemy(state, kind.enemy)
      if (!enemy) return []
      if (succeeded) return [{ type: 'DamageEnemy', enemy: enemy.id, amount: 1 }]
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
      if (succeeded) return [{ type: 'EvadeEnemy', enemy: enemy.id }]
      return enemy.keywords.includes('alert') && !enemy.exhausted
        ? [{ type: 'EnemyAttack', enemy: enemy.id, investigator, exhaustAfter: false }]
        : []
    }
  }
}
