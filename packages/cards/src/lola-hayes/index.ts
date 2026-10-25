import approvals from './approvals.json'
import './card-03006'
import './card-03018'
import './card-03019'
// Definitions are registered with the core investigators so signatures are known early.
export const LOLA_RENDERED_CODES = approvals.cards.map((c) => c.code)
