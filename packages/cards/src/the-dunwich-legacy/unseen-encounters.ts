import { copies, treachery } from '../scenario-helpers'
import { U } from './unseen-codes'
import './esoteric-formula'
import './towering-beasts'
import './ruin-and-destruction'
import './attracting-attention'
import './the-creatures-tracks'
const t = (code: string, name: string, traits: string[], keywords: ('peril' | 'surge')[] = []) =>
  treachery({ code, name, traits, keywords })
export const UNSEEN_ENCOUNTERS = [
  ...copies(t(U.towering, 'Towering Beasts', [], ['peril']), 4),
  ...copies(t(U.ruin, 'Ruin and Destruction', ['Hazard']), 3),
  ...copies(t(U.attention, 'Attracting Attention', [], ['surge']), 2),
  ...copies(t(U.tracks, "The Creatures' Tracks", ['Terror'], ['peril']), 2),
]
