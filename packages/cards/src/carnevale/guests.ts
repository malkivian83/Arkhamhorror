import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  placedLocation,
  push,
  registerLocation,
  registerPlayerCard,
  registerPlayerCards,
  spendableClues,
  type AbilityOption,
  type GameState,
  type Message,
} from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import {
  canLook,
  here,
  investigatorsAt,
  masked,
  MASKED_CODES,
  onSpecific,
  specific,
} from './helpers'
import { C } from './setup'
import { SERVITORS } from './servitors'

registerPlayerCards([
  ...MASKED_CODES.map((code) => ({
    code,
    name: 'Masked Carnevale-Goer',
    type: 'asset' as const,
    class: 'neutral',
    traits: ['Carnevale'],
    slots: [],
    story: true,
  })),
  {
    code: C.innocent,
    name: 'Innocent Reveler',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally', 'Bystander', 'Carnevale'],
    slots: [],
    health: 2,
    sanity: 2,
    story: true,
  },
])

export const lookAbilities: NonNullable<import('@lcg/engine').ActBehavior['abilities']> = (
  state,
  _self,
  investigator,
) => {
  const eligible = masked(state).filter((p) => canLook(state, p))
  const payers = activeInvestigators(state)
  const cost = state.startingInvestigatorCount
  if (!eligible.length || payers.reduce((sum, i) => sum + spendableClues(state, i.id), 0) < cost)
    return []
  return [
    {
      key: 'carnevale:look',
      label: 'ability.carnevale.look',
      params: { clues: cost },
      actions: 1,
      provokes: true,
      costs: [{ type: 'PayGroupClues', amount: cost, from: payers.map((i) => i.id) }],
      then: [specific('carnevaleChooseLook', { investigator })],
    },
  ]
}

onSpecific('carnevaleChooseLook', (state, data) => {
  const eligible = masked(state).filter((p) => canLook(state, p))
  return push(state, {
    type: 'Ask',
    investigator: String(data.investigator),
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.carnevale.chooseLook',
      choices: eligible.map((p) => ({
        label: 'choice.location',
        params: { location: state.locations[placedLocation(state, p)!]?.name ?? '' },
        target: { type: 'placed' as const, id: p.id },
        then: [
          specific('carnevaleLook', { placed: p.id, investigator: String(data.investigator) }),
        ],
      })),
    },
  })
})

/** No usa FlipPlacedAsset: ese mensaje solo cambia la orientación, no la identidad. */
onSpecific('carnevaleFlip', (state, data) => {
  const p = state.placedAssets?.[String(data.placed)]
  if (!p || !MASKED_CODES.includes(p.code)) return state
  const location = placedLocation(state, p)
  if (!location) return state
  const code = p.code.slice(0, -1)
  const { [p.id]: _old, ...placedAssets } = state.placedAssets ?? {}
  if (code === C.innocent) {
    // Misma instancia física; los tres inocentes comparten código, no identificador.
    return {
      ...state,
      placedAssets: {
        ...placedAssets,
        [p.id]: { ...p, code, name: 'Innocent Reveler', faceDown: false },
      },
    }
  }
  const card = SERVITORS[code]
  if (!card) return state
  return push(
    { ...state, placedAssets },
    {
      type: 'SpawnEnemy',
      card,
      location,
      engageWith: null,
      after:
        data.attack === true
          ? [
              specific('carnevaleServitorAttacks', {
                code,
                location,
                remaining: investigatorsAt(state, location)
                  .map((i) => i.id)
                  .join(','),
              }),
            ]
          : [],
    },
  )
})

/** El jefe decide el orden de efectos simultáneos; las víctimas quedan fijadas al descubrirlo. */
onSpecific('carnevaleServitorAttacks', (state, data) => {
  const enemy = Object.values(state.enemies).find((e) => e.code === data.code)
  const remaining = String(data.remaining)
    .split(',')
    .filter((id) => state.investigators.some((i) => i.id === id && !i.eliminated))
  if (!enemy || !remaining.length) return state
  const chooser = leadInvestigator(state)?.id ?? remaining[0]!
  const choices = remaining.map((id) => ({
    label: 'choice.investigator',
    params: { name: getInvestigator(state, id).name },
    target: { type: 'investigator' as const, id },
    then: [
      {
        type: 'EnemyAttack' as const,
        enemy: enemy.id,
        investigator: id,
        exhaustAfter: false,
        evenIfExhausted: true,
      },
      specific('carnevaleServitorAttacks', {
        ...data,
        remaining: remaining.filter((other) => other !== id).join(','),
      }),
    ],
  }))
  return choices.length === 1
    ? push(state, ...choices[0]!.then)
    : push(state, {
        type: 'Ask',
        investigator: chooser,
        question: { kind: 'chooseOne', prompt: 'prompt.carnevale.attackOrder', choices },
      })
})

/** Mirar mantiene la carta enmascarada; el reverso de Elisabetta ordena descubrirla. */
onSpecific('carnevaleLook', (state, data) => {
  const p = state.placedAssets?.[String(data.placed)]
  if (!p || !MASKED_CODES.includes(p.code) || !canLook(state, p)) return state
  const code = p.code.slice(0, -1)
  return push(state, {
    type: 'Ask',
    investigator: String(data.investigator),
    question: {
      kind: 'chooseOne',
      alwaysAsk: true,
      prompt: 'prompt.carnevale.look',
      choices: [
        {
          label: `choice.carnevale.identity.${code}`,
          then: code === C.magro ? [specific('carnevaleFlip', { placed: p.id })] : [],
        },
      ],
    },
  })
})

/** Disponible aunque el apoyo esté boca abajo en el estado técnico. */
export function guestAbilities(state: GameState, investigator: string): AbilityOption[] {
  const me = getInvestigator(state, investigator)
  if (me.location === null || spendableClues(state, investigator) < 1) return []
  return masked(state)
    .filter((p) => here(state, p, investigator))
    .map((p) => ({
      key: `${p.id}:unmask`,
      label: 'ability.carnevale.unmask',
      actions: 1,
      provokes: true,
      target: { type: 'placed', id: p.id },
      costs: [{ type: 'SpendClues', investigator, amount: 1 }],
      then: [specific('carnevaleFlip', { placed: p.id, attack: true })],
    }))
}

function underDeck(state: GameState, p: { code: string }, rescued: boolean): GameState {
  const key = rescued ? 'carnevaleRescued' : 'carnevaleSacrificed'
  return {
    ...state,
    scenarioDecks: {
      ...state.scenarioDecks,
      [key]: [...(state.scenarioDecks?.[key] ?? []), p.code],
    },
  }
}

/** Rescatar no descarta. Sacrificar sustituye un descarte y nunca vuelve a descartarlo. */
onSpecific('carnevaleInnocentLeaves', (state, data) => {
  const asset = state.assets[String(data.asset)]
  const p = state.placedAssets?.[String(data.placed)]
  const card = asset ?? p
  if (!card || card.code !== C.innocent) return state
  const saved = data.rescue === true
  const discarded = !saved && data.placementOnly !== true
  let next = state
  if (asset) {
    const { [asset.id]: _gone, ...assets } = state.assets
    next = { ...next, assets }
  } else if (p) {
    const { [p.id]: _gone, ...placedAssets } = state.placedAssets ?? {}
    next = { ...next, placedAssets }
  }
  next = underDeck(next, card, saved)
  return push(
    next,
    {
      type: 'Log',
      key: saved
        ? 'log.carnevale.rescued'
        : discarded
          ? 'log.carnevale.sacrificed'
          : 'log.carnevale.underAgenda',
    },
    ...(discarded
      ? activeInvestigators(state).map((i): Message => ({
          type: 'TakeDamage',
          investigator: i.id,
          damage: 0,
          horror: 1,
        }))
      : []),
    { type: 'CheckActObjective' },
  )
})

onSpecific('placedDefeated', (state, data) => {
  const p = state.placedAssets?.[String(data.placed)]
  return p?.code === C.innocent
    ? push(state, specific('carnevaleInnocentLeaves', { placed: p.id }))
    : push(state, { type: 'RemovePlacedAsset', placed: String(data.placed) })
})

registerPlayerCard({
  code: C.innocent,
  leavesPlay: (_state, asset) => [specific('carnevaleInnocentLeaves', { asset: asset.id })],
  placedAbilities: (_state, self, investigator) => [
    {
      key: `${self.id}:parley`,
      label: 'ability.carnevale.parley',
      actions: 1,
      provokes: false,
      parley: true,
      target: { type: 'placed', id: self.id },
      then: [
        {
          ...effectTest(investigator, C.innocent, 'intellect', 2, {
            onSuccess: [
              { type: 'TakeControlOfPlaced', placed: self.id, investigator, noSlot: true },
            ],
          }),
          tags: ['parley'],
        },
      ],
    },
  ],
})

registerLocation({
  code: C.basilica,
  abilities: (state, _self, investigator) =>
    Object.values(state.assets)
      .filter((a) => a.code === C.innocent && a.owner === investigator)
      .map((a) => ({
        key: `${a.id}:rescue`,
        label: 'ability.carnevale.rescue',
        actions: 1,
        provokes: true,
        target: { type: 'asset' as const, id: a.id },
        then: [specific('carnevaleInnocentLeaves', { asset: a.id, rescue: true })],
      })),
})
