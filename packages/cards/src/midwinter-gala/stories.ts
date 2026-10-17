/**
 * Cartas de Historia de las facciones: la cara Aliado (objetivo para conseguir la
 * Joya y puntos de fin de partida) y la cara Rival (su Líder como enemigo).
 */
import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  placedLocation,
  push,
  registerStory,
  type AbilityOption,
  type GameState,
  type InvestigatorId,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { CODES, FACTION_CARDS, FACTIONS, RIVAL_LEADERS, type Faction } from './cards'
import { extendGala } from './gala'
import { bloodlessMan, declan, jewel, jewelControlled, perInv } from './helpers'

const totalClues = (state: GameState) => activeInvestigators(state).reduce((n, i) => n + i.clues, 0)

/**
 * Objetivo de la facción: al final de la ronda, si se cumple, el grupo puede gastar
 * pistas para avanzar el acto (y terminar la partida).
 */
function objective(state: GameState, cost: number): Message[] {
  const lead = leadInvestigator(state)
  if (!lead || state.acts[state.actIndex]?.code !== CODES.findingTheJewel) return []
  if (totalClues(state) < cost) return []
  return [
    {
      type: 'Ask',
      investigator: lead.id,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.gala.objective',
        promptParams: { n: cost },
        choices: [
          {
            label: 'choice.gala.completeObjective',
            params: { n: cost },
            then: [
              ...(cost > 0
                ? [
                    {
                      type: 'PayGroupClues',
                      amount: cost,
                      from: activeInvestigators(state).map((i) => i.id),
                    } as Message,
                  ]
                : []),
              { type: 'SetScenarioMeta', key: 'jewelObjective', value: 1 },
              { type: 'CheckActObjective' },
            ],
          },
          { label: 'choice.gala.notYet', then: [] },
        ],
      },
    },
  ]
}

const roundEnds = (trigger: { type: string }) => trigger.type === 'roundEnds'

/** Prueba con una habilidad a elegir. */
const testWith = (
  investigator: InvestigatorId,
  source: string,
  skills: SkillType[],
  difficulty: number,
  onSuccess: Message[],
  tags: string[] = [],
): Message => ({
  type: 'Ask',
  investigator,
  question: {
    kind: 'chooseOne',
    prompt: 'prompt.chooseSkill',
    choices: skills.map((skill) => ({
      label: `choice.test.${skill}`,
      params: { difficulty },
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          skill,
          difficulty,
          tags,
          kind: { type: 'effect', source, onSuccess, onFail: [], onFailEach: [] },
        },
      ],
    })),
  },
})

// ---------------------------------------------------------------------------
// La Fundación
// ---------------------------------------------------------------------------

registerStory({
  code: FACTION_CARDS.foundation.story,
  // Si la Joya está en tu localización y El Exangüe no está en juego: tómala y ponle 1 daño.
  abilities: (state, self, investigator) => {
    const { placed } = jewel(state)
    const here = getInvestigator(state, investigator).location
    if (!placed || bloodlessMan(state) || placedLocation(state, placed) !== here) return []
    return [
      {
        key: `${self.code}:take`,
        label: 'ability.gala.takeJewel',
        actions: 1,
        provokes: true,
        then: [
          { type: 'TakeControlOfPlaced', placed: placed.id, investigator },
          { type: 'ScenarioSpecific', key: 'addJewelDamage' },
        ],
      },
    ]
  },
  forced: (state, trigger) =>
    roundEnds(trigger) && jewelControlled(state) ? objective(state, perInv(state, 2)) : [],
})

// ---------------------------------------------------------------------------
// Universidad Miskatonic
// ---------------------------------------------------------------------------

registerStory({
  code: FACTION_CARDS.miskatonic.story,
  // Negociar con Declan Pearce: pon hasta 2 de tus pistas sobre él; con 3 por investigador,
  // tomas la Joya y Declan va a la zona de victoria.
  abilities: (state, self, investigator) => {
    const d = declan(state)
    const me = getInvestigator(state, investigator)
    if (!d || d.location !== me.location || me.clues < 1) return []
    return [1, 2]
      .filter((n) => n <= me.clues)
      .map((n): AbilityOption => ({
        key: `${self.code}:declan`,
        label: 'ability.gala.convinceDeclan',
        params: { n },
        actions: 1,
        provokes: false,
        target: { type: 'enemy', id: d.id },
        then: [
          { type: 'ScenarioSpecific', key: 'convinceDeclan', data: { investigator, amount: n } },
        ],
      }))
  },
  forced: (state, trigger) =>
    roundEnds(trigger) && jewelControlled(state) ? objective(state, 0) : [],
})

// ---------------------------------------------------------------------------
// El Sindicato
// ---------------------------------------------------------------------------

registerStory({
  code: FACTION_CARDS.syndicate.story,
  abilities: (state, self, investigator) => {
    const me = getInvestigator(state, investigator)
    const here = me.location
    const location = here ? state.locations[here] : undefined
    const mysteries = location?.beneath?.length ?? 0
    if (!location || mysteries === 0) return []
    const options: AbilityOption[] = []
    const cost = perInv(state, 1)
    // Gasta 1 pista por investigador: mira un misterio bajo tu localización.
    if (me.clues >= cost) {
      options.push({
        key: `${self.code}:look`,
        label: 'ability.gala.lookMystery',
        params: { n: cost },
        actions: 1,
        provokes: true,
        then: [
          { type: 'SpendClues', investigator, amount: cost },
          { type: 'ScenarioSpecific', key: 'lookMystery', data: { investigator } },
        ],
      })
    }
    // Durante tu turno, con 1 o menos pistas por investigador en la localización: roba el misterio.
    if (state.activeTurn === investigator && location.clues <= perInv(state, 1)) {
      options.push({
        key: `${self.code}:draw`,
        label: 'ability.gala.drawMystery',
        actions: 0,
        provokes: false,
        then: [{ type: 'DrawBeneath', investigator, location: location.id }],
      })
    }
    return options
  },
  // Objetivo: un investigador en el Vestíbulo controla la Joya; 4 pistas por investigador.
  forced: (state, trigger) => {
    if (!roundEnds(trigger)) return []
    const { asset } = jewel(state)
    if (!asset || getInvestigator(state, asset.owner).location !== CODES.lobby) return []
    return objective(state, perInv(state, 4))
  },
})

// ---------------------------------------------------------------------------
// La Logia del Crepúsculo de Plata
// ---------------------------------------------------------------------------

registerStory({
  code: FACTION_CARDS.lodge.story,
  // Descarta la carta superior de encuentros; puedes robarla (dos veces por ronda, en grupo).
  abilities: (state, self, investigator) => {
    const used = Number(state.scenarioMeta?.[`lodgeSense:${state.round}`] ?? 0)
    if (used >= 2 || state.encounterDeck.length === 0) return []
    return [
      {
        key: `${self.code}:sense:${used}`,
        label: 'ability.gala.senseJewel',
        actions: 1,
        provokes: true,
        then: [{ type: 'ScenarioSpecific', key: 'senseJewel', data: { investigator } }],
      },
    ]
  },
  forced: (state, trigger) =>
    roundEnds(trigger) && jewelControlled(state) ? objective(state, perInv(state, 5)) : [],
})

// ---------------------------------------------------------------------------
// Lugareños de Kingsport
// ---------------------------------------------------------------------------

registerStory({
  code: FACTION_CARDS.kingsport.story,
  // Si la Joya está en tu localización: [combat] o [agility] (3) para quitarle 1 ficha; puedes tomarla.
  abilities: (state, self, investigator) => {
    const { placed } = jewel(state)
    const here = getInvestigator(state, investigator).location
    if (!placed || placed.placement.type !== 'location' || placed.placement.location !== here)
      return []
    return [
      {
        key: `${self.code}:purge`,
        label: 'ability.gala.purgeJewel',
        actions: 1,
        provokes: true,
        then: [
          testWith(investigator, 'Locals of Kingsport', ['combat', 'agility'], 3, [
            { type: 'ScenarioSpecific', key: 'purgeJewel', data: { investigator } },
          ]),
        ],
      },
    ]
  },
  // Objetivo: controlar la Joya sin fichas; 3 pistas por investigador.
  forced: (state, trigger) => {
    const { asset } = jewel(state)
    if (!roundEnds(trigger) || !asset || asset.damage > 0 || (asset.doom ?? 0) > 0) return []
    return objective(state, perInv(state, 3))
  },
})

// ---------------------------------------------------------------------------
// Caras Rival
// ---------------------------------------------------------------------------

const RIVAL_TEST: Record<Faction, { skills: SkillType[]; difficulty: number }> = {
  foundation: { skills: ['combat'], difficulty: 3 },
  miskatonic: { skills: ['intellect'], difficulty: 3 },
  syndicate: { skills: ['agility'], difficulty: 3 },
  lodge: { skills: ['willpower'], difficulty: 3 },
  kingsport: { skills: ['willpower', 'intellect', 'combat', 'agility'], difficulty: 4 },
}

for (const faction of FACTIONS) {
  const cards = FACTION_CARDS[faction]
  const leader = RIVAL_LEADERS[faction]
  const code = `${cards.story}b`
  registerStory({
    code,
    // Preparación: baraja su carta Rival en el mazo de encuentros y su Líder aparece en la
    // localización del jefe.
    onEnter: (state) => {
      const lead = leadInvestigator(state)
      return [
        { type: 'ShuffleSetAsideIntoEncounter', codes: [cards.rivalCard] },
        ...(lead?.location
          ? [{ type: 'SpawnSetAsideEnemy', code: leader.code, location: lead.location } as Message]
          : []),
      ]
    },
    // Negociar con su Líder: si tienes éxito, pon 1 de tus pistas aquí. Con 1 por investigador,
    // la carta y el Líder van a la zona de victoria.
    abilities: (state, self, investigator) => {
      const here = getInvestigator(state, investigator).location
      const enemy = Object.values(state.enemies).find(
        (e) => e.code === leader.code && e.location === here,
      )
      if (!enemy) return []
      const { skills, difficulty } = RIVAL_TEST[faction]
      return [
        {
          key: `${self.code}:parley`,
          label: 'ability.gala.parleyRival',
          params: { enemy: enemy.name },
          actions: 1,
          provokes: false,
          target: { type: 'enemy', id: enemy.id },
          then: [
            testWith(
              investigator,
              self.name,
              skills,
              difficulty,
              [
                { type: 'PlaceCluesOnStory', code: self.code, investigator, amount: 1 },
                { type: 'ScenarioSpecific', key: 'checkRival', data: { story: self.code } },
              ],
              ['parley'],
            ),
          ],
        },
      ]
    },
  })
}

// ---------------------------------------------------------------------------
// Mensajes propios de las facciones
// ---------------------------------------------------------------------------

type Data = Record<string, string | number | boolean>

function specific(state: GameState, key: string, data: Data): GameState {
  const investigator = data.investigator as InvestigatorId
  switch (key) {
    // Universidad: pistas sobre Declan; con 3 por investigador, la Joya y Declan a la zona de victoria.
    case 'convinceDeclan': {
      const d = declan(state)
      if (!d) return state
      const me = getInvestigator(state, investigator)
      const amount = Math.min(Number(data.amount), me.clues)
      const leads = (d.leads ?? 0) + amount
      let next: GameState = {
        ...state,
        enemies: { ...state.enemies, [d.id]: { ...d, leads } },
        investigators: state.investigators.map((i) =>
          i.id === me.id ? { ...i, clues: i.clues - amount } : i,
        ),
      }
      if (leads < perInv(state, 3)) return next
      const { placed } = jewel(next)
      const { [d.id]: _gone, ...enemies } = next.enemies
      next = { ...next, enemies, victoryDisplay: [...next.victoryDisplay, d.code] }
      return placed
        ? push(next, { type: 'TakeControlOfPlaced', placed: placed.id, investigator })
        : next
    }
    // Sindicato: mirar un misterio (solo lo ve quien mira).
    case 'lookMystery': {
      const here = getInvestigator(state, investigator).location
      const card = here ? state.locations[here]?.beneath?.[0] : undefined
      if (!card) return state
      return push(state, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.gala.mystery',
          promptParams: { card: card.name },
          choices: [{ label: 'choice.continue', then: [] }],
        },
      })
    }
    // Logia: descarta la carta superior de encuentros; puedes robarla.
    case 'senseJewel': {
      const [top, ...rest] = state.encounterDeck
      if (!top) return state
      const used = Number(state.scenarioMeta?.[`lodgeSense:${state.round}`] ?? 0)
      const next: GameState = {
        ...state,
        encounterDeck: rest,
        encounterDiscard: [...state.encounterDiscard, top],
        scenarioMeta: { ...(state.scenarioMeta ?? {}), [`lodgeSense:${state.round}`]: used + 1 },
      }
      return push(next, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.gala.sensed',
          promptParams: { card: top.name },
          choices: [
            {
              label: 'choice.gala.drawIt',
              then: [{ type: 'DrawFromEncounterDiscard', investigator, code: top.code }],
            },
            { label: 'choice.gala.leaveDiscarded', then: [] },
          ],
        },
      })
    }
    // Kingsport: quitar 1 ficha de la Joya; después puedes tomarla.
    case 'purgeJewel': {
      const { placed } = jewel(state)
      if (!placed) return state
      const kinds = (['damage', 'doom'] as const).filter((k) => (placed[k] ?? 0) > 0)
      return push(state, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.gala.jewelToken',
          choices: [
            ...kinds.map((kind) => ({
              label: 'choice.gala.jewelRemove',
              params: { kind },
              then: [
                { type: 'ScenarioSpecific', key: 'removeJewelToken', data: { kind } } as Message,
                {
                  type: 'ScenarioSpecific',
                  key: 'mayTakeJewel',
                  data: { investigator },
                } as Message,
              ],
            })),
            ...(kinds.length === 0
              ? [
                  {
                    label: 'choice.continue',
                    then: [
                      {
                        type: 'ScenarioSpecific',
                        key: 'mayTakeJewel',
                        data: { investigator },
                      } as Message,
                    ],
                  },
                ]
              : []),
          ],
        },
      })
    }
    case 'mayTakeJewel': {
      const { placed } = jewel(state)
      if (!placed) return state
      return push(state, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.gala.takeJewel',
          choices: [
            {
              label: 'choice.gala.takeJewel',
              then: [{ type: 'TakeControlOfPlaced', placed: placed.id, investigator }],
            },
            { label: 'choice.skip', then: [] },
          ],
        },
      })
    }
    // Rival derrotado: la carta y su Líder van a la zona de victoria; su carta Rival sale de la partida.
    case 'checkRival': {
      const story = state.stories?.[data.story as string]
      if (!story || story.clues < perInv(state, 1)) return state
      const faction = FACTIONS.find((f) => `${FACTION_CARDS[f].story}b` === story.code)
      if (!faction) return state
      const leader = Object.values(state.enemies).find(
        (e) => e.code === RIVAL_LEADERS[faction].code,
      )
      const rivalCard = FACTION_CARDS[faction].rivalCard
      const enemies = { ...state.enemies }
      if (leader) delete enemies[leader.id]
      const stories = { ...state.stories }
      delete stories[story.code]
      const treacheries = Object.fromEntries(
        Object.entries(state.treacheries).filter(([, t]) => t.code !== rivalCard),
      )
      const rivalEnemies = Object.values(enemies).filter((e) => e.code === rivalCard)
      for (const e of rivalEnemies) delete enemies[e.id]
      return push(
        {
          ...state,
          enemies,
          stories,
          treacheries,
          encounterDeck: state.encounterDeck.filter((c) => c.code !== rivalCard),
          encounterDiscard: state.encounterDiscard.filter((c) => c.code !== rivalCard),
          victoryDisplay: [...state.victoryDisplay, story.code, ...(leader ? [leader.code] : [])],
        },
        { type: 'Log', key: 'log.gala.rivalDefeated', params: { name: story.name } },
      )
    }
    default:
      return state
  }
}

extendGala({ specific })
