// RR: Equipment Slots, Triggered Abilities, Costs, Chaos Tokens (cancel, symbol tokens), ST.3.
import { effectiveVitals, getInvestigator, registerPlayerCard } from '@lcg/engine'
import { SACRIFICIAL_DOLL } from './codes'

// Sacrificial Doll: while you have 3 or fewer remaining health, it does not take up a hand slot.
// [reaction] After you reveal a non-[auto_fail] chaos token during a skill test, take 1 damage
// and exhaust it: cancel that token and reveal tokens until a symbol token is revealed; resolve
// that token and ignore the rest.
registerPlayerCard({
  code: SACRIFICIAL_DOLL,
  slotFree: (s, by) => {
    const me = getInvestigator(s, by)
    return effectiveVitals(s, me).health - me.damage <= 3
  },
  reactions: (s, t, a) =>
    t.type === 'afterRevealingChaosToken' &&
    t.investigator === a.owner &&
    t.token !== 'autoFail' &&
    !a.exhausted &&
    s.skillTest?.revealing
      ? [
          {
            key: `${a.id}:doll`,
            investigator: a.owner,
            label: 'ability.sacrificialDoll',
            params: { token: String(t.token) },
            then: [
              { type: 'TakeDamage', investigator: a.owner, damage: 1, horror: 0 },
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'RevealUntilSymbolToken' },
            ],
          },
        ]
      : [],
})
