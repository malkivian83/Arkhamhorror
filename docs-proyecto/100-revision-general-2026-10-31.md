# 100 · Revisión general de la aplicación — 31/10/2026

Revisión de solo lectura sobre `8f75fee7` (motor, cartas y escenarios, web,
servidor y guardados). Objetivo: detectar errores, desviaciones de las reglas y
puntos que restan dinamismo al juego. Las recomendaciones están **ordenadas por
prioridad, con los errores primero**.

## Estado de las correcciones

Corregidos con pruebas el 31/10/2026: **E1, E2, E3, E5, E6 y E7**.

- **E1:** `SetAsideEnemy` acepta `card` y recupera el enemigo de la zona de
  victoria, restando sus puntos.
- **E2:** `PlaceDoomOnAsset`, `PlaceDoomOnEnemy` y `PlaceDoomOnInvestigator` ya
  no comprueban el plan salvo con `checkAgenda: true`. Los `checkAgenda: false`
  existentes quedan como redundantes. La referencia solo comprueba el umbral en
  mitos o cuando la carta lo dice, y ninguno de los consumidores revisados lo dice.
- **E3:** la mesa muestra la perdición que usa el motor, con desglose EN/ES en el
  `title`.
- **E5:** Wild Flames aplica el trauma físico antes de la derrota.
- **E6:** la eliminación descarta la zona de amenaza y las traiciones propias que
  no estén resolviéndose.
- **E7:** con «solo X», el cazador calcula la ruta solo hacia X.

La grabación Joe–Trish de Spreading Flames (`duo-normal-spreading-flames-286`)
alcanzaba la R2 gracias a E1: el Servant seguía en la zona de victoria y se
saltaba Blaze of Glory. Ya no acredita una campaña legal. Se conserva como
regresión de E1, y la campaña Joe–Trish queda pendiente de volver a grabarse;
la del segundo equipo sigue verificándose completa. Con la política por defecto
de `closure-explore.mjs` (semillas 1–400) no se encontró ninguna victoria nueva.

Bloque de fluidez, también con pruebas: **E4, E11, D1, D2 y D3**.

- **E4:** la mesa guarda con `writeSession(..., { trustedHistory: true })`, que valida la
  estructura sin rejugar el historial: de 60–92 ms a unos 2,5 ms por decisión en las
  grabaciones de 99–118 decisiones. Cargar, importar y recibir guardados sigue
  rejugándolo. La biblioteca reutiliza el texto guardado y cachea el canónico de su copia.
- **E11:** `answer` ignora la entrada mientras la mesa visible va por detrás del estado
  más reciente (animación de movimiento), sea un clic o un atajo.
- **D1:** `needsSpotlight` deja el modal para robos de encuentro, reversos que se
  descubren y enemigos o traiciones que llegan. Apoyos propios, Lugares, actos, planes e
  historias se muestran en un aviso que se cierra solo en 1,5 s.
- **D2:** el resumen de pasos automáticos se muestra completo, con un solo botón;
  Escape también lo cierra.
- **D3:** sin cambiar las preguntas del motor (las grabaciones las registran), la mesa
  revela la ficha cuando no hay nada que comprometer (0,8 s) y aplica el resultado
  (1,6 s). Se puede detener en cada prueba o desactivar desde el panel. La estimación de
  probabilidades sigue a petición.

Campaña y mazos, con pruebas en `campaign-purchases.test.ts`: **C1–C6** (ver la ampliación).

- **C1:** la tienda descarta los rasgos excluidos y `purchase` rechaza con `DeckProblemError`
  cualquier compra que añada un problema de construcción nuevo, antes de gastar XP.
- **C2:** se ofrece la mejora desde cada versión inferior. Sin indicar cuál, se usa la de
  menor diferencia, también online.
- **C3:** `owedFills` cuenta los huecos que abren las mejoras a Permanente, y esos se
  rellenan pagando. Solo existe mientras hay huecos, así que los guardados no cambian.
- **C4:** `deckIssues` usa las mismas reglas que `startScenario`. `canPlayNext` no
  deja continuar con un mazo inválido, la campaña muestra el motivo y `playNext` ya no
  falla en silencio.
- **C5:** al crear un mazo no se admiten apoyos de historia ni debilidades de campaña.
- **C6:** la hoja de mejoras solo da gratis una copia nueva; la segunda cuesta su nivel,
  con un mínimo de 1.

Quedan pendientes las revisiones visuales de E3, D1, D2 y D3, además de C4 en la pantalla de
campaña. El resto de puntos sigue abierto.

## Método y límites

- Lectura dirigida del código por áreas y contraste con el reglamento 2026
  (`reglas/ahc100_rulebook-web.pdf`) y con la referencia local.
- Reproducciones temporales fuera del repositorio (scratchpad) para los
  hallazgos marcados como **reproducido**. Pruebas existentes ejecutadas y
  correctas: `brethren-of-ash` (139), `excelsior` + `midwinter-gala` (239) y
  `gala-playthrough` (7).
- Comparación de los 865 registros de `packages/cards/src/data/*.json` con el
  catálogo: **sin desviaciones** de coste, XP, iconos, ranuras, salud/cordura,
  rasgos ni límites. Sin códigos duplicados.
- Sin navegador ni suite completa (según `AGENTS.md`). La revisión visual queda
  pendiente.
- Confianza: **confirmado** (leído en el código), **reproducido** (con una
  prueba temporal) o **plausible** (por confirmar).

## Resumen

El motor es sólido en lo esencial: estructura de ronda, ataques de oportunidad,
cazadores, pruebas de habilidad, mazo vacío, eliminación básica y determinismo
están bien. El servidor de partidas online es autoritativo y oculta la
información secreta. Los problemas más serios son:

1. Spreading Flames se puede **ganar saltándose el clímax**.
2. El plan **avanza fuera de la fase de mitos** al colocar perdición en cartas.
3. La mesa **muestra una perdición menor** que la que usa el motor.
4. **Cada clic guarda rejugando toda la partida**, lo que la ralentiza cuanto
   más avanza.

En dinamismo, el mayor margen está en reducir modales y confirmaciones: cada
prueba de habilidad cuesta al menos 3 clics, y cada carta que entra en juego
abre una ventana.

---

## Prioridad 1 · Errores que rompen reglas o el flujo de partida

### E1 · Alto · reproducido — Spreading Flames: victoria sin clímax

- `packages/cards/src/brethren-of-ash/spreading-flames.ts:859` (acto Escape the
  Dorms) y `packages/engine/src/handlers.ts:6996-7015` (`SetAsideEnemy`).
- Si el Servant of Flame se derrota antes del acto 3, ya está en la zona de
  victoria. `SetAsideEnemy` solo busca en juego y en el descarte de encuentros,
  así que no lo aparta y `SpawnSetAsideEnemy` no hace nada. El objetivo del
  acto 4 (`victoryDisplay.includes(servant)`) se cumple al instante: se salta
  Blaze of Glory y se llega a la R1.
- **Arreglo:** que `SetAsideEnemy` busque también en la zona de victoria (y en
  el resto de zonas fuera de juego), y que aparte la carta curada. Añadir una
  regresión «enemigo derrotado antes de su reaparición programada» en todos los
  escenarios que reaparecen enemigos apartados.

### E2 · Alto · reproducido — El plan avanza fuera de la fase de mitos

- `handlers.ts:334-347` (`PlaceDoomOnAsset`), `:5392-5396`
  (`PlaceDoomOnEnemy`), `:7463-7470` (`PlaceDoomOnInvestigator`, que ni siquiera
  admite `checkAgenda: false`) y `:680` (`startingDoom` al aparecer).
- Las tres colocaciones encolan `CheckAgenda` por defecto, y `CheckAgenda`
  (`:349`) no comprueba la fase. Según el reglamento, el plan solo avanza en el
  paso de comprobación de mitos, salvo que la carta lo indique (como Doomed o
  Cosmic Evils).
- Reproducción: en la fase de investigación de la ronda 1, 3 de perdición sobre
  un investigador hacen avanzar el plan.
- Afecta al signo arcano de Marie Lambeau (`marie-lambeau/card-05006.ts:31,37`),
  a Baron Samedi, a `core-2026/cards.ts:848`, a la ficha de sectario de
  Midnight Masks y Devourer Below, y a los enemigos que aparecen con perdición.
- Los lotes recientes (doc 99) lo evitan carta a carta con `checkAgenda: false`.
  Es un parche que hay que recordar cada vez.
- **Arreglo:** invertir el valor por defecto (sin comprobar), y que solo las
  cartas que lo dicen pidan `checkAgenda: true`. Revisar los consumidores
  actuales con una prueba por caso.

### E3 · Alto · confirmado — La mesa muestra una perdición distinta de la del motor

- `apps/web/src/components/ScenarioRow.vue:101` y `:144` muestran `state.doom` y
  `secondAgenda.doom`. El motor compara el umbral con `totalDoom(state)`
  (`handlers.ts:8192`), que suma la perdición de enemigos, apoyos, lugares e
  investigadores, o con `thresholdDoom`.
- El jugador ve 2/7 cuando en realidad hay 3/7: decide mal y el avance del plan
  le parece arbitrario.
- **Arreglo:** mostrar `totalDoom`/`thresholdDoom` y `secondAgendaDoom` (ya se
  exportan) con un desglose en el `title`.

### E4 · Alto · confirmado y medido — Cada decisión guarda rejugando toda la partida

- `apps/web/src/stores/game.ts:99-110` → `packages/saves/src/session.ts:576-582`.
  `writeSession` llama a `decodeSession(raw)`, que con `verifyHistory` rejuega
  el historial completo. Se ejecuta de forma síncrona antes de pintar.
- Medido: 72 ms con 99 decisiones y 128 ms con 118 (≈1 ms por decisión). Un
  escenario de 500–800 decisiones costaría 0,5–1 s por clic, más en móvil. Con
  cuenta, `trackGame` añade otra serialización y deshacer rejuega dos veces.
- **Arreglo:** no reverificar el historial en las escrituras propias (solo al
  cargar o importar), y diferir `persist` tras el pintado (`requestIdleCallback`
  o un debounce corto).

### E5 · Medio · reproducido — Wild Flames no aplica el trauma físico

- `spreading-flames.ts:820-828`: `onAdvance` solo emite `DefeatInvestigator`. El
  comentario y el doc 09 indican además 1 trauma físico para cada investigador.
  La «sin resolución» (`:378-382`) solo añade trauma mental.
- **Arreglo:** añadir el trauma físico explícito y una prueba de campaña.

### E6 · Medio · confirmado — La eliminación no vacía la zona de amenaza

- `handlers.ts:3897-3990` (`EliminateInvestigator`) no toca `state.treacheries`,
  y `forcedAbilities` (`:8776`) sigue disparando esas traiciones.
- Regla: las cartas de su zona de amenaza se descartan y sus debilidades se
  retiran. Hoy las traiciones de encuentro no vuelven al descarte y sus forzados
  siguen afectando a la partida.

### E7 · Medio · reproducido — Cazadores con «Presa (solo X)»

- `packages/engine/src/state.ts:518-535`: `huntingSteps` calcula el más cercano
  entre todos los investigadores. Si X no lo es, se usa el más cercano igualmente,
  y con `nearest === 0` el enemigo no se mueve aunque X esté en otro sitio.
- Afecta a la debilidad `core-2026/weaknesses.ts:92`, a Serpents of Yig y a
  Nathaniel Cho.
- **Arreglo:** con «solo», calcular la ruta como si X fuera el único investigador.

### E8 · Medio · confirmado — Excelsior: «¿Qué has hecho?» (84005) baraja la debilidad en el mazo equivocado

- `excelsior/assets.ts:208`: `ShuffleTreacheryIntoDeck` envía el investigador
  que activa la acción, y `handlers.ts:7803` le da prioridad sobre
  `treachery.owner`. Si la activa un compañero, la debilidad acaba en su mazo.
- **Arreglo:** usar el dueño, y validar en todos los `Shuffle*IntoDeck` que el
  destino es el dueño salvo que la carta diga otra cosa.

### E9 · Medio · confirmado — Excelsior: R2/R3 conservan anotaciones indebidas

- `excelsior.ts:459` y `:467` graban las anotaciones antes de elegir «Volver a
  jugar», y `finishScenario` (`campaign.ts:624`) conserva el registro. El texto
  de R2/R3 indica no anotar nada salvo el trauma.
- **Arreglo:** aplicar las anotaciones después de la elección.

### E10 · Medio · confirmado — Perdición de apoyos colocados fuera del recuento

- `totalDoom` (`handlers.ts:8192`) y `withoutCardDoom` (`:8175`) ignoran
  `placedAssets[].doom`, que `PlaceAsset` sí guarda (`:1838`). Caso real: Jewel
  of Sarnath en La Gala (`gala.ts:592`). No cuenta para el umbral ni se descarta
  al avanzar el plan.

### E11 · Medio · plausible — Atajo de teclado durante la animación de movimiento

- `stores/game.ts:116-172` y `shortcuts.ts:70-100`: durante la transición de
  movimiento (hasta 400 ms), el índice se calcula sobre el estado visible y se
  aplica al más reciente. Pulsar D, R o 1–9 en ese momento puede ejecutar otra
  opción.
- **Arreglo:** ignorar la entrada mientras `state !== latest`, o resolver por
  identificador de opción sobre `latest`.

### E12 · Bajo — Reglas de menor impacto

| Caso | Dónde | Problema |
| --- | --- | --- |
| Daño punto a punto | `handlers.ts:2739-2786` | Cada punto es un `TakeDamage` con su `CheckDefeat`. Con apoyos que puedan absorber daño, desaparece la elección de trauma ante una derrota simultánea. |
| Horror negativo | `handlers.ts:5968-5971` | El horror de un ataque no se limita a 0 (el daño sí) y puede curar. |
| Eliminado en su turno | `EliminateInvestigator` | No limpia `activeTurn` ni ejecuta `EndTurn`; no se disparan `turnEnds` ni `endOfTurn` (plausible). |
| Orden decidido por el jefe | `handlers.ts:6383-6397`, `:8804` | Los ataques del enemigo masivo y los forzados simultáneos siguen un orden fijo; debería decidirlo el jefe. |
| Ventanas de jugador | `handlers.ts:236-252` | Faltan al empezar la investigación, entre turnos y tras el movimiento de los cazadores. |
| Presa por habilidad | `state.ts:504-506` | Compara la habilidad impresa, no la modificada (plausible). |
| Bloqueo: bolsa vacía | `handlers.ts:4249`, `:4468` | Sin fichas, `ResolveSkillTest` lanza un error y la partida se atasca. |
| Bloqueo: lugar retirado | `handlers.ts:2184` | `MoveTo` lanza un error si el destino se retira con el movimiento encolado. |
| Desenfrentar/preparar | `handlers.ts:6177`, `:6209` | No comprueban el enfrentamiento automático. |
| Queen of Ash, Stop the Rite | `queen-of-ash.ts:640-650` | Solo mueve a los Sectarios no enfrentados e incluye a los que ya están en la cisterna. |
| Smoke and Mirrors, Armitage | `smoke-and-mirrors.ts:494-496` | Busca al portador sin descartar investigadores muertos o sustituidos (plausible). |
| La Gala | `gala.ts:279-287`, `:534` | El Líder aliado va siempre al jefe (debería elegirse); con el mazo de encuentros vacío solo se reparten 2 misterios. |
| Excelsior | `excelsior.ts:293`, `plot.ts:75,504` | El Vestíbulo gasta la acción sin permitir cancelar; «3 o 4 investigadores» usa el número inicial. |
| Quantum Flux / Nothing Left to Lose | `tools-parley/events.ts:120-160` | Con el amuleto de Wendy, `RemoveFromDiscard` retiraría otra copia (plausible). |
| Firmas de Core 2026 | `12002–12015`, `12098–12104` | Sin `deckLimit`. Comprobar que las debilidades básicas no admiten 2 copias (`decks.ts:231`). |

---

## Prioridad 2 · Seguridad, servidor y guardados

### S1 · Medio · confirmado — Robo de cuenta preparado antes del registro

- `apps/server/src/accounts/auth.ts:210-215` y `:265-267`. Un atacante registra
  el correo de la víctima con su contraseña. Cuando la víctima se registra, el
  `INSERT IGNORE` no la sustituye, pero se le envía el enlace de verificación. Al
  pulsarlo, la cuenta queda verificada **con la contraseña del atacante**. La
  activación manual del panel (`dashboard.ts:33-43`) tiene el mismo efecto.
- **Arreglo:** guardar el hash de la contraseña en el token de verificación y
  aplicarlo al verificar, o exigir que se fije la contraseña en ese momento.

### S2 · Medio · plausible — Límite de peticiones compartido tras Passenger

- `app.ts:22`: `trustProxy` solo confía en `127.0.0.1` y `::1`. Si Passenger
  conecta por socket Unix, todas las peticiones podrían compartir la clave del
  limitador: 10 intentos de acceso cada 10 minutos para **todo el sitio**, y
  300/min que agotarían unos 10 jugadores sondeando cada 2 s.
- **Arreglo:** registrar `req.ip` una vez en producción y ajustar `trustProxy` o
  el `keyGenerator`.

### S3 · Medio · confirmado — Versiones y migraciones de partidas

- Salas online (`online/lobbies.ts:80-87`): `lobby.game` se carga con
  `JSON.parse` sin comprobar `engineVersion`, `scenarioRulesVersion` ni
  `CONTENT_VERSION`. Tras un despliegue que cambie reglas, la partida continúa
  incoherente o falla con 500 permanente.
- Guardados (`packages/saves/src/session.ts:88-91`): se exige igualdad estricta
  de versiones y no hay migraciones. `CONTENT_VERSION` no ha cambiado pese a
  muchos lotes, así que los estados antiguos se cargan con reglas nuevas sin
  control.
- **Arreglo:** política de versionado (cuándo subir cada versión), cadena de
  migraciones y conservación del original si no se puede migrar.

### S4 · Medio · confirmado — Ciclo de vida de las salas

- No se puede salir, expulsar, cerrar ni transferir la propiedad. Avanzar de
  escenario solo lo puede hacer el creador (`lobbies.ts:186`, `:221`). Si el
  creador borra la cuenta, el `ON DELETE CASCADE` elimina la partida de todos.
  No hay límite de salas por usuario ni limpieza de salas abandonadas.
- `lobby.commands` crece sin límite (`lobbies.ts:153`, `:266`), y cada sondeo
  lee y reescribe ese JSON.

### S5 · Bajo — Otros puntos del servidor

- Una cuenta creada solo con Google no se puede borrar
  (`auth.ts:450-457`); relevante para el RGPD.
- Los errores 500 solo registran `error.name` (`app.ts:55-59`): un `EngineError`
  en producción no se puede diagnosticar. Registrar mensaje y pila en el servidor.
- Sin purga de sesiones caducadas, `account_tokens`, `oauth_requests`,
  `account_activity` ni `document_operations`. La cuota no cuenta los documentos
  borrados.
- Sin CSP, HSTS ni `frame-ancestors`. Registro y reenvío de verificación sin
  límite por destinatario.
- Semilla del azar online de 31 bits (`lobbies.ts:233`, `:392`): mejor 64 bits.
- Retirar `ADMIN_PASSWORD` del `.env` tras el primer despliegue.

---

## Prioridad 3 · Dinamismo y experiencia de juego

| # | Mejora | Dónde | Propuesta |
| --- | --- | --- | --- |
| D1 · Alto | Un modal «De acuerdo» por cada carta que entra en juego (también apoyos propios, lugares revelados, actos y planes) | `packages/shared/src/cardEntries.ts:86-150` (`DrawSpotlight`) | Modal solo para encuentros y revelaciones. El resto, como aviso que se cierra solo en ~1,5 s. |
| D2 · Alto | Pasos automáticos que se descubren de uno en uno: 5–10 clics por ronda | `AutoStepsReview.vue:30-40` | Mostrar todos los pasos con un único «Continuar», o un resumen no modal con «ver detalle». |
| D3 · Alto | Cada prueba de habilidad cuesta al menos 3 clics | `handlers.ts:3528-3535`, `:4528-4540` (`alwaysAsk`) | No abrir la ventana de compromiso si no hay nada que comprometer; revelar automáticamente cuando sea la única opción; aplicar el resultado tras ~1 s cancelable; mostrar la probabilidad sin pulsar. |
| D4 · Medio | La asignación de daño pide una decisión por punto | `handlers.ts:2765` | Interfaz de reparto (+/−) en un solo paso. Corrige también la derrota simultánea de E12. |
| D5 · Medio | En móvil, Robar, Recurso, Fin de turno y «Saltar» solo están en un panel oculto por debajo de 900 px | `SidePanel.vue:87-95`, `GameView.vue:272-282` | Barra de acciones fija en `PlayerArea` y cerrar el panel al responder. La mesa móvil del prototipo (`diseno-movil`) sigue sin implementar. |
| D6 · Medio | En táctil, cada acción son dos toques | `TableTarget.vue:86-96` | Un toque ejecuta si la opción es directa y la pulsación larga inspecciona. |
| D7 · Medio | Online: parpadeo en cada clic, sondeo completo cada 2 s y sin aviso con la pestaña oculta | `online/table.ts:138-149`, `OnlineGame.vue:44-48` | Mantener las opciones visibles y deshabilitadas (`aria-busy`); `?since=revision` con 304 o SSE; aviso en el título o con `Notification`. |
| D8 · Medio | Online: los compromisos de otros los decide el investigador activo (R2 del doc 68) | `handlers.ts:3558` | Preguntar a cada ayudante y aparcar la pregunta. Imprescindible para jugar online de verdad. |
| D9 · Medio | Online: sin revisión visual del avance de acto y plan | `online/table.ts:186` | Reutilizar la revisión del doc 19. |
| D10 · Medio | Falta información clave en la mesa | `ScenarioRow.vue:166-177`, `PlayerArea` | «Pistas del grupo / necesarias» en el acto; destello en las fichas de daño y horror al cambiar (los ataques de oportunidad solo aparecen en el diario). |
| D11 · Bajo | Errores del motor sin traducir | `App.vue:142`, `SkillTestPanel.vue:298` | Códigos de error con textos EN/ES. |
| D12 · Bajo | Accesibilidad | `ChoiceModal.vue:46-73`, `TableTarget.vue:86-105`, `AutoStepsReview`, `SkillTestPanel.vue:210` | `role="dialog"`/`aria-modal` y foco; foco en el menú teletransportado; Escape que cierre; texto alternativo con el nombre de la carta y no con el código. |
| D13 · Bajo | Rendimiento del diario y de la mesa | `SidePanel.vue:24,147`, `PlayerArea.vue:203-216`, `TableTarget.vue:129-132` | Claves estables en el diario y no forzar el desplazamiento si se está leyendo; `computed` para `effectiveVitals`; listeners globales solo con el menú abierto. |

---

## Prioridad 4 · Calidad, pruebas y mantenimiento

1. **Pruebas globales de datos:** comparar cada registro de `data/*.json` con el
   catálogo y exigir `deckLimit: 1` en firmas y debilidades. Comprobar también
   que todo código jugable con texto de reglas tiene comportamiento registrado o
   está marcado como «sin efecto». Hoy está limpio, pero solo lo garantizan los
   scripts de importación.
2. **Partidas completas sembradas** como las de G17 para Excelsior (hoy solo hay
   mesas dirigidas), y al menos una victoria de La Gala con 3–4 investigadores y
   en Difícil.
3. **Regresiones transversales** para E1 y E2: reaparición de enemigos apartados
   y avance del plan solo en mitos.
4. **`handlers.ts` tiene 9.700 líneas.** Partirlo por dominios (pruebas de
   habilidad, enemigos, perdición, eliminación) cuando haya que tocar esas zonas,
   no como refactorización aparte.
5. **Documentación desactualizada:**
   - La hoja de ruta (doc 05) sigue diciendo que el multijugador online está
     «fuera del alcance», aunque los docs 69–71 ya lo implementan.
   - El índice de `docs-proyecto/README.md` termina en el 67 y hay numeraciones
     repetidas (68, 69, 71, 89, 93).
6. **Higiene del repositorio:**
   - `dist/` ocupa 792 MB y `apps/web/dist-fidelity-check/` 510 MB; esta última
     no está en `.gitignore`.
   - Unos 50 `tmp-*.log` y `tmp-gala-*.jsonl` en la raíz: moverlos a una carpeta
     ignorada o borrarlos.
   - `/api/ws` es un esqueleto sin lógica: retirarlo o completarlo.

---

## Lo que está bien (sin cambios necesarios)

- Sin fase de mitos en la ronda 1. Orden de mitos correcto y robo de encuentros
  en orden de jugadores.
- 3 acciones por turno y acciones adicionales. El jefe elige el orden de turnos.
- Ataques de oportunidad: momento y excepciones correctos (luchar, evadir,
  parlamentar, retirarse, rápido).
- Fase de enemigos: cazadores por el camino más corto, desempate por presa y
  decisión del jefe; enemigos que atacan y se agotan.
- Mantenimiento: preparar, robar 1, ganar 1 recurso y límite de mano de 8.
- Palabras clave: Distante, Represalia, Alerta, Masivo, Esquivo y Condenado.
- Pruebas de habilidad: mínimos a 0, empate con éxito, fallo automático por
  encima del éxito automático, ayudantes con 1 carta y Peligro.
- Mazo vacío y mazo de encuentros vacío.
- Revelaciones tras completar un robo múltiple (R1 del doc 68, corregido).
- Determinismo: RNG en el estado, sin `Math.random` ni `Date`.
- Las acciones legales salen del motor y no se reimplementan en la web.
- Las preguntas de una sola opción se resuelven solas, salvo las `alwaysAsk`.
- Paridad de claves EN/ES verificada por prueba.
- Servidor:
  - Argon2id, cookie `__Host-`, CSRF y Google con PKCE y nonce.
  - SQL parametrizado y aislamiento por propietario.
  - Partida online autoritativa, idempotente y serializada con `FOR UPDATE`.
  - Vista online por lista blanca, sin el RNG ni los mazos ajenos.
- Datos de las 865 cartas coherentes con el catálogo. Los 21 límites «una vez
  por…» están implementados.

## Orden de trabajo sugerido

1. **Lote de reglas (P1):**
   - Corregir E1, E2, E3, E5, E6 y E7.
   - Añadir regresiones de E1 y E2.
   - Probar en el motor y en los escenarios afectados.
2. **Fluidez:**
   - Corregir E4 (guardado) y E11 (atajos).
   - Aplicar D1, D2 y D3.
   - Juntos son la mayor ganancia de dinamismo percibido.
3. **Seguridad:**
   - Corregir S1.
   - Comprobar S2 en producción.
   - Registrar los errores 500 con mensaje y pila.
4. **Online:**
   - Implementar D8 (R2), D7 y D9.
   - Añadir el ciclo de vida de las salas (S4).
   - Validar las versiones de las salas (S3).
5. **Resto de E8–E12, D4–D13 y prioridad 4,** agrupados por zona de código.

## Ampliación · segunda revisión (31/10/2026)

Se revisan áreas que la primera pasada no cubrió: construcción de mazos y
progresión de campaña, carga de la web, rendimiento del motor, pruebas y
repositorio. También son de solo lectura: reproducciones en scratchpad y
mediciones con las grabaciones de `docs-proyecto/evidencias`.

Los pasos 1 y 2 del orden anterior están hechos. S1 queda mitigado solo para
quien entra con Google (`ebdb329c`); el registro con contraseña sigue expuesto.

### Errores de campaña y mazos

- **C1 · Alto · reproducido — La tienda no revalida el mazo.** Rex Murphy puede
  comprar cartas con el rasgo Fortune, que tiene excluido (17 ofertas, p. ej.
  Well-Funded), y Lola puede bajar del mínimo de su clase. La XP se gasta y
  después `startScenario` lanza un error: con 0 XP la campaña queda bloqueada.
  Reglamento p. 29. `packages/cards/src/campaign.ts:759-775` y `:835-866`.
- **C2 · Alto · reproducido — Mejora desde la copia equivocada.** Siempre se usa
  la primera copia de menor nivel. Con Shrivelling (0) y (3) en el mazo, la
  versión (5) solo se ofrece desde (0), por 5 XP en lugar de 2; con 2–4 XP ni
  aparece. Reglamento p. 22. `campaign.ts:785-795`.
- **C3 · Medio · reproducido — Mejoras a una versión Permanente.** Higher
  Education 3, Keen Eye, Streetwise, Blood Pact y Scrapper dejan el mazo en 29/30,
  y la carta de nivel 0 para completarlo sale gratis. Ese relleno gratuito solo
  vale tras retiradas forzosas (FAQ 1.18); el mínimo es 1 XP (FAQ 1.8).
  `campaign.ts:757`, `:785-788` y `:803`.
- **C4 · Medio · confirmado — «Jugar siguiente» falla en silencio.** Con un mazo
  ilegal o corto, `canPlayNext` no lo valida y `playNext` no captura el error.
  En Fortune and Folly, una carta exiliada sin cambios de mazo permitidos podría
  bloquear la Parte II (plausible). `campaign.ts:360-368` y
  `apps/web/src/stores/game.ts:230-234`.
- **C5 · Medio · reproducido — Cartas de historia y debilidades sin validar.**
  `validateDeck` acepta un mazo importado con tres copias de 02140 o con
  12115/01117. Reglamento p. 21. `packages/cards/src/decks.ts:50-54` y `:219`.
- **C6 · Medio · reproducido — Segunda copia gratis de una personalizable.** Se
  pueden añadir dos copias pagando solo las casillas; la segunda debe costar al
  menos 1 XP (FAQ p. 42). `campaign.ts:922-931` y `CustomizationSheet.vue:79-90`.
- **C7 · Bajo · reproducido — Debilidad básica aleatoria.**
  - Sale solo de las 8 de la caja de 2026: faltan Unaware, Atychiphobia,
    Self-Destructive y Obsessive.
  - Cada investigador sortea por separado: hubo debilidades repetidas en 30 de
    199 semillas.
  - `decks.ts:285-291` y `campaign.ts:238-241`.
- **C8 · Bajo · confirmado — Collector y detalles menores.**
  - El Relic/Charm adicional no se puede comprar ni mejorar entre escenarios, y
    `validateDeck` cuenta ese hueco en el límite de 5 cartas de otras clases de
    Dunwich.
  - Además: las Permanentes se cuentan de forma distinta en compra y validación,
    un sustituto se valida con recompensas distintas y la tienda ofrece cartas de
    otras clases con el límite ya alcanzado.
  - `campaign.ts:773`, `:860` y `decks.ts:181-188`.

Comprobado como correcto: tamaño y cartas exclusivas, límite por título en
todos los niveles, acceso por clase y nivel (incluidas las multiclase), costes
de XP y Excepcionales, casillas de las personalizables, trauma, inicio con
trauma, sustitutos, persistencia del registro y de la bolsa, y recompensas.

### Rendimiento y carga

- **O1 · Alto · medido — Carga inicial pesada.** La portada precarga un trozo de
  3,2 MB (unos 850 KB comprimido con gzip y 590 KB con brotli) que incluye los
  textos EN y ES de todas las campañas (22 JSON, unos 2 MB), el motor y las cartas.
  `router.ts` importa de forma directa la mesa, la preparación, el editor de mazos
  y la campaña. Propuesta:
  - rutas diferidas;
  - cargar solo el idioma activo (`setLocaleMessage`);
  - separar los textos de cada campaña;
  - cargar el motor solo al abrir la mesa.
- **O2 · Medio — `/local-assets` sin caché.** Los 864 MB de imágenes y audio no
  llevan `Cache-Control` en `.htaccess` (solo `/assets/`), así que el navegador
  decide cuándo revalidarlos. Propuesta: `max-age` largo con revalidación, o
  versionar sus rutas desde el manifiesto.
- **O3 · Medio · medido — Deshacer y cargar rejuegan desde el principio.** El
  motor es rápido (0,6–1 ms por decisión, pico de 18 ms), pero deshacer o cargar
  245 decisiones cuesta unos 0,2 s y crece con la partida. Propuesta: guardar un
  punto de control cada N decisiones y rejugar solo desde el último.
- **O4 · Medio · medido — Suite de 451 s, el 72 % en importar módulos.** Cada
  archivo de prueba vuelve a cargar el registro completo de cartas. Propuesta:
  probar `isolate: false` o el pool de hilos en los proyectos `engine` y `cards`,
  vigilando las cartas de prueba registradas con el mismo código en varios
  archivos.
- **O5 · Bajo — Bucle del motor.** `run` gasta más tiempo propio que `handle`:
  copia la cola en cada mensaje y recorre investigadores, apoyos y descarte para
  detectar cambios. Se puede optimizar con un índice sobre la cola y
  comprobaciones guiadas por el tipo de mensaje. No es urgente.

### Operación y repositorio

- **R1 · Medio — Repositorio de 1,2 GB.** Hay unos 8.500 binarios (imágenes y
  audio) en git, y la CI clona con `fetch-depth: 0`. Propuesta: Git LFS o un
  almacén de recursos aparte; en la CI, `filter: blob:none` para el plan por diff;
  `git gc` local (35 MB de objetos temporales).
- **R2 · Decisión del propietario — Imágenes y narraciones oficiales en un sitio
  público con registro abierto.** Contradice la pauta del doc 02. Mitigaciones
  mínimas:
  - `robots.txt` que excluya `/local-assets/`;
  - mantener el aviso de no afiliación;
  - tener preparado un procedimiento de retirada.

### Juego

- **J1 · Medio — Modo de corrección manual.** Con 943 cartas jugables, alguna
  interacción fallará. Hoy la única salida es deshacer o abandonar. Un ajuste
  manual de daño, horror, pistas, recursos, perdición y posición, registrado en el
  historial, permitiría seguir jugando (F090 del doc 15, ausente).
- **J2 · Medio — Volver a grabar la campaña Joe–Trish de Brethren of Ash en
  normal,** invalidada por E1.

### Orden sugerido para lo que queda

1. **Campaña:** C1, C2, C4, C3, C5 y C6, con pruebas de compra y de inicio del
   siguiente escenario.
2. **Seguridad:** S1 para el registro con contraseña y los registros de errores
   500.
3. **Carga:** O1 y O2.
4. **Online:** D7, D8 y D9, más S3 y S4.
5. **Resto:** E8–E12, O3–O5, R1, J1 y los puntos restantes de D.

## Tercera revisión · fallos (31/10/2026)

Se han usado tres vías:

- **Fuzzer:** partidas aleatorias con decisiones legales, equipos y dificultades al
  azar, en los 27 escenarios.
- **Revisión independiente** de los commits de hoy.
- **Auditoría** de Night of the Zealot, Dunwich, Carcosa, Fortune and Folly y
  Carnevale contra las guías y la referencia.

### Fuzzer: 16.200 partidas sin excepciones ni bloqueos

- **Alcance:** 600 semillas por escenario, de 1 a 4 investigadores y las cuatro
  dificultades. En cada menú de acción se comprueban:
  - valores negativos;
  - enemigos o investigadores con daño letal que siguen en juego;
  - preguntas para investigadores eliminados o sin opciones;
  - partidas que se quedan sin pregunta ni final.
- **Resultado:**
  - Ninguna excepción del motor.
  - Ninguna partida bloqueada.
  - Una única incoherencia real (F1). Los demás avisos eran reglas especiales: el
    organista no tiene salud, en Dim Carcosa el horror no derrota y algunas cartas
    vinculadas suman salud.
- **Límite:** el juego aleatorio casi nunca pasa del primer acto, así que no cubre
  los actos finales. Conviene incorporar el fuzzer al repositorio con una política
  por escenario (como `closure-explore.mjs`) para llegar a los clímax.

### Regresiones en los cambios de hoy

| #                          | Fallo                                                                                                                                                                                                                                                                                         | Estado                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| N1 · Crítico · reproducido | Partida online: el servidor exigía `canPlayNext` para comprar, personalizar y marcar «listo». Desde C4, ese requisito incluye mazos válidos, así que un mazo que queda corto tras una mejora a Permanente o una carta exiliada no se podía reparar y la campaña se bloqueaba (`lobbies.ts:217`, `game.ts:131`). | Corregido en local: `campaignCanContinue` para la tienda; `canPlayNext` solo para «Siguiente» (`invalid_deck`), y la vista online muestra los problemas del mazo. |
| N2 · Medio · confirmado    | Online, el servidor ignoraba qué versión inferior se mejora: aplicaba siempre la más barata, aunque el jugador eligiera otra.                                                                                                                                                                | Corregido en local: la orden `purchase` lleva `replaces`.                                   |
| N3 · Bajo · reproducido    | La tienda local agrupaba todas las mejoras de una carta en una sola entrada, así que la opción más barata de C2 no aparecía.                                                                                                                                                                | Corregido en local: una entrada por versión sustituida.                                     |
| N4 · Bajo · plausible      | Un guardado de confianza (E4) pasa a ser la copia de seguridad sin rejugarse. Si algún día el historial no reprodujera el estado, se perderían el guardado principal y la copia. No se conoce ninguna causa.                                                                                   | Riesgo residual: una verificación completa periódica, en segundo plano, lo cubriría.        |

### Fallos de reglas y escenarios

| #                           | Fallo                                                                                                                                                                                                                                                                                       | Dónde                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| F1 · Alto · reproducido     | Una traición que reduce salud o cordura al entrar en la zona de amenaza no comprueba la derrota. Con Dreams of R'lyeh, Daniela quedó con 4 de horror y 4 de cordura sin ser derrotada. El motor solo hace esta comprobación si hay apoyos con vitalidad dinámica; The Gold Bug la fuerza a mano. | `packages/engine/src/engine.ts:102-118`, `night-of-the-zealot/classic-encounters.ts:19`                              |
| F2 · Alto · reproducido     | La casa siempre gana aparta los Esclavos-bestia en lugar de Abominaciones espantosas (2 Conglomerados de esferas y 1 Siervo del acechador). El plan 2b hace aparecer el enemigo equivocado. Guía p. 6.                                                                                       | `the-dunwich-legacy/house-encounters.ts:62`, `the-house-always-wins.ts:167`                                           |
| F3 · Alto · reproducido     | Dunwich trata como «por investigador» pistas que son fijas: acto 1 y Entrada del museo, Coche cama, Arroyo Bishop, Ruinas calcinadas, Escuela y los ocho Lugares de Invisibles y sin dimensión. Con 4 jugadores, el acto 1 del Museo exige 8 pistas en vez de 2 y la Aldea de Dunwich tiene 12 en vez de 3. | `the-miskatonic-museum.ts:70`, `:140`; `the-essex-county-express.ts:74`, `:85`; `blood-on-the-altar.ts:74`; `undimensioned-and-unseen.ts:81` |
| F4 · Alto · reproducido     | El Fantasma de la Verdad, Sueño 10: si Convicción/Duda no cambia, vuelve a añadir cartas que ya estaban en el mazo (de 30 a 35). Guía p. 19.                                                                                                                                               | `the-path-to-carcosa/a-phantom-of-truth.ts:916-933`                                                                   |
| F5 · Alto · reproducido     | Ecos del pasado comprueba el plan tras poner perdición en enemigos (ficha de sectario, Juramentado poseído, Buscador de Carcosa, Led Astray), aunque ninguna carta lo dice: el plan avanza en mitad de la ronda.                                                                            | `echoes-of-the-past.ts:694`, `:740`, `:767`, `~1003`                                                                   |
| F6 · Medio · confirmado     | Más comprobaciones indebidas del plan en Carcosa: El último rey (calavera, Comedor), Agujas de Carcosa (2 perdiciones en un Lugar) y El Fantasma de la Verdad (Acechado por las sombras, Notre-Dame).                                                                                         | `the-last-king.ts:713`, `:830`; `encounter-sets.ts:497`; `a-phantom-of-truth.ts:1324`, `:1494`                        |
| F7 · Medio · confirmado     | Fortune and Folly: omitir la Parte I no suma las 2 tareas de Recompensas adicionales (guía p. 31); se pierde experiencia y quizá Isamara o el Mazo de posibilidades.                                                                                                                         | `fortune-and-folly/part-two.ts:120`, `:851-856`                                                                       |
| F8 · Bajo                   | - Siervo del acechador (02104) sin Victoria 1.<br>- El hombre de la máscara pálida derrotado en el acto 2 va a la pila de descartes y no se retira.<br>- Rice (Actividad extracurricular R1) no se puede dar a un investigador derrotado.<br>- Isamara se concede sin estar en juego al final (decisión pendiente; la prueba fija el comportamiento actual).<br>- La Vigilancia cuenta pistas de investigadores en juego (plausible). | `servant-of-the-lurker.ts`, `the-pallid-mask.ts:1064`, `extracurricular-activity.ts:217`, `part-two.ts:854`, `part-one.ts:388` |

Comprobado como correcto, además:

- **Night of the Zealot:** completo, salvo F1.
- **Carnevale:** completo.
- **Fortune and Folly:** umbrales y resoluciones correctos.
- **Dunwich y Carcosa:** resoluciones y preparación según el registro.
- **Cambio de la regla de perdición (E2):** ninguna carta que diga que puede hacer
  avanzar el plan dependía del comportamiento anterior.
- **Cambio de Google:** sin vía nueva de robo de cuenta.
- **Pruebas automáticas (D3):** solo responden por el investigador propio y se
  cancelan al cambiar el estado.

### Orden sugerido

1. **Subir N1–N3**, que corrigen mis propios cambios. N1 bloquea campañas online.
2. **F1, F2, F3 y F5**, con pruebas por escenario.
3. **F4, F6 y F7.**
4. **F8 y N4.**
