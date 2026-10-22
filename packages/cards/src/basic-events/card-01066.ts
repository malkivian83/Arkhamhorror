import { type InvestigatorId, type Message } from '@lcg/engine'
import { horror, ifTokens, SYMBOLS } from '../basic-abilities/register'
import { registerBasicEvent } from './register'
const loseAction = (investigator: InvestigatorId): Message => ({
  type: 'LoseActions',
  investigator,
  amount: 1,
})
// Blinding Light (0, 2): willpower evasion that damages the evaded enemy; a symbol costs
// an action this turn (and 1 horror at level 2).
for (const [codes, amount, scare] of [
  [['01066', '01566'], 1, false],
  [['01069', '01569'], 2, true],
] as const)
  registerBasicEvent([...codes], {
    action: 'evade',
    skill: 'willpower',
    tags: ['spell'],
    onSuccess: ({ investigator }, enemy) => [
      {
        type: 'DamageEnemy',
        enemy: enemy!.id,
        amount,
        by: investigator,
        source: { attack: false, traits: ['Spell'] },
      },
    ],
    after: ({ investigator }) => [
      ifTokens(SYMBOLS, [loseAction(investigator), ...(scare ? [horror(investigator)] : [])]),
    ],
  })
