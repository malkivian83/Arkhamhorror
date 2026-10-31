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

La revisión visual de E3 queda pendiente. El resto de puntos sigue abierto.

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
