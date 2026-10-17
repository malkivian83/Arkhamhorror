/**
 * La gala del ecuador del invierno: enemigos, traiciones y los mensajes propios
 * del escenario que usan (hechizos, Joya, Lámpara…).
 */
import {
  getInvestigator,
  investigatorsAt,
  playerCardDef,
  push,
  registerEnemy,
  registerTreachery,
  type Choice,
  type Enemy,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { chooseSkillTest, damage, effectTest } from '../scenario-helpers'
import {
  bloodlessManUnleashed,
  CODES,
  isGuest,
  MANOR,
} from './cards'
import { extendGala, shroudHere } from './gala'
import {
  agendaNumber,
  ally,
  bloodlessMan,
  controlledGuestsAt,
  guestCountAt,
  guestsControlledBy,
  jewel,
  lantern,
  perInv,
  placedGuestsAt,
  spellbind,
  spellbound,
} from './helpers'

type Data = Record<string, string | number | boolean>

const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})

// ---------------------------------------------------------------------------
// Mensajes propios
// ---------------------------------------------------------------------------

function specific(state: GameState, key: string, data: Data): GameState {
  const investigator = data.investigator as InvestigatorId
  switch (key) {
    // Se desata el caos: El Exangüe pasa a su cara (Desatado).
    case 'unleash': {
      const man = Object.values(state.enemies).find((e) => e.code === CODES.bloodlessMan)
      if (!man) return state
      return push(state, { type: 'FlipEnemy', enemy: man.id, card: bloodlessManUnleashed })
    }
    // Calma: cada investigador puede curar 1 horror de un investigador o Invitado de su localización.
    case 'calmHeal':
      return push(state, healChoice(state, investigator, 'horror', true))
    case 'drink':
      return push(state, healChoice(state, investigator, 'either', false, data.location as string))
    case 'dance': {
      const location = data.location as string
      const ready = [
        ...controlledGuestsAt(state, location)
          .filter((a) => !a.exhausted)
          .map((a): Message[] => [
            { type: 'ExhaustAsset', asset: a.id },
            { type: 'HealAsset', asset: a.id, damage: 0, horror: 1 },
          ]),
        ...placedGuestsAt(state, location)
          .filter((p) => !p.exhausted)
          .map((p): Message[] => [
            { type: 'ScenarioSpecific', key: 'exhaustPlaced', data: { placed: p.id } },
            { type: 'ScenarioSpecific', key: 'healPlaced', data: { placed: p.id, horror: 1 } },
          ]),
      ]
      return push(state, ...ready.slice(0, 2).flat())
    }
    case 'exhaustPlaced': {
      const p = state.placedAssets?.[data.placed as string]
      if (!p) return state
      return {
        ...state,
        placedAssets: { ...state.placedAssets, [p.id]: { ...p, exhausted: true } },
      }
    }
    case 'healPlaced': {
      const p = state.placedAssets?.[data.placed as string]
      if (!p) return state
      return {
        ...state,
        placedAssets: {
          ...state.placedAssets,
          [p.id]: {
            ...p,
            damage: Math.max(0, p.damage - Number(data.damage ?? 0)),
            horror: Math.max(0, p.horror - Number(data.horror ?? 0)),
          },
        },
      }
    }
    // Sala de la Lámpara: si aciertas la carta, se cancela y descubres 1 pista.
    case 'lanternGuess': {
      const [top, ...rest] = state.encounterDeck
      if (!top) return state
      if (top.name === data.name) {
        return push(
          { ...state, encounterDeck: rest, encounterDiscard: [...state.encounterDiscard, top] },
          { type: 'Log', key: 'log.gala.guessed', params: { card: top.name } },
          { type: 'DiscoverClues', investigator, amount: 1, location: CODES.lanternChamber },
        )
      }
      return push(
        { ...state, encounterDeck: rest },
        { type: 'Log', key: 'log.gala.missed', params: { card: top.name } },
        { type: 'ResolveEncounterCard', investigator, card: top },
      )
    }
    // Dar la vuelta a una carta hechizada (queda preparada).
    case 'chooseFlip':
      return push(
        state,
        ask(
          investigator,
          'prompt.gala.chooseSpellbound',
          spellbound(state).map((p) => ({
            label: 'choice.gala.unspell',
            params: { card: p.name },
            target: { type: 'placed', id: p.id },
            then: [{ type: 'FlipPlacedAsset', placed: p.id }],
          })),
        ),
      )
    // Dormitorio: puedes gastar 1 pista para +2 de daño.
    case 'bedroomBonus': {
      if (getInvestigator(state, investigator).clues < 1) return state
      return push(
        state,
        ask(investigator, 'prompt.gala.bedroomBonus', [
          {
            label: 'choice.gala.spendClueDamage',
            then: [
              { type: 'SpendClues', investigator, amount: 1 },
              { type: 'DamageEnemy', enemy: data.enemy as string, amount: 2, by: investigator },
            ],
          },
          { label: 'choice.skip', then: [] },
        ]),
      )
    }
    // Biblioteca: 1 daño en la Joya o quitarle 1 ficha.
    case 'jewelToken':
      return push(state, jewelTokenChoice(state, investigator, true))
    // Joya: mover 1 ficha suya a un enemigo de tu localización.
    case 'jewelMoveToken':
      return push(state, jewelMoveChoice(state, investigator))
    case 'jewelEnters':
      return push(state, {
        type: 'PutAssetIntoPlay',
        investigator,
        code: CODES.jewelOfSarnath,
        noSlot: true,
        tokens: { damage: 3, doom: 1 },
      })
    case 'removeJewelToken': {
      const { asset, placed } = jewel(state)
      const kind = data.kind as 'damage' | 'doom'
      if (asset) {
        return {
          ...state,
          assets: {
            ...state.assets,
            [asset.id]: { ...asset, [kind]: Math.max(0, (asset[kind] ?? 0) - 1) },
          },
        }
      }
      if (placed) {
        return {
          ...state,
          placedAssets: {
            ...state.placedAssets,
            [placed.id]: { ...placed, [kind]: Math.max(0, (placed[kind] ?? 0) - 1) },
          },
        }
      }
      return state
    }
    case 'addJewelDamage': {
      const { asset, placed } = jewel(state)
      if (asset) {
        return {
          ...state,
          assets: { ...state.assets, [asset.id]: { ...asset, damage: asset.damage + 1 } },
        }
      }
      if (placed) {
        return {
          ...state,
          placedAssets: {
            ...state.placedAssets,
            [placed.id]: { ...placed, damage: placed.damage + 1 },
          },
        }
      }
      return state
    }
    // La Joya abandona el juego: se baraja en el mazo de encuentros.
    case 'jewelLeaves': {
      const asset = Object.values(state.assets).find((a) => a.code === CODES.jewelOfSarnath)
      const without = asset
        ? (() => {
            const { [asset.id]: _gone, ...assets } = state.assets
            return { ...state, assets }
          })()
        : state
      return push(without, { type: 'ScenarioSpecific', key: 'jewelIntoEncounter' })
    }
    case 'jewelIntoEncounter':
      return {
        ...state,
        encounterDeck: shuffleIn(state, {
          kind: 'treachery',
          code: CODES.jewelOfSarnath,
          name: 'Jewel of Sarnath',
          traits: ['Item', 'Relic'],
          keywords: [],
        }),
      }
    // La Lámpara Mortecina: tomar el control y darle la vuelta (Aura seductora).
    case 'takeLantern': {
      const { placed } = lantern(state)
      if (!placed) return state
      return push(
        state,
        { type: 'RemovePlacedAsset', placed: placed.id },
        {
          type: 'PutAssetIntoPlay',
          investigator,
          code: CODES.paleLanternAura,
          noSlot: true,
          tokens: { damage: placed.damage },
        },
      )
    }
    // Vuelve a su cara (Resplandor hipnótico), vinculada al Exangüe o a su localización.
    case 'lanternBack': {
      const { asset } = lantern(state)
      if (!asset) return state
      const man = bloodlessMan(state)
      const location = getInvestigator(state, asset.owner).location
      const placement =
        data.toBloodless && man
          ? ({ type: 'enemy', enemy: man.id } as const)
          : ({ type: 'location', location: location ?? CODES.lanternChamber } as const)
      const { [asset.id]: _gone, ...assets } = state.assets
      return push(
        { ...state, assets },
        {
          type: 'PlaceAsset',
          code: CODES.paleLantern,
          name: 'The Pale Lantern',
          placement,
          damage: asset.damage,
        },
      )
    }
    // Aura seductora: 1 daño; con 3, a la zona de victoria y se rompen todos los hechizos.
    case 'lanternDamage': {
      const { asset } = lantern(state)
      if (!asset) return state
      const damaged = asset.damage + 1
      if (damaged < 3) {
        return { ...state, assets: { ...state.assets, [asset.id]: { ...asset, damage: damaged } } }
      }
      const { [asset.id]: _gone, ...assets } = state.assets
      return push(
        { ...state, assets, victoryDisplay: [...state.victoryDisplay, CODES.paleLantern] },
        ...spellbound(state).map((p): Message => ({ type: 'FlipPlacedAsset', placed: p.id })),
      )
    }
    // Emboscada violenta / Atrapado: el enemigo va hasta tu localización y se enfrenta a ti.
    case 'comeForYou': {
      const enemy = state.enemies[data.enemy as string]
      const here = getInvestigator(state, investigator).location
      if (!enemy || !here) return state
      return push(
        state,
        { type: 'ReadyEnemy', enemy: enemy.id },
        ...(enemy.location === here
          ? []
          : [{ type: 'MoveEnemy', enemy: enemy.id, location: here } as Message]),
        { type: 'EngageEnemy', enemy: enemy.id, investigator },
        ...(data.attack
          ? [{ type: 'EnemyAttack', enemy: enemy.id, investigator, exhaustAfter: false } as Message]
          : []),
      )
    }
    // El Exangüe derrotado: queda (Desatado), agotado y con como mucho 3 daños por investigador.
    case 'unleashedAfterDefeat': {
      const enemy = state.enemies[data.enemy as string]
      if (!enemy) return state
      return {
        ...state,
        enemies: {
          ...state.enemies,
          [enemy.id]: {
            ...enemy,
            exhausted: true,
            engagedWith: null,
            damageTaken: Math.min(enemy.damageTaken, Number(data.keep)),
          },
        },
      }
    }
    // Retirar de la partida un Invitado controlado.
    case 'removeGuest': {
      const asset = state.assets[data.asset as string]
      if (!asset) return state
      const { [asset.id]: _gone, ...assets } = state.assets
      return push(
        { ...state, assets },
        {
          type: 'Log',
          key: 'log.gala.removed',
          params: { card: playerCardDef(asset.code)?.name ?? asset.code },
        },
      )
    }
    // Frío inexplicable: por cada punto de fallo, elige qué pierdes.
    case 'coldChoice': {
      const me = getInvestigator(state, investigator)
      const inPlay = Object.values(state.assets).filter((a) => a.owner === investigator)
      const choices: Choice[] = [
        ...inPlay.map((a): Choice => ({
          label: 'choice.discard',
          params: { card: playerCardDef(a.code)?.name ?? a.code },
          target: { type: 'asset', id: a.id },
          then: [{ type: 'DiscardAsset', asset: a.id }],
        })),
        ...(me.hand.length > 0
          ? [
              {
                label: 'choice.gala.discardFromHand',
                then: [{ type: 'ChooseDiscardFromHand', investigator, amount: 1 } as Message],
              },
            ]
          : []),
        { label: 'choice.takeDamage', params: { n: 1 }, then: [damage(investigator, 1)] },
      ]
      return push(state, ask(investigator, 'prompt.gala.coldChoice', choices))
    }
    // Empujado al más allá: el apoyo se baraja en el mazo y se descartan las 3 primeras.
    case 'pushed': {
      const asset = state.assets[data.asset as string]
      if (!asset) return state
      const owner = getInvestigator(state, asset.owner)
      const { [asset.id]: _gone, ...assets } = state.assets
      const deck = [...owner.deck]
      const at = deck.length === 0 ? 0 : (state.round * 5 + deck.length) % (deck.length + 1)
      deck.splice(at, 0, asset.code)
      const milled = deck.slice(0, 3)
      const next = {
        ...state,
        assets,
        investigators: state.investigators.map((i) =>
          i.id === owner.id ? { ...i, deck: deck.slice(3), discard: [...i.discard, ...milled] } : i,
        ),
      }
      return milled.includes(asset.code) ? push(next, damage(investigator, 0, 2)) : next
    }
    default:
      return state
  }
}

/** Añade una carta al mazo de encuentros en una posición al azar (determinista). */
function shuffleIn(state: GameState, card: EnemyCard | GameState['encounterDeck'][number]) {
  const deck = [...state.encounterDeck]
  const at = deck.length === 0 ? 0 : (state.round * 7 + deck.length) % (deck.length + 1)
  deck.splice(at, 0, card)
  return deck
}

/** Curar 1 horror (o daño u horror) de un investigador o Invitado de la localización. */
function healChoice(
  state: GameState,
  investigator: InvestigatorId,
  kind: 'horror' | 'either',
  optional: boolean,
  at?: string,
): Message {
  const here = at ?? getInvestigator(state, investigator).location ?? ''
  const kinds: ('damage' | 'horror')[] = kind === 'horror' ? ['horror'] : ['damage', 'horror']
  const choices: Choice[] = []
  for (const k of kinds) {
    const amounts = { damage: k === 'damage' ? 1 : 0, horror: k === 'horror' ? 1 : 0 }
    for (const i of investigatorsAt(state, here)) {
      if ((k === 'damage' ? i.damage : i.horror) > 0) {
        choices.push({
          label: `choice.heal.${k}`,
          params: { name: i.name },
          target: { type: 'investigator', id: i.id },
          then: [{ type: 'Heal', investigator: i.id, ...amounts }],
        })
      }
    }
    for (const a of controlledGuestsAt(state, here)) {
      if ((k === 'damage' ? a.damage : a.horror) > 0) {
        choices.push({
          label: `choice.heal.${k}`,
          params: { name: playerCardDef(a.code)?.name ?? a.code },
          target: { type: 'asset', id: a.id },
          then: [{ type: 'HealAsset', asset: a.id, ...amounts }],
        })
      }
    }
    for (const p of placedGuestsAt(state, here)) {
      if ((k === 'damage' ? p.damage : p.horror) > 0) {
        choices.push({
          label: `choice.heal.${k}`,
          params: { name: p.name },
          target: { type: 'placed', id: p.id },
          then: [
            { type: 'ScenarioSpecific', key: 'healPlaced', data: { placed: p.id, ...amounts } },
          ],
        })
      }
    }
  }
  if (choices.length === 0) return { type: 'Log', key: 'log.gala.nothingToHeal' }
  return ask(
    investigator,
    'prompt.gala.heal',
    optional ? [...choices, { label: 'choice.skip', then: [] }] : choices,
  )
}

function jewelTokenChoice(
  state: GameState,
  investigator: InvestigatorId,
  canAddDamage: boolean,
): Message {
  const { asset, placed } = jewel(state)
  const holder = asset ?? placed
  if (!holder) return { type: 'Log', key: 'log.gala.nothingToHeal' }
  const choices: Choice[] = []
  if (canAddDamage) {
    choices.push({
      label: 'choice.gala.jewelDamage',
      then: [{ type: 'ScenarioSpecific', key: 'addJewelDamage' }],
    })
  }
  if (holder.damage > 0) {
    choices.push({
      label: 'choice.gala.jewelRemove',
      params: { kind: 'damage' },
      then: [{ type: 'ScenarioSpecific', key: 'removeJewelToken', data: { kind: 'damage' } }],
    })
  }
  if ((holder.doom ?? 0) > 0) {
    choices.push({
      label: 'choice.gala.jewelRemove',
      params: { kind: 'doom' },
      then: [{ type: 'ScenarioSpecific', key: 'removeJewelToken', data: { kind: 'doom' } }],
    })
  }
  return ask(investigator, 'prompt.gala.jewelToken', choices)
}

function jewelMoveChoice(state: GameState, investigator: InvestigatorId): Message {
  const { asset } = jewel(state)
  const here = getInvestigator(state, investigator).location
  if (!asset || !here) return { type: 'Log', key: 'log.gala.nothingToHeal' }
  const enemies = Object.values(state.enemies).filter((e) => e.location === here)
  const choices: Choice[] = enemies.flatMap((e): Choice[] => [
    ...(asset.damage > 0
      ? [
          {
            label: 'choice.gala.jewelMove',
            params: { kind: 'damage', enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [
              { type: 'ScenarioSpecific', key: 'removeJewelToken', data: { kind: 'damage' } },
              { type: 'DamageEnemy', enemy: e.id, amount: 1, by: investigator },
            ],
          } as Choice,
        ]
      : []),
    ...((asset.doom ?? 0) > 0
      ? [
          {
            label: 'choice.gala.jewelMove',
            params: { kind: 'doom', enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [
              { type: 'ScenarioSpecific', key: 'removeJewelToken', data: { kind: 'doom' } },
              { type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 1 },
            ],
          } as Choice,
        ]
      : []),
  ])
  if (choices.length === 0) return { type: 'Log', key: 'log.gala.nothingToHeal' }
  return ask(investigator, 'prompt.gala.jewelMove', choices)
}

// ---------------------------------------------------------------------------
// Modificadores del escenario: traiciones y Líderes rivales
// ---------------------------------------------------------------------------

function skillModifier(state: GameState, test: NonNullable<GameState['skillTest']>): number {
  const investigator = getInvestigator(state, test.investigator)
  let mod = 0
  // Unlucky: -2 a todas tus habilidades.
  const unlucky = Object.values(state.treacheries).some(
    (t) =>
      t.code === CODES.unlucky &&
      t.placement.type === 'threatArea' &&
      t.placement.investigator === investigator.id,
  )
  if (unlucky) mod -= 2
  const here = investigator.location
  if (here) {
    for (const e of Object.values(state.enemies).filter((x) => x.location === here)) {
      // Carl Sanford (rival): -1 [willpower] a los investigadores de su localización.
      if (e.code === '71034b' && test.skill === 'willpower') mod -= 1
      // Valeriya Antonova (rival): -1 a todo si controlas un Invitado agotado.
      if (
        e.code === '71016b' &&
        guestsControlledBy(state, investigator.id).some((a) => a.exhausted)
      ) {
        mod -= 1
      }
    }
  }
  return mod
}

extendGala({ specific, skillModifier })

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

/** Localizaciones con algún Invitado (destino del Exangüe errante). */
const withGuests = (state: GameState) =>
  MANOR.filter((l) => state.locations[l] && guestCountAt(state, l) > 0)

registerEnemy({
  code: CODES.bloodlessMan,
  // Errante (la localización más cercana con un Invitado).
  patrol: (state) => withGuests(state),
  // Al ser derrotado: en su lugar se da la vuelta, se agota y conserva como mucho 3 daños por investigador.
  wouldBeDefeated: (state, self) => [
    { type: 'FlipEnemy', enemy: self.id, card: bloodlessManUnleashed },
    {
      type: 'ScenarioSpecific',
      key: 'unleashedAfterDefeat',
      data: { enemy: self.id, keep: perInv(state, 3) },
    },
  ],
  // Al terminar la fase de investigación, si está preparado: 1 horror a cada investigador e
  // Invitado de su localización; con La Lámpara vinculada, esos Invitados quedan hechizados.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'investigationPhaseEnds' || self.exhausted) return []
    const lanternOn = Object.values(state.placedAssets ?? {}).some(
      (p) =>
        p.code === CODES.paleLantern &&
        p.placement.type === 'enemy' &&
        p.placement.enemy === self.id,
    )
    const guests = [
      ...controlledGuestsAt(state, self.location).map((a) => ({ asset: a.id })),
      ...placedGuestsAt(state, self.location).map((p) => ({ placed: p.id })),
    ]
    return [
      ...investigatorsAt(state, self.location).map((i) => damage(i.id, 0, 1)),
      ...guests.map((g): Message =>
        'asset' in g
          ? { type: 'DamageAsset', asset: g.asset, damage: 0, horror: 1 }
          : { type: 'DamagePlacedAsset', placed: g.placed, damage: 0, horror: 1 },
      ),
      ...(lanternOn ? guests.map((g) => spellbind(g)) : []),
    ]
  },
})

registerEnemy({
  code: CODES.bloodlessManUnleashed,
  // Tras atacarte: retira de la partida un Invitado que controles.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'afterEnemyAttack' || trigger.enemy !== self.id) return []
    const guests = guestsControlledBy(state, trigger.investigator)
    if (guests.length === 0) return []
    return [
      ask(
        trigger.investigator,
        'prompt.gala.loseGuest',
        guests.map((a) => ({
          label: 'choice.gala.removeGuest',
          params: { card: playerCardDef(a.code)?.name ?? a.code },
          target: { type: 'asset', id: a.id },
          then: [{ type: 'ScenarioSpecific', key: 'removeGuest', data: { asset: a.id } }],
        })),
      ),
    ]
  },
})

registerEnemy({
  code: CODES.declanPearce,
  // Al final de la fase de enemigos, si está preparado: cura 1 daño de cada enemigo.
  forced: (state, trigger, self) =>
    trigger.type === 'enemyPhaseEnds' && !self.exhausted
      ? Object.values(state.enemies)
          .filter((e) => e.damageTaken > 0)
          .map((e): Message => ({ type: 'HealEnemy', enemy: e.id, amount: 1 }))
      : [],
})

registerEnemy({
  code: CODES.lanternClubMember,
  // Negociar (plan 1): gasta 1 recurso para evitarlo automáticamente (3 para descartarlo).
  abilities: (state, self, investigator) => {
    if (agendaNumber(state) !== 1) return []
    const resources = getInvestigator(state, investigator).resources
    const options = []
    if (resources >= 1) {
      options.push({
        key: `${self.id}:parley`,
        label: 'ability.gala.bribeEvade',
        params: { enemy: self.name },
        actions: 1,
        provokes: false,
        then: [
          { type: 'SpendResources', investigator, amount: 1 } as Message,
          { type: 'EvadeEnemy', enemy: self.id, by: investigator } as Message,
        ],
      })
    }
    if (resources >= 3) {
      options.push({
        key: `${self.id}:parley`,
        label: 'ability.gala.bribeDiscard',
        params: { enemy: self.name },
        actions: 1,
        provokes: false,
        then: [
          { type: 'SpendResources', investigator, amount: 3 } as Message,
          { type: 'DiscardEnemy', enemy: self.id } as Message,
        ],
      })
    }
    return options
  },
})

registerEnemy({
  code: CODES.rookieCop,
  // Tras atacar a otro enemigo un investigador de su localización: 1 daño a ese investigador.
  forced: (state, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.kind === 'fight' &&
    trigger.enemy !== self.id &&
    getInvestigator(state, trigger.investigator).location === self.location
      ? [damage(trigger.investigator, 1)]
      : [],
})

// Líderes rivales.
registerEnemy({
  code: '71016b',
  // Al final de la ronda: agota los Invitados de su localización.
  forced: (state, trigger, self) =>
    trigger.type === 'roundEnds'
      ? [
          ...controlledGuestsAt(state, self.location).map((a): Message => ({
            type: 'ExhaustAsset',
            asset: a.id,
          })),
          ...placedGuestsAt(state, self.location).map((p): Message => ({
            type: 'ScenarioSpecific',
            key: 'exhaustPlaced',
            data: { placed: p.id },
          })),
        ]
      : [],
})

registerEnemy({
  code: '71022b',
  // Al terminar el turno de un investigador de su localización: descarta una carta (no debilidad).
  forced: (state, trigger, self) =>
    trigger.type === 'turnEnds' &&
    getInvestigator(state, trigger.investigator).location === self.location
      ? [{ type: 'ChooseDiscardFromHand', investigator: trigger.investigator, amount: 1 }]
      : [],
})

registerEnemy({
  code: '71028b',
  // Al terminar el turno de un investigador de su localización: pierde 2 recursos.
  forced: (state, trigger, self) =>
    trigger.type === 'turnEnds' &&
    getInvestigator(state, trigger.investigator).location === self.location
      ? [{ type: 'LoseResources', investigator: trigger.investigator, amount: 2 }]
      : [],
})

// ---------------------------------------------------------------------------
// Traiciones
// ---------------------------------------------------------------------------

const threat = (self: { id: string }, investigator: InvestigatorId): Message => ({
  type: 'PlaceTreachery',
  treachery: self.id,
  placement: { type: 'threatArea', investigator },
})

registerTreachery({
  code: CODES.confusion,
  // Coloca 2 de tus pistas en tu localización; 1 horror por cada una que no puedas.
  revelation: (state, investigator) => {
    const clues = getInvestigator(state, investigator).clues
    const placed = Math.min(2, clues)
    return [
      ...(placed > 0
        ? [{ type: 'PlaceCluesOnLocation', investigator, amount: placed } as Message]
        : []),
      ...(2 - placed > 0 ? [damage(investigator, 0, 2 - placed)] : []),
    ]
  },
})

registerTreachery({
  code: CODES.coldStreak,
  // Pierde 4 recursos; por cada uno que no puedas perder, 1 daño o 1 horror.
  revelation: (state, investigator) => {
    const resources = getInvestigator(state, investigator).resources
    const missing = Math.max(0, 4 - resources)
    return [
      { type: 'LoseResources', investigator, amount: 4 },
      ...Array.from({ length: missing }, () =>
        ask(investigator, 'prompt.gala.damageOrHorror', [
          { label: 'choice.takeDamage', params: { n: 1 }, then: [damage(investigator, 1)] },
          { label: 'choice.takeHorror', params: { n: 1 }, then: [damage(investigator, 0, 1)] },
        ]),
      ),
    ]
  },
})

registerTreachery({
  code: CODES.wardOfPreservation,
  // En tu zona de amenaza. Al jugar un evento: se cancelan sus efectos, 1 horror y se descarta.
  revelation: (_state, investigator, self) => [threat(self, investigator)],
})

registerTreachery({
  code: CODES.unlucky,
  // En tu zona de amenaza: -2 a tus habilidades. Al final de la ronda se descarta.
  revelation: (_state, investigator, self) => [threat(self, investigator)],
  forced: (_state, trigger, self) =>
    trigger.type === 'roundEnds' ? [{ type: 'DiscardTreachery', treachery: self.id }] : [],
})

registerTreachery({
  code: CODES.viciousAmbush,
  // Sin Monstruos en juego gana oleada; si no, el Monstruo más cercano viene a por ti y ataca.
  revelation: (state, investigator) => {
    const monsters = Object.values(state.enemies).filter((e) =>
      (e.traits ?? []).includes('Monster'),
    )
    if (monsters.length === 0) return [{ type: 'GainSurge' }]
    const nearest = nearestEnemy(state, investigator, monsters)
    return nearest
      ? [
          {
            type: 'ScenarioSpecific',
            key: 'comeForYou',
            data: { investigator, enemy: nearest.id, attack: true },
          },
        ]
      : []
  },
})

/** El enemigo más cercano al investigador (por número de conexiones). */
function nearestEnemy(
  state: GameState,
  investigator: InvestigatorId,
  enemies: Enemy[],
): Enemy | undefined {
  const here = getInvestigator(state, investigator).location
  if (!here) return enemies[0]
  const distance = (from: string): number => {
    const seen = new Map<string, number>([[from, 0]])
    let frontier = [from]
    while (frontier.length) {
      const next: string[] = []
      for (const l of frontier) {
        for (const c of state.locations[l]?.connections ?? []) {
          if (seen.has(c)) continue
          seen.set(c, (seen.get(l) ?? 0) + 1)
          next.push(c)
        }
      }
      frontier = next
    }
    return seen.get(here) ?? 99
  }
  return [...enemies].sort((a, b) => distance(a.location) - distance(b.location))[0]
}

registerTreachery({
  code: CODES.jewelOfSarnath,
  // Revelación: entra en juego bajo tu control con 3 daños y 1 perdición.
  revelation: (_state, investigator) => [
    { type: 'ScenarioSpecific', key: 'jewelEnters', data: { investigator } },
  ],
})

registerTreachery({
  code: CODES.bleedingWalls,
  // [willpower] (velo de tu localización); si fallas, pierdes 1 acción y recibes 1 horror.
  revelation: (state, investigator) => [
    effectTest(investigator, 'Bleeding Walls', 'willpower', shroudHere(state, investigator), {
      onFail: [{ type: 'LoseActions', investigator, amount: 1 }, damage(investigator, 0, 1)],
    }),
  ],
})

registerTreachery({
  code: CODES.entrap,
  // [agility] (3). Si fallas: con El Exangüe aquí, un Invitado tuyo queda hechizado; si está en
  // otra localización, viene a por ti; si no está en juego, gana oleada.
  revelation: (state, investigator) => {
    const man = bloodlessMan(state)
    const here = getInvestigator(state, investigator).location
    const onFail: Message[] = !man
      ? [{ type: 'GainSurge' }]
      : man.location === here
        ? guestsControlledBy(state, investigator).length > 0
          ? [
              ask(
                investigator,
                'prompt.gala.spellbindGuest',
                guestsControlledBy(state, investigator).map((a) => ({
                  label: 'choice.gala.spellbindGuest',
                  params: { card: playerCardDef(a.code)?.name ?? a.code },
                  target: { type: 'asset', id: a.id },
                  then: [spellbind({ asset: a.id })],
                })),
              ),
            ]
          : []
        : [{ type: 'ScenarioSpecific', key: 'comeForYou', data: { investigator, enemy: man.id } }]
    return [effectTest(investigator, 'Entrap', 'agility', 3, { onFail })]
  },
})

registerTreachery({
  code: CODES.inexplicableCold,
  // [agility] (4); por cada punto que falles: descarta una carta en juego, una de la mano o 1 daño.
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Inexplicable Cold', 'agility', 4, {
      onFailEach: [{ type: 'ScenarioSpecific', key: 'coldChoice', data: { investigator } }],
    }),
  ],
})

registerTreachery({
  code: CODES.mindExtraction,
  // [willpower] (1 + plan actual); si fallas, 2 horrores. Después, si El Exangüe está en juego y
  // un investigador controla La Lámpara, vuelve a vincularse a él.
  revelation: (state, investigator) => [
    effectTest(investigator, 'Mind Extraction', 'willpower', 1 + agendaNumber(state), {
      onFail: [damage(investigator, 0, 2)],
    }),
    ...(bloodlessMan(state) && lantern(state).asset
      ? [{ type: 'ScenarioSpecific', key: 'lanternBack', data: { toBloodless: true } } as Message]
      : []),
  ],
})

registerTreachery({
  code: CODES.noxiousFumes,
  // Cada investigador de tu localización elige: huir ([agility] 3) o aguantar la respiración ([combat] 3).
  revelation: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return investigatorsAt(state, here ?? '').map((i) =>
      ask(i.id, 'prompt.gala.fumes', [
        {
          label: 'choice.gala.flee',
          then: [
            effectTest(i.id, 'Noxious Fumes', 'agility', 3, {
              onSuccess: [{ type: 'ChooseMove', investigator: i.id }],
              onFail: [damage(i.id, 2)],
            }),
          ],
        },
        {
          label: 'choice.gala.holdBreath',
          then: [effectTest(i.id, 'Noxious Fumes', 'combat', 3, { onFailEach: [damage(i.id, 1)] })],
        },
      ]),
    )
  },
})

registerTreachery({
  code: CODES.pushedIntoTheBeyond,
  // Baraja en su mazo un apoyo tuyo (que no sea de historia) y descarta las 3 primeras cartas;
  // si sale otra copia, 2 horrores.
  revelation: (state, investigator) => {
    const mine = Object.values(state.assets).filter(
      (a) => a.owner === investigator && !isGuest(a.code) && !a.code.startsWith('710'),
    )
    if (mine.length === 0) return []
    return [
      ask(
        investigator,
        'prompt.gala.pushedAsset',
        mine.map((a) => ({
          label: 'choice.gala.pushedAsset',
          params: { card: playerCardDef(a.code)?.name ?? a.code },
          target: { type: 'asset', id: a.id },
          then: [{ type: 'ScenarioSpecific', key: 'pushed', data: { investigator, asset: a.id } }],
        })),
      ),
    ]
  },
})

registerTreachery({
  code: CODES.secretDoor,
  // Se une a la localización con más investigadores (sin otra Puerta secreta). No se puede salir.
  blocksLeaving: true,
  revelation: (state, investigator, self) => {
    const occupied = MANOR.filter((l) => state.locations[l])
      .filter(
        (l) =>
          !Object.values(state.treacheries).some(
            (t) =>
              t.code === CODES.secretDoor &&
              t.placement.type === 'location' &&
              t.placement.location === l,
          ),
      )
      .map((l) => ({ l, n: investigatorsAt(state, l).length }))
      .sort((a, b) => b.n - a.n)
    const target = occupied[0]?.l ?? getInvestigator(state, investigator).location
    return target
      ? [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'location', location: target },
          },
        ]
      : []
  },
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:search`,
      label: 'ability.gala.secretDoor',
      actions: 1,
      provokes: true,
      then: [
        chooseSkillTest(investigator, 'Secret Door', ['willpower', 'intellect'] as SkillType[], 3, {
          onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
        }),
      ],
    },
  ],
})

registerTreachery({
  code: CODES.terrorGate,
  // [willpower] (2, +2 con un enemigo Rival en juego). Si fallas, según tu facción aliada.
  revelation: (state, investigator) => {
    const rivalInPlay = Object.values(state.enemies).some((e) => (e.traits ?? []).includes('Rival'))
    const penalty: Record<string, Message[]> = {
      foundation: [damage(investigator, 2)],
      miskatonic: [{ type: 'ChooseDiscardFromHand', investigator, amount: 2 }],
      syndicate: [{ type: 'LoseResources', investigator, amount: 3 }],
      lodge: [damage(investigator, 0, 2)],
      kingsport: [{ type: 'LoseActions', investigator, amount: 1 }],
    }
    return [
      effectTest(investigator, 'Terror Gate', 'willpower', 2 + (rivalInPlay ? 2 : 0), {
        onFail: penalty[ally(state) ?? 'foundation'] ?? [],
      }),
    ]
  },
})

registerTreachery({
  code: CODES.violentCommands,
  // En tu zona de amenaza. Al final de tu turno, [willpower] (3) o 1 horror. Acción: 2 daños a
  // un investigador de tu localización y se descarta.
  revelation: (_state, investigator, self) => [threat(self, investigator)],
  forced: (_state, trigger, self) =>
    trigger.type === 'turnEnds' &&
    self.placement.type === 'threatArea' &&
    self.placement.investigator === trigger.investigator
      ? [
          effectTest(trigger.investigator, 'Violent Commands', 'willpower', 3, {
            onFail: [damage(trigger.investigator, 0, 1)],
          }),
        ]
      : [],
  abilities: (state, self, investigator) => {
    if (self.placement.type !== 'threatArea' || self.placement.investigator !== investigator)
      return []
    const here = getInvestigator(state, investigator).location
    return investigatorsAt(state, here ?? '').map((i) => ({
      key: `${self.id}:obey:${i.id}`,
      label: 'ability.gala.violentCommands',
      params: { name: i.name },
      actions: 1,
      provokes: true,
      target: { type: 'investigator', id: i.id },
      then: [damage(i.id, 2), { type: 'DiscardTreachery', treachery: self.id }],
    }))
  },
})
