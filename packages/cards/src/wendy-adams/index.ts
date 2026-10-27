import approvals from './approvals.json'
import './card-01005'
import './card-01014'
import './card-01015'
// Definitions are registered with the core investigators so signatures are known early.
export const WENDY_RENDERED_CODES = approvals.cards.map((c) => c.code)
