# 89 · El legado de Dunwich

## Estado actual

**Los ocho escenarios y el epílogo son jugables**: Actividad extracurricular, La casa siempre gana, El museo Miskatonic, El Essex County Express, Sangre en el altar, Invisibles y sin dimensión, Donde aguarda la perdición y Perdidos en el tiempo y el espacio. Admiten de uno a cuatro investigadores y las cuatro dificultades. Los dos primeros pueden jugarse en cualquier orden y conectan con El destino de Armitage; Sangre en el altar incluye Los supervivientes. No se incluye Regreso a Dunwich.

La elección del prólogo se conserva en `log.values.openingScenario`; los guardados
anteriores sin elección mantienen el orden del índice. La pantalla de progreso y
el avance de campaña usan el mismo orden.

## Fuentes y preparación

- Guía revisada ES aportada: páginas 2–5, campaña, prólogo, preparación y desenlaces.
- Cartas originales 02041–02061, 02083–02087, 02090–02091, 02100–02102 y
  Agentes de Yog-Sothoth 01177–01178; datos oficiales EN/ES de la copia externa.
- Se reutilizan Antiguos males y Puertas cerradas ya implementados y probados.
- La lista española de la página 4 omite Ciencias, aunque figura en el plano.
  Se incluye el Edificio de Ciencias: la preparación inglesa y las cartas lo
  requieren, entre otras cosas para la aparición del Experimento.

Preparación con seis Lugares en juego y tres apartados. Despachos del profesorado
usa la variante correspondiente al orden de la campaña. Sindicato de estudiantes
tiene dos pistas fijas; el resto respeta sus cantidades por investigador.
El mazo inicial tiene 32 cartas de los ocho conjuntos indicados. Jazz y el
Experimento empiezan apartados.

## Reglas implementadas

| Parte        | Comportamiento                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Encuentros   | Hechicería, Chotacabras, El Más Allá, Esclavos de Bishop y Agentes de Yog-Sothoth, con sus cantidades originales.                                                                                      |
| Acto 1       | Pago de tres pistas por investigador; baraja el descarte y Jazz en el mazo de encuentros.                                                                                                              |
| Acto 2       | Búsqueda por una acción y una pista: descarta diez cartas en solitario o cinco en grupo. Jazz descartado resuelve su revelación. Tomar su control avanza el acto.                                      |
| Acto 3       | Objetivos de los Lugares para rescatar a Rice o a los estudiantes; derrotar al Experimento avanza al reverso del tercer acto y resuelve R3.                                                            |
| Planes       | Horror según descartes, reducción de mano durante mantenimiento, salto de la segunda cara frontal cuando se visita la universidad en segundo lugar y movimiento periódico del Experimento.             |
| Lugares      | Conexiones, puertas cerradas hasta que Jazz permita revelarlas, descartes al final del turno, investigación adicional en Orne, curación, búsqueda de Humanoides y recuperación de la Pócima alquímica. |
| Jazz         | Revelación, negociación, control, salud y cordura, permiso sobre Lugares sin revelar y regreso al descarte de encuentros al abandonar el juego.                                                        |
| Experimento  | Salud de siete más tres por investigador, Enorme, preparación al inicio de la fase de enemigos y avance hacia la Residencia por los planes.                                                            |
| Pócima       | Ataque con intelecto, seis daños adicionales contra el Experimento y retirada de la partida al tener éxito. Solo se prepara en la variante tardía.                                                     |
| Rice         | Recompensa opcional, salud, cordura, ranura de Aliado, intelecto adicional y reacción al descubrir la última pista.                                                                                    |
| Resoluciones | Sin resolución y R1–R4, notas, tablilla permanente, victoria, experiencia adicional cuando corresponde y guardado para el escenario siguiente.                                                         |
| Caos         | Ambas caras de 02041, incluyendo costes impresos del descarte inmediato por Primigenio y diferencias por dificultad.                                                                                   |

El motor incorpora ventanas de mazo agotado y carta de encuentro descartada,
costes de movimiento de traiciones, efectos al robar anteriores a la cancelación,
vínculos al acto y al plan, daño directo global, presa por cartas de mano y
modificadores de ataque evaluados antes de resolver los descartes del ataque.

Empujado al otro lado devuelve apoyos prestados al mazo de su propietario y
descarta del mazo del investigador que robó la traición. Incluso sin apoyo
válido descarta tres cartas: la redacción española separa ambas instrucciones y
la inglesa no utiliza un «después» condicional. Esto difiere del comportamiento
de la copia externa, que no se ha trasladado literalmente.

## Presentación y narración

Catálogo local EN/ES de 225 códigos, referencia de escenario y ayuda de fichas,
730 escaneos oficiales y sus 730 miniaturas, portada y huellas de integridad.
Se han inspeccionado escaneos representativos sin abrir el navegador.
La revisión visual de la mesa queda para la persona usuaria, conforme a AGENTS.

Los audios usan **Nico - History & Documentary**,
`FXn3GKRRt9FCEyTbrkaL`. Hay cuarenta y tres grabaciones de historia en español:
prólogo; introducción y cinco desenlaces de Actividad extracurricular; introducción
y cuatro resoluciones de La casa siempre gana; ambas variantes de Armitage; e
introducción, dos variantes y tres desenlaces del museo; introducción, derrota y
ambas resoluciones del tren; introducción y cuatro desenlaces de Sangre en el altar, Los supervivientes y sus cinco personajes; introducción, dos decisiones, dos desenlaces, dos variantes de la Fórmula y tormenta de Invisibles y sin dimensión. Los relatos
españoles se extraen de la guía revisada; se omiten instrucciones y recompensas
en el audio, que la mesa presenta aparte. No se ofrece audio español como inglés.

- Catálogo: `node scripts/import-dunwich-cards.mjs`.
- Imágenes y portada: `node scripts/import-dunwich-images.mjs`.
- Miniaturas: generador existente con `--codes` para las cartas incorporadas.
- Audios reanudables: `node scripts/generate-dunwich-audio.mjs --generate --key-stdin`.
  Sin `--generate`, el inventario es local. Voz, textos, ajustes y huellas están
  en `evidencias/dunwich-nico-narracion.json`. La clave no se guarda en archivos.

## La casa siempre gana

Fuentes: guía revisada ES, páginas 6–8, y caras originales 02062–02082 y
02092–02099. El interludio incorpora al Dr. Henry Armitage (02040). Los relatos
españoles proceden de la guía revisada; los ingleses, de la copia externa.

- Cuatro Lugares iniciales, Jefe de sala en el Salón, mazo de 19 encuentros y
  trece cartas apartadas de Abominaciones espantosas y Miedo impactante.
- Pistas por investigador, fichas de la reserva por las apuestas, copas y Aliados
  descartados de la mano. Límites por investigador y trampas una vez por ronda
  para el grupo; penalización permanente de Primigenio si alguien hizo trampas.
- Criminales Indiferentes durante el primer plan; daño infligido por un
  investigador lo avanza de inmediato. Segunda cara frontal omitida si el club
  se visita en segundo lugar. Abominación aleatoria, incorporación de los dos
  conjuntos apartados y evacuación de La Bella Luna al avanzar el segundo plan.
- Pasillo desbloqueado por cuatro pistas por investigador, con guardia si aún
  está el primer plan; tres puertas de nombre oculto en posiciones aleatorias.
  Objetivo de dos pistas por investigador aportadas solo desde la Zona VIP.
- Morgan aparece en la visita temprana; Peter y una Abominación, en la tardía.
  Negociaciones acumulativas por cada investigador y daño a Peter sin controlador.
  Desistir con el personaje rescatado determina R2 o R3; R1 y derrumbe R4 aplican
  notas, experiencia, trauma y la ficha permanente correspondientes.
- Mala suerte, La banda de Naomi, Abominaciones espantosas y las dos traiciones
  del escenario, incluidos costes, apariciones, ataques y movimiento forzado.
- Morgan y Armitage funcionan como aliados de campaña; Peter permite evitar a
  Criminales. El interludio distingue haber quedado inconscientes en cualquiera
  de los dos escenarios y ofrece a Armitage o concede dos puntos de experiencia.

El motor incorpora la ventana de ganar pistas de cualquier origen, la prohibición
de robar o ganar recursos y modificadores de prueba por traiciones. El origen del
ataque se transmite al modificador de combate de la Abominación aviar.

La pantalla de selección agrupa título, descripción, prólogo y opciones en una
columna amplia, con escenarios al lateral y disposición apilada en pantallas
pequeñas. La narración tiene contraste adaptado al fondo oscuro.

## El museo Miskatonic

Fuentes: guía revisada ES, páginas 9–10, y caras originales 02118–02146.
Preparación con cuatro Lugares, una variante aleatoria de cada oficina y un mazo
de exposiciones cuya Sala restringida está entre las tres últimas cartas. El
mazo de encuentros contiene 34 cartas de los seis conjuntos indicados.

- Entrada pagando pistas (Adam Lynch) o forzando la puerta con combate 5
  (Harold Walsted al avanzar el segundo acto). Salas del museo permanece cerrado
  hasta resolver el primer acto.
- Costes de exploración pagados solo por investigadores presentes; exposiciones
  sin revelar, inspección privada y búsqueda de la Oficina de seguridad con sus
  límites y reducción de acciones por Adam. Restricciones de investigación y
  efectos de entrada/fallo de cada Lugar, incluidas conexiones impresas entre
  exposiciones solo cuando ambos extremos están revelados.
- Horrendo cazador único: vuelve al vacío al ser derrotado, descartado o retirado.
  Surgido de las sombras conserva recursos fuera del juego, aumenta combate,
  salud y evasión al regresar, y otorga Descomunal desde tres recursos. La
  revelación de ficha al principio de la fase de enemigos puede prepararlo.
- Planes, cartas de encuentro, ambas caras de la referencia y elección final de
  destruir o conservar El Necronomicón. Aliados de museo que abandonan el juego
  se retiran y añaden una tablilla permanente; el libro funciona en campaña con
  su ranura de mano, icono, intelecto y acción de recursos.
- Se reutilizan Mala suerte, Hechicería, El Más Allá, Frío helador y Puertas
  cerradas. El final se guarda y avanza al tren sin presentar el resto como listo.

## El Essex County Express

Fuentes: guía revisada ES, páginas 11–12, y cartas 02159–02183. Se eligen seis de
los ocho vagones y una de tres locomotoras, conectados en línea. El mazo reúne
35 encuentros de los conjuntos impresos; la preparación añade la ficha negativa
permanente de la dificultad.

- Solo se entra en el siguiente vagón sin revelar después de vaciar el anterior.
  Los costes por iconos, daño u horror distinguen las cinco variantes de pasajeros.
  Dormitorio respeta el límite de grupo; Salón impide investigar y permite pagar
  recursos. Comedor y locomotoras resuelven sus encuentros para quien los revela.
- Los planes retiran uno, uno, dos y dos vagones, eliminan a sus ocupantes,
  descartan enemigos y apoyos y las pistas del grupo; conservan la victoria de
  los Lugares vacíos. El último plan añade trauma mental y termina la partida.
- Vapor, vías, pasajeros y enemigos tienen comportamiento propio. La Monstruosidad
  entra agotada y el Horrendo aferrador impide abandonar el vagón. Las Garras
  obligan a asignar primero a apoyos y bloquean el movimiento durante la ronda.
- Las pruebas del acto afectan al investigador que llega a la locomotora. Los
  derrotados reciben la debilidad de historia y experiencia; se conservan las
  pérdidas del libro y los profesores. Los desenlaces guardan el avance a Sangre
  en el altar y la demora cuando corresponde.
- El motor transmite quién revela un Lugar, admite enemigos que entran agotados
  y la asignación obligatoria a cualquier apoyo. Los efectos de Culto oscuro
  colocan perdición sin adelantar el plan fuera del momento reglamentario.

## Sangre en el altar

Fuentes: guía revisada ES, páginas 13–16, cartas 02195–02224, Dunwich 02088–02089 y Ángeles descarnados 01172–01173. La preparación elige una copia de cada Lugar y omite uno de los seis; esconde la cámara, la llave y tres encuentros. El mazo tiene 26 cartas después de esconder tres, o 32 si se añade La banda de Naomi. Conserva los personajes secuestrados y la demora del tren.

- Las cinco cartas ocultas se roban solo con el Lugar vacío. La cámara entra revelada, se conecta a su origen y requiere adjuntar la llave. Entrar avanza el acto, revela el mapa, reúne todas las pistas e incorpora a Silas, Descomunal y sin ataques de oportunidad.
- Los Lugares respetan conexiones impresas, restricciones de entrada, recursos, eventos, habilidades comprometidas y pistas; las dos búsquedas por rasgo, la búsqueda de Objetos, intercambio de carta y modificadores de enemigos tienen pruebas dirigidas.
- Planes y Secuestrado mantienen montones separados de sacrificios potenciales y consumados. Las cartas únicas sacrificadas se retiran de todos los mazos y quedan prohibidas durante el resto de la campaña, incluidas las compras. El último plan obliga a desistir.
- Los tres desenlaces distinguen derrotar, devolver la forma y desterrar a Silas. Sin resolución se completa el ritual y se consumen los sacrificios pendientes. Se registra el libro robado, se concede victoria más dos de experiencia y se guarda el avance.
- Los supervivientes se resuelven por personaje, sin duplicar aliados ni Polvo. Zebulon y Earl tienen sus modificadores y reacciones; el Polvo entra con pistas por superviviente y las traslada a una Progenie agotada del mismo Lugar.
- Tierra impía blanquea el texto de los aliados y prohíbe jugarlos. El motor distingue las pruebas de traiciones, aplica el Canto del psicopompo antes de asignar daño, dobla las fichas negativas al evitar al Ángel descarnado y permite reaccionar al enemigo recién derrotado.

## Invisibles y sin dimensión

Fuentes: guía revisada ES, páginas 17–18, y cartas 02236–02259. Se elige una variante de cada uno de los seis Lugares. Las dos decisiones del prólogo se conservan. Según los sacrificios se preparan dos, tres, cuatro o cinco Progenies, con cero, una o dos iniciales. En campaña, cada investigador añade una debilidad básica aleatoria Locura, Lesión o Pacto de la reserva restante, respetando las cantidades y las reimpresiones equivalentes; el Polvo se puede buscar y poner en juego.

- Progenies Descomunales con salud de uno más uno por investigador, inmunes a ataques y daño salvo la Fórmula. Los efectos de derrota directa siguen siendo válidos. La Fórmula usa voluntad y un bono dinámico por las pistas del enemigo, incluso cuando cambian durante la prueba.
- Las pistas sobre el Polvo se consideran controladas: sirven para pagar actos y costes de entrada y para las habilidades de los Lugares, pudiendo elegir su origen. El resumen de avance muestra el pago antes del reverso.
- Coste de acto aportado solo desde las Ruinas Whateley; una Fórmula por investigador y una perdición si Armitage fue sacrificado. Objetivo final, experiencia y recuento de Progenies escapadas, retirando el Polvo de los mazos.
- Movimiento aleatorio al final de enemigos, incluso agotadas; barajado y apariciones al avanzar los planes, emboscada del segundo plan y final del tercero. La variante de la cañada permite sustituir un Lugar aleatorio mediante su prueba.
- Las variantes permiten pistas individuales, del grupo o de cada investigador, con sus límites de una vez por partida; pista temporal de la lluvia, atraer o mover criaturas y daño del páramo. La elección distingue Progenies por Lugar, pistas y daño.
- Las cuatro cartas de encuentro y ambas caras de la referencia incluyen ataques inmediatos, crecimiento de enemigos, pruebas de grupo, Oleada y elección de tablilla. Se reutilizan los otros conjuntos ya revisados.
- Los escaneos confirman ambas caras de las conexiones. Se corrige una errata de transcripción externa: el escaneo de 02238b dice «fuerza», donde el texto externo omitía la r. La narración usa el texto contrastado.

## Donde aguarda la perdición

- Preparación de la guía revisada, páginas 19–20: seis senderos apartados al azar, tres Lugares iniciales, ficha permanente según dificultad, perdición por Progenies escapadas y ayuda de Naomi. Si Silas murió, aparecen las Abominaciones horrendas (02103–02104), distintas de los Esclavos-bestia.
- Pago obligatorio del primer objetivo; retirada de pistas y revelación del Sendero ascendente. Tres variantes del segundo acto según Silas y el Necronomicón. Al entrar en la Cumbre, el acto avanza antes de revelar el Lugar y colocar sus pistas. El daño inicial de Seth se aplica antes de sus ventanas de aparición.
- Senderos con ambas caras y conexiones contrastadas: investigaciones que ponen Lugares en juego en lugar de descubrir pistas, límite personal por ronda, ocho efectos de revelación y retirada de perdición del Sendero destruido. La prohibición de colocar pistas del acto 2 también cubre revelaciones y transferencias.
- Devotos con movimiento y sacrificio al final de enemigos; Shoggoth que mata solo si su ataque termina derrotando al investigador tras la asignación; Horrores del acechador y Esferas con sus efectos. Ritos que recuperan las debilidades recién descartadas sin duplicarlas, Espacios intermedios y Vórtice del tiempo.
- Portal, experiencia por victoria, derrota de campaña y locura de todos los investigadores. EN/ES, 92 imágenes y miniaturas nuevas, once narraciones nuevas con Nico - History & Documentary. Se corrigen erratas externas contrastadas con los escaneos antes de generar el audio.

## Perdidos en el tiempo y el espacio y epílogo

- Guía revisada, páginas 21–23, y cartas 02311–02333. Diez Lugares de una sola cara son cartas de Lugar reales en el mazo de encuentros, con copias físicas independientes, entrada revelada y habilidades propias. Se reutiliza la identidad `código~n` del motor y se conserva la carta al descartarla o barajarla.
- Exploración desde los cuatro actos: descartar tres encuentros y elegir un Lugar. Resolver una Revelación no equivale a robar la carta: solo el robo normal activa Oleada. El movimiento de la ficha de sectario pone el Lugar sin resolver su Revelación.
- Los ocho tipos de Lugar, sus conexiones y ambas caras se contrastaron con los escaneos. La desaparición de un Lugar mueve a sus ocupantes a Otra dimensión sin permitir que Barrera arcana cancele el traslado, descarta vinculadas y aplica el horror del plan. Las Cascadas también desaparecen al retirar su última pista mediante un Viajero.
- Cuatro planes con recuerdos de los estudiantes y sacrificados; aparición de Yog-Sothoth y plan final que se repite. Yog tiene 4 más 6 de salud por investigador, no puede ser evitado ni hacer ataques de oportunidad, y permite sustituir horror por cartas descartadas. Quedarse sin mazo al usar esta reacción provoca locura.
- Cuatro actos, cierre del desgarro y desistimiento individual pagando dos pistas. Cuatro desenlaces, muerte de los derrotados, trauma y experiencia correspondientes y epílogo condicionado por la decisión de calmar o advertir a los lugareños.
- 70 escaneos y miniaturas nuevos; EN/ES y quince narraciones nuevas con Nico - History & Documentary, incluidos ambos epílogos. Una interrupción de escritura del inventario se recuperó verificando la grabación ya creada; el inventario ahora se sustituye de forma atómica. Se completaron los dos últimos audios con la nueva credencial aportada, sin guardarla en archivos.

## Revisión de la campaña completa

La revisión detectó y reprodujo un fallo de restauración: tras comenzar por La casa siempre gana, el validador comparaba los resultados con el orden fijo de la definición. Ahora usa `campaignScenarios`, el mismo orden que la partida y la pantalla de progreso. Se mantienen los guardados anteriores sin elección y se rechazan historiales que contradicen el orden elegido.

Se añadieron 32 recorridos de transiciones narrativas: ambos órdenes iniciales, uno a cuatro investigadores y las cuatro dificultades, con restauración entre cada uno de los ocho escenarios (256 cargas). Son fixtures de desenlaces, no victorias simuladas; las partidas mediante acciones legales y con mazos reales se cubren por las pruebas de cada escenario. La matriz comprueba Armitage, Silas restaurado y la variante del acto correspondiente, concesión y retirada del Polvo de Ibn-Ghazi, Progenies escapadas, ficha de caos permanente sin duplicarla, entrada en el portal y cierre final de la realidad. La regresión específica y el rechazo de un historial manipulado completan 34 pruebas nuevas.

## Validación y continuación

Último escenario subido: `d6339efa`, escenario final y epílogo. Revisión final implementada en `6e1d81ed`. Los ocho escenarios, 225 códigos EN/ES, 730 escaneos y miniaturas y 69 narraciones con Nico - History & Documentary están completos. El escenario final dispone de 49 pruebas específicas; guardado, tablero en línea, catálogo y audio pasan sus comprobaciones dirigidas.

El lote del octavo escenario pasó formato, lint, tipos y compilación. Su suite global obtuvo 5003 pruebas correctas, 19 omitidas y los tres límites de cinco segundos conocidos de Gala y Brethren of Ash; sus dos archivos pasaron las 51 pruebas con tiempo ampliado. La revisión final añade la corrección del orden al restaurar y sus 34 pruebas. Formato, lint, tipos y compilación vuelven a pasar. La suite final obtuvo 5037 pruebas correctas y 19 omitidas; solo reaparecieron los tres límites de tiempo conocidos, y sus dos archivos volvieron a pasar las 51 pruebas con tiempo ampliado.

La campaña original y su revisión están completas; no quedan escenarios ni audios pendientes dentro del alcance. La revisión visual de la aplicación queda para la persona usuaria conforme a AGENTS.
