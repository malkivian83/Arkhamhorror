# 87 · Fortuna e insensatez

Historia secundaria (y escenario independiente) en dos partes: la vigilancia del casino
_Défis de la Roulette_ (parte I) y el golpe (parte II), con un punto de control entre
ambas. Guía ES: [`reglas/AHC71_Fortuna_e_insensatez_ES.pdf`](reglas/AHC71_Fortuna_e_insensatez_ES.pdf)
(32 páginas). Narración: voz de ElevenLabs «Juanjo Relatos» (`DdKbXdRlBmj7Ty7N0FVr`).

## Estado actual

| Entrega | Contenido                                                                 | Estado    |
| ------- | ------------------------------------------------------------------------- | --------- |
| 1       | Catálogo EN/ES (89 cartas, 88001–88053), iconos de juego, imágenes y guía | Hecha     |
| 2       | Mecánicas: nivel de alarma, Errante, iconos de juego, cambiar cartas, roles | Pendiente |
| 3       | Parte I: preparación, cartas, resoluciones y punto de control              | Pendiente |
| 4       | Parte II: Lugares Restringido, Los elegidos de la fortuna, Plan al garete  | Pendiente |
| 5       | Narración de introducciones, punto de control y resoluciones               | Pendiente |

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
