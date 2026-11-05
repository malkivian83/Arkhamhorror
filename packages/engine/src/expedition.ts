import type { Asset, CampaignLog, ExpeditionState } from './types'

// Base and Resolute versions share one expedition record.
export const expeditionPartners = {
  '08714': '08587',
  '08715': '08588',
  '08716': '08589',
  '08717': '08590',
  '08718': '08591',
  '08719': '08592',
  '08720': '08593',
  '08721': '08594',
  '08722': '08595',
} as const

export type ExpeditionPartner = keyof typeof expeditionPartners

export const tekeliliCopies = {
  '08723': 3,
  '08724': 3,
  '08725': 2,
  '08726': 2,
  '08727': 2,
  '08728': 2,
  '08729': 2,
} as const

export function availableTekelili(log: CampaignLog): string[] {
  const assigned = Object.values(log.investigators).flatMap((record) => record.storyAssets)
  return Object.entries(tekeliliCopies).flatMap(([code, copies]) => {
    const owned = assigned.filter((card) => card === code).length
    return Array<string>(Math.max(0, copies - owned)).fill(code)
  })
}

export function newExpedition(): ExpeditionState {
  const partners: ExpeditionState['partners'] = {}
  for (const code of Object.keys(expeditionPartners) as ExpeditionPartner[]) {
    partners[code] = { status: 'safe', damage: 0, horror: 0 }
  }
  return { partners, supplies: [] }
}

export function recordPartner(
  expedition: ExpeditionState,
  asset: Asset,
  defeated: boolean,
): ExpeditionState {
  const code = asset.expeditionPartner
  const record = code && expedition.partners[code]
  if (!code || !record) return expedition
  return {
    ...expedition,
    partners: {
      ...expedition.partners,
      [code]: {
        ...record,
        status: defeated ? 'eliminated' : record.status,
        damage: asset.damage,
        horror: asset.horror,
      },
    },
  }
}
