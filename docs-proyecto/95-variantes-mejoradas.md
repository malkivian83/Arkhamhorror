# 95 · Variantes mejoradas de cartas jugables

Lote `upgraded-variants`: niveles y versiones de cartas estándar cuya carta base ya
era jugable. Se seleccionaron cruzando el registro real del motor con el inventario
congelado `3c8ee4b5d8100766` y los nombres de ArkhamDB, sin agrupar por nombre a
ciegas: cada carta se contrastó con su texto vigente y, si procede, su FAQ.

## Recuento

- 44 códigos incorporados, sin repeticiones con lotes anteriores ni con el catálogo.
- 43 cartas o niveles distintos nuevos y 1 carta de texto idéntico a otra jugable:
  Bien conectado `54006`, que reutiliza la implementación de `60381`.
- 0 reediciones del inventario (ninguna con `duplicate_of`).
- Inventario congelado intacto.

| Grupo          | Códigos                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| Talentos       | 07264, 07266, 07270, 60428, 60178, 60277, 60476, 60579, 54006, 03195        |
| Buscador       | 02262, 02263, 02264, 51004, 08038, 06279, 04267, 05318, 06198, 05232        |
| Místico        | 51008, 08068, 51007, 02233, 09093, 60481, 60477, 03268                      |
| Armas y útiles | 03234, 09113, 51002, 52010, 53002, 10120, 60558, 60326, 09122               |
| Tácticas       | 60164, 60174, 60320, 51006, 51009, 51005, 05282                             |

## Reglas y decisiones

- Talentos de nivel 4 (Hiperconsciencia, Curtido en la vida, Fuerzas de flaqueza,
  Estudios arcanos): reponen 2 usos al empezar cada ronda; cada +1 se paga con un
  recurso de la reserva o de la carta. Talentos Inicial de nivel 3: `starting` y
  +2 en su contexto (ataque/evasión, investigación/parlamento, Hechizo/Ritual o
  carta de Escenario).
- Solución extraña (4), las cuatro versiones: `requiredResearch: 'identifiedSolution'`,
  igual que la búsqueda de campaña de la versión 0.
- Viejo libro de conocimiento (3): tras la búsqueda, 1 secreto permite jugar la carta
  robada con −2 al coste. Alimentar la mente (3) y Atisbar lo impensable (5) usan
  el tamaño máximo de mano del motor (`handSize`, ahora exportado).
- Ritual a la luz de la luna (2): quita toda la perdición de una carta no Élite del
  Lugar (lugar, investigador, apoyo o enemigo). Vista arcana (5): el horror sin cargas
  es normal, como indica la carta.
- Linterna (3): reacción al iniciar una investigación o evasión propia. Se añade al
  motor `ReduceSkillTestDifficulty`, reducción aditiva de la prueba en curso antes de
  multiplicadores y sin bajar de 0.
- ¡Ups! (2): admite cualquier enemigo del Lugar y quita solo el daño al investigador
  enfrentado con el atacado, conservando `onFail`, Represalia y Escurridizo mediante
  `testEnemyHasKeyword`, ahora exportado del motor.
- Reclamo (3): el segundo modo evita a un enemigo no Élite de un Lugar conectado e
  intercambia las posiciones solo si el investigador llegó a moverse.
- Forma física (0/2): designador Movimiento; cura tras completarse el movimiento.

## Bloqueadas (fuera del lote)

- Atajo (2) `03232`: el motor no vincula eventos de jugador a un Lugar con dueño,
  descarte al salir el Lugar y habilidad rápida para cualquier investigador allí.
- Periódico (2) `03313`: necesita una ventana «cuando vayas a descubrir pistas»
  previa a `DiscoverClues`, válida también fuera de investigaciones.

## Presentación y fuentes

Textos oficiales EN/ES de las API de ArkhamDB del 30/10/2026, guardados como
`source-en.json` y `source-es.json`; `scripts/present-upgraded-variants.mjs`
reproduce nombres, rasgos y textos de forma idempotente. Escaneos y miniaturas
EN/ES con el importador común; procedencias en
`evidencias/upgraded-variants-recursos-oficiales.json`. La hoja de contacto
española se revisó: las 46 cartas iniciales eran correctas y en castellano.
Revisión de la aplicación reservada al usuario, sin navegador.

## Validación

- Registro real (`inspectRuntime`): 786 → 830 jugables; estándar pendientes 884 → 840.
  Ningún código del lote queda pendiente.
- Pruebas del lote: 92 en cinco archivos (talentos, buscador, místico, armas y tácticas),
  incluidas restricciones, objetivos inválidos y ventanas.
- Suite general: 5630 correctas y 20 omitidas. Dos fallos: el catálogo mostraba como
  duplicadas las cuatro Soluciones extrañas (4); se corrige con el subtítulo revisado
  (`subname` en la aprobación, admitido por `approvedDefinition`) y EN/ES en
  `offlineCard.subnames`. El timeout conocido del panel de administración pasa al
  repetir solo su archivo con 15 s. Tras las correcciones, 719 pruebas afectadas
  (lote, mazos, reproducción de datos, André y juego web) correctas.
- Tipos de engine/cards, formato, lint y compilación de la web correctos.
- Los controles se reutilizan mientras no cambien reglas, datos, presentación o
  dependencias del alcance.
