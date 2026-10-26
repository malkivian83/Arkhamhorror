# 87 · Fortuna e insensatez

Historia secundaria (y escenario independiente) en dos partes: la vigilancia del casino
_Défis de la Roulette_ (parte I) y el golpe (parte II), con un punto de control entre
ambas. Guía ES: [`reglas/AHC71_Fortuna_e_insensatez_ES.pdf`](reglas/AHC71_Fortuna_e_insensatez_ES.pdf)
(32 páginas). Narración: voz de ElevenLabs «Salva».

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

Reglas revisadas con el código de referencia:

- El ladrón reacciona justo antes de resolver el Errante del enemigo elegido. Su cara
  Experimentado incluye el propio Lugar; la inversión termina al cambiar de fase.
- La retirada de pistas del Manantial tras un juego es una reacción opcional.
- Abarran conserva sus valores impresos «–»: no se le puede atacar, dañar ni evitar;
  los datos de presentación no muestran valores numéricos inventados.
- Obtener el uniforme es una acción Luchar real, sin ataques de oportunidad, con prueba
  de Combate (3) y sin daño al tener éxito. Respeta Indiferente y permite los efectos
  que se refieren a una prueba Luchar.
- La introducción 4 permite omitir la vigilancia y pasar a la parte II sin resolver
  las penalizaciones ni los efectos de fin de una partida que no se ha jugado.
- El punto de control cuenta también las pistas que conservan los investigadores no
  eliminados. Practicar un Rol cambia su carta en juego y su registro. No se pueden
  comprar ni mejorar cartas entre las dos partes.

Alcance: la aplicación ofrece el modo independiente en dos partes; no integra esta
historia secundaria dentro de una campaña de Las llaves escarlata.

Pruebas: `fortune-and-folly/mechanics.test.ts` y `part-one.test.ts` (preparación, premios de
cada juego, cambiar cartas, El estafador, Crupier, alarma y Guardias, Indiferente con alarma
6, Errante y El ladrón, tareas, traiciones, resoluciones y punto de control).

## Narración

`scripts/generate-fortune-audio.mjs` lee los textos oficiales en español
(`apps/web/public/local-assets/story/es.json`, de la guía; el inglés, del proyecto de
referencia) y los graba con Salva (`hyKxCTlAqtnW188CgltM`, voz compartida de la biblioteca pública,
comprobada por nombre). Sustituye a las grabaciones con Juanjo Relatos y con Carmelo; los
ficheros llevan el sufijo `-salva` para que no se sirvan versiones antiguas en caché.
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

Reglas revisadas de la parte II:

- La salida sustituye la Presa de los Casino por el portador del Manantial. Como Presa
  ordinaria, desempata entre investigadores a igual distancia; no convierte la
  instrucción en «Presa, solo». También desempata el enfrentamiento en un mismo Lugar.
- El jefe elige el orden del movimiento de los Cazadores y Errantes. Cada enemigo
  resuelve su ventana, movimiento y enfrentamientos antes del siguiente.
- El Duplicado conserva fuera del mazo y de los descartes la carta original de su
  dueño, muestra el reverso de jugador y tiene un comportamiento independiente del
  Duplicador. Al descartarse o ser derrotado devuelve esa carta al descarte correcto;
  se descarta al desenfrentarse, también mediante efectos distintos de evitar.
- El Carro reacciona antes del enfrentamiento o al entrar el enemigo, no después.
  Su protección afecta al investigador que lo utiliza y a los enemigos presentes
  al resolverla; no concede Indiferente a todo el Lugar. Se recalculan los candidatos
  a enfrentamiento después de las reacciones.
- Los pagos de pistas restringidos al Lugar solo pueden hacerlos los investigadores
  presentes en él, mediante el selector de pagos de grupo.
- El Vagabundo conserva el historial de acciones consecutivas durante la fase,
  incluso entre turnos, con su límite de una vez por turno.
- Implicación personal conserva y muestra su horror sobre la carta de Historia.
- La recompensa de Isamara con cinco tareas no exige que su versión Banda siga en juego.

La aplicación sigue ofreciendo esta historia como independiente. Las recompensas que
solo se usarían en una campaña posterior se anotan en el registro. La referencia
excluye expresamente el cambio de ficha de Los elegidos de la fortuna en independiente
(`handleFortunesChosen = unlessM getIsStandalone`); no falta esa penalización en este modo.
La introducción inglesa de la parte II es una traducción propia de la guía española.

Narración de la parte II: introducción, Resoluciones 1–3, Reliquia conseguida (las dos
versiones) y las cuatro caras de Desaprobación de la fortuna.

Las caras sin revelar de los Lugares de una cara (88010b–88013b, 88017b, 88018b y 88020b) se
importaron después del CDN del proyecto de referencia.

## Revisión del 26/10/2026

- El índice español de la copia de referencia no anuncia imágenes `880xx` y las 106
  rutas españolas de los anversos y reversos importados devuelven HTTP 404 en el CDN.
  Se mantiene el escaneo inglés y el texto español. Comprobación por carta en
  [`evidencias/fortuna-imagenes-es-revision.json`](evidencias/fortuna-imagenes-es-revision.json).
- La referencia web requiere iniciar sesión; la comprobación del catálogo se hizo
  con sus datos locales y las rutas de su CDN, sin modificar ninguna cuenta.
- Verificación visual local: selección de Fortuna, introducciones, mano inicial,
  dos Roles en solitario, preparación, alarma 1, primer turno, detalle de La vigilancia
  y conservación de la partida al recargar.
- Corregidos el separador `<hr>` que se mostraba como texto y los nombres ingleses de
  las Historias en el diario. El separador solo admite la etiqueta sin atributos;
  las etiquetas desconocidas siguen escapadas.
- 262 pruebas dirigidas correctas en 14 archivos: mecánicas y ambas partes de Fortuna,
  catálogo, imágenes, formato seguro del texto y el lote de jugador en preparación.
  La comprobación visual inicial no certificaba fidelidad de reglas; las correcciones posteriores se detallan arriba.
- Tras las correcciones de reglas: batería completa con 4.147 pruebas correctas y
  19 omitidas, incluida la regresión de los escenarios existentes; formato, lint,
  tipos y construcción correctos. El lint excluyó la carpeta temporal
  `.card-import-tmp`, ajena al código del proyecto.
- La comprobación visual posterior confirmó que omitir la vigilancia muestra
  «Escenario omitido», conserva al investigador sin trauma, impide modificar los
  mazos en el punto de control y permite entrar en la parte II. Tras corregir esa
  etiqueta se repitieron las 124 pruebas afectadas, todas correctas.
  Formato, lint y tipos volvieron a pasar; la web se construyó en
  `apps/web/dist-fidelity-check` por un bloqueo de archivos de salida en Windows.

## Fuentes de la revisión de reglas

Copia local de referencia: `D:/referencia/ArkhamHorror-main/backend/arkham-api/library/Arkham/`.
Se contrastaron `Act/Cards/FortuneAndFolly/TheExit.hs`,
`Asset/Assets/TheThiefUnpracticed.hs`, `TheThiefPracticed.hs` y `CashCart.hs`,
`Enemy/Cards/FortuneAndFolly/DimensionalDuplicatorA.hs`,
`DimensionalShamblerHunterFromBeyond.hs` y `AbarranArrigorriagakoaTheManWithTheRubyRing.hs`,
`Enemy/Cards/ExtradimensionalEnemy.hs`, las Historias `IfTheUniformFits.hs` y
`PersonalEntaglement.hs` y la preparación/punto de control de
`Scenario/Scenarios/FortuneAndFolly.hs`. Las regresiones nuevas viven en
`fortune-and-folly/fidelity.test.ts`, además de las pruebas de las dos partes y de presentación.
