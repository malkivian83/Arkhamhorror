# 84 · El camino a Carcosa

## Estado actual

**4 de 8 escenarios jugables: I · Se cierra el telón, II · El Último Rey (con el
Interludio I), III · Ecos del pasado y IV · El juramento inconfesable (con el Interludio
II)** (sexta entrega). Al terminar el escenario IV no hay un quinto disponible. Los
escenarios V–VIII siguen sin `build`.

| Escenario                      | Implementado                                                                            | Pendiente para jugar                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| I · Se cierra el telón         | Completo: preparación, actos, planes, Lugares, 7 conjuntos, resoluciones y narración    | Lola Hayes (no jugable aún)                                                                                                             |
| II · El último Rey             | Completo: preparación, Transeúntes, planes, acto, 5 conjuntos, R1–R3 e Interludio I      | —                                                                                                                                       |
| III · Ecos del pasado          | Completo: preparación al azar, Pasadizos, Sr. Peabody, 6 conjuntos, R1–R4 y recompensas   | —                                                                                                                                       |
| IV · El juramento inconfesable | Completo: preparación, recuerdos, Monstruos bajo el acto, Daniel, 6 conjuntos, R1–R3 e Interludio II | —                                                                                                                                       |
| V · El Fantasma de la Verdad   | Nombre y posición en la campaña                                                         | Implementación íntegra y variantes según el registro                                                                                    |
| VI · La máscara pálida         | Nombre y posición en la campaña                                                         | Implementación íntegra                                                                                                                  |
| VII · Surgen estrellas negras  | Nombre y posición en la campaña                                                         | Implementación íntegra y sus ramas                                                                                                      |
| VIII · Penumbrosa Carcosa      | Nombre y posición en la campaña                                                         | Implementación íntegra, final de campaña y epílogo                                                                                      |

El epílogo y las narraciones de los escenarios V–VIII tampoco están implementados. Las dependencias compartidas se enumeran más abajo; no se
ha auditado todavía cada carta de esos siete escenarios.

## Primera entrega: base de campaña

Campaña original de ocho escenarios; no incluye las variantes de Regreso a
El camino a Carcosa. Registrada como `the-path-to-carcosa`, con orden oficial,
bolsas iniciales por dificultad y nombres EN/ES. Los interludios no ocupan un
puesto de escenario. La portada procede de la primera página del PDF aportado,
renderizada sin marcas de imprenta y revisada visualmente.

La vitrina indica que está en desarrollo y deshabilita el inicio. Las salas
online solo ofrecen campañas con primer escenario disponible. Ningún escenario
de Carcosa tiene todavía `build`: crear su registro desde la API de cartas no
permite jugarlo. No se importan ni habilitan cartas de jugador en esta entrega.

Fuentes consultadas:

- `docs-proyecto/reglas/AHLCG_El_camino_a_Carcosa_revisado.pdf`, 36 páginas:
  índice y conceptos en p. 2, preparación y prólogo en p. 3, primer escenario
  y resoluciones en pp. 4–6. Bolsas contrastadas visualmente con p. 3.
- Copia externa `D:/referencia/ArkhamHorror-main/backend/arkham-api/library/Arkham/`:
  `Campaign/Campaigns/ThePathToCarcosa.hs`,
  `Campaigns/ThePathToCarcosa/ChaosBag.hs` y
  `Scenario/Scenarios/ThePathToCarcosa/CurtainCall.hs` (preparación y símbolos).
  Solo consulta; implementación propia. El PDF prevalece sobre la referencia.

Las cuatro bolsas comienzan con tres calaveras, fallo automático y símbolo
arcano, sin sectarios, tablillas ni primigenios. Tamaños: 15/15/16/17. No se
reutiliza la bolsa de Hermanos de ceniza, cuyos símbolos son distintos.

## Segunda entrega: reglas de campaña y narración

Se registran las reglas de referencia y las resoluciones de Se cierra el telón,
sin añadir aún un `build`. Las pruebas usan una fixture genérica, no una partida
completa del escenario. Quedan implementados:

- Dudas, Convicciones y Persiguiendo al Extranjero, compartidos y persistentes
  en el registro; acumulación secuencial y empate explícito.
- Calaveras según horror y dificultad; sectario, tablilla y primigenio colocan
  horror en el Lugar o infligen horror al investigador si ya lo había. Las fichas
  de horror del Lugar se guardan en `scenarioMeta`, separadas del horror personal.
- Sin resolución, R1 y R2: notas, marcas, experiencia de Victoria y portador de
  la debilidad, incluso con todos los investigadores derrotados. La ausencia de
  resolución registra las derrotas del Extranjero; R1/R2 dan dos marcas.
- El hombre de la máscara pálida (03059): aparición en el Lugar más alejado de
  todos los investigadores, incluidos Lugares ocupados y decisión del jefe en
  empates; investigación con +2 al velo que sustituye el descubrimiento por su
  derrota; retorno al descarte de su portador y seguimiento de derrotas. La
  transferencia de portador al abandonar la campaña sigue pendiente.
- Resúmenes y datos de presentación EN/ES, con los dos escaneos oficiales de
  03059 revisados visualmente. La presentación de enemigos que son debilidades
  incluye sus valores de combate, evasión, salud, daño y horror.

El motor ahora consulta `EnemyBehavior.spawn` al resolver una debilidad Enemigo,
conservando su dueño. Antes solo permitía aparición enfrentada o el caso específico
del Lugar vacío más alejado. Se conserva ese comportamiento para las otras cartas.

Diferencia revisada: la referencia Haskell añade sospechas de la policía por robo
también en R2; el PDF ES p. 6 no lo ordena. Se sigue el PDF y solo R1 añade esa nota.

### Narración

Seis relatos oficiales EN/ES importados conservando el resto de las campañas:
prólogo, prólogo de Lola, introducción, sin resolución, R1 y R2. Las instrucciones
de juego se presentan como efectos, separadas de la narración. Se generan seis
MP3 **en español** con ElevenLabs y **Carmelo - Mature, Mysterious and Clear**,
voz `5egO01tkUjEzu7xSSE8M`, verificada contra la cuenta. La voz del generador de
Excelsior era Mario; no se ha reutilizado ni cambiado para esta campaña.

- Importación: `node scripts/import-carcosa-story.mjs [copia-de-referencia]`.
- Inspección sin consumo de créditos: `node scripts/generate-carcosa-audio.mjs --list`.
- Generación autorizada: `node scripts/generate-carcosa-audio.mjs --generate`.
- Reanudación por huella de entrada y archivo: conserva grabaciones coincidentes
  y rechaza sobrescribir otras. La clave permanece en `.env`, fuera de los archivos.
- Evidencia: [carcosa-narracion.json](evidencias/carcosa-narracion.json), voz,
  ajustes, caracteres, huellas de entrada/audio y tamaños. Se han verificado las
  tramas MPEG de los seis archivos (aprox. 14 min 47 s en total), sin tramas
  truncadas; esto no equivale a una revisión auditiva humana.

La narración de Lola queda preparada, pero no se activa esa investigadora. Los
audios están registrados por clave de historia; se ofrecerán al alcanzar esos
relatos cuando el escenario completo esté habilitado.

## Plan de la tercera entrega: completar Se cierra el telón

Plan previo a la tercera entrega, conservado como registro; ya está completado:

1. Datos de actos, planes, Lugares y encuentros con códigos oficiales y
   presentación EN/ES. Conjuntos: Se cierra el telón, Portentos malignos,
   Delirios, Apariciones, Secta del Signo Amarillo, Miedo impactante y Ratas.
2. Preparación: Teatro, Vestíbulo, Palcos y Bastidores en juego; investigadores
   en el Teatro, salvo Lola en Bastidores. Apartar al Emisario real, El hombre
   de la máscara pálida y las Puertas de vestíbulo y bastidores. Revisar las
   conexiones y las entradas de las Puertas con las cartas, no solo con el mapa.
3. Conectar el prólogo y la introducción ya preparados al escenario completo;
   variante de Lola pendiente de su disponibilidad real como investigadora.
4. Símbolos, revelaciones, capacidades de Lugares, actos y planes, incluida la
   persistencia del Emisario. Probar los efectos principales de cada carta.
5. Conectar los actos con las resoluciones ya implementadas y el efecto de robo
   en la taquilla con su metadato. En el acto 2, revisar la sustitución de la
   derrota del Extranjero por su traslado al Vestíbulo y su interacción con marcas.
6. Completar el cambio de portador si abandona la campaña y probar el traslado
   entre mazos reales. Los efectos de 03059 ya tienen pruebas dirigidas.
7. Pruebas de preparación con 1–4 investigadores y todas las dificultades,
   resoluciones y partidas completas; revisión visual representativa EN/ES.

### Criterios para habilitar el escenario I (cumplidos en la tercera entrega)

- [x] Construir un `ScenarioDefinition` completo con los conjuntos de encuentro,
      las cantidades, cartas apartadas, variantes y conexiones revisados.
- [x] Implementar y probar cada carta, las tres variantes del acto 2 y el ciclo
      de aparición, derrota y regreso del Emisario real.
- [x] Conectar el horror de los Lugares con los efectos y propagaciones del
      escenario, y mostrarlo en mesa; tenerlo guardado en metadatos no completa
      esas reglas ni su presentación.
- [x] Resolver los objetivos, la retirada y la derrota del grupo mediante el
      flujo real de actos y planes, llegando a las resoluciones existentes.
- [x] Completar la asignación y transferencia de la debilidad entre portadores,
      incluidos investigadores eliminados, y su persistencia entre partidas.
- [x] Integrar textos, referencia del escenario, imágenes y miniaturas EN/ES;
      conectar los seis audios existentes sin volver a generarlos.
- [x] Superar pruebas de preparación, variantes, efectos, resoluciones,
      guardado/reanudación y partidas completas con 1–4 investigadores y las
      cuatro dificultades. Revisar presentación y decisiones local/online.
- [x] Añadir el `build` en `the-path-to-carcosa/definition.ts` y actualizar la
      descripción de disponibilidad solo al completar lo anterior. Los otros
      siete escenarios seguirán pendientes hasta su propia implementación.

## Tercera entrega: Se cierra el telón jugable

Escenario completo en `the-path-to-carcosa/curtain-call.ts` y conjuntos de
encuentro reutilizables en `encounter-sets.ts` (Portentos malignos, Delirios,
Apariciones, Secta del Signo Amarillo, Miedo impactante y Ratas). Mazo de 32 cartas;
apartados el Extranjero, el Emisario real y las seis Puertas. Fuentes: guía ES pp. 4–6
y cartas; referencia Haskell (`CurtainCall.hs`, actos, planes y Lugares) solo como
contraste.

Motor (genérico, reutilizable por otras campañas):

- Horror y perdición en los Lugares (`Location.horror/doom`); la perdición cuenta
  para el plan y se retira al avanzarlo. Sustituye a los metadatos de la segunda entrega.
- Oculto: la traición va en secreto a la mano (`hidden`), se trata como zona de
  amenaza, cuenta para el tamaño de mano (×3 en Bastidores), solo su dueño ve y usa
  sus habilidades y solo la descarta su propio texto. En línea, los demás ven una
  carta oculta y el registro no revela cuál se robó.
- Restricciones continuas de traiciones: jugar/comprometer tipos, habilidades
  [fast] y moverse una vez por turno; coste adicional de acciones (Frozen in Fear);
  coste de cartas modificado por el escenario (Cabina de luces); `onReveal` de
  Lugares; `insteadOfDiscard` de enemigos (objetivo del acto 2); fichas añadidas
  solo para el escenario; traiciones que se descartan al dejar de cumplirse
  (Torres de Carcosa); `ForEachPointFailed` (Surgen estrellas negras).
- Campaña: `transferOnLeave` pasa 03059 a otro investigador si su portador muere o
  enloquece. Con un solo superviviente pasa directamente; con varios queda pendiente
  en el registro (`transfer:<código>`) y el grupo elige el heredero entre escenarios
  (`chooseTransferHeir`; en línea, el anfitrión). No se puede empezar el siguiente
  escenario hasta elegirlo.

Decisiones y diferencias revisadas:

- La copia del acto 2 se elige al azar en la preparación con la semilla; es
  equivalente a elegirla al avanzar (nadie la ve antes) y el mazo de actos muestra 3.
- El Extranjero derrotado en el acto 2 cuenta como derrota (Persiguiendo al
  Extranjero) y vuelve al Vestíbulo sin daño.
- Todos retirados o derrotados con alguno retirado en el acto 3: el grupo elige R1/R2
  («Huida del teatro»); todos derrotados: sin resolución.
- Palcos solo castiga la acción de movimiento (no los movimientos por efecto).
- La restricción de Languor sigue sin aplicarse a eventos jugados como reacción;
  corregirlo cambia una partida grabada de Queen of Ash (hallazgo aparte).

Presentación: catálogo oficial EN/ES (`scripts/import-carcosa-cards.mjs`, 36 cartas,
con dos erratas corregidas), 108 escaneos EN/ES con miniaturas
([evidencia](evidencias/imagenes-curtain-call.json)), códigos con letra (03047a–c,
03084a–d), fichas de horror/perdición en el mapa, nombre de la cara sin revelar de
las Puertas, referencia de símbolos y ayuda de fichas desde la carta oficial.
Revisión visual local: prólogo con audio, preparación, plan/acto, mapa y Puertas.

Validación: 123 pruebas de Carcosa (preparación 1–4 jugadores × 4 dificultades,
cada Lugar, acto, plan, variante y carta de encuentro, retirada con entradas reales,
guardado/reanudación y 160 partidas guiadas que recorren los tres actos y las tres
variantes). Batería completa: 3261 correctas, 19 omitidas y 1 fallo ajeno (Eureka,
por el cambio sin publicar de `SearchDeck.anyCard` del lote de cartas en curso).
Formato, tipos y compilación correctos; lint correcto salvo un aviso en
`grouped-import` (ajeno).

## Cuarta entrega: El Último Rey e Interludio I

Escenario en `the-path-to-carcosa/the-last-king.ts`; conjuntos El regalo de Hastur,
Podredumbre e impurezas, El Extranjero y Antiguos males añadidos a `encounter-sets.ts`.
Mazo de 22 cartas; apartados Dianne Devine y los cinco VIP Lunáticos. Fuentes: guía ES
pp. 7–9 (revisadas sobre la página renderizada) y textos de las cartas de la referencia
(`cards_{en,es}.json`, `TheLastKing.hs` y sus Lugares, solo como contraste).

- Transeúntes: apoyos sin dueño con pistas (1 + 1 por investigador), al azar en los cinco
  Lugares que no son el Recibidor. Negociar con su requisito, prueba y acciones; Un público
  difícil suma 1 acción por copia. Al tomar la última pista se les interroga (una vez por
  partida); las pistas retiradas por una Realidad repulsiva no cuentan como interrogatorio.
- Planes: el reverso del 1 hace aparecer a Dianne junto al Transeúnte con menos pistas y
  baraja los descartes. El 2 sustituye el avance por una Realidad repulsiva al azar
  (horror, pistas al Lugar y Enemigo Lunático en lugar del apoyo); sin ninguna, R3.
- Acto: las pistas de los eliminados van al acto; cada 2 dan 1 experiencia repartida lo más
  equitativamente posible (el jefe elige quién recibe el resto).
- Resoluciones: VIP interrogados y muertos en el registro (tachados en R3), cambio de
  fichas del caos en R2/R3 e Interludio I tras R1 con sus tres opciones.
- Motor (genérico): pistas sobre apoyos colocados y sobre el acto, traiciones junto al
  plan (`placement: agenda`, con velo global), sustitución del avance de un plan, enemigos
  que impiden tomar pistas en su Lugar o cuyos ataques no se cancelan, escenarios que
  omiten el robo de mantenimiento y reacción `afterParley`. Aparecer enfrentado ahora
  dispara "después de enfrentarse".

Diferencias revisadas: la fuente inglesa usa los nombres de la reedición (Possessed, Seer of
the Sign, Puppet of Hastur); el catálogo conserva los originales (Lunatic, Maniac, Young
Psychopath) como la guía, las imágenes y la fuente española. Dos erratas de la fuente ES
corregidas al importar. Límites "una vez por fase" del Salón de baile y la Sala de estar
como "una vez por ronda" (solo se negocia en la fase de investigación). La Danza del Rey
de Amarillo lleva al Lunático directamente a tu Lugar.

Validación: 68 pruebas nuevas (preparación 1–4 × 4 dificultades, cada Transeúnte, Lugar,
plan, enemigo y carta de encuentro, resoluciones e interludio, y 40 partidas aleatorias).
Formato, lint y tipos correctos.

Presentación: catálogo oficial EN/ES (78 cartas de Carcosa), 104 escaneos EN/ES con
miniaturas ([evidencia](evidencias/imagenes-the-last-king.json)) contrastados con los datos
(velo, pistas, valores de enemigos y umbrales), Constance Dumaine con caras `03076a`/`03076b`,
pistas sobre los Transeúntes y sobre el acto, traiciones junto al plan y referencia de
símbolos. Revisión visual local en ES/EN con una partida en curso. Sin audios: la narración
del escenario II se muestra como texto; `generate-carcosa-audio.mjs` aún solo cubre el I.

## Quinta entrega: Ecos del pasado

Escenario en `the-path-to-carcosa/echoes-of-the-past.ts`; cartas de jugador Sr. Peabody,
Broche de ónice negro (Debilidad) y El Manto Andrajoso en `echoes-assets.ts`; Las máscaras
de medianoche (solo sus 5 traiciones), Secta oscura y Puertas cerradas añadidas a
`encounter-sets.ts`. Mazo de 33 cartas menos los Buscadores que aparecen en la preparación.
Fuentes: guía ES pp. 10–12 (revisadas sobre la página renderizada), cartas de la referencia
y `EchoesOfThePast.hs` (Lugares y símbolos) como contraste.

- Preparación: 1 Lugar Sociedad Histórica de cada planta retirado al azar; Buscadores de
  Carcosa según jugadores; Información de Sebastien (1 pista por investigador en el
  Vestíbulo, solo si no está tachado) y 1 acción adicional en el primer turno si huyeron de
  la fiesta.
- Conexiones: el Vestíbulo y los Pasillos tranquilos conectan con su planta; las caras sin
  revelar conectan con el centro de su planta y las reveladas por sus símbolos. En el acto 3,
  los Pasadizos se conectan entre sí; el Sr. Peabody hace Pasadizo (y -1 velo) al Lugar que
  elija hasta que se prepare. Para los enemigos, la Biblioteca oculta es un Pasadizo.
- Planes: sin perdición en el Mitos; las pistas colocadas sobre enemigos pasan a perdición.
  El plan 2 trae al Juramentado poseído y a Sebastien Moreau (si no está entre los VIP
  muertos); el 3, R4. El Juramentado es inmune en los actos 1–2 y derrotarlo es R3.
- Resoluciones: R1/R2 al decidir en el acto 3, R3, R4 (también sin resolución); notas,
  Dudas/Convicciones, Broche obligatorio (R1) y Manto opcional (R3), Sebastien muerto y
  cambio de fichas.
- Motor (genérico): conexiones del escenario y adicionales solo para enemigos, omitir la
  perdición del Mitos, pistas que se vuelven perdición, "tu habilidad no puede
  modificarse", traiciones que impiden investigar, disparador al final del Mitos, coste de
  cartas modificado desde la mano y cordura modificada por un apoyo. Las conexiones se
  recalculan al avanzar acto o plan y al preparar cartas.

Diferencias revisadas: la referencia añade 2 primigenios en R4; la guía ES p. 12 dice 1
sectario, 1 tablilla y 1 primigenio, y se sigue la guía. Los umbrales de perdición son por
investigador (cartas impresas). El Museo histórico dice "no puede ser modificado" en las
cartas EN/ES impresas; la fuente decía "aumentado" (corregido al importar). La reacción de la
Biblioteca histórica se ofrece al terminar la prueba, ya descubierta la pista.

Validación: 60 pruebas nuevas (preparación 1–4 × 4 dificultades, conexiones, Pasadizos y
Sr. Peabody, cada Lugar, plan, acto, ficha, carta de encuentro y recompensa, resoluciones
y 40 partidas aleatorias). Presentación: catálogo EN/ES (111 cartas de Carcosa), 106
escaneos EN/ES con miniaturas ([evidencia](evidencias/imagenes-echoes-of-the-past.json))
contrastados con los datos; revisión visual local del acto 3.

## Sexta entrega: El juramento inconfesable e Interludio II

Escenario en `the-path-to-carcosa/the-unspeakable-oath.ts`; cartas de jugador Daniel
Chesterfield (aliado, 03182a) y Coraje (Información de Constance) en `oath-assets.ts`;
Habitantes de Carcosa y Agentes de Hastur añadidos a `encounter-sets.ts`. Mazo inicial de 23
cartas; 7 Monstruos y 7 Lunáticos apartados en montones, más Daniel (Enemigo) y Constance.
Fuentes: guía ES pp. 13–16 (revisadas sobre las páginas renderizadas), cartas de la
referencia y `TheUnspeakableOath.hs` como contraste.

- Preparación: 1 copia al azar de cada ala de los Pasillos; cada investigador elige en
  cuál empieza (nuevo `startingLocationChoices`). Ficha permanente -2/-3/-4/-5 según
  dificultad, anotada en el registro. Acto 2 v. I con el broche, v. II sin él. Introducción
  1 o 2 según el registro, la 3 y la Información de Constance (la carta superior del mazo
  pasa a ser un apoyo Coraje; si abandona el juego, se descarta la carta real).
- Lugares: Cocina, Jardín y Pasillo del sótano no se pueden entrar sin revelar en el acto 1;
  entrar en una Celda sin revelar cuesta 1 pista al que entra. Revelar el Pasillo del sótano
  pone en juego las 4 Celdas en huecos al azar; revelar la Celda de Daniel avanza el acto 2.
  Seis capacidades de "recuerdo" (en `scenarioMeta`, visibles en el registro de la mesa y en
  línea); con 4 avanza el acto 3. Patio, Comedor, Enfermería y ambas alas implementadas.
- Monstruos bajo el acto: al azar y sin mirar (`underAct`, oculto en línea); Su dominio los
  baraja en el mazo en su lugar. Los actos 2 v. I y 3 los devuelven al mazo; con 3 o más,
  el de menos [willpower] descarta hasta un Monstruo y lo roba.
- Fichas: calavera (difícil: revela otra, una vez por prueba), sectario y tablilla (velo
  básico) y primigenio (Monstruo bajo el acto o fallo automático elegido, nuevo
  `ForceSkillTestFailure`).
- Daniel: aliado con su daño forzado al recibir horror, cesión rápida y retirada del juego al
  salir; si su controlador se retira, sobrevive (Interludio II). Enemigo en la v. II;
  negociar con el Broche de ónice negro lo lleva a la zona de victoria.
- Encuentros: Camisa de fuerza (ocupa ranuras en la zona de amenaza), Regalo de la locura
  Piedad/Miseria (Ocultos), Las paredes se cierran (horror por punto de fallo o Monstruo),
  El Signo Amarillo (roba una Debilidad Locura), Glotón (no ataca tras cazar ni hace ataques
  de oportunidad), Paciente loco, Bestia de Aldebarán (todo el daño a una sola carta mientras
  quepa), Semilla de Hali y Byakhee chillador.
- Resoluciones: los derrotados quedan enloquecidos (nuevo `DriveDefeatedInsane`); R1 si
  todos fueron derrotados (sin Interludio II), R2/R3 al retirarse por el Jardín según se
  derribara a la enfermera. R2: 1 trauma físico. Constance muerta y cambio de fichas. El
  Broche pasa a otro investigador si su portador abandona la campaña.
- Interludio II: Daniel sobrevivió (+2 de experiencia), fue poseído o no sobrevivió; ignorar
  la advertencia (2 Dudas) o hacerle caso (2 Convicciones, +1 de experiencia y la regla de
  HASTUR, solo anotada).

Diferencias y límites: la app no permite elegir investigadores de sustitución en R1; si no
quedan investigadores, la campaña no puede continuar. La carta EN de las Celdas no tiene el
rasgo Manicomio Arkham (la traducción ES sí): se sigue la EN y el coste de 1 pista se
mantiene en todos los actos. El horror de "cuando atacas al Paciente loco" se recibe tras
revelar la ficha. El daño forzado de Daniel cuenta el horror que recibe el investigador.

Validación: 62 pruebas nuevas (preparación 1–4 × 4 dificultades, elección inicial,
Información de Constance, entradas bloqueadas y Celdas, actos 1–4, planes 1–3, fichas,
Lugares, Daniel, enemigos, traiciones, resoluciones, Interludio II, traspaso del broche y 40
partidas aleatorias). Presentación: catálogo EN/ES (146 cartas de Carcosa), 116 escaneos
EN/ES con miniaturas ([evidencia](evidencias/imagenes-the-unspeakable-oath.json)) y 13
narraciones nuevas con Carmelo (introducciones, Información de Constance, investigador
derrotado, R1–R3 e Interludio II).

## Dependencias posteriores

- Oculto: secreto por investigador en online, cuenta para tamaño de mano,
  restricciones de descarte, capacidades desde la mano y descarte de Encuentros
  (guía p. 2). Revisar el soporte existente antes de añadir mecanismos nuevos.
- Ramas de campaña: reutilizar los contadores de Dudas y Convicciones ya
  implementados; un empate no equivale a tener más de ninguno. Solo afectan a
  instrucciones explícitas.
- Cartas de Historia: lectura y efectos al resolverlas, sin confundirlas con
  apoyos ganados ni con el tipo genérico de entradas narrativas.
- Interludios I y II, cambios de bolsa que retiran símbolos, ramas según el
  registro, pérdida de investigadores y epílogo. La lista lineal de escenarios
  actual no implementa esas transiciones por sí sola.

## Continuación

Último bloque de implementación: `c524324`, publicado en `main`, con reglas
parciales y seis narraciones de Carmelo. PDF revisado publicado en `98c2f26`.
Analytics se publicó por separado en `7216a87`.

Validación completa de `c524324`: **3103 pruebas superadas, 19 omitidas, ningún
fallo; 450 archivos superados y 2 omitidos**. Comando:
`pnpm test --maxWorkers=4 --testTimeout=30000`, con acceso a los servidores TCP/SMTP
locales simulados. Formato, lint, tipos y compilación también se comprobaron sobre
la copia seleccionada para publicar; la compilación avisó de una fuente externa
y del tamaño de algunos chunks. Estos resultados no acreditan jugabilidad de
Carcosa: sus escenarios aún no tienen `build`.

Tercera entrega (Se cierra el telón jugable): publicada en `cf4511d`; las 108
imágenes se incorporaron al inventario general en `fda541f`. Revisión posterior sobre
`fda541f`: datos de Lugares, actos, planes, Emisario y 03059 contrastados con los
escaneos; formato, lint y tipos correctos; 3209 pruebas superadas y 19 omitidas. El
fallo de Eureka ya no aparece. Los 2 fallos de `apps/server/src/deploy.test.mjs` solo
se deben a ejecutar con Node 22 (el despliegue exige Node 24).

Narración de los escenarios II y III: 24 MP3 en español con Carmelo, la misma voz, modelo y
ajustes que el escenario I (introducciones, resoluciones, Interludio I, interrogatorios,
Realidades repulsivas e Información de Sebastien; unos 22 min 42 s). Tramas MPEG
verificadas sin errores; evidencia en [carcosa-narracion.json](evidencias/carcosa-narracion.json).
No equivale a una revisión auditiva humana. La generación necesita una cuenta de pago: las
gratuitas no pueden usar voces de biblioteca por la API.

Narración del escenario IV e Interludio II: 13 MP3 más con la misma voz y ajustes
(43 en total en la evidencia; unos 15 min 11 s más). Tramas MPEG verificadas sin errores.

Siguiente bloque: escenario V (El Fantasma de la Verdad). Pendiente: Lola Hayes (escenario I).

Para retomar en otro ordenador, actualizar `main`: el PDF ya está versionado en
`docs-proyecto/reglas/`. La aplicación de referencia sigue siendo una copia externa
que hay que tener disponible y cuya ruta puede cambiar. Los MP3 ya publicados no
requieren ElevenLabs para reproducirse; la clave de `.env` solo se necesita si se
generan narraciones nuevas y no debe subirse al repositorio.
