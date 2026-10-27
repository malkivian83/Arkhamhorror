import { registerPlayerCard, type SkillTest } from '@lcg/engine'
import { KNOW_THE_EXIT, KNOW_THE_LINE, KNOW_THE_SCENE } from './codes'

// RR: Skill Icons, Committing Cards. Each "Know the…" skill gains [wild] [wild] while
// committed to its kind of test. Tests started by scenario cards (scenario reference card,
// locations, agendas, acts, story and encounter cards) are tagged `scenario` by the engine.
const GAINS: Record<string, (t: SkillTest) => boolean> = {
  [KNOW_THE_EXIT]: (t) => t.kind.type === 'fight' || t.kind.type === 'evade',
  [KNOW_THE_LINE]: (t) => !!t.tags?.includes('scenario'),
  // Investigations include scenario "Investigate." abilities tested as effects (`investigate`).
  [KNOW_THE_SCENE]: (t) =>
    t.kind.type === 'investigate' ||
    !!t.tags?.some((tag) => tag === 'investigate' || tag === 'parley'),
}

for (const [code, applies] of Object.entries(GAINS))
  registerPlayerCard({
    code,
    additionalIcons: (_s, t) => (applies(t) ? { wild: 2 } : {}),
  })
