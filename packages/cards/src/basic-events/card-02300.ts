import { elite, registerBasicEvent } from './register'
// Monster Slayer (5): a successful attack defeats a non-Elite enemy outright.
registerBasicEvent('02300', {
  action: 'fight',
  onSuccess: ({ investigator }, enemy) =>
    elite(enemy!) ? [] : [{ type: 'DefeatEnemy', enemy: enemy!.id, by: investigator }],
})
// Monster Slayer (0): +1 damage.
registerBasicEvent('60116', { action: 'fight', extraDamage: 1 })
