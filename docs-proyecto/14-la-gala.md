# La gala del ecuador del invierno (escenario independiente)

**Estado revisado el 19/10/2026:** escenario implementado y jugable, con las
fases 1–3 completadas (20 de 21 trabajos de auditoría). Se verifican los contratos
principales de los 62 códigos y caras, el respaldo EN/ES y la persistencia especial.
Quedan G17 (victorias completas por las cinco facciones), aceptación visual
y publicación estable. Las 320 preparaciones, los 40 recorridos de derrota y
las mesas dirigidas de fase 3 no acreditan victorias. El siguiente bloque es la
fase 4: partidas completas e interfaz. Consultar la [auditoría específica](18-auditoria-cierre-la-gala.md)
para los criterios vigentes; el resto de este documento describe la
implementación inicial y su lista de pendientes no es exhaustiva.

Escenario independiente de 2024 (pack `tmg` en ArkhamDB, cartas 71001–71062), con su
propio conjunto de encuentros. Código en `packages/cards/src/midwinter-gala/`:

| Fichero | Contenido |
|---|---|
| `cards.ts` | Códigos, facciones, Invitados y Líderes, enemigos, traiciones y localizaciones |
| `gala.ts` | Preparación, bolsas del caos, tarjeta de referencia, plan, acto, localizaciones, hechizos, interludio, puntuación y resoluciones |
| `encounter.ts` | Enemigos y traiciones |
| `stories.ts` | Cartas de Historia de las facciones (Aliado y Rival) |
| `guests.ts` | Habilidades de Invitados y Líderes, La Lámpara Mortecina y la Joya de Sarnath |
| `definition.ts` | Registro como escenario independiente (aparece en "Nueva campaña") |

## Cómo se juega en la plataforma

1. Al empezar: elegir jefe, introducción (2 partes), mulligan y la pregunta **¿Quién
   es tu contacto misterioso?**: la facción elegida es la aliada; la rival se sortea.
2. Preparación según la facción: Líder bajo el control del jefe, 2 Invitados en cada
   sala de la planta baja (3 de la facción aliada y 3 del mazo de Invitados), El
   Exangüe agotado en la Sala de la Lámpara con La Lámpara Mortecina.
3. Acto 1 (Meet and Greet): negociar con Invitados (prueba de uno de sus iconos, 3)
   para tomar su control; se avanza cuando todos controlan un Invitado y el plan es
   el 2 o el 3. Al avanzar: entra el primer piso (una sala conectada al Vestíbulo), la
   carta de Historia rival con su Líder, y el interludio de la Joya según la facción.
4. Acto 2: cumplir el objetivo de la carta de Historia aliada (al final de la ronda se
   pregunta si se paga y se termina).
5. Resolución: la de la facción y la 7 con la **puntuación** desglosada y su
   experiencia.

## Motor: lo nuevo

- **Cartas de Historia en juego** (`stories`): habilidades para cualquier
  investigador, forzados y pistas encima.
- **Apoyos colocados** (`placedAssets`): sin dueño, en una localización o vinculados a
  un enemigo, boca arriba o boca abajo; tomar el control (`TakeControlOfPlaced`) y
  perderlo (`ReleaseAsset`). Si el enemigo deja el juego, quedan en su localización.
- **Mensajes propios del escenario** (`ScenarioSpecific`) y datos (`scenarioMeta`),
  como el `ScenarioSpecific` de la referencia.
- **Errante** (`patrol` en el comportamiento del enemigo), **conexiones añadidas**
  (`ConnectLocations`), **horror al entrar** (`enterHorror`).
- Ganchos del escenario: modificadores de habilidad, enemigos inmunes, combate/evasión
  de enemigos, velo, permiso para avanzar el acto, no comprometer cartas, cancelar
  eventos, acciones por turno y "en lugar de abandonar el juego".
- Disparadores nuevos: tras comprometer cartas, tras ganar recursos por un efecto, fin
  de la fase de enemigos; las pistas descubiertas dicen cuántas y si era la última.

## Textos

Resúmenes propios en `packages/i18n` y, en `apps/web/public/local-assets/story/`, los
oficiales: en español del reglamento del escenario (`scripts/import-gala-es.mjs`, con
el PDF de `docs-proyecto/reglas`) y en inglés de la referencia
(`scripts/import-story-texts.mjs`). Nombres y textos de las cartas en español se
cargan de es.arkhamdb.com. Las caras traseras que ArkhamDB no tiene (Líderes como
enemigo, El Exangüe desatado, cartas Rival, La Lámpara) se muestran con las imágenes
del servidor del proyecto de referencia.

## Pendiente / aproximado

- Special Agent Callahan: falta su reacción "tras activar una habilidad de [acción]
  de un Aliado o Arma".
- Delores Gadling: falta ignorar los ataques de oportunidad de Humanoides; la
  referencia consultada no limita esa capacidad a no Élite.
- Thomas Olney: falta su segunda habilidad (descartar la carta superior de tu mazo y
  comprometerla).
- Lucas Tetlow: si el Objeto es un Tomo, aún no ofrece jugarlo.
- Los textos de los reversos de plan (Se desata el caos, calma, despedida) usan
  resúmenes propios.
- La Resolución 1 (añadir un Invitado al mazo) solo tiene sentido en campaña; el
  modo historia secundaria no está implementado.

La fase 1 de la auditoría ya corrige el movimiento por conexiones de Emboscada y
Atrapado, la asignación prioritaria de Gug/Bestia lunar, combate, costes, salidas
por eliminación, primera entrada a Sala de la Lámpara y RNG. Las mesas nuevas
usan reglas de escenario versión 2; no se migran automáticamente mesas activas
de Gala anteriores. Brethren conserva su compatibilidad.
