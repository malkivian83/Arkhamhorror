import {
  applyInput,
  getInvestigator,
  nextInt,
  nextStepToward,
  seedRng,
  type Choice,
  type GameState,
  type RngState,
} from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import {
  canPlayNext,
  chooseTransferHeir,
  finishScenario,
  newCampaign,
  pendingTransfers,
  startScenario,
} from '../campaign'
import '../index'
import { CODES } from './curtain-call'
import { carcosaCount } from './log'
import { THE_MAN_IN_THE_PALLID_MASK } from './the-man-in-the-pallid-mask'

// Primero quienes mejor investigan: el acto 1 pide pistas en Lugares de velo alto.
const KEYS = ['joe', 'trish', 'isabelle', 'dexter'] as const

/** Enemigos que el plan guiado combate; al resto los evita o se aleja de ellos. */
const WEAK = ['Swarm of Rats', 'Fanatic', 'The Man in the Pallid Mask']

/** Lugar al que quiere ir el grupo según el acto en curso. */
function target(state: GameState): string | null {
  const act = state.acts[state.actIndex]?.code
  const man = Object.values(state.enemies).find((e) => e.code === THE_MAN_IN_THE_PALLID_MASK)
  if (act === CODES.awakening) {
    // El Lugar revelado con pistas de menor velo; si no hay, uno sin revelar.
    const withClues = Object.values(state.locations).filter((l) => l.revealed && l.clues > 0)
    const best = withClues.sort((a, b) => a.shroud - b.shroud)[0]
    return best?.id ?? Object.values(state.locations).find((l) => !l.revealed)?.id ?? null
  }
  if (man) return man.location
  return CODES.lobby
}

/**
 * Decide como un grupo con un plan sencillo: avanzar el acto, investigar con pistas,
 * perseguir al Extranjero, retirarse en el Vestíbulo. El resto, al azar con semilla.
 */
function decide(state: GameState, rng: RngState): [number, RngState] {
  const { choices } = state.pending!.question
  const me = getInvestigator(state, state.pending!.investigator)
  const find = (test: (c: Choice) => boolean) => choices.findIndex(test)
  const goal = target(state)
  const step =
    me.location && goal && me.location !== goal
      ? nextStepToward(state, me.location, (l) => l === goal)
      : null
  const here = me.location ? state.locations[me.location] : undefined
  const engaged = Object.values(state.enemies).filter((e) => e.engagedWith === me.id)
  const action = state.pending!.question.prompt === 'prompt.chooseAction'
  const order = [
    find((c) => c.label === 'action.advanceAct'),
    find((c) => c.label === 'ability.resign'),
    // Enfrentado: combatir a los débiles y evitar a los demás antes de moverse o investigar.
    engaged.length
      ? find((c) => c.label === 'action.fight' && WEAK.includes(String(c.params?.enemy)))
      : -1,
    engaged.length
      ? find((c) => c.label === 'action.evade' && c.params?.enemy !== 'Royal Emissary')
      : -1,
    // El Extranjero es Indiferente: primero enfrentarse y después atacarlo.
    find((c) => c.label === 'action.engage' && c.params?.enemy === 'The Man in the Pallid Mask'),
    find((c) => c.label === 'ability.carcosaInvestigateStranger'),
    find((c) => c.label === 'action.fight' && c.params?.enemy === 'The Man in the Pallid Mask'),
    here && here.clues > 0 && state.actIndex === 0
      ? find((c) => c.label === 'action.investigate')
      : -1,
    step
      ? find((c) => c.label === 'action.move' && c.params?.location === state.locations[step]?.name)
      : -1,
    find((c) => c.label === 'choice.commit'),
    find((c) => c.label === 'choice.revealToken'),
    find((c) => c.label === 'choice.applyResults'),
    action ? find((c) => c.label === 'action.draw') : -1,
  ]
  const chosen = order.find((n) => n >= 0)
  if (chosen !== undefined) return [chosen, rng]
  // Al azar, pero sin enfrentarse por voluntad propia.
  const safe = choices.flatMap((c, n) => (c.label === 'action.engage' ? [] : [n]))
  const [pick, next] = nextInt(rng, safe.length)
  return [safe[pick]!, next]
}

function play(players: number, seed: number, saveAt = -1) {
  const campaign = newCampaign('the-path-to-carcosa', KEYS.slice(0, players), 'easy')
  let state = startScenario(campaign, seed)
  let rng = seedRng(seed)
  const acts = new Set<string>()
  for (let n = 0; n < 6000 && !state.outcome; n++) {
    let choice: number
    ;[choice, rng] = decide(state, rng)
    state = applyInput(state, { investigator: state.pending!.investigator, choice })
    // Guardar y reanudar: el estado es JSON y la partida sigue igual.
    if (n === saveAt) state = JSON.parse(JSON.stringify(state)) as GameState
    acts.add(state.acts[state.actIndex]?.code ?? '')
  }
  return { campaign, state, acts }
}

describe('Curtain Call: complete games with ordinary inputs', () => {
  const games = [1, 2, 3, 4].flatMap((players) =>
    Array.from({ length: 40 }, (_, n) => ({ players, ...play(players, 100 + n * 11 + players) })),
  )

  it.each([1, 2, 3, 4])(
    '%i investigator(s): every game ends and updates the campaign',
    (players) => {
      for (const { campaign, state } of games.filter((g) => g.players === players)) {
        expect(state.outcome).not.toBeNull()
        const next = finishScenario(campaign, state)
        expect(next.scenarioIndex).toBe(1)
        expect(next.log.notes).toContain('carcosaStrangerIsOnToYou')
        const bearers = Object.values(next.log.investigators).filter((r) =>
          r.storyAssets.includes(THE_MAN_IN_THE_PALLID_MASK),
        )
        expect(bearers).toHaveLength(1)
        if (state.outcome!.type === 'resolution') expect(carcosaCount(next.log, 'chasing')).toBe(2)
        // Las fichas añadidas por el acto 2 no se anotan en la bolsa de la campaña.
        expect(next.log.chaosTokens).toEqual([])
      }
    },
  )

  it('the guided plan reaches every act and the three act 2 variants', () => {
    const acts = new Set(games.flatMap((g) => [...g.acts]))
    for (const code of [CODES.cityAflame, CODES.pathIsMine, CODES.shoresOfHali, CODES.curtainCall])
      expect(acts.has(code), code).toBe(true)
    // R1/R2 solo se alcanzan retirándose en el acto 3.
    for (const { state } of games.filter((g) => g.state.outcome?.type === 'resolution'))
      expect(state.investigators.some((i) => i.resigned)).toBe(true)
  })

  it.each([1, 2] as const)(
    'resigning at the Lobby through the action menu ends with the chosen resolution R%i',
    (resolution) => {
      const campaign = newCampaign('the-path-to-carcosa', ['joe', 'trish'], 'standard')
      let state = startScenario(campaign, 77)
      while (state.pending?.question.prompt !== 'prompt.chooseAction')
        state = applyInput(state, { investigator: state.pending!.investigator, choice: 0 })
      // Acto 3 con el Extranjero ya fuera de juego y el Vestíbulo revelado.
      state = {
        ...state,
        actIndex: state.acts.findIndex((a) => a.code === CODES.curtainCall),
        enemies: {},
        locations: {
          ...state.locations,
          [CODES.lobby]: { ...state.locations[CODES.lobby]!, revealed: true },
        },
        investigators: state.investigators.map((i) => ({ ...i, location: CODES.lobby })),
      }
      state = applyInput(state, {
        investigator: state.pending!.investigator,
        choice: state.pending!.question.choices.findIndex((c) => c.label === 'action.draw'),
      })
      for (let n = 0; n < 50 && !state.outcome; n++) {
        const { choices } = state.pending!.question
        const pick = [
          choices.findIndex((c) => c.label === 'ability.resign'),
          choices.findIndex((c) => c.label === `story.curtainCall.decide${resolution}`),
        ].find((i) => i >= 0)
        state = applyInput(state, { investigator: state.pending!.investigator, choice: pick ?? 0 })
      }
      expect(state.outcome).toEqual({ type: 'resolution', resolution })
      expect(state.investigators.every((i) => i.resigned)).toBe(true)
      const next = finishScenario(campaign, state)
      expect(next.log.notes).toContain(
        resolution === 1 ? 'carcosaWarnedPolice' : 'carcosaAvoidedPolice',
      )
      expect(carcosaCount(next.log, resolution === 1 ? 'conviction' : 'doubt')).toBe(1)
    },
  )

  it('saving and resuming mid-game does not change the result', () => {
    const plain = play(2, 321)
    const resumed = play(2, 321, 40)
    expect(resumed.state.outcome).toEqual(plain.state.outcome)
    expect(resumed.state.campaignLog).toEqual(plain.state.campaignLog)
    expect(resumed.state.round).toBe(plain.state.round)
  })
})

describe('The Path to Carcosa: the Stranger changes bearer when the bearer leaves', () => {
  /** Juega el escenario I y simula que su portador muere en el siguiente. */
  function bearerKilled(players: number) {
    const { campaign, state } = play(players, 133)
    const after = finishScenario(campaign, state)
    const bearer = campaign.investigators.find((i) =>
      after.log.investigators[i.id]!.storyAssets.includes(THE_MAN_IN_THE_PALLID_MASK),
    )!
    const killed = {
      ...state,
      scenarioId: 'curtain-call',
      campaignLog: {
        ...after.log,
        investigators: {
          ...after.log.investigators,
          [bearer.id]: { ...after.log.investigators[bearer.id]!, killed: true },
        },
      },
    }
    const next = finishScenario({ ...after, scenarioIndex: 0 }, killed)
    const others = campaign.investigators.filter((i) => i !== bearer).map((i) => i.id)
    return { next, bearer: bearer.id, others }
  }

  it('passes the weakness to the only remaining investigator', () => {
    const { next, bearer, others } = bearerKilled(2)
    expect(pendingTransfers(next)).toEqual([])
    expect(next.log.investigators[bearer]!.storyAssets).not.toContain(THE_MAN_IN_THE_PALLID_MASK)
    expect(next.log.investigators[others[0]!]!.storyAssets).toContain(THE_MAN_IN_THE_PALLID_MASK)
  })

  it('with several remaining investigators, the group chooses the new bearer', () => {
    const { next, bearer, others } = bearerKilled(3)
    expect(pendingTransfers(next)).toEqual([
      { card: THE_MAN_IN_THE_PALLID_MASK, from: bearer, candidates: others },
    ])
    for (const id of [bearer, ...others])
      expect(next.log.investigators[id]!.storyAssets).not.toContain(THE_MAN_IN_THE_PALLID_MASK)
    expect(() => chooseTransferHeir(next, THE_MAN_IN_THE_PALLID_MASK, bearer)).toThrow()
    const heir = others[1]!
    const chosen = chooseTransferHeir(next, THE_MAN_IN_THE_PALLID_MASK, heir)
    expect(pendingTransfers(chosen)).toEqual([])
    expect(chosen.log.investigators[heir]!.storyAssets).toContain(THE_MAN_IN_THE_PALLID_MASK)
    expect(chosen.log.investigators[others[0]!]!.storyAssets).not.toContain(
      THE_MAN_IN_THE_PALLID_MASK,
    )
    expect(() => chooseTransferHeir(chosen, THE_MAN_IN_THE_PALLID_MASK, heir)).toThrow()
  })

  it('a pending choice blocks the next scenario', () => {
    const campaign = newCampaign('the-path-to-carcosa', ['joe', 'trish', 'isabelle'], 'easy')
    expect(canPlayNext(campaign)).toBe(true)
    const pending = {
      ...campaign,
      log: { ...campaign.log, values: { [`transfer:${THE_MAN_IN_THE_PALLID_MASK}`]: 'dexter' } },
    }
    expect(canPlayNext(pending)).toBe(false)
    expect(() => startScenario(pending, 1)).toThrow('Falta elegir el nuevo portador')
    const heir = campaign.investigators[0]!.id
    expect(canPlayNext(chooseTransferHeir(pending, THE_MAN_IN_THE_PALLID_MASK, heir))).toBe(true)
  })
})
