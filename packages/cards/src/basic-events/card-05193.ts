import { registerBasicAsset } from '../basic-abilities/register'
// Enchanted Blade (Mystic 3): +2; as an additional cost you may spend up to 2 charges, each
// for +1 and +1 damage.
registerBasicAsset(
  '05193',
  [0, 1, 2].map((charges) => ({
    action: 'fight' as const,
    key: `:${charges}`,
    ...(charges ? { label: 'ability.fightWithCharges', params: { n: charges } } : {}),
    modifier: 2 + charges,
    extraDamage: charges,
    available: ({ self }) => self.uses >= charges,
    extraCosts: ({ self }) =>
      charges ? [{ type: 'SpendUses' as const, asset: self.id, amount: charges }] : [],
  })),
)
