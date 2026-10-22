import { registerPlayerCard } from '@lcg/engine'
// RR Additional Actions: Leo's action is continuous and consumed first.
registerPlayerCard({ code: '01048', additionalTurnActions: 1 })
