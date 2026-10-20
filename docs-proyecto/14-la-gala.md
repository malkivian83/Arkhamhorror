# La gala del ecuador del invierno (escenario independiente)

**Estado revisado el 20/10/2026:** escenario implementado y jugable, con las
fases 1–3 completadas y G17 cerrado mediante siete victorias completas en normal:
una por cada facción y dos equipos de dos investigadores. Las grabaciones se
reproducen desde preparaciones legales y comprueban guardado y deshacer en
`gala-playthrough.test.ts`. Se verifican además los contratos principales de los
62 códigos y caras, el respaldo EN/ES y la persistencia especial.
Quedan la aceptación visual EN/ES en escritorio y 390×640 y la publicación
estable. Las victorias automáticas no acreditan la interfaz ni todas las
interacciones posibles. Consultar la [auditoría específica](18-auditoria-cierre-la-gala.md)
para las grabaciones y criterios vigentes.

Escenario independiente de 2024 (pack `tmg` en ArkhamDB, cartas 71001–71062), con su
propio conjunto de encuentros. Código en `packages/cards/src/midwinter-gala/`:

| Fichero         | Contenido                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `cards.ts`      | Códigos, facciones, Invitados y Líderes, enemigos, traiciones y localizaciones                                                   |
| `gala.ts`       | Preparación, bolsas del caos, tarjeta de referencia, plan, acto, localizaciones, hechizos, interludio, puntuación y resoluciones |
| `encounter.ts`  | Enemigos y traiciones                                                                                                            |
| `stories.ts`    | Cartas de Historia de las facciones (Aliado y Rival)                                                                             |
| `guests.ts`     | Habilidades de Invitados y Líderes, La Lámpara Mortecina y la Joya de Sarnath                                                    |
| `definition.ts` | Registro como escenario independiente (aparece en "Nueva campaña")                                                               |

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
cargan de es.arkhamdb.com cuando está disponible. El respaldo local EN/ES cubre
los 62 códigos y sus caras con datos y resúmenes propios; las imágenes locales
incluyen Líderes como enemigo, El Exangüe desatado, cartas Rival y La Lámpara.
Las pruebas de respaldo cubren red fallida, respuestas parciales, cambio de
idioma e imágenes ausentes. Su aceptación visual sigue pendiente.

## Pendiente y límites

- Aceptación visual de recorridos completos EN/ES en escritorio y ventana móvil,
  incluidos interludios, ampliaciones, avisos, recompensas y puntuación final.
- Publicación estable propia de Gala después de las comprobaciones finales.
- Los textos de los reversos de plan (Se desata el caos, calma, despedida) usan
  resúmenes propios.
- La recompensa de R1 ya registra un Invitado como Apoyo de historia. El modo
  historia secundaria dentro de otra campaña todavía no está implementado.

Las fases 1–3 ya corrigen movimiento, asignación prioritaria, combate, costes,
salidas, RNG y las habilidades de Callahan, Delores, Olney y Lucas. Las mesas
nuevas usan `scenarioRulesVersion: 4`; las revisiones anteriores se rechazan
conservando el archivo original para exportarlo. Es necesario empezar una mesa
nueva. Brethren conserva su compatibilidad. Las 320 preparaciones y los 40
recorridos de derrota siguen siendo evidencia distinta de las siete victorias.
