# 106 · Los confines de la Tierra

## Estado y continuación

Hielo y muerte I está disponible desde el selector con los nueve compañeros,
el mazo ¡Tekeli-li!, la referencia de caos y las cartas EN/ES. Las pruebas de
campaña llegan a la resolución mediante el acto y mediante el plan final.
Comprueban el campamento, la experiencia, la bolsa persistente y el coste de
entrada que pagan solo los investigadores en el Lugar de origen. Retirar
Helada del barco persiste aunque la ficha perteneciera a la bolsa inicial.

Siguiente entrega: punto de control 1 y partes II y III. Al finalizar la parte
I, el registro conserva el resultado y muestra el punto de control pendiente.

Claypool reutiliza la cancelación de fichas. La prueba puede terminar sin
modificador si cancela la única ficha sin reemplazarla. Fredericks usa una
restricción de ataque para toda la ronda, distinta de la restricción de Carcosa
que solo aplica durante la fase de enemigos.

Verificación sobre `57dac2a4`: 522 pruebas de motor, escenarios y campaña,
salas, selector, referencia y catálogo. Tipos, formato, lint y huellas de los
escaneos y miniaturas. Repetir controles si cambian reglas, textos, recursos o
registro.

## Hoja de ruta

Pasos para tener la campaña completa en línea. `[x]` hecho, `[~]` en curso o
sin publicar, `[ ]` pendiente.

**Preparación**

1. [x] Guía de campaña e inventario EN/ES reproducible del paquete eoec.
2. [x] Revisión del PDF de la expansión de investigadores (no cambia la campaña).

**Mecánicas comunes**

3. [x] Helada, contrastada con las páginas 2–3 de la guía: −1 y otra revelación;
   la segunda revelada _de la bolsa_ en la misma prueba detiene las revelaciones
   y es fracaso automático (las selladas o nombradas no cuentan; Máscara de Sileno
   y Atenea marcan sus fichas como sacadas de la bolsa); sin efecto fuera de
   pruebas; máximo ocho entre bolsa y selladas; persiste en la bolsa de campaña.
   Textos EN/ES y ayuda de ficha. Pruebas en `packages/engine/src/frost.test.ts`.
   Verificado: suite completa el 04/11/2026; tras el ajuste de la bolsa, suite del
   motor, Máscara de Sileno, Gala de invierno, tipos de motor, cartas y web, y
   lint. Interpretación propia, sin texto en la guía: una Helada de la bolsa
   ignorada cuenta para la segunda. Revisión visual pendiente con el prólogo.
4. [~] Estado de expedición opcional en `CampaignLog`. El motor permite registrar
   el campamento y los suministros, y conserva identidad, estado, daño y horror
   de cada compañero. La selección impide que dos investigadores lleven al mismo
   personaje. Desistir conserva al compañero y la derrota lo elimina. La pregunta
   de preparación ofrece los compañeros disponibles y la opción de ir solo.
   Los nueve compañeros tienen cartas registradas en el escenario local.
5. [~] Mazo ¡Tekeli-li! de 16 copias compartidas. Se reconstruye en cada escenario
   descontando las copias asignadas en el registro de campaña. Las siete revelaciones
   tienen pruebas y texto EN/ES, y devuelven su copia al fondo. El escenario local
   prepara el mazo especial y conecta los efectos que entregan las debilidades.
6. [ ] Puntos de control y recorrido no lineal: partes opcionales, omitidas,
   reanudación sin repetir preparación ni recompensas, visitas a Espejismo letal.

**Escenarios** (preparación, conjuntos de encuentros, cartas, resolución, pruebas)

7. [~] Prólogo con bolsas impresas por dificultad, elección del investigador jefe
   con nota y ficha persistentes, variante de Winifred y muerte reproducible antes
   de elegir compañero. Resúmenes EN/ES. Conectado al arranque de campaña local.
8. [x] Hielo y muerte I (08501a), jugable desde el selector hasta la resolución.
   El punto de control 1 está indicado como siguiente paso pendiente.
9. [ ] Hielo y muerte II y III (08501b/c) con sus puntos de control.
10. [ ] Interludios y Espejismo letal (08549).
11. [ ] Hacia los picos prohibidos (08596).
12. [ ] Ciudad de los Antiguos (08621).
13. [ ] El corazón de la locura I y II (08648a/b) y epílogo.

**Presentación y publicación**

14. [~] Cartas de encuentro en catálogo EN/ES, imágenes y manifiesto. El catálogo
    local incluye ¡Tekeli-li! y los nueve compañeros, con escaneos y miniaturas
    EN/ES. Completar los recursos de los escenarios siguientes.
15. [ ] Ayuda de fichas de cada escenario (tarjeta de referencia oficial).
    Incluirla en la entrega de cada escenario.
16. [ ] Narraciones con la voz indicada abajo.
17. [ ] Campaña en el selector, pruebas de sesión de campaña completa y
    regresiones de campañas previas.
18. [ ] Revisión visual por la persona usuaria y publicación.

Las cartas de jugador de la expansión de investigadores siguen el flujo de
importación (guía 59) y no bloquean la campaña.

Inventario reproducible: 266 códigos EN/ES, 24 conjuntos, 371 copias según el
catálogo fuente. Son entradas de datos, no 266 reglas implementadas ni un recuento
certificado de cartas físicas: hay que revisar caras y variantes antes de usar
las cantidades para preparar mazos. El catálogo local incluye las siete entradas
de ¡Tekeli-li! y dieciocho cartas de compañero.

## Narración

Voz de ElevenLabs elegida por la persona usuaria para esta campaña:
`DdKbXdRlBmj7Ty7N0FVr`. Usarla al preparar las narraciones de Los confines de la
Tierra. Preferencia anotada el 04/11/2026. La narración con la voz indicada
sigue pendiente.

## Fuentes revisadas

- Guía española añadida: `reglas/AHLCG_Los_confines_de_la_tierra.pdf`.
  Revisión visual de las páginas 2–5 y 7–8; el escaneo no proporciona
  texto extraíble. Falta revisar la preparación completa, resoluciones y puntos
  de control de cada escenario al implementarlos. Los renders están en `tmp/eote/`.
- Reglas de la expansión de investigadores añadidas:
  `reglas/AHLCG_Investigadores_Los_confines_de_la_tierra.pdf` (4 páginas, texto
  extraíble). No contiene reglas de campaña; su efecto se resume en
  [Expansión de investigadores](#expansión-de-investigadores).
- Aplicación de referencia externa: `D:/referencia/ArkhamHorror-main`.
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
