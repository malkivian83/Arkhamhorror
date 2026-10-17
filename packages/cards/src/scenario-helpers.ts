/**
 * Ayudas para escribir escenarios: datos de cartas de encuentro, pruebas
 * exigidas por efectos, habilidades habituales y textos de resolución con sus
 * efectos de campaña. Las comparten todos los escenarios de todas las campañas.
 */
import type {
  AbilityOption,
  EnemyCard,
  InvestigatorId,
  Message,
  ScenarioOutcome,
  SkillType,
  StoryEntry,
  TreacheryCard,
} from '@lcg/engine'

// ---------------------------------------------------------------------------
// Datos de cartas
// ---------------------------------------------------------------------------

export const enemy = (card: Omit<EnemyCard, 'kind'>): EnemyCard => ({ kind: 'enemy', ...card })

export const treachery = (card: Omit<TreacheryCard, 'kind'>): TreacheryCard => ({
  kind: 'treachery',
  ...card,
})

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
  results: { onSuccess?: Message[]; onFail?: Message[]; onFailEach?: Message[] },
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
