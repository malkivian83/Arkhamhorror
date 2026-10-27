import approvals from './approvals.json'
import './card-04004'
import './card-04013'
import './card-04014'
// Definitions are registered with the core investigators so signatures are known early.
export const MATEO_RENDERED_CODES = approvals.cards.map((c) => c.code)
