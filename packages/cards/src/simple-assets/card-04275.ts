import { getInvestigator, getLocation, registerPlayerCard } from '@lcg/engine'
// Hemispheric Map (3): +1 willpower and intellect while your location connects to 2 or
// more locations, +2 while it connects to 4 or more.
registerPlayerCard({
  code: '04275',
  skillModifier: (s, self, test) => {
    if (!['willpower', 'intellect'].includes(test.skill)) return 0
    const here = getInvestigator(s, self.owner).location
    const connected = here === null ? 0 : getLocation(s, here).connections.length
    return connected >= 4 ? 2 : connected >= 2 ? 1 : 0
  },
})
