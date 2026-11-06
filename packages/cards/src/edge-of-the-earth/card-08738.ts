import {
  canAffordEntry,
  canEnter,
  engagedEnemies,
  moveBlocked,
  registerPlayerCard,
  scenarioBehavior,
  type Choice,
} from '@lcg/engine'
import { ask, continuation, moveChoices } from '../dunwich-pilot/effects'

const code = '08738'
const options = 'move boost evade'

registerPlayerCard({
  code,
  abilities: (_state, self, investigator) =>
    self.exhausted
      ? []
      : [
          {
            key: `${self.id}:assist`,
            label: 'ability.edgeOfTheEarth.memorialAnyu',
            actions: 0,
            provokes: false,
            costs: [{ type: 'ExhaustAsset', asset: self.id }],
            then: [
              continuation(code, investigator, 'choose', { asset: self.id, remaining: options }),
            ],
          },
        ],
  effect: (state, investigator, _step, data) => {
    const remaining = String(data.remaining)
    if (!remaining) return []
    const multiple = data.multiple === true
    const after = (used: string) =>
      multiple
        ? [
            continuation(code, investigator, 'choose', {
              multiple,
              remaining: remaining
                .split(' ')
                .filter((option) => option !== used)
                .join(' '),
            }),
          ]
        : []
    const choices: Choice[] = []
    const destinations =
      remaining.includes('move') &&
      !moveBlocked(state, investigator) &&
      !scenarioBehavior(state.scenarioId)?.cannotLeave?.(state, investigator)
        ? moveChoices(state, investigator).filter(
            ({ target }) =>
              target?.type === 'location' &&
              canEnter(state, investigator, target.id) &&
              canAffordEntry(state, target.id, investigator),
          )
        : []
    if (destinations.length)
      choices.push({
        label: 'choice.edgeOfTheEarth.memorialAnyuMove',
        then: ask(
          investigator,
          destinations.map((choice) => ({
            ...choice,
            then: [...choice.then, ...after('move')],
          })),
        ),
      })
    if (remaining.includes('boost'))
      choices.push({
        label: 'choice.edgeOfTheEarth.memorialAnyuBoost',
        then: [
          { type: 'NextTestBonus', investigator, amount: 2, thisRound: true },
          ...after('boost'),
        ],
      })
    const enemies = remaining.includes('evade')
      ? engagedEnemies(state, investigator).filter(
          (enemy) => !enemy.cannotBeEvaded && !enemy.hasNoStats,
        )
      : []
    if (enemies.length)
      choices.push({
        label: 'choice.edgeOfTheEarth.memorialAnyuEvade',
        then: ask(
          investigator,
          enemies.map((enemy) => ({
            label: 'choice.enemy',
            params: { enemy: enemy.name },
            target: { type: 'enemy', id: enemy.id },
            then: [
              {
                type: 'AfterCurrentSkillTest',
                then: [
                  {
                    type: 'BeginSkillTest',
                    investigator,
                    skill: 'agility',
                    baseSkill: 4,
                    difficulty: enemy.evade,
                    kind: { type: 'evade', enemy: enemy.id },
                  },
                  ...after('evade'),
                ],
              },
            ],
          })),
        ),
      })
    if (multiple) {
      if (!choices.length) return []
      choices.push({ label: 'choice.edgeOfTheEarth.memorialAnyuDone', then: [] })
    } else {
      choices.push({
        label: 'choice.edgeOfTheEarth.memorialAnyuDiscard',
        then: [
          { type: 'DiscardAsset', asset: String(data.asset) },
          continuation(code, investigator, 'choose', { multiple: true, remaining }),
        ],
      })
    }
    return ask(investigator, choices)
  },
})
