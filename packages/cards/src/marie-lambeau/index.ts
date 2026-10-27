import approvals from './approvals.json'
import './card-05006'
import './card-05018'
import './card-05019'
// Definitions are registered with the core investigators so signatures are known early.
export const MARIE_RENDERED_CODES = approvals.cards.map((c) => c.code)
