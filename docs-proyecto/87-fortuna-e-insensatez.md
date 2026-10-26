# 87 · Fortuna e insensatez

Historia secundaria (y escenario independiente) en dos partes: la vigilancia del casino
_Défis de la Roulette_ (parte I) y el golpe (parte II), con un punto de control entre
ambas. Guía ES: [`reglas/AHC71_Fortuna_e_insensatez_ES.pdf`](reglas/AHC71_Fortuna_e_insensatez_ES.pdf)
(32 páginas). Narración: voz de ElevenLabs «Carmelo».

## Estado actual

| Entrega | Contenido                                                                 | Estado    |
| ------- | ------------------------------------------------------------------------- | --------- |
| 1       | Catálogo EN/ES (89 cartas, 88001–88053), iconos de juego, imágenes y guía | Hecha     |
| 2       | Mecánicas: nivel de alarma, Errante, iconos de juego, cambiar cartas, roles | Hecha     |
| 3       | Parte I: preparación, cartas, resoluciones y punto de control              | Hecha     |
| 4       | Parte II: Lugares Restringido, Los elegidos de la fortuna, Plan al garete    | Hecha     |
| 5       | Narración de introducciones, punto de control y resoluciones               | Hecha     |

## Datos

- `scripts/import-fortune-cards.mjs` genera `packages/i18n/src/fortune-cards.{en,es}.json`
  desde la referencia (`frontend/public/cards_{en,es}.json`, paquete `fof`). El icono de
  juego, impreso al final del texto («♣Q»), pasa al campo `gameIcon` (43 cartas). Las
  cartas con valor «A» (Abarran, Dimensional Shambler) no van al mazo de Encuentros.
- Conjuntos: Fortuna e insensatez (72 cartas), Los elegidos de la fortuna (4) y Plan al
  garete (13). Varias cartas tienen copias con letra (`88035a`–`c`) porque cada copia lleva
  otro icono de juego.
- Imágenes: 106 escaneos ingleses (anversos y reversos) y sus miniaturas; la fuente no
  tiene escaneos españoles de estas cartas y la web muestra el inglés
  (`evidencias/imagenes-fortune-and-folly.json`). `import-card-images.mjs` admite ahora
  `--language en`.

## Mecánicas nuevas (guía pp. 3–5)

- **Nivel de alarma** por investigador (1–10, empieza en 1), con fichas de perdición que no
  cuentan para el plan. Con 6 o más, los Enemigos Casino de su Lugar pierden Indiferente.
- **Errante (Patrol)**: en la fase de Enemigos (paso 3.2), cada Enemigo preparado y sin
  enfrentar se mueve un Lugar hacia el designado; «en el sentido de las agujas del reloj»
  y «en el contrario» recorren el grupo de Lugares (público o restringido) en que está.
- **Comprobar iconos de juego**: descartar cartas del mazo de Encuentros y mirar su color,
  palo y valor (J, Q y K valen 10; «valor secuencial» = seguidos). Las cartas sin icono se
  apartan y se sustituyen; si el mazo se acaba, se rebaraja la pila sin las ya descartadas.
- **Cambiar cartas**: tras comprobar, apartar las que se quiera y descartar otras tantas.
- **Roles** (La cara, El músculo, El ladrón, El estafador): Apoyos de historia de dos caras,
  Inexperto y Experimentado. Con un solo investigador se elige un rol más.
- **El manantial de fortuna**: Llave usada solo como contador de pistas y objetivo; su
  texto se considera en blanco.
- **Isamara Ordoñez**: Apoyo de historia de doble cara; se aparta si abandona el juego o si
  quien la controla es derrotado.
- **Punto de control**: las dos partes son partidas separadas. Se recuerda lo anotado, el
  nivel de alarma, los roles Experimentado, las pistas del manantial y el «escondite para
  el golpe» (Apoyos bajo la Zona de juego del casino que pasan a la mano inicial).

## Modo de juego en la aplicación

Primera versión como escenario independiente (como La gala del ecuador del invierno), con
las dos dificultades de la guía (Normal y Difícil). Como historia secundaria cuesta 3 de
experiencia a cada investigador; se valorará cuando el escenario sea jugable.

## Parte I en la aplicación (entrega 3)

Campaña independiente `fortune-and-folly` con dos escenarios jugables, `fortune-and-folly-part-1`
y `fortune-and-folly-part-2`.

- **Código**: `packages/cards/src/fortune-and-folly/` — `cards.ts` (datos, Lugares, anillo de
  Errante), `check.ts` e `icons.ts` (iconos y alarma), `games.ts` (los cinco juegos),
  `roles.ts`, `encounter.ts` y `part-one.ts` (preparación, fichas, plan, acto, Lugares, Isamara,
  uniforme, resoluciones y punto de control).
- **Nivel de alarma**: `scenarioMeta['fof:alarm:<id>']`, visible junto a los recursos del
  investigador (también en línea). Los Guardias del casino hacen 1 daño cuando sube en su Lugar.
- **Errante**: anillo público en el sentido de las agujas del reloj (Mesa de apuestas altas →
  Bar → Ruleta → Tragaperras → Zona de juego → Póquer → Bacará). Conexiones leídas de las
  cartas: la Ruleta y el Bacará están además conectados entre sí.
- **Juegos**: apuesta, comprobación, cambiar cartas (marcar y confirmar), El estafador
  (cambiar palo y valor, o bajar la alarma) y premio. Las cartas sin icono se apartan y se
  sustituyen; si se acaba el mazo, se baraja la pila sin las cartas ya comprobadas.
- **Punto de control**: siempre se anota como en «El plan 3» (preparación «desde cero» de la
  parte II): notas visibles en el registro (tareas, niveles de alarma, Roles, Escondido,
  pistas del manantial, necesitan descansar) y valores internos `fof:alarm:`, `fof:role:`,
  `fof:stash:` y `fof:wellspring`. Las elecciones «por cada pista por investigador en La
  vigilancia» las hace el jefe.
- El motor guarda `resourcesWhenEliminated` porque al desistir los recursos pasan a 0 y la
  tarea «dejar limpio el casino» los cuenta.

Simplificaciones de la parte I:

- El ladrón se ofrece al empezar la fase de Enemigos (antes de que se muevan), no en el
  momento exacto en que cada enemigo resuelve Errante.
- La reacción del acto 1 (quitar pistas del manantial tras un juego) se aplica sola: no tiene
  inconveniente.
- Abarran (El hombre del anillo de rubí) no tiene valores: no se le puede dañar; enfrentarse a
  él hace avanzar el plan y termina la partida (→R1).
- «Luchar» contra el guardia del uniforme es una prueba de [combat] (3) sin daño.
- Las pistas de La vigilancia se guardan con el acto (`actClues`).
- No se ofrece saltar la vigilancia (Introducción 4) ni las introducciones de Las llaves
  escarlata.

Pruebas: `fortune-and-folly/mechanics.test.ts` y `part-one.test.ts` (preparación, premios de
cada juego, cambiar cartas, El estafador, Crupier, alarma y Guardias, Indiferente con alarma
6, Errante y El ladrón, tareas, traiciones, resoluciones y punto de control).

## Narración

`scripts/generate-fortune-audio.mjs` lee los textos oficiales en español
(`apps/web/public/local-assets/story/es.json`, de la guía; el inglés, del proyecto de
referencia) y los graba con Carmelo (`5egO01tkUjEzu7xSSE8M`, comprobada por nombre), que sustituye a la
primera grabación con Juanjo Relatos.
Parte I: Introducciones 1, 3, 4 y 5, Resoluciones 1 y 2 y El plan 1. Las instrucciones de
juego no se narran. Evidencia: `evidencias/fortuna-narracion.json`. Los textos de i18n son
resúmenes propios, como en las demás campañas.

## Parte II en la aplicación (entrega 4)

`part-two.ts` (preparación, Lugares, planes, actos, Isamara de la Banda, Carro de dinero,
Entrega de paquete, Desaprobación de la fortuna y resoluciones) y `encounter-two.ts` (Abarran
desatado, Los elegidos de la fortuna y Plan al garete). Lo común a las dos partes está en
`common.ts`.

- **Preparación desde cero** con los valores `fof:*` del registro: nivel de alarma, Roles (con
  su cara Experimentado), cartas escondidas (del mazo a la mano tras cambiar la mano inicial),
  pistas del manantial, Isamara (Banda) en el Bar si la convencisteis, el Carro de dinero si
  dejasteis limpio el casino, 1 perdición en el plan 2 si necesitáis descansar y las llaves de
  Abarran (entrar en su despacho no cuesta pistas). Un investigador sin Roles anotados los elige.
- **Lugares** (guía p. 26, conexiones leídas de las cartas): el grupo restringido encima del
  público. Pasillo de acceso (4 pistas por investigador para entrar; al revelarse, Abarran
  desatado y Los elegidos de la fortuna), Oficina de seguridad, Sala de guardias, Despacho del
  dueño (velo X; 2 pistas por investigador salvo con las llaves), Sala de contar, Puerta de la
  cámara (4 tareas para entrar; moverse por palo, cambiando cartas hasta dos veces con el
  plano) y Sala de reliquias (solo se revela desde la Puerta de la cámara; sus pistas incluyen
  las del manantial). Anillo restringido: Pasillo → Oficina → Despacho → Puerta → Sala de
  contar → Sala de guardias.
- **El golpe**: las 8 tareas son notas del registro; cada una por encima de 4 da 1 de
  experiencia, y con 5 y 6 se anotan Isamara y el Mazo de posibilidades.
- **Planes**: Farol descubierto (Vagabundo dimensional y Plan al garete), Caos improbable (una
  Desaprobación de la fortuna al azar) y Desplumados (→R3). **Actos**: El robo (al tomar el
  manantial, Abarran va a la Sala de reliquias o cae el techo) y La salida (los Casino pierden
  Indiferente y Errante y ganan Cazador; →R1 cuando el portador desiste).
- **Motor**: nuevos ganchos genéricos `enemyDamageModifier`, `actionAllowed` y `afterAction`
  (escenario) y `onAttack` (enemigo); `CompleteAction` lleva el tipo de acción.

Simplificaciones de la parte II:

- La Presa de La salida («quien controle el manantial») no se aplica: los Cazadores van al
  investigador más cercano.
- El Duplicado dimensional usa la imagen del Duplicador y la carta del mazo va directamente a
  la pila de descartes; se descarta en cuanto deja de estar enfrentado (al evitar o al final
  del turno).
- El Carro de dinero se usa después de que un enemigo se enfrente (lo desenfrenta) en vez de
  «cuando fuera a enfrentarse»; hasta el final de la ronda, los enemigos de su Lugar son
  Indiferentes para todos.
- Los pagos «como grupo» de pistas los puede hacer cualquier investigador.
- El Vagabundo dimensional solo cuenta las acciones dentro de un mismo turno.
- La Desaprobación de la fortuna «Implicación personal» guarda su horror en el escenario.
- Las recompensas (Isamara, Cantante de baladas y Mazo de posibilidades) y la ficha de «mala
  suerte» solo se anotan: en el escenario independiente no hay partida siguiente.
- La introducción inglesa de la parte II es traducción propia de la guía española (la
  referencia no la incluye).

Narración de la parte II: introducción, Resoluciones 1–3, Reliquia conseguida (las dos
versiones) y las cuatro caras de Desaprobación de la fortuna.

Los Lugares de una cara (Mesas, Ruleta, Tragaperras, Oficina de seguridad, Sala de guardias y Sala de contar) no tienen escaneo sin revelar: la mesa muestra su anverso.
