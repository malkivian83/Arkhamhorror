import type { InvestigatorId, Message } from '@lcg/engine'

export const LOLA = '03006'
/** Papeles de Lola Hayes: las cinco clases o neutral. */
export const ROLES = ['survivor', 'guardian', 'seeker', 'rogue', 'mystic', 'neutral'] as const

/** El investigador elige un papel (distinto del actual si cambia); `optional` permite no cambiar. */
export function chooseRole(
  investigator: InvestigatorId,
  current?: string,
  optional = false,
): Message {
  return {
    type: 'Ask',
    investigator,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.lola.role',
      choices: [
        ...ROLES.filter((role) => role !== current).map((role) => ({
          label: `choice.lola.role.${role}`,
          then: [{ type: 'SetRole', investigator, role } as Message],
        })),
        ...(optional ? [{ label: 'choice.lola.keepRole', then: [] }] : []),
      ],
    },
  }
}
