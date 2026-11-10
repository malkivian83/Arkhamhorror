# 132 · Inventario de bloqueos del motor

Análisis sin cambios de código: agrupa las 409 cartas de jugador estándar con impresión que aún no
son jugables según la capacidad del motor que les falta, para ordenar el trabajo siguiente.

## Metodología

- **Universo.** Catálogo `packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json`,
  clasificación `standard-candidate`, con imagen anunciada y sin comportamiento registrado según
  `inspectRuntime()` de `scripts/cards-import/runtime.mjs`. Resultado: 1333 jugables y 409
  pendientes, igual que el recuento del lote 131. Textos EN/ES de `tmp/lot129/{en,es}-all.json`
  (listas públicas de ArkhamDB).
- **Reediciones.** Una pendiente con el mismo nombre, nivel y tipo que una carta jugable cuenta como
  reimpresión (36 códigos): solo necesita equivalencia y registro.
- **Clasificación.** Lectura manual del texto EN de cada carta o nivel distinto (355) contrastada con
  los tipos de efecto y ventanas de `packages/engine/src/content.ts` y `types.ts`, y con las
  secciones de bloqueadas de los lotes 129–131. Una carta puede necesitar varias capacidades.
- **Límites.** Es una estimación: la etiqueta indica la carencia principal, no un análisis completo
  de cada regla. Las candidatas «sin motor nuevo» deben confirmarse al implementarlas. Lista
  completa carta → capacidades en `tmp/inventario-bloqueos.json` (generada con
  `tmp/inv132/build.mjs`; no versionada).

## Resumen

| Grupo                                        | Códigos |
| -------------------------------------------- | ------: |
| Reimpresiones de cartas jugables             |      36 |
| Candidatas sin motor nuevo                   |      40 |
| Una sola capacidad nueva                     |     257 |
| Varias capacidades nuevas                    |      76 |
| **Total**                                    | **409** |

## Estado tras los lotes 133–134

- **Reimpresiones (resueltas).** 35 de las 36 son jugables desde el [lote 133](133-reimpresiones-de-cartas-jugables.md).
  Hoja encantada (05192) no era una reimpresión (su texto difiere de 05193) y pasa a candidata pendiente.
- **Candidatas sin motor nuevo.** 7 resueltas en el [lote 134](134-candidatas-sin-motor-nuevo.md): `10104` La llave de
  Salomon, `07308` Rito de equilibrio, `10072` «¡Te lo devolveré!», `11078` Reliquia arcana perdida, `08053`
  El reloj rojo (2), `04035` Yaotl y `08093` Martillo ciclópeo. Las otras 33 necesitan una capacidad que el
  motor no tiene; la causa de cada una está en el documento 134 y deben reclasificarse en la tabla de capacidades.
- **Pendientes estándar con impresión:** 367 (antes 409); 1375 jugables.

## Estado tras el lote 135

- **`TOKEN_TRIGGERS` (resuelta en parte).** 21 de sus 41 códigos son jugables desde el
  [lote 135](135-reacciones-a-fichas-reveladas.md). Siguen 20: 7 que necesitaban solo esta capacidad
  (Sello del símbolo arcano, Inspiración esotérica 0/1, Espejo de videncia, Espécimen imposible,
  Apuntado preciso y Diadema rota) por carencias más concretas, y las 13 que combinan otra capacidad.
- **Pendientes estándar con impresión:** 346; 1396 jugables.

## Estado tras el lote 136

- **`ENEMY_MODS` y `LOC_ATTACH` (resueltas en parte).** 24 de sus 62 códigos son jugables desde el
  [lote 136](136-adjuntos-con-duracion.md), con modificadores de Enemigo con duración y adjuntos a
  Enemigos y Lugares; incluye Ajar 0/4, Ofuda y Sexto sentido 0 del lote 135. Siguen 38: texto en
  blanco (Borrado mental ×3, Teoría órfica), Atar monstruo, Transmogrificar, Sigilo ×2, Forma
  etérea ×2, movimiento y conexiones de investigadores (Abrir portal, Atajo, Sobre la pista ×2…),
  Sexto sentido 4, Barricada 3 y las que combinan otra capacidad; causas en el documento 136.
- **Pendientes estándar con impresión:** 322; 1420 jugables.

## Capacidades por número de cartas

«Cartas» = códigos que la necesitan (entre paréntesis, cartas o niveles distintos); «Solo esta» =
códigos que quedarían desbloqueados únicamente con esa capacidad.

| Capacidad | Descripción | Cartas | Solo esta | Ejemplos | Complejidad | Dependencias |
| --- | --- | --: | --: | --- | --- | --- |
| Reacciones a fichas reveladas (`TOKEN_TRIGGERS`) | Cancelar, cambiar o tratar una ficha como otra; disparadores por símbolo o por Bendición/Maldición revelada; no revelar fichas | 41 (40) | 28 | `02271` Golpe de suerte; `03312` Sello del símbolo arcano; `07110` Pacto sagrado; `07226` Armagedón | media | Bendición/Maldición (lote 130), `TreatRevealedTokenAs`, `CancelRevealedToken` |
| Adjuntos y modificadores temporales de Enemigo (`ENEMY_MODS`) | Adjuntar cartas a enemigos, modificar Combate/Evasión/daño hasta fin de fase o turno, texto en blanco, impedir preparar | 33 (29) | 24 | `01068` Borrado mental; `02031` Atar monstruo; `02228` Exponer la debilidad; `03028` Sigilo | media | `EnemyGainsKeyword`, `EnemyStaysExhausted` |
| Adjuntos a Lugar y movimiento (`LOC_ATTACH`) | Cartas adjuntas a Lugares, restricciones de movimiento o aparición, conexiones nuevas, efectos en Lugares no actuales | 31 (30) | 22 | `01038` Barricada; `02156` Cebo; `03148` Emboscada; `06029` Puerta abierta | media | Adjuntos de Lugar de escenario (`DiscardLocationAttachment`), `ConnectLocations` |
| Jugar o copiar cartas fuera de la mano (`PLAY_OTHER`) | Jugar desde el descarte o la mano ajena, copiar o repetir eventos, resolver habilidades sin coste, comprometer desde fuera de la mano | 29 (28) | 17 | `03306` Memoria eidética; `05231` El conocimiento es poder; `05320` Doble, doble; `10118` Persistencia | alta | `CommitFromDiscard`, `PlayEventAt` |
| Reglas de campaña y construcción de mazo (`CAMPAIGN`) | Experiencia, mejoras entre partidas, tamaño y opciones de mazo, Registro de campaña, efectos al acabar la partida | 27 (27) | 19 | `02110` Adaptable; `03308` Óbolo de Caronte; `06167` Versátil; `08046` Apoyo de los bajos fondos | alta | Constructor de mazos y flujo de campaña de la web |
| Cartas adjuntas a otras cartas (`FACEDOWN`) | Cartas boca abajo jugables desde un apoyo, apoyos adjuntos a apoyos sin ranura y mejoras adjuntas a apoyos | 27 (27) | 10 | `04037` Mochila; `04021` Dra. Elli Horowitz; `07261` Encantar arma; `09114` Katja Eastbank | media | `DrawBeneath`, ranuras (`CheckSlots`) |
| Ventanas al robar cartas de Encuentro (`ENC_DRAW`) | Cancelar, redirigir o sustituir el robo de una carta de Encuentro, el paso «robar cartas de Encuentro» del mito y la carta superior revelada | 25 (23) | 12 | `02307` Barrera de protección; `03022` «¡Yo me encargo de esto!»; `06110` Primera guardia; `11079` Liberación | media | `whenTreacheryDrawn`, `CancelRevelation` |
| Ventanas de daño, ataque y derrota (`DMG_WINDOWS`) | Cancelar o redirigir ataques y daño ya infligido, asignar a cartas ajenas, «cuando fueses a ser derrotado», jugar bajo control de otro | 24 (22) | 21 | `01082` Aquinnah; `03310` Burlar a la muerte; `04111` Perseverancia; `08021` «¡Detrás de mí!» | media | `CancelEnemyAttack`, `ReducePendingDamage` |
| Cartas vinculadas (`BONDED`) | Buscar en las cartas vinculadas, barajarlas en el mazo y retirarlas cuando el apoyo sale de juego | 22 (18) | 15 | `05313` Espejo sagrado; `06018` La hoja ávida; `06030` Señorita Doyle; `10044` Micónido voraz | media | Importar las cartas vinculadas (dependencias del catálogo) |
| Cartas personalizables (`CUSTOMIZABLE`) | Hoja de mejoras con casillas marcadas y su efecto (incluye Refinar) | 16 (16) | 12 | `09021` Coraza de cazador; `09022` Hacha rúnica; `09040` Destilación alquímica; `09080` Sirviente invocado | alta | `CAMPAIGN` (compra de casillas), guardado de mazo |
| Revelaciones múltiples o aleatorias (`CHAOS_MULTI`) | Revelar varias fichas y elegir cuáles resolver, ignorar una y revelar otra, o revelar fichas aleatorias fuera de una prueba | 15 (15) | 13 | `04197` Olive McBride; `02230` Dados de la suerte; `03304` «¡Traga plomo!»; `10024` Absolución | alta | `RevealExtraToken`, `RedrawSkillTestTokens` |
| Búsqueda y robo con reacciones (`DECK_SEARCH`) | Reacciones «cuando buscas en tu mazo», elegir entre cartas reveladas, nombrar cartas, robar y descartar | 13 (13) | 5 | `05153` Sr. «Torre»; `06023` Revelación asombrosa; `06278` Hallazgo sorprendente; `09047` Descubrimiento cautivador | media | — |
| Restricción por rasgo (`DECK_TRAIT`) | «Solo mazo de [Rasgo]» en la construcción del mazo | 13 (11) | 5 | `11103` Sutra prohibido; `11114` Sangre de K'n-yan; `11121` Juramento sagrado | baja | Constructor de mazos |
| Variantes de ataque (`FIGHT_VARIANTS`) | Atacar en otros Lugares, dificultad alternativa, ataque con un apoyo elegido o desde un evento, ignorar Distante/Represalia | 12 (12) | 7 | `04104` Puntería; `08029` Colmillo de Tyr'thrha; `10037` Ráfaga de golpes; `11064` Ametralladora Gatling | media | — |
| Ranuras adicionales y Tarot (`SLOTS`) | Ranuras extra condicionadas, intercambio de tipos de ranura y ranura/mazo de Tarot | 11 (11) | 5 | `09089` Frasco de atadura; `10132` Relicario ocultista; `54007` El Hierofante; `54013` Observado | media | `CheckSlots`; Tarot depende de `CAMPAIGN` |
| Sustitución de habilidad y valor base (`SKILL_SUB`) | Usar una habilidad en lugar de otra fuera de la acción, pruebas de recursos, fijar el valor base | 10 (8) | 8 | `02310` El hombre de los guantes rojos; `05029` El dinero habla; `06328` Percepción mental | media | — |
| Sellado avanzado (`SEAL_EXT`) | Sellar fichas reveladas o sobre un evento en resolución, sellar en lugar de devolver, liberar como coste | 10 (8) | 7 | `04310` Fragmentos del vacío; `07153` Destrucción radiante; `07262` Nephthys; `11060` Nublar | media | `SealToken`/`ReleaseSealedTokens` (lote 131) |
| Acciones adicionales y tipos de acción (`EXTRA_ACTIONS`) | Acciones extra condicionadas, repetir o encadenar tipos de acción, acciones básicas desde habilidades rápidas | 9 (9) | 6 | `05040` As de bastos; `06239` Celeridad; `08098` Carta de los evos; `09110` Salvavidas | media | `GainActions`, `TakeImmediateAction` |
| Manipular el mazo de Encuentros (`ENC_DECK`) | Buscar, mirar, sembrar o retirar cartas del mazo de Encuentros y engendrar enemigos desde él | 7 (7) | 3 | `06158` Códice de otro mundo; `10093` Himno antediluviano; `11053` «¿Dónde es la fiesta?» | media | `SearchEncounterForEnemy` |
| Parlamentar avanzado (`PARLEY`) | Parlamentar con órdenes, mover recursos o resolver ataques en lugar de daño | 7 (7) | 2 | `09052` Acertijo existencial; `10062` Bianca «Die Katz»; `10070` Rendición falsa | media | `afterParley` |
| Ventanas de pago de coste (`COST_WINDOWS`) | Reducir el coste al jugar desde otra carta, pagar costes ajenos, sustituir el pago por una prueba | 6 (6) | 3 | `03149` Charles Ross, abogado; `06329` Trapezoedro brillante; `07019` Rito de santificación | media | `SetNextRoleDiscount` |
| Origen de la prueba (`TEST_SOURCE`) | Distinguir pruebas sobre traiciones, efectos de revelación o cartas de Encuentro | 6 (6) | 2 | `06325` El ojo de la verdad; `07220` Rosario sagrado; `09037` Avambrazo del mártir | baja | — |
| Perdición y ofrendas sobre apoyos (`DOOM_ASSETS`) | Perdición en apoyos que no cuenta o se mueve, ofrendas repuestas al colocar perdición | 6 (6) | 5 | `09092` Elle Rubash; `09094` Devorador de pecados; `10084` Máscara de gato | media | `PlaceDoomOnAsset` |
| Habilidades desde la mano (`HAND_ABILITY`) | Activar habilidades de apoyos desde la mano y descartarlos en vez de agotarlos | 4 (4) | 3 | `11081` Cadena de ancla; `11082` Garfio; `11084` Cartas náuticas | baja | — |
| Dilemas de jugador (`DILEMMA`) | Eventos con Revelación robados del mazo (Dilema), límite por ronda | 3 (3) | 1 | `09107` Depredador o presa; `09115` Hacer caso al sueño | baja | Dilemas del lote de Fortuna (`prepare-fortune-dilemmas`) |
| Control de fases y deshacer (`PHASE_CONTROL`) | Saltar o repetir una fase, deshacer una acción | 2 (2) | 2 | `02305` El reloj de bolsillo de oro; `03311` Distorsión temporal | alta | — |

## Candidatas sin motor nuevo (40 códigos; 7 resueltas en el lote 134)

Reutilizan ventanas y efectos existentes; requieren definición, pruebas y presentación EN/ES.
`03267` Escape por los pelos; `04035` Yaotl; `04155` Sicario ejecutor; `04304` Queroseno; `05237`
Fortuna o destino; `06114` Seguimiento; `06117` y `10101` Interpretar las señales; `06203` Piedra
lunar; `07154` La verdad te llama; `07194` Tristan Botley; `07304` El hilo de Ariadna; `07308` Rito
de equilibrio; `07309` Jacob Morrison; `08047` Exploración avanzada; `08053` El reloj rojo; `08076`
Quemar después de leer; `08093` Martillo ciclópeo; `08104` y `08106` Profesor William Webb; `09029`
Una en la recámara; `09045` Notas de investigación; `09056` Kit de cirugía; `09058` Anatomía de
Gray; `09068` Agitar el avispero; `09071` Abrigo elegante; `09073` Pelear sucio; `09087`
Salvaguarda explosiva; `10020` y `10033` Kit de limpieza; `10072` «¡Te lo devolveré!»; `10092`
Athame siniestro; `10096` Influencia hipnótica; `10099` Llamar al más allá; `10104` La llave de
Salomon; `11022` y `11032` Remington Modelo 1858; `11052` Vacile; `11078` Reliquia arcana perdida;
`11091` Buen tiempo.

Además, 36 reimpresiones de cartas ya jugables (p. ej. `01523` Esquivar, `01548` Leo De Luca,
`01688` Derringer .41, `08057` El abanico negro) solo necesitan equivalencia comprobada y registro.

## Cartas con varias capacidades (76 códigos)

Se desbloquean solo cuando están todas. Las combinaciones más frecuentes:

- `DECK_TRAIT` + otra (8): Pase de biblioteca (`FACEDOWN`), Capucha de Sejmet y Vórtice
  dimensional (`ENEMY_MODS`), Discurso motivador (`PARLEY`), Recuerdos de otra vida (`CAMPAIGN`)…
- `FACEDOWN` + `CAMPAIGN`/`SLOTS` (7): Ceñirse al plan, Conocimiento ancestral, Encantadora,
  Mercado de los bajos fondos, Pistolera de desenfundado rápido, Bolsillo oculto, Cinturón de
  herramientas.
- `TOKEN_TRIGGERS` + otra (13): Ajar y Sexto sentido (`ENEMY_MODS`/`LOC_ATTACH`), Grimorio
  críptico 4 y Suerte diabólica (`PLAY_OTHER`), Ojo del djinn (`SKILL_SUB`), Ofuda, Sello de los
  arquetípicos (`BONDED`), Oculus mortuum (`DMG_WINDOWS`), Manuscritos pnakóticos (`TEST_SOURCE`).
- `ENC_DRAW` + otra (13): De caza (`ENC_DECK`), Negar la existencia (`DMG_WINDOWS`), Salvaguarda
  radiante (`CHAOS_MULTI`), Paz vigilante (`SEAL_EXT`), Ikiaq, Altar de las Moiras, Micónido voraz
  4 (`BONDED`), Vaticinio, Avambrazo del mártir.
- `CUSTOMIZABLE` + otra (4): Modificaciones personalizadas, La pluma de cuervo, Palabra de poder,
  Trampa improvisada.
- Resto: Bengala, Escondite, Trampa de lazo, Mira telescópica, De Vermis Mysteriis, Dayana
  Esperence, Cristalizador de sueños, Observar las estrellas, Diario onírico, La práctica hace al
  maestro, Rito de santificación, Efecto mariposa, Guía invisible, Flauta de los Dioses Exteriores,
  Aprendizaje obligado, Archivo de conductos, Mercado negro, Magia auténtica, Perro de trineo,
  Sucesión de maldiciones, Espejo astral, Dilemas con Encuentros o búsqueda, A punta de pistola,
  Rendición falsa, Hablar con los muertos, Técnica de supervivencia, Dispuesto para la acción, Eco
  espiritual, Observado y Tirador de primera.

La asignación exacta por código está en `tmp/inventario-bloqueos.json`.

## Recomendación de orden

1. **Candidatas sin motor nuevo y reimpresiones** (76 códigos): lotes directos.
2. **`TOKEN_TRIGGERS`** (41; 28 solo con ella): aprovecha Bendición/Maldición y sellado recientes;
   desbloquea pactos, la serie Armagedón/Ojo del caos/Manto de sombras y Sello del símbolo arcano.
3. **`ENEMY_MODS`** (33; 24) y **`LOC_ATTACH`** (31; 22): modificadores temporales y adjuntos
   comparten modelo de «carta adjunta con duración»; conviene diseñarlos juntos.
4. **`DMG_WINDOWS`** (24; 21) y **`ENC_DRAW`** (25; 12): ventanas de interrupción con casi todo el
   recuento desbloqueable de forma aislada.
5. **`FACEDOWN`** + **`SLOTS`**, luego **`BONDED`** (22; 15) y **`DECK_SEARCH`**.
6. **`PLAY_OTHER`** y **`CHAOS_MULTI`**: alto valor pero complejidad alta (cola de juego anidada;
   resolución de varias fichas).
7. **Campaña** (`CAMPAIGN`, `CUSTOMIZABLE`, `DECK_TRAIT`, Tarot): requieren trabajo en la web y en
   el guardado; agruparlos en un bloque propio.
8. Al final, `PHASE_CONTROL` (2 cartas, alta).
