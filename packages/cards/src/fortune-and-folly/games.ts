/**
 * Juegos de los Lugares Juego (Mesa de póquer, Ruleta, Mesa de bacará, Tragaperras y Mesa
 * de apuestas altas): apuesta, comprobación de iconos, cambiar cartas, El estafador y
 * premio. Cada paso es un `ScenarioSpecific` para que la partida siga siendo JSON.
 */
import {
  getInvestigator,
  type AbilityOption,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import {
  adjustAlarmMessage,
  changeIcon,
  CHECKED,
  checkedIcons,
  checkIcons,
  swapIcons,
} from './check'
import { CODES, practiced } from './cards'
import {
  colorOf,
  formatIcon,
  mostOfARank,
  RANKS,
  sameSuit,
  sequential,
  SUITS,
  totalValue,
  type GameIcon,
  type Suit,
} from './icons'

export const BET = 'fof:bet'
const SWAP = 'fof:swap'

export type Game =
  'poker' | 'roulette' | 'baccarat' | 'slots' | 'highRoller' | 'medallion' | 'vault'

interface GameRules {
  location: string
  cost: number
  count: number
  /** Veces que se puede cambiar cartas. */
  mulligans: number
  /** Recursos ganados con estos iconos (0 si no gana). */
  prize: (icons: GameIcon[], bet: string) => number
}

export const GAMES: Record<Game, GameRules> = {
  poker: {
    location: CODES.pokerTable,
    cost: 2,
    count: 5,
    mulligans: 1,
    prize: (icons) => (sequential(icons) || mostOfARank(icons) >= 3 ? 5 : 0),
  },
  roulette: {
    location: CODES.rouletteWheel,
    cost: 1,
    count: 1,
    mulligans: 0,
    prize: ([icon], bet) => {
      const [color, rank] = bet.split(':')
      return icon && colorOf(icon.suit) === color && String(icon.rank) === rank ? 5 : 0
    },
  },
  baccarat: {
    location: CODES.baccaratTable,
    cost: 2,
    count: 2,
    mulligans: 0,
    prize: (icons, bet) => {
      const total = totalValue(icons)
      const result = total > 18 ? 'player' : total < 18 ? 'banker' : 'tie'
      return result === bet ? 4 : 0
    },
  },
  slots: {
    location: CODES.slotMachines,
    cost: 1,
    count: 3,
    mulligans: 0,
    prize: (icons) => (sameSuit(icons) || mostOfARank(icons) === 3 ? 3 : 0),
  },
  highRoller: {
    location: CODES.highRollersTable,
    cost: 4,
    count: 5,
    mulligans: 1,
    prize: (icons) => (sameSuit(icons) || sequential(icons) || mostOfARank(icons) >= 4 ? 8 : 0),
  },
  medallion: {
    location: CODES.highRollersTableBusy,
    cost: 4,
    count: 5,
    mulligans: 1,
    prize: (icons) => (sameSuit(icons) || sequential(icons) || mostOfARank(icons) >= 4 ? 8 : 0),
  }, // Puerta de la cámara: [action] Moverse según el palo (no es un Lugar Juego).
  vault: {
    location: CODES.vaultDoor,
    cost: 0,
    count: 1,
    mulligans: 0,
    prize: () => 0,
  },
}

export const gameAt = (location: string): Game | undefined =>
  (Object.keys(GAMES) as Game[]).find((g) => GAMES[g].location === location)

const specific = (key: string, data: Record<string, string | number | boolean>): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})

const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[], params = {}) =>
  ({
    type: 'Ask',
    investigator,
    question: { kind: 'chooseOne', prompt, promptParams: params, choices },
  }) as Message

/** Mensajes que inician el juego tras pagar su coste (la apuesta, si la hay). */
export function playGame(investigator: InvestigatorId, game: Game): Message[] {
  const check = (bet: string) => [specific('fofCheck', { investigator, game, bet })]
  if (game === 'roulette')
    return [
      ask(
        investigator,
        'prompt.fof.color',
        (['red', 'black'] as const).map((color) => ({
          label: `choice.fof.${color}`,
          then: [
            ask(
              investigator,
              'prompt.fof.rank',
              RANKS.map((rank) => ({
                label: 'choice.fof.rank',
                params: { rank: String(rank) },
                then: check(`${color}:${rank}`),
              })),
            ),
          ],
        })),
      ),
    ]
  if (game === 'baccarat')
    return [
      ask(
        investigator,
        'prompt.fof.baccarat',
        ['player', 'banker', 'tie'].map((bet) => ({
          label: `choice.fof.${bet}`,
          then: check(bet),
        })),
      ),
    ]
  return check('')
}

/** Habilidad [action] de un Lugar Juego, si el investigador puede pagarla. */
export function gameAbility(
  state: GameState,
  investigator: InvestigatorId,
  game: Game,
  extraActions: number,
): AbilityOption[] {
  const rules = GAMES[game]
  if (getInvestigator(state, investigator).resources < rules.cost) return []
  return [
    {
      key: `${rules.location}:game`,
      label: `ability.fof.${game}`,
      actions: 1 + extraActions,
      provokes: true,
      costs: [{ type: 'SpendResources', investigator, amount: rules.cost }],
      then: playGame(investigator, game),
    },
  ]
}

const iconList = (state: GameState) => checkedIcons(state).map(formatIcon).join(' ')

const grifterOf = (state: GameState, investigator: InvestigatorId) =>
  Object.values(state.assets).find(
    (a) =>
      a.owner === investigator &&
      !a.exhausted &&
      (a.code === CODES.theGrifter || a.code === practiced(CODES.theGrifter)),
  )

/** Pregunta de cambiar cartas: marcar las comprobadas que se apartan y confirmar. */
function mulliganQuestion(state: GameState, data: Record<string, string | number | boolean>) {
  const investigator = String(data.investigator)
  const chosen = String(state.scenarioMeta?.[SWAP] ?? '')
    .split(',')
    .filter(Boolean)
    .map(Number)
  const icons = checkedIcons(state)
  return ask(
    investigator,
    'prompt.fof.mulligan',
    [
      ...icons.map((icon, n) => ({
        label: chosen.includes(n) ? 'choice.fof.keepIcon' : 'choice.fof.swapIcon',
        params: { icon: formatIcon(icon) },
        then: [specific('fofToggle', { ...data, position: n })],
      })),
      ...(chosen.length
        ? [{ label: 'choice.fof.swapChosen', then: [specific('fofSwap', data)] }]
        : []),
      {
        label: 'choice.fof.noMulligan',
        then: [{ type: 'SetScenarioMeta', key: SWAP, value: '' } as Message],
      },
    ],
    { icons: iconList(state) },
  )
}

/** El estafador: cambiar iconos subiendo la alarma, o bajar la alarma. */
function grifterQuestion(state: GameState, investigator: InvestigatorId): Message[] {
  const grifter = grifterOf(state, investigator)
  if (!grifter) return []
  const changes = grifter.code === CODES.theGrifter ? 1 : 2
  const exhaust: Message = { type: 'ExhaustAsset', asset: grifter.id }
  return [
    ask(
      investigator,
      'prompt.fof.grifter',
      [
        {
          label: 'choice.fof.grifterChange',
          params: { count: changes },
          then: [
            exhaust,
            adjustAlarmMessage(investigator, 1),
            specific('fofGrifterPick', { investigator, remaining: changes, first: true }),
          ],
        },
        {
          label: 'choice.fof.grifterCalm',
          then: [exhaust, adjustAlarmMessage(investigator, -1)],
        },
        { label: 'choice.skip', then: [] },
      ],
      { icons: iconList(state) },
    ),
  ]
}

/** Pasos del juego; null si la clave no es de aquí. */
export function gameSpecific(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState | null {
  const investigator = String(data.investigator)
  const push = (...messages: Message[]): GameState => ({
    ...state,
    queue: [...messages, ...state.queue],
  })
  switch (key) {
    case 'fofCheck': {
      const game = data.game as Game
      const rules = GAMES[game]
      const mulligans = Number(data.mulligans ?? rules.mulligans)
      const next = checkIcons(state, rules.count)
      const checked = {
        ...next,
        scenarioMeta: { ...next.scenarioMeta, [BET]: String(data.bet ?? '') },
      }
      return {
        ...checked,
        queue: [
          { type: 'Log', key: 'log.fof.checked', params: { icons: iconList(checked) } },
          ...(mulligans > 0 && checkedIcons(checked).length
            ? [specific('fofMulligan', { investigator, game, remaining: mulligans })]
            : []),
          // El estafador solo actúa en los Lugares Juego.
          ...(game === 'vault' ? [] : [specific('fofGrifter', { investigator })]),
          specific('fofPrize', { investigator, game }),
          ...state.queue,
        ],
      }
    }
    case 'fofMulligan':
      return push(mulliganQuestion(state, data))
    case 'fofToggle': {
      const chosen = String(state.scenarioMeta?.[SWAP] ?? '')
        .split(',')
        .filter(Boolean)
        .map(Number)
      const n = Number(data.position)
      const next = chosen.includes(n) ? chosen.filter((p) => p !== n) : [...chosen, n]
      const toggled = {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [SWAP]: next.join(',') },
      }
      return { ...toggled, queue: [mulliganQuestion(toggled, data), ...state.queue] }
    }
    case 'fofSwap': {
      const positions = String(state.scenarioMeta?.[SWAP] ?? '')
        .split(',')
        .filter(Boolean)
        .map(Number)
      const swapped = swapIcons(state, positions)
      return {
        ...swapped,
        scenarioMeta: { ...swapped.scenarioMeta, [SWAP]: '' },
        queue: [
          { type: 'Log', key: 'log.fof.checked', params: { icons: iconList(swapped) } },
          // La Puerta de la cámara permite cambiar cartas hasta dos veces.
          ...(Number(data.remaining ?? 1) > 1
            ? [specific('fofMulligan', { ...data, remaining: Number(data.remaining) - 1 })]
            : []),
          ...state.queue,
        ],
      }
    }
    case 'fofGrifter':
      return push(...grifterQuestion(state, investigator))
    case 'fofGrifterPick': {
      const remaining = Number(data.remaining)
      if (remaining <= 0) return state
      const icons = checkedIcons(state)
      return push(
        ask(
          investigator,
          'prompt.fof.grifterPick',
          [
            ...icons.map((icon, n) => ({
              label: 'choice.fof.icon',
              params: { icon: formatIcon(icon) },
              then: [
                ask(
                  investigator,
                  'prompt.fof.suit',
                  SUITS.map((suit) => ({
                    label: 'choice.fof.suit',
                    params: { suit },
                    then: [
                      ask(
                        investigator,
                        'prompt.fof.rank',
                        RANKS.map((rank) => ({
                          label: 'choice.fof.rank',
                          params: { rank: String(rank) },
                          then: [
                            specific('fofGrifterSet', {
                              investigator,
                              position: n,
                              icon: formatIcon({ suit, rank }),
                            }),
                            specific('fofGrifterPick', {
                              investigator,
                              remaining: remaining - 1,
                              first: false,
                            }),
                          ],
                        })),
                      ),
                    ],
                  })),
                ),
              ],
            })),
            // La segunda carta del estafador experimentado es opcional («hasta 2»).
            ...(data.first ? [] : [{ label: 'choice.skip', then: [] as Message[] }]),
          ],
          { icons: iconList(state) },
        ),
      )
    }
    case 'fofGrifterSet': {
      const text = String(data.icon)
      const changed = changeIcon(state, Number(data.position), {
        suit: text[0] as Suit,
        rank: (/^\d+$/.test(text.slice(1)) ? Number(text.slice(1)) : text.slice(1)) as never,
      })
      return {
        ...changed,
        queue: [
          { type: 'Log', key: 'log.fof.checked', params: { icons: iconList(changed) } },
          ...state.queue,
        ],
      }
    }
    case 'fofPrize': {
      const game = data.game as Game
      const rules = GAMES[game]
      const icons = checkedIcons(state)
      const bet = String(state.scenarioMeta?.[BET] ?? '')
      const prize = icons.length === rules.count ? rules.prize(icons, bet) : 0
      const cleared = {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [CHECKED]: '', [BET]: '' },
      }
      if (game === 'vault') {
        // ♣ o ♠: Sala de guardias; ♥: Bar del casino; ♦: Mesa de bacará.
        const suit = icons[0]?.suit
        const to =
          suit === '♥'
            ? CODES.casinoLoungeBusy
            : suit === '♦'
              ? CODES.baccaratTable
              : suit
                ? CODES.guardRoom
                : null
        return to
          ? { ...cleared, queue: [{ type: 'MoveTo', investigator, location: to }, ...state.queue] }
          : cleared
      }
      return {
        ...cleared,
        queue: [
          ...(prize > 0
            ? [
                { type: 'GainResources', investigator, amount: prize } as Message,
                { type: 'Log', key: 'log.fof.won', params: { amount: prize } } as Message,
                // Mesa de apuestas altas (noche ajetreada): «ganasteis un medallón sectario».
                ...(game === 'medallion'
                  ? [{ type: 'RecordNote', note: 'fofWonACultistMedallion' } as Message]
                  : []),
              ]
            : [{ type: 'Log', key: 'log.fof.lost' } as Message]),
          specific('fofGamePlayed', { investigator, gained: prize > 0 }),
          ...state.queue,
        ],
      }
    }
  }
  return null
}
