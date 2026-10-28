import { readFileSync, writeFileSync } from 'node:fs'
const names = {
  en: {
    '06332': 'Scavenging',
    '09105': 'Exploit Weakness',
    '09116': 'Salvage',
    '09119': 'Hyperphysical Shotcaster',
  },
  es: {
    '06332': 'Reutilizar',
    '09105': 'Aprovechar la debilidad',
    '09116': 'Reaprovechar',
    '09119': 'Lanzadisparos hiperfísico',
  },
}
const summaries = {
  en: {
    '06332':
      '[reaction] After you successfully investigate by 2 or more, exhaust Scavenging: Choose an [[Item]] card in your discard pile and either add it to your hand or play it (paying its cost).',
    '09105':
      'Fast. Play before revealing a chaos token during an attack or evasion attempt you are performing, and only if the difficulty of this test is currently 0. This test automatically succeeds. Instead of this test’s normal effects, discard the attacked or evaded enemy (if it is Elite, automatically evade it and deal it 3 damage instead).',
    '09116':
      'Choose an [[Item]] asset in your discard pile. Either remove it from the game and gain resources equal to its cost, or play it (paying its cost).',
    '09119':
      'Customizable. Uses (4 aether). If Hyperphysical Shotcaster has no aether, discard it. [action] Spend 1 aether: Resolve the Manifest ability of its current form. [free] Exhaust: Change to a form unlocked on its upgrade sheet.',
  },
  es: {
    '06332':
      '[reaction] Después de que investigues con éxito por 2 o más, agota Reutilizar: Elige 1 carta [[Objeto]] de tu pila de descartes y añádela a tu mano o juégala (pagando su coste).',
    '09105':
      'Rápido. Juega esta carta antes de revelar una ficha de Caos durante un ataque o intento de evitar que estés realizando, y sólo si la dificultad de esta prueba es 0 actualmente. Esta prueba tiene éxito automáticamente. En lugar de sus efectos normales, descarta el Enemigo atacado o evitado, o bien evítalo automáticamente e inflígele 3 puntos de daño si es Élite.',
    '09116':
      'Elige un Apoyo [[Objeto]] de tu pila de descartes: retíralo de la partida y obtén recursos iguales a su coste, o juégalo pagando su coste.',
    '09119':
      'Personalizable. Usos (4 de éter). Si no tiene éter, descártalo. [action] Gasta 1 de éter: Resuelve la capacidad Manifestar de su forma actual. [free] Agota: Cambia a una forma desbloqueada en su lista de mejoras.',
  },
}
const customization = {
  en: {
    title: 'Upgrade sheet',
    total: '{xp} XP marked · level {level}',
    addCopies: 'New copies with this purchase',
    noRemoval: 'No replacement needed',
    save: 'Save upgrades',
    railshooter: 'Railshooter',
    telescanner: 'Telescanner',
    translocator: 'Translocator',
    realitycollapser: 'Realitycollapser',
    matterweaver: 'Matterweaver',
    aethericLink: 'Aetheric Link',
    empoweredConfiguration: 'Empowered Configuration',
    invalid: 'These upgrades or deck changes are not legal.',
    experience: 'Choose upgrades you can afford.',
    permanent: 'Purchased upgrades cannot be removed.',
    unavailable: 'Upgrades are not available now.',
    description: {
      railshooter: 'Fight using any skill; deal +1 damage.',
      telescanner: 'Investigate using any skill; discover the basic clue at any revealed location.',
      translocator:
        'Evade using any skill. Before or after, optionally move an investigator or non-Elite enemy between your location and a connected location.',
      realitycollapser:
        'Test any skill (3). On success, discard a non-weakness treachery in play that is not attached to an Elite enemy.',
      matterweaver:
        'Choose an asset in hand. Test any skill against its cost; on success, play it at no cost.',
      aethericLink: 'Enter play with 2 additional aether.',
      empoweredConfiguration: '+2 skill value when using Manifest.',
    },
  },
  es: {
    title: 'Lista de mejoras',
    total: '{xp} PX marcados · nivel {level}',
    addCopies: 'Copias nuevas con esta compra',
    noRemoval: 'No hace falta sustituir',
    save: 'Guardar mejoras',
    railshooter: 'Lanzador de riel',
    telescanner: 'Teleescáner',
    translocator: 'Translocador',
    realitycollapser: 'Colapsador de realidad',
    matterweaver: 'Tejedor de materia',
    aethericLink: 'Enlace etérico',
    empoweredConfiguration: 'Configuración potenciada',
    invalid: 'Estas mejoras o cambios de mazo no son válidos.',
    experience: 'Elige mejoras que puedas pagar.',
    permanent: 'Las mejoras compradas no se pueden retirar.',
    unavailable: 'Ahora no se pueden comprar mejoras.',
    description: {
      railshooter: 'Combate con cualquier habilidad e inflige +1 de daño.',
      telescanner:
        'Investiga con cualquier habilidad; descubre la pista básica en cualquier Lugar revelado.',
      translocator:
        'Evita con cualquier habilidad. Antes o después, puedes mover un investigador o Enemigo no Élite entre tu Lugar y uno conectado.',
      realitycollapser:
        'Prueba de cualquier habilidad (3). Si tienes éxito, descarta una Traición en juego que no sea Debilidad ni esté vinculada a un Enemigo Élite.',
      matterweaver:
        'Elige un Apoyo en tu mano. Prueba de cualquier habilidad contra su coste; si tienes éxito, juégalo sin coste.',
      aethericLink: 'Entra en juego con 2 de éter adicional.',
      empoweredConfiguration: '+2 a tu valor de habilidad al usar Manifestar.',
    },
  },
}
for (const lang of ['en', 'es']) {
  const path = `packages/i18n/src/${lang}.json`
  const data = JSON.parse(readFileSync(path, 'utf8'))
  Object.assign(data.offlineCard.names, names[lang])
  Object.assign(data.offlineCard.summary, summaries[lang])
  data.customization = customization[lang]
  data.deck.problem.customizations =
    lang === 'es' ? 'La lista de mejoras no es válida.' : 'The upgrade sheet is invalid.'
  Object.assign(
    data.choice,
    lang === 'es'
      ? {
          salvageResources: 'Retirar de la partida y obtener {n} recursos',
          shotcasterMoveEnemy: 'Mover a {enemy} a {location}',
          shotcasterBefore: 'Mover antes del intento',
          shotcasterAfter: 'Mover después del intento',
        }
      : {
          salvageResources: 'Remove from the game and gain {n} resources',
          shotcasterMoveEnemy: 'Move {enemy} to {location}',
          shotcasterBefore: 'Move before the attempt',
          shotcasterAfter: 'Move after the attempt',
        },
  )
  data.ability.scavenging2 =
    lang === 'es'
      ? 'Recuperar o jugar un Objeto del descarte'
      : 'Return or play an Item from your discard pile'
  data.ability.shotcasterForm =
    lang === 'es'
      ? 'Cambiar forma del Lanzadisparos hiperfísico'
      : 'Change Hyperphysical Shotcaster form'
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}
