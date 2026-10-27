# 89 · El legado de Dunwich

## Estado actual

**Tres de los ocho escenarios son jugables**: Actividad extracurricular,
La casa siempre gana y El museo Miskatonic, para uno a cuatro investigadores y
las cuatro dificultades. Los dos primeros pueden jugarse en cualquier orden y
conectan con El destino de Armitage. Tras el museo queda pendiente El Essex County
Express y los otros cuatro escenarios. No se presenta la campaña como completa
ni se incluye Regreso a Dunwich.

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

Catálogo local EN/ES de 92 códigos, referencia de escenario y ayuda de fichas,
290 escaneos oficiales y sus 290 miniaturas, portada y huellas de integridad.
Se han inspeccionado escaneos representativos sin abrir el navegador.
La revisión visual de la mesa queda para la persona usuaria, conforme a AGENTS.

Los audios usan **Nico - History & Documentary**,
`FXn3GKRRt9FCEyTbrkaL`. Hay veinte grabaciones de historia en español:
prólogo; introducción y cinco desenlaces de Actividad extracurricular; introducción
y cuatro resoluciones de La casa siempre gana; ambas variantes de Armitage; e
introducción, dos variantes y tres desenlaces del museo. Los relatos
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

## Validación y continuación

Último lote funcional: `b4081af`, museo completo y seis audios nuevos; corrección
`1c298b3` para las salidas de Adam y Harold por descarte, derrota, retirada,
retorno a la mano, barajado y retirada de la partida. Incluye el ajuste pendiente
para quitar investigadores del equipo (`7fa8780`), por petición de la persona
usuaria. Lote cerrado para la subida autorizada.

Formato, lint y tipos globales comprobados. La suite obtuvo 4549 pruebas correctas
y tres límites de tiempo preexistentes en Gala, Brethren of Ash y administración.
Tras corregir la salida de los aliados se repitieron los controles afectados:
329 pruebas del motor, Dunwich y los tres archivos con tiempo ampliado, todas
correctas. Pasan las 48 pruebas del museo y la compilación final. Las veinte
narraciones conservan las transcripciones y la voz Nico - History & Documentary.


Las pruebas dirigidas incluyen preparación de uno a cuatro investigadores,
variantes de oficinas y mazo oculto, vacío persistente, enemigos, traiciones,
aliados, costes, fichas, resoluciones y guardado. Un recorrido completo recupera
y destruye el libro mediante acciones legales, sin editar el estado tras la
preparación. Partidas con mazos iniciales reales de uno a cuatro investigadores
terminan usando decisiones legales y conservan el siguiente escenario. Catálogos,
escaneos y las veinte narraciones se verifican por consola. Se inspeccionaron
imágenes representativas y las conexiones impresas; la revisión visual de la
aplicación queda para la persona usuaria conforme a AGENTS.

Siguiente grupo: **El Essex County Express**; después Sangre en el altar,
Invisibles y sin dimensión, Donde aguarda la perdición, Perdidos en el tiempo y
el espacio, Los supervivientes y el epílogo. Continúa vigente la autorización
para implementar y subir cada escenario al completar sus comprobaciones.
