import {
  activeInvestigators,
  canEnter,
  distancesFrom,
  enemyHasKeyword,
  getInvestigator,
  huntingSteps,
  leavingBlocked,
  moveBlocked,
  scenarioBehavior,
  isPermanent,
  playerCardDef,
  push,
  registerTreachery,
  shuffle,
  stuckInPlay,
  type Choice,
  type Message,
} from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { C } from './codes'
import { here, masked, onSpecific, specific } from './helpers'
import { across, around, ring } from './topology'

const ask = (investigator: string, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})
const hurt = (investigator: string, damage: number, horror: number): Message => ({
  type: 'TakeDamage',
  investigator,
  damage,
  horror,
})

registerTreachery({
  code: C.hysteria,
  revelation: (s, by) => [
    ask(by, 'prompt.carnevale.hysteria', [
      { label: 'choice.carnevale.takeDamage', then: [hurt(by, 2, 0)] },
      ...(masked(s).length && getInvestigator(s, by).location && ring(s).length === 8
        ? [
            {
              label: 'choice.carnevale.shuffleMasked',
              then: [specific('carnevaleHysteria', { investigator: by })],
            },
          ]
        : []),
    ]),
  ],
})
onSpecific('carnevaleHysteria', (s, data) => {
  const start = getInvestigator(s, String(data.investigator)).location
  if (!start) return s
  // También se reasignan identificadores: no basta cambiar posiciones conocidas.
  const guests = masked(s),
    [identities, rng] = shuffle(
      guests.map((p) => p.code),
      s.rng,
    )
  const placedAssets = { ...s.placedAssets }
  guests.forEach((p) => {
    delete placedAssets[p.id]
  })
  return push(
    { ...s, rng, placedAssets },
    ...identities.map((code, n): Message => ({
      type: 'PlaceAsset',
      code,
      name: 'Masked Carnevale-Goer',
      faceDown: true,
      placement: { type: 'location', location: around(ring(s), start, n + 1)! },
    })),
  )
})

registerTreachery({
  code: C.lost,
  revelation: (s, by) => {
    const location = getInvestigator(s, by).location
    const to = location ? across(ring(s), location) : null
    return [
      ask(by, 'prompt.carnevale.lost', [
        { label: 'choice.carnevale.takeHorror', then: [hurt(by, 0, 2)] },
        ...(to &&
        s.locations[to] &&
        canEnter(s, by, to) &&
        !leavingBlocked(s, location!) &&
        !moveBlocked(s, by) &&
        !scenarioBehavior(s.scenarioId)?.cannotLeave?.(s, by)
          ? [
              {
                label: 'choice.carnevale.moveAcross',
                then: [
                  {
                    type: 'MoveTo' as const,
                    investigator: by,
                    location: to,
                    encounterEffect: true,
                  },
                ],
              },
            ]
          : []),
      ]),
    ]
  },
})

for (const [code, skill, damage, horror] of [
  [C.gaze, 'willpower', 0, 1],
  [C.water, 'agility', 1, 0],
] as const) {
  registerTreachery({
    code,
    revelation: (s, by) => {
      const controlled = new Set(
        Object.values(s.assets)
          .filter((a) => a.code === C.innocent)
          .map((a) => a.owner),
      )
      const affected = [
        getInvestigator(s, by),
        ...activeInvestigators(s).filter((i) => i.id !== by && controlled.has(i.id)),
      ]
      // Fijar los afectados al revelarse, resolver pruebas y asignaciones por separado.
      return affected.map((i) =>
        specific('carnevaleGroupTest', { investigator: i.id, code, skill, damage, horror }),
      )
    },
  })
}
onSpecific('carnevaleGroupTest', (s, data) => {
  const i = getInvestigator(s, String(data.investigator))
  if (i.eliminated || i.location === null) return s
  return push(
    s,
    effectTest(i.id, String(data.code), data.skill === 'agility' ? 'agility' : 'willpower', 4, {
      onFail: [
        {
          type: 'TakeDamage',
          investigator: i.id,
          damage: Number(data.damage),
          horror: Number(data.horror),
          assignFirst: { damage: C.innocent, horror: C.innocent },
        },
      ],
    }),
  )
})

registerTreachery({
  code: C.mesmerize,
  revelation: (s, by) => {
    const guests = masked(s).filter((p) => here(s, p, by))
    if (!guests.length) return [{ type: 'GainSurge' }]
    return [
      ask(
        by,
        'prompt.carnevale.chooseFlip',
        guests.map((p) => ({
          label: 'choice.carnevale.masked',
          target: { type: 'placed', id: p.id },
          then: [
            specific('carnevaleFlip', { placed: p.id }),
            specific('carnevaleMesmerized', { placed: p.id, investigator: by }),
          ],
        })),
      ),
    ]
  },
})
onSpecific('carnevaleMesmerized', (s, data) => {
  const p = s.placedAssets?.[String(data.placed)]
  const from = getInvestigator(s, String(data.investigator)).location
  if (p?.code !== C.innocent || !from) return s
  const distances = distancesFrom(s, from)
  const empty = [...distances].filter(
    ([id]) => !activeInvestigators(s).some((i) => i.location === id),
  )
  const max = Math.max(...empty.map(([, d]) => d))
  const targets = empty.filter(([, d]) => d === max)
  const damage: Message = { type: 'DamagePlacedAsset', placed: p.id, damage: 1, horror: 1 }
  return targets.length
    ? push(
        s,
        ask(
          String(data.investigator),
          'prompt.carnevale.innocentDestination',
          targets.map(([location]) => ({
            label: 'choice.location',
            params: { location: s.locations[location]!.name },
            then: [
              { type: 'MovePlacedAsset', placed: p.id, placement: { type: 'location', location } },
              damage,
            ],
          })),
        ),
      )
    : push(s, damage)
})

registerTreachery({
  code: C.abduction,
  revelation: (_s, by) => [
    effectTest(by, C.abduction, 'willpower', 3, {
      onFail: [specific('carnevaleAbduction', { investigator: by })],
    }),
  ],
})
onSpecific('carnevaleAbduction', (s, data) => {
  const by = String(data.investigator)
  const allies = Object.values(s.assets).filter(
    (a) =>
      a.owner === by &&
      playerCardDef(a.code)?.traits.includes('Ally') &&
      !isPermanent(a.code) &&
      !stuckInPlay(s, a),
  )
  return push(
    s,
    ask(by, 'prompt.carnevale.abduction', [
      ...(getInvestigator(s, by).resources > 0 || !allies.length
        ? [
            {
              label: 'choice.carnevale.loseResources',
              then: [
                {
                  type: 'LoseResources' as const,
                  investigator: by,
                  amount: getInvestigator(s, by).resources,
                },
              ],
            },
          ]
        : []),
      ...allies.map((a) => ({
        label: 'choice.discard',
        params: { card: playerCardDef(a.code)!.name },
        target: { type: 'asset' as const, id: a.id },
        then: [{ type: 'DiscardAsset' as const, asset: a.id }],
      })),
    ]),
  )
})

registerTreachery({
  code: C.miasma,
  revelation: (s, by, self) => {
    const from = getInvestigator(s, by).location
    if (!from) return []
    // RR "Nearest": el propio Lugar está a cero conexiones.
    const order = ring(s).filter((id) => s.locations[id])
    const candidates =
      order.length === 8 ? Array.from({ length: 8 }, (_, n) => around(order, from, n)!) : [from]
    const location = candidates.find(
      (id) =>
        !Object.values(s.treacheries).some(
          (t) =>
            t.code === C.miasma && t.placement.type === 'location' && t.placement.location === id,
        ),
    )
    return location
      ? [{ type: 'PlaceTreachery', treachery: self.id, placement: { type: 'location', location } }]
      : []
  },
  forced: (_s, t, self) =>
    t.type === 'afterMove' && self.placement.type === 'location'
      ? [specific('carnevaleMiasmaEntered', { investigator: t.investigator, treachery: self.id })]
      : [],
})
onSpecific('carnevaleMiasmaEntered', (s, data) => {
  const by = String(data.investigator),
    treachery = s.treacheries[String(data.treachery)]
  if (
    treachery?.placement.type !== 'location' ||
    getInvestigator(s, by).location !== treachery.placement.location
  )
    return s
  return push(
    s,
    effectTest(by, C.miasma, 'willpower', 2, {
      onFail: [specific('carnevaleMiasmaFailed', { investigator: by })],
    }),
  )
})
onSpecific('carnevaleMiasmaFailed', (s, data) => {
  const by = String(data.investigator)
  const hunters = Object.values(s.enemies).filter((e) => enemyHasKeyword(s, e, 'hunter'))
  return push(
    s,
    ask(by, 'prompt.carnevale.miasma', [
      { label: 'choice.carnevale.takeBoth', then: [hurt(by, 1, 1)] },
      ...(hunters.some(
        (e) => !e.exhausted && e.engagedWith === null && huntingSteps(s, e).length > 0,
      )
        ? [
            {
              label: 'choice.carnevale.moveHunters',
              then: [{ type: 'HuntersMove' as const, enemies: hunters.map((e) => e.id) }],
            },
          ]
        : []),
    ]),
  )
})
