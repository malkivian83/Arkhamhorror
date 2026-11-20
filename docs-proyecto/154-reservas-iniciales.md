# 154 · Reservas iniciales, biblioteca y Micónidos

Ocho códigos y diseños/niveles estándar nuevos; cero vinculadas nuevas y cero
reediciones. Se reutiliza Crecimiento prodigioso (`10045`) como carta vinculada
compartida, con una copia por investigador, también al combinar mejoras.
Textos oficiales íntegros EN/ES conservados con huellas SHA-256 en
`opening-archives/source-{en,es}.json`; datos reproducibles mediante el conversor
revisado. Dieciséis escaneos oficiales y dieciséis miniaturas, sin alterar las
entradas históricas de los inventarios.

| Código | Carta | Reglas implementadas |
| --- | --- | --- |
| 03264 | Ceñirse al plan (3) | Búsqueda anterior a la mano inicial, hasta tres eventos Táctica/Suministro de títulos distintos, cartas boca abajo y agotamiento como coste adicional de jugarlas. |
| 07303 | Conocimiento ancestral (3) | +5 al tamaño, mínimo diez habilidades en el mazo; cinco habilidades no Debilidad aleatorias antes de robar; agotar para robar una habilidad vinculada elegida. |
| 09077 | Mercado de los bajos fondos (2) | +10 al tamaño; elegir exactamente diez Ilícito como coste de preparación, barajar solo el mercado; revelar dos al inicio del turno, pagar uno para robar una y ordenar las restantes abajo. |
| 10079 | Encantadora (3) | Hasta tres Trucos de títulos distintos antes de la mano; al enfrentarse, agotar para robar una vinculada o buscar una copia entre las nueve superiores, robarla y barajar. |
| 11099 | Pase de biblioteca (1) | Restricción Miskatonic/Erudito y límite uno; durante tu turno gastar un recurso para poner un Tomo de la mano vinculado y sin ranuras; devolverlo al fondo al terminar. |
| 11118 | Pase de biblioteca (5) | Permanente, agotar en lugar del recurso para vincular; al terminar el turno pagar uno o devolver el Tomo físico al fondo. |
| 10059 | Micónido voraz: Cepa sensible (4) | Investigación y límite uno; buscar Crecimiento una vez por ronda; cancelar todos los efectos de una traición no Debilidad robada por cualquier investigador si su velo no supera los crecimientos; retirar todos los crecimientos. |
| 10060 | Micónido voraz: Cepa carnívora (4) | Misma búsqueda vinculada; derrotar un enemigo local no Élite cuya salud restante, con modificadores y daño recibido, no supere los crecimientos; retirarlos todos. Respeta inmunidad y ausencia de estadísticas. |

Las búsquedas durante la preparación no activan Investigación ni reacciones a
buscar: FAQ 1.26. Las búsquedas de Encantadora durante la partida sí abren esa
ventana. Sus cartas vinculadas deben existir para activar la reacción, conforme
a la respuesta oficial de diciembre de 2024. El controlador puede inspeccionar
las cartas vinculadas boca abajo de Conocimiento ancestral (FAQ 1.9); el mazo de
mercado permanece oculto incluso para su controlador, también en la mesa online.
Solo los dos nombres revelados se publican en el registro.

Se corrige la comprobación inicial de ranuras para apoyos vinculados que no las
ocupan (también Elli); una entrada única imposible conserva la carta en la mano.
Los Tomos devueltos van al mazo del propietario original y conservan su instancia
mientras permanezcan en juego. La información de reservas y las elecciones
pendientes se conserva al guardar y restaurar.

Fuentes de aclaraciones: [Ceñirse al plan](https://arkhamdb.com/card/03264),
[Conocimiento ancestral](https://arkhamdb.com/card/07303),
[Mercado de los bajos fondos](https://arkhamdb.com/card/09077) y
[Encantadora](https://arkhamdb.com/card/10079), apartados de FAQ oficiales.
Se implementa el texto impreso sin Tabú, como en los lotes anteriores.

Pendiente: Cepa nutricia (`10061`) necesita trasladar daño/horror sin convertirlo
en curación ni en daño nuevo. Dayana, Katja y Curación espiritual mantienen sus
bloqueos previos. No se activan por equivalencia parcial.

Verificación: 669 archivos y 7807 casos de motor, cartas e importación, con los
casos nuevos de compra corregidos y repetidos en el archivo completo (33 casos).
Presentación, guardados y mesa online: 45 casos; recursos: 40 casos, con timeout
ampliado solo para esa comprobación bajo carga. Tipos cards/engine/server, tipos
y build web, formato/lint correctos. Dieciséis originales y dieciséis miniaturas
verificados por SHA-256; muestra española de Cepa carnívora inspeccionada.
