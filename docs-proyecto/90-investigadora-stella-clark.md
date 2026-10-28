# 90 · Stella Clark y sus dos listas de ArkhamDB

28/10/2026. Petición: subir a Stella Clark, su mazo base (la caja
[`ste`](https://es.arkhamdb.com/set/ste)) y las cartas de las listas
[25117](https://es.arkhamdb.com/decklist/view/25117) («Blunder Woman», modo difícil) y
[39832](https://es.arkhamdb.com/decklist/view/39832) («Shedding Light on Stella Clark»).
Procedimiento de la [guía 59](59-guia-importar-lista-arkhamdb.md). Textos de ArkhamDB (EN/ES),
implementación de la aplicación de referencia, FAQ v2.5A y las resoluciones de ArkhamDB citadas.

## Recuento

Lote `stella-clark`: **30 códigos / 27 cartas o niveles distintos nuevos / 3 reediciones**
(60510 Pata de conejo = 01075, 60519 Encontrar consuelo = 04201 y 60516 Vivir y aprender = 04200,
esta última también de este lote).

- Caja `ste` (23): 60501 Stella Clark, 60502 Ni la lluvia ni la nieve, 60503 Llamada de las
  nieblas, 60504 Atiquifobia, 60506 Cuentos de hadas de los hermanos Grimm, 60508/60527 Abuelita
  Orne (0/3), 60510, 60512 Voluntad de supervivencia, 60513/60523 Una prueba de voluntad (0/2),
  60514/60525 Chiripa (0/2), 60515 Apretar los dientes, 60516, 60519, 60520 Recuerdo querido (1),
  60521 Abrigo de cuero (1), 60522 Derringer del .18 (2), 60524 «¡Mira lo que he encontrado!»
  (2), 60528 ¡Qué suerte! (3), 60530 Espabilado y 60531 Déjà Vu. Las otras ocho cartas de la
  caja ya eran jugables.
- Listas (7): 02234 Hermético, 04200 Vivir y aprender, 04272 Sobre la marcha, 01073 Reutilizar,
  07196 Incansable, 08072 Catálogo de Schoffner y 09108 Alumbrar.
- Fuera del alcance: el banquillo (`sideSlots`) de 39832, que la importación de mazos no usa:
  03273 (preparada en el lote parcial `grouped-import`, sin activar), 06332, 09105, 09116 y
  09119 (Personalizable, sin hoja de mejoras en el motor).

## Mazos

- **Mazo inicial** (`STARTER_DECKS.stella`): dos copias de cada carta de nivel 0 de la caja
  (60505–60519), 3 Ni la lluvia ni la nieve, Llamada de las nieblas y su debilidad básica,
  Atiquifobia.
- **Listas 25117 y 39832**: se importan desde el editor con su enlace; todas sus cartas son
  jugables (`decklist-25117.json`, `decklist-39832.json`). 39832 incluye In the Thick of It, que
  pide elegir dos traumas al crear el mazo.

## Reglas

- **Stella Clark.** [reacción] Tras fracasar en una prueba, una acción adicional durante su
  turno en esta ronda (límite una vez por ronda; es una acción real, FAQ 2.19). En su turno se
  gana en el acto; antes (fase de Mitos o investigación antes de su turno) se guarda hasta que
  empiece; después de su turno no tendría efecto y no se ofrece. Signo arcano: +1 o, en su
  lugar, fracasar automáticamente para curarse 1 daño y 1 horror.
- **Ni la lluvia ni la nieve.** Si la prueba fracasa, se cancelan los efectos de la prueba
  fracasada: según la FAQ v2.1 y la resolución revisada de ArkhamDB, los de los pasos 6 y 7,
  incluidos Alerta y Represalia, los efectos de fallo de fichas y de la fuente y los de las
  cartas asignadas (como en la referencia). Las capacidades disparadas «después de fracasar»
  (la de Stella, Atiquifobia, Pata de conejo) siguen activándose.
- **Llamada de las nieblas / Atiquifobia.** En la zona de amenaza: 1 daño tras iniciar una
  prueba de dificultad 4 o más / 1 horror tras fracasar. [action][action]: descartarla (también
  investigadores de su Lugar).
- **Abuelita Orne.** Ventana «cuando vaya a fracasar» (paso 6) para cualquier investigador de
  su Lugar: (0) fracasa por 1 menos o 1 más; (3) +1 o −1 al valor (no con fracaso automático).
  **¡Qué suerte! (3):** misma ventana, +3 y quien realiza la prueba roba 1.
- **Cuentos de los Grimm:** tras fracasar por 2 o más alguien de su Lugar con horror, cura 1.
- **Voluntad de supervivencia (0):** solo en tu turno; la siguiente prueba de este turno no
  revela fichas (se omiten los pasos 3 y 4).
- **Una prueba de voluntad:** al robar una traición que no es debilidad alguien de tu Lugar.
  (0) prueba de [willpower] (3) y, si tiene éxito, cancela la revelación; (2) la cancela, hace
  la prueba y, si fracasa, se exilia.
- **Chiripa:** tras fracasar por 2 o menos (nivel 2: 3) al evitar a un no Élite, el enemigo va
  arriba (nivel 2: abajo) del mazo de Encuentros; su Alerta ya no se resuelve.
- **Apretar los dientes:** +1 a cada habilidad hasta el final de la ronda.
- **Vivir y aprender:** tras terminar una prueba fracasada, se repite con +2 sin volver a pagar
  sus costes; sigue siendo la misma acción (FAQ de ArkhamDB).
- **Recuerdo querido (1) / Abrigo de cuero (1):** se exilian al ser derrotados.
- **Derringer del .18 (2):** al fallar, recupera la munición y su siguiente ataque de esta
  ronda recibe +1 [combat] adicional.
- **«¡Mira lo que he encontrado!» (2):** 2 pistas en total entre tu Lugar y los conectados.
- **Espabilado:** solo en tu turno (FAQ v2.4): +1 a la dificultad hasta que se resuelva tu
  primera acción y −1 desde tu tercera acción; comparte la temporización de Plan de acción.
- **Déjà Vu:** entre escenarios, hasta 3 cartas exiliadas en el último escenario cuestan 1
  menos al volver a adquirirlas.
- **Exiliar:** la carta sale de la partida y del mazo de campaña. Si el mazo queda por debajo
  de su tamaño, las cartas de nivel 0 cuestan 0 de experiencia hasta completarlo (FAQ 1.18).
- **Hermético:** límite 1; puede rechazar los recursos del mantenimiento; con 0 recursos, +1 a
  cada habilidad. **Sobre la marcha:** cualquier copia de la pila de descartes; desde ahí, 1
  pista adicional y vuelve al mazo; con una copia en mano y otra en el descarte se elige.
  **Reutilizar:** tras investigar con éxito por 2 o más, un Objeto del descarte a la mano.
  **Incansable:** sella hasta 3 fichas que no sean [auto_fail]; con 3 de «+1», «0» o
  [elder_sign], roba 2; se liberan al terminar la prueba (el motor aún no tiene [bless]).
  **Catálogo de Schoffner:** sus secretos pagan Apoyos Objeto de investigadores de su Lugar.
  **Alumbrar:** antes de revelar, en una investigación propia de dificultad 0: éxito
  automático sin revelar fichas (FAQ), 1 pista adicional aquí y 1 en cualquier Lugar.

## Motor

Acciones adicionales para el turno de esta ronda (`GainTurnActionsThisRound`,
`roundTurnActions`, `turnAheadThisRound`); ventana `whenWouldFail` y `ModifyFailBy`
(`testMargin`); `cancelsFailedTestEffects`; disparador `afterSkillTestInitiated`; pruebas sin
fichas (`SkillTest.noTokens`, `SkipNextTestTokens`, `AutoSucceedSkillTest`); repetir la última
prueba (`origin`, `lastSkillTest`, `RepeatSkillTest`); `PutEnemyOnEncounterDeck`; exilio
(`ExileCard`, `GameState.exiled`, `whenDefeated` con `DiscardAsset.defeated`) y su tratamiento
en `campaign.ts`; dificultad de los apoyos del investigador (`ownerTestDifficulty`) y
`turnActionTiming`; `playableFromDiscard`; usos como recursos (`usesAsResources`,
`PlayCard.usesPayment`, `spendableFor`); rechazar los recursos del mantenimiento
(`mayDeclineUpkeepResources`); fichas selladas sobre una carta asignada (`SealHolder`
`committed`); `AddInvestigationResults`.

## Presentación y recursos

Textos EN/ES de ArkhamDB y etiquetas nuevas. Paquete `ste` en `INVESTIGATOR_PACKS` (caché
`v9`). Escaneos EN/ES, reverso, miniaturas y retrato; procedencia en
`evidencias/stella-clark-recursos-oficiales.json` e `imagenes-locales.json`.

## Validación

`stella-clark/rules.test.ts` (efectos de cada carta) e `integration.test.ts` (mazo inicial, las
dos listas con campaña y escenario, construcción, exilio con relleno gratuito y Déjà Vu).
Revisión visual pendiente para la persona usuaria.
