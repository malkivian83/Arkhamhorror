import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import memorials from './memorials.json'
import './card-08730'
import './card-08731'
import './card-08732'
import './card-08733'
import './card-08734'
import './card-08735'
import './card-08736'
import './card-08737'
import './card-08738'

registerPlayerCards(
  memorials.map((card) => ({ ...card, class: 'neutral', story: true }) as PlayerCardDef),
)
