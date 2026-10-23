/**
 * Investigadores de la caja básica de 2026: su habilidad y el efecto de su
 * signo arcano.
 */
import {
  canCommitFrom,
  enemiesAt,
  getInvestigator,
  isPermanent,
  playerCardBehavior,
  playerCardDef,
  registerInvestigator,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type Message,
  type ReactionOption,
} from '@lcg/engine'
import { code, mayChoose } from './player-cards'

const ROUND = { per: 'round' } as const

const enemiesHere = (state: GameState, investigator: InvestigatorId): Enemy[] => {
  const here = getInvestigator(state, investigator).location
  return here === null ? [] : enemiesAt(state, here)
}

/** Pregunta para elegir un enemigo de tu localización (nada si no hay). */
export function chooseEnemyHere(
  state: GameState,
  investigator: InvestigatorId,
  prompt: string,
  then: (enemy: Enemy) => Message[],
  optional = false,
): Message[] {
  const enemies = enemiesHere(state, investigator)
  if (enemies.length === 0) return []
  return [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt,
        choices: [
          ...enemies.map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy' as const, id: e.id },
            then: then(e),
          })),
          ...(optional ? [{ label: 'choice.skip', then: [] }] : []),
        ],
      },
    },
  ]
}

/** "Puedes desenfrentarte de cada enemigo y moverte a una localización conectada." */
export const disengageAndMove = (investigator: InvestigatorId, revealedOnly = false): Message =>
  mayChoose(investigator, 'choice.disengageAndMove', {}, [
    { type: 'DisengageAll', investigator },
    { type: 'ChooseMove', investigator, revealedOnly },
  ])

// ---------------------------------------------------------------------------
// Daniela Reyes: [reacción] después de que un enemigo ataque a un investigador
// de tu localización, lucha contra ese enemigo (límite 1 por ronda).
// Signo arcano: +1; haz 1 daño a un enemigo de tu localización.
// ---------------------------------------------------------------------------
registerInvestigator({
  code: code(1),
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterEnemyAttack' || state.skillTest || self.location === null) return []
    const enemy = state.enemies[trigger.enemy]
    const attacked = getInvestigator(state, trigger.investigator)
    if (!enemy || (trigger.location ?? attacked.location) !== self.location) return []
    // The attack happened here even if Elusive has already moved the enemy.
    const fightView =
      enemy.location === self.location
        ? state
        : {
            ...state,
            enemies: { ...state.enemies, [enemy.id]: { ...enemy, location: self.location } },
          }
    const key = 'daniela'
    const basic: ReactionOption = {
      key,
      investigator: self.id,
      label: 'ability.danielaFight',
      params: { enemy: enemy.name },
      limit: ROUND,
      target: { type: 'enemy', id: enemy.id },
      then: [
        {
          type: 'BeginSkillTest',
          investigator: self.id,
          skill: 'combat',
          difficulty: enemy.fight,
          kind: { type: 'fight', enemy: enemy.id },
        },
      ],
    }
    // También con la habilidad de Luchar de un arma suya (sin gastar acción).
    const weapons = Object.values(state.assets)
      .filter((a) => a.owner === self.id)
      .flatMap((a) =>
        (playerCardBehavior(a.code)?.abilities?.(fightView, a, self.id) ?? [])
          .filter(
            (o) =>
              o.then.some((m) => m.type === 'BeginSkillTest' && m.kind.type === 'fight') &&
              o.target?.type === 'enemy' &&
              o.target.id === enemy.id,
          )
          .map((o): ReactionOption => ({
            key,
            investigator: self.id,
            label: o.label,
            ...(o.params ? { params: o.params } : {}),
            limit: ROUND,
            then: o.then,
          })),
      )
    return [basic, ...weapons]
  },
  elderSign: (state, self) => ({
    modifier: 1,
    immediate: chooseEnemyHere(state, self.id, 'prompt.elderSignDamage', (e) => [
      { type: 'DamageEnemy', enemy: e.id, amount: 1, by: self.id },
    ]),
  }),
})

// ---------------------------------------------------------------------------
// Joe Diamond: [reacción] después de investigar con éxito, roba 1 carta
// (límite 1 por ronda). Signo arcano: +1; si tienes éxito, roba 1 y gana 1 recurso.
// ---------------------------------------------------------------------------
registerInvestigator({
  code: code(4),
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.investigator === self.id &&
    trigger.kind === 'investigate' &&
    trigger.succeeded
      ? [
          {
            key: 'joe',
            investigator: self.id,
            label: 'ability.drawCards',
            params: { n: 1 },
            limit: ROUND,
            then: [{ type: 'DrawCards', investigator: self.id, amount: 1 }],
          },
        ]
      : [],
  elderSign: (_state, self) => ({
    modifier: 1,
    onSuccess: [
      { type: 'DrawCards', investigator: self.id, amount: 1 },
      { type: 'GainResources', investigator: self.id, amount: 1 },
    ],
  }),
})

// ---------------------------------------------------------------------------
// Trish Scarborough: una acción adicional en tu turno que solo sirve para evitar.
// Signo arcano: +0; al terminar la prueba puedes desenfrentarte y moverte.
// ---------------------------------------------------------------------------
registerInvestigator({
  code: code(7),
  extraEvadeAction: true,
  elderSign: (_state, self) => ({ modifier: 0, after: [disengageAndMove(self.id)] }),
})

// ---------------------------------------------------------------------------
// Dexter Drake: [reacción] después de jugar un apoyo, devuelve a tu mano otro
// apoyo tuyo o juega otro apoyo de tu mano pagando su coste (límite 1 por ronda).
// Signo arcano: +1; puedes devolver a la mano de su dueño un apoyo de tu localización.
// ---------------------------------------------------------------------------
const isStory = (code: string) => !!playerCardDef(code)?.story

registerInvestigator({
  code: code(10),
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterPlayAsset' || trigger.investigator !== self.id) return []
    const returnOptions = Object.values(state.assets)
      .filter(
        (a) =>
          a.owner === self.id &&
          a.code !== trigger.code &&
          !isStory(a.code) &&
          !isPermanent(a.code),
      )
      .map((a): ReactionOption => ({
        key: 'dexter',
        investigator: self.id,
        label: 'ability.dexterReturn',
        params: { card: playerCardDef(a.code)?.name ?? a.code },
        limit: ROUND,
        target: { type: 'asset', id: a.id },
        then: [{ type: 'ReturnAssetToHand', asset: a.id }],
      }))
    const playOptions = [...new Set(self.hand)]
      .filter((c) => {
        const def = playerCardDef(c)
        return def?.type === 'asset' && c !== trigger.code && (def.cost ?? 0) <= self.resources
      })
      .map((c): ReactionOption => ({
        key: 'dexter',
        investigator: self.id,
        label: 'ability.dexterPlay',
        params: { card: playerCardDef(c)?.name ?? c },
        limit: ROUND,
        target: { type: 'hand', code: c },
        then: [{ type: 'PlayCard', investigator: self.id, code: c }],
      }))
    return [...returnOptions, ...playOptions]
  },
  elderSign: (state, self) => {
    const assets = Object.values(state.assets).filter(
      (a) =>
        !isStory(a.code) &&
        !isPermanent(a.code) &&
        getInvestigator(state, a.owner).location === self.location,
    )
    if (assets.length === 0) return { modifier: 1 }
    return {
      modifier: 1,
      immediate: [
        {
          type: 'Ask',
          investigator: self.id,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.optional',
            choices: [
              ...assets.map((a) => ({
                label: 'choice.returnToHand',
                params: { card: playerCardDef(a.code)?.name ?? a.code },
                target: { type: 'asset' as const, id: a.id },
                then: [{ type: 'ReturnAssetToHand', asset: a.id } as Message],
              })),
              { label: 'choice.skip', then: [] },
            ],
          },
        },
      ],
    }
  },
})

// ---------------------------------------------------------------------------
// Isabelle Barnes: [rápida] durante una prueba tuya, recibe 1 horror directo:
// compromete una habilidad válida de tu pila de descartes; al terminar la
// prueba, barájala en tu mazo (límite 1 por ronda).
// Signo arcano: +1; si tienes éxito, cura 1 horror.
// ---------------------------------------------------------------------------
registerInvestigator({
  code: code(13),
  testOptions: (state, _test, self) =>
    [...new Set(self.discard)]
      .filter((c) => {
        const def = playerCardDef(c)
        return def?.type === 'skill' && canCommitFrom(state, self.id, c, 'discard')
      })
      .map((c): ReactionOption => ({
        key: 'isabelle',
        investigator: self.id,
        label: 'ability.isabelleCommit',
        params: { card: playerCardDef(c)?.name ?? c },
        limit: ROUND,
        then: [
          { type: 'TakeDamage', investigator: self.id, damage: 0, horror: 1, direct: true },
          { type: 'CommitFromDiscard', investigator: self.id, code: c },
        ],
      })),
  elderSign: (_state, self) => ({
    modifier: 1,
    onSuccess: [{ type: 'Heal', investigator: self.id, damage: 0, horror: 1 }],
  }),
})
