import { inject, type InjectionKey } from 'vue'
import { useGameStore } from '../stores/game'
import type { OnlineTableStats } from '@lcg/shared'

export type TableController = Pick<
  ReturnType<typeof useGameStore>,
  | 'state'
  | 'error'
  | 'choicesByTarget'
  | 'untargetedChoices'
  | 'answer'
  | 'answerLabel'
  | 'advanceReview'
  | 'acceptAdvance'
  | 'autoSteps'
  | 'cardEntries'
  | 'acceptCardEntry'
  | 'acceptAutoSteps'
  | 'undo'
  | 'undoTargets'
  | 'campaign'
  | 'closeScenario'
  | 'quit'
> & {
  online?: boolean
  ownInvestigator?: string | undefined
  handCounts?: Record<string, number>
  stats?: OnlineTableStats | undefined
}
export const tableControllerKey: InjectionKey<TableController> = Symbol('table-controller')
/** Local games keep the original store, including persistence and undo. */
export function useTableGame(): TableController {
  return inject(tableControllerKey, null) ?? useGameStore()
}
