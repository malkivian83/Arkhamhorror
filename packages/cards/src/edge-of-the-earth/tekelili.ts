import {
  registerPlayerCards,
  registerTreachery,
  tekeliliCopies,
  type TreacheryBehavior,
} from '@lcg/engine'
import { horror } from './card-08723'
import { damage } from './card-08724'
import { discard } from './card-08725'
import { resources } from './card-08726'
import { action } from './card-08727'
import { clue } from './card-08728'
import { asset } from './card-08729'

const revelations: Record<keyof typeof tekeliliCopies, TreacheryBehavior['revelation']> = {
  '08723': horror,
  '08724': damage,
  '08725': discard,
  '08726': resources,
  '08727': action,
  '08728': clue,
  '08729': asset,
}

export function registerTekelili(): void {
  const codes = Object.keys(revelations) as (keyof typeof revelations)[]
  registerPlayerCards(
    codes.map((code) => ({
      code,
      name: 'Tekeli-li',
      type: 'treachery',
      class: 'neutral',
      traits: ['Madness'],
      weakness: 'weakness',
      story: true,
    })),
  )
  for (const code of codes)
    registerTreachery({
      code,
      revelation: (state, investigator, self) => [
        ...revelations[code](state, investigator, self),
        { type: 'ReturnTekelili', treachery: self.id },
      ],
    })
}
