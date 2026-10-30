# 94 · La llamada del Portador de la Plaga (campaña fanmade)

Análisis previo a la implementación de _Call of the Plaguebearer_, campaña
fanmade de 8 escenarios y 5 interludios diseñada por Walker Graves (Dr Jack
Science) y publicada en
[Mysterious Chanting](https://mysteriouschanting.wordpress.com/2021/04/06/call-of-the-plaguebearer/).
La traducción y maquetación al castellano (cartas y guía) es de Los Archivos de
Arkham. Ninguna de las dos versiones indica número de versión ni fecha.

Estado: **material completo en EN y ES; nada implementado.** Este documento
recoge el inventario, las diferencias entre versiones y las decisiones
pendientes. No sustituye a las guías: al implementar, contrasta cada paso con
el PDF.

## Fuentes

| Material         | Ubicación                                | Notas                                                                    |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| Guía ES          | `docs-proyecto/reglas/Plaguero.pdf`      | 28 págs. escaneadas (sin capa de texto), 2465×3241, legibles.            |
| Guía EN          | `docs-proyecto/reglas/Plaguero-EN.pdf`   | 31 págs. escaneadas (sin capa de texto), 1236×1236, legibles.            |
| Cartas ES        | `E:\Plaguero\NNN{a,b}.jpg` (fuera de git) | 382 cartas, 764 caras JPG 714×1035.                                      |
| Cartas EN        | `E:\Plaguero\en\*-{1,2}.png` (fuera de git) | 382 cartas, 764 caras PNG 826×1126 (actos y planes 1126×826).            |
| Original y erratas de usuarios | Drive del autor (_Campaign without Bleed_, `CampaignGuide.pdf`, `CampaignLog.png`) | El PNG del registro EN no se ha descargado. |

Las páginas del PDF EN están desordenadas: la portada es la página 14 del PDF,
los números impresos «21» y «28» están duplicados y no existe la 27. No falta
contenido.

Narración: la voz de ElevenLabs elegida para esta campaña es
`QtPMrakdgePQIUwOX7Ut`.

## Inventario de cartas

Todas las cartas ES llevan en el pie `posición/total` del bloque y número de
colección (1–292); los 764 archivos cuadran sin huecos. Cada copia es un
archivo propio. Los lugares ES no muestran la posición en el pie.

| Bloque (ES → EN)                                         | Archivos ES   | Cartas | Colección      |
| -------------------------------------------------------- | ------------- | -----: | -------------- |
| I · Trasnochadores / Late Risers                         | 001–018       |     18 | 1–18           |
| II · Noche en la ciudad / Night on the Town              | 019–053       |     35 | 19–46          |
| III · Muerte al amanecer / Dead by Dawn                  | 054–106       |     53 | 47–82          |
| IV · Cantos fúnebres / Mourning Chorus                   | 107–119, 128–141 |  27 | 83–95, 104–110 |
| Alianzas frágiles / Tenuous Allies (recompensas Int. III) | 120–127, 381–382 | 10 | 96–103, 292    |
| V · Descenso al mediodía / High Noon Descent             | 142–188       |     47 | 111–150        |
| VI · Guerra al atardecer / The Afternoon War             | 189–226       |     38 | 151–180        |
| VII · Muerte a la puesta de sol / Death at Sundown       | 227–267       |     41 | 181–212        |
| VIII · La hora bruja / The Midnight Hour                 | 268–309       |     42 | 213–249        |
| Supervivientes de la Agencia / Agency Survivors          | 310–318       |      9 | 250–253        |
| Agentes de Cthugha / Agents of Cthugha                   | 319–322       |      4 | 254–255        |
| Dones del Portador de la Plaga / Gifts of the Plaguebearer | 323–328     |      6 | 256–258        |
| Arkham caído / Fallen Arkham                             | 329–363       |     35 | 259–283        |
| Confusión del miasma / Haze of Miasma                    | 364–368       |      5 | 284–285        |
| Vida y muerte / Life and Death                           | 369–372       |      4 | 286–287        |
| Esclavos del miasma / The Plaguebearer's Commands        | 373–376       |      4 | 288–289        |
| Poder desatado / Unbound Power                           | 377–380       |      4 | 290–291        |

Total: 382 cartas (301 de escenario, 10 de jugador, 71 de conjuntos
compartidos). La asignación de nombre a los ocho conjuntos compartidos se ha
deducido por el contenido de sus cartas; confírmala con el icono al
transcribirlos.

### Emparejamiento EN ↔ ES

- **No se puede emparejar por nombre de archivo:** la numeración EN repite
  números (163–165, 168, 169, 181), salta el 40, tiene 25 archivos sin número
  (copias como `Bad News (2)`) y uno mal formado (`335- Driving Urge`).
- **Tampoco por imagen:** la edición ES cambió muchas ilustraciones y el
  marco (Agente Greyson: Luisa Preissler en EN, David Vázquez en ES).
- **Sí por el pie:** posición en el bloque y número de colección coinciden.
  Ejemplo comprobado: ES `097` «No puedes escapar» (44/53, nº 78) = EN
  `100 - Can_t Get Away!` (44/53, nº 78). Los lugares ES, sin posición en el
  pie, se emparejan por orden dentro del bloque y por nombre.
- Algunos nombres cambian en ES: Agent Crispin → Agente Martínez, EX.O.L →
  L.E.P.R.A., Saferoom → Guarida, Left/Right Artery → Aurícula
  izquierda/derecha, Intoxicating Vapors → Sediento.

### Imágenes

- ES: actos, planes y cartas de escenario vienen **girados en vertical**; la
  app usa actos y planes apaisados (las AVIF actuales miden 1048×738). Hay que
  girarlos (planes en sentido horario, actos en antihorario; compruébalo por
  carta).
- EN: actos y planes ya vienen apaisados, pero los PNG traen **franjas de la
  carta vecina** en los bordes (_without bleed_ mal recortado); hay que
  recortarlos.
- El repositorio no tiene conversor local JPG/PNG → AVIF
  (`import-card-images.mjs` y `sync-card-images.mjs` solo descargan del CDN).
  Servir los originales supondría unos 850 MB (ES) y 1 GB (EN).
- Los códigos de carta deben ser de 5 cifras (`apps/web/src/game/cards.ts`);
  falta elegir un prefijo libre.

## Estructura

| #       | EN                    | ES                         |
| ------- | --------------------- | -------------------------- |
| Esc. I  | Late Risers           | Trasnochadores             |
| Esc. II | Night on the Town     | Noche en la ciudad         |
| Int. I  | Friends in Low Places | Amigos en los bajos fondos |
| Esc. III | Dead by Dawn         | Muerte al amanecer         |
| Int. II | Dead or Alive         | Vivo o muerto              |
| Esc. IV | Mourning Chorus       | Cantos fúnebres            |
| Int. III | Arkham Allied        | Arkham unido               |
| Esc. V  | High Noon Descent     | Descenso al mediodía       |
| Int. IV | History Lesson        | Lección de historia        |
| Esc. VI | The Afternoon War     | Guerra al atardecer        |
| Esc. VII | Death at Sundown     | Muerte a la puesta de sol  |
| Int. V  | A Confrontation       | La confrontación           |
| Esc. VIII | The Midnight Hour   | La hora bruja              |

Hay prólogo y epílogo. El III R5 salta el Interludio II.

### Conjuntos de la Caja básica reutilizados

Ya existen en la app (los usan Carcosa y La noche de la fanática):

| Escenario | Conjunto                                               |
| --------- | ------------------------------------------------------ |
| I         | Miedo impactante / Striking Fear                       |
| II        | Antiguos males / Ancient Evils                         |
| II        | Las máscaras de medianoche, solo Sombra acechante ×3   |
| III       | Frío helador / Chilling Cold                           |
| IV        | Puertas cerradas / Locked Doors                        |
| V         | Agentes de Yog-Sothoth (si _la colección fue salvada_) |
| VI        | Agentes de Hastur                                      |

### Cartas de jugador oficiales necesarias

- **Apoyo de la Agencia (nivel 5)** / Agency Backup: el III lo entrega con
  _respeto de Greyson_. La guía ES añade «si no la tienes, te la
  suministramos». No es jugable en la app.
- Debilidades básicas aleatorias por rasgo: Locura o Pacto (Int. IV);
  Lesión, Defecto, Maldición o Fin de los tiempos (VIII). Falta comprobar
  cuántas hay disponibles.
- La FAQ cita Sophie, ¡Qué suerte! y Trabajo de campo (no se pueden usar en
  pruebas de Defender).

## Bolsa del caos

Confirmada en ambas guías. Además de las fichas numéricas: calavera ×2,
sectario, tablilla ×2, fallo automático y Símbolo Arcano. **No hay ficha de
Antiguo** al inicio.

| Dificultad | Fichas numéricas                             |
| ---------- | -------------------------------------------- |
| Fácil      | +1, +1, +1, 0, 0, 0, −1, −1, −1, −2          |
| Normal     | +1, 0, 0, −1, −1, −1, −2, −2, −3, −4         |
| Difícil    | 0, 0, −1, −1, −2, −3, −3, −3, −4, −5         |
| Experto    | 0, −1, −2, −2, −3, −3, −4, −4, −4, −6        |

En Difícil, la guía EN tiene una coma duplicada («−4, , −5»); se toman 10
fichas como en ES.

Cambios durante la campaña:

- Int. I: +1 sectario (apartado 2), +1 calavera (3) o +1 tablilla (4).
- III R5: cada sectario cuenta además como fallo automático.
- IV: +1 Antiguo (el primer investigador que lea «ha escuchado la llamada»).
- VI: Susurros insidiosos cambia una calavera o tablilla por un sectario.
- VII, resolución [tablilla]: −3 / −5 / −6 / −7 según dificultad.

## Reglas nuevas

| Regla                         | Dónde        | Resumen                                                                                                                                         |
| ----------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Alerta                        | Palabra clave | El enemigo ataca a quien falle al evitarlo, sin agotarse. La guía EN la da por conocida; la ES la explica.                                     |
| Errante (Patrol)              | Palabra clave | En 3.2, el enemigo preparado y sin enfrentar se mueve hacia el lugar indicado.                                                                 |
| Defender                      | II, VI       | La prueba usa un valor fijado por la carta; no se pueden asignar cartas ni usar cartas de jugador para aumentarlo.                             |
| Procesión                     | IV           | Mapa en anillo de 8 lugares; mazo de procesión; el Sacerdote avanza en sentido antihorario y el resto le sigue. Ignoran Cazador y Errante.      |
| Directamente debajo           | V            | Disposición en columnas (Delta, Omega, Alfa) y adyacencia vertical.                                                                            |
| Piso X                        | VII          | X es el número del rasgo _Piso_ (0 si no lo tiene); torre de 6 niveles.                                                                        |
| Lugares enemigo y dar la vuelta | VIII       | Descomunales e inmóviles; daño y pistas se convierten entre sí; al girar, quienes estaban se consideran en el nuevo lugar.                    |
| Mazos especiales              | III, IV, VII | Mazo reanimado, mazo de procesión y mazo de Ritual.                                                                                            |
| Estado de Arkham              | II → VIII    | Los 8 lugares de Arkham conservan su estado entre escenarios: Defendido, Infectado, Protegido, Cráter o Lugar de la Liberación, Tocado por la Llama o la Locura. |
| Texto oculto                  | Varios       | Bloques que solo se resuelven si alguien los lee. EN los marca en rojo (tachado o en negrita); ES en verde azulado o tachado.                  |

## Resumen por escenario

### I · Trasnochadores

- Conjuntos: Trasnochadores, Supervivientes de la Agencia, Dones del Portador,
  Confusión del miasma, Esclavos del miasma, Miedo impactante.
- Morgue y Laboratorio Omega en juego; recursos de barricada en el
  Laboratorio Omega.
- R1/R2/R3 con XP. Anota: _los Sastres contuvieron la amenaza_, _la colección
  fue salvada_ (si se apagó un fuego), _el Primero reclamó la instalación_,
  _los investigadores conocen el secreto del Motel_, _respeto de Greyson_. La
  R2 y la R3 dan el **Maletín sospechoso**.

### II · Noche en la ciudad

- Seis lugares de Arkham con 4 pistas; uno de los dos restantes activa al
  azar el texto de su apoyo de historia.
- Regla Defender. R2 si hay 6 lugares con recurso; si no, R1.
- Anota _Defendido_ / _Infectado_ por lugar, _Hibb te cubre las espaldas_ y
  _Arkham permanece unida_.

### Interludio I · Amigos en los bajos fondos

Hibb (Listo para ayudar) y cambios en la bolsa. Anota _Hibb está aquí para
ayudarte_ o _recibiste un regalo envenenado_.

### III · Muerte al amanecer

- Mazo reanimado; dos aperturas según _respeto de Greyson_ (Portero simpático
  con Ichabod y Apoyo de la Agencia, o Ataque inesperado con Virgil).
- R1 (todos muertos) permite «pagar cualquier precio» → R5 oculta: se curan
  traumas físicos, se añaden La futilidad del hombre y El abrazo de la muerte,
  y se salta el Interludio II.
- Anota _Herbert West nos guía_, _fue llevado contra su voluntad_ o _te
  aseguraste de que el Primero murió_.

### Interludio II · Vivo o muerto

Dar el maletín a West (apoyo Herbert West) o esconderlo. Cada investigador
elige La Fuerza de la Carne + El abrazo de la muerte o Voluntad inquebrantable
\+ La futilidad del hombre.

### IV · Cantos fúnebres

- Anillo de 8 lugares de Arkham; cada lugar Defendido retira su traición y su
  enemigo; los Infectados se sustituyen por su versión de Arkham caído.
- Procesión. Anota _ha escuchado la llamada_, Cráter o Lugar de la
  Liberación, _Protegido_ y _Eliminado_.

### Interludio III · Arkham unido

Por cada lugar Protegido, una recompensa del conjunto Alianzas frágiles (Copas
de más, Trato hecho, Ampliación de préstamo, Tomo sagrado, Beneplácito de Ma,
Cobertura total, Día duro de trabajo, Ritual de Yaztaroth). Recuadro oculto: 2
XP y 1 trauma mental.

### V · Descenso al mediodía

- Agentes de Cthugha o Agentes de Yog-Sothoth según _la colección fue
  salvada_. Disposición en columnas («directamente debajo»).
- _Greyson cortó lazos_ da Agente Greyson (Ya no sigue órdenes).
- Anota _transportado al reino del que acecha_ o _encontraste las sendas
  ocultas_, y _el monstruo fue sepultado_.

### Interludio IV · Lección de historia

Tres preguntas; cada una después de la primera cuesta una debilidad aleatoria
(Locura o Pacto). Anota _visión de los portales_, _palabras de muerte_ y
_acertijo críptico_.

### VI · Guerra al atardecer

- Portales de la Llama y del Rey; apoyos de historia en lugares Protegidos;
  Defender; 5 recuadros ocultos de Susurros insidiosos (6 en EN).
- R1 y R2 pierden la campaña. R3 anota _Tocado por la Llama_ / _por la
  Locura_ y _Eliminado_.

### VII · Muerte a la puesta de sol

- Torre de 6 pisos y mazo de Ritual (Runas de atadura, L.E.P.R.A., Mochila de
  mago, Bendición del mañana, Palabras de muerte, Hoja oxidada).
- R1: XP por la zona de victoria y por cada carta en juego; los muertos vuelven
  y anotan _se ha inyectado un reactivo puro_. R2 pierde la campaña.
- Resolución [tablilla] oculta: _habéis sido advertidos_ y ficha negativa.

### Interludio V · La confrontación

Confiar o no en West: _la Muerte conquistó a Herbert West_ o _Baalshandor
golpeó primero_.

### VIII · La hora bruja

- Lugares enemigo con versión Normal o Protegido; Baalshandor en el Cráter o
  en el Lugar de la Liberación; Leales de Greyson si _Greyson cortó lazos_.
- Resoluciones R0–R8, varias ocultas; R4–R8 ganan la campaña con distintos
  costes.

### Epílogo

Solo narrativo, con bloques por _reactivo puro_, _regalo envenenado_ +
_encadenado de nuevo_, _Arkham permanece unida_ y _West ha conquistado a la
muerte_.

## Registro de campaña

La guía ES trae un registro (pp. 26–27) con columnas por investigador,
«Estado de Arkham» con los 8 lugares, muertos y locos, bolsa del caos y una
lista de progreso de 14 entradas. La EN no lo incluye (está aparte en el
Drive). Ninguno tiene casillas para las claves.

| Origen     | EN                                                   | ES                                                  |
| ---------- | ---------------------------------------------------- | --------------------------------------------------- |
| I          | the Tailors contained the problem                    | los Sastres contuvieron la amenaza                  |
| I          | the collection was saved                             | la colección fue salvada                            |
| I          | the First claimed The Facility                       | el Primero reclamó la instalación                   |
| I          | the investigators learned the secret of the roadhouse | los investigadores conocen el secreto del Motel    |
| I          | you earned Greyson's respect                         | los investigadores se ganaron el respeto de Greyson |
| II         | Defended / Infected                                  | Defendido / Infectado                               |
| II         | Hibbs has your back                                  | Hibb te cubre las espaldas                          |
| II         | Arkham stands united                                 | Arkham permanece unida                              |
| Int. I     | Hibbs is here to help                                | Hibb está aquí para ayudarte                        |
| Int. I, VIII | you have received a twisted gift                   | recibiste / ha recibido un regalo envenenado        |
| III        | Herbert West is leading the way                      | Herbert West nos guía                               |
| III        | Herbert West was taken against his will              | Herbert West fue llevado contra su voluntad         |
| III        | you made sure the First was dead                     | te aseguraste de que el Primero murió               |
| III        | The blood runs in your veins                         | la sangre corre por tus venas                       |
| Int. II    | West recovered the reagent                           | West recuperó el reactivo                           |
| Int. II    | you hid the briefcase                                | escondisteis el maletín                             |
| IV         | _Investigator_ has heeded the call                   | _investigador_ ha escuchado la llamada              |
| IV         | Crater of Unbinding / Site of Unbinding              | Cráter / Lugar de la Liberación                     |
| IV         | Rallied                                              | Protegido                                           |
| IV, VI     | Eliminated                                           | Eliminado                                           |
| V          | Greyson cut ties                                     | Greyson cortó lazos                                 |
| V          | you were transported to the Lurker's realm           | tú fuiste transportado al reino del que acecha      |
| V          | You found the hidden paths                           | tú encontraste las sendas ocultas                   |
| V          | the monster was buried under tons of concrete        | el monstruo fue sepultado bajo toneladas de hormigón |
| Int. IV    | saw a vision of the portals                          | tuvisteis una visión de los portales                |
| Int. IV    | learned the killing words                            | aprendisteis las palabras de muerte                 |
| Int. IV    | received a cryptic riddle                            | recibisteis un acertijo críptico                    |
| VI         | Flame-Touched / Madness-Touched                      | Tocado por la Llama / Tocado por la Locura          |
| VII        | imbibed a cardinal reagent                           | se ha inyectado un reactivo puro                    |
| VII        | You have been warned                                 | habéis sido advertidos                              |
| Int. V     | Death conquered Herbert West                         | la Muerte conquistó a Herbert West                  |
| Int. V     | Baalshandor struck the first blow                    | Baalshandor golpeó primero                          |
| VIII       | the Plaguebearer was bound anew                      | el Portador de la Plaga fue encadenado de nuevo     |
| VIII       | the Plaguebearer was destroyed                       | el Portador de la Plaga fue destruido               |
| VIII       | You conquered Death                                  | has conquistado a la muerte                         |
| VIII       | West conquered Death                                 | West ha conquistado a la muerte                     |

Estados que no se anotan y dependen de cartas: _put out a fire_ / «ha apagado
un fuego», _know of the binding_ / «conoces la atadura», _Your body belongs to
Cthugha_, _You owe Hastur your life_ y «el Motel Hibb es el lugar de la
Liberación».

Las variantes de redacción de una misma clave (reagent / Serum, injected /
imbibed, recibiste / ha recibido / han recibido) deben unificarse en una sola
clave.

## Errata oficial (solo en la guía EN, p. 30)

Hay que comprobar si las cartas ES ya las incorporan; si no, aplicarlas:

1. **Lab Delta (I):** al investigar, +4 de velo; si tienes éxito, se pueden
   gastar 3 pistas por investigador para poner en juego Ripped Hallway.
2. **Left Artery (V):** su icono es un círculo amarillo, no una cruz azul.
3. **Acto 1b (V):** si nadie controla a Herbert West, se ignora el texto de
   ambientación.
4. **VII en Difícil:** la tablilla vale −4; si fallas, Tendrils of the First
   se mueve un lugar hacia ti.
5. **Messenger of Flame (VIII):** «Obligado – Al comienzo de la fase de
   enemigos, si está en un lugar _Miasma_…».

## Diferencias entre EN y ES

| Punto                     | EN                                            | ES                                                            |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| Mazo reanimado (III)      | Se aparta la carta superior                   | Se apartan las dos superiores                                 |
| Lugares del II            | Se elige entre Muelles / Advertiser y entre Pensión / Tienda | Ambos al azar                                  |
| Preparación del III       | Solo aparta West y Primero de muchos          | Aparta además las cuatro cartas de West y debilidades; suministra Apoyo de la Agencia |
| Leales de Greyson (VIII)  | Sin lugar ni controlador                      | En el Motel Hibb, sin controlador                             |
| Secreto del Motel         | «you know» / «learned» (incoherente)          | Unificado                                                     |
| Hibbs Roadhouse (IV, VI)  | Intoxicating Vapors                           | Sediento                                                      |
| Lugares del VI            | General Store, River Docks                    | «Almacén general», «Muelles del puerto»                       |
| Hibb en el VI             | «If they did not…» (claro)                    | «Si no» ambiguo                                               |
| Susurros insidiosos (VI)  | 6 recuadros                                   | 5 recuadros                                                   |
| Int. I, apartado 4        | Apartado normal con frases tachadas           | Recuadro oculto                                               |
| Nombres de conjunto       | «Mourning Stroll» (IV) y «Agency Troubleshooters» (VII), erratas | Correctos                                  |
| Ayudas                    | Sin índice, registro ni referencia rápida     | Con índice, Alerta/Errante, registro y referencia rápida      |

La errata que comentan los usuarios sobre «Intoxicating Vapors» no existe: es
la traición del Motel Hibb. La de los Muelles es Worked to the Bone, que ES
traduce bien como «Dejarse los huesos».

## Decisiones pendientes

Estos puntos son iguales en las dos guías y necesitan una decisión al
implementar:

- **VII, resolución [tablilla]:** no tiene condición de acceso. Probablemente
  la activa la ficha de tablilla; hay que comprobarlo en las cartas.
- **Leales de Greyson:** quién lo controla.
- **V:** Agente Greyson se busca «entre las cartas apartadas» sin haberla
  apartado; los Blasones no aparecen en ninguna figura.
- **VI:** se retira La Cosa del agua pero entra Abner Weems en los Muelles;
  no se dice dónde aparecen el Acólito infernal ni el Protagonista delirante;
  la Intro 2 no indica destino.
- **VII:** la Intro 4 no indica destino (presumiblemente la 5).
- **VIII:** la R2 mezcla muertes, locura y «ganan la campaña»; la R0 no tiene
  acceso definido; la conversión daño ↔ pistas de los lugares enemigo puede
  encadenarse.
- **IV:** el reparto aleatorio de marcas y el caso de 8 lugares Infectados no
  están definidos.
- **Int. II:** consulta «reactivo puro», que la guía solo anota en el VII.
- **Mazo reanimado y preparación del II:** elegir versión EN o ES.
- **Texto oculto:** cómo presentarlo en la app (por ejemplo, un aviso que el
  jugador elige abrir).
- **Derechos:** campaña fanmade con arte de terceros (incluido el de varios
  videojuegos). Conviene pedir permiso al autor y a Los Archivos de Arkham y
  acreditarlos en la app.

## Trabajo para implementarla

1. Transcribir los datos de las ~290 cartas distintas (estadísticas, rasgos y
   texto EN/ES) desde las imágenes: no hay datos de ArkhamDB.
2. Elegir el prefijo de códigos y generar la tabla de emparejamiento EN ↔ ES
   por pie de carta.
3. Preparar las imágenes: girar los actos y planes ES, recortar los bordes EN,
   convertir a AVIF y registrar el manifiesto y las huellas.
4. Transcribir la guía (preparación, resoluciones, interludios) a
   `apps/web/public/local-assets/story/{en,es}.json`, con la errata EN
   aplicada.
5. Implementar las reglas nuevas y las cartas oficiales que faltan (Apoyo de
   la Agencia nivel 5 y debilidades por rasgo).
6. Implementar escenario a escenario siguiendo
   [13 · Añadir campañas](13-anadir-campanas.md), con
   [84 · Carcosa](84-camino-a-carcosa.md) como modelo de campaña de 8
   escenarios y [Carnevale](carnevale-implementacion.md) / Excelsior como
   modelo de datos escritos a mano.
7. Generar la narración con la voz indicada arriba.
