import {
  registerPlayerCard,
  registerPlayerCards,
  type AbilitiesFn,
  type Asset,
  type PlayerCardDef,
} from '@lcg/engine'
import { dyer, resoluteDyer } from './companion-dyer'
import { eliyah } from './companion-eliyah'
import { sinha, resoluteSinha } from './companion-sinha'
import { takada } from './companion-takada'

interface Companion {
  code: string
  name: string
  subname: string
  trait: string
  health: number
  sanity: number
  uses: NonNullable<PlayerCardDef['uses']>
  abilities: AbilitiesFn<Asset>
  resolute?: boolean
}

const secret = { count: 3, type: 'secret' }
const supply = { count: 3, type: 'supply' }
const resource = { count: 9, type: 'resource' }
const dyerInfo = {
  name: 'Professor William Dyer',
  subname: 'Professor of Geology',
  trait: 'Miskatonic',
  uses: secret,
}
const eliyahInfo = {
  name: 'Eliyah Ashevak',
  subname: 'Dog Handler',
  trait: 'Wayfarer',
  uses: secret,
}
const sinhaInfo = {
  name: 'Dr. Mala Sinha',
  subname: 'Daring Physician',
  trait: 'Wayfarer',
  uses: supply,
}
const takadaInfo = {
  name: 'Takada Hiroko',
  subname: 'Aeroplane Mechanic',
  trait: 'Wayfarer',
  uses: resource,
}
const companions: Companion[] = [
  { ...dyerInfo, code: '08714', health: 1, sanity: 5, abilities: dyer },
  { ...dyerInfo, code: '08587', health: 1, sanity: 6, abilities: resoluteDyer, resolute: true },
  { ...eliyahInfo, code: '08716', health: 3, sanity: 3, abilities: eliyah(false) },
  { ...eliyahInfo, code: '08589', health: 4, sanity: 4, abilities: eliyah(true), resolute: true },
  { ...sinhaInfo, code: '08717', health: 4, sanity: 2, abilities: sinha },
  { ...sinhaInfo, code: '08590', health: 4, sanity: 3, abilities: resoluteSinha, resolute: true },
  { ...takadaInfo, code: '08722', health: 3, sanity: 3, abilities: takada(false) },
  { ...takadaInfo, code: '08595', health: 3, sanity: 4, abilities: takada(true), resolute: true },
]

export function registerExpeditionCompanions(): void {
  registerPlayerCards(
    companions.map(({ code, name, subname, trait, health, sanity, uses, resolute }) => ({
      code,
      name,
      subname,
      health,
      sanity,
      uses,
      type: 'asset',
      class: 'neutral',
      story: true,
      unique: true,
      traits: ['Ally', trait, ...(resolute ? ['Resolute'] : [])],
    })),
  )
  for (const { code, abilities } of companions) registerPlayerCard({ code, abilities })
}
