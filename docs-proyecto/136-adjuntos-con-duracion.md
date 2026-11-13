# 136 · Adjuntos y modificadores con duración

Lote `lasting-attachments`: 24 códigos, 23 cartas o niveles distintos nuevos y 1 reedición
(Barricada `01538`, Núcleo revisado), sobre `2538961c`. Capacidades `ENEMY_MODS` y `LOC_ATTACH`
del [inventario 132](132-inventario-bloqueos-motor.md), diseñadas juntas como «carta adjunta con
duración». Fuentes EN/ES de ArkhamDB y SHA-256 en
`packages/cards/src/lasting-attachments/approvals.json`; conversión con `approvedDefinition`
(`scripts/prepare-lasting-attachments.mjs`), sin adaptadores nuevos.

| Código | Carta                 | Nivel | Tipo   | Capacidad    |
| ------ | --------------------- | ----- | ------ | ------------ |
| 03108  | Diagramas anatómicos  | 0     | Evento | `ENEMY_MODS` |
| 02228  | Exponer la debilidad  | 1     | Evento | `ENEMY_MODS` |
| 04195  | Exponer la debilidad  | 3     | Evento | `ENEMY_MODS` |
| 05157  | Ajar                  | 0     | Apoyo  | `ENEMY_MODS` |
| 05321  | Ajar                  | 4     | Apoyo  | `ENEMY_MODS` |
| 10022  | Ofuda                 | 0     | Apoyo  | `ENEMY_MODS` |
| 09025  | Boleadora             | 0     | Evento | `ENEMY_MODS` |
| 08082  | Repeler               | 3     | Evento | `ENEMY_MODS` |
| 09027  | Herida severa         | 0     | Evento | `ENEMY_MODS` |
| 11026  | Marca del cazador     | 1     | Evento | `ENEMY_MODS` |
| 04265  | Esposas               | 0     | Apoyo  | `ENEMY_MODS` |
| 09035  | Esposas               | 2     | Apoyo  | `ENEMY_MODS` |
| 01038  | Barricada             | 0     | Evento | `LOC_ATTACH` |
| 01538  | Barricada (reedición) | 0     | Evento | `LOC_ATTACH` |
| 03148  | Emboscada             | 1     | Evento | `LOC_ATTACH` |
| 03199  | Trampa de lazo        | 2     | Evento | `LOC_ATTACH` |
| 07157  | Bajo vigilancia       | 1     | Evento | `LOC_ATTACH` |
| 03038  | Escondite             | 0     | Evento | `LOC_ATTACH` |
| 02156  | Cebo                  | 1     | Evento | `LOC_ATTACH` |
| 05323  | Cebo                  | 2     | Evento | `LOC_ATTACH` |
| 09048  | Cartografiar la zona  | 0     | Evento | `LOC_ATTACH` |
| 09026  | Echar la puerta abajo | 0     | Evento | `LOC_ATTACH` |
| 04306  | Buena perspectiva     | 0     | Evento | `LOC_ATTACH` |
| 05158  | Sexto sentido         | 0     | Apoyo  | `LOC_ATTACH` |

## Capacidad nueva del motor (aditiva)

- `Enemy.modifiers` (`EnemyModifier`) y `AddEnemyModifier`: combate, evitar, salud, «considera el
  combate como X» y pérdida de palabras clave con duración `round`, `phase`, `turn` (turno del
  investigador activo) o `nextAttack` (el siguiente ataque contra él en esta fase; lo consume el
  fin de ese ataque). `minimum` limita solo la reducción («hasta un mínimo de 1»). Caducan de forma
  perezosa (`enemyModifierActive`) y se suman a `attachedStat`, `enemyMaxHealth` y
  `enemyHasKeyword`.
- Cartas de jugador vinculadas a Enemigos (`AttachPlayerCardToEnemy`, ampliado): desde la pila de
  descartes, desde la zona de juego (`fromAsset`, Esposas) o moviendo un adjunto de Lugar
  (`fromLocationAttachment`, Trampa de lazo). Comportamientos nuevos de la carta vinculada:
  `attachedDiscardInsteadOfReady`, `attachedEnemyNoDoom`, `attachedFightSkillBonus` y
  `attachedNonEliteOnly`; se reutilizan `attachedEnemy` y `attachedEnemyCannotReady`.
- Adjuntos de Lugar (`locationAttachments`, lote 128): recursos como indicios
  (`AttachEventToLocation.resources`), velo (`locationAttachmentShroud`), dificultad de las pruebas
  en el Lugar (`locationAttachmentTestDifficulty`), palabras clave de los Enemigos que no sean
  Élite allí (`locationAttachmentEnemyKeywords`, también al aparecer enfrentado), Lugar vetado a
  los Enemigos que no sean Élite (`locationAttachmentBarsEnemies`, en `enemyNeighbours`,
  `MoveEnemy` y al acompañar a un investigador) y Cebo (`locationAttachmentLure`, movimiento de
  Cazador y Errante en la fase de Enemigos).
- `ModifySkillTest.investigateLocation` y `difficultyDelta` (Sexto sentido, Ajar). Ayudantes
  exportados: `attachmentsAt`, `enemyBarredFrom`, `activeEnemyModifiers`, `enemyModifierActive`.

## Reglas

- Ajar y Sexto sentido se aplican al revelarse el símbolo (`onTokenRevealed`), así que cambian la
  dificultad de la propia prueba; Sexto sentido no enfrenta a los Enemigos del Lugar elegido (FAQ).
- Exponer la debilidad usa el combate actual del Enemigo; el siguiente ataque contra él, tenga
  éxito o no, consume el efecto. El nivel 1 no hace nada si se supera por 0. El nivel 3 roba una
  carta aunque falle su prueba de intelecto.
- Barricada no impide aparecer (FAQ de 2017); el Enemigo enfrentado que acompañaría al
  investigador se desenfrenta y se queda. Se descarta cuando un investigador sale del Lugar.
- Trampa de lazo actúa después del enfrentamiento automático (FAQ): agota, desenfrenta y se vincula;
  cuando el Enemigo fuera a prepararse (mantenimiento o efecto) se descarta en su lugar.
- Esposas: el apoyo deja la zona de juego y vuelve a la pila de descartes con el Enemigo; sus
  efectos solo con Enemigos que no sean Élite. Colocar perdición se impide; voltear pistas no (FAQ).
- Herida severa se ofrece al terminar un ataque con éxito iniciado con un apoyo [[Melee]] (FAQ de
  2023: Picahielos no cuenta). Marca del cazador reacciona al daño infligido por un investigador
  (ventana `beforeEnemyDamage`).
- Ofuda: solo la primera [bless] revelada en tu Lugar en cada ronda repone la carga (se anota en el
  registro aunque la carga ya esté).
- Emboscada se descarta en cuanto no queda ningún investigador en su Lugar.
- Escondite puede ir a cualquier Lugar en juego; Cebo (2) a tu Lugar o a uno conectado.
- Las palabras clave ganadas o perdidas (Escondite, Ofuda, reglas de escenario) se consultan con
  `enemyHasKeyword`, también al aparecer desde un encuentro: un Enemigo que gana Distante no se
  enfrenta al aparecer (revisión en [143](143-revision-reglas-lotes-129-136.md)).
- Buena perspectiva: -1 al velo hasta el final del turno del investigador activo; mover la pista es
  opcional.

FAQ de ArkhamDB consultadas para los 23 códigos originales; aclaraciones en Barricada, Trampa de
lazo, Esposas, Herida severa, Exponer la debilidad (3) y Sexto sentido.

## Bloqueadas (38 de los 62 códigos de ambas capacidades)

- Texto en blanco con duración: Borrado mental ×3 (`01068`, `01568`, `50008`; suprimir el
  comportamiento del Enemigo en sus 27 consultas del motor) y Teoría órfica (`09051`, traición).
- Ventana «cuando fuera a prepararse» con prueba: Atar monstruo (`02031`).
- Massive como palabra clave ganada: Transmogrificar (`10050`); el motor lee `massive` impreso en
  ocho puntos.
- Evitar sin agotar y «no puede enfrentarte»: Sigilo ×2 (`03028`, `52005`), Forma etérea ×2,
  Capucha de Sekhmet (además `DECK_TRAIT`).
- Conexiones o movimiento para investigadores: Abrir portal (Miríada), Atajo (habilidad del
  Lugar para cualquier investigador), Sobre la pista ×2, Telescopio de bolsillo,
  Gené Beauregard, Prophesiae Profana, Doppelgänger, Carrera de pruebas, Horca y Hacha (apoyos que
  se vinculan y se recuperan), La llave esqueleto.
- Sexto sentido (4) (`05322`): investigar «además de» en tu Lugar, a dos conexiones.
- Barricada (3) (`50004`): redirigir la aparición a un Lugar conectado.
- Ojos de Valusia (`BONDED`), Archivo de conductos ×5 (líneas ley en Enemigos, Lugares e
  investigadores; `CAMPAIGN`), Flauta de los Dioses Exteriores (`SEAL_EXT`), Sucesión de
  maldiciones (`PARLEY`), Vórtice dimensional (`DECK_TRAIT`), Trampa improvisada (`CUSTOMIZABLE`),
  Santuario de las Moiras (`ENC_DRAW`), Técnica de supervivencia (`TEST_SOURCE`) y Eco espiritual
  (`PLAY_OTHER`).

## Presentación

Los adjuntos se ven en la mesa con los componentes existentes: cartas vinculadas a Enemigos
(`treacheriesOn`) y eventos vinculados a Lugares (`eventsAt`). Los modificadores temporales no
tienen indicador propio; se reflejan en la dificultad de la prueba. Textos EN/ES nuevos para
Ofuda, Marca del cazador, Sexto sentido, Cartografiar la zona, Buena perspectiva y «Vincular a».

## Verificación

49 casos de reglas (`lasting-attachments/rules.test.ts`), 2 del motor
(`lasting-attachments.test.ts`) y 24 de compra/inicio/presentación
(`apps/web/src/game/lasting-attachments.test.ts`). Ver el resumen de continuación para la suite,
tipos, lint e imágenes. Sin navegador ni build.

Recuentos: 24 códigos incorporados; 23 cartas o niveles distintos nuevos; 1 reedición. Acumulado:
1420 jugables; 697 históricos pendientes, incluidos 322 estándar con impresión.
