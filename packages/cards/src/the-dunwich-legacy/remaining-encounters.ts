import './light-of-aforgomon'
import './offer-of-power'
import { copies, treachery } from '../scenario-helpers'
import { REMAINING_CODES as C } from './remaining-codes'
import { thrall } from './thrall'
import { wizardOfYogSothoth } from './wizard-of-yog-sothoth'
import { yithianObserver } from './yithian-observer'
export { REMAINING_CODES } from './remaining-codes'
export const BISHOPS_THRALLS = [
  ...copies(
    treachery({
      code: C.lightOfAforgomon,
      name: 'Light of Aforgomon',
      traits: ['Pact', 'Power'],
      keywords: ['peril'],
    }),
    2,
  ),
  ...copies(thrall, 3),
  { ...wizardOfYogSothoth },
]
export const AGENTS_OF_YOG = [
  ...copies(yithianObserver, 2),
  ...copies(
    treachery({
      code: C.offerOfPower,
      name: 'Offer of Power',
      traits: ['Pact'],
      keywords: ['peril'],
    }),
    2,
  ),
]
