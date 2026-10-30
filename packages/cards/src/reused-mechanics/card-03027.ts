import { playerCardDef, registerPlayerCard, shroudOf } from '@lcg/engine'
// RR: Uses, Investigate, "as if". In the Know (1): spend 1 secret to investigate any revealed
// location as if you were there; its shroud and extra investigation costs apply, and clues are
// discovered at that location.
registerPlayerCard({
  code: '03027',
  investigateAction: true,
  abilities: (state, self, investigator) =>
    self.uses < 1
      ? []
      : Object.values(state.locations)
          .filter((l) => l.revealed)
          .map((l) => ({
            key: `${self.id}:investigate:${l.id}`,
            label: 'ability.inTheKnow',
            params: { card: playerCardDef(self.code)?.name ?? self.code, location: l.name },
            target: { type: 'location' as const, id: l.id },
            actions: 1 + (l.investigateExtraActions ?? 0),
            provokes: true,
            costs: [{ type: 'SpendUses' as const, asset: self.id, amount: 1 }],
            then: [
              {
                type: 'BeginSkillTest' as const,
                investigator,
                source: self.id,
                skill: 'intellect' as const,
                difficulty: shroudOf(state, l.id),
                kind: { type: 'investigate' as const, location: l.id },
              },
            ],
          })),
})
