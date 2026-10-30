import type { ComputedRef, InjectionKey } from 'vue'
/** Targets stay out of sight until their card presentation has been accepted. */
export const pendingCardTargets: InjectionKey<ComputedRef<ReadonlySet<string>>> =
  Symbol('pending-card-targets')
