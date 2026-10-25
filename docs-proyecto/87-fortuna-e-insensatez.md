# 87 · Fortuna e insensatez

Historia secundaria (y escenario independiente) en dos partes: la vigilancia del casino
_Défis de la Roulette_ (parte I) y el golpe (parte II), con un punto de control entre
ambas. Guía ES: [`reglas/AHC71_Fortuna_e_insensatez_ES.pdf`](reglas/AHC71_Fortuna_e_insensatez_ES.pdf)
(32 páginas). Narración: voz de ElevenLabs «Juanjo Relatos» (`DdKbXdRlBmj7Ty7N0FVr`).

## Estado actual

| Entrega | Contenido                                                                 | Estado    |
| ------- | ------------------------------------------------------------------------- | --------- |
| 1       | Catálogo EN/ES (89 cartas, 88001–88053), iconos de juego, imágenes y guía | Hecha     |
| 2       | Mecánicas: nivel de alarma, Errante, iconos de juego, cambiar cartas, roles | Hecha     |
| 3       | Parte I: preparación, cartas, resoluciones y punto de control              | Hecha     |
| 4       | Parte II: Lugares Restringido, Los elegidos de la fortuna, Plan al garete  | Pendiente |
| 5       | Narración de introducciones, punto de control y resoluciones               | Parte I   |

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

Campaña independiente `fortune-and-folly` con dos escenarios; la parte I
(`fortune-and-folly-part-1`) se puede jugar y la parte II aún no tiene preparación.

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
referencia) y los graba con «Juanjo Relatos» (`DdKbXdRlBmj7Ty7N0FVr`, comprobada por nombre).
Parte I: Introducciones 1, 3, 4 y 5, Resoluciones 1 y 2 y El plan 1. Las instrucciones de
juego no se narran. Evidencia: `evidencias/fortuna-narracion.json`. Los textos de i18n son
resúmenes propios, como en las demás campañas.
