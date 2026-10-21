/** Reviewed exception: original Pete, his original signatures, no parallel variants. */
export function approvedPeteDefinitions(inventory) {
  return ['02005', '02014', '02015'].map((code) => {
    const c = inventory.cards.find((c) => c.code === code)
    if (!c || c.pack !== 'dwl') throw new Error('Missing original Pete source: ' + code)
    const d = {
      code,
      name: c.name,
      type: c.type,
      class: c.factions[0],
      traits: c.traits,
      deckLimit: c.deckLimit,
    }
    for (const k of ['health', 'sanity', 'cost'])
      if (c.numbers[k]?.kind === 'number') d[k] = c.numbers[k].value
    if (c.flags.is_unique) d.unique = true
    if (code === '02005')
      Object.assign(d, {
        skills: Object.fromEntries(
          ['willpower', 'intellect', 'combat', 'agility'].map((k) => [
            k,
            c.numbers['skill_' + k].value,
          ]),
        ),
        elderSignModifier: 2,
        deckSize: c.deckbuilding.size,
        deckOptions: [{ classes: ['survivor', 'neutral'], maxLevel: 5 }],
        offClassLevelZeroLimit: 5,
        signatures: ['02014', '02015'],
      })
    if (code === '02014') d.slots = c.slots.slots
    if (code === '02015') d.weakness = c.subtype
    return d
  })
}
