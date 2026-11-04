# 106 · Los confines de la Tierra

## Estado y continuación

Preparación inicial del 04/11/2026; publicación junto con el PDF autorizada, sin
activación jugable. Siguiente
entrega: Helada en el motor, con pruebas de revelación encadenada y persistencia;
después, registro de compañeros y mazo ¡Tekeli-li! antes de habilitar el escenario I.
El pull inicial queda impedido por cambios previos en `en.json`, `es.json` y
`cardImageManifest.json`; no se han apartado ni modificado.
Antes de publicar se actualizó la referencia remota con `git fetch origin main`:
`main` coincide con `origin/main`, sin cambios pendientes de integrar.

Inventario reproducible: 266 códigos EN/ES, 24 conjuntos, 371 copias según el
catálogo fuente. Son entradas de datos, no 266 reglas implementadas ni un recuento
certificado de cartas físicas: hay que revisar caras y variantes antes de usar
las cantidades para preparar mazos. No se han incorporado a catálogo, tienda,
registro de reglas ni selector de campañas.

## Narración

Voz de ElevenLabs elegida por la persona usuaria para esta campaña:
`DdKbXdRlBmj7Ty7N0FVr`. Usarla al preparar las narraciones de Los confines de la
Tierra. Preferencia anotada el 04/11/2026; todavía no se ha generado audio.

## Fuentes revisadas

- Guía española añadida: `reglas/AHLCG_Los_confines_de_la_tierra.pdf`.
  Revisión visual inicial de las páginas 2–3 y 7; el escaneo no proporciona
  texto extraíble. Falta revisar la preparación completa, resoluciones y puntos
  de control de cada escenario al implementarlos. Los renders están en `tmp/eote/`.
- Aplicación de referencia externa: `D:/referencia/ArkhamHorror-main`.
  Consultados `Campaign/Campaigns/EdgeOfTheEarth.hs`,
  `Campaigns/EdgeOfTheEarth/{CampaignSteps,Partner}.hs` y
  `Scenario/Scenarios/EdgeOfTheEarth/IceAndDeathPart1.hs`, bajo
  `backend/arkham-api/library/Arkham/`.
- Datos EN/ES de `frontend/public/cards_{en,es}.json`, paquete **eoec**.
  El paquete de investigadores es distinto; seleccionar por prefijo numérico
  perdería entradas de esta campaña. El inventario guarda las huellas de ambas
  fuentes y valida códigos únicos, paridad EN/ES, tipo, conjunto y cantidades.

La referencia sirve para estudiar comportamiento y localizar recursos; las
reglas se implementan aquí y se contrastan con la guía/cartas. No se ha iniciado
su backend ni una sesión de navegador.

## Diferencias que condicionan el diseño

| Necesidad | Situación local y trabajo necesario |
| --- | --- |
| Helada | `ChaosSymbol` aún no incluye Helada. Primera ficha: −1 y otra revelación; segunda en la misma prueba: detener revelaciones y fracaso automático. Máximo ocho entre bolsa y fichas selladas. Fuera de pruebas no tiene efecto por sí misma. Mantener las fichas reveladas fuera de la selección hasta terminar la prueba. |
| Compañero | No hay un modelo específico de expedición en `CampaignLog`. Nueve personajes, selección opcional sin compartir una misma copia, daño/horror persistentes y eliminación permanente. No entran en mazos de jugador ni abandonan juego salvo derrota; la derrota del investigador derrota al compañero. Desistir conserva su daño/horror sin eliminarlo. Hay versiones de determinación en el catálogo que deben vincularse con su personaje. |
| ¡Tekeli-li! | Mazo especial de 16 debilidades: siete códigos con cantidades 3/3/2/2/2/2/2. Mantener un conjunto finito compartido, persistencia en los mazos de investigadores y devolución al mazo especial al resolverlas. No tratarlas como debilidades básicas comprables. |
| Puntos de control | `CampaignScenario.allowDeckChangesAfter` ya permite bloquear compras, pero el progreso normal incrementa `scenarioIndex`. Hace falta representar decisiones, partes omitidas y reanudación sin repetir preparaciones o recompensas. |
| Espejismo letal | Puede reaparecer entre escenarios; no modelarlo como una única casilla obligatoria de un recorrido lineal. Conservar visitas y estado de personajes entre ellas. |
| Refugio y suministros | Estado propio de Hielo y muerte y sus puntos de control; documentar tipos y consumidores antes de añadir campos al guardado. Los valores de refugio también intervienen en la calavera del primer escenario. |

La palabra clave Alerta ya existe en el proyecto; revisar sus pruebas y reutilizarla.
No confundir apoyos Aliado ordinarios con la nueva palabra clave Compañero.

## Mapa de escenarios de la referencia

Son cinco escenarios narrativos, ocho módulos de preparación y una campaña de
4–10 sesiones según la guía; no ocho escenarios obligatorios consecutivos.

| Código de módulo | Escenario |
| --- | --- |
| 08501a | Hielo y muerte, parte I |
| 08501b | Hielo y muerte, parte II, opcional desde el punto de control 1 |
| 08501c | Hielo y muerte, parte III, opcional desde el punto de control 2 |
| 08549 | Espejismo letal, visitas condicionadas desde los interludios |
| 08596 | Hacia los picos prohibidos |
| 08621 | Ciudad de los Antiguos |
| 08648a | El corazón de la locura, parte I |
| 08648b | El corazón de la locura, parte II |

No confundir `08501a/b/c` (identificadores de módulos) con el código `08501`
de la carta de referencia. Lo mismo exige atención en las dos partes finales.

## Entregas y criterios de aceptación

1. **Helada.** Extender símbolo, resolución, límites y presentación EN/ES.
   Probar primera y segunda Helada, modificadores acumulados, ausencia de
   reposición prematura, cancelación/ignoración y revelaciones adicionales,
   fin de prueba, sellado y bolsa persistente. Revisar consumidores exhaustivos
   de símbolos y compatibilidad con guardados existentes.
2. **Estado de expedición y ¡Tekeli-li!** Definir estado tipado y valores
   iniciales compatibles con guardados previos. Probar selección de compañeros,
   derrota/desistir, heridas entre partidas y transición a determinación.
   Probar conservación de las 16 copias entre mazo especial y mazos de jugador,
   devolución, agotamiento y reanudación. Implementar y probar cada efecto.
3. **Prólogo, puntos de control y primera parte.** Bolsas por dificultad
   contrastadas con página 3, elecciones del prólogo y muerte aleatoria
   reproducible antes de seleccionar compañero. Preparación y reglas de
   Hielo y muerte I, resolución, refugio, suministros y guardado. Validar rutas
   al continuar o pausar, restricciones de mejora y partes omitidas.
4. **Completar el recorrido.** Partes II/III, interludios, Espejismo letal y
   después Picos, Ciudad y Corazón. Añadir pruebas de rutas y regresiones de
   campañas previas cuando se amplíe la progresión compartida.

Para Hielo y muerte I, la referencia reúne `ice_and_death`, `the_crash`,
`deadly_weather`, `hazards_of_antarctica`, `silence_and_mystery`, `tekelili`
y Antiguos males del básico; aparta `creatures_in_the_ice`. El catálogo de eoec
no contiene ese conjunto básico: reutilizar su implementación revisada.
Comienzo en el lugar del accidente y tres Lugares adicionales en juego;
Lugares Inexplorado apartados. Planes Cold Welcome → Into the White →
Running Out of Time; acto Search for a Camp Site. Perdición inicial adicional:
una en difícil y dos en experto. Contrastar estos detalles con las páginas de
preparación y las cartas antes de escribir las pruebas.

Cada entrega exige comportamiento probado, textos EN/ES, registro explícito y
conexiones; el inventario por sí solo no habilita contenido. Revisiones visuales
de la aplicación quedan a cargo de la persona usuaria, sin pruebas de navegador.

## Reproducir la preparación

```powershell
node scripts/inventory-edge-of-the-earth.mjs D:/referencia/ArkhamHorror-main
node scripts/inventory-edge-of-the-earth.mjs D:/referencia/ArkhamHorror-main --check
```

Salida: [inventario EN/ES](106-confines-inventario.json). El comando no modifica
datos de juego. `--check` verifica además que el inventario coincide exactamente
con las fuentes, incluidas sus huellas; un cambio de catálogo obliga a revisarlo.

Verificación de esta preparación: generación y comprobación del inventario,
formato y lint del script/documentación. No se han modificado reglas ejecutables
del juego, por lo que no se ha ejecutado suite global ni build. Repetir la
comprobación del inventario si cambian las fuentes o su generador.
