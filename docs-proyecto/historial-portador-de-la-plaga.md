# Historial de La llamada del Portador de la Plaga

Estado vigente y fuentes en [94 · Portador de la Plaga](94-portador-de-la-plaga.md).

### Continuación de implementación · 2026-11-05

- Último lote: I · Trasnochadores y siete narraciones, commit `4b45eab1`, en `main`.
  Base `8433ed45`; el pull previo a la subida no incorporó cambios.
- Módulo: `packages/cards/src/call-of-the-plaguebearer/`; campaña registrada,
  con constructor solo para I. Preparación, texto oculto opcional, ocho lugares,
  barricadas, tres actos, tres planes, encuentros y resoluciones R1–R3.
- Prefijo `78`, basado en la colección ES; 29 códigos distintos: 18 del primer
  conjunto y 11 compartidos. Incluyen un apoyo de historia; no se vende en tienda.
  Se reutiliza Miedo impactante. Sin coincidencias en el catálogo congelado.
- Contraste: guía ES pp. 3–4 y cartas I, Supervivientes de la Agencia, Dones,
  Confusión y Esclavos. Delta ES ya incorpora la errata. El Pasillo es **Torn
  Hallway** en los archivos EN, frente a «Ripped Hallway» en la guía.
- Motor: Presa por cantidad de traiciones con un rasgo, bloqueo de movimiento
  enemigo, ventana posterior al paso de Cazador/Errante y aparición agotada
  antes de los enfrentamientos. Greyson entra sin enfrentarse por el pasadizo.
- Presentación EN/ES y 90 caras AVIF en el manifiesto. `media.json` conserva
  rutas originales, huellas de origen/salida y tamaños. EN: recorte 12 px lateral
  y 32 px superior/inferior; ES: actos/planes girados; máximo 1048 px, calidad 76.
  Revisadas imágenes representativas, sin abrir navegador.
- Verificación: 109 pruebas entre escenario, regresión del motor y web; tipos de
  engine/cards/i18n/web, formato, lint y compilación web correctos. La compilación
  final reutiliza la copia de recursos de la primera, contrastada por huellas.
  Cobertura: bolsas y mapa, efectos de cartas, preparación para 1–4 jugadores,
  partidas completas en cuatro dificultades, finales favorables, recompensas,
  registro, presentación y huellas. El arnés básico no sustituye estas pruebas
  del escenario. Controles vigentes mientras no cambien módulo, motor o recursos.
- Narración ES de I: siete MP3 (prólogo, introducción, texto oculto, reactivo y
  R1–R3) con Martin Osborne; 6412 caracteres, voz elegida por la persona usuaria.
  Relatos completos de guía ES pp. 3–4 y Maletín 017b, separados de las reglas.
  `scripts/generate-plaguebearer-audio.mjs --generate` reanuda por huella;
  `docs-proyecto/evidencias/plaguebearer-narracion.json` conserva texto y ajustes.
  Verificados enlaces, huellas y todos los fotogramas MP3 de las siete grabaciones.
- Pendiente de I: revisión visual de la app por la persona usuaria. El material
  de los escenarios posteriores no está habilitado.
- Corrección de CI #339: registrar la referencia del escenario, añadir sus 90
  miniaturas y completar los inventarios compartidos. Pasan las 151 pruebas de
  referencia/imágenes y la verificación de los 4718 originales y miniaturas.
- Portada local extraída de la guía ES p. 1 y relatos publicados en el catálogo
  oficial ES que habilita el reproductor. Probado el cuerpo real del modal para
  los siete audios; el catálogo se revalida al recargar para evitar datos antiguos.
- Corrección de cartas ES: 45 caras reconvertidas desde los JPG con su perfil
  CMYK a sRGB mediante ImageCms (también sus miniaturas). Los ocho lugares usan
  `NNNb.jpg` como cara revelada y `NNNa.jpg` sin revelar. La Morgue incorpora
  sus textos narrativos EN/ES. Regresión de perfiles ICC, caras e idioma activo:
  47 pruebas dirigidas correctas; inventarios de originales y miniaturas válidos.
  Lint, tipos web/i18n y empaquetado web correctos. Estos controles siguen vigentes
  mientras no cambien los recursos, catálogos o su carga.
- Siguiente: escenario II; revisar Defender y Arkham caído antes de habilitarlo.
  Integrar los cambios remotos con rebase antes de subir.

### Revisión de reglas · 2026-11-05

- Alcance: preparación de campaña e I (guía ES pp. 3–4), 29 códigos de I y
  encuentros compartidos, mapa, barricadas, fichas, avances y R1–R3. Los escenarios
  II–VIII e interludios no tienen implementación que se pueda dar por validada.
- Corregido Maletín: R1 no lo concede; habilidad rápida disponible en ventanas
  ajenas; exilio también al devolverlo a la mano; el cambio de dueño de 017b se
  anota inmediatamente y se limpia al volver a pasarlo o exiliarlo, sin duplicar
  la recompensa de R2/R3. Desistir y ser derrotado siguen provocando su exilio.
- Corregido Bajo la piel: otro investigador del mismo Lugar puede activar su
  acción impresa. Manos dormidas conserva su restricción al propio investigador.
- Presentación: seis caras ES de actos/planes orientadas correctamente y caras
  EN de 017 intercambiadas para mostrar el apoyo antes que la historia.
- Confirmado: Omega empieza con **una sola barricada**, excepción expresa de la
  preparación; Alfa/Delta/Túnel sí escalan por número inicial de investigadores.
- Validación: 122 pruebas dirigidas (reglas, escenario, 16 partidas simuladas,
  fichas/mapa y recursos EN/ES); tipos de cards, lint y empaquetado web. Reutilizar
  mientras no cambien módulo, recursos o dependencias relevantes. Revisión de
  imágenes locales representativas; sin navegador ni seguimiento de CI/Deploy.
- Pendiente: revisión visual de la mesa por la persona usuaria e implementación
  posterior; no equivale a una validación jugable de los ocho escenarios.
- Caché de presentación: URLs de cartas/miniaturas `78` y portada versionadas
  para sustituir imágenes CMYK y respuestas 404 conservadas por el navegador.
  Comprobados por HTTP la portada, imágenes y relatos publicados (200); CI y
  Deploy de `982632b1` correctos al investigar la incidencia. 49 pruebas web,
  lint, tipos y empaquetado de la corrección de caché.
- Cartas narradas de I: doce caras de planes/actos (3589 caracteres) con Martin
  Osborne. Transcripción narrativa ES, sin efectos mecánicos; manifiesto y huellas
  en `plaguebearer-cartas-narracion.json`. Reproductor existente en preparación,
  avances e inspección. La comprobación de todo el catálogo de MP3 tiene 15 s
  por su lectura real de cientos de archivos, sin reintentos.

### Continuación de implementación · 2026-11-05

- Último lote: II · Noche en la ciudad, commit `299403c3`, en `main`; base
  `9f9ab46d` (narraciones de cartas de I). Pull final sin cambios en main.
  Historial anterior en [el archivo](historial-portador-de-la-plaga.md).
- II: preparación aleatoria ES para 1–4 investigadores, Defender con cantidades
  actuales y ayuda del acto, ocho ciudadanos, ocho lugares sanos y sus Ruinas,
  cuatro Miasmas, encuentros, dos planes y R1/R2. Objetivo solo al final de ronda;
  registro de lugares Defendidos/Infectados y continuidad del Maletín desde I.
- Contraste: guía ES p. 5 / EN pp. 4–5 y cartas de ambos idiomas. La mención
  «Miasma creciente» del segundo plan ES se interpreta como Miasma en expansión.
  Defender cuesta una acción; se corrigen también Alfa y desistir por Escaleras
  en I, cuyos iconos representan una acción, con pruebas de regresión.
- Recursos de II: 37 códigos nuevos, 130 caras AVIF EN/ES y miniaturas (220
  caras en total I+II), perfiles sRGB y huellas conservadas. EN: ciudadanos con
  apoyo por delante e historia detrás. El reverso enemigo del plan se presenta
  en vertical. ES: relatos de ciudadanos transcritos; EN conserva sus imágenes
  originales y resúmenes propios en los modales.
- Narración ES con Martin Osborne: I tiene siete relatos de guía y doce caras
  de planes/actos; II añade introducción, R1/R2 y seis caras de planes/actos.
  Audios generados, registrados y contrastados con texto/voz/huellas. Los
  ciudadanos y las demás cartas de encuentro no tienen grabación individual.
- Verificación: 372 pruebas dirigidas correctas (reglas I/II, campaña, motor,
  referencias, imágenes y narración); tipos engine/cards/i18n/web, formato/lint,
  4848 originales y miniaturas y empaquetado web correctos. Reutilizar mientras
  no cambien sus módulos, recursos, dependencias o configuración relevante.
- Siguiente: interludio I y escenario III. No se habilita III sin ese trabajo.
  Revisión visual de la app pendiente de la persona usuaria; sin navegador.
- Corrección del diario: el origen de efectos se conserva en elecciones, pruebas,
  asignación de daño y guardados; activaciones y efectos registrados indican su
  carta. Regresión de la explosión de Destruyendo pruebas y del daño elegido en
  un Lugar. Una resolución se rotula «escenario terminado», sin asumir victoria.
  247 pruebas de motor, guardados, campaña y etiquetas; tipos y lint correctos.
- CI de `674b12bc`: dos fallos de presentación EN/ES por las caras sin revelar
  de los 16 lugares de II. Añadidos resúmenes propios de esas caras; las 34
  pruebas de catálogo sin red pasan. El Deploy de esa subida se omitió.
- Verificación del registro ampliada a toda la suite: 7174 pruebas correctas y
  26 omitidas, combinando la ejecución global y la repetición de los archivos
  fallidos. Ajustada una aserción al nuevo origen del Tótem; SMTP local bloqueado
  y timeout bajo carga pasan aislados con acceso a conexiones locales. Tipos y
  empaquetado web correctos. CI y Deploy de `bf43378d` correctos.
- Mapa: la línea Vestíbulo–Túnel se desvía al pasar por la columna de Alfa,
  evitando aparentar una conexión Alfa–Túnel. Solo cambia el trazado. 18 pruebas
  de conexiones y recorrido del hilo correctas; revisión visual pendiente.

### Continuación de implementación · 2026-11-06 a 2026-11-19 (I–V; trasladado del doc 94)

- Último lote: Interludio I + III · Muerte al amanecer (este commit), sobre
  `1a03ad05`. Historial en [el archivo](historial-portador-de-la-plaga.md).
- Interludio I (guía p. 6 ES/EN) al cerrar el II: rutas 1–4, Hibb (Listo para
  ayudar) opcional al mazo, sectario/calavera/tablilla y texto oculto 5; sus
  lectores empiezan el III con 1 horror y 1 carta más.
- III (`dead-by-dawn.ts`, datos en `dawn-data.ts`): dos aperturas según el
  respeto de Greyson (Ichabod + Apoyo de la Agencia 05274 con Alianzas frágiles,
  o Virgil), Hibb desde el mazo o con Alianzas frágiles, Mazo reanimado con dos
  cartas apartadas (ES; el plan 1b las cita), Reanimados que no pueden ser
  derrotados, exceso de daño = daño > salud (agota, desenfrenta y no se prepara),
  curación al final de ronda, 10 lugares con sus acciones, Laboratorio con 3
  Lugares con recursos, Negociar con West, Vuelve a por más (sustituye plan y
  acto; Primero de muchos con enemigos debajo), cuatro traiciones, West aliado
  y R1–R5 (R1 → «pagar cualquier precio» = R5 o perder la campaña).
- Decisiones: el Sótano conecta con la Galería (ES; el reloj de arena EN no
  existe); la R5 anota `plaguebearerBloodInVeins` (sectario = fallo automático
  adicional en escenarios futuros, pendiente de aplicar al implementar el IV) y
  `plaguebearerSkipDeadOrAlive`. Interludio II pendiente.
- Revisión de reglas: Hibb 78039 daba +1 combate; la carta dice +1 voluntad y
  +1 agilidad (iconos voluntad/intelecto/agilidad). Resoluciones del II correctas.
- Recursos: 37 cartas distintas transcritas literalmente EN/ES, 114 caras AVIF y
  miniaturas, textos oficiales en `story/{es,en}.json`, 16 relatos y 13 caras de
  planes/actos narrados con Martin Osborne (voz añadida a la cuenta nueva).
- Verificación: 185 pruebas dirigidas (campaña, III, web, narración,
  traducciones), 183 de inventarios de imagen/audio, tipos cards/i18n/web y
  lint correctos. Revisión visual de la app pendiente de la persona usuaria.
- Entorno: Python 3.12 + Pillow 11.3 (`%LOCALAPPDATA%/Programs/Python/Python312`,
  usar `-I`); JPG ES CMYK → sRGB con su ICC antes de AVIF. Guías extraídas con
  `tmp/plaguebearer/extract-jpegs.mjs`.
- Interludio II (guía ES p. 9 / EN pp. 10–11) tras las R2–R4 del III: secciones
  según respeto y West llevado a la fuerza, maletín entregado (West al mazo) o
  escondido, y elección individual Reanimado/Humanidad (obligatoria con reactivo
  puro) con La Fuerza de la Carne o Voluntad inquebrantable permanentes. Diez
  relatos narrados. 167 pruebas dirigidas, tipos cards/web y lint correctos.
- IV · Cantos fúnebres (`mourning-chorus.ts`, `chorus-data.ts`): estado de Arkham
  (sin marca → el valor menos repetido, empate al azar; con 6–7 Infectados el jefe
  cura 1–2), Lugares Seguros que reutilizan las capacidades del II (Colmado como
  acción, Muelles +1 por el [wild], Motel solo para quien reacciona) o Ruinas de
  Arkham caído, Procesión (crecer, moverse, Mazo y descarte propios, sin Cazador),
  recursos del plan en vez de perdición, Barricadas (acto 1b) como único daño al
  Sacerdote, Protegidos del acto 2a, 8 Élite y 13 traiciones, R1/R2 con Cráter o
  Lugar de la Liberación, Protegidos, Eliminados y «ha escuchado la llamada».
- Aproximaciones del IV: las traiciones «vinculadas a un Apoyo» se guardan en la
  zona de amenaza del dueño con el Apoyo anotado (motor sin esa vinculación;
  Confianza rota deja en blanco ese Apoyo con un gancho nuevo); la perdición de
  Miasma coral se guarda en su Lugar; «Orador profano» aplica el daño/horror del
  enemigo revelado. Motor: ganchos `enemyHealthModifier` y `blanksAsset`.
- La R5 del III (`plaguebearerBloodInVeins`) ya convierte el sectario en fallo
  automático en el IV (`bloodInVeins` para los siguientes escenarios).
- Verificación IV: 336 pruebas dirigidas (campaña, web, narración, traducciones),
  suite de engine+cards 6092 correctas, tipos engine/cards/web y lint correctos.
  Changelog actualizado. Revisión visual pendiente de la persona usuaria.
- Interludio III (guía ES p. 12 / EN p. 14) al cerrar el IV: una sección y una
  recompensa por Lugar Protegido (8 cartas de jugador 78096–78103, textos
  literales) y texto oculto (2 PX y 1 trauma mental por lector). La frase final EN
  («You note agents swarming…») no está en ES y no se usa. Aproximaciones: Copas
  de más da una acción sin restringir el tipo; Beneplácito de Ma da un espacio de
  aliado más (sin el +1/+1); Día duro de trabajo solo aporta sus iconos; Cobertura
  total necesita `alliedCostModifier`/`alliedForced` en los escenarios V–VIII.
- Interludio IV · Lección de historia (guía ES p. 15 / EN p. 18 del PDF), en
  `history-lesson.ts`: `historyLesson(end)` devuelve sus mensajes para encadenarlos
  tras las R1 y R2 del V (ambas pasan al interludio). El jefe elige una pregunta
  (obligatoria) y puede seguir; cada caja anota su frase y cada caja tras la primera
  añade a cada investigador una debilidad básica Locura o Pacto aleatoria
  permanente (`AddStoryAsset`, sin repetir dentro del interludio). Relatos literales
  EN/ES en `plaguebearer.{es,en}.json` y en `story/{es,en}.json`; sin locución.
  Notas `plaguebearerVisionOfPortals`, `plaguebearerKillingWords` y
  `plaguebearerCrypticRiddle`. Pruebas en `history-lesson.test.ts`.
- V · Descenso al mediodía (`high-noon-descent.ts`, datos en `noon-data.ts`; guía ES
  pp. 13–14 / EN pp. 15–17; cartas ES 142–188, EN 143–182 y 163). Fuentes en
  `D:\plaguero` (ES `NNN{a,b}.jpg`, EN `en\*-{1,2}.png`). Introducciones 1–6 según
  Motel/respeto, Greyson cortó lazos y Greyson (Ya no sigue órdenes, 78140) al mazo;
  West y Greyson desde el mazo o con Alianzas frágiles. Tres alas: Delta (posiciones
  de la Figura 1, conexiones de un sentido hacia abajo y a la Guarida, lo que pide
  cada Sub-laboratorio para bajar), Omega (Blasones como apoyos colocados que se
  mueven hacia el Ventrículo opuesto) y Alfa (Razón, Fe, Círculo de invocación,
  Laboratorio de Robison). Cuatro planes (Agencia con Oleada y 1 daño, Crispin,
  Primero de muchos, derrota con trauma), tres actos, 11 cartas de encuentro
  propias más Agentes de Cthugha (254–255) y Vida y muerte (286–287). R1/R2 anotan
  el reino del que acecha o las sendas ocultas, el Primero sepultado y pasan al
  Interludio IV; En el Umbral: 1 trauma físico por lector.
- Decisiones del V: Laboratorio Alfa (Conocimiento prohibido) usa horror como el EN
  (el ES dice daño, como la versión Cthugha); el Ventrículo derecho se refiere a sí
  mismo (errata ES «izquierdo»); Corre por tu vida al final de la ronda (EN; ES «al
  principio»); Llamada de la tumba y Daños acumulados sin restricción de Lugar (EN);
  la Aurícula izquierda usa el aro amarillo del ES (el EN muestra una «T»). Aproximaciones:
  la Guarida expulsa al enemigo justo después de entrar; Sala de autopsias investiga
  y la pista sale del Lugar revelado que elijas; «no infligir daño» se aplica en las
  pruebas y el turno de quien lo eligió; las Estrategias solo cobran la acción extra
  en el turno propio; Presa del Vampiro de fuego por menos Apoyos.
- Verificación V: 19 pruebas del escenario, carpeta del Portador, medios y
  narración (205 + 2), tipos de cards (salvo un error ajeno en
  `extra-actions/rules.test.ts`) y lint correctos.
- Criterio (persona usuaria, 14/11/2026): mandan las cartas EN; las diferencias del
  ES se tratan como erratas. Única excepción en el V: el símbolo de la Aurícula
  izquierda, porque la «T» del EN no conecta con el resto de cartas EN.
- Imágenes del V: 146 caras AVIF (calidad 70) y miniaturas WebP de 192 px, hechas con
  sharp 0.34.3 instalado aparte en `tmp/imgtool` (sin Python). ES desde
  `D:\plaguero\NNN{a,b}.jpg` (CMYK → sRGB; planes y actos girados 90°/270°); EN desde
  `D:\plaguero\en`, archivos distintos de los de `E:\Plaguero` (750×1050, tamaño
  nativo). Registradas en `media.json` (594), manifiesto e inventarios;
  `verify-card-images.mjs` correcto (6503).
- Pendiente del V, tras las locuciones del 19/11/2026, el audio de los tres actos
  y la revisión visual de la persona usuaria.

### Continuación de implementación · 2026-11-20

- Lote: VI · Guerra al atardecer e Interludio V, sin commit, sobre `d53ec860` (sin pull:
  cambios ajenos en `main`; HEAD = origin/main tras `git fetch`). Fuentes en `E:\Plaguero`
  (`D:\plaguero` ya no existe): ES `NNN{a,b}.jpg`, EN `en\*-{1,2}.png` (826×1126).
- Preparación (EN p. 19–20): estado de Arkham del IV (`arkhamStatus`), Lugares Seguros o
  Ruinas, Cráter de la Liberación en la posición del Lugar marcado o Lugar de la Liberación
  vinculado (sin registro: Motel Hibb, como el IV), Portales sin revelar a ambos lados del
  anillo, inicio en el Motel (o el Cráter), Eliminados fuera, 2 pistas con la visión de los
  portales, apoyos de los Lugares Protegidos, Hibb (Listo para ayudar) desde el mazo o Hibb
  (Ya ha tenido suficiente) en el Motel, 1 horror + 1 daño entre Miasma y entre Seguros,
  Acólito (y Protagonista con 3–4) según su Aparición y dos Élite Infectados (Vampiro de
  fuego o Byakhee chillador por cada uno que falte, elige el jefe).
- Reglas: daño de Lugar en `scenarioMeta` (`locationDamage:<id>`, con insignia en el mapa) y
  horror en el Lugar; «fichas» = daño + horror + pistas + perdición. Tres planes (forzado de
  fin de ronda por enemigo, Mensajeros a la Liberación; fin de turno con 4+ → 1 ficha a la
  Liberación), cuatro actos con la capacidad (X ≤ 4) y objetivo de Portal sin fichas, cierre
  del Portal (retira sus cartas, mueve a la Biblioteca/Banco, zona de victoria y el otro
  Mensajero), Cráter/Lugar de la Liberación (1 perdición por 4 fichas / 4 que no sean
  pistas), Portales (+2 velo por ficha, forzado de inicio de turno), Defender de los ocho
  apoyos (valor fijo salvo Hibb, límite de grupo por partida, 1 ficha por punto, máx. 6),
  seis enemigos/tres traiciones del VI, Poder desatado y Agentes de Hastur. Los Élite de
  Arkham caído reutilizan sus efectos del IV (`fallenEliteForced` y modificadores exportados).
- Resoluciones: sin resolución → R2; R1 locos y R2 muertos (campaña perdida); R3 con PX,
  «Tocado por la Llama/Locura» en el Lugar de Arkham (no Liberación) con más daño/horror
  (empate: jefe), Eliminados y Susurros insidiosos (texto oculto en la R3: cada investigador
  decide si lo lee; el primero puede cambiar la calavera o tablilla más común por un
  sectario y cada investigador se cura 1 trauma).
- Decisiones del VI: La Cosa del agua (Élite, se retira con los Muelles Defendidos) y Abner
  Weems (apoyo de historia con los Muelles Protegidos) son cartas distintas, sin conflicto;
  el Acólito infernal y la Protagonista delirante aparecen según su propia instrucción de
  Aparición (más daño / más horror, empate: jefe) tras colocar las fichas; la Intro 2 pasa a
  la Intro 3, que resume la situación para ambas ramas. EN manda: plan 2/3 al final de tu
  turno (ES «de la ronda»), plan 2b Byakhee con más horror (ES invertido), Lugar de la
  Liberación «Obligado» (ES «Revelación»), Escucha la llamada hacia un Lugar Liberación
  (ES «Desatado»). Seis recuadros EN de Susurros (5 ES): iguales, se ofrece uno por persona.
- Aproximaciones: los Susurros se ofrecen al final (R3), no durante la partida; «retíralos de
  la partida» del acto 2b incluye también las copias apartadas (si no, el plan 1b las
  devolvería); el daño del Acólito lo reparte quien lo derrota; La ira del Desatado comprueba
  daño infligido a enemigos y pistas descubiertas durante tu turno; Escucha la llamada ofrece
  el Obligado de las Ruinas y Portales revelados; el reparto de 1 horror + 1 daño se hace
  «Lugar con menos daño/horror» del grupo.
- Interludio V: «Si habéis sido advertidos» → La confrontación 4; si no, 1 y decisión del
  jefe: 2 (retira a Herbert West de los mazos y del registro; la Muerte conquistó a Herbert
  West) o 3 (si nadie tiene a West, alguien puede añadirlo; Baalshandor golpeó primero).
- Errores corregidos de I–V: la ayuda de fichas del caos del V (`chaosHelp`) no leía la carta
  de referencia `78111` y mostraba el texto genérico; regresión en `plaguebearer-media.test.ts`.
- Recursos: 30 + 2 cartas distintas transcritas literalmente EN/ES (`plaguebearer-cards`),
  86 caras AVIF (calidad 76, Pillow 11.3, ES CMYK → sRGB, planes/actos girados) y sus
  miniaturas WebP de 192 px; `media.json` 680 caras; manifiesto e inventarios con las
  entradas junto a las del V. Relatos en `plaguebearer.{es,en}.json` y `story/{es,en}.json`;
  11 relatos y 14 caras de planes/actos registrados como pendientes de locución.
- Verificación: 23 pruebas del VI y del Interludio V; 460 dirigidas (carpeta del Portador,
  i18n, medios, narración, referencias e imágenes ES); 171 de presentación EN/ES y
  narración; cobertura del Portador (96 partidas aleatorias, 16 del VI); campaña (55);
  `verify-card-images` (6683); tipos de cards, i18n y web; Prettier y ESLint de lo tocado.
  La prueba de huellas de 680 caras pasa a 20 s (632 ms sola; superó 5 s bajo carga).
  Motor sin cambios: sin suite engine+cards. Sin navegador.

### Continuación de implementación · 2026-11-20 (VII)

- Lote: VII · Muerte a la puesta de sol, sin commit, sobre `03a9d6ca` (sin pull: cambios
  ajenos en `main`; HEAD = origin/main tras `git fetch`). Fuentes en `E:\Plaguero`.
- Emparejamiento: ES archivo = posición + 226 y colección = posición + 180; EN colección =
  ES − 2. Los Lugares EN siguen orden alfabético (no la posición): se emparejan por nombre.
  El reverso del acto 2 (Memoria de Pickman) es un Lugar vertical: código `78186b`.
- Preparación: torre de seis pisos según la figura ES (Piso 5 arriba, Piso 0 abajo), inicio
  en la Plaza, Mazo de Ritual (Hoja/Palabras arriba, L.E.P.R.A., Mochila y Bendición
  barajadas, Runas al fondo; con las palabras de muerte el jefe empieza con ellas),
  Supervivientes de la Agencia sin enemigos, Vida y muerte y Esclavos del miasma. Bolsa con
  `plaguebearerChaosBag`. Introducciones 1→2→6, 1→3→5→6 o 1→4→5→6.
- Reglas: plan 1 (se roba del propio mazo en vez de Encuentros) y 1b (Primero y Zarcillos en
  la Plaza); plan 2 repetido (mata a quien está en el Piso del Primero, retira ese Piso,
  Rituales a la Plataforma, el Primero sube; Piso 4 sin Hoja y Palabras en la zona de
  victoria → R2; Piso 5 → plan 3); plan 3b mata a todos (R2). Acto 2 con «saquear» [free]
  (la Plataforma recibe pistas), [free] de Observatorio/Taller/Plataforma a la zona de
  victoria y objetivo de las tres claves; acto 2b pone la Memoria de Pickman con los Apoyos
  de la zona de victoria y a Pickman; acto 3: enemigos de la Memoria se agotan y curan 1 en
  vez de ser derrotados por daño, Pickman solo cae con las Palabras de muerte y su
  derrota lleva a la R1. Seis Apoyos Ritual (tomar el control o vincular, límite de grupo
  por ronda), seis Lugares con capacidades, tres enemigos, seis traiciones y las fichas.
- Resoluciones: sin resolución → R2 (campaña perdida). R1: PX por zona de victoria y cartas
  en juego, muertos (incluidos los del plan 2) que dejan de estarlo con Investigador
  derrotado (Voluntad inquebrantable/La futilidad → Fuerza de la carne/El abrazo de la
  muerte, `plaguebearerReagent`), resolución [tablilla] e Interludio V.
- Decisiones: la resolución [tablilla] no tiene acceso en ninguna guía ni carta; es un texto
  oculto con la voz de Baalshandor (como los Susurros del VI) que se ofrece tras la R1: el
  primero que lo lee anota «habéis sido advertidos» y añade −3/−5/−6/−7. La Intro 4 pasa a
  la 5 (West aparece en ella). EN manda: plan 2a vincula a la Plataforma de observación
  (ES «Observatorio»); El acechador acecha cuesta [action][action] (ES tres); el sectario
  «puedes» descubrir (ES obligatorio); la errata EN de la tablilla en Difícil («si fallas»)
  ya está en la carta ES. La Cámara del reloj sur ES repite el texto de ambientación de la
  norte (se conserva literal).
- Aproximaciones: los Zarcillos «en la zona de victoria» se quedan junto al Primero (su Lugar
  conecta con ella) y pasan a la Memoria cuando entra en juego; la Bendición del mañana da
  una acción adicional sin restringirla a [action]; las Runas de atadura se ofrecen al
  empezar el mantenimiento (`EnemyStaysExhausted`); la Plaza solo bloquea capacidades
  [action] y las [free] del escenario; la Oficina del organizador deja las cartas arriba o
  todas debajo (sin reordenar); el Observatorio no revela la carta superior del mazo; el
  rasgo Miasma del Lugar del Primero no tiene efecto en este escenario.
- Recursos: 33 entradas EN/ES (`plaguebearer-cards`), 98 caras AVIF y miniaturas WebP,
  `media.json` 778 caras; relatos literales en `plaguebearer.{es,en}.json` y
  `story/{es,en}.json`; 10 relatos y 11 caras de planes/actos pendientes de locución.
- Verificación: 13 pruebas del VII; 517 dirigidas (carpeta del Portador, i18n, medios,
  narración, referencias, presentación e imágenes ES); cobertura del Portador (112 partidas,
  16 del VII); campaña (55); `verify-card-images` (6797); tipos, Prettier y ESLint de lo
  tocado. Motor sin cambios. Sin navegador.
