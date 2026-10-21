/**
 * Asesinato en el hotel Excelsior: Daga manchada de sangre, Sargento Monroe,
 * ¿Qué has hecho? y los Apoyos Indicio (con lo que les añade El verdadero culpable).
 */
import {
  getInvestigator,
  placedLocation,
  playerCardDef,
  push,
  registerPlayerCard,
  registerTreachery,
  type AbilityOption,
  type Asset,
  type Choice,
  type DamageDealt,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
  type ReactionOption,
  type Trigger,
} from '@lcg/engine'
import { attackable } from '../core-2026/player-cards'
import { CODES, LEADS } from './cards'
import { ask, culprit, hasTrait, investigatorsHere, onSpecific, specific } from './helpers'

// ---------------------------------------------------------------------------
// Daga manchada de sangre
// ---------------------------------------------------------------------------

registerPlayerCard({
  code: CODES.bloodstainedDagger,
  abilities: (state, self, investigator): AbilityOption[] =>
    attackable(state, investigator).flatMap((enemy): AbilityOption[] => {
      const fight = (extra: Partial<AbilityOption>, damage: number, defeat: Message[]) =>
        ({
          key: `${self.id}:fight${damage ? ':bleed' : ''}`,
          label: damage ? 'ability.excelsior.daggerBleed' : 'ability.fightWith',
          params: { card: 'Bloodstained Dagger', enemy: enemy.name },
          target: { type: 'enemy', id: enemy.id },
          actions: 1,
          provokes: false,
          ...extra,
          then: [
            {
              type: 'BeginSkillTest',
              investigator,
              skill: 'combat',
              difficulty: enemy.fight,
              modifier: 2,
              source: self.id,
              kind: {
                type: 'fight',
                enemy: enemy.id,
                extraDamage: damage,
                ...(defeat.length ? { onDefeat: defeat } : {}),
              },
            },
          ],
        }) as AbilityOption
      return [
        // [acción]: Combatir. +2 [combat] para este ataque.
        fight({}, 0, []),
        // [acción] Agótala y recibe 1 horror: Combatir. +2 [combat] y +1 daño; si
        // derrota al enemigo, roba 1 carta.
        ...(self.exhausted
          ? []
          : [
              fight(
                {
                  costs: [
                    { type: 'ExhaustAsset', asset: self.id },
                    { type: 'TakeDamage', investigator, damage: 0, horror: 1 },
                  ],
                },
                1,
                [{ type: 'DrawCards', investigator, amount: 1 }],
              ),
            ]),
      ]
    }),
})

// ---------------------------------------------------------------------------
// Sargento Monroe (Dos días para jubilarse)
// ---------------------------------------------------------------------------

/** Daño u horror que acaba de recibir este Monroe en la asignación. */
const dealtTo = (trigger: Trigger, match: (d: DamageDealt) => boolean) =>
  trigger.type === 'afterDamageAssigned' ? trigger.dealt.find(match) : undefined

/**
 * [reacción] Cuando reciba daño u horror, agótalo: inflige esa misma cantidad como
 * daño a un Enemigo no Inocente de su Lugar. Cualquier investigador de su Lugar.
 */
function monroeReactions(
  state: GameState,
  location: LocationId | null,
  dealt: DamageDealt | undefined,
  exhausted: boolean,
  exhaust: Message,
  key: string,
): ReactionOption[] {
  if (!dealt || exhausted || !location) return []
  const targets = Object.values(state.enemies).filter(
    (e) => e.location === location && !hasTrait(e, 'Innocent'),
  )
  if (targets.length === 0) return []
  const amounts = [...new Set([dealt.damage, dealt.horror].filter((n) => n > 0))]
  return investigatorsHere(state, location).flatMap((i) =>
    amounts.map((n): ReactionOption => ({
      key,
      investigator: i.id,
      label: 'ability.excelsior.monroe',
      params: { n },
      then: [exhaust, specific('monroeShot', { investigator: i.id, location, amount: n })],
    })),
  )
}

registerPlayerCard({
  code: CODES.sergeantMonroe,
  // Puede recibir el daño y el horror de cualquier investigador de su Lugar.
  soaksAtLocation: true,
  reactions: (state, trigger, self) =>
    monroeReactions(
      state,
      getInvestigator(state, self.owner).location,
      dealtTo(trigger, (d) => d.asset === self.id),
      self.exhausted,
      { type: 'ExhaustAsset', asset: self.id },
      `${self.id}:monroe:${state.log.length}`,
    ),
  placedReactions: (state, trigger, self) =>
    monroeReactions(
      state,
      placedLocation(state, self),
      dealtTo(trigger, (d) => d.placed === self.id),
      self.exhausted,
      specific('exhaustPlaced', { placed: self.id }),
      `${self.id}:monroe:${state.log.length}`,
    ),
})

onSpecific('exhaustPlaced', (state, data) => {
  const placed = state.placedAssets?.[String(data.placed)]
  if (!placed) return state
  return {
    ...state,
    placedAssets: { ...state.placedAssets, [placed.id]: { ...placed, exhausted: true } },
  }
})

onSpecific('monroeShot', (state, data) => {
  const investigator = String(data.investigator)
  const amount = Number(data.amount)
  const targets = Object.values(state.enemies).filter(
    (e) => e.location === data.location && !hasTrait(e, 'Innocent'),
  )
  const shoot = (e: Enemy): Message => ({
    type: 'DamageEnemy',
    enemy: e.id,
    amount,
    by: investigator,
  })
  if (targets.length === 0) return state
  if (targets.length === 1) return push(state, shoot(targets[0]!))
  return push(
    state,
    ask(
      investigator,
      'prompt.chooseEnemy',
      targets.map((e): Choice => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [shoot(e)],
      })),
    ),
  )
})

// ---------------------------------------------------------------------------
// ¿Qué has hecho? (Debilidad, Locura)
// ---------------------------------------------------------------------------

registerTreachery({
  code: CODES.whatHaveYouDone,
  // Revelación: ponla en juego en tu zona de amenaza.
  revelation: (_state, investigator, self) => [
    { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'threatArea', investigator } },
  ],
  // Coste adicional para negociar: descarta una carta aleatoria de tu mano.
  parleyCost: (state, investigator) =>
    getInvestigator(state, investigator).hand.length > 0
      ? [{ type: 'DiscardRandomFromHand', investigator, amount: 1 }]
      : null,
  // [acción]: baraja ¿Qué has hecho? en tu mazo (cualquier investigador de su Lugar).
  abilities: (state, self, investigator) =>
    self.placement.type === 'threatArea'
      ? [
          {
            key: `${self.id}:shuffle`,
            label: 'ability.excelsior.shuffleWeakness',
            actions: 1,
            provokes: true,
            then: [{ type: 'ShuffleTreacheryIntoDeck', treachery: self.id, investigator }],
          },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// Apoyos Indicio
// ---------------------------------------------------------------------------

const enemyCode = (state: GameState, code: string) =>
  Object.values(state.enemies).find((e) => e.code === code)

const removeClues = (asset: Asset, amount: number): Message => ({
  type: 'MoveClues',
  from: { type: 'asset', id: asset.id },
  to: { type: 'pool' },
  amount,
})

const leadName = (asset: Asset) => playerCardDef(asset.code)?.name ?? asset.code

/** Capacidades que El verdadero culpable añade a este Indicio. */
function leadAbilities(
  state: GameState,
  self: Asset,
  investigator: InvestigatorId,
): AbilityOption[] {
  const version = culprit(state)
  const here = getInvestigator(state, investigator).location
  const clues = self.clues ?? 0
  const options: AbilityOption[] = []
  const at = (code: string) => {
    const e = enemyCode(state, code)
    return e && e.location === here ? e : undefined
  }
  // v. I, Artefacto alienígena: si el Espectro vengativo está agotado y aquí, retira 2
  // pistas: 2 daños al Espectro.
  if (version === 1 && self.code === CODES.alienDevice) {
    const specter = at(CODES.vengefulSpecter)
    if (specter?.exhausted && clues >= 2)
      options.push({
        key: `${self.id}:v1`,
        label: 'ability.excelsior.deviceBurst',
        params: { enemy: specter.name },
        actions: 1,
        provokes: true,
        costs: [removeClues(self, 2)],
        then: [
          {
            type: 'DamageEnemy',
            enemy: specter.id,
            amount: 2,
            by: investigator,
            source: { encounter: true },
          },
        ],
      })
  }
  // v. II, Solución siniestra: en la Habitación 212, [intellect] (2); si tienes éxito,
  // retira 2 pistas para agotar al Entrometido o infligirle 2 daños.
  if (version === 2 && self.code === CODES.sinisterSolution && here === CODES.room212)
    options.push({
      key: `${self.id}:v2`,
      label: 'ability.excelsior.solutionTest',
      actions: 1,
      provokes: true,
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          skill: 'intellect',
          difficulty: 2,
          kind: {
            type: 'effect',
            source: 'Sinister Solution',
            onSuccess: [specific('solutionMeddler', { investigator })],
            onFail: [],
            onFailEach: [],
          },
        },
      ],
    })
  // v. III, Artefacto alienígena: agótalo y retira 2 pistas: un Personal de aquí a la zona
  // de victoria (2 daños si es Élite). No provoca ataques de oportunidad.
  if (version === 3 && self.code === CODES.alienDevice && !self.exhausted && clues >= 2)
    Object.values(state.enemies)
      .filter((e) => e.location === here && hasTrait(e, 'Staff'))
      .forEach((e) =>
        options.push({
          key: `${self.id}:v3`,
          label: hasTrait(e, 'Elite')
            ? 'ability.excelsior.deviceDamage'
            : 'ability.excelsior.deviceVictory',
          params: { enemy: e.name },
          target: { type: 'enemy', id: e.id },
          actions: 1,
          provokes: false,
          costs: [{ type: 'ExhaustAsset', asset: self.id }, removeClues(self, 2)],
          then: [
            hasTrait(e, 'Elite')
              ? {
                  type: 'DamageEnemy',
                  enemy: e.id,
                  amount: 2,
                  by: investigator,
                  source: { encounter: true },
                }
              : { type: 'EnemyToVictory', enemy: e.id },
          ],
        }),
      )
  // v. IV, Tomo de rituales: retira 2 pistas: Combatir con [willpower]; si tienes éxito,
  // en lugar de infligir daño, retira 3 perdiciones del enemigo atacado.
  if (version === 4 && self.code === CODES.tomeOfRituals && clues >= 2)
    attackable(state, investigator).forEach((e) =>
      options.push({
        key: `${self.id}:v4`,
        label: 'ability.excelsior.tomeBanish',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        actions: 1,
        provokes: false,
        costs: [removeClues(self, 2)],
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'willpower',
            difficulty: e.fight,
            kind: {
              type: 'fight',
              enemy: e.id,
              noDamage: true,
              onSuccess: [
                { type: 'RemoveDoom', target: { type: 'enemy', id: e.id }, amount: 3 },
                { type: 'CheckActObjective' },
              ],
            },
          },
        ],
      }),
    )
  // v. V, Solución siniestra: si el Espectro vengativo está aquí, [intellect] (1); por cada
  // punto de éxito, 1 pista de la Solución al Espectro. No provoca ataques de oportunidad.
  if (version === 5 && self.code === CODES.sinisterSolution) {
    const specter = at(CODES.vengefulSpecter)
    if (specter)
      options.push({
        key: `${self.id}:v5`,
        label: 'ability.excelsior.solutionSpecter',
        params: { enemy: specter.name },
        actions: 1,
        provokes: false,
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'intellect',
            difficulty: 1,
            kind: {
              type: 'effect',
              source: 'Sinister Solution',
              onSuccessEach: [
                {
                  type: 'MoveClues',
                  from: { type: 'asset', id: self.id },
                  to: { type: 'enemy', id: specter.id },
                  amount: 1,
                },
              ],
              onSuccess: [{ type: 'CheckActObjective' }],
              onFail: [],
              onFailEach: [],
            },
          },
        ],
      })
  }
  // v. VII: si el Vagabundo dimensional está aquí, retira 1 pista: Evitar (automático).
  if (version === 7 && clues >= 1) {
    const shambler = at(CODES.dimensionalShambler)
    if (shambler)
      options.push({
        key: `${self.id}:v7`,
        label: 'ability.excelsior.leadEvade',
        params: { card: leadName(self), enemy: shambler.name },
        actions: 1,
        provokes: false,
        costs: [removeClues(self, 1)],
        then: [{ type: 'EvadeEnemy', enemy: shambler.id, by: investigator }],
      })
  }
  // v. VIII: retira 1 pista: busca un Enemigo Personal en el mazo y los descartes de
  // Encuentros y róbalo.
  if (version === 8 && clues >= 1)
    options.push({
      key: `${self.id}:v8`,
      label: 'ability.excelsior.leadSearch',
      params: { card: leadName(self) },
      actions: 1,
      provokes: true,
      costs: [removeClues(self, 1)],
      then: [{ type: 'SearchEncounterForTrait', investigator, trait: 'Staff' }],
    })
  return options
}

onSpecific('solutionMeddler', (state, data) => {
  const investigator = String(data.investigator)
  const solution = Object.values(state.assets).find((a) => a.code === CODES.sinisterSolution)
  const meddler = enemyCode(state, CODES.otherworldlyMeddler)
  if (!solution || !meddler || (solution.clues ?? 0) < 2) return state
  return push(
    state,
    ask(investigator, 'prompt.excelsior.solutionMeddler', [
      ...(!meddler.exhausted
        ? [
            {
              label: 'choice.excelsior.exhaustMeddler',
              then: [removeClues(solution, 2), { type: 'ExhaustEnemy', enemy: meddler.id }],
            } as Choice,
          ]
        : []),
      {
        label: 'choice.excelsior.damageMeddler',
        then: [
          removeClues(solution, 2),
          {
            type: 'DamageEnemy',
            enemy: meddler.id,
            amount: 2,
            by: investigator,
            source: { encounter: true },
          },
        ],
      },
      { label: 'choice.skip', then: [] },
    ]),
  )
})

for (const code of LEADS) {
  registerPlayerCard({
    code,
    abilities: leadAbilities,
    // v. VI, Guardapelo desgastado: cuando el Director del hotel fuese a atacar a un
    // investigador de tu Lugar, retira 2 pistas: cancela ese ataque.
    reactions: (state, trigger, self) => {
      if (code !== CODES.timeWornLocket || culprit(state) !== 6) return []
      if (trigger.type !== 'whenEnemyAttacks' || (self.clues ?? 0) < 2) return []
      const enemy = state.enemies[trigger.enemy]
      const where = getInvestigator(state, self.owner).location
      if (enemy?.code !== CODES.hotelManager) return []
      if (getInvestigator(state, trigger.investigator).location !== where) return []
      return [
        {
          key: `${self.id}:v6:${state.log.length}`,
          investigator: self.owner,
          label: 'ability.excelsior.locketCancel',
          params: { name: getInvestigator(state, trigger.investigator).name },
          then: [removeClues(self, 2), { type: 'CancelEnemyAttack', enemy: enemy.id }],
        },
      ]
    },
  })
}
