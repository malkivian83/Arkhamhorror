# 89 · El legado de Dunwich

## Estado actual

**Actividad extracurricular y La casa siempre gana son jugables**, con uno a
cuatro investigadores y las cuatro dificultades. Se pueden iniciar en cualquier
orden. Al terminar ambos se resuelve **El destino de Armitage**, se conservan
notas, fichas, experiencia y aliados, y la campaña queda ante El museo Miskatonic,
todavía bloqueado junto con los otros cinco escenarios. No se presenta la campaña
como completa ni se incluye Regreso a Dunwich.

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

| Parte | Comportamiento |
| --- | --- |
| Encuentros | Hechicería, Chotacabras, El Más Allá, Esclavos de Bishop y Agentes de Yog-Sothoth, con sus cantidades originales. |
| Acto 1 | Pago de tres pistas por investigador; baraja el descarte y Jazz en el mazo de encuentros. |
| Acto 2 | Búsqueda por una acción y una pista: descarta diez cartas en solitario o cinco en grupo. Jazz descartado resuelve su revelación. Tomar su control avanza el acto. |
| Acto 3 | Objetivos de los Lugares para rescatar a Rice o a los estudiantes; derrotar al Experimento avanza al reverso del tercer acto y resuelve R3. |
| Planes | Horror según descartes, reducción de mano durante mantenimiento, salto de la segunda cara frontal cuando se visita la universidad en segundo lugar y movimiento periódico del Experimento. |
| Lugares | Conexiones, puertas cerradas hasta que Jazz permita revelarlas, descartes al final del turno, investigación adicional en Orne, curación, búsqueda de Humanoides y recuperación de la Pócima alquímica. |
| Jazz | Revelación, negociación, control, salud y cordura, permiso sobre Lugares sin revelar y regreso al descarte de encuentros al abandonar el juego. |
| Experimento | Salud de siete más tres por investigador, Enorme, preparación al inicio de la fase de enemigos y avance hacia la Residencia por los planes. |
| Pócima | Ataque con intelecto, seis daños adicionales contra el Experimento y retirada de la partida al tener éxito. Solo se prepara en la variante tardía. |
| Rice | Recompensa opcional, salud, cordura, ranura de Aliado, intelecto adicional y reacción al descubrir la última pista. |
| Resoluciones | Sin resolución y R1–R4, notas, tablilla permanente, victoria, experiencia adicional cuando corresponde y guardado para el escenario siguiente. |
| Caos | Ambas caras de 02041, incluyendo costes impresos del descarte inmediato por Primigenio y diferencias por dificultad. |

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

Catálogo local EN/ES de 63 códigos, referencia de escenario y ayuda de fichas,
192 escaneos oficiales y sus 192 miniaturas, portada y huellas de integridad.
Se han inspeccionado escaneos representativos sin abrir el navegador.
La revisión visual de la mesa queda para la persona usuaria, conforme a AGENTS.

Los audios usan **Nico - History & Documentary**,
`FXn3GKRRt9FCEyTbrkaL`. Hay catorce grabaciones de historia en español:
prólogo; introducción y cinco desenlaces de Actividad extracurricular; introducción
y cuatro resoluciones de La casa siempre gana; y ambas variantes de Armitage. Los relatos
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

## Validación y continuación

Último lote publicado: `a75d568`, Actividad extracurricular y voz Nico corregida.
Lote actual: La casa siempre gana, El destino de Armitage y corrección de diseño;
pendiente de los controles finales y la subida conjunta autorizada.

Las pruebas cubren preparaciones de uno a cuatro investigadores, cuatro
 dificultades, encuentros, actos, planes, variantes, resoluciones, costes,
aliados, guardado y ambos órdenes de campaña. Incluyen un rescate completo de
Morgan por acciones legales sin editar el estado después de la preparación, y
partidas reproducibles con mazos completos y decisiones legales para uno a cuatro
investigadores. Presentación y audios se verifican por consola; la revisión visual
de la aplicación queda para la persona usuaria conforme a AGENTS.

Siguiente grupo: **El museo Miskatonic**; después El Essex County Express,
Sangre en el altar, Invisibles y sin dimensión, Donde aguarda la perdición,
Perdidos en el tiempo y el espacio, Los supervivientes y el epílogo.
