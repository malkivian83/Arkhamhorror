/**
 * Conjuntos de encuentros compartidos por los escenarios del Valle de la Cicuta:
 * ¡Fuego!, Agentes del color, Transfiguración y Plaga (cartas 10724–10729 y 10743).
 * Cada escenario delega en `valeSpecific` los mensajes `ScenarioSpecific` de estas cartas
 * y en `valeEnemyKeyword` las palabras clave que dependen de la hora.
 */
import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  playerCardDef,
  push,
  registerEnemy,
  registerTreachery,
  valleyTime,
  type Choice,
  type Enemy,
  type EnemyCard,
  type EnemyKeyword,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
  type Treachery,
  type TreacheryCard,
} from '@lcg/engine'
import { copies, effectTest, enemy, treachery } from '../scenario-helpers'

export const VALE_CODES = {
  miasmaticShadow: '10724',
  alienWhispers: '10725',
  strangeMutations: '10726',
  fungalRot: '10727',
  enervation: '10728',
  desiccation: '10729',
  fire: '10743',
} as const

const t = (
  code: string,
  name: string,
  traits: string[],
  keywords: TreacheryCard['keywords'] = [],
) => treachery({ code, name, traits, keywords })

const isNight = (state: GameState) => valleyTime(state.campaignLog)?.time === 'night'

const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})

const specific = (key: string, data: Record<string, string | number>): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})

export const miasmaticShadow: EnemyCard = enemy({
  code: VALE_CODES.miasmaticShadow,
  name: 'Miasmatic Shadow',
  traits: ['Monster', 'Colour'],
  fight: 3,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: ['aloof', 'hunter'],
  victory: 0,
})

export const fire = t(VALE_CODES.fire, 'Fire!', ['Hazard'])

export const agentsOfTheColourDeck = [
  ...copies(miasmaticShadow, 2),
  ...copies(t(VALE_CODES.alienWhispers, 'Alien Whispers', ['Power', 'Colour']), 2),
]
export const transfigurationDeck = [
  ...copies(t(VALE_CODES.strangeMutations, 'Strange Mutations', ['Power']), 2),
  ...copies(t(VALE_CODES.fungalRot, 'Fungal Rot', ['Hazard', 'Blight']), 2),
]
export const blightDeck = [
  ...copies(t(VALE_CODES.enervation, 'Enervation', ['Hazard', 'Blight']), 2),
  ...copies(t(VALE_CODES.desiccation, 'Desiccation', ['Blight']), 2),
]

/** (Noche) Escurridizo de la Sombra miasmática. */
export function valeEnemyKeyword(state: GameState, e: Enemy, keyword: EnemyKeyword) {
  return e.code === VALE_CODES.miasmaticShadow && keyword === 'elusive' && isNight(state)
    ? true
    : null
}

// ---------------------------------------------------------------------------
// Agentes del color
// ---------------------------------------------------------------------------

const DAMAGED_BY = ['Spell', 'Relic', 'Science']

registerEnemy({
  code: VALE_CODES.miasmaticShadow,
  // No puede recibir daño salvo de [[Spell]], [[Relic]], [[Science]] o cartas de Encuentro.
  damageTaken: (_state, _self, amount, source) =>
    source.encounter || (source.traits ?? []).some((trait) => DAMAGED_BY.includes(trait))
      ? { amount }
      : { amount: 0 },
  // Obligado – Cuando descartes cartas de tu mano en su Lugar, si está preparada: se enfrenta
  // a ti y hace un ataque inmediato.
  forced: (state, trigger, self) =>
    trigger.type === 'afterHandDiscard' &&
    !self.exhausted &&
    trigger.cards.length > 0 &&
    getInvestigator(state, trigger.investigator).location === self.location
      ? [
          { type: 'EngageEnemy', enemy: self.id, investigator: trigger.investigator },
          {
            type: 'EnemyAttack',
            enemy: self.id,
            investigator: trigger.investigator,
            exhaustAfter: false,
          },
        ]
      : [],
})

// Susurros alienígenas: [willpower] (3); por cada punto que falles, elige un efecto.
registerTreachery({
  code: VALE_CODES.alienWhispers,
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Alien Whispers', 'willpower', 3, {
      onFailEach: [specific('vale:alienWhispers', { investigator })],
    }),
  ],
})

function alienWhispers(state: GameState, investigator: InvestigatorId): Message[] {
  const assets = Object.values(state.assets).filter((a) => a.owner === investigator)
  const withHealth = assets.filter((a) => (playerCardDef(a.code)?.health ?? 0) > 0)
  const withSanity = assets.filter((a) => (playerCardDef(a.code)?.sanity ?? 0) > 0)
  const toAsset = (kind: 'damage' | 'horror', list: typeof assets): Choice[] =>
    list.length
      ? [
          {
            label: `choice.hemlockVale.whispers.${kind}`,
            then: [
              ask(
                investigator,
                'prompt.hemlockVale.chooseAsset',
                list.map((a) => ({
                  label: 'choice.card',
                  params: { card: a.code },
                  target: { type: 'asset', id: a.id },
                  then: [
                    {
                      type: 'DamageAsset',
                      asset: a.id,
                      damage: kind === 'damage' ? 1 : 0,
                      horror: kind === 'horror' ? 1 : 0,
                    } as Message,
                  ],
                })),
              ),
            ],
          },
        ]
      : []
  const choices = [
    ...toAsset('damage', withHealth),
    ...toAsset('horror', withSanity),
    ...(getInvestigator(state, investigator).hand.length
      ? [
          {
            label: 'choice.hemlockVale.discardRandom',
            then: [{ type: 'DiscardRandomFromHand', investigator, amount: 1 } as Message],
          },
        ]
      : []),
  ]
  return choices.length ? [ask(investigator, 'prompt.chooseEffect', choices)] : []
}

// ---------------------------------------------------------------------------
// Transfiguración
// ---------------------------------------------------------------------------

// Mutaciones extrañas: [willpower] (5), −1 por cada horror que tengas; si fallas, 2 horror o
// descarta 2 cartas al azar.
registerTreachery({
  code: VALE_CODES.strangeMutations,
  revelation: (state, investigator) => {
    const horror = getInvestigator(state, investigator).horror
    return [
      effectTest(investigator, 'Strange Mutations', 'willpower', Math.max(0, 5 - horror), {
        onFail: [
          ask(investigator, 'prompt.chooseEffect', [
            {
              label: 'choice.hemlockVale.takeHorror',
              params: { n: 2 },
              then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 2 }],
            },
            {
              label: 'choice.hemlockVale.discardRandomTwo',
              then: [{ type: 'DiscardRandomFromHand', investigator, amount: 2 }],
            },
          ]),
        ],
      }),
    ]
  },
})

/** El apoyo al que está vinculada una Podredumbre fúngica (`vale:on:<traición>`). */
const attachedAsset = (state: GameState, treachery: string) => {
  const asset = state.scenarioMeta?.[`vale:on:${treachery}`]
  return asset ? state.assets[String(asset)] : undefined
}

// Podredumbre fúngica: vinculada a un apoyo [[Item]] sin otra; si no puedes, oleada. Su
// texto se considera en blanco. [acción]: [combat] (3); si tienes éxito, descártala; si no,
// 1 daño. El motor no vincula traiciones a apoyos: va a tu zona de amenaza.
registerTreachery({
  code: VALE_CODES.fungalRot,
  revelation: (state, investigator, self) => {
    const rotted = new Set(
      Object.values(state.treacheries)
        .filter((other) => other.code === VALE_CODES.fungalRot && other.id !== self.id)
        .map((other) => attachedAsset(state, other.id)?.id),
    )
    const items = Object.values(state.assets).filter(
      (a) =>
        a.owner === investigator &&
        !rotted.has(a.id) &&
        !!playerCardDef(a.code)?.traits?.includes('Item'),
    )
    if (!items.length) return [{ type: 'GainSurge' }]
    const attach = (asset: string): Message =>
      specific('vale:attach', { treachery: self.id, asset })
    return items.length === 1
      ? [attach(items[0]!.id)]
      : [
          ask(
            investigator,
            'prompt.hemlockVale.chooseAsset',
            items.map((a) => ({
              label: 'choice.card',
              params: { card: a.code },
              target: { type: 'asset', id: a.id },
              then: [attach(a.id)],
            })),
          ),
        ]
  },
  blanksAsset: (state, self, asset) => attachedAsset(state, self.id)?.id === asset.id,
  abilities: (state, self, investigator) =>
    attachedAsset(state, self.id)?.owner === investigator
      ? [
          {
            key: `${self.id}:discard`,
            label: 'ability.discardTreachery',
            params: { card: 'Fungal Rot' },
            actions: 1,
            provokes: true,
            then: [
              effectTest(investigator, 'Fungal Rot', 'combat', 3, {
                onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
                onFail: [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 }],
              }),
            ],
          },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// Plaga
// ---------------------------------------------------------------------------

// Enervación: [combat] (5), −1 por cada daño que tengas; si fallas, 2 daños o descarta la
// carta de tu mano de mayor coste impreso.
registerTreachery({
  code: VALE_CODES.enervation,
  revelation: (state, investigator) => {
    const damage = getInvestigator(state, investigator).damage
    return [
      effectTest(investigator, 'Enervation', 'combat', Math.max(0, 5 - damage), {
        onFail: [specific('vale:enervation', { investigator })],
      }),
    ]
  },
})

function enervation(state: GameState, investigator: InvestigatorId): Message[] {
  const hand = getInvestigator(state, investigator).hand
  const cost = (code: string) => playerCardDef(code)?.cost ?? -1
  const highest = Math.max(-1, ...hand.map(cost))
  const options = [...new Set(hand.filter((code) => cost(code) === highest && highest >= 0))]
  return [
    ask(investigator, 'prompt.chooseEffect', [
      {
        label: 'choice.hemlockVale.takeDamage',
        params: { n: 2 },
        then: [{ type: 'TakeDamage', investigator, damage: 2, horror: 0 }],
      },
      ...options.map((card): Choice => ({
        label: 'choice.discardCard',
        params: { card },
        then: [{ type: 'DiscardFromHand', investigator, card }],
      })),
    ]),
  ]
}

// Desecación: junto al mazo de Plan. Como coste adicional para jugar una carta, el
// investigador recibe 1 daño. Obligado – Al final de la ronda: descarta 1 copia (máx. una
// vez por ronda). El motor no tiene costes adicionales de jugar: el daño se recibe al jugarla.
registerTreachery({
  code: VALE_CODES.desiccation,
  revelation: (_state, _investigator, self) => [
    { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'agenda' } },
  ],
  forced: (state, trigger, self) => {
    if (self.placement.type !== 'agenda') return []
    if (trigger.type === 'afterPlayCard') {
      const first = Object.values(state.treacheries).find(
        (other) => other.code === VALE_CODES.desiccation && other.placement.type === 'agenda',
      )
      return first?.id === self.id
        ? [{ type: 'TakeDamage', investigator: trigger.investigator, damage: 1, horror: 0 }]
        : []
    }
    if (trigger.type !== 'roundEnds' || state.scenarioMeta?.['vale:desiccation'] === state.round)
      return []
    return [
      { type: 'SetScenarioMeta', key: 'vale:desiccation', value: state.round },
      { type: 'DiscardTreachery', treachery: self.id },
    ]
  },
})

// ---------------------------------------------------------------------------
// ¡Fuego!
// ---------------------------------------------------------------------------

const fireAt = (state: GameState, location: LocationId, except?: string) =>
  Object.values(state.treacheries).some(
    (other) =>
      other.code === VALE_CODES.fire &&
      other.id !== except &&
      other.placement.type === 'location' &&
      other.placement.location === location,
  )

/** Lugar más cercano sin ¡Fuego! (conectado a uno con ¡Fuego!, si es posible). */
function fireTargets(state: GameState, investigator: InvestigatorId, self: Treachery) {
  const from = getInvestigator(state, investigator).location
  if (from === null) return []
  const free = (l: LocationId) => !fireAt(state, l, self.id)
  const burning = (l: LocationId) =>
    (state.locations[l]?.connections ?? []).some((c) => fireAt(state, c, self.id))
  const distances = [...distancesFrom(state, from)].filter(([l]) => free(l))
  const preferred = distances.filter(([l]) => burning(l))
  const pool = preferred.length ? preferred : distances
  const best = Math.min(...pool.map(([, d]) => d))
  return pool.filter(([, d]) => d === best).map(([l]) => l)
}

registerTreachery({
  code: VALE_CODES.fire,
  revelation: (state, investigator, self) => {
    const targets = fireTargets(state, investigator, self)
    const attach = (location: LocationId): Message => ({
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'location', location },
    })
    if (!targets.length) return [{ type: 'DiscardTreachery', treachery: self.id }]
    return targets.length === 1
      ? [attach(targets[0]!)]
      : [
          ask(
            investigator,
            'prompt.chooseLocation',
            targets.map((l) => ({
              label: 'choice.location',
              params: { location: state.locations[l]?.name ?? l },
              target: { type: 'location', id: l },
              then: [attach(l)],
            })),
          ),
        ]
  },
  abilities: (state, self, investigator) =>
    self.placement.type === 'location' &&
    getInvestigator(state, investigator).location === self.placement.location
      ? [
          {
            key: `${self.id}:discard`,
            label: 'ability.discardTreachery',
            params: { card: 'Fire!' },
            actions: 1,
            provokes: true,
            then: [
              effectTest(investigator, 'Fire!', 'agility', 4, {
                onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
              }),
            ],
          },
        ]
      : [],
  // Obligado – Al final de la ronda: cada carta con salud en este Lugar recibe 1 daño directo.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'roundEnds' || self.placement.type !== 'location') return []
    const location = self.placement.location
    const players = activeInvestigators(state).filter((i) => i.location === location)
    return [
      ...players.map((i): Message => ({
        type: 'TakeDamage',
        investigator: i.id,
        damage: 1,
        horror: 0,
        direct: true,
      })),
      ...Object.values(state.assets)
        .filter(
          (a) => players.some((i) => i.id === a.owner) && (playerCardDef(a.code)?.health ?? 0) > 0,
        )
        .map((a): Message => ({ type: 'DamageAsset', asset: a.id, damage: 1, horror: 0 })),
      ...Object.values(state.enemies)
        .filter((e) => e.location === location)
        .map((e): Message => ({
          type: 'DamageEnemy',
          enemy: e.id,
          amount: 1,
          source: { code: VALE_CODES.fire, encounter: true },
        })),
    ]
  },
})

/** Mensajes `ScenarioSpecific` de estas cartas; `null` si la clave no es suya. */
export function valeSpecific(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState | null {
  switch (key) {
    case 'vale:alienWhispers':
      return push(state, ...alienWhispers(state, String(data.investigator)))
    case 'vale:enervation':
      return push(state, ...enervation(state, String(data.investigator)))
    case 'vale:attach': {
      const asset = state.assets[String(data.asset)]
      if (!asset) return state
      return push(
        {
          ...state,
          scenarioMeta: { ...state.scenarioMeta, [`vale:on:${data.treachery}`]: asset.id },
        },
        {
          type: 'PlaceTreachery',
          treachery: String(data.treachery),
          placement: { type: 'threatArea', investigator: asset.owner },
        },
      )
    }
  }
  return null
}
