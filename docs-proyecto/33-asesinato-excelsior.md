# Asesinato en el hotel Excelsior (escenario independiente)

**Estado a 21/10/2026:** escenario implementado y jugable de principio a fin en
el motor, con 42 pruebas propias (preparación, actos, planes, interludio, las
diez versiones de El verdadero culpable, mecánicas sueltas y resoluciones). Las
partidas grabadas de La Gala siguen ganándose con el motor ampliado. Pendientes:
importar las imágenes de las cartas 84001–84052 y la portada, y la aceptación
visual en la mesa (escritorio y móvil).

Escenario independiente de 2019 (pack `hotel` en ArkhamDB, cartas 84001–84052),
con seis conjuntos de encuentros. Referencias: el reglamento escaneado
`docs-proyecto/reglas/AHLCG_Asesinato_en_el_hotel_excelsior.pdf` y la
implementación de `halogenandtoast/ArkhamHorror`
(`Scenario/Scenarios/MurderAtTheExcelsiorHotel.hs` y sus cartas).

Código en `packages/cards/src/excelsior/`:

| Fichero          | Contenido                                                                              |
| ---------------- | -------------------------------------------------------------------------------------- |
| `cards.ts`       | Códigos, Lugares (símbolos y posiciones), enemigos, traiciones y cartas de jugador     |
| `excelsior.ts`   | Preparación, bolsas, tarjeta de referencia, Vestíbulo, Habitación 212, Despacho, resoluciones |
| `plot.ts`        | Planes 1–2, actos 1–2, interludio La verdad y El verdadero culpable (v. I a X)        |
| `locations.ts`   | Capacidades de los diez Lugares                                                        |
| `encounter.ts`   | Los diez enemigos y las nueve traiciones de encuentro                                  |
| `assets.ts`      | Daga manchada de sangre, Sargento Monroe, ¿Qué has hecho? y los cinco Indicios          |
| `helpers.ts`     | Consultas comunes (rasgos, zona de victoria, distancias) y registro de mensajes propios |
| `definition.ts`  | Registro como escenario independiente (aparece en "Nueva campaña")                     |

## Cómo se juega en la plataforma

1. Introducción (1, 2 o 3 según los investigadores, y 4) y preparación: el jefe
   empieza en la Habitación 225 con la Daga; los demás, en el Vestíbulo.
2. Acto 1: gastar 1 pista por investigador para robar Indicios; con dos en
   juego avanza (entra el resto del hotel y las 6 cartas de esos Indicios).
3. Plan 1 → 2: el Sargento Monroe espera en el Vestíbulo, aparecen Agentes de
   Arkham, el jefe roba ¿Qué has hecho? y cada cosa sin encubrir en la
   Habitación 225 da una pista allí y una perdición a un Agente.
4. Acto 2: mover pistas a los Indicios con los Lugares; al final de la ronda se
   puede avanzar si cada Indicio tiene 1 pista por investigador.
5. La verdad: contar la verdad o mentir; la policía te cree o no según lo
   encubierto, las pistas y los Inocentes en la zona de victoria.
6. El verdadero culpable (según los dos Indicios robados) es a la vez plan y
   acto: su objetivo da R1; su umbral de perdición, R2. El plan 2 lleva a R3.
7. R2 y R3 permiten **volver a jugar** la primera vez: la campaña se queda en el
   mismo escenario, sin experiencia y conservando solo el trauma.

Con 1 investigador el plan 1 tiene umbral 4. Como escenario independiente solo
hay dos bolsas: Fácil y Normal usan la Normal; Difícil y Experto, la Difícil.

## Motor: lo nuevo (genérico)

- Pistas sobre apoyos, enemigos y traiciones; `MoveClues` entre cualquier carta
  y la reserva. Horror sobre traiciones (Cerebro extraído).
- Traiciones **vinculadas a enemigos** (`placement.type = 'enemy'`) con
  modificadores de combate, evitar, salud y palabras clave perdidas; se
  descartan cuando el enemigo abandona el juego.
- Instrucciones de aparición variables (`spawn`), Oleada condicional, Errante que
  puede desactivarse y Cazador que se pierde; presa "más pistas".
- Daño a enemigos con origen (`source`) y reducción por carta (`damageTaken`).
- Asignación de daño a apoyos sin dueño (`soaksAtLocation`) y ventana
  `afterDamageAssigned` con el total recibido; reacciones de apoyos sin dueño.
- Ganchos de escenario: reacciones, `canEnter`, `beforeMove`; `afterAdvance` en
  planes; disparadores `enemyPhaseBegins`, `enemySpawned`, `investigatorDefeated`.
- Coste adicional de negociar (`parleyCost`), regla de compromiso de la
  Habitación 245, `onSuccessEach`, ataques sin daño, Peligro (nadie más
  compromete), `RemoveDoom`, `RemoveAllDoom`, `EnemyToVictory`,
  `RemoveEnemyFromGame` y colocación inicial con el jefe aparte.

## Textos

- Resúmenes propios en `packages/i18n` (`story.excelsior.*`).
- Oficiales en `apps/web/public/local-assets/story/`: inglés desde la referencia
  (`scripts/import-story-texts.mjs`) y castellano transcrito del reglamento
  escaneado más los reversos de cartas (`scripts/import-excelsior-es.mjs`).
- Catálogo local EN/ES de las 52 cartas (`packages/i18n/src/excelsior-cards.*.json`,
  `scripts/import-excelsior-cards.mjs`), completado con es.arkhamdb.com (`hotel`).

## Pendiente y límites

- Imágenes de las cartas y portada (`scripts/sync-card-images.mjs` ya incluye
  84001–84052; la portada sería `boxes/84001.jpg`).
- Aceptación visual EN/ES en escritorio y 390×640.
- Solo como escenario independiente; el modo historia secundaria (coste de 3 de
  experiencia dentro de otra campaña) no está implementado.
- Las partidas con decisiones al azar no pasan del acto 1; los finales se cubren
  con pruebas dirigidas, no con victorias completas grabadas como en La Gala.
