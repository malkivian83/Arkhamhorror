import { activeInvestigators, registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { M } from './museum-codes'
import { museumSpecific } from './museum-helpers'
export const huntingHorror = enemy({
  code: M.horror,
  name: 'Hunting Horror',
  traits: ['Monster', 'Elite'],
  fight: 2,
  health: 3,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: ['hunter', 'retaliate'],
})
registerEnemy({
  code: M.horror,
  healthModifier: (s) => Number(s.scenarioMeta?.museumShadowResources ?? 0),
  insteadOfDiscard: (_s, self) => [museumSpecific('museumVoid', { enemy: self.id })],
  insteadOfRemove: (_s, self) => [museumSpecific('museumVoid', { enemy: self.id })],
  forced: (s, t, self) =>
    t.type === 'enemyPhaseBegins'
      ? [
          {
            type: 'RevealTokenOutsideTest',
            investigator: s.activeTurn ?? activeInvestigators(s)[0]!.id,
            then: { type: 'ScenarioSpecific', key: 'museumReady', data: { enemy: self.id } },
          },
        ]
      : [],
})
