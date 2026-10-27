# 89 · Wendy Adams, Padre Mateo, Marie Lambeau y André Patel

27/10/2026. Petición: añadir a Padre Mateo, Wendy Adams, Marie Lambeau y André Patel, con
sus mazos completos y sin simplificar reglas. Procedimiento general en la
[guía 59](59-guia-importar-lista-arkhamdb.md); no parte de una lista de ArkhamDB. Textos
contrastados con ArkhamDB (EN/ES), la implementación de la aplicación de referencia y las
FAQ (`reglas/FAQ v2.5A.pdf`).

## Recuento

Cuatro lotes: **24 códigos / 24 cartas distintas nuevas / 0 reediciones**.

| Lote            | Códigos                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `wendy-adams`   | 01005 Wendy Adams, 01014 Amuleto de Wendy, 01015 Sola y abandonada                               |
| `father-mateo`  | 04004 Padre Mateo, 04013 El códice de las eras, 04014 Serpientes de Yig                          |
| `marie-lambeau` | 05006 Marie Lambeau, 05018 Canción desconcertante, 05019 Barón Samedi                            |
| `andre-patel`   | 60351 André Patel, 60352–60354 Conocer la salida/el texto/la escena, 60355 El peso del mundo, 60356 Desprevenido y las cartas de su mazo de inicio que faltaban: 60357 El centro de atención, 60358 Fama, 60359 El mentidero, 60360 Anillo extravagante, 60362 Marcus Sengstacke, 60363 Bastón bruñido, 60365 Ganárselo a pulso, 60368 Delante de sus narices y 60371 «¡Mira esto!» |

Solo las versiones originales y sus exclusivas primarias. Quedan fuera las alternativas del
inventario: 01505 (caja revisada), 90037–90040 y 90081–90083 (paralelos), 99001 (promo de
Marie) y las versiones avanzadas. 60451 es otra Marie Lambeau (mazo de inicio de 2025, con
otras exclusivas), distinta de la original.

## Mazos

- **André Patel:** su mazo de inicio oficial: dos copias de cada carta de nivel 0 de su caja
  (60357–60371), sus cuatro exclusivas y su debilidad básica, Desprevenido. Las mejoras de la
  caja (60372–60384) no forman parte del mazo; Ganzúas (1) ya estaba implementada.
- **Wendy, Mateo y Marie** no tienen mazo oficial (ni en sus cajas ni en los reglamentos del
  proyecto). Sus mazos iniciales usan cartas jugables de sus clases:
  - Wendy: Superviviente de la caja básica original, muchos eventos para el Amuleto, dos
    cartas Rebelde de nivel 0 y habilidades neutrales; debilidad Overzealous (12100).
  - Mateo: Hechizos y amuletos Místico (Lucky Charm es Bendecido) y cartas neutrales;
    debilidad Paranoia (12101).
  - Marie: Hechizos (Moonlight Ritual retira su perdición), apoyo Místico, dos Lucky! de
    Superviviente y habilidades neutrales; debilidad Amnesia (12097).

## Reglas

- **Wendy Adams.** [reacción] Cuando revela una ficha del caos, en una prueba o por otra
  capacidad (efectos de escenario, Premonición), elige y descarta 1 carta de su mano (coste):
  la ficha se cancela, vuelve a la bolsa y se revela otra. Una vez por prueba o capacidad.
  Signo arcano: +0; con el Amuleto en juego, éxito automático.
- **Amuleto de Wendy.** Puede jugar el Evento superior de su pila de descartes como si
  estuviera en su mano (acción, rápido o reacción). Obligado (con la errata de la FAQ): los
  eventos que juegue o descarte del juego van al fondo de su mazo.
- **Sola y abandonada.** 2 horror directo y retira de la partida su pila de descartes.
- **Padre Mateo.** [reacción] (errata de la FAQ) Cuando cualquier investigador revela
  [auto_fail], en una prueba o fuera de ella, la cancela y se considera [elder_sign]; en una
  prueba se resuelve el signo arcano de quien la realiza. Una vez por partida. Signo arcano:
  éxito automático y, al terminar la prueba, roba 1 y gana 1 recurso o, si es su turno, una
  acción adicional. Construcción: Místico y neutrales 0–5 y Bendecido de cualquier clase 0–3.
  5 de experiencia adicional al crear la campaña (la FAQ indica que no se repite al
  transferirlo a otra campaña; la aplicación no transfiere investigadores).
- **El códice de las eras.** Sello ([elder_sign]) al entrar en juego; +1 [willpower] mientras
  tenga una ficha sellada. Cuando Mateo fuese a revelar una ficha de la bolsa, también fuera de
  pruebas, puede descartarlo y resolver el signo arcano sellado en su lugar.
- **Serpientes de Yig.** Debilidad enemiga (2/3/2, 1/1, Cazador, Presa: solo el Padre Mateo).
  Sella sobre sí el signo arcano hasta que deja el juego.
- **Marie Lambeau.** Con 1 o más perdiciones entre las cartas que controla, una acción
  adicional en su turno solo para jugar Hechizos o activar capacidades [action] de Hechizos;
  se gasta antes que las estándar y, al perder acciones, se pierde después de ellas (FAQ).
  Signo arcano: +1 y puede añadir o retirar 1 perdición de una carta que controle.
- **Canción desconcertante.** Cuando un plan fuese a avanzar por su umbral de perdición
  (también con dos mazos de plan), hasta el final de la fase ningún plan avanza así. Se
  retira de la partida.
- **Barón Samedi.** Entra en juego bajo su control y no puede abandonarlo con menos de 3
  perdiciones. Cuando se coloca daño sobre un investigador de su Lugar, se coloca 1 más en la
  misma colocación (antes de comprobar la derrota). [fast] Agotarlo: 1 perdición; con 3 o
  más, se descarta.
- **André Patel.** [reacción] Tras superar una prueba por 2 o más en su turno, una acción
  adicional (una vez por ronda). Signo arcano: +2 y 1 recurso.
- **Conocer la salida / el texto / la escena.** [wild] [wild] en ataques y evasiones; en
  pruebas sobre una carta de Escenario (las que inician capacidades o efectos del escenario,
  Lugares, planes, actos, cartas de historia y de encuentro, pero no las debilidades de
  jugador); o en investigaciones (también las capacidades «Investigar» de escenario) y
  negociaciones.
- **El peso del mundo.** En su zona de amenaza; al fracasar en una prueba, 1 horror y vuelve
  a su mazo. **Desprevenido:** la primera vez que fracasa en una prueba en su turno, roba la
  primera carta de Encuentros; si es un Enemigo (también tras rebarajar), se descarta.
- **El centro de atención:** límite 1 por investigador; +1 por cada acción gastada en la
  ronda (incluidas las adicionales y la actual, contando el coste real). **Fama** y **El
  mentidero:** negociaciones; El mentidero mueve por el camino más corto en el sentido del
  movimiento. **Anillo extravagante:** ventana «cuando fueses a tener éxito» (paso 6).
  **Marcus Sengstacke:** +1 recurso en mantenimiento y 1 horror al fracasar. **Bastón
  bruñido:** suma el valor actual de Agilidad y puede evitar automáticamente a un no Élite.
  **Ganárselo a pulso:** X es la salud restante del objetivo; Indiferente hasta el final de
  la ronda. **Delante de sus narices:** solo tras evitar con éxito en una prueba (evitar
  automáticamente no cuenta, FAQ 2.9). **«¡Mira esto!»:** cada copia paga y cobra lo suyo.

### Diferencias con el texto impreso en español

Se aplica el texto vigente (ArkhamDB y erratas de la FAQ): el Amuleto de Wendy incluye
«o descartes un Evento del juego» y la reacción del Padre Mateo es «Cuando…».

## Motor

- Revelar fichas: ventana «cuando se revela» (`whenRevealChaosToken`) con la ficha retenida
  (`SkillTest.revealing` o `tokenReveal`), `CancelRevealedToken` (con nueva revelación) y
  `TreatRevealedTokenAs` (`treatedAs`: vuelve a la bolsa la ficha física). Revelaciones fuera
  de pruebas (`RevealTokenOutsideTest`) para Premonición y los efectos de escenario que antes
  miraban la bolsa directamente (Excelsior: Vagabundo dimensional, Sectario del enclave,
  Pasillo; El Último Rey: Comedor), con Premonición, el Códice y las mismas reacciones.
- Éxito automático (`autoSucceed`): la dificultad cuenta como 0.
- Fichas selladas sobre cartas (`holder`), devueltas a la bolsa al salir la carta del juego.
- Acciones: `GainActions`, acción adicional por rasgo (`traitAction`), acciones gastadas en
  la ronda (`spentActions`) y pérdida de acciones primero estándar (`LoseAdditionalAction`).
- Pruebas sobre cartas de Escenario: los comportamientos registrados de cartas de escenario
  etiquetan `scenario` las pruebas que inician (`onScenarioCard`).
- `playsTopDiscardEvent`, `eventsToDeckBottom`, `RemoveDiscardFromGame`, `RemoveFromDiscard`,
  `HoldAgenda` con `agendaWouldAdvance`, `cannotLeavePlay`, `additionalDamagePlaced`,
  debilidades de apoyo con revelación, `DrawEncounterCard.ifEnemy`, ventana
  `whenWouldSucceed`, negociar (`afterParley` para toda capacidad o evento de negociar y
  costes de negociar en eventos), `xOptions`, `DisengageEnemy`, `EnemyGainsKeyword`,
  `upkeepResources` de apoyos, `CommitPayment`, `limitTitleReached` al jugar y
  `skillValueFor` (valor actual de una habilidad; también en Ganzúas).
- Construcción: `DeckOption.traits`, `offClassLevelZeroClasses`, `bonusExperience`.

## Presentación y recursos

Textos EN/ES en `offlineCard` y etiquetas nuevas. El catálogo en línea consulta los paquetes
de investigador habilitados (`core`, `dwl`, `ptc`, `tfa`, `tcu` y `and`) filtrados a sus
códigos (`INVESTIGATOR_PACKS`, caché `v7`). Escaneos oficiales EN/ES, miniaturas y retratos;
procedencia en `evidencias/investigadores-89-recursos-oficiales.json` e
`imagenes-locales.json`. André no tiene escaneo del reverso (ArkhamDB y referencia): se
muestra su `backSummary`. El Barón Samedi se dibuja sin coste.

## Validación

- Pruebas por carta e integración en los cuatro lotes, más las nuevas reglas del motor
  (revelación fuera de pruebas con Premonición, Códice, Wendy y Mateo; dos planes; daño
  simultáneo; pérdida de acciones; pruebas sobre cartas de Escenario frente a debilidades).
- Ajustes en pruebas existentes: auditoría de cierre de Brethren of Ash acotada (las 30
  combinaciones de la caja básica y cada otro investigador solo y con tres de ella), prueba
  de presentación con debilidades de apoyo sin coste y contrato de Premonición (revela y
  después sella).
- Revisión visual: miniaturas EN/ES, retratos en la pantalla de nueva partida y mazo de
  Marie válido en el editor.
