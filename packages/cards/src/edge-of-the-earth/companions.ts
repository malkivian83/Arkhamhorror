import {
  registerPlayerCard,
  registerPlayerCards,
  type AbilitiesFn,
  type Asset,
  type PlayerCardDef,
  type PlayerCardBehavior,
} from '@lcg/engine'
import { claypool } from './companion-claypool'
import { danforth } from './companion-danforth'
import { ellsworth } from './companion-ellsworth'
import { kensler } from './companion-kensler'
import { iceMessage } from './ice-and-death'
import { dyer, resoluteDyer } from './companion-dyer'
import { eliyah } from './companion-eliyah'
import { fredericks } from './companion-fredericks'
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
  abilities?: AbilitiesFn<Asset>
  effect?: PlayerCardBehavior['effect']
  reactions?: NonNullable<PlayerCardBehavior['reactions']>
  extraTraits?: string[]
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
const claypoolInfo = { name: 'Avery Claypool', subname: 'Antarctic Guide', trait: 'Wayfarer' }
const fredericksInfo = {
  name: 'James "Cookie" Fredericks',
  subname: 'Dubious Choice',
  trait: 'Wayfarer',
  extraTraits: ['Veteran'],
  uses: { count: 3, type: 'ammo' },
}
const danforthInfo = {
  name: 'Danforth',
  subname: 'Brilliant Student',
  trait: 'Miskatonic',
  uses: { ...secret, count: 5 },
}
const kenslerInfo = {
  name: 'Dr. Amy Kensler',
  subname: 'Professor of Biology',
  trait: 'Miskatonic',
  uses: secret,
}
const ellsworthInfo = {
  name: 'Roald Ellsworth',
  subname: 'Intrepid Explorer',
  trait: 'Miskatonic',
  extraTraits: ['Wayfarer'],
}
const blank: NonNullable<PlayerCardBehavior['effect']> = (_state, _investigator, _step, data) => [
  iceMessage('blank', { treachery: String(data.treachery) }),
]
const companions: Companion[] = [
  { ...danforthInfo, code: '08715', health: 2, sanity: 4, reactions: danforth(false) },
  {
    ...danforthInfo,
    code: '08588',
    health: 2,
    sanity: 5,
    reactions: danforth(true),
    resolute: true,
  },
  { ...kenslerInfo, ...kensler('08720', false), health: 2, sanity: 4 },
  { ...kenslerInfo, ...kensler('08593', true), health: 3, sanity: 4, resolute: true },
  {
    ...ellsworthInfo,
    code: '08721',
    health: 4,
    sanity: 2,
    uses: { ...supply, count: 5 },
    abilities: ellsworth(false),
    effect: blank,
  },
  {
    ...ellsworthInfo,
    code: '08594',
    health: 5,
    sanity: 2,
    uses: supply,
    abilities: ellsworth(true),
    effect: blank,
    resolute: true,
  },
  { ...dyerInfo, code: '08714', health: 1, sanity: 5, abilities: dyer },
  { ...dyerInfo, code: '08587', health: 1, sanity: 6, abilities: resoluteDyer, resolute: true },
  { ...eliyahInfo, code: '08716', health: 3, sanity: 3, abilities: eliyah(false) },
  { ...eliyahInfo, code: '08589', health: 4, sanity: 4, abilities: eliyah(true), resolute: true },
  { ...sinhaInfo, code: '08717', health: 4, sanity: 2, abilities: sinha },
  { ...sinhaInfo, code: '08590', health: 4, sanity: 3, abilities: resoluteSinha, resolute: true },
  { ...takadaInfo, code: '08722', health: 3, sanity: 3, abilities: takada(false) },
  { ...takadaInfo, code: '08595', health: 3, sanity: 4, abilities: takada(true), resolute: true },
  {
    ...claypoolInfo,
    code: '08718',
    health: 3,
    sanity: 3,
    uses: { ...supply, count: 5 },
    reactions: claypool(false),
  },
  {
    ...claypoolInfo,
    code: '08591',
    health: 4,
    sanity: 3,
    uses: supply,
    reactions: claypool(true),
    resolute: true,
  },
  { ...fredericksInfo, code: '08719', health: 5, sanity: 1, abilities: fredericks(false) },
  {
    ...fredericksInfo,
    code: '08592',
    health: 6,
    sanity: 1,
    abilities: fredericks(true),
    resolute: true,
  },
]

export function registerExpeditionCompanions(): void {
  registerPlayerCards(
    companions.map(
      ({ code, name, subname, trait, health, sanity, uses, resolute, extraTraits }) => ({
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
        traits: ['Ally', trait, ...(extraTraits ?? []), ...(resolute ? ['Resolute'] : [])],
      }),
    ),
  )
  for (const { code, abilities, reactions, effect } of companions)
    registerPlayerCard({
      code,
      ...(abilities ? { abilities } : {}),
      ...(reactions ? { reactions } : {}),
      ...(effect ? { effect } : {}),
    })
}
