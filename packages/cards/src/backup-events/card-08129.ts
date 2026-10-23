import {
  agendaBehavior,
  canEnter,
  enemiesAt,
  enemyBehavior,
  getInvestigator,
  getLocation,
  playerCardDef,
  registerPlayerCard,
  scenarioBehavior,
  type Choice,
  type GameState,
  type Message,
} from '@lcg/engine'
import { ask, continuation, destinations } from '../dunwich-pilot/effects'
import { controlledClassTypes } from '../synergy/classes'
const code = '08129'
const labels: Record<string, string> = {
  rogue: 'choice.backupRogue',
  guardian: 'choice.backupGuardian',
  seeker: 'choice.backupSeeker',
  mystic: 'choice.backupMystic',
  survivor: 'choice.backupSurvivor',
}
function targets(s: GameState, by: string, cls: string): Choice[] {
  const i = getInvestigator(s, by)
  if (i.eliminated || i.location === null) return []
  if (cls === 'rogue')
    return destinations(s, by)
      .filter((to) => canEnter(s, by, to))
      .map((to) => ({
        label: 'choice.pilotMove',
        params: { name: i.name, location: getLocation(s, to).name },
        target: { type: 'location', id: to },
        then: [{ type: 'MoveTo', investigator: by, location: to }],
      }))
  if (cls === 'guardian') {
    const agenda = s.agendas[s.agendaIndex]
    return enemiesAt(s, i.location)
      .filter(
        (e) =>
          !(agenda && agendaBehavior(agenda.code)?.enemyImmune?.(s, e)) &&
          !scenarioBehavior(s.scenarioId)?.enemyImmune?.(s, e) &&
          (enemyBehavior(e.code)?.damageTaken?.(s, e, 1, { traits: ['Favor', 'Synergy'] })
            ?.amount ?? 1) > 0,
      )
      .map((e) => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [
          {
            type: 'DamageEnemy',
            enemy: e.id,
            by,
            amount: 1,
            source: { traits: ['Favor', 'Synergy'] },
          },
        ],
      }))
  }
  if (cls === 'seeker')
    return getLocation(s, i.location).clues > 0
      ? [
          {
            label: 'choice.backupSeeker',
            target: { type: 'location', id: i.location },
            then: [{ type: 'DiscoverClues', investigator: by, amount: 1 }],
          },
        ]
      : []
  if (cls !== 'mystic' && cls !== 'survivor') return []
  const horror = cls === 'mystic'
  const amount = { damage: horror ? 0 : 1, horror: horror ? 1 : 0 }
  const heal = (id: string, name: string, asset: boolean): Choice => ({
    label: horror ? 'choice.healHorrorOf' : 'choice.healDamageOf',
    params: { name },
    target: { type: asset ? 'asset' : 'investigator', id },
    then: [
      asset
        ? { type: 'HealAsset', asset: id, ...amount }
        : { type: 'Heal', investigator: id, ...amount },
    ],
  })
  return [
    ...s.investigators
      .filter((x) => !x.eliminated && (horror ? x.horror : x.damage) > 0)
      .map((x) => heal(x.id, x.name, false)),
    ...Object.values(s.assets)
      .filter((a) => !getInvestigator(s, a.owner).eliminated && (horror ? a.horror : a.damage) > 0)
      .map((a) => heal(a.id, playerCardDef(a.code)?.name ?? a.code, true)),
    ...Object.values(s.placedAssets ?? {})
      .filter((a) => !a.faceDown && (horror ? a.horror : a.damage) > 0)
      .map((a) => heal(a.id, a.name, true)),
  ]
}
// RR: Synergy, Limbo, Healing, Move, Choose. Recompute classes and targets
// between effects; persist only used classes so suspended decisions stay JSON.
registerPlayerCard({
  code,
  canPlay: (s, by) => controlledClassTypes(s, by).some((cls) => targets(s, by, cls).length > 0),
  play: (_s, by) => [continuation(code, by, 'choose', { used: '' })],
  effect: (s, by, step, data): Message[] => {
    const used = String(data.used ?? '')
      .split(',')
      .filter(Boolean)
    if (getInvestigator(s, by).eliminated) return []
    if (step === 'resolve') {
      const cls = String(data.cls)
      if (used.includes(cls) || !controlledClassTypes(s, by).includes(cls)) return []
      const next = continuation(code, by, 'choose', { used: [...used, cls].join(',') })
      return ask(
        by,
        targets(s, by, cls).map((c) => ({ ...c, then: [...c.then, next] })),
        true,
      )
    }
    if (step !== 'choose') return []
    const choices = controlledClassTypes(s, by)
      .filter((cls) => !used.includes(cls) && targets(s, by, cls).length > 0)
      .map((cls): Choice => ({
        label: labels[cls]!,
        then: [continuation(code, by, 'resolve', { cls, used: used.join(',') })],
      }))
    return choices.length ? ask(by, [...choices, { label: 'choice.skip', then: [] }], true) : []
  },
})
