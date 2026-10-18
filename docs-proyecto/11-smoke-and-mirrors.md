# 11 · Escenario II: Smoke and Mirrors (Brethren of Ash)

> Cierre revisado el 18/10/2026: variantes de preparación, seis códices con 1/2/4 investigadores, resoluciones y continuidad ampliadas en la [auditoría de cierre](16-auditoria-cierre-brethren-of-ash.md).

Implementado en `packages/cards/src/brethren-of-ash/smoke-and-mirrors.ts`.
Fuentes: guía de campaña (`reglas/`), datos públicos de ArkhamDB
(`core_2026`) para los valores y el proyecto de referencia para las conexiones
(símbolos de las localizaciones). **No se copia el texto de las cartas ni de la
guía**: los efectos se describen con palabras propias y los textos de historia
son resúmenes propios.

## Preparación

- Bolsa del caos: se añaden 2 fichas de sectario para el resto de la campaña
  (quedan en el registro).
- Localizaciones: Northside, Easttown, Merchant District, Waterfront District,
  Southside y French Hill, más un **Downtown** y un **Uptown** al azar, y la
  **Miskatonic University** según el registro (en llamas si ardió; tranquila si se
  salvó, con 1 perdición más).
- Uno de los seis sospechosos (People of Arkham) se aparta al azar: es el
  **heraldo de Elokoss**. Los otros cinco y Servant of Flame se reparten boca abajo
  debajo de Northside, Downtown, Southside, French Hill, Uptown y Waterfront.
- Todos empiezan en la Universidad, con 1 perdición por investigador en el plan.
- El portador de **Dr. Henry Armitage** lo pone en juego sin ocupar ranura de aliado.
- Las 4 **Mark of Elokoss** quedan apartadas.

Colocación en la mesa (guía): Northside, Downtown, Easttown arriba; Universidad,
Merchant District, Waterfront en medio; Uptown, Southside, French Hill abajo.

## Plan y acto

| Carta | Qué hace (resumen propio) |
|---|---|
| Arkham Alive (10) | Acción: retirarse. Al avanzar, cada investigador recibe una Mark of Elokoss y pasa a ser su portador (va a su mazo en la campaña). |
| Emergent Evils (8) | Acción: retirarse. Al avanzar, todos se retiran. |
| Augurs of Flame | Acción: gastar 2 pistas por investigador en grupo para robar la carta de debajo de tu localización. Objetivo: 6 Élite entre la zona de victoria y debajo del acto → resolución 1. |

## Sospechosos y códex

Cada sospechoso se puede **derrotar** (zona de victoria) o **interrogar** con su
entrada del códex: cada vez se pone 1 "pista" (recurso de la reserva) sobre él y,
con 1 por investigador, queda interrogado y pasa **debajo del acto**.

| Sospechoso | Cómo se activa su códex | Efecto |
|---|---|---|
| David Renfield (distante) | Tras investigar con éxito su localización | Se escabulle a una conectada sin investigadores |
| Cornelia Akely (alerta) | Tras evitarla con éxito | Se prepara; curas 1 horror |
| Naomi O'Bannion (represalia) | Parlamento gastando 1 recurso por investigador | Puedes derrotar a un enemigo no Humanoide |
| Sgt. Earl Monroe (esquivo) | Parlamento [combat] (4 − su daño) | Curas 1 daño |
| Abigail Foreman (distante) | Parlamento [intellect] (pistas de su localización) | 1 pista en su localización y robas 1 |
| Margaret Liu (distante) | Tras superar una prueba por 2+ en su localización | Miras la carta superior de encuentros y puedes descartarla |
| Servant of Flame (esquivo, cazador, represalia) | Al ser derrotado | Rematarlo (victoria; cada uno roba 3) o retenerlo (debajo del acto; cada uno gana 1 pista) |

## Reglas nuevas en el motor

- **Esquivo**: tras atacar o ser atacado estando preparado, el enemigo se
  desenfrenta, se mueve a una conectada sin investigadores (si hay varias, elige el
  jefe) y se agota.
- Perdición sobre enemigos (Raising Suspicions), presa "más recursos" (Rogue
  Gangster), modificadores de habilidad de los enemigos de tu localización
  (Whippoorwill: −1 a todo), habilidades y reacciones de los enemigos (parlamento,
  códex), cartas debajo de localizaciones y del acto, coste adicional para investigar
  (Waterfront) o entrar/salir (Arcane Lock), "al terminar tu turno" (Mark of Elokoss)
  y victoria de las localizaciones al final.

## Resoluciones

- **Sin resolución**: se revela el heraldo; se baraja con los Élite en juego o
  debajo de localizaciones y se roba uno al azar: si es el heraldo, "descubrieron el
  paradero de la secta"; si no, "fracasaron en su búsqueda".
- **Resolución 1**: "descubrieron el paradero de la secta" y se revela el heraldo;
  6 Élite debajo del acto → "recorrieron Arkham en busca de respuestas"; 6 en la
  zona de victoria → "armaron un buen lío".
- En ambas: si Servant of Flame está en la zona de victoria, "mataron al Servant of
  Flame"; experiencia = victoria + 1 por cada enemigo debajo del acto. Si Servant of
  Flame estaba debajo del acto → **resolución 2**: "el Servant of Flame escapó" y 1
  de experiencia adicional.

## Detalles

- **Flash Flood** se une a tu localización (+4 a su velo) y se descarta al final de
  la ronda.
- **University in Flames** daña también a los apoyos con salud de la localización.
- **St. Mary's Hospital** (una vez por partida cada investigador) y el **Sanatorium**
  curan a investigadores y aliados.
- Cada intento de un **códex** muestra su texto; al reunir las pistas, el final.
