# 96 · Cartas con mecánicas reutilizadas

Lote `reused-mechanics`: cartas estándar pendientes cuyo comportamiento se apoya en
mecánicas ya disponibles en el motor (parlamento, ventanas de éxito y fallo, ataques
y evasiones con objetivo, búsquedas, acciones adicionales). Se partió de 51
candidatas; 15 quedan bloqueadas por falta de ventanas o efectos de duración en el
motor y no se activan.

## Recuento

- 36 códigos incorporados, sin repeticiones con lotes anteriores ni con el catálogo.
- 33 cartas o niveles distintos nuevos y 3 de texto idéntico a otra jugable, que
  reutilizan su registro: "Watch this!" `03233` y `11061` (= `60371`) y Dumb Luck
  `04034` (= `60514`).
- 0 reediciones del inventario. Inventario congelado intacto.

| Grupo         | Códigos                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| Pícaro        | 03233, 11061, 05187, 07305, 09074, 03030, 60322, 09069                     |
| Guardián      | 08030, 09034, 09036, 06196, 01027, 60158, 60157, 08020, 03106              |
| Superviviente | 60574, 04034, 05160, 01083, 60559, 60571, 60564                            |
| Arcano        | 08039, 07158, 03270, 60265, 09046, 03027, 03150, 03265                     |
| Apoyo         | 10071, 10078, 09028, 02151                                                 |

## Reglas y decisiones

- Textos idénticos: `andre-patel/card-60371.ts` exporta `registerWatchThis` y
  `stella-clark/dumb-luck.ts` exporta `registerDumbLuck`; las cartas originales
  conservan su comportamiento y pruebas.
- .45 Thompson (3): el daño adicional a otro enemigo exige superar por su valor de
  combate y gastar otra munición. .25 Automatic (2): el ataque tras evitar espera al
  final de la prueba en curso para no anidar pruebas.
- Daring Maneuver (0/2): ventana «cuando vayas a tener éxito» de la prueba propia.
  Quick Getaway: si la evasión tiene éxito, el enemigo queda evitado y el ataque se
  cancela.
- Butterfly Swords (5): el segundo ataque no agota la carta; si ambos tienen éxito,
  agotarla da +1 daño al segundo. Safeguard (2) tiene texto distinto de `60110`: se
  agota una vez y sigue al investigador el resto de su turno (marca de turno en el
  apoyo). Heroic Rescue resuelve ese mismo ataque contra ti, inflige 1 daño y cancela
  el original; excluye Élite y ataques no cancelables.
- Close Call (2) baraja al enemigo en el mazo de encuentros; no admite debilidades ni
  Élite. Guerrilla Tactics ataca o evita enemigos de un Lugar conectado como si
  estuvieras enfrentado.
- Unearth the Ancients (2): dificultad igual a los costes impresos de hasta dos
  apoyos de Buscador; las Reliquias roban carta. In the Know investiga cualquier Lugar
  revelado con su velo y costes, sin moverse.
- «I'm outta here!»: solo si una carta de escenario en juego tiene una habilidad que
  produce `Resign`.

## Bloqueadas (fuera del lote)

| Carta                              | Falta en el motor                                                      |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Obfuscation `07027`                | Marcar los ataques de oportunidad en `EnemyAttack`/`whenEnemyAttacks`. |
| Riot Whistle `07108`               | Acción adicional permanente limitada a enfrentarse.                    |
| Armor of Ardennes `03305`          | Ventana al asignar daño a un apoyo, antes de colocarlo.                |
| On the Beat `60173`                | Bonificación condicional hasta el final del turno.                     |
| Will to Survive (3) `01085`        | Pruebas sin fichas durante todo el turno.                              |
| Trial by Fire (0/3) `05281`, `54010` | Fijar valores base de habilidad hasta el final del turno.            |
| Infighting `03314`                 | Cancelar ataques no Élite durante una fase.                            |
| Perseverance `04111`               | Ventana de daño/horror que te derrotaría, para cualquier fuente.       |
| Ward of Protection (5) `02307`     | Ventana al robar cualquier carta de encuentro y cancelarla.            |
| Private Practice `60257`           | Disparador tras curar horror.                                          |
| "I've had worse…" `02261`, `05315` | `whenDealtDamage` para fuentes que no sean enemigos.                   |
| Bank Job `10069`                   | Coste adicional de acciones al jugar una carta.                        |
| Scout Ahead `08047`                | Movimiento sin enfrentamientos hasta terminar.                         |

## Presentación y fuentes

Textos oficiales EN/ES de las API de ArkhamDB del 30/10/2026 en `source-en.json` y
`source-es.json`; `scripts/present-reused-mechanics.mjs` los reproduce de forma
idempotente. Escaneos y miniaturas EN/ES con el importador común; procedencias en
`evidencias/reused-mechanics-recursos-oficiales.json`. La hoja de contacto española
de las 51 candidatas era correcta. Revisión de la aplicación reservada al usuario,
sin navegador.

## Validación

- Registro real (`inspectRuntime`): 830 → 866 jugables; estándar pendientes 840 → 804.
  Ningún código del lote queda pendiente.
- Pruebas del lote: 65 en cinco archivos; módulos refactorizados de André (44) y
  Stella (36) correctos.
- Suite general: 5715 correctas y 20 omitidas. Un fallo en la auditoría de ataques
  remotos de Carnevale: Guerrilla Tactics leía el Lugar de un enemigo global y Service
  Revolver exigía que el atacante siguiera en tu Lugar, condición que la carta no
  impone. Corregidos; 67 pruebas afectadas correctas.
- Tipos de cards, formato, lint y compilación de la web correctos.
- Los controles se reutilizan mientras no cambien reglas, datos, presentación o
  dependencias del alcance.
