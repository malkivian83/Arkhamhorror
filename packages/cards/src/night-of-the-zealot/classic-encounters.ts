/** Original Nightgaunts, Agents of Shub-Niggurath and Agents of Cthulhu. */
import { registerEnemy, registerTreachery } from '@lcg/engine'
import { damage, effectTest } from '../scenario-helpers'
// Agents of Yog-Sothoth and Hastur reuse the reviewed shared behaviors.
import '../the-dunwich-legacy/remaining-encounters'
import '../the-dunwich-legacy/hunting-nightgaunt'
import '../the-dunwich-legacy/on-wings-of-darkness'
registerEnemy({
  code: '01179',
  forced: (_s, t, e) =>
    t.type === 'roundEnds' ? [{ type: 'HealEnemy', enemy: e.id, amount: 2 }] : [],
})
registerEnemy({
  code: '01181',
  forced: (_s, t, e) =>
    t.type === 'afterEngage' && t.enemy === e.id ? [damage(t.investigator, 0, 1)] : [],
})
registerTreachery({
  code: '01182',
  sanityModifier: -1,
  skillModifier: (_s, self, test) =>
    self.placement.type === 'threatArea' &&
    self.placement.investigator === test.investigator &&
    test.skill === 'willpower'
      ? -1
      : 0,
  revelation: (_s, i, self) => [
    {
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'threatArea', investigator: i },
    },
  ],
  abilities: (_s, self, i) => [
    {
      key: self.id + ':discard',
      label: 'ability.devourer.dreams',
      actions: 1,
      provokes: true,
      then: [
        effectTest(i, "Dreams of R'lyeh", 'willpower', 3, {
          onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
        }),
      ],
    },
  ],
})
