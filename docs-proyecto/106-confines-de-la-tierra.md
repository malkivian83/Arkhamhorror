# 106 · Los confines de la Tierra

## Estado y continuación

Última implementación: `612cc41e` en `main`, con subida autorizada; revisión sobre `57b10846`. Punto de control III completo: elección inmediata/descanso, sellos colocados activos y sellos recuperados inactivos; solo la continuación inmediata conserva sus portadores. Cada parte reinicia la partida según la guía, permite gastar experiencia y conserva las decisiones al guardar. El reparto identifica cada sello y su estado.

Revisión de toda la campaña por consola: cuatro recorridos hasta el epílogo con 1–4 investigadores, las cuatro dificultades, rutas opcionales, cero o tres visitas a Espejismo, guardado en cada transición y conservación de las 16 copias de ¡Tekeli-li!. Contrastes cerrados: Eidolones 3/3/2 (guía p. 16), descarte de Danforth de determinación y desistimiento externo con el Terror. Los Memoriales pueden rechazarse sin añadir cartas; los reintentos de sala mantienen sus firmas anteriores. Noche reposada incorpora sus 19 relatos íntegros EN/ES.

Validación vigente: 73 casos de Corazón, recorridos de integración, regresiones de campaña, guardados, salas, presentación y narración; tipos de cartas/web/servidor, formato/lint y build web. Verificadas 670 caras EN/ES de la campaña con huella y miniatura. Invalidan estos resultados los cambios en las reglas, contratos, recursos o configuración afectados. Sin navegador; revisión visual manual pendiente.

CI #404 falló en referencias de Picos/Ciudad/Corazón y escaneos ausentes. Corregidas ambas causas y superadas sus pruebas locales. Audios aplazados por petición expresa: 127 pasajes y 17 caras con textos completos preparados, sin llamadas a la API. Siguiente paso: revisión visual manual; locuciones cuando se facilite una API con créditos. El detalle anterior está en historial/106-confines-de-la-tierra.md.

## Hoja de ruta vigente

- [x] Prólogo, Helada, expedición, compañeros y ¡Tekeli-li!.
- [x] Hielo y muerte I/II/III y puntos de control I/II.
- [x] Los tres interludios y las visitas opcionales a Espejismo letal.
- [x] Picos, Ciudad, Corazón I/II, punto de control III y epílogo.
- [x] Textos completos EN/ES, referencias de caos, escaneos y miniaturas.
- [x] Selector, guardados y recorridos de integración hasta el final.
- [ ] Revisión visual manual.
- [ ] Locuciones pendientes, aplazadas hasta disponer de créditos.

Las cartas de jugador de la expansión de investigadores siguen el flujo de
importación (guía 59) y no bloquean la campaña.

Inventario reproducible: 266 códigos EN/ES, 24 conjuntos, 371 copias según el
catálogo fuente. Son entradas de datos, no 266 reglas implementadas ni un recuento
certificado de cartas físicas: hay que revisar caras y variantes antes de usar
las cantidades para preparar mazos. El catálogo local incluye las siete entradas
de ¡Tekeli-li! y dieciocho cartas de compañero.

## Narración

Conservados y verificados 124 pasajes y 43 caras ya grabados con Salva
(`hyKxCTlAqtnW188CgltM`). Quedan 127 pasajes y 17 caras por generar; los
manifiestos incluyen el texto íntegro, destino y huella. No se han consumido
créditos durante esta revisión.

`node scripts/generate-edge-of-the-earth-audio.mjs --refresh` actualiza solo el
inventario local. `--generate` se reserva para cuando la persona usuaria facilite
una API con créditos; `--only=clave1,clave2` limita los pasajes seleccionados.
Para las cartas: `node scripts/generate-campaign-card-audio.mjs --campaign=edge-of-the-earth --refresh`.

## Fuentes revisadas

- [Guía oficial española](https://cdn.svc.asmodee.net/production-asmodeees/uploads/2023/06/AHC64ES_Guia-de-campana_ES.pdf),
  disponible en `tmp/pdfs/AHLCG_Los_confines_de_la_tierra.pdf`. Contrastadas las
  reglas y la progresión de pp. 2–60 por extracción de texto. Para el punto de
  control III: pp. 2, 55 y 57; cada parte es una partida con preparación y resolución propias.
- Reglas de la expansión de investigadores añadidas:
  `reglas/AHLCG_Investigadores_Los_confines_de_la_tierra.pdf` (4 páginas, texto
  extraíble). No contiene reglas de campaña; su efecto se resume en
  [Expansión de investigadores](#expansión-de-investigadores).
- Aplicación de referencia externa: `E:/referencia/ArkhamHorror`.
  Consultados `Campaign/Campaigns/EdgeOfTheEarth.hs`,
  `Campaigns/EdgeOfTheEarth/{CampaignSteps,Partner}.hs` y
  `Scenario/Scenarios/EdgeOfTheEarth/IceAndDeathPart1.hs`, bajo
  `backend/arkham-api/library/Arkham/`.
- Para los pasos 4–5 se contrastaron las correspondencias de compañeros,
  `Campaigns/EdgeOfTheEarth/{Helpers,Supplies}.hs` y los siete módulos de
  `Treachery/Cards/EdgeOfTheEarth/Tekelili/`, junto con los textos EN/ES.
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
| Helada | Implementada (paso 3). Primera ficha: −1 y otra revelación; segunda en la misma prueba: detener revelaciones y fracaso automático. Máximo ocho entre bolsa y fichas selladas. Fuera de pruebas no tiene efecto ni valor (FAQ de investigadores: con 21 o nada no suma y se puede seguir revelando o plantarse). Mantener las fichas reveladas fuera de la selección hasta terminar la prueba. |
| Compañero | El registro de expedición conserva los nueve personajes por código base, también al elegir su versión de determinación. Faltan las cartas y sus habilidades, y conectar la preparación y sus efectos a cada escenario. |
| ¡Tekeli-li! | Mazo especial de 16 debilidades: siete códigos con cantidades 3/3/2/2/2/2/2. Mantener un conjunto finito compartido, persistencia en los mazos de investigadores y devolución al mazo especial al resolverlas. No tratarlas como debilidades básicas comprables. |
| Puntos de control | `CampaignScenario.allowDeckChangesAfter` ya permite bloquear compras, pero el progreso normal incrementa `scenarioIndex`. Hace falta representar decisiones, partes omitidas y reanudación sin repetir preparaciones o recompensas. |
| Espejismo letal | Puede reaparecer entre escenarios; no modelarlo como una única casilla obligatoria de un recorrido lineal. Conservar visitas y estado de personajes entre ellas. |
| Refugio y suministros | Estado propio de Hielo y muerte y sus puntos de control; documentar tipos y consumidores antes de añadir campos al guardado. Los valores de refugio también intervienen en la calavera del primer escenario. |

La palabra clave Alerta ya existe en el proyecto; revisar sus pruebas y reutilizarla.
No confundir apoyos Aliado ordinarios con la nueva palabra clave Compañero.

## Expansión de investigadores

El PDF de investigadores cubre cartas de jugador, no la campaña; no cambia
escenarios, entregas ni el orden previsto. Contraste con el proyecto:

- **Multiclase**: la carta pertenece a todas sus clases y no es neutral; entra si
  el investigador accede a cualquiera de ellas, y no ocupa espacio limitado si
  otra de sus clases tiene acceso ilimitado. Ya soportado por `classes` en
  `PlayerCardDef`, `deckOptionAllows` y el recuento de `offClassLevelZeroLimit`
  en `packages/cards/src/decks.ts`. Añadir una prueba con el ejemplo de
  Monterrey Jack (Buscador/Superviviente frente a Buscador/Rebelde) al importar
  la primera multiclase de este paquete.
- **Investigado**: solo se obtiene mejorando la versión menor tras anotar la
  tarea en el registro; después cualquier investigador de la campaña puede
  mejorarla. Ya existe (Solución extraña, tomos de Harvey Walters); el Archivo de
  conductos debe reutilizar ese mecanismo con su nota "los investigadores han
  identificado el portal".
- **FAQ para la importación** (guía 59): neutral no es clase para Sinergia;
  El heraldo revelado encima del mazo impide cualquier manipulación del mazo;
  Bob Jenkins puede jugar sus propios Apoyos Objeto con su acción adicional;
  21 o nada se pasa por encima de 21; acción básica de Cerrar el círculo es la
  no modificada por un indicador de acción en negrita; Usos de la Escopeta vieja
  solo se refieren a la entrada en juego, salvo que un Evento aluda a Usos.
  Ninguna de estas cartas está implementada todavía; no confundir El heraldo con
  El heraldo de Elokoss (`brethren-of-ash`).

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

La preparación inicial verificó el inventario y el formato y lint del generador.
Repetir la comprobación del inventario si cambian las fuentes o su generador.
