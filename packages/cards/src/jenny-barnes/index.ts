import approvals from './approvals.json'
import './card-02003'
import './card-02010'
import './card-02011'
import './card-01024'
import './card-01050'
import './card-02147'
// Definitions are registered with the core investigators so signatures are known early.
export const JENNY_RENDERED_CODES = approvals.cards.map((c) => c.code)
