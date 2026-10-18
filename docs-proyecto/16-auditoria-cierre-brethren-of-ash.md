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

**Distinción de evidencia:** estos recorridos emplean únicamente `startScenario`, `applyInput` y `finishScenario`. Las pruebas de resoluciones preparan estados finales deliberadamente para comprobar ramas concretas; no se contabilizan como partidas completas. No se presenta una victoria jugada de seis sospechosos en Smoke ni una partida completa de cada resolución de Queen como si se hubiese realizado.

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

- Las grabaciones de victoria usan Joe y dificultad fácil. Las matrices de preparación y los recorridos de derrota amplían equipos/dificultades, pero no acreditan una victoria con cada combinación.
- Los contratos de las 104 cartas verifican su comportamiento principal según tipo, junto a pruebas específicas de efectos. No son una medición de cobertura de todas sus ramas ni un certificado de cada cruce entre cartas.
- La interfaz se comprueba mediante sesiones dirigidas. Los recorridos íntegros se reproducen en el motor; no se han pulsado en el navegador todas las decisiones de todas las resoluciones. La pantalla móvil es una ventana de 390×640, no un ensayo en un teléfono físico.
- La alternativa sin red conserva datos y opciones mecánicas. No distribuye todas las ilustraciones ni todos los textos oficiales traducidos; algunas cartas usan datos y ayuda local en lugar de su texto completo. La carga inicial de la aplicación sigue necesitando el servidor local; no se entrega una instalación PWA.
- La probabilidad mostrada es una estimación de una ficha y no modela las fichas adicionales ni las reacciones posteriores.
- Se mantienen las simplificaciones de casos inusuales de enfrentamiento con Masivo descritas en el documento 12; no se afirma haber verificado todos los cruces posibles con cartas.
- Se conserva la copia legible inmediatamente anterior, no un archivo ilimitado de sesiones. Conviene exportar la campaña para trasladarla de equipo o conservar hitos.
- La referencia se revisó como código y datos locales; no se utilizó su servicio online ni se incorporó multijugador.

Con estas condiciones documentadas, la campaña queda como base de regresión para mantener el contenido actual y añadir después otro paquete sin perder estas garantías.

## 9. Integración con la versión remota

El 18/10/2026 se integró el cierre con `origin/main` en la revisión `56ab394`, que incorpora La gala del ecuador del invierno, los pasos de fase y textos adicionales. Se conservaron ambos trabajos y se adaptó la validación de sesiones para admitir el escenario independiente y sus seis resoluciones. Las pruebas añadidas verifican el guardado y la restauración de sus Invitados e historial, así como las imágenes de sus segundas caras.

La versión integrada supera **441 pruebas en 32 archivos**, los controles de tipos de los seis proyectos, lint, formato y compilación web. El paquete JavaScript pasa a 645,95 kB, 197,52 kB comprimido. Estos controles de integración complementan la aceptación de Brethren of Ash anterior; no amplían la auditoría funcional de cierre a La Gala.
