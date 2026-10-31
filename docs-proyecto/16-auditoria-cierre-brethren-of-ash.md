# 16 · Auditoría de cierre de Brethren of Ash

**Actualización de cierre:** 18 de octubre de 2026.  
**Versión evaluada:** cambios locales de esta entrega, motor 1 y guardado `lcg-session` 1.  
**Alcance:** Spreading Flames, Smoke and Mirrors y Queen of Ash; cinco investigadores de la caja 2026, sus 104 cartas de jugador y mejoras; juego local con 1–4 investigadores.  
**Excluido:** multijugador online, otras campañas, tarot, logros y editor de cartas.

## 1. Dictamen

**Completado el cierre técnico de la versión local dentro de la matriz de aceptación descrita aquí.** Se han ejecutado las fases de preparación y resoluciones, cartas e investigadores, partidas reproducibles, persistencia y recuperación, interfaz, idiomas y regresión. Las carencias de implementación detectadas durante este trabajo quedan corregidas y acompañadas de pruebas.

La evidencia comprende **2.856 preparaciones**, un contrato principal individual para cada una de las **104 cartas de jugador**, recorridos legales completos de los tres escenarios, pruebas dirigidas de resoluciones y códices, guardado validado y **12 comprobaciones de interfaz**. El visor solicitado permite consultar todos los planes y actos, incluidas sus cartas posteriores y reversos.

Este dictamen acredita una versión mantenible y comprobada; no significa que se hayan enumerado todas las combinaciones de cartas, semillas y decisiones posibles. Las pruebas de contrato por carta no sustituyen una prueba independiente de cada interacción entre sus efectos. Los límites concretos de la evidencia se mantienen en la sección 8.

## 2. Fases y puertas de aceptación

| Puerta | Evidencia de esta entrega | Resultado |
|---|---|---|
| G01 · Preparación | 360 combinaciones de equipo/dificultad/escenario; 960 preparaciones de Smoke; 1.536 de Queen con antecedentes y heraldos. | Aprobada para la matriz descrita. |
| G02 · Cartas e investigadores | 104 contratos individuales; pruebas específicas existentes; efectos completos de los cinco signos arcanos, reacciones y límites añadidos; matriz de 193 cartas representables. | Aprobada como cobertura de contrato y regresión dirigida, sin afirmar exhaustividad de interacciones. |
| G03 · Resoluciones y continuidad | Ramas de Spreading; Smoke sin resolución, Servant retenido, seis interrogados, seis derrotados y mezcla; Queen R1/R2/R3 y derrota; registro y continuación. | Aprobada en pruebas dirigidas y de continuidad. |
| G04 · Partidas completas | Semillas 57 → 1 → 66, conservando las decisiones y el estado de campaña entre escenarios; variantes de retirada, marcha y derrotas con 1–4 investigadores. | Aprobada mediante entradas normales, sin inyectar resultados en estos recorridos. |
| G05 · Persistencia y recuperación | Exportación/importación, validación, migración del formato anterior, copia previa, conservación del original ilegible, fallos de cuota/acceso y deshacer sobre estados completos. | Aprobada en pruebas automáticas y en recarga/deshacer desde la interfaz. |
| G06 · Mesa y decisiones | Tres escenarios × EN/ES × escritorio/móvil; visor, panel de decisiones, controles para deshacer; prueba de habilidad con reacción intermedia. | Aprobada como sesión dirigida de interfaz. |
| G07 · Idiomas y recursos | Datos locales para 193 cartas; resúmenes propios de planes, actos e investigadores; fallos de red y carreras al cambiar idioma probados. | Aprobada con las alternativas y límites indicados. |
| G08 · Regresión | Suite completa, tipos de paquetes y web, lint, formato y compilación de producción. | Véase el acta final de controles de la sección 7. |

### Matriz de preparación

- **360 casos:** las 30 selecciones de 1–4 entre los cinco investigadores × cuatro dificultades × tres escenarios. Se llega a una pregunta válida y se compara la siguiente decisión después de serializar.
- **960 casos de Smoke:** cuatro dificultades × cuatro tamaños de grupo × tres antecedentes universitarios × 20 semillas. Se comprueban perdición, universidad, bolsa, seis cartas bajo lugares y separación del heraldo; aparecen las dos variantes de Downtown, las dos de Uptown y los seis heraldos.
- **1.536 casos de Queen:** cuatro dificultades × cuatro tamaños de grupo × 16 combinaciones de antecedentes × seis heraldos. Se comprueban pistas iniciales, perdición, Sectarios en lugares distintos, presencia del Servant y fichas añadidas.

Las combinaciones de antecedentes son una prueba del comportamiento de cada bandera. Algunas se incluyen para aislar efectos aunque una campaña normal no produzca todas ellas simultáneamente.

Pruebas: [closure.test.ts](../packages/cards/src/brethren-of-ash/closure.test.ts), [closure-variants.test.ts](../packages/cards/src/brethren-of-ash/closure-variants.test.ts) y los archivos específicos de cada escenario.

## 3. Recorridos completos y reproducibles

| Escenario | Equipo y dificultad | Semilla | Decisiones | Final |
|---|---|---:|---:|---|
| Spreading Flames | Joe, mazo inicial, fácil | 57 | 99 | Derrota del perseguidor y quedarse: R2. |
| Smoke and Mirrors | El mismo Joe, con registro y trauma anteriores | 1 | 5 | Retirada mediante la habilidad del plan; sin resolución. |
| Queen of Ash | El mismo Joe, con el registro de ambos escenarios | 66 | 64 | Apertura de la compuerta: R3; campaña ganada, con el sacrificio de quien no se retiró. |

Los archivos conservan campaña inicial, semilla, entradas, etiquetas elegidas, resultado y registro esperado:

- [Spreading Flames, semilla 57](evidencias/spreading-flames-57.json).
- [Smoke and Mirrors, semilla 1](evidencias/smoke-and-mirrors-1.json).
- [Queen of Ash, semilla 66](evidencias/queen-of-ash-66.json).

[playthrough.test.ts](../packages/cards/src/brethren-of-ash/playthrough.test.ts) comprueba cada pregunta y elección, enlaza las tres partidas sin modificar sus estados y verifica el resultado final. Añade bifurcaciones jugadas de marcharse tras vencer y retirarse antes de vencer en Spreading, además de campañas de derrota con uno, dos, tres y cuatro investigadores en experto.

**Distinción de evidencia:** estos recorridos emplean únicamente `startScenario`, `applyInput` y `finishScenario`. Las pruebas de resoluciones preparan estados finales deliberadamente para comprobar ramas concretas; no se contabilizan como partidas completas. La ampliación de la sección 10 incorpora después un Smoke con sus seis objetivos resueltos y recorridos completos de Queen R1 y R2, distinguiendo las preparaciones aisladas de las campañas enlazadas.

## 4. Correcciones encontradas durante el cierre

| Hallazgo | Corrección y evidencia |
|---|---|
| Amnesia no tenía efecto registrado. | Al robarla se eligen los descartes hasta conservar una carta. Contrato individual y reglas genéricas de descarte. |
| The Gold Bug no tenía comportamiento. | Zona de amenaza, −1 salud/cordura efectivas, resistencia al descarte normal y acción para barajarla. Se conserva el valor impreso para trauma. |
| The Nameless Lurker no tenía comportamiento. | Aparición en un lugar vacío más lejano; Distante; perdición al terminar investigación solo si está preparado y sin perdición. |
| Las reacciones de ataques de oportunidad podían gastar recursos que la carta en curso aún necesitaba pagar. | El coste de la carta se paga antes del ataque y su resolución llega después; se reproduce el caso de Lesson Learned y M1911. |
| Elokoss aceptaba un pago colectivo que corresponde al activador. | La habilidad exige y gasta las pistas del investigador que la activa. Regresión con dos investigadores. |
| La compuerta terminaba sin derrotar a todos los enemigos. | Derrota sin abrir ventanas ni sustituir R3 por el objetivo de Elokoss; conserva victoria de los enemigos derrotados. |
| Los códices finales imponían búsquedas y tres robos de Abigail. | Búsquedas opcionales para David/Earl y elección de 0–3 cartas para Abigail. Se prueban los seis heraldos con 1, 2 y 4 investigadores. |
| Dexter identificaba apoyos de historia por un rasgo inexistente en Armitage. | Marca explícita de apoyo de historia; se excluyen también permanentes de las devoluciones. Pruebas de devolución, juego y límite por ronda. |
| Daniela no ofrecía el ataque pesado y Esquivo se ejecutaba después de las reacciones. | Se identifican las habilidades de Luchar por su efecto; Esquivo se resuelve antes y se conserva el lugar del ataque para reaccionar incluso tras la huida. |
| Una traducción ES tardía podía sobrescribir EN. | Se aplica solo la descarga del idioma activo, con datos locales inmediatos y validación de caché. |
| El código de la segunda cara de Elokoss no admitía imagen. | Resolución correcta de `12179b` y prueba de ambas caras. |

Pruebas nuevas principales: [contracts.test.ts](../packages/cards/src/core-2026/contracts.test.ts), [investigator-closure.test.ts](../packages/cards/src/core-2026/investigator-closure.test.ts), [closure-regressions.test.ts](../packages/cards/src/brethren-of-ash/closure-regressions.test.ts) y [fallbackCards.test.ts](../apps/web/src/game/fallbackCards.test.ts).

La referencia local y los datos de cartas de 2026 se han usado para contrastar comportamiento. Las correcciones son implementaciones propias; no se han incorporado servicios, código Haskell, imágenes ni textos de la aplicación de referencia.

## 5. Estado de los trabajos C01–C12

| Trabajo | Resultado concreto |
|---|---|
| C01 · Variantes y resoluciones | Matrices de preparación y ramas de registro, objetivos y continuidad ampliadas. |
| C02 · Partidas completas | Tres grabaciones enlazadas, verificadas con decisiones legales; retirada y derrota representadas. |
| C03 · Cartas | [Matriz de 193 cartas](16-matriz-cartas-cierre.csv), 104 contratos individuales y regresiones de investigadores, debilidades y mejoras. Se identifica el alcance de la cobertura por fila. |
| C04 · Guardado | Sobre único versionado; exportar, importar desde archivo o texto con previsualización; migración, copia legible previa y aviso de fallos. |
| C05 · Deshacer | Comparación del estado completo tras recarga para paso/acción/turno/ronda, también en puntos de reacciones, daño, actos, historia y finales de las grabaciones. |
| C06 · Interfaz | [Acta de 12 comprobaciones](evidencias/interfaz-cierre.json), escritorio 1280×720 y ventana móvil 390×640, EN/ES. |
| C07 · Planes y actos | Visor ordenado, posición activa y posteriores, anversos/reversos, cierre y foco; consultar no ejecuta acciones. |
| C08 · Equipos | Se conservan los 360 casos iniciales de equipos y reanudación. |
| C09 · Consecuencias | Experiencia, trauma, recompensas, universidad, heraldo, Servant, fichas y cierre de campaña comprobados en los casos dirigidos. |
| C10 · Diagnóstico | Exportación local de base, entradas, versión y error; reproductor de diagnóstico sin servidor ni servicios externos. |
| C11 · Explicaciones | Registro y desglose de experiencia, origen de modificadores y adiciones a la bolsa; las probabilidades se identifican como estimación de una ficha. |
| C12 · Recursos y documentación | Datos locales de 193 cartas, plantillas y resúmenes propios, inventario EN/ES y actualización de notas históricas. |

### Guardado y diagnóstico

La sesión usa una escritura principal que contiene **campaña, mesa e historial**. Se valida la estructura, versión de motor/contenido y coherencia de la campaña, y se reproduce el historial antes de aceptar o escribir. Una importación inválida no sustituye la sesión. El anterior guardado legible queda como copia; un original ilegible se conserva aparte antes de reemplazarlo y se incluye en el diagnóstico.

Se reconocen las tres claves del formato anterior sin borrarlas. Si su historial no reproduce la mesa, se conserva la mesa legible y se avisa de que deshacer comienza allí. Una copia anterior recuperada puede perder las últimas decisiones; el aviso lo indica. Los archivos de versiones incompatibles y las simulaciones sin ventanas interactivas no se convierten silenciosamente en partidas de la interfaz.

Desde **Guardado y recuperación** se puede exportar la campaña completa, importar con previsualización, restaurar el guardado anterior y exportar un diagnóstico. Los archivos se descargan localmente; no se envían a terceros.

Para reproducir un diagnóstico descargado:

```powershell
node scripts/replay-diagnostic.mjs "C:\ruta\arkham-diagnostic.json"
```

[session.test.ts](../apps/web/src/game/session.test.ts) cubre datos truncados, versiones, incoherencias, cuota/acceso denegado, copia y migración. [session-playthrough.test.ts](../apps/web/src/game/session-playthrough.test.ts) comprueba el deshacer sobre los recorridos de aceptación, incluyendo el RNG, cola, preguntas, cartas, registro y resultado.

## 6. Consulta de planes y actos

Los rótulos **Plan / Acto** de la fila del escenario abren sus mazos. Se muestran todas las cartas declaradas, su orden y estado anterior/activo/siguiente. Cada carta permite consultar ambas caras. El diálogo mantiene el foco, se cierra con Escape, botón o fondo y detiene los atajos del juego mientras está abierto.

Las cartas posteriores son visibles por petición expresa del propietario. Consultarlas no consume acciones, no avanza el escenario ni añade decisiones al historial. La habilidad del plan o acto activo conserva su control separado.

Implementación: [ScenarioDeckViewer.vue](../apps/web/src/components/ScenarioDeckViewer.vue) y [ScenarioRow.vue](../apps/web/src/components/ScenarioRow.vue).

## 7. Acta de controles

Controles finales ejecutados el 18/10/2026, todos con salida correcta:

- **435 pruebas aprobadas en 31 archivos** (`vitest run`).
- Tipos de web, motor, cartas, servidor, shared e i18n.
- Lint de todo el repositorio.
- Formato de los **49 archivos de código/datos/HTML modificados o nuevos** comprobados con Prettier.
- Compilación de producción de la web con Vite; JavaScript de 540,51 kB, 168,66 kB comprimido.
- Reproductor CLI de diagnóstico: coincide el error registrado y reproducido en la prueba de una entrada inválida.
- `git diff --check` y 18 enlaces locales de esta auditoría, sin errores.

El [acta de verificación](evidencias/verificacion-cierre.json) conserva también los resultados en JSON.

La compilación conserva dos avisos no bloqueantes: fuente de iconos resuelta en ejecución y paquete JavaScript superior a 500 kB. Las alternativas de símbolos y datos locales siguen disponibles. La aceptación de interfaz está en su [archivo de evidencia](evidencias/interfaz-cierre.json).

La partida que existía antes de las pruebas se exportó y **se restauró con el mismo mulligan pendiente, cinco cartas, 28 en el mazo, cinco recursos y sin decisiones nuevas**. Las pruebas visuales utilizaron sesiones separadas de aceptación importadas temporalmente. El diálogo final de consulta se abrió sobre la partida restaurada.

## 8. Límites de la versión evaluada

- Además de Joe en fácil, se acreditan campañas completas de Joe–Trish y Joe–Daniela en normal. No se acredita una victoria con cada combinación de equipo y dificultad.
- Los contratos de las 104 cartas verifican su comportamiento principal según tipo, junto a pruebas específicas de efectos. No son una medición de cobertura de todas sus ramas ni un certificado de cada cruce entre cartas.
- La interfaz combina sesiones dirigidas con un recorrido de campaña en normal descrito en la sección 10. No se han pulsado todas las resoluciones desde la interfaz. La pantalla móvil es una ventana de 390×640, no un ensayo en un teléfono físico.
- La alternativa sin red conserva datos y opciones mecánicas. No distribuye todas las ilustraciones ni todos los textos oficiales traducidos; algunas cartas usan datos y ayuda local en lugar de su texto completo. La carga inicial de la aplicación sigue necesitando el servidor local; no se entrega una instalación PWA.
- La probabilidad mostrada es una estimación de una ficha y no modela las fichas adicionales ni las reacciones posteriores.
- Se han corregido y probado los casos de Masivo con Machete, eventos de evasión, movimiento, agotamiento y ataques. Esto no equivale a enumerar todos los cruces posibles entre cartas.
- Se conserva la copia legible inmediatamente anterior, no un archivo ilimitado de sesiones. Conviene exportar la campaña para trasladarla de equipo o conservar hitos.
- La referencia se revisó como código y datos locales; no se utilizó su servicio online ni se incorporó multijugador.

Con estas condiciones documentadas, la campaña queda como base de regresión para mantener el contenido actual y añadir después otro paquete sin perder estas garantías.

## 9. Integración con la versión remota

El 18/10/2026 se integró el cierre con `origin/main` en la revisión `56ab394`, que incorpora La gala del ecuador del invierno, los pasos de fase y textos adicionales. Se conservaron ambos trabajos y se adaptó la validación de sesiones para admitir el escenario independiente y sus seis resoluciones. Las pruebas añadidas verifican el guardado y la restauración de sus Invitados e historial, así como las imágenes de sus segundas caras.

La versión integrada supera **441 pruebas en 32 archivos**, los controles de tipos de los seis proyectos, lint, formato y compilación web. El paquete JavaScript pasa a 645,95 kB, 197,52 kB comprimido. Estos controles de integración complementan la aceptación de Brethren of Ash anterior; no amplían la auditoría funcional de cierre a La Gala.

## 10. Aceptación ampliada de los trabajos pendientes

Revisión del 18/10/2026 posterior al merge `571d7ec`. Las grabaciones nuevas contienen **1.052 decisiones** y se verifican en [extended-playthrough.test.ts](../packages/cards/src/brethren-of-ash/extended-playthrough.test.ts). Las correcciones de reglas tienen **15 regresiones específicas** en [acceptance-rules.test.ts](../packages/cards/src/core-2026/acceptance-rules.test.ts).

| Comprobación pendiente | Evidencia nueva | Resultado |
|---|---|---|
| Smoke con los seis objetivos | [Semilla 433](evidencias/smoke-and-mirrors-433.json), Joe con mazo propio de nivel 0, fácil; 159 decisiones. Servant derrotado y cinco habitantes interrogados. El sexto habitante es el heraldo apartado, no un séptimo objetivo. | R1; seis Élite resueltos, sin cartas bajo localizaciones. |
| Queen por combate | [Semilla 807](evidencias/combate-queen-of-ash-807.json), 72 decisiones; continúa ese Smoke y compra dos Bodyguard de nivel 2 y Charisma con los 7 XP ganados. | R1, Elokoss derrotado y Collector ganado. |
| Queen por pistas | [Semilla 955](evidencias/queen-of-ash-955.json), 91 decisiones; continúa el Smoke de semilla 1 de la campaña original. | R2, cinco pistas sobre Elokoss y Collector ganado. |
| Campaña en normal con Joe–Trish | Spreading [286](evidencias/duo-normal-spreading-flames-286.json), Smoke [1](evidencias/duo-normal-smoke-and-mirrors-1.json), Queen [23](evidencias/duo-normal-queen-of-ash-23.json); mazos iniciales, 328 decisiones. | Tres escenarios enlazados, R2 → sin resolución → R3; campaña ganada. **Invalidada el 31/10/2026:** la R2 de Spreading aprovechaba el error E1 del [doc 100](100-revision-general-2026-10-31.md); pendiente de volver a grabarse. |
| Campaña en normal con Joe–Daniela | Spreading [278](evidencias/equipo-normal-spreading-flames-278.json), Smoke [1](evidencias/equipo-normal-smoke-and-mirrors-1.json), Queen [20](evidencias/equipo-normal-queen-of-ash-20.json); mazos propios de nivel 0 validados, 402 decisiones. | Tres escenarios enlazados, R2 → sin resolución → R3; campaña ganada. |

**Alcance de las grabaciones:** Smoke 433 empieza en una preparación aislada del segundo escenario con registro vacío; no se atribuye a un Spreading anterior que no se haya jugado. Queen 807 prolonga ese recorrido aislado. Sus archivos llevan `scope: isolated-scenario` e `isolated-continuation`. Las otras dos campañas parten de `newCampaign`, validan los mazos y comparan la campaña completa antes de cada escenario, sin editar estados, bolsas, resultados ni registros. Las retiradas de Smoke y el sacrificio de los investigadores en Queen R3 son finales legales; estas pruebas no se presentan como una victoria con supervivientes en todos los escenarios.

### Reglas corregidas durante la aceptación

- **Masivo:** consulta común de enfrentamiento implícito para Machete y eventos de evasión; solo cuenta mientras está preparado y en la misma localización. No entra en una zona de amenaza ni acompaña al investigador al moverse. Se prueban ataques sin duplicar, agotamiento, otro enemigo enfrentado y desaparición del atacante antes de terminar la fase.
- **Bodyguard:** un apoyo derrotado sale del juego antes de su reacción. Su último estado permite reaccionar, pero ya no puede recibir más daño ni volver a disparar su derrota durante una cadena con In Harm's Way. Una derrota de enemigo ya resuelta no concede victoria dos veces ni rompe la cola.
- **Costes de habilidades:** usos y agotamiento de investigaciones, secreto de Local Map, pistas para robar bajo una localización, pago de Northside y descarte de French Hill se pagan antes de ataques de oportunidad. La universidad paga el apoyo del descarte con su descuento antes del ataque y resuelve la carta después. French Hill no ofrece descartar una mano formada solo por debilidades.
- **Movimiento por efectos:** entrar en una localización sin revelar exige sus pistas también con movimiento gratuito, incluido el signo arcano de Trish. Si no se pueden pagar, no se ofrece el destino. El movimiento normal paga antes del ataque de oportunidad y no cobra de nuevo al ejecutar el desplazamiento. Una localización ya revelada no vuelve a cobrar ese coste.

El ensayo inicial de Queen con Joe–Trish descubrió la entrada gratuita indebida a la cisterna. Esa grabación se descartó y se sustituyó por la semilla 23, reproducida después de corregir la regla. No se conserva como evidencia de aceptación un recorrido que aprovechaba el fallo.

### Aceptación en la interfaz

Se pulsaron las **328 decisiones** de la campaña Joe–Trish en normal: 185 de Spreading, 9 de Smoke y 134 de Queen. Las últimas **44 decisiones de Queen** se ejecutaron en la ventana móvil de **390×640**. Se comprobaron recargas durante los escenarios y en el registro, paso al escenario siguiente, pagos, reacciones, cierre de los tres resultados y nota final de campaña ganada en español.

Para hacer el ensayo reproducible se importaron, mediante la interfaz normal, preparaciones de la misma campaña entre escenarios. Antes se comprobó el botón que inicia el siguiente escenario; la importación fija después su semilla de aceptación. No se afirma que todas las semillas de esta prueba procedieran del generador aleatorio de la interfaz. Dentro de cada escenario se usaron únicamente sus controles visibles, sin invocar el almacén ni escribir el almacenamiento desde la automatización.

La instancia de pruebas utilizó otro puerto y otro origen, separados de la partida del propietario en `localhost:5173`. El [acta de interfaz ampliada](evidencias/interfaz-aceptacion-ampliada.json) registra el recorrido y sus límites. Las capturas se conservan como artefactos locales de la sesión, fuera del repositorio.

### Dictamen y comprobación física pendiente

Las tareas de código, recorridos y aceptación automatizable quedan completadas dentro de este alcance. El acta final de esta ampliación está en [verificacion-aceptacion-ampliada.json](evidencias/verificacion-aceptacion-ampliada.json). La hoja de ruta y las notas de Masivo se han actualizado para retirar pendientes que ya estaban implementados.

Controles finales: **461 pruebas aprobadas en 34 archivos**, tipos de los seis proyectos, lint, formato, compilación web y `git diff --check`, sin errores. Se comprobaron los 31 enlaces locales de esta auditoría. JavaScript de 646,68 kB y 197,74 kB comprimido; se mantienen los avisos conocidos de tamaño y fuente resuelta en ejecución.

**La comprobación en teléfono físico sigue pendiente.** La consulta de dispositivos conectados no encontró ninguno. La ventana de 390×640 prueba el comportamiento adaptable, pero no acredita pantalla táctil, teclado virtual ni navegador de un teléfono real. Para cerrarla hacen falta un dispositivo y las cinco comprobaciones siguientes: abrir una campaña importada, mover y ampliar el mapa con gestos, jugar una carta y resolver una prueba, consultar ambas caras de plan/acto, y recargar y volver al registro conservando el resultado. No se marca esa prueba como realizada.

## Revisión de reglas · 29 de octubre de 2026

Se corrigen el daño directo de Fire! y Cosmic Evils, los empates de Fire!, Raising
Suspicions y Dark Magician, la selección sucesiva de Sectarios sin perdición de
Blasphemous Invocation y la protección de los apoyos de historia ante Putrid
Vapors. La búsqueda de Invocation permite elegir carta y zona. Se contrastan los
textos de cartas EN de la copia externa `E:/referencia/ArkhamHorror`.

Las grabaciones de combate y de equipos incorporan las nuevas decisiones de
empate y las consecuencias del daño directo. Se conservan sus desenlaces y las
aserciones de continuidad. La grabación individual de Queen con semilla 66 ya no
reproduce R3 bajo las reglas corregidas: se conserva como evidencia histórica y
se sustituye en las pruebas por [la semilla 23](evidencias/queen-of-ash-23.json),
118 decisiones legales que continúan el mismo Smoke y alcanzan R3. No se
parchean estados, resultados ni mazos para obtener estos recorridos.

La comprobación conjunta con Fanática cubre 796 pruebas en 35 archivos distintos,
incluidas 16 regresiones nuevas. Se conserva el resultado de 288 pruebas del
primer grupo y 502 de consumidores afectados; tras renovar las grabaciones solo
se repiten los tres archivos fallidos, que aprueban sus 18 pruebas. No se ejecuta
la suite global. Tipos de motor, cartas y web, lint de los archivos editados y
formato comprobados. Los cambios de reglas, sus consumidores o las grabaciones
afectadas invalidarían las comprobaciones correspondientes. No se abre navegador
ni se consulta CI o despliegue.
