/**
 * Ayudas para escribir escenarios: datos de cartas de encuentro, pruebas
 * exigidas por efectos, habilidades habituales y textos de resolución con sus
 * efectos de campaña. Las comparten todos los escenarios de todas las campañas.
 */
import {
  isPermanent,
  playerCardDef,
  type AbilityOption,
  type Asset,
  type Choice,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
  type ScenarioOutcome,
  type SkillType,
  type StoryEntry,
  type TreacheryCard,
} from '@lcg/engine'

// ---------------------------------------------------------------------------
// Datos de cartas
// ---------------------------------------------------------------------------

export const enemy = (card: Omit<EnemyCard, 'kind'>): EnemyCard => ({ kind: 'enemy', ...card })

export const treachery = (card: Omit<TreacheryCard, 'kind'>): TreacheryCard => ({
  kind: 'treachery',
  ...card,
})

/** Apoyos en juego en una localización (los de los investigadores que están en ella). */
export function assetsAt(state: GameState, location: LocationId): Asset[] {
  const here = new Set(
    state.investigators.filter((i) => !i.eliminated && i.location === location).map((i) => i.id),
  )
  return Object.values(state.assets).filter((a) => here.has(a.owner))
}

/** Apoyos con salud de una localización ("cartas con salud" que no son investigadores). */
export const assetsWithHealthAt = (state: GameState, location: LocationId): Asset[] =>
  assetsAt(state, location).filter((a) => (playerCardDef(a.code)?.health ?? 0) > 0)

/** Aliados de una localización. */
export const alliesAt = (state: GameState, location: LocationId): Asset[] =>
  assetsAt(state, location).filter((a) => (playerCardDef(a.code)?.traits ?? []).includes('Ally'))

/** 1 daño a cada apoyo con salud de la localización. */
export const damageAssetsAt = (state: GameState, location: LocationId, amount = 1): Message[] =>
  assetsWithHealthAt(state, location).map((a): Message => ({
    type: 'DamageAsset',
    asset: a.id,
    damage: amount,
    horror: 0,
  }))

/** El investigador elige y descarta uno de sus apoyos (que no sea permanente ni de historia). */
export function chooseAssetToDiscard(state: GameState, investigator: InvestigatorId): Message[] {
  const mine = Object.values(state.assets).filter(
    (a) =>
      a.owner === investigator &&
      !isPermanent(a.code) &&
      !(playerCardDef(a.code)?.traits ?? []).includes('Story'),
  )
  if (mine.length === 0) return []
  return [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseCardToDiscard',
        choices: mine.map((a): Choice => ({
          label: 'choice.discard',
          params: { card: playerCardDef(a.code)?.name ?? a.code },
          target: { type: 'asset', id: a.id },
          then: [{ type: 'DiscardAsset', asset: a.id }],
        })),
      },
    },
  ]
}

/** `n` copias independientes de una carta (para mazos de encuentros). */
export const copies = <T>(card: T, n: number): T[] => Array.from({ length: n }, () => ({ ...card }))

// ---------------------------------------------------------------------------
// Pruebas y efectos
// ---------------------------------------------------------------------------

/** Prueba exigida por un efecto ("Prueba [habilidad] (X)…"). */
export function effectTest(
  investigator: InvestigatorId,
  source: string,
  skill: SkillType,
  difficulty: number,
  results: {
    onSuccess?: Message[]
    onFail?: Message[]
    onFailEach?: Message[]
    onSuccessEach?: Message[]
  },
): Message {
  return {
    type: 'BeginSkillTest',
    investigator,
    skill,
    difficulty,
    kind: {
      type: 'effect',
      source,
      onSuccess: results.onSuccess ?? [],
      onFail: results.onFail ?? [],
      onFailEach: results.onFailEach ?? [],
      ...(results.onSuccessEach ? { onSuccessEach: results.onSuccessEach } : {}),
    },
  }
}

/** "Prueba X o Y": el investigador elige la habilidad. */
export function chooseSkillTest(
  investigator: InvestigatorId,
  source: string,
  skills: SkillType[],
  difficulty: number,
  results: Parameters<typeof effectTest>[4],
): Message {
  return {
    type: 'Ask',
    investigator,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.chooseSkill',
      choices: skills.map((skill) => ({
        label: `choice.test.${skill}`,
        params: { difficulty },
        then: [effectTest(investigator, source, skill, difficulty, results)],
      })),
    },
  }
}

export const damage = (investigator: InvestigatorId, amount: number, horror = 0): Message => ({
  type: 'TakeDamage',
  investigator,
  damage: amount,
  horror,
})

/** "[acción]: Retirarse." */
export const resignAbility = (investigator: InvestigatorId, key: string): AbilityOption => ({
  key,
  label: 'ability.resign',
  actions: 1,
  provokes: false,
  then: [{ type: 'Resign', investigator }],
})

// ---------------------------------------------------------------------------
// Resoluciones y registro de campaña
// ---------------------------------------------------------------------------

/**
 * Textos de historia de un escenario: `story.<escenario>.<clave>` y su título
 * `…Title`, con los efectos de campaña que se muestran debajo.
 */
export const storyEntries =
  (scenarioKey: string) =>
  (key: string, effects: StoryEntry['effects'] = []): StoryEntry => ({
    title: `story.${scenarioKey}.${key}Title`,
    body: `story.${scenarioKey}.${key}`,
    effects,
  })

/** Efecto mostrado: "Anotad en el registro de campaña: …". */
export const noteEffect = (key: string) => ({
  key: 'story.effect.record',
  params: { note: `story.note.${key}` },
})

/** Anota una nota (con un valor opcional) en el registro de campaña. */
export const recordNote = (key: string, value?: string): Message => ({
  type: 'RecordNote',
  note: key,
  ...(value !== undefined ? { value } : {}),
})

/** Experiencia para cada investigador, con la zona de victoria si `victory`. */
export const earnExperience = (bonus: number, victory = false): Message => ({
  type: 'EarnExperience',
  amount: bonus,
  ...(victory ? { victory } : {}),
})

/** Fin del escenario ya contado (tras los textos de resolución). */
export const endScenario = (outcome: ScenarioOutcome): Message => ({
  type: 'EndScenario',
  outcome,
  told: true,
})

export const resolution = (n: number): ScenarioOutcome => ({ type: 'resolution', resolution: n })
