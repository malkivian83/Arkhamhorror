import './across-space-and-time'
import './helpless-passenger'
import './claws-of-steam'
import './broken-rails'
import { copies, treachery } from '../scenario-helpers'
import { grapplingHorror } from './grappling-horror'
import { emergentMonstrosity } from './emergent-monstrosity'
import { T } from './essex-codes'
export const helplessPassenger = treachery({
  code: T.passenger,
  name: 'Helpless Passenger',
  traits: ['Ally', 'Bystander'],
  keywords: ['surge'],
})
export const ESSEX_ENCOUNTERS = [
  ...copies(helplessPassenger, 3),
  ...copies(
    treachery({ code: T.claws, name: 'Claws of Steam', traits: ['Power'], keywords: [] }),
    3,
  ),
  ...copies(
    treachery({ code: T.rails, name: 'Broken Rails', traits: ['Hazard'], keywords: [] }),
    3,
  ),
  ...copies(grapplingHorror, 2),
  ...copies(emergentMonstrosity, 2),
]
