import {
  actContributors,
  actionCost,
  actionsThisRound,
  cardCost,
  commitBlocked,
  entryCost,
  fastAbilitiesBlocked,
  leavingBlocked,
  moveBlocked,
  playBlocked,
  treacheryBlocksPlay,
  availableAbilities,
  availableActions,
  assetsBlocked,
  canAdvanceAct,
  canAffordEntry,
  canEnter,
  cluesToAdvanceAct,
  describeAction,
  playableCards,
  provokesAttacksOfOpportunity,
  withinLimit,
  uniqueAssetInPlay,
} from './actions'
import {
  actBehavior,
  agendaBehavior,
  enemyBehavior,
  investigatorBehavior,
  isPermanent,
  locationBehavior,
  playerCardBehavior,
  playerCardDef,
  scenarioBehavior,
  storyBehavior,
  treacheryBehavior,
} from './content'
import {
  assetSlots,
  assetVitals,
  attachedAttackSkillBonus,
  resolvingSkillBonus,
} from './asset-upgrades'
import { EngineError } from './errors'
import { attackDamage } from './combat'
import { nextInt, shuffle } from './rng'
import {
  activeInvestigators,
  assetsCannotReady,
  effectiveVitals,
  bestByPrey,
  distancesFrom,
  enemiesAt,
  engagedEnemies,
  findEnemy,
  getEnemy,
  getInvestigator,
  getLocation,
  huntingSteps,
  investigatorsAt,
  leadInvestigator,
  newId,
  nextStepToward,
  perInvestigator,
  placedLocation,
  push,
  recomputeConnections,
  removeEnemy,
  enemyHasKeyword,
  enemyMaxHealth,
  attachedStat,
  shroudOf,
  turnStartedAt,
  updateEnemy,
  updateInvestigator,
  updateLocation,
} from './state'
import { emptyCampaignLog } from './setup'
import type {
  Action,
  Asset,
  CampaignLog,
  CardCode,
  ChaosToken,
  Choice,
  ClueHolder,
  DamageDealt,
  DamageSource,
  LabelParams,
  Location,
  LocationId,
  PlacedAsset,
  SlotType,
  EncounterCard,
  Enemy,
  EnemyCard,
  GameState,
  Investigator,
  InvestigatorId,
  InvestigatorRecord,
  Message,
  ReactionOption,
  Requirement,
  SkillTest,
  SkillTestKind,
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
        { type: 'Step', step: 'mythosBegins' },
        { type: 'Step', step: 'placeDoom' },
        { type: 'PlaceDoom', amount: 1 },
        { type: 'Step', step: 'checkDoom' },
        { type: 'CheckAgenda' },
        { type: 'Step', step: 'drawEncounter' },
        ...activeInvestigators(state).map((i): Message => ({
          type: 'DrawEncounterCard',
          investigator: i.id,
        })),
        { type: 'Step', step: 'mythosEnds' },
      )

    case 'Step': {
      const next = log({ ...state, phaseStep: message.step }, `log.step.${message.step}`, {
        ...(message.investigator
          ? { name: getInvestigator(state, message.investigator).name }
          : {}),
      })
      return [
        'mythosEnds',
        'enemyBegins',
        'resolveAttacks',
        'enemyEnds',
        'upkeepBegins',
        'upkeepEnds',
      ].includes(message.step)
        ? push(next, { type: 'InvestigatorFastWindow' })
        : next
    }

    case 'InvestigatorFastWindow': {
      const options = fastInvestigatorOptions(state)
      if (!options.length) return state
      return push(state, {
        type: 'Ask',
        investigator: options[0]!.investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.investigatorFast',
          alwaysAsk: true,
          choices: [
            ...options.map((o): Choice => ({
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
                { type: 'InvestigatorFastWindow' },
              ],
            })),
            { label: 'choice.skip', then: [] },
          ],
        },
      })
    }

    case 'PlaceDoom':
      if (state.doomBecomesDamage) return push(state, ...doomAsDamage(state, message.amount))
      return push(
        { ...state, doom: state.doom + message.amount },
        { type: 'Forced', trigger: { type: 'afterDoomPlaced' } },
      )

    case 'SetDoomBecomesDamage':
      return { ...state, doomBecomesDamage: true }

    case 'PlaceDoomOnAsset': {
      if (state.doomBecomesDamage) return push(state, ...doomAsDamage(state, message.amount))
      const asset = state.assets[message.asset]
      if (!asset) return state
      return push(
        {
          ...state,
          assets: {
            ...state.assets,
            [asset.id]: { ...asset, doom: (asset.doom ?? 0) + message.amount },
          },
        },
        { type: 'CheckAgenda' },
      )
    }

    case 'CheckAgenda': {
      const agenda = state.agendas[state.agendaIndex]
      if (agenda && totalDoom(state) >= agenda.doomThreshold) {
        const instead = agendaBehavior(agenda.code)?.insteadOfAdvance?.(state)
        return push(state, ...(instead ?? [{ type: 'AdvanceAgenda' } as Message]))
      }
      return state
    }

    case 'AdvanceAgenda': {
      // RR "The Mythos Phase": se descarta la perdición, se resuelve el reverso y
      // la siguiente carta pasa a ser el plan actual.
      const agenda = state.agendas[state.agendaIndex]
      const onAdvance = agendaBehavior(agenda?.code)?.onAdvance?.(state) ?? []
      return push(
        log(
          discardUnsupported({
            ...state,
            doom: 0,
            // También se retira la perdición de las cartas de jugador.
            investigators: state.investigators.map((i) => (i.doom ? { ...i, doom: 0 } : i)),
            enemies: Object.fromEntries(
              Object.entries(state.enemies).map(([id, e]) => [id, e.doom ? { ...e, doom: 0 } : e]),
            ),
            assets: Object.fromEntries(
              Object.entries(state.assets).map(([id, a]) => [id, a.doom ? { ...a, doom: 0 } : a]),
            ),
            locations: Object.fromEntries(
              Object.entries(state.locations).map(([id, l]) => [
                id,
                l.doom ? { ...l, doom: 0 } : l,
              ]),
            ),
          }),
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
      const advanced = { ...state, agendaIndex }
      const after = agendaBehavior(state.agendas[state.agendaIndex]?.code)?.afterAdvance
      return after ? push(advanced, ...after(advanced)) : advanced
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
        // Oculto: en línea, solo quien la roba ve qué carta es.
        ...(card.kind === 'treachery' && card.keywords.includes('hidden') ? { hidden: 1 } : {}),
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
      const behavior = enemyBehavior(card.code)
      const after: Message[] =
        card.keywords.includes('surge') || behavior?.surge?.(state)
          ? [{ type: 'DrawEncounterCard', investigator: investigator.id }]
          : []
      if (behavior?.spawn) {
        // Instrucción de aparición variable: si no hay sitio, se descarta; con empate, decide el jefe.
        const places = behavior.spawn(state, investigator.id).filter((l) => state.locations[l])
        const spawn = (location: LocationId): Message => ({
          type: 'SpawnEnemy',
          card,
          location,
          engageWith: null,
          ...(message.exhaustAfterDraw ? { exhaustAfterSpawn: true, after } : {}),
        })
        const tail = message.exhaustAfterDraw ? [] : after
        const [first] = places
        if (!first)
          return push({ ...next, encounterDiscard: [...next.encounterDiscard, card] }, ...after)
        const lead = leadInvestigator(state)
        if (places.length === 1 || !state.interactive || !lead)
          return push(next, spawn(first), ...tail)
        return push(
          next,
          {
            type: 'Ask',
            investigator: lead.id,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseSpawnLocation',
              promptParams: { enemy: card.name },
              choices: places.map((l): Choice => ({
                label: 'choice.location',
                params: { location: getLocation(state, l).name },
                target: { type: 'location', id: l },
                then: [spawn(l)],
              })),
            },
          },
          ...tail,
        )
      }
      if (card.spawnAt !== undefined) {
        // RR "Enemy": si no se pueden cumplir las instrucciones de aparición, se descarta.
        if (!state.locations[card.spawnAt]) {
          return push({ ...next, encounterDiscard: [...next.encounterDiscard, card] }, ...after)
        }
        return push(
          next,
          {
            type: 'SpawnEnemy',
            card,
            location: card.spawnAt,
            engageWith: null,
            ...(message.exhaustAfterDraw ? { exhaustAfterSpawn: true, after } : {}),
          },
          ...(message.exhaustAfterDraw ? [] : after),
        )
      }
      const engageWith = card.keywords.includes('aloof') ? null : investigator.id
      return push(
        next,
        {
          type: 'SpawnEnemy',
          card,
          location: investigator.location,
          engageWith,
          ...(message.exhaustAfterDraw ? { exhaustAfterSpawn: true, after } : {}),
        },
        ...(message.exhaustAfterDraw ? [] : after),
      )
    }

    case 'SpawnEnemy': {
      if (!message.windowResolved)
        return push(
          state,
          {
            type: 'Forced',
            trigger: { type: 'beforeEnemySpawns', card: message.card, location: message.location },
          },
          { ...message, windowResolved: true },
        )
      const [id, withId] = newId(state, 'enemy-')
      const { card } = message
      const engagedWith =
        card.keywords.includes('massive') ||
        (message.engageWith &&
          getInvestigator(state, message.engageWith).location !== message.location)
          ? null
          : message.engageWith
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
            engagedWith,
            exhausted: false,
            ...(message.owner ? { owner: message.owner } : {}),
          },
        },
      }
      return push(
        next,
        ...(card.startingDoom
          ? [{ type: 'PlaceDoomOnEnemy', enemy: id, amount: card.startingDoom } as Message]
          : []),
        { type: 'CheckEngagement', location: message.location },
        // Aparecer enfrentado también es enfrentarse (Maníaco, Psicópata joven).
        ...(engagedWith
          ? [
              {
                type: 'Forced',
                trigger: { type: 'afterEngage', investigator: engagedWith, enemy: id },
              } as Message,
            ]
          : []),
        {
          type: 'Forced',
          trigger: { type: 'enemyEntersLocation', enemy: id, location: message.location },
        },
        {
          type: 'Forced',
          trigger: { type: 'enemySpawned', enemy: id, location: message.location },
        },
        ...(message.after ?? []),
        ...(message.exhaustAfterSpawn ? [{ type: 'ExhaustEnemy', enemy: id } as Message] : []),
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
      return push(
        next,
        ...(treachery?.canceled
          ? [
              {
                type: 'Forced' as const,
                trigger: {
                  type: 'afterCancelRevelation' as const,
                  card: treachery.code,
                  weakness: !!treachery.owner,
                },
              },
            ]
          : []),
        ...(surge
          ? [{ type: 'DrawEncounterCard' as const, investigator: message.investigator }]
          : []),
      )
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
            ...(message.hidden && message.placement.type === 'threatArea' ? { hidden: true } : {}),
          },
        },
      }

    case 'DiscardTreachery':
      if (treacheryBehavior(state.treacheries[message.treachery]?.code ?? '')?.cannotDiscard)
        return state
      // Oculto: solo se descarta de la mano por lo que describe la propia carta.
      if (state.treacheries[message.treachery]?.hidden && !message.own) return state
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
        { type: 'Step', step: 'investigationBegins' },
        { type: 'ChooseNextTurn' },
        { type: 'Step', step: 'investigationEnds' },
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

    case 'BoonAcceptAutofail': {
      const index = state.chaosBag.indexOf('autoFail')
      return push(
        { ...state, chaosBag: state.chaosBag.filter((_, n) => n !== index) },
        { type: 'RevealChaosToken', token: 'autoFail' },
      )
    }
    case 'BoonMorrigan':
      return push(state, {
        type: 'Ask',
        investigator: message.investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'boons.morriganPrompt',
          choices: message.candidates.map((card) => ({
            label: 'choice.card',
            params: { card: playerCardDef(card)?.name ?? card },
            then: [
              {
                type: 'BoonWeakness',
                investigator: message.investigator,
                candidates: message.candidates.filter((c) => c !== card),
              },
            ],
          })),
        },
      })
    case 'BoonWeakness': {
      const [index, rng] = nextInt(state.rng, message.candidates.length)
      const card = message.candidates[index]!
      const [deck, shuffledRng] = shuffle(
        [...getInvestigator(state, message.investigator).deck, card],
        rng,
      )
      return updateCampaignLog(
        updateInvestigator({ ...state, rng: shuffledRng }, message.investigator, (i) => ({
          ...i,
          deck,
        })),
        (c) => ({ ...c, values: { ...c.values, ['boonWeakness:' + message.investigator]: card } }),
      )
    }
    case 'BoonDestiny': {
      const i = getInvestigator(state, message.investigator)
      const cards = [...new Set(i.deck)]
      if (!cards.length) return state
      return push(state, {
        type: 'Ask',
        investigator: i.id,
        question: {
          kind: 'chooseOne',
          prompt: 'boons.destinyPrompt',
          choices: cards.map((card) => ({
            label: 'choice.card',
            params: { card: playerCardDef(card)?.name ?? card },
            target: { type: 'hand', code: card },
            then: [{ type: 'BoonKeepCard', investigator: i.id, card }],
          })),
        },
      })
    }
    case 'BoonKeepCard':
      return updateInvestigator(state, message.investigator, (i) => {
        const deck = [...i.deck]
        const index = deck.indexOf(message.card)
        if (index < 0) return i
        deck.splice(index, 1)
        return { ...i, deck, hand: [...i.hand, message.card] }
      })
    case 'BoonOsiris':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        damage: 0,
        horror: 0,
        osirisUsed: true,
        osirisProtected: true,
      }))
    case 'BeginTurn':
      return push(
        updateInvestigator(
          { ...state, activeTurn: message.investigator },
          message.investigator,
          (i) => ({
            ...i,
            turnTaken: true,
            ...(state.boons?.includes('hermes') ? { extraMove: true } : {}),
            ...(i.osirisProtected ? { osirisProtected: false } : {}),
            actionsRemaining: Math.max(
              0,
              ACTIONS_PER_TURN +
                (scenarioBehavior(state.scenarioId)?.actionsModifier?.(state, i.id) ?? 0) -
                (i.nextTurnActionLoss ?? 0),
            ),
            ...(i.nextTurnActionLoss !== undefined ? { nextTurnActionLoss: 0 } : {}),
            movedThisTurn: false,
            actionsTaken: 0,
            extraEvade: investigatorBehavior(i.id)?.extraEvadeAction ?? false,
          }),
        ),
        { type: 'Step', step: 'turnBegins', investigator: message.investigator },
        { type: 'Forced', trigger: { type: 'turnBegins', investigator: message.investigator } },
        { type: 'Step', step: 'takeActions', investigator: message.investigator },
        { type: 'PlayerWindow', investigator: message.investigator },
      )

    case 'PlayerWindow': {
      const investigator = getInvestigator(state, message.investigator)
      if (
        investigator.eliminated ||
        (state.activeTurn === null && investigator.actionsRemaining === 0)
      )
        return state
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
      const abilities: Choice[] = [
        ...fastInvestigatorOptions(state, id).map((o): Choice => ({
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
            again,
          ],
        })),
        ...availableAbilities(state, id).map((a): Choice => ({
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
              ...(a.costs ? { costs: a.costs } : {}),
              ...(a.playFromDiscard ? { playFromDiscard: a.playFromDiscard } : {}),
              then: a.then,
            },
            again,
          ],
        })),
      ]
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
      const frames = state.immediateActions
      if (frames?.length) {
        const root = frames[0]!
        // Ending a temporary "as if" turn cannot end somebody else's actual turn.
        if (root.activeTurn !== message.investigator || root.endedTurn) return state
        state = { ...state, immediateActions: [{ ...root, endedTurn: true }, ...frames.slice(1)] }
      }
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
      return push(
        next,
        { type: 'Step', step: 'turnEnds', investigator: message.investigator },
        ...pending.flatMap((e) => e.then),
        { type: 'Forced', trigger: { type: 'turnEnds', investigator: message.investigator } },
      )
    }

    case 'TakeAction': {
      const investigator = getInvestigator(state, message.investigator)
      const complete: Message = {
        type: 'CompleteAction',
        investigator: investigator.id,
        phase: state.phase,
        round: state.round,
      }
      // La acción adicional de evitar (Trish) se gasta antes que las normales.
      const useMove = !!investigator.extraMove && message.action.kind === 'move'
      const useExtra = !!investigator.extraEvade && isEvadeAction(message.action)
      if (!useExtra && !useMove && investigator.actionsRemaining <= 0) {
        throw new EngineError('No quedan acciones')
      }
      const cost = actionCost(state, investigator.id, message.action)
      const paid = updateInvestigator(state, investigator.id, (i) => ({
        ...(useExtra
          ? { ...i, extraEvade: false }
          : {
              ...i,
              ...(useMove ? { extraMove: false } : {}),
              actionsRemaining: Math.max(0, i.actionsRemaining - cost + (useMove ? 1 : 0)),
            }),
        actionsTaken: (i.actionsTaken ?? 0) + 1,
        roundActions: {
          round: state.round,
          kinds: [...actionsThisRound(state, i.id), message.action.kind],
        },
      }))
      // RR "Attack of Opportunity": tras pagar el coste y antes de resolver la acción.
      // Trench Knife: engage actions of its controller do not provoke.
      const quietEngage =
        message.action.kind === 'engage' &&
        Object.values(state.assets).some(
          (a) =>
            a.owner === investigator.id && playerCardBehavior(a.code)?.engageWithoutOpportunity,
        )
      const attacks =
        !quietEngage && provokesAttacksOfOpportunity(message.action)
          ? opportunityAttacks(state, investigator)
          : []
      // RR, initiating abilities step 2 / attacks of opportunity: resource costs
      // are paid before enemies attack. Reactions cannot spend those resources twice.
      if (message.action.kind === 'play') {
        return push(
          paid,
          {
            type: 'PlayCard',
            investigator: investigator.id,
            code: message.action.card,
            before: attacks,
          },
          complete,
        )
      }
      if (message.action.kind === 'move') {
        if (!canAffordEntry(state, message.action.to))
          throw new EngineError('No hay pistas suficientes para entrar')
        return push(
          paid,
          ...entryCosts(state, investigator.id, message.action.to),
          ...attacks,
          {
            type: 'PerformAction',
            investigator: investigator.id,
            action: message.action,
            entryPaid: true,
          },
          complete,
        )
      }
      return push(
        paid,
        ...attacks,
        {
          type: 'PerformAction',
          investigator: investigator.id,
          action: message.action,
        },
        complete,
      )
    }

    case 'CompleteAction': {
      if (message.phase !== state.phase || message.round !== state.round) return state
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        completedActions: {
          phase: message.phase,
          round: message.round,
          count:
            (i.completedActions?.phase === message.phase &&
            i.completedActions.round === message.round
              ? i.completedActions.count
              : 0) + 1,
        },
      }))
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
          return push(state, { type: 'GainResources', investigator: id, amount: 1, basic: true })
        case 'move': {
          return push(state, {
            type: 'MoveTo',
            investigator: id,
            location: action.to,
            moveAction: true,
            ...(message.entryPaid ? { entryPaid: true } : {}),
          })
        }
        case 'investigate':
          return push(state, {
            type: 'BeginSkillTest',
            basicAction: true,
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
            basicAction: true,
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
            basicAction: true,
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
    case 'GainResources': {
      const gained = updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        resources: i.resources + message.amount,
      }))
      if (message.basic || message.amount <= 0) return gained
      return push(gained, {
        type: 'Forced',
        trigger: {
          type: 'afterGainResources',
          investigator: message.investigator,
          amount: message.amount,
        },
      })
    }

    case 'DrawCards': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated) return state
      const finish = (cards: string[], weaknesses = message.drawnWeaknesses ?? []): Message[] => [
        ...(weaknesses.length
          ? [
              {
                type: 'ShuffleDrawnWeaknesses' as const,
                investigator: investigator.id,
                codes: weaknesses,
              },
            ]
          : []),
        ...(cards.length
          ? [{ type: 'ResolveDrawnRevelations' as const, investigator: investigator.id, cards }]
          : []),
      ]
      if (message.amount <= 0) return push(state, ...finish(message.revelations ?? []))
      if (investigator.deck.length === 0) {
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
        return deck.length === 0
          ? push(reshuffled, horror, ...finish(message.revelations ?? []))
          : push(reshuffled, horror, message)
      }
      const [card, ...deck] = investigator.deck as [string, ...string[]]
      const unresolved = !!message.shuffleWeaknesses && !!playerCardDef(card)?.weakness
      const weaknesses = [...(message.drawnWeaknesses ?? []), ...(unresolved ? [card] : [])]
      const revelations = [
        ...(message.revelations ?? []),
        ...(!unresolved && (playerCardBehavior(card)?.revelation || resolvesWhenDrawn(card))
          ? [card]
          : []),
      ]
      const more: Message[] =
        message.amount > 1
          ? [
              {
                ...message,
                amount: message.amount - 1,
                ...(revelations.length ? { revelations } : {}),
                ...(weaknesses.length ? { drawnWeaknesses: weaknesses } : {}),
              },
            ]
          : finish(revelations, weaknesses)
      return push(
        updateInvestigator(state, investigator.id, (i) => ({
          ...i,
          deck,
          hand: unresolved ? i.hand : [...i.hand, card],
        })),
        { type: 'Forced', trigger: { type: 'afterDrawCard', investigator: investigator.id, card } },
        ...more,
      )
    }

    case 'ShuffleDrawnWeaknesses': {
      const investigator = getInvestigator(state, message.investigator)
      const [deck, rng] = shuffle([...investigator.deck, ...message.codes], state.rng)
      return updateInvestigator({ ...state, rng }, investigator.id, (i) => ({ ...i, deck }))
    }

    case 'ResolveOpeningRevelations':
      return push(
        state,
        ...activeInvestigators(state).map((i): Message => ({
          type: 'ResolveDrawnRevelations',
          investigator: i.id,
          cards: i.hand.filter((code) => !!playerCardBehavior(code)?.revelation),
        })),
      )

    case 'ResolveDrawnRevelations': {
      const hand = getInvestigator(state, message.investigator).hand
      const cards = message.cards.filter((code) => hand.includes(code))
      if (!cards.length) return state
      const choices = [...new Set(cards)].map((code): Choice => ({
        label: 'choice.card',
        params: { card: playerCardDef(code)?.name ?? code },
        then: [
          { type: 'ResolvePlayerRevelation', investigator: message.investigator, code },
          { ...message, cards: cards.filter((_, n) => n !== cards.indexOf(code)) },
        ],
      }))
      return choices.length === 1
        ? push(state, ...choices[0]!.then)
        : push(state, {
            type: 'Ask',
            investigator: message.investigator,
            question: { kind: 'chooseOne', prompt: 'prompt.playerRevelationOrder', choices },
          })
    }

    case 'ResolvePlayerRevelation': {
      const investigator = getInvestigator(state, message.investigator)
      const behavior = playerCardBehavior(message.code)
      const index = investigator.hand.indexOf(message.code)
      if (index < 0 || investigator.eliminated) return state
      if (resolvesWhenDrawn(message.code)) {
        return push(
          updateInvestigator(state, investigator.id, (i) => ({
            ...i,
            hand: i.hand.filter((_, n) => n !== index),
          })),
          { type: 'ResolveWeakness', investigator: investigator.id, code: message.code },
        )
      }
      if (!behavior?.revelation) return state
      const round = Math.max(1, state.round)
      const count = state.dilemmasResolved?.round === round ? state.dilemmasResolved.count : 0
      const canResolve = !behavior.dilemma || count < 2
      const next = updateInvestigator(
        {
          ...state,
          ...(behavior.dilemma && canResolve
            ? { dilemmasResolved: { round, count: count + 1 } }
            : {}),
        },
        investigator.id,
        (i) => ({ ...i, hand: i.hand.filter((_, n) => n !== index) }),
      )
      const effects: Message[] = [
        ...(canResolve ? behavior.revelation(next, investigator.id) : []),
        { type: 'DiscardResolvedRevelation', investigator: investigator.id, code: message.code },
      ]
      return next.skillTest
        ? push(next, { type: 'AfterCurrentSkillTest', then: effects })
        : push(next, ...effects)
    }

    case 'DiscardResolvedRevelation':
      return toOwnerDiscard(state, message.investigator, message.code)

    case 'AfterCurrentSkillTest': {
      if (!state.skillTest) return push(state, ...message.then)
      return {
        ...state,
        skillTest: {
          ...state.skillTest,
          afterEnd: [...(state.skillTest.afterEnd ?? []), ...message.then],
        },
      }
    }

    case 'LoseNextTurnActions':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        nextTurnActionLoss: (i.nextTurnActionLoss ?? 0) + message.amount,
      }))

    case 'TakeImmediateAction': {
      const i = getInvestigator(state, message.investigator)
      if (i.eliminated) return state
      const root = state.immediateActions?.[0]
      const ownTurn = (root ? root.activeTurn : state.activeTurn) === i.id && !root?.endedTurn
      const next = updateInvestigator(
        {
          ...state,
          activeTurn: i.id,
          immediateActions: [
            ...(state.immediateActions ?? []),
            {
              investigator: i.id,
              activeTurn: state.activeTurn ?? null,
              ownTurn,
              actionsRemaining: i.actionsRemaining,
              ...(i.actionsTaken !== undefined ? { actionsTaken: i.actionsTaken } : {}),
              ...(i.movedThisTurn !== undefined ? { movedThisTurn: i.movedThisTurn } : {}),
              ...(i.extraMove !== undefined ? { extraMove: i.extraMove } : {}),
              ...(i.extraEvade !== undefined ? { extraEvade: i.extraEvade } : {}),
              ...(state.turnActionGrants ? { turnActionGrants: state.turnActionGrants } : {}),
            },
          ],
        },
        i.id,
        (current) => ({
          ...current,
          actionsRemaining: (ownTurn ? current.actionsRemaining : 0) + 1,
          actionsTaken: ownTurn ? (current.actionsTaken ?? 0) : 0,
          movedThisTurn: ownTurn ? (current.movedThisTurn ?? false) : false,
          extraMove: false,
          extraEvade: false,
        }),
      )
      return push(
        next,
        { type: 'ImmediateActionWindow', investigator: i.id },
        { type: 'RestoreImmediateAction' },
      )
    }

    case 'ImmediateActionWindow': {
      const id = message.investigator
      const choices: Choice[] = [
        ...availableActions(state, id).map((action): Choice => ({
          ...describeAction(state, id, action),
          then: [{ type: 'TakeAction', investigator: id, action }],
        })),
        ...availableAbilities(state, id)
          .filter((a) => a.actions > 0)
          .map((a): Choice => ({
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
                ...(a.costs ? { costs: a.costs } : {}),
                ...(a.playFromDiscard ? { playFromDiscard: a.playFromDiscard } : {}),
                then: a.then,
              },
            ],
          })),
      ]
      return choices.length
        ? push(state, {
            type: 'Ask',
            investigator: id,
            question: {
              kind: 'chooseOne',
              alwaysAsk: true,
              prompt: 'prompt.immediateAction',
              choices,
            },
          })
        : state
    }

    case 'RestoreImmediateAction': {
      const frames = state.immediateActions ?? []
      const frame = frames[frames.length - 1]
      if (!frame) return state
      const {
        investigator,
        activeTurn,
        turnActionGrants,
        ownTurn: savedOwnTurn,
        endedTurn: _ended,
        ...turn
      } = frame
      // Older saved frames used a single-action budget and must retain their
      // original restore semantics rather than interpreting it as ordinary actions.
      const ownTurn = savedOwnTurn ?? false
      const ended = !!frames[0]!.endedTurn
      const resume =
        (ended && activeTurn === frames[0]!.activeTurn) ||
        (activeTurn && getInvestigator(state, activeTurn).eliminated)
          ? null
          : activeTurn
      // The free action pays the first action cost; extra costs spend ordinary
      // actions (including continuous grants) only during the actor's actual turn.
      let spent = ownTurn
        ? Math.max(0, turn.actionsRemaining - getInvestigator(state, investigator).actionsRemaining)
        : 0
      const grants = turnActionGrants?.map((g) => {
        const used = Math.min(g.remaining, spent)
        spent -= used
        return { ...g, remaining: g.remaining - used }
      })
      const { immediateActions: _frames, turnActionGrants: _grants, ...rest } = state
      return updateInvestigator(
        {
          ...rest,
          activeTurn: resume,
          ...(frames.length > 1 ? { immediateActions: frames.slice(0, -1) } : {}),
          ...(resume && grants ? { turnActionGrants: grants } : {}),
        },
        investigator,
        (i) => {
          const {
            actionsTaken: _taken,
            movedThisTurn: _moved,
            extraMove: _move,
            extraEvade: _evade,
            ...current
          } = i
          return {
            ...current,
            ...turn,
            ...(i.eliminated ? { actionsRemaining: 0, extraMove: false, extraEvade: false } : {}),
            ...(ownTurn && !i.eliminated
              ? {
                  actionsRemaining: ended ? 0 : i.actionsRemaining,
                  ...(i.actionsTaken !== undefined ? { actionsTaken: i.actionsTaken } : {}),
                  ...(i.movedThisTurn !== undefined ? { movedThisTurn: i.movedThisTurn } : {}),
                  ...(i.extraMove || turn.extraMove !== undefined
                    ? { extraMove: !!(i.extraMove || turn.extraMove) }
                    : {}),
                  ...(i.extraEvade || turn.extraEvade !== undefined
                    ? { extraEvade: !!(i.extraEvade || turn.extraEvade) }
                    : {}),
                }
              : {}),
          }
        },
      )
    }

    // ------------------------------------------------- Inicio de la partida
    case 'ChooseLead': {
      // Reglamento, "Setup": el grupo elige al jefe (lo decide el primer jugador).
      const players = activeInvestigators(state)
      const [first] = players
      if (!first || players.length === 1 || !state.interactive) return state
      return push(state, {
        type: 'Ask',
        investigator: first.id,
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.chooseLead',
          choices: players.map((i): Choice => ({
            label: 'choice.investigator',
            params: { name: i.name },
            then: [{ type: 'SetLead', investigator: i.id }],
          })),
        },
      })
    }

    case 'SetLead': {
      // El jefe pasa a ser el primero en orden de jugadores; el resto le sigue en orden.
      const at = state.investigators.findIndex((i) => i.id === message.investigator)
      if (at < 0) return state
      const name = getInvestigator(state, message.investigator).name
      return log(
        {
          ...state,
          investigators: [...state.investigators.slice(at), ...state.investigators.slice(0, at)],
        },
        'log.lead',
        { name },
      )
    }

    // ------------------------------------ Cartas de Historia y apoyos colocados
    case 'PutStoryIntoPlay': {
      const self = { code: message.code, name: message.name, clues: 0 }
      const next = { ...state, stories: { ...(state.stories ?? {}), [message.code]: self } }
      return push(
        log(next, 'log.storyEnters', { name: message.name }),
        ...(storyBehavior(message.code)?.onEnter?.(next, self) ?? []),
      )
    }

    case 'RemoveStory': {
      const { [message.code]: _gone, ...stories } = state.stories ?? {}
      return { ...state, stories }
    }

    case 'PlaceCluesOnStory': {
      const story = state.stories?.[message.code]
      const investigator = getInvestigator(state, message.investigator)
      const amount = Math.min(message.amount, investigator.clues)
      if (!story || amount <= 0) return state
      return updateInvestigator(
        {
          ...state,
          stories: { ...state.stories, [story.code]: { ...story, clues: story.clues + amount } },
        },
        investigator.id,
        (i) => ({ ...i, clues: i.clues - amount }),
      )
    }

    case 'PlaceAsset': {
      const [id, next] = newId(state, 'placed-')
      const placed: PlacedAsset = {
        id,
        code: message.code,
        name: message.name,
        placement: message.placement,
        exhausted: !!message.exhausted,
        damage: message.damage ?? 0,
        horror: message.horror ?? 0,
        ...((message.uses ?? playerCardDef(message.code)?.uses?.count) !== undefined
          ? { uses: message.uses ?? playerCardDef(message.code)!.uses!.count }
          : {}),
        ...(message.doom ? { doom: message.doom } : {}),
        ...(message.clues ? { clues: message.clues } : {}),
        ...(message.faceDown ? { faceDown: true } : {}),
      }
      return { ...next, placedAssets: { ...(next.placedAssets ?? {}), [id]: placed } }
    }

    case 'MovePlacedAsset': {
      const placed = state.placedAssets?.[message.placed]
      if (!placed) return state
      return {
        ...state,
        placedAssets: {
          ...state.placedAssets,
          [placed.id]: { ...placed, placement: message.placement },
        },
      }
    }

    case 'FlipPlacedAsset': {
      // Al ponerse boca arriba, se prepara (Invitado que deja de estar hechizado).
      const placed = state.placedAssets?.[message.placed]
      if (!placed) return state
      const faceDown = !placed.faceDown
      const { faceDown: _was, ...rest } = placed
      return {
        ...state,
        placedAssets: {
          ...state.placedAssets,
          [placed.id]: faceDown ? { ...rest, faceDown: true } : { ...rest, exhausted: false },
        },
      }
    }

    case 'RemovePlacedAsset': {
      const { [message.placed]: _gone, ...placedAssets } = state.placedAssets ?? {}
      return { ...state, placedAssets }
    }

    case 'DamagePlacedAsset': {
      const placed = state.placedAssets?.[message.placed]
      if (!placed || placed.faceDown) return state
      const def = playerCardDef(placed.code)
      const damaged = {
        ...placed,
        damage: placed.damage + message.damage,
        horror: placed.horror + message.horror,
      }
      const next = { ...state, placedAssets: { ...state.placedAssets, [placed.id]: damaged } }
      const defeated =
        (def?.health !== undefined && damaged.damage >= def.health) ||
        (def?.sanity !== undefined && damaged.horror >= def.sanity)
      if (!defeated) return next
      // Un apoyo sin dueño derrotado lo resuelve el escenario (hechizado) o se retira.
      return push(next, {
        type: 'ScenarioSpecific',
        key: 'placedDefeated',
        data: { placed: placed.id },
      })
    }

    case 'TakeControlOfPlaced': {
      const placed = state.placedAssets?.[message.placed]
      if (!placed) return state
      const { [placed.id]: _gone, ...placedAssets } = state.placedAssets ?? {}
      return push(
        { ...state, placedAssets },
        {
          type: 'PutAssetIntoPlay',
          investigator: message.investigator,
          code: placed.code,
          noSlot: true,
          tokens: {
            damage: placed.damage,
            horror: placed.horror,
            exhausted: placed.exhausted,
            ...(placed.uses !== undefined ? { uses: placed.uses } : {}),
            ...(placed.doom ? { doom: placed.doom } : {}),
          },
        },
        {
          type: 'Forced',
          trigger: {
            type: 'afterTakeControlOfPlaced',
            investigator: message.investigator,
            code: placed.code,
          },
        },
      )
    }

    case 'ReleaseAsset': {
      const asset = state.assets[message.asset]
      if (!asset) return state
      const { [asset.id]: _gone, ...assets } = state.assets
      const [id, next] = newId({ ...state, assets }, 'placed-')
      const faceDown = !!message.faceDown
      const placed: PlacedAsset = {
        id,
        code: asset.code,
        name: playerCardDef(asset.code)?.name ?? asset.code,
        placement: message.placement,
        exhausted: asset.exhausted,
        // Al quedar hechizado se retira todo el daño y horror.
        damage: faceDown ? 0 : asset.damage,
        horror: faceDown ? 0 : asset.horror,
        ...(playerCardDef(asset.code)?.uses || asset.uses > 0 ? { uses: asset.uses } : {}),
        ...(asset.doom ? { doom: asset.doom } : {}),
        ...(faceDown ? { faceDown: true } : {}),
      }
      return { ...next, placedAssets: { ...(next.placedAssets ?? {}), [id]: placed } }
    }

    case 'ScenarioSpecific': {
      const behavior = scenarioBehavior(state.scenarioId)
      if (behavior?.specific) return behavior.specific(state, message.key, message.data ?? {})
      // Sin escenario que lo resuelva: un apoyo sin dueño derrotado se retira.
      if (message.key === 'placedDefeated' && typeof message.data?.placed === 'string') {
        return push(state, { type: 'RemovePlacedAsset', placed: message.data.placed })
      }
      return state
    }

    case 'SetScenarioMeta':
      return {
        ...state,
        scenarioMeta: { ...(state.scenarioMeta ?? {}), [message.key]: message.value },
      }

    case 'ConnectLocations': {
      const link = (l: Location, other: LocationId): Location => ({
        ...l,
        extraConnections: [...new Set([...(l.extraConnections ?? []), other])],
      })
      const a = state.locations[message.a]
      const b = state.locations[message.b]
      if (!a || !b) return state
      return recomputeConnections({
        ...state,
        locations: { ...state.locations, [a.id]: link(a, b.id), [b.id]: link(b, a.id) },
      })
    }

    case 'DrawOpeningHand': {
      // Reglamento, "Setup": si robas una debilidad, apártala y roba otra; las
      // apartadas vuelven al mazo después del mulligan.
      if (message.amount <= 0) return state
      const investigator = getInvestigator(state, message.investigator)
      const [card, ...deck] = investigator.deck
      if (card === undefined) return state
      const weakness = !!playerCardDef(card)?.weakness
      const next = updateInvestigator(state, investigator.id, (i) => ({
        ...i,
        deck,
        ...(weakness
          ? { setAsideOpening: [...(i.setAsideOpening ?? []), card] }
          : { hand: [...i.hand, card] }),
      }))
      return push(next, { ...message, amount: message.amount - (weakness ? 0 : 1) })
    }

    case 'InvestigatorsMulligan':
      return push(
        state,
        ...activeInvestigators(state).map((i): Message => ({
          type: 'Mulligan',
          investigator: i.id,
        })),
      )

    case 'Mulligan': {
      // Reglamento, "Setup": cada investigador puede apartar de su mano inicial
      // las cartas que quiera, robar otras tantas y barajar las apartadas.
      const investigator = getInvestigator(state, message.investigator)
      const count = message.count ?? 0
      const finish: Message = { type: 'FinishMulligan', investigator: investigator.id, count }
      const options = [...new Set(investigator.hand)]
      if (!state.interactive) return push(state, finish)
      return push(state, {
        type: 'Ask',
        investigator: investigator.id,
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.mulligan',
          mulligan: true,
          choices: [
            {
              label: count > 0 ? 'choice.mulliganDone' : 'choice.keepHand',
              params: { n: count },
              then: [finish],
            },
            ...options.map((code): Choice => ({
              label: 'choice.mulliganCard',
              params: { card: playerCardDef(code)?.name ?? code },
              target: { type: 'hand', code },
              then: [
                {
                  type: 'MulliganCard',
                  investigator: investigator.id,
                  card: code,
                  count: count + 1,
                },
              ],
            })),
          ],
        },
      })
    }

    case 'MulliganCard': {
      const investigator = getInvestigator(state, message.investigator)
      const at = investigator.hand.indexOf(message.card)
      if (at < 0) return state
      return push(
        updateInvestigator(state, investigator.id, (i) => ({
          ...i,
          hand: [...i.hand.slice(0, at), ...i.hand.slice(at + 1)],
          setAsideOpening: [...(i.setAsideOpening ?? []), message.card],
        })),
        { type: 'Mulligan', investigator: investigator.id, count: message.count },
      )
    }

    case 'FinishMulligan': {
      const investigator = getInvestigator(state, message.investigator)
      if (message.count > 0) {
        return push(
          state,
          { type: 'DrawOpeningHand', investigator: investigator.id, amount: message.count },
          { ...message, count: 0 },
        )
      }
      const aside = investigator.setAsideOpening ?? []
      const next = updateInvestigator(state, investigator.id, (i) => {
        const { setAsideOpening: _done, ...rest } = i
        return { ...rest, deck: [...i.deck, ...aside] }
      })
      if (aside.length === 0) return next
      return push(next, { type: 'ShuffleDeck', investigator: investigator.id })
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
      // Las cartas Ocultas cuentan para el tamaño de mano, pero no se pueden descartar así.
      if (
        investigator.eliminated ||
        investigator.hand.length === 0 ||
        cardsInHand(state, investigator.id) <= handSize(state, investigator.id)
      ) {
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
      const mover = getInvestigator(state, message.investigator)
      if (mover.eliminated || (mover.location && leavingBlocked(state, mover.location)))
        return state
      // Whispers in Your Head (Dread): no puede moverse más de una vez por turno.
      if (mover.location !== null && moveBlocked(state, mover.id)) return state
      getLocation(state, message.location)
      const scenario = scenarioBehavior(state.scenarioId)
      if (scenario?.canEnter?.(state, mover.id, mover.location, message.location) === false)
        return state
      if (!message.checked) {
        const instead = scenario?.beforeMove?.(state, message)
        if (instead) return push(state, ...instead)
      }
      const costs = message.entryPaid
        ? []
        : entryCosts(state, message.investigator, message.location)
      if (costs.length > 0) {
        if (!canAffordEntry(state, message.location)) return state
        return push(state, ...costs, { ...message, entryPaid: true })
      }
      // Los enemigos enfrentados acompañan al investigador.
      const first = !getInvestigator(state, message.investigator).movedThisTurn
      let next = updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        location: message.location,
        movedThisTurn: true,
        ...(state.activeTurn ? { lastMoveTurn: turnStartedAt(state) } : {}),
      }))
      for (const enemy of engagedEnemies(next, message.investigator)) {
        if (enemy.keywords.includes('massive')) continue
        next = updateEnemy(next, enemy.id, (e) => ({ ...e, location: message.location }))
      }
      const reveal: Message[] = getLocation(next, message.location).revealed
        ? []
        : [{ type: 'RevealLocation', location: message.location }]
      const arrival: Message[] = [
        {
          type: 'Forced',
          trigger: { type: 'beforeMoveEngagement', investigator: message.investigator },
        },
        { type: 'CheckEngagement', location: message.location },
        {
          type: 'Forced',
          trigger: {
            type: 'afterMove',
            investigator: message.investigator,
            first,
            from: mover.location,
            ...(message.moveAction ? { moveAction: true } : {}),
          },
        },
      ]
      const beforeEngagement = Object.values(next.assets).some(
        (a) =>
          a.owner === mover.id &&
          playerCardBehavior(a.code)?.reactsBeforeEngagement &&
          !a.exhausted,
      )
      return beforeEngagement
        ? push(next, ...reveal, { type: 'AfterCurrentSkillTest', then: arrival })
        : push(next, ...reveal, ...arrival.slice(1))
    }

    case 'RevealLocation': {
      const wasRevealed = state.locations[message.location]?.revealed ?? true
      const revealed = recomputeConnections(
        updateLocation(state, message.location, (l) =>
          l.revealed
            ? l
            : {
                ...l,
                revealed: true,
                clues: perInvestigator(state, l.clueValue, l.cluesPerInvestigator),
              },
        ),
      )
      // Forzado "cuando/después de revelar…" impreso en la propia localización (Vestíbulo).
      const onReveal = wasRevealed
        ? []
        : (locationBehavior(message.location)?.onReveal?.(
            revealed,
            getLocation(revealed, message.location),
          ) ?? [])
      return onReveal.length ? push(revealed, ...onReveal) : revealed
    }

    case 'DiscoverClues': {
      const investigator = getInvestigator(state, message.investigator)
      const where = message.location ?? investigator.location
      if (where === null || !state.locations[where]) return state
      const location = getLocation(state, where)
      const amount = Math.min(message.amount, location.clues)
      if (amount <= 0 || cluesBlocked(state, investigator.id)) return state
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
            amount,
            last: location.clues - amount === 0,
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
      if (getInvestigator(state, message.investigator).osirisProtected && message.damage > 0)
        return push(state, { ...message, damage: 0 })
      // RR "Damage and Horror": si hay apoyos que puedan recibirlo, el jugador asigna.
      const canSoak =
        !message.direct &&
        soakers(state, message.investigator, 'damage').length +
          soakers(state, message.investigator, 'horror').length +
          placedSoakers(state, message.investigator, 'damage').length +
          placedSoakers(state, message.investigator, 'horror').length >
          0
      if (canSoak) {
        return push(state, {
          type: 'AssignDamage',
          investigator: message.investigator,
          damage: message.damage,
          horror: message.horror,
          ...(message.assignFirst ? { assignFirst: message.assignFirst } : {}),
          ...(message.enemy ? { enemy: message.enemy } : {}),
        })
      }
      const assigned: Message[] = message.dealt?.length
        ? [
            {
              type: 'Forced',
              trigger: {
                type: 'afterDamageAssigned',
                investigator: message.investigator,
                dealt: message.dealt,
                ...(message.enemy ? { enemy: message.enemy } : {}),
              },
            },
          ]
        : []
      if (message.damage === 0 && message.horror === 0) return push(state, ...assigned)
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
            ...(message.enemy ? { enemy: message.enemy } : {}),
          },
        },
        ...assigned,
      )
    }

    case 'AssignDamage': {
      const { investigator, damage, horror } = message
      const kind = damage > 0 ? 'damage' : horror > 0 ? 'horror' : null
      const dealt = message.dealt ?? []
      if (kind === null) {
        return dealt.length
          ? push(state, {
              type: 'Forced',
              trigger: {
                type: 'afterDamageAssigned',
                investigator,
                dealt,
                ...(message.enemy ? { enemy: message.enemy } : {}),
              },
            })
          : state
      }
      const rest = (to: Omit<DamageDealt, 'damage' | 'horror'> | null): Message => {
        const point = { damage: kind === 'damage' ? 1 : 0, horror: kind === 'horror' ? 1 : 0 }
        const same = (d: DamageDealt) =>
          to !== null && d.asset === to.asset && d.placed === to.placed
        const merged = !to
          ? dealt
          : dealt.some(same)
            ? dealt.map((d) =>
                same(d)
                  ? { ...d, damage: d.damage + point.damage, horror: d.horror + point.horror }
                  : d,
              )
            : [...dealt, { ...to, ...point }]
        return {
          type: 'AssignDamage',
          investigator,
          damage: kind === 'damage' ? damage - 1 : damage,
          horror: kind === 'horror' ? horror - 1 : horror,
          ...(message.assignFirst ? { assignFirst: message.assignFirst } : {}),
          ...(message.enemy ? { enemy: message.enemy } : {}),
          ...(merged.length ? { dealt: merged } : {}),
        }
      }
      const available = soakers(state, investigator, kind)
      const trait = message.assignFirst?.[kind]
      const mandatory = trait
        ? available.filter((a) => playerCardDef(a.code)?.traits.includes(trait))
        : []
      const options = mandatory.length ? mandatory : available
      const placedOptions = mandatory.length ? [] : placedSoakers(state, investigator, kind)
      const toInvestigator: Message = {
        type: 'TakeDamage',
        investigator,
        damage: kind === 'damage' ? 1 : 0,
        horror: kind === 'horror' ? 1 : 0,
        direct: true,
        ...(message.enemy ? { enemy: message.enemy } : {}),
      }
      if (options.length === 0 && placedOptions.length === 0) {
        // Lo que queda va al investigador de una vez.
        return push(state, {
          type: 'TakeDamage',
          investigator,
          damage,
          horror,
          direct: true,
          ...(message.enemy ? { enemy: message.enemy } : {}),
          ...(dealt.length ? { dealt } : {}),
        })
      }
      return push(state, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: kind === 'damage' ? 'prompt.assignDamage' : 'prompt.assignHorror',
          choices: [
            ...(mandatory.length
              ? []
              : [
                  {
                    label: 'choice.assignToInvestigator',
                    params: { name: getInvestigator(state, investigator).name },
                    target: { type: 'investigator' as const, id: investigator },
                    then: [toInvestigator, rest(null)],
                  },
                ]),
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
                rest({ asset: a.id }),
              ],
            })),
            ...placedOptions.map((p): Choice => ({
              label: 'choice.assignToAsset',
              params: { card: p.name },
              target: { type: 'placed', id: p.id },
              then: [
                {
                  type: 'DamagePlacedAsset',
                  placed: p.id,
                  damage: kind === 'damage' ? 1 : 0,
                  horror: kind === 'horror' ? 1 : 0,
                },
                rest({ placed: p.id }),
              ],
            })),
          ],
        },
      })
    }

    case 'DamageAsset': {
      const asset = state.assets[message.asset]
      if (!asset) return state
      const def = assetVitals(asset)
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
        ? push(next, { type: 'DiscardAsset', asset: asset.id }, ...after, {
            type: 'Forced',
            trigger: { type: 'assetDefeated', asset: damaged },
          })
        : push(next, ...after)
    }

    // ------------------------------------------------------- Cartas de jugador
    case 'PlayCard': {
      const investigator = getInvestigator(state, message.investigator)
      const def = playerCardDef(message.code)
      const index = investigator.hand.indexOf(message.code)
      if (!def || index < 0) return state
      if (def.type === 'asset' && uniqueAssetInPlay(state, message.code)) return state
      // Cabina de luces: el aumento del coste se suma también a X.
      const costIncrease = cardCost(state, investigator.id, message.code) - (def.cost ?? 0)
      // RR "X": the value is chosen while paying the cost, up to the resources available.
      if (playerCardBehavior(message.code)?.costX && message.x === undefined)
        return push(state, {
          type: 'Ask',
          investigator: investigator.id,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseX',
            choices: Array.from(
              { length: Math.max(1, investigator.resources + 1 - costIncrease) },
              (_, x) => ({
                label: 'choice.payX',
                params: { n: x, card: def.name },
                then: [{ ...message, x }],
              }),
            ),
          },
        })
      const cost =
        message.x !== undefined
          ? message.x + Math.max(0, costIncrease)
          : cardCost(state, investigator.id, message.code, message.discount ?? 0)
      // Si al resolverse ya no se puede pagar (p. ej. se gastaron recursos en una reacción al
      // ataque de oportunidad), la carta no se juega.
      if (cost > investigator.resources) {
        return log(state, 'log.cannotPay', { name: investigator.name, card: def.name })
      }
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
      return push(paid, ...spent, ...(message.before ?? []), {
        type: 'ResolvePlayedCard',
        investigator: investigator.id,
        code: message.code,
        ...(message.effect ? { effect: message.effect } : {}),
        ...(message.x !== undefined ? { x: message.x } : {}),
      })
    }

    case 'ResolvePlayedCard': {
      const investigator = getInvestigator(state, message.investigator)
      const def = playerCardDef(message.code)
      if (!def) return state
      if (investigator.eliminated) {
        return def.type === 'asset' ? toOwnerDiscard(state, investigator.id, message.code) : state
      }
      if (def.type === 'asset') {
        return push(state, {
          type: 'PutAssetIntoPlay',
          investigator: investigator.id,
          code: message.code,
          played: true,
          ...(message.x !== undefined ? { tokens: { uses: message.x } } : {}),
        })
      }
      // Ward of Preservation: el escenario puede cancelar los efectos del evento.
      const cancelled = scenarioBehavior(state.scenarioId)?.eventPlayed?.(
        state,
        investigator.id,
        message.code,
      )
      if (cancelled) return push(state, ...cancelled)
      const effect =
        message.effect ?? playerCardBehavior(message.code)?.play?.(state, investigator.id) ?? []
      return push(state, ...effect)
    }

    case 'PutAssetIntoPlay': {
      // RR "Equipment Slots": si no hay ranura libre, se descarta un apoyo que la ocupe.
      const def = playerCardDef(message.code)
      if (!def) return state
      if (message.fromHand) {
        // "Put into play from your hand" is not playing it: no cost, no play windows.
        const owner = getInvestigator(state, message.investigator)
        const index = owner.hand.indexOf(message.code)
        if (index < 0) return state
        const { fromHand: _taken, ...rest } = message
        return handle(
          updateInvestigator(state, owner.id, (i) => ({
            ...i,
            hand: i.hand.filter((_, n) => n !== index),
          })),
          rest,
        )
      }
      if (uniqueAssetInPlay(state, message.code)) return state
      if (
        playerCardBehavior(message.code)?.limitTitle &&
        Object.values(state.assets).some(
          (a) => a.owner === message.investigator && playerCardDef(a.code)?.name === def.name,
        )
      )
        return state
      const limitedTrait = playerCardBehavior(message.code)?.limitTrait
      if (
        limitedTrait &&
        Object.values(state.assets).some(
          (a) =>
            a.owner === message.investigator &&
            playerCardDef(a.code)?.traits.includes(limitedTrait),
        )
      )
        return state
      const full = (message.noSlot ? [] : (def.slots ?? [])).find(
        (slot) => !slotsFit(state, message.investigator, slot, message.code),
      )
      if (full) {
        const occupying = slotOccupants(state, message.investigator, full, message.code)
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
            ...playerCardBehavior(message.code)?.entersPlayWith,
            ...noSlot,
            ...message.tokens,
          },
        },
      }
      return push(
        placed,
        {
          type: 'Forced',
          trigger: { type: 'afterAssetEntersPlay', investigator: message.investigator, asset: id },
        },
        ...(message.played
          ? [
              {
                type: 'Forced' as const,
                trigger: {
                  type: 'afterPlayAsset' as const,
                  investigator: message.investigator,
                  code: message.code,
                  asset: id,
                },
              },
            ]
          : []),
      )
    }

    case 'ModifyShroud':
      return updateLocation(state, message.location, (l) => ({
        ...l,
        shroudModifier: (l.shroudModifier ?? 0) + message.amount,
      }))

    case 'DiscardAsset': {
      const asset = state.assets[message.asset]
      // Reglamento, "Permanent": no puede abandonar el juego.
      if (!asset || isPermanent(asset.code)) return state
      const instead = scenarioBehavior(state.scenarioId)?.assetLeavesPlay?.(state, asset, 'discard')
      if (instead) return push(state, ...instead)
      const { [asset.id]: _gone, ...assets } = state.assets
      const discarded = updateInvestigator(
        { ...state, assets },
        asset.originalOwner ?? asset.owner,
        (i) => (i.eliminated ? i : { ...i, discard: [...i.discard, asset.code] }),
      )
      const behavior = playerCardBehavior(asset.code)
      // Losing slots can leave other assets without room (Bandolier).
      return behavior?.restrictedSlots || behavior?.extraSlots
        ? push(discarded, { type: 'CheckSlots', investigator: asset.owner })
        : discarded
    }

    case 'CheckSlots': {
      const slot = (Object.keys(SLOT_CAPACITY) as SlotType[]).find(
        (type) => !slotsFit(state, message.investigator, type),
      )
      if (!slot) return state
      const occupying = slotOccupants(state, message.investigator, slot)
      if (!occupying.length) return state
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

    case 'ReadyAsset': {
      const asset = state.assets[message.asset]
      if (asset && assetsCannotReady(state, asset.owner)) return state
      if (asset)
        return { ...state, assets: { ...state.assets, [asset.id]: { ...asset, exhausted: false } } }
      const placed = state.placedAssets?.[message.asset]
      return placed
        ? {
            ...state,
            placedAssets: { ...state.placedAssets, [placed.id]: { ...placed, exhausted: false } },
          }
        : state
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
      // William Bain (rival): los investigadores de su localización no comprometen cartas.
      const noCommit = (id: InvestigatorId) =>
        scenarioBehavior(state.scenarioId)?.cannotCommit?.(state, id) ?? false
      if (test.commitRule === 'discardTop') {
        // Habitación 245: solo la carta superior de tu pila de descartes; nadie más compromete.
        const top = investigator.discard[investigator.discard.length - 1]
        const options =
          top !== undefined &&
          test.committed.length === 0 &&
          !noCommit(investigator.id) &&
          canCommitFrom(state, investigator.id, top, 'discard')
            ? [top]
            : []
        if (options.length === 0 && testOptions(state, test).length === 0 && !state.interactive)
          return state
        return push(state, {
          type: 'Ask',
          investigator: investigator.id,
          question: {
            kind: 'chooseOne',
            alwaysAsk: true,
            prompt: 'prompt.commitCards',
            choices: [
              ...options.map((code): Choice => ({
                label: 'choice.commitFromDiscard',
                params: {
                  card: playerCardDef(code)?.name ?? code,
                  icons: commitIcons(state, test, code, investigator.id, 'discard'),
                },
                then: [
                  {
                    type: 'CommitCard',
                    investigator: investigator.id,
                    code,
                    from: 'discard',
                    toDeckBottom: true,
                  },
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
      const committable = [...new Set(noCommit(investigator.id) ? [] : investigator.hand)].filter(
        (code) =>
          canCommit(state, test, code, investigator.id) &&
          !commitBlocked(state, investigator.id, playerCardDef(code)?.type ?? ''),
      )
      // Cada otro investigador en la misma localización puede comprometer 1 carta.
      const helpers = activeInvestigators(state)
        .filter(
          (o) =>
            o.id !== investigator.id &&
            // RR "Peril": nadie más puede comprometer cartas a esta prueba.
            !(test.tags ?? []).includes('peril') &&
            !noCommit(o.id) &&
            !test.committed.some((c) => c.by === o.id),
        )
        .flatMap((o) =>
          [...new Set(o.hand)]
            .filter((code) => canCommitFrom(state, o.id, code))
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
                icons: commitIcons(state, test, code, investigator.id),
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
                icons: commitIcons(state, test, code, helper.id),
              },
              then: [
                {
                  type: 'Ask',
                  investigator: helper.id,
                  question: {
                    kind: 'chooseOne',
                    alwaysAsk: true,
                    prompt: 'prompt.commitCards',
                    choices: [
                      {
                        label: 'choice.commit',
                        params: {
                          card: playerCardDef(code)?.name ?? code,
                          icons: commitIcons(state, test, code, helper.id),
                        },
                        then: [{ type: 'CommitCard', investigator: helper.id, code }],
                      },
                      { label: 'choice.skip', then: [] },
                    ],
                  },
                },
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

    case 'DiscardTopAndCommit': {
      const investigator = getInvestigator(state, message.investigator)
      const [code, ...deck] = investigator.deck
      if (!code || investigator.eliminated || state.skillTest?.commitRule) return state
      const next = updateInvestigator(state, investigator.id, (i) => ({
        ...i,
        deck,
        discard: [...i.discard, code],
      }))
      return canCommitFrom(next, investigator.id, code, 'discard')
        ? push(next, { type: 'CommitCard', investigator: investigator.id, code, from: 'discard' })
        : next
    }

    case 'CommitCard': {
      const test = state.skillTest
      const investigator = getInvestigator(state, message.investigator)
      const zone = message.from === 'discard' ? 'discard' : 'hand'
      const index =
        zone === 'discard'
          ? investigator.discard.lastIndexOf(message.code)
          : investigator.hand.indexOf(message.code)
      if (!test || index < 0 || !canCommit(state, test, message.code, investigator.id, zone))
        return state
      if (!canCommitFrom(state, investigator.id, message.code, zone)) return state
      return push(
        {
          ...updateInvestigator(state, investigator.id, (i) => ({
            ...i,
            [zone]: i[zone].filter((_, n) => n !== index),
          })),
          skillTest: withCommittedDifficulty({
            ...test,
            committed: [
              ...test.committed,
              {
                code: message.code,
                by: investigator.id,
                ...(message.shuffleAfter ? { fromDiscard: true } : {}),
                ...(message.toDeckBottom ? { toDeckBottom: true } : {}),
              },
            ],
          }),
        },
        ...(playerCardBehavior(message.code)?.onCommit?.(state, investigator.id) ?? []),
        {
          type: 'Forced',
          trigger: { type: 'afterCommit', by: investigator.id, tester: test.investigator },
        },
      )
    }

    case 'Log':
      return log(state, message.key, message.params)

    case 'CheckDefeat': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated) return state
      const vitals = effectiveVitals(state, investigator)
      const byDamage = investigator.damage >= vitals.health
      const byHorror = investigator.horror >= vitals.sanity
      if (!byDamage && !byHorror) return state
      const eliminate: Message = { type: 'DefeatInvestigator', investigator: investigator.id }
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
      const victory = message.victory ? victoryTotal(state) : 0
      const amount = message.amount + victory
      let next = updateRecords(state, message.investigator, (r) => ({ ...r, xp: r.xp + amount }))
      for (const i of state.investigators.filter(
        (i) => !message.investigator || i.id === message.investigator,
      )) {
        next = log(
          {
            ...next,
            experience: [
              ...(next.experience ?? []),
              { investigator: i.id, bonus: message.amount, victory, amount },
            ],
          },
          'log.experience',
          {
            name: i.name,
            bonus: message.amount,
            victory,
            amount,
          },
        )
      }
      return next
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

    case 'EarnReward':
      return updateCampaignLog(state, (c) =>
        c.rewards?.includes(message.code)
          ? c
          : { ...c, rewards: [...(c.rewards ?? []), message.code] },
      )

    case 'AddChaosTokens': {
      const added = log(
        { ...state, chaosBag: [...state.chaosBag, ...message.tokens] },
        'log.chaosTokensAdded',
        { n: message.tokens.length, scenario: state.scenarioId },
      )
      if (message.scenarioOnly) return added
      return updateCampaignLog(added, (c) => ({
        ...c,
        chaosTokens: [...c.chaosTokens, ...message.tokens],
      }))
    }

    case 'PlaceLocationTokens': {
      if (!state.locations[message.location]) return state
      const next = updateLocation(state, message.location, (l) => ({
        ...l,
        horror: Math.max(0, (l.horror ?? 0) + (message.horror ?? 0)),
        doom: Math.max(0, (l.doom ?? 0) + (message.doom ?? 0)),
      }))
      return (message.doom ?? 0) > 0
        ? push(next, { type: 'Forced', trigger: { type: 'afterDoomPlaced' } })
        : discardUnsupported(next)
    }

    case 'DefeatInvestigator': {
      const i = getInvestigator(state, message.investigator)
      const next = state.boons?.includes('persephone')
        ? updateCampaignLog(state, (c) => ({
            ...c,
            investigators: {
              ...c.investigators,
              [i.id]: { ...c.investigators[i.id]!, xp: (c.investigators[i.id]?.xp ?? 0) + 3 },
            },
          }))
        : state
      return push(next, {
        type:
          state.boons?.includes('osiris') && !i.osirisUsed ? 'BoonOsiris' : 'EliminateInvestigator',
        investigator: i.id,
      })
    }

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
      // FAQ (fe de erratas, "Eliminación", paso 0): para sus debilidades la partida ha
      // terminado; se resuelven sus efectos de "cuando termine la partida".
      if (!message.weaknessesDone) {
        const effects = gameEndEffects(state, [investigator.id])
        if (effects.length) return push(state, ...effects, { ...message, weaknessesDone: true })
      }
      if (!message.assetsDone) {
        const effects = Object.values(state.assets)
          .filter((asset) => asset.owner === investigator.id)
          .flatMap(
            (asset) =>
              scenarioBehavior(state.scenarioId)?.assetLeavesPlay?.(
                state,
                asset,
                investigator.resigned ? 'resigned' : 'defeated',
              ) ?? [],
          )
        if (effects.length) return push(state, ...effects, { ...message, assetsDone: true })
      }
      let next = state
      const here = investigator.location
      const act = state.acts[state.actIndex]
      if (investigator.clues > 0 && act && actBehavior(act.code)?.eliminatedCluesToAct) {
        next = { ...next, actClues: (next.actClues ?? 0) + investigator.clues }
      } else if (here !== null && investigator.clues > 0) {
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
      const defeated: Message[] = investigator.resigned
        ? []
        : [
            {
              type: 'Forced',
              trigger: { type: 'investigatorDefeated', investigator: investigator.id },
            },
          ]
      return push(
        next,
        ...(here === null ? [] : [{ type: 'CheckEngagement', location: here } as const]),
        ...defeated,
        { type: 'CheckActObjective' },
      )
    }

    // ------------------------------------------------------ Prueba de habilidad
    case 'BeginSkillTest': {
      if (state.skillTest) {
        // Una prueba que empieza durante otra (p. ej. un plan que avanza a mitad de una
        // prueba) espera a que la actual termine.
        const end = state.queue.findIndex((m) => m.type === 'EndSkillTest')
        if (end < 0) throw new EngineError('Ya hay una prueba de habilidad en curso')
        const queue = [...state.queue]
        queue.splice(end + 1, 0, message)
        return { ...state, queue }
      }
      const investigator = getInvestigator(state, message.investigator)
      const pendingReduction = investigator.nextTestDifficulty
      const reduction =
        pendingReduction?.phase === state.phase && pendingReduction.round === state.round
          ? pendingReduction.amount
          : 0
      if (!message.skillSelected) {
        const replacements = (investigator.roundSkillReplacements ?? []).filter(
          (r) => r.round === state.round && r.from === message.skill,
        )
        const skills = [...new Set([message.skill, ...replacements.map((r) => r.to)])]
        if (skills.length > 1)
          return push(state, {
            type: 'Ask',
            investigator: message.investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseSkill',
              choices: skills.map((skill) => {
                const next = { ...message, skill, skillSelected: true }
                if (skill !== message.skill) {
                  delete next.baseSkill
                  delete next.modifier
                }
                return {
                  label: `choice.test.${skill}`,
                  params: {
                    difficulty: Math.max(
                      0,
                      message.difficulty + enemyStatBonus(state, message.kind) - reduction,
                    ),
                  },
                  then: [next],
                }
              }),
            },
          })
      }
      return push(
        {
          ...updateInvestigator(
            state,
            investigator.id,
            ({ nextTestDifficulty: _used, ...rest }) => rest,
          ),
          skillTest: withCommittedDifficulty({
            ...(message.baseSkill !== undefined ? { baseSkill: message.baseSkill } : {}),
            ...(message.basicAction ? { basicAction: true } : {}),
            investigator: message.investigator,
            skill: message.skill,
            difficulty: Math.max(0, message.difficulty + enemyStatBonus(state, message.kind)),
            ...(reduction > 0 ? { difficultyReduction: reduction } : {}),
            kind: message.kind,
            baseModifier: message.modifier ?? 0,
            ...(message.source ? { source: message.source } : {}),
            ...(message.effectSource ? { effectSource: message.effectSource } : {}),
            ...(message.commitRule ? { commitRule: message.commitRule } : {}),
            tags: message.tags ?? (message.kind.type === 'effect' ? ['scenario'] : []),
            committed: [],
            tokens: [],
            tokenModifier: 0,
            autoFail: false,
            tokenOnFail: [],
            tokenOnFailBy: [],
            modifiedSkill: null,
            succeeded: null,
          }),
        },
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
      if (
        token === 'autoFail' &&
        state.boons?.includes('athena') &&
        !state.athenaUsed?.includes(test.investigator)
      ) {
        const next: GameState = {
          ...state,
          rng,
          athenaUsed: [...(state.athenaUsed ?? []), test.investigator],
          chaosBag: sealed || chosen ? [...state.chaosBag, token] : state.chaosBag,
          ...(sealed
            ? {
                sealed: stillSealed,
                investigators: state.investigators.map((i) =>
                  i.id === sealed.investigator ? { ...i, discard: [...i.discard, sealed.code] } : i,
                ),
              }
            : {}),
          skillTest: {
            ...test,
            ...(message.ignored !== undefined
              ? { ignoredTokens: [...(test.ignoredTokens ?? []), message.ignored] }
              : {}),
          },
        }
        return push(next, {
          type: 'Ask',
          investigator: test.investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'boons.athenaPrompt',
            choices: [
              { label: 'boons.redraw', then: [{ type: 'RevealChaosToken' }] },
              { label: 'boons.keep', then: [{ type: 'BoonAcceptAutofail' }] },
            ],
          },
        })
      }
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
          autoFail: test.autoFail || token === 'autoFail' || !!effect.autoFail,
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
        {
          type: 'Forced',
          trigger: { type: 'afterRevealChaosToken', investigator: test.investigator, token },
        },
        ...(effect.revealAnother ? [{ type: 'RevealChaosToken' } as const] : []),
      )
    }

    case 'ResolveSkillTest': {
      const test = state.skillTest
      if (!test || test.tokens.length === 0) throw new EngineError('Prueba sin ficha revelada')
      const investigator = getInvestigator(state, test.investigator)
      // RR "Skills and Skill Tests": la ficha de fallo automático deja el valor en 0.
      // FAQ: el fallo automático prevalece sobre el éxito automático.
      const modifiedSkill = test.autoFail
        ? 0
        : test.forcedSuccess
          ? test.difficulty
          : Math.max(0, skillTestValue(state).total + test.tokenModifier)
      const succeeded = !test.autoFail && (!!test.forcedSuccess || modifiedSkill >= test.difficulty)
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
      const results: Message[] = [{ type: 'ApplySkillTestResults' }]
      // Paso 6: "después de tener éxito / fallar" va antes de aplicar los resultados
      // (FAQ, orden de resolución de las pruebas de habilidad).
      const determined: Message = {
        type: 'Forced',
        trigger: skillTestTrigger(next.skillTest!, 'afterSkillTest'),
      }
      // En la mesa, el jugador ve el resultado (paso 6) antes de aplicarlo (paso 7).
      if (state.interactive) {
        return push(next, determined, {
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
      return push(next, determined, ...results)
    }

    case 'ApplySkillTestResults': {
      const test = state.skillTest
      if (!test || test.succeeded === null || getInvestigator(state, test.investigator).eliminated)
        return state
      if (!message.prepared && test.source) {
        const asset = state.assets[test.source]
        const before = asset
          ? (playerCardBehavior(asset.code)?.beforeResults?.(state, test, asset) ?? [])
          : []
        if (before.length)
          return push(state, ...before, { type: 'ApplySkillTestResults', prepared: true })
      }
      const failBy = Math.max(0, test.difficulty - (test.modifiedSkill ?? 0))
      const committed = test.committed.flatMap(
        (c) =>
          playerCardBehavior(c.code)?.afterCommittedTest?.(state, test, !!test.succeeded, c.by) ??
          [],
      )
      const tokens = test.succeeded
        ? (test.tokenOnSuccess ?? [])
        : [
            ...test.tokenOnFail,
            ...test.tokenOnFailBy.filter((f) => failBy >= f.atLeast).flatMap((f) => f.then),
          ]
      const results = [...skillTestResults(state, !!test.succeeded, failBy), ...committed]
      return push(
        state,
        ...Array.from({ length: test.succeeded ? (test.resultRepetitions ?? 1) : 1 }).flatMap(
          () => results,
        ),
        ...tokens,
      )
    }

    case 'ModifySkillTest': {
      const test = state.skillTest
      if (!test) return state
      return {
        ...state,
        skillTest: withCommittedDifficulty({
          ...test,
          difficultyFactor: (test.difficultyFactor ?? 1) * (message.difficultyFactor ?? 1),
          ...(message.ignoredEnemyKeywords
            ? {
                ignoredEnemyKeywords: [
                  ...new Set([
                    ...(test.ignoredEnemyKeywords ?? []),
                    ...message.ignoredEnemyKeywords,
                  ]),
                ],
              }
            : {}),
          ...(message.addedEnemyKeywords
            ? {
                addedEnemyKeywords: [
                  ...new Set([...(test.addedEnemyKeywords ?? []), ...message.addedEnemyKeywords]),
                ],
              }
            : {}),
          ...(message.resultRepetitions ? { resultRepetitions: message.resultRepetitions } : {}),
          ...(message.use
            ? {
                abilityCounts: {
                  ...test.abilityCounts,
                  [message.use]: (test.abilityCounts?.[message.use] ?? 0) + 1,
                },
              }
            : {}),
          ...(message.after ? { tokenAfter: [...(test.tokenAfter ?? []), ...message.after] } : {}),
          ...(message.onSuccess
            ? { tokenOnSuccess: [...(test.tokenOnSuccess ?? []), ...message.onSuccess] }
            : {}),
          ...(message.replaceClue && test.kind.type === 'investigate'
            ? { kind: { ...test.kind, replaceClue: true } }
            : {}),
          ...(message.extraDamage && test.kind.type === 'fight'
            ? {
                kind: {
                  ...test.kind,
                  extraDamage: (test.kind.extraDamage ?? 0) + message.extraDamage,
                },
              }
            : {}),
        }),
      }
    }

    case 'PlayerCardEffect':
      return push(
        state,
        ...(playerCardBehavior(message.code)?.effect?.(
          state,
          message.investigator,
          message.step,
          message.data ?? {},
        ) ?? []),
      )

    case 'SpendAdditionalAction': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.eliminated || investigator.actionsRemaining < 1) return state
      return push(
        updateInvestigator(state, investigator.id, (i) => ({
          ...i,
          actionsRemaining: i.actionsRemaining - 1,
        })),
        ...message.then,
      )
    }

    case 'EndCurrentTurn':
      if (state.activeTurn !== message.investigator) return state
      return push(
        {
          ...state,
          queue: state.queue.filter(
            (m) => m.type !== 'PlayerWindow' || m.investigator !== message.investigator,
          ),
        },
        { type: 'EndTurn', investigator: message.investigator },
      )

    case 'EventToVictory': {
      const owner = getInvestigator(state, message.investigator)
      const index = owner.discard.lastIndexOf(message.code)
      if (index < 0) return state
      return updateInvestigator(
        {
          ...state,
          victoryDisplay: [...state.victoryDisplay, message.code],
          victoryPoints: (state.victoryPoints ?? 0) + message.points,
        },
        owner.id,
        (i) => ({ ...i, discard: i.discard.filter((_, n) => n !== index) }),
      )
    }

    case 'TransferResources': {
      const from = getInvestigator(state, message.from),
        to = getInvestigator(state, message.to)
      if (
        from.eliminated ||
        to.eliminated ||
        from.location === null ||
        from.location !== to.location ||
        !Number.isInteger(message.amount) ||
        message.amount < 1 ||
        from.resources < message.amount
      )
        return state
      return updateInvestigator(
        updateInvestigator(state, from.id, (i) => ({
          ...i,
          resources: i.resources - message.amount,
        })),
        to.id,
        (i) => ({ ...i, resources: i.resources + message.amount }),
      )
    }

    case 'TransferAssets': {
      const transfers = message.transfers
      if (new Set(transfers.map((t) => t.asset)).size !== transfers.length) return state
      for (const transfer of transfers) {
        const asset = state.assets[transfer.asset]
        if (!asset || isPermanent(asset.code)) return state
        const from = getInvestigator(state, asset.owner),
          to = getInvestigator(state, transfer.to)
        if (
          from.eliminated ||
          to.eliminated ||
          from.location === null ||
          from.location !== to.location
        )
          return state
      }
      const assets = { ...state.assets }
      for (const transfer of transfers) {
        const asset = assets[transfer.asset]!
        assets[asset.id] = {
          ...asset,
          owner: transfer.to,
          originalOwner: asset.originalOwner ?? asset.owner,
        }
      }
      const proposed = { ...state, assets }
      for (const recipient of new Set(
        transfers.flatMap((t) => [t.to, state.assets[t.asset]!.owner]),
      )) {
        for (const slot of Object.keys(SLOT_CAPACITY) as SlotType[]) {
          if (slotsFit(proposed, recipient, slot)) continue
          const occupying = Object.values(state.assets).filter(
            (a) =>
              a.owner === recipient &&
              !transfers.some((t) => t.asset === a.id) &&
              !isPermanent(a.code) &&
              playerCardDef(a.code)?.slots?.includes(slot),
          )
          if (!occupying.length) return state
          return push(state, {
            type: 'Ask',
            investigator: recipient,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.freeSlot',
              choices: occupying.map((a) => ({
                label: 'choice.discard',
                params: { card: playerCardDef(a.code)?.name ?? a.code },
                then: [{ type: 'DiscardAsset', asset: a.id }, message],
              })),
            },
          })
        }
      }
      return proposed
    }

    case 'EndSkillTest': {
      // RR paso 8: las fichas reveladas vuelven a la bolsa.
      // Las cartas comprometidas van a la pila de descartes de su dueño.
      const test = state.skillTest
      const tokens = [...(test?.tokens ?? []), ...(test?.ignoredTokens ?? [])]
      let next: GameState = { ...state, skillTest: null, chaosBag: [...state.chaosBag, ...tokens] }
      // RR Skill Tests ST.8: one attack, even if its results resolved twice.
      // Record after completion so a committed Hardboiled cannot count itself.
      if (test?.kind.type === 'fight' && test.succeeded)
        next = updateInvestigator(next, test.investigator, (i) => ({
          ...i,
          successfulAttacks: {
            round: state.round,
            count: (i.successfulAttacks?.round === state.round ? i.successfulAttacks.count : 0) + 1,
          },
        }))
      // Iron Sights: the bonus is used by the next fight with that asset, success or not.
      const primed =
        test?.kind.type === 'fight' && test.source ? next.assets[test.source] : undefined
      if (primed?.nextFightBonus) {
        const { nextFightBonus: _used, ...rest } = primed
        next = { ...next, assets: { ...next.assets, [primed.id]: rest } }
      }
      const reshuffle: Message[] = []
      for (const c of test?.committed ?? []) {
        // Habitación 245: va al fondo del mazo de su dueño.
        if (c.toDeckBottom) {
          next = updateInvestigator(next, c.by, (i) =>
            i.eliminated ? i : { ...i, deck: [...i.deck, c.code] },
          )
          continue
        }
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
      if (!test || test.succeeded === null)
        return push(next, ...reshuffle, ...(test?.afterEnd ?? []))
      return push(
        next,
        ...reshuffle,
        ...(test.tokenAfter ?? []),
        {
          type: 'Forced',
          trigger: skillTestTrigger(test, 'skillTestEnded'),
        },
        ...test.committed.flatMap(
          (c) =>
            playerCardBehavior(c.code)?.afterCommittedTestEnds?.(
              next,
              test,
              !!test.succeeded,
              c.by,
            ) ?? [],
        ),
        ...(test.afterEnd ?? []),
      )
    }

    // --------------------------------------------------------------- Enemigos
    case 'EngageEnemy': {
      const investigator = getInvestigator(state, message.investigator)
      if (investigator.location === null || !findEnemy(state, message.enemy)) return state
      if (getEnemy(state, message.enemy).keywords.includes('massive')) return state
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
      // si no (o empate), decide el jefe (FAQ 1.5). Fuera de la mesa, el primero
      // en orden de jugadores.
      const candidates = investigatorsAt(state, message.location)
      if (candidates.length === 0) return state
      let next = state
      const engaged: Message[] = []
      const lead = leadInvestigator(state)
      for (const enemy of enemiesAt(state, message.location)) {
        if (
          enemy.exhausted ||
          enemy.engagedWith !== null ||
          enemyHasKeyword(state, enemy, 'aloof') ||
          enemy.keywords.includes('massive')
        ) {
          continue
        }
        const best = bestByPrey(candidates, enemy.prey)
        const [target] = best
        if (!target) continue
        if (best.length > 1 && state.interactive && lead) {
          engaged.push({
            type: 'Ask',
            investigator: lead.id,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEngaged',
              promptParams: { enemy: enemy.name },
              choices: best.map((i): Choice => ({
                label: 'choice.investigator',
                params: { name: i.name },
                then: [{ type: 'EngageEnemy', enemy: enemy.id, investigator: i.id }],
              })),
            },
          })
          continue
        }
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
      if (
        enemy.spares?.some((s) => s.investigator === investigator.id && s.round === state.round)
      ) {
        return state
      }
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
        skillTest: withCommittedDifficulty({
          ...test,
          committed: test.committed.filter((c) => !back.includes(c)),
        }),
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

    case 'ForEachPointFailed': {
      const failed = state.skillTest ? Math.max(0, -margin(state)) : 0
      return push(state, ...Array.from({ length: failed }, () => message.then).flat())
    }

    case 'IfTestResult': {
      const test = state.skillTest
      if (!test) return state
      // An automatic failure is never a success by 0, whatever the skill value.
      const result = test.succeeded ? margin(state) : Math.min(-1, margin(state))
      const holds =
        (message.atLeast === undefined || result >= message.atLeast) &&
        (message.below === undefined || result < message.below) &&
        (message.exactly === undefined || result === message.exactly) &&
        (message.tokens === undefined || test.tokens.some((t) => message.tokens!.includes(t)))
      return holds ? push(state, ...message.then) : state
    }

    case 'IfEnemyDefeated':
      return state.enemies[message.enemy] ? state : push(state, ...message.then)

    case 'ChooseFromTop': {
      const investigator = getInvestigator(state, message.investigator)
      const top = investigator.deck.slice(0, message.top)
      if (message.picks <= 0 || top.length === 0) {
        // El resto de las cartas miradas: las coloca el jugador o van al fondo del mazo.
        if (message.arrange && top.length > 0) {
          return push(
            updateInvestigator(state, investigator.id, (i) => ({
              ...i,
              deck: i.deck.slice(top.length),
            })),
            { type: 'ArrangeCards', investigator: investigator.id, cards: top },
          )
        }
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
                ...(message.arrange ? { arrange: true } : {}),
              },
            ],
          })),
        },
      })
    }

    case 'ArrangeCards': {
      // Cada carta colocada arriba queda encima de las anteriores; abajo, debajo.
      const [only] = message.cards
      if (only === undefined) return state
      const place = (code: CardCode, where: 'top' | 'bottom'): Message[] => {
        const at = message.cards.indexOf(code)
        return [
          { type: 'PlaceOnDeck', investigator: message.investigator, code, where },
          {
            ...message,
            cards: [...message.cards.slice(0, at), ...message.cards.slice(at + 1)],
          },
        ]
      }
      return push(state, {
        type: 'Ask',
        investigator: message.investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.arrangeCards',
          choices: [...new Set(message.cards)].flatMap((code): Choice[] => {
            const card = playerCardDef(code)?.name ?? code
            return [
              { label: 'choice.placeOnTop', params: { card }, then: place(code, 'top') },
              { label: 'choice.placeOnBottom', params: { card }, then: place(code, 'bottom') },
            ]
          }),
        },
      })
    }

    case 'PlaceOnDeck':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        deck: message.where === 'top' ? [message.code, ...i.deck] : [...i.deck, message.code],
      }))

    case 'PlaceDoomOnEnemy':
      if (state.doomBecomesDamage) return push(state, ...doomAsDamage(state, message.amount))
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
        ...(message.attack === false
          ? []
          : [{ type: 'AttackIfEngaged', enemy: enemy.id } as Message]),
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

    case 'ExhaustEnemy':
      if (!findEnemy(state, message.enemy)) return state
      return updateEnemy(state, message.enemy, (e) => ({ ...e, exhausted: true }))

    case 'ShuffleSetAsideIntoEncounter': {
      const moving = state.setAside.filter((c) => message.codes.includes(c.code))
      const [encounterDeck, rng] = shuffle([...state.encounterDeck, ...moving], state.rng)
      return {
        ...state,
        rng,
        encounterDeck,
        setAside: state.setAside.filter((c) => !message.codes.includes(c.code)),
      }
    }

    case 'MillDeck':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        deck: i.deck.slice(message.amount),
        discard: [...i.discard, ...i.deck.slice(0, message.amount)],
      }))

    case 'HealEnemy':
      return updateEnemy(state, message.enemy, (e) => ({
        ...e,
        damageTaken: Math.max(0, e.damageTaken - message.amount),
      }))

    case 'SpareInvestigator':
      return updateEnemy(state, message.enemy, (e) => ({
        ...e,
        spares: [
          ...(e.spares ?? []).filter((s) => s.round === state.round),
          { investigator: message.investigator, round: state.round },
        ],
      }))

    case 'BlockCardType':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        blockedTypes: [
          ...(i.blockedTypes ?? []).filter((b) => b.round === state.round),
          { cardType: message.cardType, round: state.round },
        ],
      }))

    case 'DiscardCardsOfType': {
      const investigator = getInvestigator(state, message.investigator)
      const ofType = investigator.hand.filter((code) => {
        const def = playerCardDef(code)
        return def?.type === message.cardType && !def.weakness
      })
      if (ofType.length === 0) return state
      if (message.all) {
        return updateInvestigator(state, investigator.id, (i) => ({
          ...i,
          hand: i.hand.filter((c) => !ofType.includes(c)),
          discard: [...i.discard, ...ofType],
        }))
      }
      return push(state, {
        type: 'Ask',
        investigator: investigator.id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseCardToDiscard',
          choices: [...new Set(ofType)].map((code): Choice => ({
            label: 'choice.discard',
            params: { card: playerCardDef(code)?.name ?? code },
            target: { type: 'hand', code },
            then: [{ type: 'DiscardFromHand', investigator: investigator.id, card: code }],
          })),
        },
      })
    }

    case 'KillInvestigators':
      return updateRecords(state, undefined, (r, i) =>
        message.exceptResigned && i.resigned ? r : { ...r, killed: true },
      )

    case 'FlipEnemy': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      return updateEnemy(state, enemy.id, (e) => ({
        ...e,
        ...message.card,
        keywords: [...message.card.keywords],
        maxHealth: perInvestigator(
          state,
          message.card.health,
          message.card.healthPerInvestigator ?? false,
        ),
      }))
    }

    case 'SetAct':
      return { ...state, actIndex: message.index }

    case 'DiscardUntilEnemy': {
      const index = state.encounterDeck.findIndex((c) => c.kind === 'enemy')
      if (index < 0) {
        return {
          ...state,
          encounterDeck: [],
          encounterDiscard: [...state.encounterDiscard, ...state.encounterDeck],
        }
      }
      const card = state.encounterDeck[index]!
      return push(
        {
          ...state,
          encounterDeck: state.encounterDeck.slice(index + 1),
          encounterDiscard: [...state.encounterDiscard, ...state.encounterDeck.slice(0, index)],
        },
        { type: 'ResolveEncounterCard', investigator: message.investigator, card },
      )
    }

    case 'SearchEncounterForTrait': {
      const matches = (c: EncounterCard) =>
        c.kind === 'enemy' && (c.traits ?? []).includes(message.trait)
      const inDeck = state.encounterDeck.findIndex(matches)
      if (inDeck >= 0) {
        const card = state.encounterDeck[inDeck]!
        const [encounterDeck, rng] = shuffle(
          state.encounterDeck.filter((_, n) => n !== inDeck),
          state.rng,
        )
        return push(
          { ...state, encounterDeck, rng },
          { type: 'ResolveEncounterCard', investigator: message.investigator, card },
        )
      }
      const inDiscard = state.encounterDiscard.findIndex(matches)
      if (inDiscard < 0) return state
      const card = state.encounterDiscard[inDiscard]!
      return push(
        { ...state, encounterDiscard: state.encounterDiscard.filter((_, n) => n !== inDiscard) },
        { type: 'ResolveEncounterCard', investigator: message.investigator, card },
      )
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
      if (cluesBlocked(state, message.investigator)) return state
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
        assets: {
          ...state.assets,
          [asset.id]: {
            ...asset,
            uses: Math.min(
              playerCardBehavior(asset.code)?.maxUses ?? Infinity,
              asset.uses + message.amount,
            ),
          },
        },
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

    case 'CancelEnemyAttack': {
      const enemy = findEnemy(state, message.enemy)
      if (enemy && enemyBehavior(enemy.code)?.attacksCannotBeCanceled) return state
      return { ...state, canceledAttack: message.enemy }
    }

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
          // The attacking enemy travels with the damage (Guard Dog, Dimensional Shambler).
          enemy: enemy.id,
          ...(enemyBehavior(enemy.code)?.assignFirst
            ? { assignFirst: enemyBehavior(enemy.code)!.assignFirst }
            : {}),
        },
        ...elusive,
        {
          type: 'Forced',
          trigger: {
            type: 'afterEnemyAttack',
            enemy: enemy.id,
            investigator: message.investigator,
            location: enemy.location,
          },
        },
        ...(message.exhaustAfter
          ? [
              {
                type: 'Forced' as const,
                trigger: {
                  type: 'afterEnemyPhaseAttack' as const,
                  enemy: enemy.id,
                  investigator: message.investigator,
                },
              },
            ]
          : []),
      )
    }

    case 'DamageEnemy': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      const agenda = state.agendas[state.agendaIndex]
      if (
        (agenda && agendaBehavior(agenda.code)?.enemyImmune?.(state, enemy)) ||
        scenarioBehavior(state.scenarioId)?.enemyImmune?.(state, enemy)
      ) {
        return log(state, 'log.enemyImmune', { enemy: enemy.name })
      }
      // Entrometido sobrenatural, Espectro vengativo: cambian el daño que van a recibir.
      const taken = enemyBehavior(enemy.code)?.damageTaken?.(
        state,
        enemy,
        message.amount,
        message.source ?? {},
      )
      const amount = Math.max(0, taken?.amount ?? message.amount)
      if (taken?.then?.length) state = push(state, ...taken.then)
      if (amount <= 0) return state
      const damageTaken = enemy.damageTaken + amount
      const next = updateEnemy(state, enemy.id, (e) => ({ ...e, damageTaken }))
      const by = message.by
      const dealt: Message[] = by
        ? [
            {
              type: 'Forced',
              trigger: {
                type: 'afterDealDamage',
                investigator: by,
                enemy: enemy.id,
                ...(message.source?.attack ? { attack: true } : {}),
              },
            },
          ]
        : []
      return damageTaken >= enemyMaxHealth(state, enemy) && !message.deferDefeat
        ? push(next, ...dealt, { type: 'DefeatEnemy', enemy: enemy.id, ...(by ? { by } : {}) })
        : push(next, ...dealt)
    }

    case 'DefeatAllEnemiesWithoutWindows':
      return push(
        state,
        ...Object.keys(state.enemies).map((enemy): Message => ({
          type: 'DefeatEnemy',
          enemy,
          by: message.by,
          withoutWindows: true,
        })),
      )

    case 'DefeatEnemy': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      const instead = enemyBehavior(enemy.code)?.wouldBeDefeated?.(state, enemy)
      if (instead) return push(state, ...instead)
      // Derrotado, pero en lugar de descartarse sigue en juego (El Extranjero, acto 2).
      const notDiscarded = enemyBehavior(enemy.code)?.insteadOfDiscard?.(state, enemy) ?? null
      const removed = log(
        notDiscarded ? state : removeEnemy(dropAttached(state, enemy), enemy.id),
        'log.enemyDefeated',
        { enemy: enemy.name },
      )
      const next = notDiscarded
        ? push(removed, ...notDiscarded)
        : enemy.owner
          ? toOwnerDiscard(removed, enemy.owner, enemy.code)
          : enemy.victory !== undefined
            ? {
                ...removed,
                victoryDisplay: [...removed.victoryDisplay, enemy.code],
                victoryPoints: (removed.victoryPoints ?? 0) + enemy.victory,
              }
            : { ...removed, encounterDiscard: [...removed.encounterDiscard, enemyCard(enemy)] }
      // Sluice Control defeats all enemies as part of its final resolution, without
      // opening reactions or changing the ending through Elokoss's objective.
      if (message.withoutWindows) return next
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
        { type: 'Step', step: 'enemyBegins' },
        { type: 'Forced', trigger: { type: 'enemyPhaseBegins' } },
        { type: 'Step', step: 'huntersMove' },
        { type: 'HuntersMove' },
        { type: 'Step', step: 'resolveAttacks' },
        { type: 'EnemiesAttack' },
        { type: 'Step', step: 'enemyEnds' },
        { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } },
      )

    case 'HuntersMove': {
      // RR "Hunter": cada enemigo preparado y no enfrentado con cazador se mueve
      // una vez por el camino más corto hacia el investigador más cercano.
      // Con varios caminos posibles, decide el jefe (FAQ 1.5); fuera de la mesa, el primero.
      let next = state
      const destinations = new Set<string>()
      const entered: Message[] = []
      const choices: Message[] = []
      const lead = leadInvestigator(state)
      for (const enemy of Object.values(state.enemies)) {
        if (message.enemies && !message.enemies.includes(enemy.id)) continue
        // Errante (patrol): hacia su localización designada; cazador: hacia el investigador.
        const behavior = enemyBehavior(enemy.code)
        const patrol = behavior?.patrol?.(state, enemy) ?? null
        const hunter = enemy.keywords.includes('hunter') && !behavior?.losesHunter?.(state, enemy)
        if (enemy.exhausted || enemy.engagedWith !== null) continue
        if (!patrol && !hunter) continue
        const steps = patrol ? patrolSteps(state, enemy, patrol) : huntingSteps(state, enemy)
        const [step] = steps
        if (step === undefined) continue
        if (steps.length > 1 && state.interactive && lead) {
          choices.push({
            type: 'Ask',
            investigator: lead.id,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseHunterPath',
              promptParams: { enemy: enemy.name },
              choices: steps.map((location): Choice => ({
                label: 'choice.moveEnemyTo',
                params: { enemy: enemy.name, location: getLocation(state, location).name },
                target: { type: 'location', id: location },
                then: [{ type: 'MoveEnemy', enemy: enemy.id, location }],
              })),
            },
          })
          continue
        }
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
        ...choices,
      )
    }

    case 'EnemiesAttack':
      // RR "The Enemy Phase": en orden de jugadores (el jefe primero); cada
      // investigador elige en qué orden le atacan sus enemigos y cada enemigo se
      // agota tras atacar (un masivo, tras atacar a todos).
      return push(
        state,
        ...activeInvestigators(state).map((i): Message => ({
          type: 'AttacksAgainst',
          investigator: i.id,
          enemies: engagedEnemies(state, i.id).map((e) => e.id),
        })),
        ...Object.values(state.enemies)
          .filter((e) => e.keywords.includes('massive') && !e.exhausted)
          .map((e): Message => ({ type: 'ExhaustEnemy', enemy: e.id })),
      )

    case 'AttacksAgainst': {
      const investigator = getInvestigator(state, message.investigator)
      const ready = message.enemies
        .map((id) => findEnemy(state, id))
        .filter((e): e is Enemy => !!e && !e.exhausted)
      if (investigator.eliminated || ready.length === 0) return state
      const attack = (e: Enemy): Message[] => [
        {
          type: 'EnemyAttack',
          enemy: e.id,
          investigator: investigator.id,
          exhaustAfter: !e.keywords.includes('massive'),
        },
        { ...message, enemies: message.enemies.filter((id) => id !== e.id) },
      ]
      const [only] = ready
      if (ready.length === 1 || !state.interactive) return push(state, ...attack(only as Enemy))
      return push(state, {
        type: 'Ask',
        investigator: investigator.id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseAttackOrder',
          choices: ready.map((e): Choice => ({
            label: 'choice.attackFirst',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: attack(e),
          })),
        },
      })
    }

    // -------------------------------------------------------- Mantenimiento
    case 'UpkeepPhase':
      return push(
        log({ ...state, phase: 'upkeep' }, 'log.phase', { phase: 'upkeep' }),
        { type: 'Step', step: 'upkeepBegins' },
        { type: 'Step', step: 'resetActions' },
        { type: 'Step', step: 'readyExhausted' },
        { type: 'ReadyAll' },
        { type: 'Step', step: 'drawAndGainResource' },
        ...activeInvestigators(state).flatMap((i): Message[] => [
          ...(scenarioBehavior(state.scenarioId)?.skipsUpkeepDraw?.(state, i.id)
            ? []
            : [{ type: 'DrawCards', investigator: i.id, amount: 1 } as Message]),
          {
            type: 'GainResources',
            investigator: i.id,
            amount: 1 + (investigatorBehavior(i.id)?.upkeepResources ?? 0),
            basic: true,
          },
        ]),
        { type: 'Step', step: 'checkHandSize' },
        ...activeInvestigators(state).map((i): Message => ({
          type: 'CheckHandSize',
          investigator: i.id,
        })),
        { type: 'Step', step: 'upkeepEnds' },
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
        Object.entries(state.assets).map(([id, a]) => [
          id,
          assetsCannotReady(state, a.owner)
            ? a
            : {
                ...a,
                exhausted: false,
                ...(a.upgrades
                  ? { upgrades: a.upgrades.map(({ exhausted: _ready, ...u }) => u) }
                  : {}),
              },
        ]),
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
      state = push(clearRoundModifiers(state), { type: 'Forced', trigger: { type: 'roundEnds' } })
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
      const required = cluesToAdvanceAct(state)
      if (required !== null && !message.paid) {
        if (!canAdvanceAct(state)) throw new EngineError('No se puede avanzar el acto')
        // El grupo decide cuántas pistas aporta cada uno (lo elige el jefe).
        return push(
          state,
          {
            type: 'PayGroupClues',
            amount: required,
            from: actContributors(state).map((i) => i.id),
          },
          { ...message, paid: true },
        )
      }
      const onAdvance = actBehavior(act.code)?.onAdvance?.(state) ?? []
      return push(log(state, 'log.actAdvanced', { name: act.name }), ...onAdvance, {
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
    case 'RemoveAssetFromGame': {
      if (!state.assets[message.asset]) return state
      const { [message.asset]: _removed, ...assets } = state.assets
      return { ...state, assets }
    }
    case 'ExhaustUpgrade':
    case 'DiscardUpgrade': {
      const asset = state.assets[message.asset]
      const upgrade = asset?.upgrades?.[message.index]
      if (!asset || !upgrade) return state
      if (message.type === 'ExhaustUpgrade') {
        const upgrades = asset.upgrades!.map((u, n) =>
          n === message.index ? { ...u, exhausted: true } : u,
        )
        return { ...state, assets: { ...state.assets, [asset.id]: { ...asset, upgrades } } }
      }
      const upgrades = asset.upgrades!.filter((_, n) => n !== message.index)
      const { upgrades: _all, ...bare } = asset
      return updateInvestigator(
        {
          ...state,
          assets: { ...state.assets, [asset.id]: upgrades.length ? { ...asset, upgrades } : bare },
        },
        upgrade.owner,
        (i) => (i.eliminated ? i : { ...i, discard: [...i.discard, upgrade.code] }),
      )
    }
    case 'PrimeNextFight': {
      const asset = state.assets[message.asset]
      if (!asset) return state
      return {
        ...state,
        assets: {
          ...state.assets,
          [asset.id]: { ...asset, nextFightBonus: (asset.nextFightBonus ?? 0) + message.amount },
        },
      }
    }
    case 'ClearNextFight': {
      const asset = state.assets[message.asset]
      if (!asset?.nextFightBonus) return state
      const { nextFightBonus: _expired, ...rest } = asset
      return { ...state, assets: { ...state.assets, [asset.id]: rest } }
    }
    case 'BeginAssetAbility':
      return { ...state, resolvingAssets: [...(state.resolvingAssets ?? []), message.asset] }
    case 'EndAssetAbility': {
      const remaining = [...(state.resolvingAssets ?? [])]
      const index = remaining.lastIndexOf(message.asset)
      if (index >= 0) remaining.splice(index, 1)
      if (remaining.length) return { ...state, resolvingAssets: remaining }
      const { resolvingAssets: _done, ...rest } = state
      return rest
    }
    case 'AttachEventToAsset': {
      const asset = state.assets[message.asset]
      const owner = getInvestigator(state, message.investigator)
      const index = owner.discard.lastIndexOf(message.code)
      const controller = asset && state.investigators.find((i) => i.id === asset.owner)
      if (
        !asset ||
        !controller ||
        (message.atLocation
          ? controller.eliminated ||
            owner.location === null ||
            controller.location !== owner.location
          : asset.owner !== owner.id) ||
        (message.limitPerAsset && asset.upgrades?.some((u) => u.code === message.code)) ||
        index < 0 ||
        !playerCardDef(asset.code)?.traits.includes(message.trait)
      )
        return state
      return updateInvestigator(
        {
          ...state,
          assets: {
            ...state.assets,
            [asset.id]: {
              ...asset,
              upgrades: [...(asset.upgrades ?? []), { code: message.code, owner: owner.id }],
            },
          },
        },
        owner.id,
        (i) => ({ ...i, discard: i.discard.filter((_, n) => n !== index) }),
      )
    }
    case 'UseAbility': {
      const investigator = getInvestigator(state, message.investigator)
      const complete: Message[] =
        message.actions > 0
          ? [
              {
                type: 'CompleteAction',
                investigator: investigator.id,
                phase: state.phase,
                round: state.round,
              },
            ]
          : []
      const watching = Object.values(state.assets).some(
        (a) => a.owner === investigator.id && playerCardBehavior(a.code)?.observesActionAbilities,
      )
      const source =
        message.actions > 0 && watching
          ? Object.values(state.assets).find(
              (a) => a.owner === investigator.id && message.key.startsWith(`${a.id}:`),
            )
          : undefined
      const after: Message[] = source
        ? [
            {
              type: 'Forced',
              trigger: {
                type: 'afterActionAbility',
                investigator: investigator.id,
                code: source.code,
              },
            },
          ]
        : []
      if (investigator.actionsRemaining < message.actions)
        throw new EngineError('No quedan acciones')
      const paid = updateInvestigator(
        {
          ...state,
          abilityUses: [
            ...state.abilityUses,
            {
              key: message.key,
              investigator: investigator.id,
              round: state.round,
              ...(message.limit?.per === 'turn' ? { turn: turnStartedAt(state) } : {}),
            },
          ],
        },
        investigator.id,
        (i) => ({
          ...i,
          actionsRemaining: i.actionsRemaining - message.actions,
          actionsTaken: (i.actionsTaken ?? 0) + (message.actions > 0 ? 1 : 0),
        }),
      )
      // Una habilidad de acción provoca ataques de oportunidad (una vez), salvo parlamento/retirarse.
      const attacks =
        message.actions > 0 && message.provokes ? opportunityAttacks(state, investigator) : []
      if (message.playFromDiscard)
        return push(
          paid,
          ...(message.costs ?? []),
          {
            type: 'DiscardToHand',
            investigator: investigator.id,
            code: message.playFromDiscard.code,
          },
          {
            type: 'PlayCard',
            investigator: investigator.id,
            code: message.playFromDiscard.code,
            discount: message.playFromDiscard.discount,
            before: attacks,
          },
          ...message.then,
          ...after,
          ...complete,
        )
      const host = Object.values(state.assets).find((a) => message.key.startsWith(`${a.id}:`))
      return push(
        paid,
        ...(message.costs ?? []),
        ...attacks,
        ...(host ? [{ type: 'BeginAssetAbility' as const, asset: host.id }] : []),
        ...message.then,
        ...(host ? [{ type: 'EndAssetAbility' as const, asset: host.id }] : []),
        ...after,
        ...complete,
      )
    }

    // ------------------------------------------------ Efectos de escenario
    case 'DiscardEnemy': {
      // Descartar no es derrotar: no activa condenado ni "al ser derrotado".
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      const notDiscarded = enemyBehavior(enemy.code)?.insteadOfDiscard?.(state, enemy)
      if (notDiscarded) return push(state, ...notDiscarded)
      const dropped = dropAttached(state, enemy)
      if (enemy.owner)
        return toOwnerDiscard(removeEnemy(dropped, enemy.id), enemy.owner, enemy.code)
      return {
        ...removeEnemy(dropped, enemy.id),
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
      const placed: GameState = {
        ...state,
        setAsideLocations,
        locations: {
          ...state.locations,
          [card.id]: { ...card, connections: [...card.connections], revealed: false, clues: 0 },
        },
      }
      return recomputeConnections(placed)
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

    case 'SpendGroupClues':
      return push(state, {
        type: 'PayGroupClues',
        amount: message.amount,
        from: activeInvestigators(state).map((i) => i.id),
      })

    case 'SpendClues':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        clues: Math.max(0, i.clues - message.amount),
      }))

    case 'PayGroupClues': {
      // Pistas que paga el grupo: si solo hay una forma de pagarlas, se paga; si
      // no, el jefe elige quién gasta cada pista (fuera de la mesa, en orden).
      if (message.amount <= 0) return state
      const payers = message.from
        .map((id) => getInvestigator(state, id))
        .filter((i) => !i.eliminated && i.clues > 0)
      const total = payers.reduce((sum, i) => sum + i.clues, 0)
      const pay = (id: InvestigatorId, n: number): GameState =>
        updateInvestigator(state, id, (i) => ({ ...i, clues: i.clues - n }))
      const [first] = payers
      if (!first) return state
      if (total <= message.amount || payers.length === 1 || !state.interactive) {
        // Todos pagan todo lo que tienen, o paga el único (o el primero) que puede.
        const spent = Math.min(first.clues, message.amount)
        return push(pay(first.id, spent), { ...message, amount: message.amount - spent })
      }
      const lead = leadInvestigator(state) ?? first
      return push(state, {
        type: 'Ask',
        investigator: lead.id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.whoPaysClue',
          promptParams: { n: message.amount },
          choices: payers.map((i): Choice => ({
            label: 'choice.investigatorPaysClue',
            params: { name: i.name, clues: i.clues },
            target: { type: 'investigator', id: i.id },
            then: [
              { type: 'SpendClues', investigator: i.id, amount: 1 },
              { ...message, amount: message.amount - 1 },
            ],
          })),
        },
      })
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
        const fromDeck = message.fromDiscard ? -1 : deck.findIndex((c) => c.code === message.code)
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
      // Se baraja el mazo de encuentros si se ha buscado en él.
      const [shuffled, rng] = message.fromDiscard ? [deck, state.rng] : shuffle(deck, state.rng)
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
      if (getInvestigator(state, message.investigator).eliminated) return state
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
      if (!message.weaknessesDone) {
        const effects = gameEndEffects(
          state,
          activeInvestigators(state).map((i) => i.id),
        )
        if (effects.length) {
          return push({ ...state, queue: [], pending: null }, ...effects, {
            ...message,
            told: true,
            weaknessesDone: true,
          })
        }
      }
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

    case 'RoundSkillReplacement':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        roundSkillReplacements: [
          ...(i.roundSkillReplacements ?? []).filter((b) => b.round === state.round),
          { from: message.from, to: message.to, code: message.code, round: state.round },
        ],
      }))

    case 'ReduceNextTestDifficulty': {
      if (message.phase !== state.phase || message.round !== state.round || message.amount <= 0)
        return state
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        nextTestDifficulty: {
          phase: message.phase,
          round: message.round,
          amount:
            message.amount +
            (i.nextTestDifficulty?.phase === message.phase &&
            i.nextTestDifficulty.round === message.round
              ? i.nextTestDifficulty.amount
              : 0),
        },
      }))
    }
    case 'RoundSkillBonus':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        roundSkillBonuses: [
          ...(i.roundSkillBonuses ?? []).filter((b) => b.round === state.round),
          { skill: message.skill, amount: message.amount, code: message.code, round: state.round },
        ],
      }))

    case 'PhaseSkillBonus':
      return updateInvestigator(state, message.investigator, (i) => ({
        ...i,
        phaseSkillBonuses: [
          ...(i.phaseSkillBonuses ?? []).filter(
            (b) => b.round === state.round && b.phase === state.phase,
          ),
          {
            skill: message.skill,
            amount: message.amount,
            code: message.code,
            phase: state.phase,
            round: state.round,
          },
        ],
      }))

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
      // Habitación 245: solo puede comprometerse la carta superior (y la comprometida antes no).
      if (!test || test.commitRule) return state
      // Share eligibility, onCommit effects and afterCommit triggers with hand commitments.
      return push(state, {
        type: 'CommitCard',
        investigator: message.investigator,
        code: message.code,
        from: 'discard',
        shuffleAfter: true,
      })
    }

    case 'AfterRevealWindow': {
      // Cartas que pueden comprometerse después de revelar las fichas.
      const test = state.skillTest
      if (!test) return state
      const investigator = getInvestigator(state, test.investigator)
      const late = test.commitRule
        ? []
        : [...new Set(investigator.hand)].filter(
            (code) =>
              playerCardBehavior(code)?.commitAfterReveal &&
              canCommit(state, test, code, investigator.id),
          )
      // Va a fallar, y no por la ficha de fallo automático.
      const failing =
        !test.autoFail &&
        !test.forcedSuccess &&
        Math.max(0, skillTestValue(state).total + test.tokenModifier) < test.difficulty
      const saves = failing
        ? [...new Set(investigator.hand)].filter(
            (code) =>
              playerCardBehavior(code)?.playWhenFailing &&
              !playBlocked(state, investigator.id, 'event') &&
              cardCost(state, investigator.id, code) <= investigator.resources,
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
                icons: commitIcons(state, test, code, investigator.id),
              },
              target: { type: 'hand', code },
              then: [{ type: 'CommitCard', investigator: investigator.id, code }],
            })),
            ...saves.map((code): Choice => ({
              label: 'ability.playCard',
              params: { card: playerCardDef(code)?.name ?? code },
              target: { type: 'hand', code },
              then: [
                { type: 'PlayCard', investigator: investigator.id, code },
                { type: 'AfterRevealWindow' },
              ],
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
      if (!asset) {
        const placed = state.placedAssets?.[message.asset]
        if (!placed) return state
        return {
          ...state,
          placedAssets: {
            ...state.placedAssets,
            [placed.id]: {
              ...placed,
              damage: Math.max(0, placed.damage - message.damage),
              horror: Math.max(0, placed.horror - message.horror),
            },
          },
        }
      }
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
      if (!asset || isPermanent(asset.code)) return state
      const { [asset.id]: _gone, ...assets } = state.assets
      return updateInvestigator({ ...state, assets }, asset.originalOwner ?? asset.owner, (i) => ({
        ...i,
        hand: i.eliminated ? i.hand : [...i.hand, asset.code],
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
        if (message.cardType && def?.type !== message.cardType) return false
        if (message.anyCard) return !!def && !def.weakness
        if (!def || (!message.anyType && def.type !== 'asset')) return false
        if (!def.traits.some((t) => message.traits.includes(t))) return false
        if (message.to === 'play') {
          if (def.type !== 'asset') return false
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
          choices: [
            ...matches.map((code): Choice => ({
              label: 'choice.takeCard',
              params: { card: playerCardDef(code)?.name ?? code },
              then: [
                {
                  type: 'TakeFromDeck',
                  investigator: investigator.id,
                  code,
                  to: message.to,
                  ...(message.drawFound ? { drawFound: true } : {}),
                  ...(message.discount ? { discount: message.discount } : {}),
                },
                shuffleDeck,
              ],
            })),
            ...(message.optional ? [{ label: 'choice.skip', then: [shuffleDeck] }] : []),
          ],
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
      if (message.to === 'hand')
        return message.drawFound
          ? push(taken, {
              type: 'Forced',
              trigger: { type: 'afterDrawCard', investigator: investigator.id, card: message.code },
            })
          : taken
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
      if (
        investigator.location === null ||
        leavingBlocked(state, investigator.location) ||
        moveBlocked(state, investigator.id)
      )
        return state
      const options = withinConnections(state, investigator.location, message.range ?? 1).filter(
        (to) =>
          state.locations[to] &&
          canAffordEntry(state, to) &&
          canEnter(state, investigator.id, to) &&
          (!message.revealedOnly || state.locations[to]?.revealed),
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
      const owner = message.investigator ?? treachery?.owner
      if (!treachery || !owner) return state
      const { [treachery.id]: _gone, ...treacheries } = state.treacheries
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
        const customSpawn = enemyBehavior(enemy.code)?.spawn?.(state, investigator.id)
        if (customSpawn !== undefined || enemy.spawnFarthestEmpty) {
          const distances = distancesFrom(state, investigator.location)
          const empty = Object.values(state.locations).filter(
            (l) =>
              distances.has(l.id) &&
              !state.investigators.some((i) => !i.eliminated && i.location === l.id) &&
              !Object.values(state.enemies).some((e) => e.location === l.id),
          )
          const farthest = Math.max(...empty.map((l) => distances.get(l.id)!))
          const places =
            customSpawn !== undefined
              ? customSpawn.flatMap((id) => (state.locations[id] ? [state.locations[id]!] : []))
              : empty.filter((l) => distances.get(l.id) === farthest)
          if (!places.length) return toOwnerDiscard(named, investigator.id, message.code)
          const spawn = (location: string): Message => ({
            type: 'SpawnEnemy',
            card: enemy,
            location,
            engageWith: null,
            owner: investigator.id,
          })
          return push(
            named,
            ...(places.length === 1 || !state.interactive
              ? [spawn(places[0]!.id)]
              : [
                  {
                    type: 'Ask',
                    investigator: leadInvestigator(state)!.id,
                    question: {
                      kind: 'chooseOne',
                      prompt: 'prompt.chooseLocation',
                      choices: places.map((l) => ({
                        label: 'choice.location',
                        params: { location: l.name },
                        target: { type: 'location', id: l.id },
                        then: [spawn(l.id)],
                      })),
                    },
                  } as Message,
                ]),
          )
        }
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

    // ------------------------------------------- Asesinato en el hotel Excelsior
    case 'MoveClues': {
      const available = cluesOn(state, message.from)
      const amount = Math.min(message.amount, available)
      if (amount <= 0) return state
      if (message.to.type === 'investigator' && cluesBlocked(state, message.to.id)) return state
      return setClues(
        setClues(state, message.from, available - amount),
        message.to,
        cluesOn(state, message.to) + amount,
      )
    }

    case 'RemoveDoom': {
      if (message.target.type === 'agenda')
        return { ...state, doom: Math.max(0, state.doom - message.amount) }
      if (message.target.type === 'asset') {
        const asset = state.assets[message.target.id]
        if (!asset) return state
        return {
          ...state,
          assets: {
            ...state.assets,
            [asset.id]: { ...asset, doom: Math.max(0, (asset.doom ?? 0) - message.amount) },
          },
        }
      }
      if (message.target.type === 'investigator')
        return updateInvestigator(state, message.target.id, (i) => ({
          ...i,
          doom: Math.max(0, (i.doom ?? 0) - message.amount),
        }))
      if (!findEnemy(state, message.target.id)) return state
      return updateEnemy(state, message.target.id, (e) => ({
        ...e,
        doom: Math.max(0, (e.doom ?? 0) - message.amount),
      }))
    }

    case 'RemoveAllDoom': {
      const clear = <T extends { doom?: number }>(record: Record<string, T>) =>
        Object.fromEntries(
          Object.entries(record).map(([id, x]) => [id, x.doom ? { ...x, doom: 0 } : x]),
        )
      return discardUnsupported({
        ...state,
        doom: 0,
        investigators: state.investigators.map((i) => (i.doom ? { ...i, doom: 0 } : i)),
        enemies: clear(state.enemies),
        assets: clear(state.assets),
        locations: clear(state.locations),
        ...(state.placedAssets ? { placedAssets: clear(state.placedAssets) } : {}),
      })
    }

    case 'EnemyToVictory': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      const removed = log(removeEnemy(dropAttached(state, enemy), enemy.id), 'log.enemyToVictory', {
        enemy: enemy.name,
      })
      return push(
        {
          ...removed,
          victoryDisplay: [...removed.victoryDisplay, enemy.code],
          victoryPoints: (removed.victoryPoints ?? 0) + (enemy.victory ?? 0),
        },
        { type: 'CheckActObjective' },
      )
    }

    case 'RemoveEnemyFromGame': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy) return state
      return push(
        log(removeEnemy(dropAttached(state, enemy), enemy.id), 'log.enemyRemoved', {
          enemy: enemy.name,
        }),
        { type: 'CheckActObjective' },
      )
    }

    case 'CheckEnemyDefeat': {
      const enemy = findEnemy(state, message.enemy)
      if (!enemy || enemy.damageTaken < enemyMaxHealth(state, enemy)) return state
      return push(state, {
        type: 'DefeatEnemy',
        enemy: enemy.id,
        ...(message.by ? { by: message.by } : {}),
      })
    }

    case 'PlaceAtStart': {
      const lead = leadInvestigator(state)
      return push(
        state,
        ...activeInvestigators(state).map((i): Message => ({
          type: 'MoveTo',
          investigator: i.id,
          location: i.id === lead?.id ? message.lead : message.others,
          checked: true,
        })),
      )
    }

    case 'Story': {
      // Fuera de la mesa, los textos sin decisiones no se muestran.
      if (!state.interactive && !message.choices) return state
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
export function totalDoom(state: GameState): number {
  const onEnemies =
    Object.values(state.enemies).reduce((sum, e) => sum + (e.doom ?? 0), 0) +
    Object.values(state.assets).reduce((sum, a) => sum + (a.doom ?? 0), 0) +
    Object.values(state.locations).reduce((sum, l) => sum + (l.doom ?? 0), 0)
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

/** Descarta las traiciones cuya condición para seguir en juego ya no se cumple. */
function discardUnsupported(state: GameState): GameState {
  return Object.values(state.treacheries).reduce(
    (next, t) =>
      next.treacheries[t.id] && treacheryBehavior(t.code)?.persistsWhile?.(next, t) === false
        ? discardTreachery(next, t.id)
        : next,
    state,
  )
}

/** Cartas que cuentan para el tamaño de mano: la mano y las Ocultas (Bastidores: ×3). */
function cardsInHand(state: GameState, investigator: string): number {
  const hidden = Object.values(state.treacheries).filter(
    (t) =>
      t.hidden && t.placement.type === 'threatArea' && t.placement.investigator === investigator,
  ).length
  const weight = scenarioBehavior(state.scenarioId)?.hiddenHandWeight?.(state, investigator) ?? 1
  return getInvestigator(state, investigator).hand.length + hidden * weight
}

/** Tamaño máximo de mano: 8 más lo que den sus apoyos. */
function handSize(state: GameState, investigator: string): number {
  return Object.values(state.assets)
    .filter((a) => a.owner === investigator)
    .reduce((size, a) => size + (playerCardBehavior(a.code)?.handSize ?? 0), MAX_HAND_SIZE)
}

// RR: Max. An explicit maximum applies to the canonical title, across all editions.
function withinCommitTitleLimit(test: SkillTest, code: string): boolean {
  const def = playerCardDef(code)
  if (!def) return true
  const same = test.committed.map((c) => playerCardDef(c.code)).filter((c) => c?.name === def.name)
  const limits = [def.commitLimit, ...same.map((c) => c?.commitLimit)].filter(
    (limit): limit is number => limit !== undefined,
  )
  return limits.length === 0 || same.length < Math.min(...limits)
}

function withCommittedDifficulty(test: SkillTest): SkillTest {
  if (test.succeeded !== null) return test
  const base = test.baseDifficulty ?? test.difficulty
  const offset = test.committed.reduce(
    (sum, c) => sum + (playerCardBehavior(c.code)?.committedDifficulty ?? 0),
    0,
  )
  return {
    ...test,
    baseDifficulty: base,
    difficulty: Math.max(
      0,
      (base + offset - (test.difficultyReduction ?? 0)) * (test.difficultyFactor ?? 1),
    ),
  }
}

function testEnemyHasKeyword(
  state: GameState,
  test: SkillTest,
  enemy: Enemy,
  keyword: 'alert' | 'retaliate',
): boolean {
  if (keyword === 'retaliate' && test.kind.type === 'fight' && test.kind.ignoreRetaliate)
    return false
  if (test.ignoredEnemyKeywords?.includes(keyword)) return false
  const added = keyword === 'retaliate' && test.kind.type === 'fight' && test.kind.forceRetaliate
  return enemyHasKeyword(
    state,
    added ? { ...enemy, keywords: [...enemy.keywords, keyword] } : enemy,
    keyword,
  )
}

function canCommit(
  state: GameState,
  test: SkillTest,
  code: string,
  by: string,
  zone: 'hand' | 'discard' = 'hand',
): boolean {
  if (test.committed.some((c) => playerCardBehavior(c.code)?.exclusiveCommit)) return false
  if (playerCardBehavior(code)?.exclusiveCommit && test.committed.length > 0) return false
  const def = playerCardDef(code)
  if (
    !def ||
    (commitIcons(state, test, code, by, zone) === 0 &&
      !playerCardBehavior(code)?.commitWithoutIcons)
  )
    return false
  return (
    withinCommitTitleLimit(test, code) &&
    (playerCardBehavior(code)?.canCommit?.(state, test, by) ?? true)
  )
}

/** Full eligibility for an effect committing from a zone other than the hand. */
export function canCommitFrom(
  state: GameState,
  id: string,
  code: string,
  zone: 'hand' | 'discard' = 'hand',
): boolean {
  const test = state.skillTest
  const investigator = getInvestigator(state, id)
  if (!test || investigator.eliminated || !canCommit(state, test, code, id, zone)) return false
  if (scenarioBehavior(state.scenarioId)?.cannotCommit?.(state, id)) return false
  if (commitBlocked(state, id, playerCardDef(code)?.type ?? '')) return false
  return (
    id === test.investigator ||
    (!(test.tags ?? []).includes('peril') &&
      investigator.location !== null &&
      (investigator.location === getInvestigator(state, test.investigator).location ||
        playerCardBehavior(code)?.commitFromLocation?.(state, test, id) === true) &&
      !test.committed.some((c) => c.by === id))
  )
}

/** Margen de la prueba en curso (valor final menos dificultad). */
function margin(state: GameState): number {
  const test = state.skillTest
  return test ? (test.modifiedSkill ?? 0) - test.difficulty : 0
}

/** Abilities and permitted fast events in supported player windows; skip duplicate own-hand plays. */
function fastInvestigatorOptions(state: GameState, skipHandOf?: InvestigatorId): ReactionOption[] {
  const active = activeInvestigators(state)
  return [
    ...active
      .filter(
        (i) =>
          i.id !== skipHandOf &&
          (!state.skillTest?.tags?.includes('peril') || i.id === state.skillTest.investigator),
      )
      .flatMap((i) =>
        playableCards(state, i.id, true)
          .filter((code) => playerCardBehavior(code)?.playInAnyFastWindow)
          .map((code): ReactionOption => ({
            key: `hand-fast:${i.id}:${code}`,
            investigator: i.id,
            label: 'ability.playFastFor',
            params: { name: i.name, card: playerCardDef(code)!.name },
            then: [
              {
                type: 'Ask',
                investigator: i.id,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.fastCard',
                  alwaysAsk: true,
                  choices: [
                    {
                      label: 'ability.playCard',
                      params: { card: playerCardDef(code)!.name },
                      target: { type: 'hand', code },
                      then: [{ type: 'PlayCard', investigator: i.id, code }],
                    },
                    { label: 'choice.skip', then: [] },
                  ],
                },
              },
            ],
          })),
      ),
    // Whispers in Your Head (Anxiety): sin habilidades [fast]; jugar cartas rápidas sí.
    ...[
      ...active.flatMap((i) => investigatorBehavior(i.id)?.fastOptions?.(state, i) ?? []),
      ...Object.values(state.assets)
        .filter((a) => active.some((i) => i.id === a.owner) && !assetsBlocked(state, a.owner))
        .flatMap((a) => playerCardBehavior(a.code)?.fastOptions?.(state, a) ?? []),
    ].filter((o) => !fastAbilitiesBlocked(state, o.investigator)),
  ].filter((o) => withinLimit(state, o.key, o.investigator, o.limit))
}

function testOptions(state: GameState, test: SkillTest): ReactionOption[] {
  const investigator = getInvestigator(state, test.investigator)
  const own = investigatorBehavior(investigator.id)?.testOptions?.(state, test, investigator) ?? []
  const assets = Object.values(state.assets)
    .filter(
      (a) =>
        !assetsBlocked(state, a.owner) &&
        (a.owner === investigator.id ||
          (playerCardBehavior(a.code)?.helpsOtherTests &&
            getInvestigator(state, a.owner).location === investigator.location &&
            !getInvestigator(state, a.owner).eliminated)),
    )
    .flatMap((a) => playerCardBehavior(a.code)?.testOptions?.(state, test, a) ?? [])
  return [...own, ...assets, ...fastInvestigatorOptions(state)].filter((o) =>
    withinLimit(state, o.key, o.investigator, o.limit),
  )
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
      // Languor (blockedTypes) aún no se aplica a los eventos jugados como reacción.
      const type = playerCardDef(code)?.type ?? ''
      if (cardCost(state, i.id, code) > i.resources || treacheryBlocksPlay(state, i.id, type))
        return []
      return playerCardBehavior(code)?.handReactions?.(state, trigger, i.id) ?? []
    }),
  )
  const fromEnemies = Object.values(state.enemies).flatMap(
    (e) => enemyBehavior(e.code)?.reactions?.(state, trigger, e) ?? [],
  )
  const fromPlaced = Object.values(state.placedAssets ?? {})
    .filter((p) => !p.faceDown)
    .flatMap((p) => playerCardBehavior(p.code)?.placedReactions?.(state, trigger, p) ?? [])
  const fromScenario = scenarioBehavior(state.scenarioId)?.reactions?.(state, trigger) ?? []
  return [
    ...fromInvestigators,
    ...fromAssets,
    ...fromHands,
    ...fromEnemies,
    ...fromPlaced,
    ...fromScenario,
  ].filter((o) => !getInvestigator(state, o.investigator).eliminated)
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
    clues: _clues,
    horror: _horror,
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
  const act = state.acts[state.actIndex]
  const fromAct = act ? (actBehavior(act.code)?.forced?.(state, trigger, act) ?? []) : []
  const fromLocations = Object.values(state.locations).flatMap(
    (l) => locationBehavior(l.id)?.forced?.(state, trigger, l) ?? [],
  )
  const fromAssets = Object.values(state.assets).flatMap(
    (a) => playerCardBehavior(a.code)?.forced?.(state, trigger, a) ?? [],
  )
  const fromStories = Object.values(state.stories ?? {}).flatMap(
    (s) => storyBehavior(s.code)?.forced?.(state, trigger, s) ?? [],
  )
  const fromPlaced = Object.values(state.placedAssets ?? {})
    .filter((p) => !p.faceDown)
    .flatMap((p) => playerCardBehavior(p.code)?.placedForced?.(state, trigger, p) ?? [])
  const fromScenario = scenarioBehavior(state.scenarioId)?.forced?.(state, trigger) ?? []
  return [
    ...fromScenario,
    ...fromStories,
    ...fromPlaced,
    ...fromAgenda,
    ...fromAct,
    ...fromEnemies,
    ...fromLocations,
    ...fromTreacheries,
    ...fromAssets,
  ]
}

/**
 * Errante: primeros pasos del camino más corto hacia la localización designada más
 * cercana. Vacío si ya está en una o no puede llegar.
 */
function patrolSteps(state: GameState, enemy: Enemy, targets: LocationId[]): LocationId[] {
  if (targets.length === 0 || targets.includes(enemy.location)) return []
  const distances = distancesFrom(state, enemy.location)
  const reachable = targets.filter((t) => distances.has(t))
  if (reachable.length === 0) return []
  const nearest = Math.min(...reachable.map((t) => distances.get(t) ?? 0))
  const goals = reachable.filter((t) => distances.get(t) === nearest)
  return (state.locations[enemy.location]?.connections ?? []).filter((step) => {
    const fromStep = distancesFrom(state, step)
    return goals.some((g) => fromStep.get(g) === nearest - 1)
  })
}

/** Modificador del escenario al combate o evasión del enemigo de la prueba. */
function enemyStatBonus(state: GameState, kind: SkillTestKind): number {
  if (kind.type !== 'fight' && kind.type !== 'evade') return 0
  const enemy = state.enemies[kind.enemy]
  if (!enemy) return 0
  return (
    attachedStat(state, enemy.id, kind.type) +
    (scenarioBehavior(state.scenarioId)?.enemyStat?.(state, enemy, kind.type) ?? 0)
  )
}

/**
 * Los apoyos vinculados a un enemigo que deja el juego quedan en su localización;
 * las traiciones vinculadas se descartan.
 */
function dropAttached(state: GameState, enemy: Enemy): GameState {
  for (const t of Object.values(state.treacheries)) {
    if (t.placement.type === 'enemy' && t.placement.enemy === enemy.id)
      state = discardTreachery(state, t.id)
  }
  const placed = Object.values(state.placedAssets ?? {}).filter(
    (p) => p.placement.type === 'enemy' && p.placement.enemy === enemy.id,
  )
  if (placed.length === 0) return state
  return {
    ...state,
    placedAssets: {
      ...state.placedAssets,
      ...Object.fromEntries(
        placed.map((p) => [
          p.id,
          { ...p, placement: { type: 'location', location: enemy.location } },
        ]),
      ),
    },
  }
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

/** RR paso 7 de la prueba de habilidad: aplicar los resultados. */
function skillTestResults(state: GameState, succeeded: boolean, failBy: number): Message[] {
  const test = state.skillTest
  if (!test) return []
  const { kind, investigator } = test
  switch (kind.type) {
    case 'effect':
      return succeeded
        ? [
            ...Array.from(
              { length: Math.max(0, margin(state)) },
              () => kind.onSuccessEach ?? [],
            ).flat(),
            ...kind.onSuccess,
          ]
        : [...kind.onFail, ...Array.from({ length: failBy }, () => kind.onFailEach).flat()]
    case 'investigate':
      return succeeded
        ? [
            ...(kind.replaceClue
              ? []
              : [
                  {
                    type: 'DiscoverClues',
                    investigator,
                    amount:
                      1 +
                      (kind.extraClues ?? 0) +
                      test.committed.reduce(
                        (sum, c) =>
                          sum +
                          (playerCardBehavior(c.code)?.committedInvestigationClues?.(
                            state,
                            test,
                            c.by,
                          ) ?? 0),
                        0,
                      ),
                    location: kind.location,
                  } as Message,
                ]),
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
        return [
          ...(kind.noDamage
            ? []
            : [
                {
                  type: 'DamageEnemy',
                  enemy: enemy.id,
                  amount: attackDamage(state, test),
                  by: investigator,
                  source: attackSource(state, test),
                } as Message,
              ]),
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
          kind.failDamagePerPoint !== undefined
            ? Math.min(kind.failDamagePerPoint, failBy)
            : attackDamage(state, test)
        results.push({ type: 'TakeDamage', investigator: enemy.engagedWith, damage, horror: 0 })
      }
      results.push(...(kind.onFail ?? []))
      if (!enemy.exhausted && testEnemyHasKeyword(state, test, enemy, 'retaliate')) {
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
        ...(testEnemyHasKeyword(state, test, enemy, 'alert') && !enemy.exhausted
          ? [{ type: 'EnemyAttack', enemy: enemy.id, investigator, exhaustAfter: false } as const]
          : []),
        ...(kind.onFail ?? []),
      ]
    }
  }
}

/** Pistas sobre una carta (la reserva tiene tantas como haga falta). */
/** Un enemigo de su Lugar le impide descubrir o tomar el control de pistas (Dianne Devine). */
function cluesBlocked(state: GameState, investigator: InvestigatorId): boolean {
  const here = state.investigators.find((i) => i.id === investigator)?.location
  if (here == null) return false
  return Object.values(state.enemies).some(
    (e) => e.location === here && !!enemyBehavior(e.code)?.blocksCluesHere,
  )
}

function cluesOn(state: GameState, holder: ClueHolder): number {
  switch (holder.type) {
    case 'investigator':
      return getInvestigator(state, holder.id).clues
    case 'asset':
      return state.assets[holder.id]?.clues ?? 0
    case 'location':
      return state.locations[holder.id]?.clues ?? 0
    case 'enemy':
      return state.enemies[holder.id]?.clues ?? 0
    case 'treachery':
      return state.treacheries[holder.id]?.clues ?? 0
    case 'placed':
      return state.placedAssets?.[holder.id]?.clues ?? 0
    case 'act':
      return state.actClues ?? 0
    case 'pool':
      return Infinity
  }
}

function setClues(state: GameState, holder: ClueHolder, clues: number): GameState {
  switch (holder.type) {
    case 'investigator':
      return updateInvestigator(state, holder.id, (i) => ({ ...i, clues }))
    case 'asset': {
      const asset = state.assets[holder.id]
      return asset
        ? { ...state, assets: { ...state.assets, [asset.id]: { ...asset, clues } } }
        : state
    }
    case 'location':
      return state.locations[holder.id]
        ? updateLocation(state, holder.id, (l) => ({ ...l, clues }))
        : state
    case 'enemy':
      return state.enemies[holder.id]
        ? updateEnemy(state, holder.id, (e) => ({ ...e, clues }))
        : state
    case 'treachery': {
      const treachery = state.treacheries[holder.id]
      return treachery
        ? {
            ...state,
            treacheries: { ...state.treacheries, [treachery.id]: { ...treachery, clues } },
          }
        : state
    }
    case 'placed': {
      const placed = state.placedAssets?.[holder.id]
      return placed
        ? { ...state, placedAssets: { ...state.placedAssets, [placed.id]: { ...placed, clues } } }
        : state
    }
    case 'act':
      return { ...state, actClues: clues }
    case 'pool':
      return state
  }
}

/**
 * Origen del daño de un ataque: los rasgos del apoyo que lo inicia y los de las
 * etiquetas de la prueba ("spell" → Spell) para los eventos.
 */
function attackSource(state: GameState, test: SkillTest): DamageSource {
  const asset = test.source ? state.assets[test.source] : undefined
  const traits = [
    ...(asset ? (playerCardDef(asset.code)?.traits ?? []) : []),
    ...(test.tags ?? []).map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
  ]
  return { attack: true, traits: [...new Set(traits)] }
}

/** "La perdición pasa a ser daño": 1 daño directo a cada investigador por cada perdición. */
function doomAsDamage(state: GameState, amount: number): Message[] {
  return Array.from({ length: amount }).flatMap(() =>
    activeInvestigators(state).map((i): Message => ({
      type: 'TakeDamage',
      investigator: i.id,
      damage: 1,
      horror: 0,
      direct: true,
    })),
  )
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

/**
 * RR "Attack of Opportunity": cada enemigo preparado enfrentado (y los masivos de
 * su localización) ataca al investigador. No hay ataques en la primera acción
 * del turno si controla un apoyo que lo evita (Dr. Henry Armitage).
 */
function opportunityAttacks(state: GameState, investigator: Investigator): Message[] {
  const safe =
    (investigator.actionsTaken ?? 0) === 0 &&
    Object.values(state.assets).some(
      (a) => a.owner === investigator.id && playerCardBehavior(a.code)?.firstActionSafe,
    )
  if (safe) return []
  return engagedEnemies(state, investigator.id)
    .filter((e) => !e.exhausted && !e.noOpportunityAttacks)
    .filter(
      (e) =>
        !Object.values(state.assets).some(
          (a) =>
            a.owner === investigator.id &&
            playerCardBehavior(a.code)?.ignoresOpportunityAttacks?.(state, a, e),
        ),
    )
    .map((e) => ({
      type: 'EnemyAttack',
      enemy: e.id,
      investigator: investigator.id,
      exhaustAfter: false,
    }))
}

/**
 * Efectos de campaña de las debilidades al terminar la partida para estos
 * investigadores: las que siguen en su zona de amenaza, sus debilidades vinculadas en
 * otro lugar (Buscando a Izzie) y las que tienen en la mano.
 */
function gameEndEffects(state: GameState, investigators: InvestigatorId[]): Message[] {
  return investigators.flatMap((id) => [
    ...Object.values(state.treacheries)
      .filter((t) =>
        t.placement.type === 'threatArea'
          ? t.placement.investigator === id
          : t.placement.type !== 'limbo' && t.owner === id,
      )
      .flatMap((t) => treacheryBehavior(t.code)?.whenGameEnds?.(state, t) ?? []),
    ...[...new Set(getInvestigator(state, id).hand)].flatMap(
      (code) => playerCardBehavior(code)?.whenGameEndsInHand?.(state, id) ?? [],
    ),
  ])
}

/** Disparador con los datos de una prueba ya resuelta (pasos 6 y 8). */
function skillTestTrigger(
  test: SkillTest,
  type: 'afterSkillTest' | 'skillTestEnded',
): Extract<Trigger, { type: 'afterSkillTest' | 'skillTestEnded' }> {
  return {
    type,
    investigator: test.investigator,
    kind: test.kind.type,
    succeeded: !!test.succeeded,
    margin: (test.modifiedSkill ?? 0) - test.difficulty,
    ...(test.kind.type === 'fight' || test.kind.type === 'evade' ? { enemy: test.kind.enemy } : {}),
    ...(test.kind.type === 'investigate' ? { location: test.kind.location } : {}),
    ...(test.source ? { source: test.source } : {}),
  }
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
      (total, a) =>
        total +
        (playerCardBehavior(a.code)?.permanent?.slots?.[slot] ?? 0) +
        (playerCardBehavior(a.code)?.extraSlots?.[slot] ?? 0),
      SLOT_CAPACITY[slot],
    )
}

const count = <T>(items: T[], item: T) => items.filter((x) => x === item).length

/** Additional slots of a type that only assets with one of the traits may use (Bandolier). */
export function restrictedSlotCapacity(
  state: GameState,
  investigator: InvestigatorId,
  slot: SlotType,
): { trait: string | string[]; count: number }[] {
  return Object.values(state.assets)
    .filter((a) => a.owner === investigator)
    .flatMap((a) => playerCardBehavior(a.code)?.restrictedSlots ?? [])
    .filter((r) => r.slot === slot)
    .map(({ trait, count }) => ({ trait, count }))
}

/**
 * RR "Equipment Slots": every slot unit of the investigator's assets (plus the
 * card about to enter play) fits a generic slot or a restricted one whose trait
 * the asset has.
 */
function slotsFit(
  state: GameState,
  investigator: InvestigatorId,
  slot: SlotType,
  adding?: CardCode,
): boolean {
  const units = Object.values(state.assets)
    .filter((a) => a.owner === investigator && !a.noSlot)
    .flatMap((a) =>
      assetSlots(a)
        .filter((s) => s === slot)
        .map(() => playerCardDef(a.code)?.traits ?? []),
    )
  if (adding) {
    const def = playerCardDef(adding)
    for (let n = count(def?.slots ?? [], slot); n > 0; n--) units.push(def?.traits ?? [])
  }
  const restricted = restrictedSlotCapacity(state, investigator, slot)
  const free = restricted.map((r) => r.count)
  const place = (n: number, generic: number): boolean => {
    if (n === units.length) return true
    for (const [k, r] of restricted.entries()) {
      if (!free[k] || ![r.trait].flat().some((t) => units[n]!.includes(t))) continue
      free[k]!--
      const placed = place(n + 1, generic)
      free[k]!++
      if (placed) return true
    }
    return generic > 0 && place(n + 1, generic - 1)
  }
  return place(0, slotCapacity(state, investigator, slot))
}

/**
 * Assets to offer when a slot overflows. With restricted slots (Bandolier), only
 * those whose discard makes room, when any does; otherwise every occupant, as before.
 */
function slotOccupants(
  state: GameState,
  investigator: InvestigatorId,
  slot: SlotType,
  adding?: CardCode,
): Asset[] {
  const occupying = Object.values(state.assets).filter(
    (a) => a.owner === investigator && !isPermanent(a.code) && assetSlots(a).includes(slot),
  )
  if (!restrictedSlotCapacity(state, investigator, slot).length) return occupying
  const freeing = occupying.filter((a) => {
    const { [a.id]: _gone, ...assets } = state.assets
    return slotsFit({ ...state, assets }, investigator, slot, adding)
  })
  return freeing.length ? freeing : occupying
}

function commitIcons(
  state: GameState,
  test: SkillTest,
  code: string,
  by: string,
  zone: 'hand' | 'discard' | 'committed' = 'hand',
): number {
  return Math.max(
    0,
    matchingIcons(playerCardDef(code)?.icons, test.skill) +
      matchingIcons(playerCardBehavior(code)?.additionalIcons?.(state, test, by, zone), test.skill),
  )
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
      const behavior = playerCardBehavior(a.code)
      const guards =
        ((kind === 'damage' && behavior?.soaksForOthers) || behavior?.soaksAtLocation) &&
        here !== null &&
        other.location === here
      if (!guards) return false
    }
    const def = assetVitals(a)
    return kind === 'damage'
      ? def?.health !== undefined && a.damage < def.health
      : def?.sanity !== undefined && a.horror < def.sanity
  })
}

/**
 * Apoyos sin dueño que pueden recibir el daño u horror de los investigadores de su
 * localización (Sargento Monroe en el Vestíbulo).
 */
function placedSoakers(
  state: GameState,
  investigator: string,
  kind: 'damage' | 'horror',
): PlacedAsset[] {
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  return Object.values(state.placedAssets ?? {}).filter((p) => {
    if (p.faceDown || !playerCardBehavior(p.code)?.soaksAtLocation) return false
    if (placedLocation(state, p) !== here) return false
    const def = playerCardDef(p.code)
    return kind === 'damage'
      ? def?.health !== undefined && p.damage < def.health
      : def?.sanity !== undefined && p.horror < def.sanity
  })
}

/** Additional costs for entering an unrevealed location, including effect movement. */
function entryCosts(
  state: GameState,
  investigator: InvestigatorId,
  location: LocationId,
): Message[] {
  const clues = entryCost(state, location)
  const place = getLocation(state, location)
  const horror = place.revealed ? 0 : (place.enterHorror ?? 0)
  return [
    ...(clues ? [{ type: 'SpendGroupClues' as const, amount: clues }] : []),
    ...(horror ? [{ type: 'TakeDamage' as const, investigator, damage: 0, horror }] : []),
  ]
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
  sources: { name: string; amount: number }[]
  total: number
} {
  const test = state.skillTest
  if (!test) return { base: 0, modifier: 0, icons: 0, passive: 0, sources: [], total: 0 }
  const investigator = getInvestigator(state, test.investigator)
  const icons = test.committed.reduce(
    (sum, c) => sum + commitIcons(state, test, c.code, c.by, 'committed'),
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
  const base = test.baseSkill ?? investigator.skills[test.skill]
  const scenario = scenarioBehavior(state.scenarioId)?.skillModifier?.(state, test) ?? 0
  const resolving =
    resolvingSkillBonus(state, investigator.id) + attachedAttackSkillBonus(state, test)
  const phaseSources = (investigator.phaseSkillBonuses ?? [])
    .filter((b) => b.phase === state.phase && b.round === state.round && b.skill === test.skill)
    .map((b) => ({ name: playerCardDef(b.code)?.name ?? b.code, amount: b.amount }))
  phaseSources.push(
    ...(investigator.roundSkillBonuses ?? [])
      .filter((b) => b.round === state.round && b.skill === test.skill)
      .map((b) => ({
        name: playerCardDef(b.code)?.name ?? b.code,
        amount: b.amount === 'horror' ? investigator.horror : b.amount,
      })),
  )
  const phaseBonus = phaseSources.reduce((sum, b) => sum + b.amount, 0)
  const effectBonus = test.effectSource
    ? (playerCardBehavior(test.effectSource)?.effectSkillModifier?.(state, test) ?? 0)
    : 0
  const sources = [
    ...(test.effectSource
      ? [{ name: playerCardDef(test.effectSource)?.name ?? test.effectSource, amount: effectBonus }]
      : []),
    ...phaseSources,
    ...Object.values(state.assets)
      .filter((a) => a.owner === investigator.id)
      .map((a) => ({
        name: playerCardDef(a.code)?.name ?? a.code,
        amount: playerCardBehavior(a.code)?.skillModifier?.(state, a, test) ?? 0,
      })),
    ...(investigator.location === null
      ? []
      : enemiesAt(state, investigator.location).map((e) => ({
          name: e.name,
          amount: enemyBehavior(e.code)?.skillModifier?.(state, e, test) ?? 0,
        }))),
  ].filter((s) => s.amount !== 0)
  return {
    base,
    modifier: test.baseModifier,
    icons,
    sources,
    passive: passive + auras + scenario + resolving + phaseBonus + effectBonus,
    total:
      base +
      test.baseModifier +
      icons +
      passive +
      auras +
      scenario +
      resolving +
      phaseBonus +
      effectBonus,
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
