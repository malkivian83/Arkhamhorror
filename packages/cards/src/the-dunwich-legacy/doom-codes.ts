export const WHERE_DOOM_AWAITS = 'where-doom-awaits'
export const W = {
  reference: '02274',
  calling: '02275',
  beckoning: '02276',
  path: '02277',
  ascendingI: '02278',
  ascendingII: '02279',
  ascendingIII: '02280',
  gate: '02281',
  base: '02282',
  ascent: '02283',
  peak: '02284',
  slaughtered: '02285',
  eerie: '02286',
  destroyed: '02287',
  frozen: '02288',
  gap: '02289',
  tear: '02290',
  uprooted: '02291',
  memories: '02292',
  seth: '02293',
  devotee: '02294',
  shoggoth: '02295',
  rites: '02296',
  spaces: '02297',
  vortex: '02298',
  spheres: '02103',
  lurker: '02104',
} as const
export const WN = { entered: 'dunwichEnteredGate', merged: 'dunwichYogSothothMerged' } as const
export const DIVERGING_PATHS: string[] = [W.slaughtered, W.eerie, W.destroyed, W.frozen]
export const ALTERED_PATHS: string[] = [W.gap, W.tear, W.uprooted, W.memories]
